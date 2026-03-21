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

# Normalization rules for duplicate provisions
PROVISION_ALIASES = {
    "Ch III": "Chapter III",
    "Chapter III Judicial Power": "Judicial power",
    "Chapter III, Kable principle": "Judicial power - Kable principle",
    "Implied freedom of political communication": "Implied Freedom of Political Communication",
    "Implied freedom of political association": "Implied Freedom of Political Communication",
    "State Courts, Kable principle": "Judicial power - Kable principle",
    "Territory constitutional law - Kable principle": "Judicial power - Kable principle",
}

# English names for constitutional section numbers, verified against the Constitution text.
# NOTE: s 51(xxiA), s 51(xxiiA), and s 52(xx) are non-standard identifiers that appear in
# the source data (Lynch & Williams); they do not correspond to actual constitutional sections.
SECTION_ALIASES = {
    # Chapter I Part I – General
    "s 1": "Vesting of legislative power",

    # Chapter I Part II – The Senate (ss 7–23)
    "s 7": "The Senate",
    "s 8": "Qualification of senators",
    "s 9": "Method of choosing senators",
    "s 10": "Application of State laws to Senate elections",
    "s 12": "Issue of writs for Senate elections",
    "s 13": "Rotation of senators",
    "s 14": "Further provision for rotation of senators",
    "s 15": "Casual vacancies in the Senate",
    "s 16": "Qualifications of a senator",

    # Chapter I Part III – The House of Representatives (ss 24–40)
    "s 24": "Constitution of House of Representatives",
    "s 25": "Provision as to races disqualified from voting",
    "s 29": "Electoral divisions",
    "s 30": "Qualification of electors",
    "s 31": "Application of State laws to House elections",
    "s 34": "Qualifications of members of House",

    # Chapter I Part IV – Both Houses (ss 41–50)
    "s 41": "Right of electors of States",
    "s 44": "Disqualification from Parliament",
    "s 44(i)": "Allegiance to foreign power",
    "s 44(ii)": "Attainted of treason or under sentence",
    "s 44(iv)": "Office of profit under the Crown",
    "s 44(v)": "Pecuniary interest in Commonwealth contracts",
    "s 45": "Vacancy on happening of disqualification",
    "s 45(i)": "Vacancy on becoming subject to disqualification",
    "s 46": "Penalty for sitting when disqualified",
    "s 47": "Disputed elections and qualifications",
    "s 48": "Allowances to members",
    "s 49": "Privileges of Parliament",

    # Chapter I Part V – Powers of the Parliament (ss 51–60)
    "s 51": "Legislative powers of the Parliament",
    "s 51(i)": "Trade and commerce with other countries",
    "s 51(ii)": "Taxation",
    "s 51(v)": "Postal, telegraphic, telephonic services",
    "s 51(vi)": "Defence",
    "s 51(vii)": "Lighthouses, lightships, beacons and buoys",
    "s 51(x)": "Fisheries in Australian waters beyond territorial limits",
    "s 51(xiii)": "Banking, other than State banking",
    "s 51(xiv)": "Insurance, other than State insurance",
    "s 51(xvi)": "Bills of exchange and promissory notes",
    "s 51(xix)": "Naturalisation and aliens",
    "s 51(xx)": "Corporations power",
    "s 51(xxi)": "Marriage",
    "s 51(xxiA)": "Aboriginal affairs",        # non-standard source data identifier
    "s 51(xxii)": "Divorce and matrimonial causes",
    "s 51(xxiiA)": "Superannuation",           # non-standard source data identifier
    "s 51(xxiiiA)": "Social services",
    "s 51(xxiv)": "Service and execution throughout the Commonwealth",
    "s 51(xxvii)": "Immigration and emigration",
    "s 51(xxix)": "External affairs",
    "s 51(xxxi)": "Acquisition of property on just terms",
    "s 51(xxxii)": "Railways for defence",
    "s 51(xxxiii)": "Acquisition of State railways with consent",
    "s 51(xxxv)": "Conciliation and arbitration",
    "s 51(xxxvi)": "Matters referred to in the Constitution",
    "s 51(xxxvii)": "Matters referred by State Parliaments",
    "s 51(xxxviii)": "Exercise of power at request of State Parliaments",
    "s 51(xxxix)": "Incidental powers",
    "s 52": "Exclusive powers of the Parliament",
    "s 52(i)": "Exclusive power over seat of government",
    "s 52(xx)": "Borrowing of money",          # non-standard source data identifier
    "s 53": "Powers of Houses as to legislation",
    "s 54": "Appropriation bills",
    "s 55": "Tax bills",
    "s 56": "Recommendation of money votes",

    # Chapter II – The Executive Government (ss 61–70)
    "s 61": "Executive power",
    "s 64": "Ministers of State",
    "s 66": "Salaries of ministers",
    "s 68": "Command of naval and military forces",
    "s 69": "Transfer of certain departments",

    # Chapter III – The Judicature (ss 71–80)
    "s 71": "Judicial power and courts exercising it",
    "s 72": "Judges' appointment, tenure, remuneration, removal",
    "s 73": "Appellate jurisdiction of High Court",
    "s 74": "Appeal to the Queen in Council",
    "s 75": "Original jurisdiction of High Court",
    "s 75(iii)": "Original jurisdiction – Commonwealth as party",
    "s 75(iv)": "Original jurisdiction – inter-State matters",
    "s 75(v)": "Original jurisdiction – writs against Commonwealth officers",
    "s 76": "Additional original jurisdiction",
    "s 76(ii)": "Jurisdiction in matters under Commonwealth laws",
    "s 76(iii)": "Admiralty and maritime jurisdiction",
    "s 77": "Power to define jurisdiction",
    "s 77(i)": "Defining jurisdiction of federal courts",
    "s 77(iii)": "Investing State courts with federal jurisdiction",
    "s 78": "Proceedings against Commonwealth or State",
    "s 79": "Number of judges",
    "s 80": "Trial of indictable offences",

    # Chapter IV – Finance and Trade (ss 81–105)
    "s 81": "Consolidated Revenue Fund",
    "s 83": "Money to be appropriated by law",
    "s 90": "Exclusive power over customs and excise",
    "s 91": "Grants to States for bounties",
    "s 92": "Trade, commerce and intercourse to be free",
    "s 94": "Distribution of surplus revenue to States",
    "s 95": "Customs duties of Western Australia",
    "s 96": "Financial assistance to States",
    "s 97": "Audit",
    "s 98": "Trade and commerce includes navigation",
    "s 99": "Commonwealth not to give preference to States",
    "s 100": "Rights to use water",

    # Chapter V – The States (ss 106–120)
    "s 106": "Saving of State Constitutions",
    "s 107": "Saving of power of State Parliaments",
    "s 108": "Saving of State laws",
    "s 109": "Inconsistency of laws",
    "s 111": "States may surrender territory",
    "s 114": "States may not raise military forces",
    "s 116": "Commonwealth not to legislate in respect of religion",
    "s 117": "Rights of residents in States",
    "s 118": "Full faith and credit to State laws",

    # Chapter VI – New States (ss 121–124)
    "s 122": "Government of territories",
    "s 123": "Alteration of limits of States",
    "s 124": "Formation of new States",

    # Chapter VIII – Alteration of the Constitution
    "s 128": "Mode of altering the Constitution",
}


def normalize_provision_name(provision):
    """Normalize provision names to consolidate duplicates with different naming."""
    return PROVISION_ALIASES.get(provision, provision)


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
        'cases': [],
        'seen_citations': set(),
    })

    for row in rows:
        provision = normalize_provision_name(row['topic'])
        if provision not in provisions:
            provisions[provision] = {
                'topic': provision,
                'years': [],
                'cases': [],
                'seen_citations': set(),
            }

        if row['year']:
            provisions[provision]['years'].append(row['year'])

        if row['hca_citation']:
            if row['hca_citation'] not in provisions[provision]['seen_citations']:
                provisions[provision]['seen_citations'].add(row['hca_citation'])
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
            entry = {
                'provision': provision_name,
                'years': sorted(set(prov['years'])),
                'case_count': len(prov['cases']),
                'cases': prov['cases']
            }
            # Add alias if this is a section with a mapped English name
            if provision_name in SECTION_ALIASES:
                entry['alias'] = SECTION_ALIASES[provision_name]
            output_data.append(entry)

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
