#!/usr/bin/env python3
"""
Migrate constitutional topics from table_c.json to hca.db
Creates junction tables linking topics to cases via HCA citation matching
"""

import json
import sqlite3
from pathlib import Path

# Paths
DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
TABLE_C_FILE = DATA_DIR / "table_c.json"
DB_FILE = DATA_DIR / "hca.db"

def create_tables(conn):
    """Create constitutional_topics and topic_case_mapping tables"""
    cursor = conn.cursor()

    # Table 1: Constitutional topics
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS constitutional_topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            topic TEXT NOT NULL,
            case_count INTEGER,
            UNIQUE(year, topic)
        )
    """)

    # Table 2: Topic to case mapping
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS topic_case_mapping (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic_id INTEGER NOT NULL,
            case_id INTEGER NOT NULL,
            hca_citation TEXT,
            FOREIGN KEY(topic_id) REFERENCES constitutional_topics(id),
            FOREIGN KEY(case_id) REFERENCES cases(id)
        )
    """)

    conn.commit()
    print("✓ Tables created (or already exist)")

def load_table_c(table_c_file):
    """Load table_c.json"""
    with open(table_c_file, 'r') as f:
        return json.load(f)

def normalize_citation(citation_str):
    """
    Convert table_c format to hca.db format
    "2003 HCA 31" → "[2003] HCA 31"
    """
    # Handle case where already in bracket format
    if citation_str.startswith("["):
        return citation_str

    # Extract year and number
    parts = citation_str.split()
    if len(parts) >= 3 and parts[1] == "HCA":
        year = parts[0]
        hca_num = parts[2]
        return f"[{year}] HCA {hca_num}"

    return citation_str

def insert_topics_and_mappings(conn, table_c_data):
    """Insert topics and create case mappings"""
    cursor = conn.cursor()

    stats = {
        'topics_inserted': 0,
        'mappings_created': 0,
        'mappings_failed': 0,
        'citations_not_found': []
    }

    for year_str, year_data in table_c_data['years'].items():
        year = int(year_str)
        topics = year_data.get('topics', [])

        for topic_info in topics:
            topic_name = topic_info['topic']
            case_count = topic_info.get('count', 0)
            references = topic_info.get('references', [])

            # Insert or get topic
            cursor.execute("""
                INSERT OR IGNORE INTO constitutional_topics
                (year, topic, case_count)
                VALUES (?, ?, ?)
            """, (year, topic_name, case_count))

            cursor.execute("""
                SELECT id FROM constitutional_topics
                WHERE year = ? AND topic = ?
            """, (year, topic_name))

            topic_row = cursor.fetchone()
            if not topic_row:
                print(f"ERROR: Could not insert topic {year} {topic_name}")
                continue

            topic_id = topic_row[0]
            stats['topics_inserted'] += 1

            # Match each reference to a case
            for hca_ref in references:
                normalized_citation = normalize_citation(hca_ref)

                # Try to find matching case
                cursor.execute("""
                    SELECT case_id FROM cases WHERE hca_citation = ?
                """, (normalized_citation,))

                case_row = cursor.fetchone()

                if case_row:
                    case_id = case_row[0]

                    # Insert mapping
                    cursor.execute("""
                        INSERT OR IGNORE INTO topic_case_mapping
                        (topic_id, case_id, hca_citation)
                        VALUES (?, ?, ?)
                    """, (topic_id, case_id, normalized_citation))

                    stats['mappings_created'] += 1
                else:
                    stats['mappings_failed'] += 1
                    stats['citations_not_found'].append({
                        'year': year,
                        'topic': topic_name,
                        'citation': normalized_citation
                    })

    conn.commit()
    return stats

def print_stats(stats):
    """Print migration statistics"""
    print("\n" + "=" * 70)
    print("Migration Statistics")
    print("=" * 70)
    print(f"Topics inserted: {stats['topics_inserted']}")
    print(f"Mappings created: {stats['mappings_created']}")
    print(f"Mappings failed (citation not found): {stats['mappings_failed']}")

    if stats['citations_not_found']:
        print(f"\n⚠ {len(stats['citations_not_found'])} citations not matched in hca.db:")
        # Group by year for readability
        by_year = {}
        for item in stats['citations_not_found']:
            year = item['year']
            if year not in by_year:
                by_year[year] = []
            by_year[year].append(item['citation'])

        for year in sorted(by_year.keys()):
            print(f"\n  {year}:")
            for citation in sorted(set(by_year[year]))[:5]:  # Show first 5
                print(f"    - {citation}")
            if len(by_year[year]) > 5:
                print(f"    ... and {len(by_year[year]) - 5} more")

    print("\n" + "=" * 70)

def main():
    print("Migrating constitutional topics to hca.db...")
    print(f"Reading from: {TABLE_C_FILE}")
    print(f"Writing to: {DB_FILE}")

    # Load data
    table_c_data = load_table_c(TABLE_C_FILE)

    # Connect to database
    conn = sqlite3.connect(DB_FILE)

    try:
        # Create tables
        create_tables(conn)

        # Insert data and create mappings
        stats = insert_topics_and_mappings(conn, table_c_data)

        # Print results
        print_stats(stats)

        print("\n✅ Migration complete!")

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    main()
