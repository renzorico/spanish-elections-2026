# AUDIT — Neutrality review

_Audit date: 2026-10-31. Run by a separate reviewer that did not build the tool. It covered wording, party coverage, source quality and ordering. Full report, describing the state before fixes: [docs/audit_findings_2026-10-31.md](docs/audit_findings_2026-10-31.md)._

## What was checked

| Area | Method | Result |
|---|---|---|
| Vote tallies | Recomputed all 27 curated votes from the raw Congreso JSON; 2 re-fetched live | 27/27 exact; `yes_means` direction correct in all 27 |
| Program quotes | All 226 program quotes searched in the downloaded PDFs | 226/226 found |
| Web quotes | 18 pages fetched | 18/18 verbatim |
| Position sample | 63 positions: 51 stratified random (≥3 per party) + 12 targeted on reversed statements | 43 OK · 9 wrong confidence · 5 quote does not support the coding · 3 inconsistent standard · 1 unreachable · 0 quote not found |
| Ordering / UI | Code review of `app.js` and `match.js` | Random party, statement and topic order (crypto RNG); sorting opt-in; no recommendation labels; no party colours |
| Fabrication | — | None found |

The auditor concluded that none of the problems showed deliberate partisanship. They came from parallel coders that had not been calibrated against each other, and from a mechanical reversal of statement wording.

## Findings and fixes

Severity: **H** high · **M** medium · **L** low. Status: ✅ fixed · ⚠️ partly fixed or mitigated · ⏳ open.

| # | Finding | Fix | Status |
|---|---|---|---|
| H1 | Province rule applied inconsistently: PP shown in Navarra (UPN-led list) and Frente Amplio in Aragón/Baleares, while Podemos and Frente Amplio were hidden in Canarias (NC-led UPC) | One rule everywhere: a party is listed when its name, regional brand or a member party appears in the BOE candidacy name. Coalition membership under another party's lead is shown with the official ballot name and a notice (`candidacies.json` → `coalition_member`). Canarias and the Valencian provinces now list Podemos and Frente Amplio inside UPC and Compromís. | ✅ |
| H2 | Coders filled gaps from related or uncurated votes for some parties but not for others | Single rule: only a **direct** curated vote with a yes/no majority may create a coding. Related votes and abstentions are context only. The validator now rejects `vote_xv` codings without a direct vote or a quote. Affected codings reverted (CC/Junts on rent caps; BNG/CC/Junts on the memory law); IRPF and eviction items recoded for all parties. | ✅ |
| H3 | `inm-regularizacion` ignored the 2026 regularisation (RD 316/2026, BOE 15/04/2026) | Statement reworded as a general principle, context updated with RD 316/2026, all 13 parties recoded | ✅ |
| H4 | `ext-gasto-defensa` did not say which NATO target, so a 2 % pledge was "agree" for PP and "disagree" for PSOE | Statement now names the 3.5 % of GDP target (The Hague, 2025); all 13 parties recoded | ✅ |
| H5 | A non-repeal PNL on the memory law was labelled "direct", which gave high confidence | Relabelled `related`; codings based only on it reverted to `no_clear_position`; Compromís and Podemos capped at medium; contradictory vote notes rewritten | ✅ |
| H6 | `der-cambio-sexo-informe` coded from generic pro- or anti-LGTBI text for several parties | Recoded for all 13 parties under a strict rule: only text on self-determination, medical reports or repeal of Law 4/2023 counts | ✅ |
| H7 | Energy-and-banks tax item asked two things at once; context omitted the bank tax in force (Ley 7/2024) | Split into `eco-impuesto-energeticas` and `eco-suprimir-impuesto-banca`, both with accurate context; all parties coded | ✅ |
| M1 | Same regularisation vote gave PSOE medium and others high | Recoded together (H3) | ✅ |
| M2 | Vox monarchy coding was an inference; BNG left uncoded | Recoded for all parties under the no-inference rule | ✅ |
| M3 | Press-only evidence was medium for some parties, low for others | Ladder clarified (press-only = low) and applied: PSOE on 2035 cars → low. A press-only/official-source check was run over all positions; program PDFs mirrored on press sites count as party documents. | ✅ |
| M4 | Methodology said Frente Amplio is capped at medium on the Sumar program, but the data had high | Methodology now states that Frente Amplio, as Sumar's successor, is not capped; Podemos and Compromís are | ✅ |
| M5 | Same Sumar quote: Frente Amplio medium, Podemos low (2035 cars) | Both medium | ✅ |
| M6 | Acquiescence bias (17 statements where "agree" = left vs 13 right); limited-data parties could top the sorted view | Polarity rebalanced to 15/15 (languages item reversed, bank-tax item framed as abolition, non-EU buyers item dropped). Limited data is now ≤ 50 % and such parties are listed after the others when sorting. | ✅ |
| M7 | Low-information items (non-EU buyers 2/13 coded; immigration numbers 2/13; monarchy referendum 3/13) | Non-EU buyers item removed; the other two re-searched for all parties | ⚠️ (see coverage in DATA_GAPS.md) |
| M8 | Territorial items centred on Catalonia | Catalan financing item generalised to "regions that ask for it should be able to collect all their taxes" | ✅ |
| M9 | Only the tax-cut item carried a cost clause | Cost clause removed | ✅ |
| M10 | Eviction item asked two things (speed + vulnerable occupants) | Vulnerability clause removed; all parties recoded | ✅ |
| M11 | Minimum-wage "reach 60 %" premise possibly outdated | Verified and reworded by the recoder (see `data/statements.json`) | ✅ |
| M12 | Contradictory "yes =" text in vote notes shown to users | Notes rewritten | ✅ |
| M13 | Unclear how coalition votes count for the 1 % criterion (Geroa Bai) | Methodology: coalition votes count only for the coalition as a whole | ✅ |
| L1–L3 | Context lines: dangling reference (2035 cars), incomplete (37.5 h week, abortion), inaccurate dates (recentralisation) | Rewritten | ✅ |
| L4 | Wealth-tax item ambiguous (two taxes) | Clarified by the recoder | ✅ |
| L5 | National 2 % rent-update cap labelled a "direct" vote on rent caps in high-price areas | Relabelled `related` | ✅ |
| L6 | Neutral party stance cushions scores; PP minimum wage was neutral without an explicit intermediate position | Recoded (M11); methodology explains the effect of neutral codings | ✅ |
| L7 | Official titles containing charged words repeated unquoted in vote notes | Official titles now in «…»; the loaded-term lint now covers vote notes (quoted titles exempt) | ✅ |
| L8 | Stale coverage table in DATA_GAPS.md | Regenerated | ✅ |
| L9 | Podemos notes said "capped at medium" on high codings | Notes corrected | ✅ |
| L10 | Asturias "PODEMOS (PAZ, CASA Y TRABAJO)" mapped to Podemos without confirmation | Re-check after proclamation (BOE 3 Nov) | ⏳ |
| L11 | Explainer omitted the 2-seat provincial minimum | Added | ✅ |

## Checks now automated (run on every `npm test`)

* Loaded-term lint on statements, context lines, UI strings and vote notes. Position notes get warnings.
* No "recommended", "best match" or "winner" wording anywhere in the UI.
* No browser storage, cookies or third-party requests.
* Random order by default; sorting opt-in.
* A `vote_xv` coding needs a direct curated vote or a quoted source.
* A coded stance that contradicts a linked vote without a note fails validation.
* Every position has ≥ 1 source; coded positions have quotes; the province file must hold 52 constituencies and 350 seats.

## Known residual limitations

* Statement choice is an editorial decision: 30 items cannot cover everything.
* Smaller and seatless parties (SALF, CCa, EAJ-PNV) have more "no clear position" codings. This lowers the number of comparable statements, not their scores, and is flagged in the UI.
* Several official party websites block automated access (psoe.es, voxespana.es, podemos.info, esquerra.cat). Mirrors of party documents were used and recorded in DATA_GAPS.md.
* No 2026 programs were published as of 31 Oct 2026; positions should be re-checked when they are.
