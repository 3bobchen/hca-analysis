"""
Build constitutional insights data from hca.db for the Insights dashboard tab.
"""
import json
import sqlite3
from pathlib import Path

DB_FILE = "data/processed/hca.db"
OUTPUT = "website/public/insights.json"


def strip_prefix(issue):
    """Strip 'Public Law—Federal constitutional law—' prefix."""
    for prefix in [
        "Public Law—Federal constitutional law—",
        "Public Law—Federal constitutional law— ",
    ]:
        if issue.startswith(prefix):
            return issue[len(prefix):].strip()
    return issue.strip()


def get_insights_data():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Unnamed cases (no hca_citation) are unmatched sub-matters of multi-matter decisions
    # that are already represented by the named lead case. Exclude them from all stats
    # so we count distinct decisions rather than inflating counts with duplicate sub-matters.
    CITED = "hca_citation IS NOT NULL AND hca_citation != ''"

    # 1. Vote split distribution on constitutional cases
    c.execute(f"""
        SELECT
            maj_votes || '-' || min_votes AS split,
            COUNT(*) AS count
        FROM cases
        WHERE primary_issue_sub_area = 'Constitutional law'
          AND {CITED}
        GROUP BY maj_votes, min_votes
        ORDER BY (maj_votes + min_votes) DESC, maj_votes DESC
    """)
    vote_splits = [{'split': r['split'], 'count': r['count']} for r in c.fetchall()]

    # 2. Topic breakdown table
    c.execute(f"""
        SELECT
            primary_issue AS topic,
            COUNT(*) AS cases,
            ROUND(100.0 * SUM(CASE WHEN min_votes = 0 THEN 1 ELSE 0 END)/COUNT(*), 1) AS unanimous_pct,
            ROUND(100.0 * SUM(CASE WHEN min_votes >= 2 THEN 1 ELSE 0 END)/COUNT(*), 1) AS contested_pct,
            ROUND(100.0 * SUM(CASE WHEN decision_direction='liberal' THEN 1 ELSE 0 END)/COUNT(*), 1) AS liberal_pct,
            ROUND(100.0 * SUM(CASE WHEN decision_direction='conservative' THEN 1 ELSE 0 END)/COUNT(*), 1) AS conservative_pct,
            ROUND(100.0 * SUM(CASE WHEN party_winning LIKE 'appealing%' THEN 1 ELSE 0 END)/COUNT(*), 1) AS appellant_win_pct,
            ROUND(AVG(CAST(maj_votes AS REAL) / (maj_votes + min_votes)), 2) AS avg_majority_share
        FROM cases
        WHERE primary_issue_sub_area = 'Constitutional law'
          AND {CITED}
        GROUP BY primary_issue
        HAVING cases >= 3
        ORDER BY cases DESC
    """)
    topic_breakdown = []
    for r in c.fetchall():
        topic_breakdown.append({
            'topic': strip_prefix(r['topic']),
            'cases': r['cases'],
            'unanimous_pct': r['unanimous_pct'],
            'contested_pct': r['contested_pct'],
            'liberal_pct': r['liberal_pct'],
            'conservative_pct': r['conservative_pct'],
            'appellant_win_pct': r['appellant_win_pct'],
            'avg_majority_share': r['avg_majority_share'],
        })

    # 3. Decision direction by Chief Justice era (constitutional cases only)
    c.execute(f"""
        SELECT
            chief_argument AS chief,
            COUNT(*) AS cases,
            ROUND(100.0 * SUM(CASE WHEN decision_direction='liberal' THEN 1 ELSE 0 END)/COUNT(*), 1) AS liberal_pct,
            ROUND(100.0 * SUM(CASE WHEN decision_direction='conservative' THEN 1 ELSE 0 END)/COUNT(*), 1) AS conservative_pct,
            ROUND(100.0 * SUM(CASE WHEN decision_direction='unspecifiable' THEN 1 ELSE 0 END)/COUNT(*), 1) AS unspecifiable_pct,
            ROUND(100.0 * SUM(CASE WHEN party_winning LIKE 'appealing%' THEN 1 ELSE 0 END)/COUNT(*), 1) AS appellant_win_pct,
            MIN(year_decision) AS from_year,
            MAX(year_decision) AS to_year
        FROM cases
        WHERE primary_issue_sub_area = 'Constitutional law'
          AND chief_argument IS NOT NULL
          AND {CITED}
        GROUP BY chief_argument
        ORDER BY MIN(year_decision)
    """)
    direction_by_era = [dict(r) for r in c.fetchall()]

    # 4. Implied freedom of political communication — year-by-year
    c.execute(f"""
        SELECT
            year_decision AS year,
            COUNT(*) AS cases,
            SUM(CASE WHEN decision_direction='liberal' THEN 1 ELSE 0 END) AS liberal,
            SUM(CASE WHEN decision_direction='conservative' THEN 1 ELSE 0 END) AS conservative,
            SUM(CASE WHEN decision_direction='unspecifiable' THEN 1 ELSE 0 END) AS unspecifiable,
            GROUP_CONCAT(
                CASE WHEN case_name IS NOT NULL AND case_name != ''
                     THEN case_name
                     ELSE hca_citation
                END,
                ' | '
            ) AS case_names,
            GROUP_CONCAT(hca_citation, ' | ') AS citations,
            GROUP_CONCAT(maj_votes || '-' || min_votes, ' | ') AS vote_splits,
            GROUP_CONCAT(decision_direction, ' | ') AS directions
        FROM cases
        WHERE primary_issue LIKE '%political communication%'
          AND {CITED}
        GROUP BY year_decision
        ORDER BY year_decision
    """)
    implied_freedom = []
    for r in c.fetchall():
        implied_freedom.append({
            'year': r['year'],
            'cases': r['cases'],
            'liberal': r['liberal'],
            'conservative': r['conservative'],
            'unspecifiable': r['unspecifiable'],
            'case_names': r['case_names'].split(' | ') if r['case_names'] else [],
            'citations': r['citations'].split(' | ') if r['citations'] else [],
            'vote_splits': r['vote_splits'].split(' | ') if r['vote_splits'] else [],
            'directions': r['directions'].split(' | ') if r['directions'] else [],
        })

    # 5. Corporations power case list
    c.execute(f"""
        SELECT
            year_decision AS year,
            CASE WHEN case_name IS NOT NULL AND case_name != '' THEN case_name ELSE hca_citation END AS name,
            hca_citation AS citation,
            maj_votes,
            min_votes,
            decision_direction AS direction,
            party_winning
        FROM cases
        WHERE primary_issue LIKE '%Corporations power%'
          AND {CITED}
        ORDER BY year_decision
    """)
    corporations_cases = [dict(r) for r in c.fetchall()]

    # Summary stats for callout cards
    c.execute(f"SELECT COUNT(*) AS n FROM cases WHERE primary_issue_sub_area='Constitutional law' AND {CITED}")
    total_const = c.fetchone()['n']

    c.execute(f"SELECT COUNT(*) AS n FROM cases WHERE primary_issue_sub_area='Constitutional law' AND min_votes=0 AND {CITED}")
    unanimous_const = c.fetchone()['n']

    c.execute(f"SELECT COUNT(*) AS n FROM cases WHERE primary_issue LIKE '%political communication%' AND decision_direction='conservative' AND {CITED}")
    freedom_conservative = c.fetchone()['n']

    c.execute(f"SELECT COUNT(*) AS n FROM cases WHERE primary_issue LIKE '%political communication%' AND {CITED}")
    freedom_total = c.fetchone()['n']

    c.execute(f"""
        SELECT ROUND(100.0*SUM(CASE WHEN min_votes>=2 THEN 1 ELSE 0 END)/COUNT(*),1) AS pct
        FROM cases WHERE primary_issue LIKE '%Corporations power%' AND {CITED}
    """)
    corps_contested = c.fetchone()['pct']

    conn.close()

    return {
        'summary': {
            'total_constitutional_cases': total_const,
            'unanimous_pct': round(100.0 * unanimous_const / total_const, 1),
            'freedom_total': freedom_total,
            'freedom_conservative_pct': round(100.0 * freedom_conservative / freedom_total, 1),
            'corporations_contested_pct': corps_contested,
        },
        'vote_splits': vote_splits,
        'topic_breakdown': topic_breakdown,
        'direction_by_era': direction_by_era,
        'implied_freedom': implied_freedom,
        'corporations_cases': corporations_cases,
    }


def main():
    print("Building insights data...")
    data = get_insights_data()

    Path(OUTPUT).parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✅ Wrote {OUTPUT}")
    s = data['summary']
    print(f"   {s['total_constitutional_cases']} constitutional cases")
    print(f"   {s['unanimous_pct']}% unanimous")
    print(f"   {len(data['topic_breakdown'])} topics")
    print(f"   {len(data['implied_freedom'])} implied freedom data points")


if __name__ == "__main__":
    main()
