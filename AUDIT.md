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
| M7 | Low-information items (non-EU buyers 2/13 coded; immigration numbers 2/13; monarchy referendum 3/13) | Non-EU buyers item removed. The other two were re-searched for all parties: immigration numbers now 4/13 coded (context clarifies "total arrivals"); monarchy referendum 3/13 (Vox's inferred coding removed). Kept because missing positions do not affect scores, and the UI shows coverage. | ⚠️ partly |
| M8 | Territorial items centred on Catalonia | Catalan financing item generalised to "regions that ask for it should be able to collect all their taxes" | ✅ |
| M9 | Only the tax-cut item carried a cost clause | Cost clause removed | ✅ |
| M10 | Eviction item asked two things (speed + vulnerable occupants) | Vulnerability clause removed; all parties recoded | ✅ |
| M11 | Minimum-wage "reach 60 %" premise possibly outdated | Verified: the Government has said since 14/02/2023 that the SMI has reached 60 % of the average wage. Reworded to "keep rising and stay at no less than 60 %", context states the 2026 SMI (€1,221 × 14) | ✅ |
| M12 | Contradictory "yes =" text in vote notes shown to users | Notes rewritten | ✅ |
| M13 | Unclear how coalition votes count for the 1 % criterion (Geroa Bai) | Methodology: coalition votes count only for the coalition as a whole | ✅ |
| L1–L3 | Context lines: dangling reference (2035 cars), incomplete (37.5 h week, abortion), inaccurate dates (recentralisation) | Rewritten | ✅ |
| L4 | Wealth-tax item ambiguous (two taxes) | Now names the Temporary Solidarity Tax on Large Fortunes (wealth above €3 m); recoded | ✅ |
| L5 | National 2 % rent-update cap labelled a "direct" vote on rent caps in high-price areas | Relabelled `related` | ✅ |
| L6 | Neutral party stance cushions scores; PP minimum wage was neutral without an explicit intermediate position | Recoded (M11); methodology explains the effect of neutral codings | ✅ |
| L7 | Official titles containing charged words repeated unquoted in vote notes | Official titles now in «…»; the loaded-term lint now covers vote notes (quoted titles exempt) | ✅ |
| L8 | Stale coverage table in DATA_GAPS.md | Regenerated | ✅ |
| L9 | Podemos notes said "capped at medium" on high codings | Notes corrected | ✅ |
| L10 | Asturias "PODEMOS (PAZ, CASA Y TRABAJO)" mapped to Podemos without confirmation | Re-check after proclamation (BOE 3 Nov) | ⏳ |
| L11 | Explainer omitted the 2-seat provincial minimum | Added | ✅ |

## Post-fix verification (2026-10-31)

* `npm run validate`: 0 errors. The 4 warnings are undated policy pages on junts.cat, each with an access date.
* `npm test`: 29/29 pass, including the new acquiescence test.
* Acquiescence simulation: a user answering "strongly agree" to all 30 statements now gets 42–60 % for every well-documented party, with no left/right pattern (PSOE 42, PP 48, Frente Amplio 50, Vox 54, BNG 60). Before the fixes it was 44–71 %, with left/government parties on top. Limited-data parties (CCa, EAJ-PNV, SALF) can score up to 64 %, but they are flagged and listed after the others when sorting.
* Polarity: 15 statements where "agree" matches left/government/nationalist positions, 15 where it matches right/opposition positions.
* Stances per party are now balanced, e.g. PP 10 agree / 11 disagree, PSOE 10/14, Vox 14/12, Frente Amplio 12/12 (full table in DATA_GAPS.md).
* Further concerns raised by the recoders and applied: the defence context now presents Spain's "exception" as the Government's claim, not a fact; the immigration-numbers item states that it means total arrivals.

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

---

# Follow-up: independent Codex audit (2026-10-31)

A second, fully independent audit (Codex, with separate code, content and UX reviewers) is in [`audits/FULL-AUDIT-2026-10-31.md`](audits/FULL-AUDIT-2026-10-31.md), with the [code review](audits/AUDIT-2026-10-31-deep.md), the [UX review](audits/UX-2026-10-31-deep.md) and 32 screenshots. It found 21 verified defects (3 high, 13 medium, 5 low) and one suspected content issue, and no sign of intentional manipulation. All verified defects are fixed. The table says how.

| ID | Sev | Finding | Fix | Status |
|---|---|---|---|---|
| D-001 | H | Reference pages discarded all answers | Methodology and election pages now open **inside the app** (same document, answers stay in memory), with browser Back working. Standalone pages remain for direct links. A leave-page warning appears while a questionnaire is in progress. | ✅ browser-tested |
| D-002 | H | Arrow keys advanced to the next question | Choosing an answer only saves it; a visible **Continue** button moves on. Mouse and touch choices still advance on their own, announced beside the answers and switchable off. A saved-answer status is announced to screen readers. | ✅ browser-tested |
| D-003 | H | No forward action when reviewing an unchanged answer | Continue and a direct "Back to results" are available in review; Skip is the only action that clears an answer. | ✅ browser-tested |
| D-004 | M | Restart erased everything silently | Asks for confirmation when there are answers, and says what will be erased. | ✅ |
| D-005 | M | Expanded results overflowed at 320 px | Topic table rebuilt with a shrinking bar column; no page-level horizontal scroll at 320 px. | ✅ browser-tested |
| D-006 | M | English results showed Spanish/Catalan explanations | All 372 position and vote notes are now `{es, en}` (validator-enforced), cleaned of internal process language; every source has a `lang` for correct language markup. Vote results in notes were re-checked against raw Congreso totals. | ✅ |
| D-007 | M | Coverage fractions had no labels | Column headers (Topic / Agreement) and plain text such as "2 of 3 statements with a documented position", plus an explanation. | ✅ |
| D-008 | M | Correction and voting instructions had no links | Repository and issue links on the methodology page; a pre-filled "Report an error or a better source" link on every position; official voting pages linked (see DATA_GAPS.md for what could not be re-checked). | ✅ |
| D-009 | L | Failed coverage fetch showed only "—" | HTTP status checked; localized error with a Retry button. | ✅ |
| D-010 | L | Missing share/search metadata | Canonical URL, Open Graph and Twitter tags, favicon, preview image and descriptions on all pages. | ✅ |
| C-001 | M | Profits-tax question used turnover-levy evidence | Statement reworded to the levy actually voted on (2023–24, on turnover); context says so; all 13 parties recoded under a scope test. | ✅ |
| C-002 | M | Dental item promised more than sources showed | Narrowed to "more dental treatments than today"; all parties recoded (several moved, e.g. PSOE neutral → agree, ERC stays uncoded). | ✅ |
| C-003 | M | Unknown total-arrivals position became PP's midpoint | Scope test applied to every party: with PP, PSOE and Vox moved to "no clear position" only 1 of 13 parties had a position, so the item was **replaced** by "speed up the return of people who entered irregularly and have no right to asylum" (6 parties coded, evidence-scope applied: detention-centre closure alone is not a position on returns). | ✅ |
| C-004 | M | Occupation context overstated what is criminal | Rewritten: can be a crime (trespass or usurpation); possession and expired-tenancy disputes are civil. | ✅ |
| C-005 | L | Legal context too absolute | "Normally three-fifths"; "aged 16 or over". | ✅ |
| F-002 | M | Historical tallies used today's affiliations | Dated overrides: Ábalos and Ortega Smith count for their party until they left. Vox is 33 and PSOE 121 on the 2023 votes again. No majority changed. | ✅ tested |
| F-003 | M | Compromís explanations and counted deputies disagreed | Documented attribution policy (by party of membership); Ibáñez now counted for Compromís (2 deputies). | ✅ tested |
| F-004 | M | Validator accepted evidence from another question | A vote_ref must belong to the same statement; every curated vote needs a raw file and a derived tally that recomputes exactly; confidence ladder enforced (high needs a direct vote or program text; Podemos/Compromís capped on the joint program). Six negative tests prove each check fails. The build refuses a missing tally and runs `--strict`. | ✅ tested |
| F-005 | M | Source check reported success on failure | Exits non-zero on dead links; bot-blocked pages need a reason and review date in `data/source_allow.json`; weekly workflow. Unit-tested with injected fetchers. | ✅ tested |
| F-006 | L | Podemos rent confidence broke the published ladder | Lowered to medium; the validator now makes this a build error. | ✅ |
| F-007 | L | Restart kept sort and filters | All result preferences reset. | ✅ browser-tested |
| C-S01 | — | PSOE fiscal-autonomy evidence suspected out of date | Re-researched. Current primary evidence (Government–Generalitat agreement of 14 Jul 2025, Hacienda model of Jan 2026) does not state whether a region should be able to collect all its taxes; the full agreement text could not be opened. PSOE moved to **no clear position**. ERC, Junts and BNG lowered to medium because they demand it for their own region only. | ✅ |

## Decisions where I did not follow the audit literally

* **D-002:** the audit asked for advancing only on Continue. Mouse and touch choices still advance automatically, because a 30-question quiz needs the speed; keyboard choices never do, the behaviour is announced before use (WCAG 3.2.2) and can be switched off. If you prefer strictly explicit navigation, it is one line.
* **C-003:** replaced the statement rather than leaving a question that could be answered only against one party.
* **Optional design directions** in the audit (grouping shared ballots, commitment estimate before Start, clearer topic-weight explanation, comparison limits next to scores) are left for the UI/UX redesign.

## New automated checks (all in `npm test` / CI)

Validator negative tests (wrong-statement vote, missing or non-recomputing tally, metadata drift, ladder violations, Sumar cap); dated deputy attribution; source-check classification and retry; bilingual notes and no process language; plus a real-browser suite (`npm run test:browser`, 22 checks) for keyboard navigation, review flow, reference pages mid-quiz, 320 px reflow, restart and preference reset.

---

# Design neutrality notes for the redesign (2026-10-31)

The rebuilt interface adds visual elements that could carry bias. Each was decided deliberately:

| Element | Decision | Why it stays neutral |
|---|---|---|
| Topic colours | 11 muted colours, all with the same OKLCH lightness (0.52) and low chroma (0.075); every topic also has an icon | Spanish party brands are saturated hues (red, blue, green, purple, magenta, orange, yellow, turquoise). Equal low chroma means no topic reads as a party colour or outweighs another. All pass WCAG AA in light and dark mode. |
| Party identity in the UI | No party colours anywhere. Logos (where a free licence exists) or neutral ink monograms, all the same size | Same visual weight for every party |
| Agreement colours | Neutral ink ramp in the topic map; verdicts use icons (✓ ≈ ✗ ?), never red/green | Red/green would suggest right/wrong and map onto party colours |
| Result order | Random by default; "by agreement" is a user choice; limited-data parties listed last when sorting | Unchanged principle |
| Shareable card / PDF | Sorted by agreement, because it is the user's own summary; limited-data parties marked and listed last; "not a voting recommendation" printed on it | Explicit user action, with the same caveats as the screen |
| Plain-language explanations | Each says what the measure is and what "agree" means; no arguments for or against; linted for loaded terms | Helps people not into politics without steering them |
| Answer scale | Dots grow towards the extremes on both sides symmetrically; neither side is coloured | No side looks like the "right" answer |

## Design round 2 (owner decisions, 31 Oct 2026)

| Change | Neutrality / privacy reasoning |
| --- | --- |
| Results are always sorted by agreement; the "random order" switch is removed (owner's decision). | Order reflects only the user's own answers. Limited-data parties (coverage ≤ 50 %) are listed last and marked, so a score built on a few statements is never shown above better-documented parties. Ties keep the per-visit random party order, so no party gains from alphabetical or fixed position. Question order stays random per visit. Documented in the methodology page; tested in `tests/ui.test.mjs` and the browser suite. |
| Topic map redrawn as diverging bars (centre = half and half; right = agreement, left = disagreement), equal columns, angled short headers. | Neutral ink tones only; no party or stance colours. Explicit markers for "no documented position" and "topic not answered"; no imputed values. |
| Two downloads: full report (to keep) and one-page summary (to share, PDF + PNG). | Both are created in the browser; nothing is uploaded. The summary shows the three closest parties **among those with enough data** and no answers. Automatic observations are descriptive (spread between parties, topics where parties differ most/least) and never name a "best" party. |
| "Return to my results" link in the full report. | Answers, weights and constituency are encoded in the URL fragment (`#r=…`), which browsers do not send to servers; nothing is stored. The report and methodology warn that anyone with the link can see the answers. The summary to share never contains it (tested). |
| New logo (Congress hemicycle, single tone). | No party colours; the mark is the chamber, not any group within it. |

## Return-visit features (owner decision, 1 Nov 2026)

| Feature | Neutrality / privacy reasoning |
| --- | --- |
| "Tu papeleta" (parties on your ballot, seats, Senate rule, practical info) | Parties listed alphabetically; only facts from official sources (candidacies, seats decree, LOREG). States that other lists may be on the ballot. |
| Phase banners (reflection day, polling day, after) | Factual and identical for everyone; no party named. Preview with `?hoy=YYYY-MM-DD`. |
| Compare with someone | Two people's answers compared with each other only (1 − |a−b|/4); no party involved. The link carries answers and an optional first name typed by the user; computed in the recipient's browser; warning shown before sharing. |
| What's new + Atom feed | Curated public changelog (data/changelog.json). Reopened report links list data changes since the report date. |
| Calendar (.ics) | Static download; no subscription, tracking or notifications from the site. |
| "¿Votan como prometieron?" | Page built with an explicit availability notice (from January 2027, after the new Congreso convenes on 23 Dec 2026 and votes). Will use the same roll-call method as the quiz. |
