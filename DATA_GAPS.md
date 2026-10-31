# DATA_GAPS

_Updated 2026-10-31. Detailed per-party logs (what was searched, unreachable sites): `data/gaps/<party>.md`._

## Coverage summary

| Party | agree | disagree | neutral | no clear position | high/med/low |
|---|---|---|---|---|---|
| PP | 5 | 16 | 3 | 6 | 13/10/1 |
| PSOE | 16 | 5 | 3 | 6 | 13/9/2 |
| Vox | 10 | 19 | 0 | 1 | 20/7/2 |
| Frente Amplio | 18 | 4 | 0 | 8 | 17/5/0 |
| Podemos | 19 | 4 | 0 | 7 | 12/9/2 |
| ERC | 18 | 6 | 0 | 6 | 20/4/0 |
| Junts | 10 | 9 | 1 | 10 | 11/9/0 |
| EH Bildu | 16 | 7 | 0 | 7 | 17/6/0 |
| EAJ-PNV | 11 | 3 | 1 | 15 | 11/4/0 |
| BNG | 17 | 5 | 1 | 7 | 19/4/0 |
| CCa | 11 | 3 | 0 | 16 | 10/4/0 |
| Compromís | 15 | 5 | 1 | 9 | 15/6/0 |
| SALF | 4 | 5 | 1 | 20 | 0/3/7 |

## Statements with most `no_clear_position`

- `viv-compra-no-residentes`: 11 — PP, Frente Amplio, Podemos, ERC, Junts, EH Bildu, EAJ-PNV, BNG, CCa, Compromís, SALF
- `inm-reducir-llegadas`: 11 — PP, PSOE, Frente Amplio, Podemos, ERC, Junts, EH Bildu, EAJ-PNV, BNG, CCa, Compromís
- `ins-referendum-monarquia`: 10 — PP, PSOE, Frente Amplio, Junts, EH Bildu, EAJ-PNV, BNG, CCa, Compromís, SALF
- `san-dental-publica`: 7 — PP, ERC, Junts, EAJ-PNV, CCa, Compromís, SALF
- `edu-lengua-castellano`: 7 — PSOE, Frente Amplio, Podemos, EAJ-PNV, BNG, CCa, SALF
- `ter-financiacion-cataluna`: 7 — Frente Amplio, Podemos, EH Bildu, EAJ-PNV, BNG, CCa, Compromís
- `der-eutanasia`: 7 — Junts, EH Bildu, EAJ-PNV, BNG, CCa, Compromís, SALF
- `cli-coches-2035`: 7 — Junts, EH Bildu, EAJ-PNV, BNG, CCa, Compromís, SALF
- `san-gestion-privada`: 5 — PP, PSOE, ERC, EAJ-PNV, CCa
- `edu-concertada`: 5 — PSOE, ERC, EH Bildu, EAJ-PNV, CCa
- `ter-referendum`: 5 — Frente Amplio, Podemos, CCa, Compromís, SALF
- `ter-recentralizar`: 4 — PP, Frente Amplio, Podemos, SALF

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

## Reconciliation decisions (votes vs. coded positions)
- Only DIRECT votes with a clear yes/no majority may fill a missing position (10 filled). Abstentions and related votes are attached as context only.
- CC `ins-cgpj`: recoded to agree/medium (most recent vote, 10/09/2026, yes to judges electing judicial members; earlier 2024 no).
- 20 remaining stance/vote differences all carry explanatory notes (mostly related votes or explicit later statements).
