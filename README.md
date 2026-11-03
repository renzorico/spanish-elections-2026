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
* Static, client-side only: no cookies, no storage of answers, no third-party requests. The only counter is Vercel's cookie-free page-view analytics (page, country, device; the URL is cut to origin + path before it is sent)

## Quick start

```bash
npm test          # unit + data + UI tests (Node ≥ 20, no dependencies)
npm run build     # validate data and write site/data/bundle.json
npm run serve     # http://localhost:8000
```

Other scripts: `npm run votes` (re-derive vote tallies from `data/votes/curated.json`),
`node scripts/reconcile_votes.mjs --dry` (compare coded stances with votes),
`npm run check-sources` (check every source URL resolves).

## Deployment

**Main site: Vercel** — https://compara29n.vercel.app/. `vercel.json` sets the build
(`npm test && npm run build`, output folder `site/`), real security headers (CSP, referrer,
permissions), clean addresses (`/metodologia`) and caching. Every push to `main` deploys to
production; every branch/PR gets a preview address. Page views are counted with Vercel Web
Analytics (cookie-free); `site/js/analytics.js` cuts the address to origin + path before sending.

**Backup: GitHub Pages** — `.github/workflows/pages.yml` runs the same tests and then either
redirects the old address to the Vercel site (when it answers) or serves the full site (when it
does not). One-time setup: *Settings → Pages → Source: GitHub Actions*.

**Vercel setup (once):** import the repository at vercel.com/new, set *Project name* to
`compara29n`, leave the framework as "Other" (the settings come from `vercel.json`), deploy,
then in the project open *Analytics → Enable Web Analytics*.

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
