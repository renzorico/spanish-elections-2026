# DATA_GAPS

_Updated 2026-10-31. Detailed per-party logs (what was searched, unreachable sites): `data/gaps/<party>.md`._

## Coverage summary

| Party | agree | disagree | neutral | no clear position | high/med/low |
|---|---|---|---|---|---|
| PP | 10 | 11 | 3 | 6 | 14/10/0 |
| PSOE | 10 | 14 | 1 | 5 | 14/7/4 |
| Vox | 14 | 12 | 0 | 4 | 20/6/0 |
| Frente Amplio | 12 | 12 | 0 | 6 | 20/4/0 |
| Podemos | 13 | 12 | 0 | 5 | 12/12/1 |
| ERC | 12 | 13 | 0 | 5 | 21/4/0 |
| Junts | 9 | 10 | 0 | 11 | 11/8/0 |
| EH Bildu | 12 | 10 | 0 | 8 | 19/3/0 |
| EAJ-PNV | 8 | 7 | 0 | 15 | 11/4/0 |
| BNG | 14 | 9 | 1 | 6 | 19/5/0 |
| CCa | 7 | 4 | 0 | 19 | 9/2/0 |
| Compromís | 12 | 11 | 0 | 7 | 15/7/1 |
| SALF | 4 | 3 | 1 | 22 | 0/2/6 |

## Statements with most `no_clear_position`

- `ins-referendum-monarquia`: 10 — PP, PSOE, Vox, Frente Amplio, Junts, EH Bildu, EAJ-PNV, BNG, CCa, SALF
- `inm-reducir-llegadas`: 9 — Frente Amplio, Podemos, ERC, Junts, EH Bildu, EAJ-PNV, BNG, CCa, Compromís
- `san-dental-publica`: 7 — PP, ERC, Junts, EAJ-PNV, CCa, Compromís, SALF
- `edu-lengua-castellano`: 7 — PSOE, Frente Amplio, Podemos, EAJ-PNV, BNG, CCa, SALF
- `ter-concierto-ccaa`: 7 — Frente Amplio, Podemos, EH Bildu, EAJ-PNV, CCa, Compromís, SALF
- `der-derogar-eutanasia`: 7 — Junts, EH Bildu, EAJ-PNV, BNG, CCa, Compromís, SALF
- `cli-coches-combustion-despues-2035`: 7 — Junts, EH Bildu, EAJ-PNV, BNG, CCa, Compromís, SALF
- `ext-gasto-defensa`: 6 — PP, Vox, Junts, EAJ-PNV, CCa, SALF
- `tra-salario-minimo`: 5 — PP, Vox, EAJ-PNV, CCa, SALF
- `san-gestion-privada`: 5 — PP, PSOE, ERC, EAJ-PNV, CCa

## Unreachable or blocked sources (not circumvented)
- **psoe.es** — bot-check page for curl/WebFetch. PSOE 2023 program cited from an identical copy (PDF author "PSOE") hosted by El Independiente. TODO: confirm the official URL https://www.psoe.es/media-content/2023/07/PROGRAMA_ELECTORAL-GENERALES-2023.pdf in a browser.
- **pp.es** — official 2023 summary reachable; full 112-page program cited from a copy hosted by RTP (Portuguese public broadcaster). PP "Contrato con España" (19/10/2026) page returned 404.
- **voxespana.es** — 403 for all requests; no Vox press releases used (Vox 2023 program from votaabascal.es, official campaign site).
- **podemos.info** — 403 (bot check); Podemos 2024 EP program and press releases unchecked.
- **esquerra.cat** — 403 (Cloudflare); ERC program from static.esquerra.cat.
- **frenteamplio.es** — no response / TLS failure.
- **SALF** — no reachable official site (salf.es 503). Only a regional (Castilla y León, March 2026) program, hosted by The Objective; all SALF codings are low/medium with notes.
- **EH Bildu** — 2023 program cited from a copy hosted by Newtral (no copy found on ehbildu.eus).
- **deia.eus** — 406 to automated clients (one PSOE source; a second, reachable source supports the same coding).
- `npm run check-sources` (2026-10-31): 116 URLs, 115 resolve.

## Congreso open data
- Latest sessions (e.g. 2 Oct 2026, housing RDLs 26 and 27/2026) publish only PNG charts, no per-deputy JSON → not usable for party attribution.
- Roll-call votes (votación por llamamiento: e.g. amnesty final votes 14/03 and 30/05/2024) have no JSON; the 14/03/2024 electronic "nuevo dictamen" vote is used instead.
- 15 statements have no matching XV-legislature vote (see `data/gaps/votes.md`).
- UPN's deputy (Mixed Group) is **not** counted with PP although they run jointly in Navarre in 2026: the PP group's votes are PP's record.

## 2026 programs
None of the 13 parties had published a 2026 general-election program as of 31 Oct 2026. All are marked "2026 program pending".

## Candidacies
Based on presented lists (BOE 28/10/2026); proclamation 2 Nov (BOE 3 Nov) still to check. See `data/gaps/candidacies.md`.

## Reconciliation and calibration decisions (after the neutrality audit)
- Single evidence ladder for all parties (see data/SCHEMA.md and the methodology page). Press-only evidence counts as low. Program PDFs mirrored on press sites count as party documents.
- Only DIRECT curated votes with a yes/no majority may create a coding. Related votes and abstentions are context only, and the validator enforces this.
- 12 statements were recoded for all 13 parties in one calibrated pass (data/recode/*.json holds the per-statement working files, with sources).
- Rewordings verified against primary sources: minimum wage (the Government has said since Feb 2023 that the SMI has reached 60 % of the average wage); wealth tax (now names the Temporary Solidarity Tax on Large Fortunes); regularisation (RD 316/2026, BOE 15/04/2026); defence (NATO 3.5 % target; Spain's "exception" is presented as the Government's claim).
- Remaining stance/vote differences all carry explanatory notes (`node scripts/reconcile_votes.mjs --dry`).
- `inm-reducir-llegadas` and `ins-referendum-monarquia` remain low-coverage (few parties take explicit positions); kept, because their absence is itself informative, and missing positions do not affect scores.
