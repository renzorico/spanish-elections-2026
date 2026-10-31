# PROGRESS

_Last updated: 2026-10-31_

## Done
- PLAN.md, data/SCHEMA.md, 11 topics, 30 statements (ES/EN), 13 parties (inclusion rule in PLAN §5)
- Provinces + seats from RD 806/2026 annex; candidacies from BOE 28 Oct 2026 (status: presented)
- Matching algorithm `site/js/match.js` + unit tests (`npm test`)
- Pipeline: `npm run votes` (Congreso open data → per-party tallies), `npm run validate`, `npm run build`, `npm run check-sources`
- Static frontend (`site/`): intro + explainer, province, 30 questions, topic weights, results with per-topic breakdown and sources; `eleccion.html`, `metodologia.html`

## In progress
- Party positions (subagents, one file per party in data/positions/)
- Congreso votes mapping (data/votes/curated.json)

## Next
- Merge program URLs into parties.json; reconcile votes vs coded positions
- Neutrality audit → AUDIT.md
- Re-check candidacies after proclamation (BOE 3 Nov 2026); add 2026 programs as parties publish them
- Optional: Catalan/Galician/Basque UI

## How to run
```
npm test && npm run build && npm run serve   # http://localhost:8000
```
