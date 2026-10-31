# Vox — gaps (subagent:group-b, 2026-10-31)

## PROGRAM URLS
- program_2023: https://votaabascal.es/assets/pdf/Programa-VOX-2023.pdf (official Vox 23J campaign site votaabascal.es; "Programa electoral para las Elecciones Generales 23 de julio de 2023", 178 pp., PDF created 2023-07-06). Page numbers in positions = PDF page index (they match the printed page numbers).
- program_2026: NOT FOUND as of 2026-10-31. Pre-campaign coverage (e.g. https://www.que.es/2026/10/12/precampana-vox-29n-abascal/) describes campaign themes ("remigración", "prioridad nacional", desregulación) but no published program. Re-check voxespana.es once the campaign starts (13 Nov).

## Sources not reachable
- https://www.voxespana.es (all pages): HTTP 403 (Cloudflare) via both curl and WebFetch, so no official press releases or the voxespana.es copy of the program could be read.
- web.archive.org (CDX/Wayback): connection reset or blocked.
- The 30/05/2024 final amnesty vote (lifting of the Senate veto) did not appear in the Congreso open-data listing for that date; the 14/03/2024 vote was used instead.
- No BOCG text was consulted for the Vox PNL (Nov 2025) on taxing foreign buyers of housing; that coding rests on two press reports.

## no_clear_position
- tra-salario-minimo: searched the 2023 program (SMI, "salario mínimo", salarios). It backs raising "todos los salarios, especialmente los más bajos" and criticises the SMI hikes, but sets no 60% target. There is no Congreso vote (the SMI is set by decree).

## Low-confidence / caveats (for reviewers)
- ext-gasto-defensa (agree, low): Abascal in the Congreso (DS 107, 26/03/2025) supported raising defence spending for Spain's borders, but did not commit to the NATO targets.
- ins-referendum-monarquia (disagree, low): inferred only from the program's "máxima protección jurídica" for the Crown as a national symbol. The program does not mention a referendum.
- eco-impuesto-energeticas-banca (disagree, medium): vote on the 2025 energy levy (RDL 10/2024) only. No vote on the banking levy was checked.

## Votes used (Congreso open data JSON, GVOX all 33 deputies same way). The votes agent may want to add these to curated.json:
- 2023-09-21 S3 V4 Reglamento (lenguas), conjunto: GVOX No -> ter-lenguas-congreso
- 2024-03-14 S30 V1 PLO amnistía (nuevo dictamen): GVOX No -> ter-amnistia
- 2024-04-09 S34 V1 ILP regularización, toma en consideración: GVOX No -> inm-regularizacion
- 2025-01-22 S89 V2 RDL 10/2024 gravamen energético: GVOX No -> eco-impuesto-energeticas-banca
- 2025-04-10 S106 V15 RDL 2/2025 menores (contingencias migratorias): GVOX No -> inm-reparto-menores
- 2025-09-10 S130 V10 enmiendas totalidad jornada 37,5h: GVOX Sí (= against the bill) -> tra-jornada-37h
- 2025-10-08 S136 V87 RDL 10/2025 Gaza/embargo: GVOX No -> ext-embargo-israel
