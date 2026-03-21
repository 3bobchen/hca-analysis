"""
Build constitutional litigation data from hca.db for the dashboard.
Extracts constitutional topics with linked case details.
"""
import json
import sqlite3
from collections import defaultdict
from pathlib import Path

DB_FILE = "data/processed/hca.db"
OUTPUT = "website/public/constitutional.json"


def get_constitutional_data():
    """Query database for constitutional topics and linked cases"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all constitutional topics with their cases
    cursor.execute("""
        SELECT DISTINCT
            ct.id,
            ct.year,
            ct.topic,
            c.case_id,
            c.hca_citation,
            c.case_name,
            c.decision_date,
            c.decision_direction,
            c.case_disposition,
            c.party_winning,
            c.maj_votes,
            c.min_votes
        FROM constitutional_topics ct
        LEFT JOIN topic_case_mapping tcm ON ct.id = tcm.topic_id
        LEFT JOIN cases c ON tcm.case_id = c.case_id
        ORDER BY ct.topic, ct.year, c.decision_date
    """)

    rows = cursor.fetchall()
    conn.close()

    # Organize data by provision
    provisions = defaultdict(lambda: {
        'topic': None,
        'years': set(),
        'cases': []
    })

    for row in rows:
        provision = row['topic']
        if provision not in provisions:
            provisions[provision] = {
                'topic': provision,
                'years': [],
                'cases': []
            }

        if row['year']:
            provisions[provision]['years'].append(row['year'])

        if row['hca_citation']:
            case_info = {
                'citation': row['hca_citation'],
                'name': row['case_name'],
                'date': row['decision_date'],
                'direction': row['decision_direction'],
                'disposition': row['case_disposition'],
                'winning_party': row['party_winning'],
                'votes': f"{row['maj_votes']}-{row['min_votes']}" if row['maj_votes'] else None,
                'year': row['year']
            }
            provisions[provision]['cases'].append(case_info)

    # Convert sets to sorted lists and prepare output
    output_data = []
    for provision_name in sorted(provisions.keys()):
        prov = provisions[provision_name]
        if prov['cases']:  # Only include if has cases
            output_data.append({
                'provision': provision_name,
                'years': sorted(set(prov['years'])),
                'case_count': len(prov['cases']),
                'cases': prov['cases']
            })

    return {
        'provisions': output_data,
        'total_provisions': len(output_data),
        'total_cases': sum(len(p['cases']) for p in output_data)
    }


def main():
    print("Building constitutional litigation data...")
    data = get_constitutional_data()

    with open(OUTPUT, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✅ Wrote {OUTPUT}")
    print(f"   {data['total_provisions']} constitutional provisions")
    print(f"   {data['total_cases']} linked cases")


if __name__ == "__main__":
    main()
