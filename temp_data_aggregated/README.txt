NSW PSI yearly metrics output

Geography assumptions:
- region = mapped region from district_region_mapping.csv
- subregion = postcode within mapped region
- suburb = locality within mapped region/postcode

Classification assumptions:
- 2001+ files: RESIDENCE/RESIDENTIAL with a strata lot number is apartment-like.
- 2001+ files: RESIDENCE/RESIDENTIAL without a strata lot number is house-like.
- 1990-2000 files: apartment-like sales are inferred from legal descriptions containing SP/STRATA/UNIT/FLAT/APARTMENT.
- 1990-2000 house medians remain heuristic.

Rows with fewer than 20 total sales across all years were removed.

