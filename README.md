# DFD Directory — test deployment

This repository is a GitHub Pages-compatible static build of the Department of Fisheries directory.

## Build and hosting
- GitHub Pages is deployed by `.github/workflows/deploy.yml`.
- The workflow builds the Next.js app as static HTML under `out/`.
- The site base path is `/dof-derectory-test`.

## Daily source refresh
- A GitHub Actions schedule runs at 00:15 Bangladesh time (18:15 UTC).
- `scripts/daily_refresh.py` checks official source URLs already present in `data/seed.json`.
- Existing staff are never deleted on source errors. New records are added only when a table row contains a plausible name and designation.
- `data/last-refresh.json` records scan coverage and failures.
- Government sites have different layouts and availability. A scheduled run is not proof that every office was successfully checked; inspect the report after each run.

## Current limitations
GitHub Pages is static hosting. Search, office pages and directory browsing work in the browser. Persistent admin CRUD, authentication and immediate writes require a separate backend and are intentionally not wired to the production DFD database.

<!-- Photo recovery run trigger -->
