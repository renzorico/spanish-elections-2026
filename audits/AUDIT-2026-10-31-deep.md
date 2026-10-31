# Audit: spanish-elections-2026  2026-10-31  mode: deep
Commit: de72e49   Auditor model: GPT-6 Codex   Builder model(s): Claude (user-reported)

## Verdict
Ship with fixes to the code and evidence pipeline. The published vote tallies omit historical votes and attribute Compromís evidence inconsistently; passing tests do not establish that the displayed evidence is correct. The questionnaire also prevents users from advancing through previously answered questions without changing or clearing their answers.

## Top 5 to fix first
1. Add a Continue button so users can retain an existing answer when reviewing questions.
2. Make historical deputy attribution reflect the vote date, or explicitly disclose and consistently apply a different attribution policy.
3. Reconcile Compromís deputy attribution with the evidence descriptions.
4. Make missing or inconsistent derived evidence fail validation and deployment.
5. Make the source-checking command fail when it detects broken sources.

## Findings
### [HIGH] F-001 Reviewing an existing answer provides no way to retain it and continue
- Where: site/js/app.js:122; site/js/app.js:137; site/js/app.js:351; site/js/app.js:362; site/js/app.js:379
- Status: verified
- Problem: Returning with Back or selecting Edit answers restores the checked radio button, but the question has no Continue button. Advancing requires a radio `change` event or Skip. Clicking the checked answer generates no change, so users must change their answer or delete it to continue.
- Evidence: The question actions contain only `q-back` and `q-skip`; the answer handler is `if (el.name === 'answer') answerAndAdvance(Number(el.value));`. Existing selections are rendered with `checked`.
- Fix: Provide an explicit Continue action that preserves the current selection. Cover returning to a question, retaining an answer and completing an unchanged review with a browser interaction test.

### [MEDIUM] F-002 Current independent status retroactively removes historical party votes
- Where: scripts/lib.mjs:38; data/votes/deputies.json:22; data/votes/deputies.json:23; data/votes/raw/v-lenguas-reglamento-2023-09-21.json:1; site/js/app.js:289
- Status: verified
- Problem: Deputy overrides take precedence over the parliamentary group without considering the vote date. Labeling Ortega Smith and Ábalos independent therefore removes their votes even while the raw record places them in Vox and PSOE respectively. These reduced tallies are displayed without disclosing that selection policy.
- Evidence: For 21 September 2023, the raw records contain Ortega Smith, `GVOX`, `No`, and Ábalos, `GS`, `Sí`. `partyForVote()` returns `null` for both. The resulting tallies show Vox 32 No and PSOE 120 Sí, each omitting one vote from the corresponding historical group. Read-only inspection found 30 such records across the curated votes.
- Fix: Model affiliation periods and pass the vote date into attribution. If the intended policy is instead to count only a present-day cohort, disclose that policy, avoid describing the totals as historical party/group totals, and reconcile the explanatory notes.

### [MEDIUM] F-003 Compromís vote descriptions and attributed deputies disagree
- Where: data/votes/deputies.json:21; data/parties.json:381; data/positions/compromis.json:41; data/positions/compromis.json:233; data/positions/compromis.json:435; scripts/lib.mjs:44
- Status: verified
- Problem: Several Compromís evidence descriptions cite both Àgueda Micó and Alberto Ibáñez, but the attribution map includes only Micó. Ibáñez falls through to `GSUMAR` and is counted under Frente Amplio.
- Evidence: In the 28 April 2026 rent vote, Ibáñez's raw record is `GSUMAR`, `Sí`; `partyForVote()` returns `frente-amplio`. Compromís displays one Yes although its accompanying description says Micó and Ibáñez voted Yes. The same inconsistency appears in the working-hours and minor-relocation descriptions.
- Fix: Establish a consistent, sourced policy for coalition/component deputies. Apply it to both the deputy map and the explanatory notes, then regenerate the evidence.

### [MEDIUM] F-004 Deployment validation accepts missing and mislinked vote evidence
- Where: scripts/validate.mjs:117; scripts/validate.mjs:124; scripts/validate.mjs:129; scripts/validate.mjs:178; scripts/build.mjs:45; .github/workflows/pages.yml:32
- Status: verified
- Problem: Validation checks whether a referenced vote exists, but does not require that it belongs to the same statement. Missing derived votes produce warnings only, and CI runs without `--strict`. Consequently, the deployment gate can accept incorrect evidence links or an entirely absent derived-vote dataset.
- Evidence: Two read-only, in-memory mutations reproduced acceptance: replacing PP's rent-statement reference with `v-cgpj-vox-2024-02-27` returned `errors: []`; replacing `derived.votes` with `{}` also returned `errors: []`. The build emits `by_party: null` when a derived vote is missing.
- Fix: Require `curatedVote.statement === position.statement`; require derived records and party tallies for referenced votes; verify generated metadata and tallies against their inputs. Add negative validation tests for these cases.

### [MEDIUM] F-005 Broken source checks still exit successfully
- Where: scripts/check_sources.mjs:41; scripts/check_sources.mjs:43
- Status: verified
- Problem: The source checker records and prints failures but never sets a failing exit status. Automation or a shell checking command success receives success when sources are broken.
- Evidence: Read-only execution with HTTP and filesystem operations intercepted produced `1 URLs checked, 1 failing`, printed the simulated HTTP 404, and left `process.exitCode` at 0.
- Fix: Set a nonzero exit status whenever `failing.length > 0`. Test successful responses, HTTP failures and transport failures.

### [LOW] F-006 Podemos rent confidence exceeds the published evidence rule
- Where: data/positions/podemos.json:9; data/positions/podemos.json:13; data/positions/podemos.json:30; site/metodologia.html:54; site/metodologia.html:57
- Status: verified
- Problem: Podemos's rent-cap position is labeled high confidence, although its specific program evidence is the joint Sumar 2023 program and both linked votes are classified as related. The published methodology caps joint-program-only evidence at medium and says related votes alone do not establish a position.
- Evidence: The record contains `confidence: "high"` and identifies its evidence as the joint program plus a “closely related” vote. Neither linked curated vote is direct.
- Fix: Lower the confidence to medium unless independent, direct evidence supports high confidence, and enforce this calibration rule in validation.

### [LOW] F-007 Restart preserves sorting and filtering settings
- Where: site/js/app.js:18; site/js/app.js:366
- Status: verified
- Problem: Restart clears answers, province and weights but retains `sortByMatch`, `excludeLow` and `showAll`. After enabling sorting, restarting and completing another questionnaire, results remain sorted although a new visit defaults to random order.
- Evidence: The restart branch resets answers, index, province, orders and weights only. The three result-option flags remain unchanged.
- Fix: Reset result-option flags to their initial values during Restart, or explicitly describe Restart as retaining these preferences.

## Checked and clean
- All 29 existing tests pass on Node v25.8.0; none are skipped.
- Data validation reports zero errors and four warnings, all concerning undated Junts sources.
- Recomputing all 29 cached raw votes with the current attribution algorithm matches the stored derived tallies. This confirms reproducibility, not the attribution policy's correctness.
- Read-only execution of the build with filesystem writes captured in memory produces a 489,205-byte bundle, containing 483,949 JavaScript string characters, matching the committed bundle excluding `generated_on`. `Buffer.byteLength()` and the committed file's `statSync().size` both confirm 489,205 bytes.
- Matching calculations, topic-weight application, missing-position exclusion, stable optional sorting and zero-answer handling match the documented formula.
- Frontend data requests and asset references are relative and compatible with a GitHub Pages project subdirectory. The parent auditor confirmed that the live bundle matches the audited snapshot.
- Inspected frontend code escapes displayed evidence text, uses no persistent answer storage and makes no third-party API calls. Recognized secret-format scanning found no matches in the inspected source/data.
- No runtime dependencies, backend authentication, SQL migrations, Supabase tables or storage buckets exist in this project; those checklist items do not apply.

## Not checked
- External factual accuracy, source authenticity and live browser accessibility are assigned to the parent/UX audit and are not established by this report.
- Full secret scanning of Git history was unavailable because the supplied snapshot contains no `.git`. The parent reviewed public commit history and found no visible reverts.
- The normal build command was not executed because it overwrites `site/data/bundle.json`; its build body was executed with writes captured in memory instead.
- Source-download and reconciliation mutation commands were not run. Existing downloaded vote files were inspected and recomputed without writing.
- No independent lint or TypeScript configuration exists. JavaScript syntax checks were run; Node 20 and Node 22 were not locally available for runtime verification.
- Previous audit reports and builder summaries were not used as evidence.

## Commands run
- `npm test` — PASS: 29 tests, zero failures.
- `npm run validate` — PASS: zero errors, four warnings.
- `node --check site/js/app.js` — PASS.
- `node --check site/js/page.js` — PASS.
- `node --check scripts/build.mjs` — PASS.
- `node scripts/reconcile_votes.mjs --dry` — PASS: zero proposed changes; 16 conflicts printed, with existing explanatory notes for coded conflicts.
- `node --version` — v25.8.0.
- Read-only Node diagnostics using `loadAll()`, `tallyVote()` and `partyForVote()` — verified attribution examples and exact raw/derived consistency.
- Read-only Node validation mutations — reproduced acceptance of missing derived votes and a vote linked to the wrong statement.
- Read-only build execution with filesystem writes intercepted — PASS: generated content matches the committed bundle.
- Read-only Node size verification using `Buffer.byteLength()` and `statSync().size` — PASS: both report 489,205 bytes.
- Read-only source-checker execution with HTTP/filesystem operations intercepted — reproduced HTTP 404 failure with exit status 0.
- Read-only recognized secret-format scan — zero matches.
- `git status --short` / `git log -8 --oneline` — unavailable: supplied snapshot is not a Git repository.
