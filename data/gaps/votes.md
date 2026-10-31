# Gaps: Congreso votes (XV legislature)

Checked on 2026-10-31. Method: I downloaded the open-data listing for all 147 voting days in the `diasVotaciones` calendar (19/09/2023 – 02/10/2026), giving 2,189 vote items. I searched their titles by keyword and checked the candidates against the official vote JSON. Mapped votes are in `votes/curated.json` (27 votes, 15 statements); the raw files are in `votes/raw/`.

Caveat: the item title is only in the listing, not the vote text. For motions (mociones) and PNLs voted point by point, the listing shows "Punto N" without the text of that point. Such points were mapped only when the item title alone was unambiguous.

## Statements with no matching plenary vote

| Statement | What was found / why not mapped |
|---|---|
| viv-compra-no-residentes | PSOE registered a bill (2025) for a tax of up to 100 % on home purchases by non-EU non-residents, but no plenary vote on it is in the open data. RDL 26/2026, struck down on 02/10/2026, contained other housing tax measures but not this tax, according to legal summaries. |
| eco-impuesto-grandes-fortunas | No separate vote on the wealth tax or the Impuesto Temporal de Solidaridad. Its extension was inside the omnibus RDL 8/2023 (convalidated 10/01/2024, roll-call vote, PNG only) and is excluded as omnibus. |
| tra-salario-minimo | The minimum wage is set by Real Decreto, not voted in Congreso. No PNL or bill on the 60 % target was found. |
| san-gestion-privada | No plenary vote found on the Ley de gestión pública e integridad del SNS (no debate de totalidad or final vote in the listings up to 02/10/2026). |
| san-dental-publica | No plenary vote found. |
| der-eutanasia | No XV-legislature vote on repealing or keeping the LO 3/2021. |
| der-ley-trans | No XV-legislature vote on the Ley 4/2023 rule allowing a change of registered sex by self-declaration. |
| inm-reducir-llegadas | Only Vox/PP motions on *irregular* immigration and expulsions (e.g. Vox PNL 23/04/2024 "bloquear la invasión inmigratoria ilegal"). These do not test overall arrival numbers, so they are not mapped. |
| cli-coches-2035 | The 2035 ban is an EU regulation. No Congreso vote found. |
| ter-referendum | No vote on an agreed self-determination referendum found. |
| ter-recentralizar | No vote on returning education or health powers to the State. |
| edu-concertada | No vote found. |
| edu-lengua-castellano | Candidate not mapped: Vox motion 08/10/2025 "garantizar la enseñanza y presencia del español en todos los ámbitos" (Sesión 136, votación 99, 33-177-137). The motion text was not checked, so it is unclear whether it covers families choosing Spanish as the language of instruction. Map it only after reading the BOCG text (expte. 173/000122). |
| ins-referendum-monarquia | No vote found. |
| ext-gasto-defensa | Candidates not mapped because the text of each point is not in the open data: BNG motion 11/06/2026 on reversing increases in military spending (expte. 173/000175, puntos 1–4, Sesión 185 votaciones 26–29); Podemos motion 23/05/2024 on military spending (173/000027); PP motion 26/03/2025 on military programming (173/000090, 4 points). The press order of the BNG points does not match the vote pattern, so the point that maps to the statement cannot be identified. |

## Votes published as PNG only (no per-deputy JSON)

All are roll-call votes ("pública por llamamiento"):

- 27/09/2023 and 29/09/2023 – Feijóo investiture (Sesiones 5 and 6, votación 1).
- 16/11/2023 – Sánchez investiture (Sesión 8, votación 1).
- 12/12/2023 – Amnesty law, toma en consideración (Sesión 11, votación 1, 178-172).
- 10/01/2024 – Sesión 15 votaciones 8, 9, 11, 12 (PP totality amendment on amnesty; RDL 8/2023 omnibus, which includes the solidarity tax; stability targets).
- 18/01/2024 – Reform of art. 49 CE (Sesión 17, votación 1).
- 30/01/2024 – Amnesty, votación de conjunto, rejected 171-179 (Sesión 18, votación 10).
- 14/03/2024 – Amnesty, votación de conjunto (Sesión 30, votación 2, 178-172). The JSON of the "nuevo dictamen" vote taken the same day (votación 1, same result) is used in its place.
- 30/05/2024 – Amnesty, Senate veto lifted, final vote 177-172 (Sesión 43, votación 37). Because there is no JSON, curated.json uses 14/03/2024.
- 02/10/2026 – Sesión 203, votación 1: RDL 26/2026 (housing, función social), 172-178, struck down; and votación 3: RDL 27/2026 (stability of residential rental contracts), 166-184, struck down. Both relate to viv-limite-alquiler but have no per-deputy data. Votación 002 is not listed at all.

## URLs not reachable

- Guessed `.json` URLs for PNG-only votes return 404 (e.g. `.../Sesion043/20240530/Votacion037/VOT_20240627132510.json`). No other failures: all 147 day listings and all JSON links used were downloaded.

## Deputy mapping notes (see votes/deputies.json)

- Alberto Ibáñez Mezquita (Compromís–Iniciativa) stayed in GSUMAR after Micó left, so he is counted with GSUMAR / frente-amplio. He is not in deputies.json, following parties.json, which uses only Compromís's deputy in the Mixto.
- Micó moved from GSUMAR to GMx with effect from 03/07/2025. Votes before that date carry her vote under GSUMAR.
- UPN (Catalán) sits in GMx while parties.json lists UPN as a PP component in Navarre. Whether UPN counts with the PP is a decision still to make.
- Ábalos (GMx 27/02/2024 – Jan 2026) and Ortega Smith (GMx from 17/07/2026, ex-Vox) are marked `independent`.
- In the 11/02/2025 JSON, Noemí Santana Perera has an empty `grupo`, so she should be matched by name.
