"""
Build a normalized SQLite database from the merged HCDB-with-cases CSV.

Creates three tables:
  - justices: reference table of distinct justices
  - cases: one row per case (case-level columns only)
  - justice_votes: one row per justice per case (appPMParty + seat order)

Usage:
    python scripts/build_db.py
"""

import csv
import os
import re
import sqlite3

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')
CSV_PATH = os.path.join(PROCESSED_DIR, 'HCDB-with-cases.csv')
DB_PATH = os.path.join(PROCESSED_DIR, 'hca.db')

# --- Column mapping (CSV camelCase -> DB snake_case) ---
# Columns 0-7 are from cases.json, 8-68 are from HCDB
JSON_COLUMNS = {
    'Term': 'term',
    'HCA Citation': 'hca_citation',
    'Case Name': 'case_name',
    'Decision Date': 'decision_date',
    'Primary Issue Area': 'primary_issue_area_json',
    'Outcome': 'outcome',
    'Justices': 'justices_str',
    'url': 'url',
}

# HCDB columns that go into the cases table (all except appPMParty)
HCDB_CASE_COLUMNS = {
    'multipleMatters': 'multiple_matters',
    'numMultipleMatters': 'num_multiple_matters',
    'numAppellants': 'num_appellants',
    'numFedGovAppellant': 'num_fed_gov_appellant',
    'numStateGovAppellant': 'num_state_gov_appellant',
    'numCorpAppellant': 'num_corp_appellant',
    'numNonCorpOrgAppellant': 'num_non_corp_org_appellant',
    'numIndividualAppellant': 'num_individual_appellant',
    'numRespondents': 'num_respondents',
    'numFedGovResp': 'num_fed_gov_resp',
    'numStateGovResp': 'num_state_gov_resp',
    'numCorpResp': 'num_corp_resp',
    'numNonCorpOrgResp': 'num_non_corp_org_resp',
    'numIndividualResp': 'num_individual_resp',
    'intervener': 'intervener',
    'numIntervener': 'num_intervener',
    'amicus': 'amicus',
    'numAmici': 'num_amici',
    'jurisdictionGeneral': 'jurisdiction_general',
    'jurisdictionSpecific': 'jurisdiction_specific',
    'adminAction': 'admin_action',
    'caseOriginGeneral': 'case_origin_general',
    'caseOriginSpecific': 'case_origin_specific',
    'caseOriginState': 'case_origin_state',
    'caseSourceGeneral': 'case_source_general',
    'caseSourceSpecific': 'case_source_specific',
    'caseSourceState': 'case_source_state',
    'lcDisposition': 'lc_disposition',
    'lcDispositionDirection': 'lc_disposition_direction',
    'specialLeaveMethod': 'special_leave_method',
    'numJusticesSL': 'num_justices_sl',
    'prelimSLHearing': 'prelim_sl_hearing',
    'prelimSLNatCourt': 'prelim_sl_nat_court',
    'referralJustice': 'referral_justice',
    'prelimSLOutcome': 'prelim_sl_outcome',
    'politicalPowerSL': 'political_power_sl',
    'yearSL': 'year_sl',
    'termSL': 'term_sl',
    'chiefSL': 'chief_sl',
    'pmSL': 'pm_sl',
    'yearArgument': 'year_argument',
    'termArgument': 'term_argument',
    'chiefArgument': 'chief_argument',
    'politicalPowerArgument': 'political_power_argument',
    'pmArgument': 'pm_argument',
    'yearDecision': 'year_decision',
    'termDecision': 'term_decision',
    'primaryIssueArea': 'primary_issue_area',
    'primaryIssueSubArea': 'primary_issue_sub_area',
    'primaryIssue': 'primary_issue',
    'decisionDirection': 'decision_direction',
    'decisionDirectionDissent': 'decision_direction_dissent',
    'caseDisposition': 'case_disposition',
    'partyWinning': 'party_winning',
    'majVotes': 'maj_votes',
    'minVotes': 'min_votes',
    'proportionLiberalPanel': 'proportion_liberal_panel',
    'proportionLiberalCourt': 'proportion_liberal_court',
    'proportionWomenPanel': 'proportion_women_panel',
    'proportionWomenCourt': 'proportion_women_court',
}

# Columns that should be stored as INTEGER
INT_COLS = {
    'num_multiple_matters', 'num_appellants', 'num_fed_gov_appellant',
    'num_state_gov_appellant', 'num_corp_appellant', 'num_non_corp_org_appellant',
    'num_individual_appellant', 'num_respondents', 'num_fed_gov_resp',
    'num_state_gov_resp', 'num_corp_resp', 'num_non_corp_org_resp',
    'num_individual_resp', 'num_intervener', 'num_amici', 'num_justices_sl',
    'year_sl', 'year_argument', 'year_decision', 'maj_votes', 'min_votes',
}

# Columns that should be stored as REAL
REAL_COLS = {
    'proportion_liberal_panel', 'proportion_liberal_court',
    'proportion_women_panel', 'proportion_women_court',
}


def coerce(value, col_name):
    """Convert a CSV string value to the appropriate Python type."""
    if value == '':
        return None
    if col_name in INT_COLS:
        return int(value)
    if col_name in REAL_COLS:
        return float(value)
    return value


def parse_justices(justices_str):
    """Parse comma-separated justice names, handling 'Gleeson, M' as one name."""
    if not justices_str:
        return []
    # Normalize "Gleeson, M" to "Gleeson" before splitting
    s = re.sub(r'Gleeson,\s*M\b', 'Gleeson', justices_str)
    return [name.strip() for name in s.split(', ') if name.strip()]


def sql_type(col_name):
    """Return the SQL type for a column name."""
    if col_name in INT_COLS:
        return 'INTEGER'
    if col_name in REAL_COLS:
        return 'REAL'
    return 'TEXT'


def build_db():
    # Read CSV
    with open(CSV_PATH, 'r', newline='') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    num_cases = len(rows) // 7
    print(f"CSV rows: {len(rows)}, Cases: {num_cases}")

    # Collect all unique justice names
    all_justices = set()
    for case_idx in range(num_cases):
        justices_str = rows[case_idx * 7].get('Justices', '')
        for name in parse_justices(justices_str):
            all_justices.add(name)
    all_justices = sorted(all_justices)
    justice_name_to_id = {name: i + 1 for i, name in enumerate(all_justices)}
    print(f"Distinct justices: {len(all_justices)}")

    # Remove existing DB
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Build case columns definition for CREATE TABLE
    case_col_defs = []
    case_col_names = []
    for csv_col, db_col in JSON_COLUMNS.items():
        case_col_defs.append(f'    {db_col} {sql_type(db_col)}')
        case_col_names.append(db_col)
    for csv_col, db_col in HCDB_CASE_COLUMNS.items():
        case_col_defs.append(f'    {db_col} {sql_type(db_col)}')
        case_col_names.append(db_col)

    # Create tables
    cur.execute('CREATE TABLE justices (\n'
                '    justice_id INTEGER PRIMARY KEY,\n'
                '    name TEXT NOT NULL UNIQUE\n'
                ')')

    cur.execute('CREATE TABLE cases (\n'
                '    case_id INTEGER PRIMARY KEY,\n'
                + ',\n'.join(case_col_defs) + '\n'
                ')')

    cur.execute('CREATE TABLE justice_votes (\n'
                '    vote_id INTEGER PRIMARY KEY,\n'
                '    case_id INTEGER NOT NULL REFERENCES cases(case_id),\n'
                '    justice_id INTEGER REFERENCES justices(justice_id),\n'
                '    seat_order INTEGER NOT NULL,\n'
                '    app_pm_party TEXT\n'
                ')')

    cur.execute('CREATE INDEX idx_justice_votes_case ON justice_votes(case_id)')
    cur.execute('CREATE INDEX idx_justice_votes_justice ON justice_votes(justice_id)')

    # Insert justices
    for name, jid in justice_name_to_id.items():
        cur.execute('INSERT INTO justices (justice_id, name) VALUES (?, ?)', (jid, name))

    # Insert cases and justice_votes
    case_insert_cols = ', '.join(case_col_names)
    case_placeholders = ', '.join(['?'] * len(case_col_names))
    case_insert_sql = f'INSERT INTO cases ({case_insert_cols}) VALUES ({case_placeholders})'

    vote_insert_sql = 'INSERT INTO justice_votes (case_id, justice_id, seat_order, app_pm_party) VALUES (?, ?, ?, ?)'

    for case_idx in range(num_cases):
        base = case_idx * 7
        row = rows[base]

        # Build case values
        case_values = []
        for csv_col, db_col in JSON_COLUMNS.items():
            case_values.append(coerce(row[csv_col], db_col))
        for csv_col, db_col in HCDB_CASE_COLUMNS.items():
            case_values.append(coerce(row[csv_col], db_col))

        cur.execute(case_insert_sql, case_values)
        case_id = cur.lastrowid

        # Parse justice names for this case
        justices_str = row.get('Justices', '')
        justice_names = parse_justices(justices_str)

        # Insert 7 justice_votes rows
        for seat in range(7):
            vote_row = rows[base + seat]
            app_pm_party = vote_row['appPMParty'] or None

            if seat < len(justice_names):
                justice_id = justice_name_to_id.get(justice_names[seat])
            else:
                justice_id = None

            cur.execute(vote_insert_sql, (case_id, justice_id, seat, app_pm_party))

    conn.commit()

    # Verification
    print("\n--- Verification ---")
    cur.execute('SELECT COUNT(*) FROM cases')
    print(f"Total cases: {cur.fetchone()[0]}")

    cur.execute('SELECT COUNT(*) FROM justice_votes')
    print(f"Total justice_votes: {cur.fetchone()[0]}")

    cur.execute('SELECT COUNT(*) FROM justices')
    print(f"Total justices: {cur.fetchone()[0]}")

    cur.execute("SELECT COUNT(*) FROM cases WHERE hca_citation IS NOT NULL AND hca_citation != ''")
    matched = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM cases WHERE hca_citation IS NULL OR hca_citation = ''")
    unmatched = cur.fetchone()[0]
    print(f"Cases with HCA citation: {matched}")
    print(f"Cases without HCA citation: {unmatched}")

    cur.execute('SELECT case_id, COUNT(*) AS n FROM justice_votes GROUP BY case_id HAVING n != 7')
    bad = cur.fetchall()
    print(f"Cases with != 7 votes: {len(bad)}")

    cur.execute('SELECT case_id, justice_id, COUNT(*) AS n FROM justice_votes '
                'WHERE justice_id IS NOT NULL GROUP BY case_id, justice_id HAVING n > 1')
    dupes = cur.fetchall()
    print(f"Duplicate justice-case pairs: {len(dupes)}")

    conn.close()
    print(f"\nDatabase written to {DB_PATH}")


if __name__ == '__main__':
    build_db()
