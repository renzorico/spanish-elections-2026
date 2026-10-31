# PLAN — Voter-information tool, Spanish general election, 29 Nov 2026

## 0. Verified context (as of 31 Oct 2026)

| Fact | Value | Source |
|---|---|---|
| Dissolution + call | Real Decreto 806/2026, BOE 6 Oct 2026 | boe.es (BOE 06/10/2026) |
| Election day | Sunday 29 Nov 2026 | idem |
| Campaign | 00:00 Fri 13 Nov – 24:00 Fri 27 Nov | idem |
| Candidacies published (presented) | BOE 28 Oct 2026 | idem |
| Candidacies proclaimed | 2 Nov (BOE 3 Nov) | idem |
| New chambers convene | 23 Dec 2026 | idem |

Changes vs 2023 that affect the tool: Sumar's successor runs as **Frente Amplio**;
PP and UPN run together in Navarra; Compromís, Podemos and some regional
alliances (e.g. UPC in Canarias, Ara Més-FA in Baleares) run separately or in
regional coalitions. Province-level availability is taken from the official
candidacy lists (see `data/candidacies.json`), with 2023 lists as fallback and
a visible caveat until proclamation.

## 1. Architecture

```
 data/*.json  (hand-curated, every claim sourced)
      │
      ├── scripts/fetch_votes.mjs   ← Congreso open data (per-deputy vote JSON)
      │        └─> data/votes/derived.json (per-party stance per vote)
      │
      ├── scripts/validate.mjs      ← schema + cross-reference + neutrality lint
      │
      └── scripts/build.mjs         ─> site/data/bundle.json
                                          │
 site/ (static, no build step, no server, no cookies, no analytics)
   index.html  ─ app.js (UI)  ─ match.js (pure matching, unit-tested)
   metodologia.html (methodology, limitations, sources)
```

* **Zero runtime dependencies.** Vanilla ES modules; Node ≥ 20 for scripts and
  `node --test`. Deployable as-is on GitHub Pages / any static host.
* **GDPR:** answers live only in page memory. No storage, no network calls
  after loading `bundle.json`, no third-party assets (fonts/scripts self-hosted
  or system fonts). Optional "copy link with my answers" encodes answers in the
  URL *fragment* (`#…`), which is never sent to a server — off by default.
* **Neutrality by construction:** party order and statement order are
  randomised per session (Fisher–Yates with `crypto.getRandomValues`); result
  list is shown in random order by default with a user-selectable "sort by
  agreement" toggle; no party colours or logos (uniform styling); no
  "recommended" labels; per-topic breakdown always visible.

## 2. Data schema (summary — full field docs in `data/SCHEMA.md`)

* `parties.json` — `id`, `name`, `full_name_2026`, `components`, `scope`
  (`statewide`|`regional`), `inclusion_basis`, `website`,
  `program_2026 {status: pending|published, url, date}`, `program_2023 {url}`,
  `vote_match {groups[], deputies[], exclude_deputies[]}`, `notes`.
* `topics.json` — `id`, `label {es,en}`, `description {es,en}`.
* `statements.json` — `id`, `topic`, `text {es,en}`, `context {es,en}`
  (one neutral line of background), `status_quo` (what current law says).
* `positions/<party>.json` — one entry per statement:
  `stance` ∈ `agree | neutral | disagree | no_clear_position`,
  `confidence` ∈ `high | medium | low` (omitted for no_clear_position),
  `evidence_type` ∈ `vote_xv | program_2026 | program_2023 | official_statement`,
  `sources[] {url, title, publisher, date, quote, accessed}` (≥1, always;
  for `no_clear_position` the sources list what was searched),
  `vote_refs[]` (ids in `votes/curated.json`), `note`.
* `votes/curated.json` — Congreso XV votes linked to statements:
  `id`, `statement`, `date`, `session`, `number`, `url_json`, `title`,
  `yes_means` (`agree`|`disagree`).
* `votes/derived.json` — generated per-party tallies and majority stance.
* `provinces.json` — 52 constituencies, community, seats 2026.
* `candidacies.json` — which included parties present lists per province,
  with source and `status` (`presented`|`proclaimed`|`2023_fallback`).

### Coding rules (identical for every party)
1. **high** — a recorded vote in the XV legislature directly on the measure,
   or explicit text in the 2026/2023 program.
2. **medium** — an official party statement / program text that clearly
   implies the stance; or a vote on a closely related measure.
3. **low** — indirect or older evidence (e.g. pre-2023 program, leader
   interview only).
4. No evidence found → `no_clear_position`. Never infer from ideology,
   allies or "what the party would probably think".
5. Vote vs. words conflict → record the stance of the most recent primary
   evidence, lower confidence, explain in `note`. The validator flags any
   coded stance that disagrees with a linked vote without a note.

## 3. Matching (see `site/js/match.js`)

* User answer per statement: −2…+2 (strongly disagree … strongly agree) or
  skip. Party stance: disagree −1, neutral 0, agree +1, none = missing.
* Per statement agreement = `1 − |u/2 − p| / 2` ∈ [0,1].
* Per topic = mean over statements the user answered *and* the party has a
  position on. Coverage (n of m) reported alongside.
* Topic weights 0–3 (default 1; 0 excludes). Overall = Σ wₜ·Σagree / Σ wₜ·n
  (statement-level, so a topic with 1 coded statement doesn't count like a
  topic with 5).
* Missing positions are **never** imputed; parties with coverage below 50 % of
  the user's answered statements get a visible "limited data" flag.
* Option to exclude low-confidence positions.

## 4. Repo layout

```
PLAN.md PROGRESS.md DATA_GAPS.md AUDIT.md README.md
data/   SCHEMA.md parties.json topics.json statements.json provinces.json
        candidacies.json positions/<party>.json votes/{curated,derived}.json
scripts/ fetch_votes.mjs validate.mjs build.mjs check_sources.mjs
site/   index.html metodologia.html css/ js/ data/bundle.json
tests/  match.test.mjs data.test.mjs
```

## 5. Party inclusion criterion (applied mechanically)

A party/coalition is included if it is running in 2026 **and** either (a) had
at least one deputy in the Congreso at dissolution (via its own members), or
(b) obtained ≥ 1 % of the national vote in the most recent nationwide election
(European Parliament, June 2024). Result: PP (incl. UPN in Navarra), PSOE,
Vox, Frente Amplio, Podemos, ERC, Junts, EH Bildu, EAJ-PNV, BNG, CCa, Compromís,
SALF. Excluded parties are listed on the methodology page with the reason.

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Fabricated or wrong sources (incl. from automated collection) | Every source has quote + URL; `check_sources.mjs` verifies URLs resolve; audit pass spot-checks quotes |
| Statement wording bias | Plain, single-issue statements, no loaded terms; lint list in validator; audit pass |
| Big-party data richer than small-party data | Same evidence ladder for all; coverage shown per party; small parties' `no_clear_position` displayed, not hidden |
| 2026 lists/coalitions change (proclamation 2 Nov) | `candidacies.json` has status field; UI caveat; easy update |
| Votes are tactical (e.g. voting against a bill as "insufficient") | Votes are evidence, not automatic codes; conflicts explained in notes |
| Congreso open data gaps (latest sessions only publish charts) | Logged in DATA_GAPS.md; use earlier sessions' JSON |
| GDPR | No storage, no analytics, no external requests |
| Perception of recommending | No ranking by default, explicit disclaimer, per-topic view |
