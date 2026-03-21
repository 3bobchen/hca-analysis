"""
Build a summary JSON from HCDB-with-cases.csv for the dashboard frontend.
Since the CSV has 7 rows per case (one per justice), we deduplicate to case-level
for most aggregations.
"""
import csv
import json
from collections import Counter, defaultdict

INPUT = "data/processed/HCDB-with-cases.csv"
OUTPUT = "website/public/data.json"


def main():
    rows = []
    with open(INPUT, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    # Deduplicate to case-level using HCA Citation as key
    seen = set()
    cases = []
    for row in rows:
        key = row["HCA Citation"]
        if key not in seen:
            seen.add(key)
            cases.append(row)

    # 1. Cases per term
    term_counts = Counter(c["termDecision"] for c in cases if c["termDecision"])
    cases_by_term = [
        {"term": t, "count": n}
        for t, n in sorted(term_counts.items())
    ]

    # 2. Cases by primary issue area
    issue_counts = Counter(c["primaryIssueArea"] for c in cases if c["primaryIssueArea"])
    cases_by_issue = [
        {"area": a, "count": n}
        for a, n in sorted(issue_counts.items(), key=lambda x: -x[1])
    ]

    # 3. Decision direction over time
    direction_by_term = defaultdict(lambda: {"liberal": 0, "conservative": 0, "unspecifiable": 0})
    for c in cases:
        t = c["termDecision"]
        d = c["decisionDirection"]
        if t and d:
            direction_by_term[t][d] += 1
    direction_trend = [
        {"term": t, **counts}
        for t, counts in sorted(direction_by_term.items())
    ]

    # 4. Case disposition (outcomes)
    disp_counts = Counter(c["partyWinning"] for c in cases if c["partyWinning"])
    party_winning = [
        {"outcome": o, "count": n}
        for o, n in sorted(disp_counts.items(), key=lambda x: -x[1])
    ]

    # 5. Jurisdiction breakdown
    juris_counts = Counter(c["jurisdictionGeneral"] for c in cases if c["jurisdictionGeneral"])
    jurisdiction = [
        {"type": t, "count": n}
        for t, n in sorted(juris_counts.items(), key=lambda x: -x[1])
    ]

    # 6. Vote margin distribution (maj - min)
    margin_counts = Counter()
    for c in cases:
        try:
            maj = int(c["majVotes"])
            mi = int(c["minVotes"])
            label = f"{maj}-{mi}"
            margin_counts[label] += 1
        except (ValueError, KeyError):
            pass
    vote_splits = [
        {"split": s, "count": n}
        for s, n in sorted(margin_counts.items(), key=lambda x: -x[1])
    ]

    # 7. Origin state breakdown
    state_counts = Counter(c["caseOriginState"] for c in cases if c["caseOriginState"])
    origin_states = [
        {"state": s, "count": n}
        for s, n in sorted(state_counts.items(), key=lambda x: -x[1])
    ]

    # 8. Panel composition trends (avg liberal proportion per term)
    liberal_by_term = defaultdict(list)
    women_by_term = defaultdict(list)
    for c in cases:
        t = c["termDecision"]
        lp = c["proportionLiberalPanel"]
        wp = c["proportionWomenPanel"]
        if t and lp:
            try:
                liberal_by_term[t].append(float(lp))
            except ValueError:
                pass
        if t and wp:
            try:
                women_by_term[t].append(float(wp))
            except ValueError:
                pass
    panel_composition = [
        {
            "term": t,
            "avgLiberalPanel": round(sum(liberal_by_term[t]) / len(liberal_by_term[t]), 3),
            "avgWomenPanel": round(sum(women_by_term.get(t, [0])) / max(len(women_by_term.get(t, [1])), 1), 3),
        }
        for t in sorted(liberal_by_term.keys())
    ]

    # Per-term breakdowns for frontend filtering
    by_term = defaultdict(lambda: {
        "issueArea": Counter(),
        "partyWinning": Counter(),
        "jurisdiction": Counter(),
        "voteSplits": Counter(),
        "originStates": Counter(),
        "unanimous": 0,
    })
    for c in cases:
        t = c.get("termDecision")
        if not t:
            continue
        if c.get("primaryIssueArea"):
            by_term[t]["issueArea"][c["primaryIssueArea"]] += 1
        if c.get("partyWinning"):
            by_term[t]["partyWinning"][c["partyWinning"]] += 1
        if c.get("jurisdictionGeneral"):
            by_term[t]["jurisdiction"][c["jurisdictionGeneral"]] += 1
        try:
            label = f"{int(c['majVotes'])}-{int(c['minVotes'])}"
            by_term[t]["voteSplits"][label] += 1
        except (ValueError, KeyError):
            pass
        if c.get("caseOriginState"):
            by_term[t]["originStates"][c["caseOriginState"]] += 1
        if c.get("minVotes") == "0":
            by_term[t]["unanimous"] += 1

    by_term_json = {
        t: {
            "issueArea": dict(v["issueArea"]),
            "partyWinning": dict(v["partyWinning"]),
            "jurisdiction": dict(v["jurisdiction"]),
            "voteSplits": dict(v["voteSplits"]),
            "originStates": dict(v["originStates"]),
            "unanimous": v["unanimous"],
        }
        for t, v in by_term.items()
    }

    # Summary stats
    total_cases = len(cases)
    total_terms = len(term_counts)
    unanimous = sum(1 for c in cases if c.get("minVotes") == "0")

    data = {
        "summary": {
            "totalCases": total_cases,
            "totalTerms": total_terms,
            "unanimousDecisions": unanimous,
            "unanimousPct": round(unanimous / total_cases * 100, 1),
            "termRange": f"{min(term_counts.keys())} to {max(term_counts.keys())}",
        },
        "casesByTerm": cases_by_term,
        "casesByIssue": cases_by_issue,
        "directionTrend": direction_trend,
        "partyWinning": party_winning,
        "jurisdiction": jurisdiction,
        "voteSplits": vote_splits,
        "originStates": origin_states,
        "panelComposition": panel_composition,
        "byTerm": by_term_json,
    }

    with open(OUTPUT, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Wrote {OUTPUT} ({total_cases} cases)")


if __name__ == "__main__":
    main()
