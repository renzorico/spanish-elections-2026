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

## Done since (Codex audit follow-up, 31 Oct 2026)
- All 21 verified Codex findings fixed (see AUDIT.md follow-up); statement set still 30, polarity 15/15
- Notes are bilingual and clean; validator + build run `--strict`; browser regression suite added

## Next (in priority order)
0. **UI/UX redesign** (friendlier, catchier, shorter-feeling quiz) — see "UI/UX direction" below

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

## UI/UX redesign (in progress, 31 Oct 2026)
Done: new design system (paper/ink, Fraunces + Atkinson Hyperlegible, self-hosted), topic colours + icons, new home with countdown, dot-scale answers with Previous/Next always available, keyboard shortcuts, "Explícamelo fácil" plain-language line for every statement, topic weights per topic (Less ×0.5 / Same / More ×2, chosen by the owner: option B), results with province switcher (incl. all of Spain) and topic map, party detail with collapsible topics, shareable PNG + PDF card with QR, shorter election and methodology pages. Browser suite: 38 checks.
Decided by the owner: answer input A (dot scale), topic weights B (Less/Same/More). Open: party logos (licence-checked from Wikimedia Commons; monograms until then).

## Design round 2 (31 Oct 2026)
Owner's choices: logo B (hemicycle), hero keeps the big "30" tile inside a regular 4×4 mosaic plus a tappable example statement, fixed-height statement box (the answer scale never moves; explanations open below it), topic map as diverging bars with equal columns and angled headers, results always sorted by agreement (no random-order switch), statement lists per topic on the weights screen.
Exports rebuilt as vector PDFs with embedded Fraunces/Atkinson (site/js/pdf.js, report.js): full report (ranking, observations, topic map, every answer with party positions, return-to-results link) and a one-page summary to share (top 3 parties with enough data, invitation + QR; also as PNG). Restore link: site/js/restore.js (#r= fragment, never sent to servers).
Phone review done at 390 px and 320 px: sticky Previous/Next, short topic names in tiles, 2×2 facts, swipe hint on the topic map, no horizontal overflow. Tests: 48 unit, 51 browser checks.
Open: party logos (licence check in progress; monograms until then).

## Reference pages redesign (31 Oct 2026)
"Cómo se vota" and "Metodología" rebuilt in the current design system: sticky contents list (chips on phones), numbered sections with a one-line summary, one visual each and details collapsed.
- Cómo se vota: key facts, illustrated Congreso/Senado ballots, 3 % rule + worked D'Hondt example, "how many deputies does your province elect" widget (seats, lists analysed, approximate effective threshold), investiture flow, timeline, practical voting cards with official links, sources.
- Metodología: inclusion criteria + party chips, statement rules + 15/15 polarity bar, stance chips, confidence ladder, "nothing is inferred" callout, 3-step calculation + full agreement grid, results/downloads, privacy, limitations, per-party coverage bars, corrections.
- Shared widgets in site/js/reference.js (enhanceReference), used by the standalone pages and inside the app; in-page links scroll without touching the URL so the app's history is not affected.
- Fixed in passing: reference pages' CSP now allows the site's inline select icon; party-detail header no longer overflows at 320 px.
