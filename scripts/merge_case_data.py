"""
Merge case data from cases.json into the HCDB CSV.

The HCDB CSV has 7 rows per case (one per justice). This script adds
case-level columns (Term, HCA Citation, Case Name, etc.) from cases.json
to each group of 7 rows, matching on shared fields.
"""

import csv
import json
import os
from collections import defaultdict

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')

csv_path = os.path.join(RAW_DIR, 'HCDB-Release-2024-01.csv')
json_path = os.path.join(RAW_DIR, 'cases.json')
out_path = os.path.join(OUT_DIR, 'HCDB-with-cases.csv')

os.makedirs(OUT_DIR, exist_ok=True)

# Load case data
with open(json_path, 'r') as f:
    cases = json.load(f)

case_columns = cases['columns']
case_data = cases['data']

# Parse JSON cases into dicts and extract matching key
def parse_json_case(c):
    d = dict(zip(case_columns, c))
    outcome = d['Outcome']
    parts = outcome.split('<br/>')
    party = parts[0].strip()
    votes = parts[1].strip() if len(parts) > 1 else ''
    maj, minor = votes.split('-') if '-' in votes else ('', '')
    return d, (d['Term'], d['Primary Issue Area'], party, maj, minor)

# Group JSON cases by matching key, preserving order
json_by_key = defaultdict(list)
for c in case_data:
    d, key = parse_json_case(c)
    json_by_key[key].append(c)

# Read CSV
with open(csv_path, 'r', newline='') as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

# Index positions
term_idx = header.index('termDecision')
issue_idx = header.index('primaryIssueArea')
party_idx = header.index('partyWinning')
maj_idx = header.index('majVotes')
min_idx = header.index('minVotes')

# Track which JSON entries we've consumed per key
json_consumed = defaultdict(int)

# Build output
new_header = case_columns + header
new_rows = []
matched = 0
unmatched = 0
num_cases = len(rows) // 7

for case_idx in range(num_cases):
    base = case_idx * 7
    r = rows[base]
    key = (r[term_idx], r[issue_idx], r[party_idx], r[maj_idx], r[min_idx])

    candidates = json_by_key.get(key, [])
    consumed_idx = json_consumed[key]

    if consumed_idx < len(candidates):
        case_info = candidates[consumed_idx]
        json_consumed[key] += 1
        matched += 1
    else:
        case_info = [''] * len(case_columns)
        unmatched += 1

    for offset in range(7):
        new_rows.append(list(case_info) + rows[base + offset])

print(f"Total CSV cases: {num_cases}")
print(f"Matched: {matched}, Unmatched: {unmatched}")
print(f"JSON cases used: {sum(json_consumed.values())} / {len(case_data)}")

# Write output
with open(out_path, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(new_header)
    writer.writerows(new_rows)

print(f"Written to {out_path}")
