# Data schema

All files are UTF-8 JSON. `scripts/validate.mjs` enforces everything below
(`npm run validate`). Dates are ISO `YYYY-MM-DD`; source dates may be `YYYY-MM` when only the month is known, and `date_unknown: true` marks a genuinely undated page.

## parties.json
Array of objects — see PLAN.md §2. `vote_match` tells the vote pipeline how to
attribute Congreso votes to the party: by parliamentary-group code as it
appears in the open-data vote JSON (`GP`, `GS`, `GVOX`, `GSUMAR`, `GR`,
`GJxCAT`, `GEH Bildu`, `GV (EAJ-PNV)`, `GMx`), plus individual deputies
(`"Apellidos, Nombre"` exactly as in the vote JSON) for parties in the Mixed
Group, and `exclude_deputies` for members who left the party.

## topics.json
`[{id, label:{es,en}}]`

## statements.json
`[{id, topic, text:{es,en}, context:{es,en}}]` — `context` is one neutral
sentence about the current legal situation, not an argument.

## positions/<party-id>.json

```json
{
  "party": "psoe",
  "coded_by": "string (who/what coded it)",
  "coded_on": "2026-10-31",
  "positions": [
    {
      "statement": "viv-limite-alquiler",
      "stance": "agree",
      "confidence": "high",
      "evidence_type": "program_2023",
      "sources": [
        {
          "url": "https://…",
          "title": "Programa electoral elecciones generales 2023",
          "publisher": "PSOE",
          "date": "2023-07-07",
          "quote": "Short verbatim excerpt (≤ 40 words) in the original language supporting the coding",
          "page": "p. 112 (optional)",
          "accessed": "2026-10-31"
        }
      ],
      "vote_refs": [],
      "note": "Optional plain-language explanation, required when evidence is mixed."
    }
  ]
}
```

Field rules:

| field | values |
|---|---|
| `stance` | `agree` · `neutral` · `disagree` · `no_clear_position` |
| `confidence` | `high` · `medium` · `low` (omit / null for `no_clear_position`) |
| `evidence_type` | `vote_xv` (vote in current legislature) · `program_2026` · `program_2023` · `official_statement` (party website, press release, official spokesperson in parliament) · `none` (only with `no_clear_position`) |
| `note` | `{ "es": "...", "en": "..." }` — a short, public, plain-language explanation shown to users in the language they chose. Required whenever the evidence is mixed, capped or indirect. No process language (no "recoded", "audit", "calibration"): the audit trail lives in git history. |
| `sources[].lang` | language of the quote and title: `es`, `ca`, `gl`, `eu`, `en` (used for `lang` markup) |
| `sources[].date_unknown` | `true` only for a genuinely undated page (otherwise a date is required) |
| `sources` | ≥ 1. For `no_clear_position`, list the documents searched (quote may be empty). |
| `vote_refs` | ids from `votes/curated.json` |

Confidence ladder (same for every party):
* **high** — XV-legislature vote directly on the measure, or explicit program text (2026 or 2023).
* **medium** — official statement or program text that clearly implies the stance; or vote on a closely related measure.
* **low** — indirect/older evidence (program before 2023, leader interview only, media report of the party position).
* No direct evidence → `no_clear_position`. **Never infer** from ideology or allies.

`neutral` is used only when the source explicitly takes an intermediate
position (e.g. "only in some cases", abstention explicitly explained as such)
— not as a fallback for missing evidence.

## votes/curated.json

```json
[{
  "id": "v-amnistia-2024-05-30",
  "statement": "ter-amnistia",
  "date": "2024-05-30",
  "legislature": 15,
  "session": 43,
  "number": 2,
  "url_json": "https://www.congreso.es/webpublica/opendata/votaciones/Leg15/Sesion043/20240530/Votacion002/VOT_….json",
  "title": "Texto oficial de la votación (copiado del JSON)",
  "yes_means": "agree",
  "relation": "direct | related  (a related vote is shown as context and never creates a coding)",
  "note": { "es": "Why this vote maps to the statement", "en": "…" }
}]
```

## votes/derived.json (generated — do not edit)
Per vote: totals and, per party, `{yes, no, abstain, absent, majority}` where
majority ∈ `yes|no|abstain|split|absent`.

## provinces.json
`[{id, name, community, seats_congreso_2026}]` with `source`.

## candidacies.json
```json
{
  "status": "presented | proclaimed | 2023_fallback",
  "source": {"url": "…", "title": "…", "date": "…"},
  "by_province": {"madrid": ["pp","psoe", "…"]},
  "notes": {"<province>": {"es": "…", "en": "…"}}
}
```


## Rules enforced by `npm run validate` (and therefore by CI and deployment)

* Every `vote_ref` must belong to the same statement as the position that cites it.
* Every curated vote needs a raw Congreso file and a derived tally that **recomputes exactly** from it
  (attribution policy: `data/votes/deputies.json` → `policy`).
* `confidence: high` needs an agreeing **direct** vote or explicit program text; Podemos and Compromís
  cannot exceed `medium` on the joint Sumar 2023 program alone.
* A `vote_xv` coding needs a direct vote (related votes and abstentions never create a position).
* A coded stance that contradicts a linked vote needs an explanatory note.
* Notes (position and vote) need both `es` and `en`; loaded terms are rejected (official titles quoted in «…» are exempt).
* `npm run check-sources` fails on dead links; bot-blocked pages must be listed with a reason and review date in
  `data/source_allow.json`.
