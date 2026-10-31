# PROGRESS

_Last updated: 2026-10-31_

## Done
- PLAN.md, data/SCHEMA.md; 11 topics, 30 neutral statements (ES/EN), polarity balanced 15/15
- 13 parties coded (390 positions), each with source + quote + confidence or "no clear position"
- 29 Congreso XV votes (official open data, per deputy) + Mixed Group deputy mapping; reconciliation script
- Provinces + seats (RD 806/2026 annex); candidacies (BOE 28/10/2026, status "presented") with one inclusion rule and coalition notices
- Matching algorithm + tests; static frontend (ES/EN), explainer and methodology pages
- Independent neutrality audit → AUDIT.md (7 HIGH / 13 MEDIUM / 11 LOW; all HIGH fixed); calibrated recode of 12 statements
- `npm test` 29/29; `npm run validate` 0 errors; source check 115/116 reachable (1 bot-blocked, second source supports)

## Next (in priority order)
1. **3 Nov 2026**: re-parse proclaimed candidacies (BOE 3 Nov), set `candidacies.json` status to `proclaimed`; check Asturias "PODEMOS (PAZ, CASA Y TRABAJO)" (AUDIT L10)
2. As parties publish 2026 programs: set `program_2026.status = published` and recode against them (start with statements coded from 2023 programs)
3. Confirm the official psoe.es 2023 program URL in a browser (DATA_GAPS)
4. Deploy: Pages workflow added (`.github/workflows/pages.yml`). Remaining: enable *Settings → Pages → Source: GitHub Actions* and merge to `main`
5. Optional: Catalan / Galician / Basque UI strings (add to `site/js/i18n.js`; statements need translations in `data/statements.json`)

## How to run
```
npm test && npm run build && npm run serve   # http://localhost:8000
node scripts/reconcile_votes.mjs --dry      # vote vs. coding conflicts
npm run check-sources                       # URL liveness
```
