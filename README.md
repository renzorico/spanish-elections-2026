# spanish-elections-2026

Independent, factual voter-information tool for Spain's general election of
**Sunday 29 November 2026** (Congreso + Senado). It helps people see which
parties' documented positions are closest to theirs, topic by topic. It does
not tell anyone whom to vote for.

* 30 neutral statements across 11 topics (ES/EN)
* 13 parties, every position sourced (URL, date, verbatim quote, confidence) or marked "no clear position"
* Congreso XV-legislature votes from official open data, attributed per deputy
* Party lists per province from the BOE (28 Oct 2026)
* Per-topic agreement with user-set topic weights; random party/statement order; no ranking by default
* Static, client-side only: no cookies, storage, analytics or third-party requests

## Quick start

```bash
npm test          # unit + data + UI tests (Node ≥ 20, no dependencies)
npm run build     # validate data and write site/data/bundle.json
npm run serve     # http://localhost:8000
```

Other scripts: `npm run votes` (re-derive vote tallies from `data/votes/curated.json`),
`node scripts/reconcile_votes.mjs --dry` (compare coded stances with votes),
`npm run check-sources` (check every source URL resolves).

## Deployment (GitHub Pages)

`.github/workflows/pages.yml` runs the tests, validates the data, rebuilds
`site/data/bundle.json` and deploys `site/` on every push to `main` (or manually
via *Actions → Deploy site to GitHub Pages → Run workflow*). A failing check
blocks deployment. One-time setup: *Settings → Pages → Build and deployment →
Source: GitHub Actions*. The site is then served at
`https://<owner>.github.io/spanish-elections-2026/`.

`.github/workflows/ci.yml` runs the same checks on other branches and pull requests.

## Docs

* [PLAN.md](PLAN.md) — architecture, schema, risks
* [data/SCHEMA.md](data/SCHEMA.md) — data format and coding rules
* [DATA_GAPS.md](DATA_GAPS.md) — what could not be sourced
* [AUDIT.md](AUDIT.md) — neutrality audit and fixes
* [PROGRESS.md](PROGRESS.md) — status and next steps
* `site/metodologia.html` — public methodology page

## Corrections

Open an issue with the statement id, party and a primary source. The same
standard applies to every party.
