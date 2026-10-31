# PSOE — gaps (subagent:group-a, 2026-10-31)

## PROGRAM URLS
- program_2023: official URL https://www.psoe.es/media-content/2023/07/PROGRAMA_ELECTORAL-GENERALES-2023.pdf could NOT be opened (psoe.es serves an Incapsula bot-check page to curl and WebFetch; web.archive.org is blocked by egress policy). Positions cite an identical copy of the PSOE PDF hosted by El Independiente: https://www.elindependiente.com/wp-content/uploads/2023/07/ProgramaElectoral_ElexGenerales_PSOE_2023.pdf (PDF metadata: Title "PROGRAMA ELECTORAL GENERALES 23", Author "PSOE", created 2023-07-06; cover "Programa electoral Elecciones Generales 23 julio 2023"; page footers "MADRID 7 DE JULIO 2023"). Page numbers in positions are PDF page numbers. The printed number is usually 6 lower, e.g. PDF p. 221 = printed p. 215. Before using this in parties.json, someone with a browser should confirm the psoe.es URL works.
- program_2026: NOT FOUND as of 2026-10-31. psoe.es could not be checked (bot-check), and web searches found no published 2026 general-election program.

## Sources not reachable
- www.psoe.es (all pages, incl. /programa-electoral/ and press releases): Incapsula bot-check, empty to curl and WebFetch. So no PSOE press releases were used. Post-2023 PSOE positions rest on Congreso votes, a BOCG bill and press reports of statements by Pedro Sánchez / María Jesús Montero.
- web.archive.org: blocked by egress policy.
- www.socialistes.cat (PSC): Cloudflare challenge.

## no_clear_position (what was searched)
- eco-bajar-irpf: 2023 program (IRPF, rebaja, bajada de impuestos). It only proposes family allowances/deductions, not a general cut.
- san-gestion-privada: 2023 program (privatización, gestión pública/privada, 15/1997). It only criticises PP "privatización". The 2025 public-management bill came from the Health Ministry (Sumar). No PSOE-party statement found.
- inm-reducir-llegadas: 2023 program (inmigración, flujos, fronteras). It mentions border control and human rights only.
- edu-concertada: 2023 program (concertad*). It only proposes updating funding modules against segregation.
- edu-lengua-castellano: 2023 program (castellano, lengua vehicular, cooficiales). Nothing on schooling-language choice.
- ins-referendum-monarquia: 2023 program (monarquía, Corona, república). No mention.

## Low-confidence / caveats
- ter-referendum (disagree, low): rests on a 30/06/2021 statement by Sánchez in the Congreso ("el PSOE nunca jamás lo aceptará"), via RTVC/EFE and Ara. This predates the XV legislature.
- ter-financiacion-cataluna (neutral, low): Montero (PSOE deputy SG) rejects a "concierto económico o similar" but defends the PSC–ERC "financiación singular", which plans for gradual collection of taxes by the Generalitat. Press only.
- cli-coches-2035 and ext-gasto-defensa (medium): statements by Sánchez as Prime Minister, reported by two outlets each. These are government positions led by the PSOE leader, not party documents.
- viv-compra-no-residentes (agree, medium): PSOE group bill BOCG-15-B-229-1 (30/05/2025), with a 100 % tax on purchases by non-EU residents.
- inm-regularizacion (agree, medium): this is only the 09/04/2024 vote to take the ILP into consideration.
- eco-impuesto-grandes-fortunas (agree, medium): the program says "Evaluaremos los resultados…". The Jan 2024 RDL 8/2023 vote was not used because I could not confirm that RDL extended the tax.

## Votes used (Congreso open data JSON). GS voted as one bloc in each. The votes agent may want to add these to curated.json:
- 2023-09-21 S3 V4 Reglamento (lenguas), conjunto: GS Sí -> ter-lenguas-congreso
- 2024-03-14 S30 V1 PLO amnistía (nuevo dictamen): GS Sí -> ter-amnistia
- 2024-04-09 S34 V1 ILP regularización, toma en consideración: GS Sí -> inm-regularizacion
- 2024-11-21 S79 V62 Ley impuesto complementario + impuesto margen intereses banca, dictamen: GS Sí -> eco-impuesto-energeticas-banca
- 2025-01-22 S89 V2 RDL 10/2024 gravamen energético: GS Sí -> eco-impuesto-energeticas-banca
- 2025-04-10 S106 V15 RDL 2/2025 menores: GS Sí -> inm-reparto-menores
- 2025-09-10 S130 V10 enmiendas totalidad jornada 37,5h: GS No (= for the bill) -> tra-jornada-37h
- 2025-10-08 S136 V87 RDL 10/2025 Gaza/embargo: GS Sí -> ext-embargo-israel
