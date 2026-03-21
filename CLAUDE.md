# HCA Analysis

Analysis project for High Court of Australia (HCA) case data using the High Court Database (HCDB).

## Project Structure

- `data/raw/` — source data (HCDB CSV + cases.json scraped from HCDB website)
- `data/processed/` — merged CSV and normalized SQLite database
- `scripts/` — data processing scripts
- `notebooks/` — Jupyter notebooks for analysis
- `website/` — Vite + React dashboard deployed to GitHub Pages

## Data Pipeline

1. `scripts/merge_case_data.py` — merges case metadata from `cases.json` into the HCDB CSV, matching on (term, issue area, party winning, votes). Outputs `data/processed/HCDB-with-cases.csv`.
2. `scripts/build_db.py` — builds a normalized SQLite database (`data/processed/hca.db`) from the merged CSV with three tables: `justices`, `cases`, `justice_votes`.

## Column Guide

See @docs/column-guide.md for a detailed guide to all 69 columns in `HCDB-with-cases.csv`, including descriptions, possible values, and coding rules derived from the HCDB Codebook.

## Key Data Facts

- The HCDB CSV has 7 rows per case (one per justice on the bench)
- 1,816 total cases; 1,418 matched to cases.json, 398 unmatched (no case name/citation)
- The only column that varies per justice within a case is `app_pm_party`
- Justice name parsing handles "Gleeson, M" edge case

## Commands

```bash
python3 scripts/merge_case_data.py      # rebuild merged CSV
python3 scripts/build_db.py             # rebuild SQLite database
python3 scripts/build_dashboard_data.py # rebuild website/public/data.json from CSV
cd website && npm run dev               # local dev server
cd website && npm run build             # production build -> website/dist/
```

## Dependencies

Python 3 with stdlib only for scripts (csv, sqlite3, json). `requirements.txt` has pandas, jupyter, matplotlib for notebook analysis.
