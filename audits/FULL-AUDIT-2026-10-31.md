# Full independent audit — Spanish Elections 2026

**Start here:** review the five decisions below. Nothing in the application has been changed.

Date: 31 October 2026, Europe/Madrid. Target: https://renzorico.github.io/spanish-elections-2026/. Auditors: Codex, with separate fresh-context code, content and UX reviewers. Builder: Claude, as reported by the owner. Review mode: deep, including live interactions, source inspection and external fact checks.

## Verdict

**Fix the questionnaire and evidence mismatches before relying on this as voter guidance.** The site runs, and its existing 29 tests pass, but users can lose a completed questionnaire by consulting its reference pages, cannot retain an unchanged answer while reviewing, and encounter party positions whose cited evidence does not establish the exact measure being scored. Those are substantive defects; a cosmetic redesign would not address them.

This audit establishes specific failures and limitations. It does not establish intentional partisan manipulation, nor does it certify every political position as accurate. Design preferences, methodological trade-offs and unconfirmed concerns are separated from verified defects.

**Findings:** 21 distinct verified defects — 3 high, 13 medium and 5 low — plus one suspected content issue. Evidence includes 32 screenshots. F-001 and D-003 are counted once. All report-to-evidence links were checked for missing local files.

## Five decisions to make first

| Priority | Decision | Findings | Estimated implementation effort |
|---|---|---|---|
| 1 | Use explicit Continue navigation and keep reference pages from discarding answers. | D-001, D-002, D-003 / F-001 | 3–6 hours including browser regression checks |
| 2 | Correct the energy-tax and dental question/evidence scope; review the unsupported immigration midpoint. | C-001, C-002, C-003 | 1–2 days including source review and recoding |
| 3 | Define historical and coalition deputy attribution, then regenerate vote evidence. | F-002, F-003 | 4–8 hours plus verification |
| 4 | Make evidence-integrity failures block deployment. | F-004, F-005, F-006 | 3–6 hours including negative tests |
| 5 | Repair mobile evidence tables, translated explanations and correction links. | D-005 through D-008 | 4–8 hours plus translation review |

Estimates are planning estimates, not commitments. Content review is the largest uncertainty. You can approve individual findings without approving a redesign or all recommendations.

## What was actually audited

| Item | Evidence / result |
|---|---|
| Published version | GitHub `main` commit `de72e4970c61a2811418359e26160583deea20b9` |
| Important local difference | The working checkout was still at scaffold commit `c4f6e48`; it did not contain the website. The audit therefore used an isolated download of published source in `/private/tmp/spanish-elections-audit-source`. No pull, checkout or application edit was made. |
| Live/source agreement | Live `data/bundle.json` and downloaded source bundle have identical SHA-256: `31c51a49c6dd14d3caf81802fb5747c09f477bb96a23582600644bb1dfecb6bd` |
| Data scope | 13 parties, 30 bilingual questions, 11 topics, 29 curated votes, 52 constituencies; external evidence was sampled, not all 390 party/question cells independently fact-checked. |
| Live flows | Complete Barcelona questionnaire; weighting; party details; English toggle; unchanged answer editing; reference-page navigation; keyboard radio navigation; all-questions-skipped results. |
| Responsive evidence | Home, question, weights, results, election explainer and methodology at 375, 768 and 1440 CSS pixels; expanded results additionally at 320 pixels. Both informational pages captured in Spanish and English. |
| Automated checks | 29/29 existing tests passed; validator passed with four undated Junts-source warnings; JavaScript syntax passed. Exact build body executed with writes intercepted and output compared in memory. |
| Public-source HTTP checks | 120 unique URLs checked; 116 returned 200/206 after retrying initial failures with a browser user agent. Three party homepages returned 403; one Deia article returned 406. These are access restrictions, not proof of dead links. |

All source `path:line` references below refer to the published commit, **not** the scaffold currently in the checkout. Use the [pinned source tree](https://github.com/renzorico/spanish-elections-2026/tree/de72e4970c61a2811418359e26160583deea20b9). The code reviewer’s unedited report is [AUDIT-2026-10-31-deep.md](AUDIT-2026-10-31-deep.md); the UX reviewer’s report is [UX-2026-10-31-deep.md](UX-2026-10-31-deep.md). Finding IDs are preserved across those reports; **F-001 and D-003 describe the same defect**.

The independent UX report’s “not checked” list reflects that reviewer’s own inspection. The lead auditor subsequently exercised the zero-answer state and console check; those additional results are recorded in this consolidated report.

## Verified defects — questionnaire and UX

### [HIGH] D-001 Reading a reference page can discard all answers

Evidence: `site/js/app.js:7`, `site/index.html:18`, `site/index.html:19`, `site/metodologia.html:154`. Answers exist only in the current document’s memory; the header reference links and the return-to-tool link navigate normally.

**Live reproduction:** complete the questionnaire, choose Methodology, then use its ordinary “Back to the tool” link. The site opens the introductory Start screen instead of restoring the questionnaire. This does not depend on testing browser Back or its back-forward cache. [Captured return state](screens/2026-10-31/navigation-loss-1440.png), [DOM evidence](screens/2026-10-31/navigation-loss.txt).

**Change:** keep reference material inside the same application state or open it separately with an explicit return path. Preserving memory while the tool remains open meets the present privacy promise; persistent storage is not required. If same-tab navigation remains, explain the loss and protect against accidental departure. Acceptance: read both reference pages and return with all answers, weights and province intact.

### [HIGH] D-002 Arrow-key selection unexpectedly advances to another question

Evidence: `site/js/app.js:330`, `site/js/app.js:377`. Any answer radio `change` calls `answerAndAdvance()`, replaces the view and moves focus.

**Live reproduction:** focus the first answer radio and press ArrowRight. Instead of remaining in the answer group, the tool advances from statement 1 to statement 2. There is no advance warning. Keyboard users cannot explore the native radio group normally. Relevant standard: [WCAG 2.2, 3.2.2 On Input](https://www.w3.org/WAI/WCAG22/Understanding/on-input.html).

**Change:** save the radio selection on change and advance on an explicit Continue action. Test Tab, arrows, Space, pointer selection and screen-reader announcements. This also addresses D-003.

### [HIGH] D-003 / F-001 Reviewing an unchanged answer has no forward action

Evidence: `site/js/app.js:122`, `site/js/app.js:137`, `site/js/app.js:362`, `site/js/app.js:379`.

**Live reproduction:** choose Change answers on results. Statement 1 restores the current checked answer. Clicking it leaves the same question visible; there is no Next/Continue. The available Skip action clears the answer. A workaround is to change the answer and later change it back, which is not a usable review flow. [Mobile capture](screens/2026-10-31/edit-same-answer-375.png), [DOM evidence](screens/2026-10-31/edit-same-answer.txt).

**Change:** add Continue that retains the checked value, and a direct way back to results after review. Acceptance: review all questions without altering or clearing any answer.

### [MEDIUM] D-004 Restart immediately erases the questionnaire

Evidence: `site/js/app.js:366`. Restart clears answers, province and weights without confirmation or undo. The site has no recovery copy.

**Change:** confirm only when there are answers to lose, or offer an in-memory undo. State exactly what will reset. This is error prevention for a 30-answer workflow; it does not require adding an account or permanent storage.

### [MEDIUM] D-005 Expanded evidence tables overflow at 320 pixels

Evidence: `site/css/style.css:106`, `site/css/style.css:112`, `site/js/app.js:265`; [320-pixel capture](screens/2026-10-31/results-expanded-320.png), [layout measurements](screens/2026-10-31/layout-metrics.json).

**Measured:** document scroll width was 371 pixels at a 320-pixel viewport. The fixed-width bars and nonwrapping result cells extend the topic table past the screen. The same Spanish state did not overflow at 375, 768 or 1440 pixels. This also matters for zoom/reflow, not just an unusually small phone. Relevant standard: [WCAG 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

**Change:** use a compact topic-row layout at narrow widths; let the bar column shrink and wrap. If a true data-table scroll region is necessary, contain its overflow and make it discoverable rather than scrolling the whole page. Acceptance: no page-level horizontal overflow at 320 pixels with a party’s evidence expanded.

### [MEDIUM] D-006 English results retain Spanish and Catalan explanations

Evidence: `site/js/app.js:291`, `site/js/app.js:301`; [English result capture](screens/2026-10-31/results-expanded-english-375.png). The translated statement and stance are followed by raw `pos.note` and vote notes. Those explanations include qualifications needed to interpret the score and are neither translated nor marked with their own language.

**Change:** store localized editorial explanations and translate them. Keep source quotations in their original language with appropriate `lang` markup and, where useful, an explicitly labeled translation. Relevant standard: [WCAG 3.1.2 Language of Parts](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html).

### [MEDIUM] D-007 Topic coverage fractions have no explanatory column label

Evidence: `site/js/app.js:249`, `site/js/app.js:265`. Expanded topic rows show values such as `1/3` and `5/5` beside a bar, with no column headers explaining what the fraction means. The table caption only says “By topic.”

**Change:** label columns Topic, Agreement and Comparable/answered, or replace fractions with accessible text such as “1 of 3 answers has a documented position.” Make clear that these are evidence-coverage counts, not seats, confidence ratings or weighted points.

### [MEDIUM] D-008 Correction and voting-help instructions lack working destination links

Evidence: `site/metodologia.html:24`, `site/metodologia.html:90`, `site/metodologia.html:153`, `site/eleccion.html:59`. The page asks users to open a repository issue without linking the repository or issue form; the Spanish election explainer names official voting sites without linking them.

**Change:** add a visible repository link and direct corrections link carrying statement/party identifiers where practical. Link the current official voting instructions, including postal/overseas voting. This is especially useful when a user doubts a source or encounters a suspected error.

### [LOW] D-009 A failed methodology data fetch produces only an em dash

Evidence: `site/js/page.js:33`, `site/js/page.js:60`. The coverage fetch lacks an HTTP success check, and its catch replaces the content with `—`. Users cannot distinguish loading, no data and a failed request.

**Change:** check `response.ok`, show a localized error and Retry action, and retain a useful explanation of what the coverage table contains. This was verified in the error-handling code, not through an induced live outage.

### [LOW] D-010 Missing share/search identity metadata

Evidence: `<head>` in `site/index.html:3`, `site/eleccion.html:3`, `site/metodologia.html:3`. The home page has a description, but the pages lack canonical, Open Graph/Twitter preview metadata and an explicitly defined favicon; informational pages also lack descriptions.

**Change:** add a factual preview title/description/image, canonical URL and small recognisable favicon. This is discoverability and share-preview work, not a functional launch blocker.

## Verified defects — facts, wording and political coding

### [MEDIUM] C-001 A profits-tax question uses turnover-tax evidence as direct proof

Evidence: `data/statements.json:54`; `data/positions/pp.json:141`, `data/positions/psoe.json:149`, `data/positions/vox.json:141`; `data/recode/eco-impuesto-energeticas.json:6`.

The question asks whether a tax **on energy-company profits** should be reintroduced. Its direct high-confidence voting evidence is a renewal of the temporary levy calculated on net turnover. Article 1.5 of [RDL 10/2024](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-26916) specifies the turnover basis. Supporting one tax base does not necessarily establish support for the other.

**Change:** either ask about reinstating the special energy levy actually voted on, or retain a profits-tax question and recode it with matching evidence. Merely lowering confidence does not repair a mismatch in the measure being asked. This establishes an evidence mismatch, not that every displayed party direction is false.

### [MEDIUM] C-002 Dental coding promises more than its sources establish

Evidence: `data/statements.json:114`; `data/positions/eh-bildu.json:266`, `data/positions/frente-amplio.json:292`, `data/positions/vox.json:266`, `data/positions/podemos.json:249`, `data/positions/bng.json:266`.

The question specifies fillings, root canals and dentures **for the whole population**. Several coded endorsements establish only basic dental services or expansion of coverage. EH Bildu’s own note acknowledges uncertainty about root canals/prostheses, yet it still receives full item agreement for a strongly agreeing user. The same scope problem appears in generic expansion evidence for the other listed records.

Primary document checks: [EH Bildu party-authored programme, PDF p.6](https://www.newtral.es/wp-content/uploads/2023/07/Programa-electoral-EHBildu-23j-2023.pdf), [Sumar programme, PDF p.89](https://movimientosumar.es/wp-content/uploads/2023/07/Un-Programa-para-ti.pdf), [BNG programme, PDF p.36](https://www.bng.gal/media/bnggaliza/files/2023/07/05/23_bng_xerais_programa.pdf), [Vox official explanation](https://www.voxespana.es/noticias/mas-inversion-medios-humanos-y-materiales-en-atencion-primaria-salud-bucodental-y-oftalmologica-entre-las-medidas-de-vox-para-el-23-j-20230718). A party-authored programme hosted by a third party remains primary content; its host is disclosed here.

**Change:** narrow the question to the documented coverage expansion, split clearly different coverage commitments, or require evidence of every material element before scoring agreement. Do not equate an unspecified expansion with universal entitlement to all named treatments.

### [MEDIUM] C-003 An unknown total-arrivals position becomes PP’s explicit midpoint

Evidence: `data/positions/pp.json:432`, `data/statements.json:190`, `site/metodologia.html:68`.

The question concerns **total** immigration, explicitly including legal and irregular arrivals. PP’s evidence concerns control of irregular arrivals, support for legal migration and unspecified quotas. Those statements do not determine its preferred change in the total. The record nevertheless converts this into `neutral/medium` and claims an intermediate position. A neutral user therefore receives 100% item agreement rather than having this unknown excluded.

The [official PP immigration plan](https://www.pp.es/storage/2025/10/Plan-Nacional-de-Inmigracion-del-Partido-Popular.pdf), especially PDF pp.4–6, does not resolve the missing total-arrivals target. The project’s published rule reserves intermediate coding for an explicitly intermediate position.

**Change:** use `no_clear_position` unless additional evidence answers the total-arrivals question. Apply that same scope test across all parties; controlling irregular arrivals alone is not sufficient evidence about total arrivals.

### [MEDIUM] C-004 Occupation context overstates what is criminal

Evidence: `data/statements.json:22`. It categorically says occupation without legal title is a crime.

The Fiscalía’s [Instruction 1/2020, section 2](https://www.boe.es/buscar/doc.php?id=BOE-A-2020-11243), explaining Supreme Court doctrine, distinguishes unlawful entry/occupation offences from possession initially authorized by the owner that must be resolved through civil proceedings. Lack of a current title alone does not establish the crime. The current wording can confuse expired permission or tenancy disputes with criminal squatting.

**Change:** say unauthorized occupation can constitute *allanamiento* or *usurpación*, and distinguish civil possession/tenancy disputes. Keep the explanation short while removing the universal legal claim.

### [LOW] C-005 Two legal-context statements need narrower wording

Evidence: `data/statements.json:130`, `data/statements.json:155`.

The constitutional context presents three-fifths in both chambers as a universal amendment requirement. [Constitution article 167.2](https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229) also provides an alternative involving two-thirds of Congress and an absolute Senate majority; article 168 is a different procedure. For the article-43 proposal, “normally requires three-fifths” is a sufficient concise qualification.

English “over 16” excludes exactly 16, whereas the legal-sex-change procedure includes that age. Use “aged 16 or over”; “desde los 16 años” is also clearer in Spanish. Sources: [Law 4/2023, article 43](https://www.boe.es/buscar/act.php?id=BOE-A-2023-5366#a43), [government explanation of the 16–18 group](https://www.lamoncloa.gob.es/consejodeministros/ruedas/Paginas/2022/rpcm27062022.aspx).

## Verified defects — data pipeline and maintenance

### [MEDIUM] F-002 Historical vote totals use current affiliation overrides

Evidence: `scripts/lib.mjs:38`, `data/votes/deputies.json:22`, `data/votes/deputies.json:23`. The current independent-status overrides take precedence over the group recorded in each historical vote, with no vote-date condition.

**Reproduction from cached raw data:** on 21 September 2023, Ortega Smith is recorded as GVOX/No and Ábalos as GS/Yes. Both resolve to no party. The displayed totals become Vox 32 No rather than the raw group’s 33, and PSOE 120 Yes rather than 121. The reviewer found 30 such dropped historical records. Reproducibility of the current algorithm does not make this attribution historically correct.

**Change:** model dated affiliation periods, or choose and explicitly disclose a consistently applied present-day cohort methodology. Regenerate the totals and verify affected evidence displays. No changed majority or ranking was established by this audit; the confirmed defect is the tally/attribution mismatch.

### [MEDIUM] F-003 Compromís explanations and counted deputies disagree

Evidence: `data/votes/deputies.json:21`, `data/parties.json:381`, `data/positions/compromis.json:41`, `data/positions/compromis.json:233`, `data/positions/compromis.json:435`.

Explanations cite Àgueda Micó and Alberto Ibáñez, but only Micó is mapped to Compromís. Ibáñez falls through to GSUMAR and is counted under Frente Amplio. In the 28 April 2026 rent vote the Compromís text describes both voting Yes while its displayed tally contains one Yes.

**Change:** define the component-party attribution policy, source it, apply it to both deputy records and editorial descriptions, then regenerate the bundle. Do not repair only the displayed prose while leaving the ownership rule ambiguous.

### [MEDIUM] F-004 Validation accepts evidence belonging to a different question

Evidence: `scripts/validate.mjs:117`, `scripts/validate.mjs:124`, `scripts/validate.mjs:129`, `scripts/validate.mjs:178`; `scripts/build.mjs:45`; `.github/workflows/pages.yml:32`.

**Read-only negative checks:** replacing PP’s rent evidence reference with the CGPJ vote returned `errors: []`; replacing all derived votes with an empty object also returned `errors: []`. The build can then output `by_party: null`. These were in-memory experiments; the real files were not edited. The deployment workflow does not make those warning-only conditions fatal.

**Change:** require referenced vote and position statement IDs to agree; require all referenced derived records and appropriate tallies; verify derived metadata against inputs. Add negative tests proving these cases fail CI.

### [MEDIUM] F-005 Source-check failure still reports command success

Evidence: `scripts/check_sources.mjs:41`, `scripts/check_sources.mjs:43`. It prints and records failures without setting a nonzero exit code.

**Read-only reproduction:** an intercepted HTTP 404 produced “1 URLs checked, 1 failing” while leaving the process successful. This makes the command unsuitable as a reliable automated gate in its present form.

**Change:** return nonzero on genuine failures and test transport errors as well. Classify access-denied/bot challenges separately from missing documents, and allow explicit review of those cases instead of claiming every 403 is a dead source.

### [LOW] F-006 Podemos rent confidence contradicts the published ladder

Evidence: `data/positions/podemos.json:9`, `data/positions/podemos.json:13`, `data/positions/podemos.json:30`, `site/metodologia.html:54`, `site/metodologia.html:57`.

The position is high confidence, although its specific programme evidence is the shared Sumar 2023 programme and its two votes are classified as related. The methodology caps shared-programme-only evidence at medium and says related votes do not independently establish the position.

**Change:** lower the confidence or supply qualifying independent evidence; enforce the shared-programme rule consistently. This is a confidence-calibration defect, not evidence that Podemos opposes rent limits.

### [LOW] F-007 Restart retains result filters and sorting

Evidence: `site/js/app.js:18`, `site/js/app.js:366`. Restart does not reset `sortByMatch`, `excludeLow` or `showAll`.

A subsequent questionnaire can remain sorted and filtered despite the fresh-session promise of a random default. **Change:** reset all result preferences or explicitly describe which settings survive Restart; test that contract. This is separate from D-004’s lack of confirmation/undo.

## One suspected content issue — do not auto-fix

**C-S01 — PSOE fiscal-autonomy evidence needs an up-to-date review.** `data/positions/psoe.json:593` codes opposition with low confidence from a June 2024 rejection of the term *concierto*. Its own note at line 619 acknowledges the subsequent PSC agreement concerning collection of all taxes. That substantive question is not resolved merely by rejecting a label. The [Generalitat’s account of the agreement](https://presidencia.gencat.cat/web/.content/ambits_actuacio/desenvolupament_autogovern/iea/publicacions/16-informe-autogovern-anual/ia24-arxius-i-articles/03_IA-24-97-114-hisenda-bosch.pdf) supports reviewing the conflict, but does not alone establish the correct October 2026 statewide PSOE stance. Obtain current primary evidence before changing the score. Status: **suspected**, excluded from verified-defect totals.

## UI identity and optional improvements

The independent UX assessment found a restrained form interface, not a strong cluster of generic AI styling. Its generic score is 3, within the rubric’s “distinctive” band, based on the system-font tell. That score is an internal design rubric, not a validated scientific measure of authorship.

Your saved “technical notebook” preference is only partially expressed: no deliberate mono/sans pairing, little asymmetric layout, a gray/blue palette and repeated centered cards. These are **preference deviations**, not accessibility failures. Preserving neutral treatment of political parties is more important than mechanically applying a personal accent colour. See the UX report for the scored evidence and options.

| Optional direction | Reason and boundary |
|---|---|
| Group actual regional ballot choices | Multiple component-party profiles can share one ballot, such as Front Valencià. The present mapping is disclosed and intentional, not established as false. Group the shared ballot visually while retaining clearly labeled component comparisons. |
| Show questionnaire commitment before Start | Say “30 statements, then topic weights,” with a measured completion estimate after observing real users. Do not invent an accuracy claim or a completion statistic. |
| Make topic weighting easier to understand | The current total weights individual questions: a five-question topic has more influence than a two-question topic at equal selected weight. This is documented, not an arithmetic bug. Explain it in the weighting screen, or deliberately choose equal-topic weighting and update tests/methodology. |
| Explain comparison limits beside scores | A percentage is agreement with selected documented statements, not a probability, vote recommendation or confidence interval. Coverage varies by party; retain the limited-data notice and make its basis easy to inspect. |
| Translate and simplify editorial notes | Remove stale recoding/process language from public explanations once replaced by useful sourced reasoning. Preserve the audit trail in repository history. |

## Checked without a defect established

| Area | Result and limit |
|---|---|
| Election date and calendar | The 29 November 2026 election, 13–27 November campaign, 23 December chambers and example seat counts checked against [Royal Decree 806/2026](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20742). The election premise is not fabricated. |
| Candidacy status | The cited [28 October BOE notice](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-22607) concerns presented candidacies. The application discloses they are not yet proclaimed. All 52 filings were not independently reconstructed. |
| Matching mathematics | Inspected computations follow the published distance formula, missing-data handling, topic weights and optional stable sorting. Different denominators remain a methodological limitation, not a proven implementation error. |
| Privacy/security architecture | No backend, accounts, SQL/Supabase or runtime package dependencies. Inspected frontend escapes displayed evidence text and does not persist answers or call third-party APIs. No recognized secret patterns found in the inspected snapshot. This is not a full historical-secret or penetration-test certification. |
| Empty path and runtime | All 30 questions skipped yields an explanatory empty state and no invented scores; [capture](screens/2026-10-31/empty-results-375.png). No warning/error messages were captured in the tested IAB console. |
| Unexpected political evidence | PSOE’s 48-hour eviction quotation was confirmed in its programme; the EU-car context distinguishes current law from proposed relaxation. Neither was reported as false simply because it seemed surprising. |
| Source reachability | [Raw HTTP log](screens/2026-10-31/link-check.json): 74 responses 200, 42 responses 206, three 403 party homepages, one 406 Deia article. Initial failures largely disappeared with a browser user agent. Reachability does not authenticate the document or verify a quotation. |

## Limits of this audit

1. **Fact checking was broad but sampled.** All 30 bilingual questions were reviewed and all 13 parties sampled. Every one of the 390 potential party/question assignments was not independently verified against full primary documents; Vox’s large programme failed the web extractor. The known gaps must remain visible.
2. **Browser evidence is from the in-app browser.** Dark mode was inspected in CSS but not captured. Real iOS/Android, Safari/Firefox, screen-reader speech, forced colours, and a full keyboard sweep were not tested. The 320-pixel failure and arrow-key behavior were directly reproduced.
3. **No numerical accessibility/performance certificate.** Lighthouse and axe were not installed; no dependencies were installed to run them. LCP, INP, CLS and field data were not measured. The 489,205-byte uncompressed bundle is a size observation, not proof of a Core Web Vitals failure.
4. **History and deployment coverage is bounded.** Public commit metadata was reviewed; the isolated snapshot had no Git history for a complete historical-secret scan. No production setting, workflow, issue, deployment or source data was changed. Build writes were intercepted instead of rebuilding into the site.
5. **Independence is procedural, not a guarantee of infallibility.** Reviewers used fresh contexts and did not rely on the builder’s earlier audit reports. Verified means observed in a code path, data or live reproduction; suspected findings still require investigation. Fixes should include independent acceptance checks.

## Decision checklist

1. Select the question-navigation fixes: D-001 to D-003 / F-001.
2. Select the content changes: C-001 to C-005; investigate C-S01 separately.
3. Select pipeline work: F-002 to F-006.
4. Select mobile/translation/trust work: D-004 to D-010 and F-007.
5. Leave the optional design directions for a separate decision.

No application changes, dependency additions, commits or deployments were made. Review the five decisions at the top and choose which finding IDs to implement.
