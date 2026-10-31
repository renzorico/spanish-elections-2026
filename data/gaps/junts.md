# Junts — gaps (subagent:group-d, 2026-10-31)

## PROGRAM URLS
- program_2023: https://junts.cat/wp-content/uploads/2026/10/Programa-electoral-per-Catalunya.pdf ("Programa electoral per Catalunya", slogan "Ja n'hi ha prou", 151 pp., PDF dated 2023-07-19). It is re-hosted in the junts.cat transparency media library next to the Corts Generals 2023 subsidy documents. A byte-identical copy is at https://junts.cat/wp-content/uploads/2026/10/PROGRAMA-ELECTORAL-1.pdf.
- program_2026: not published as of 2026-10-31. junts.cat media library searched (wp-json/wp/v2/media, "programa", "generals", "eleccions"). Lists were proclaimed on 2026-10-17 (Consell Nacional), but there is no program yet. The "Propostes" pages (https://junts.cat/propostes/...) are current official positions and were used as official_statement.

## Sources not reachable / limitations
- The junts.cat news archive seems to start in mid-2026 (site rebuild), so older press releases (2023-2025) could not be found there. Press was used for XV-legislature votes (37.5h week, arms embargo, minors distribution).

## Statements left as no_clear_position (what was searched)
Searched the full 2023 program text plus the junts.cat Propostes pages (habitatge, impostos, immigració, sanitat, educació, llengua, nació, seguretat, benestar social, finançament) and the junts.cat posts search API:
- viv-limite-alquiler: "lloguer", "índex de referència" → no position on caps. The web opposes measures that "limitin l'oferta" but does not reject caps explicitly.
- viv-compra-no-residentes: "no resident", "estrangers" → nothing.
- eco-impuesto-grandes-fortunas: "patrimoni", "grans fortunes", "riquesa" → nothing on wealth taxes.
- san-dental-publica: "dental", "bucodental" → nothing.
- der-aborto-constitucion: "avortament", "interrupció voluntària" → nothing. Vote on the 2026 constitutional reform → vote mapping.
- der-eutanasia: "eutanàsia", "mort digna" → nothing.
- der-ley-trans: "trans", "identitat de gènere" → only generic LGTBI support.
- inm-reducir-llegadas: Nogueras 26/08/2026: "Catalunya no té capacitat d'acollida infinita". This is framed as Catalonia controlling flows, not as reducing arrivals to Spain.
- cli-nucleares: program section "Mix elèctric i al tancament de les nuclears" has no explicit stance. Press says Junts abstained or voted inconsistently on PP initiatives in 2025 (not verified here) → vote mapping.
- cli-coches-2035: only promotes electrification.
- ins-cgpj: proposes forcing CGPJ renewal; does not say who should elect the members.
- ins-referendum-monarquia: nothing beyond complaining that the Mesa blocks debates on the monarchy.
- ins-memoria-democratica: criticises the 2022 law as insufficient; no keep/repeal position.
- ext-gasto-defensa: program section "Seguretat i defensa" has no spending position. A single press report (OKDIARIO, 13/03/2025) describes conditional openness to more defence spending. Not enough to code.

## Notes for reviewers
- viv-desalojo-rapido is coded neutral. Junts backs 48-hour evictions for disruptive or criminal occupations, but explicitly separates out vulnerable situations.
- inm-regularizacion has mixed evidence: the 2023 program says "buscar vies de solució" for people without papers, while the 2026 official statement criticises the "regularització massiva". Coded disagree/medium.
- eco-impuesto-energeticas-banca: evidence covers only the energy levy (Junts claims it "frenó" it). No evidence was found on the bank levy.
