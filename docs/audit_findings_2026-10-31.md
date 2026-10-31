# Neutrality audit: Spanish general election 2026 voter tool

Auditor: independent review (Claude), 2026-10-31. Repo state: HEAD `6408286` ("Balance acquiescence bias: reverse polarity of 5 statements…"). I edited no repo files.

## 1. Summary

The plumbing is sound. Vote tallies recompute exactly from the raw Congreso JSON (27/27 votes, 0 mismatches). Two raw files fetched live from congreso.es are byte-identical in content. All 226 program quotes were checked against the downloaded PDFs and all are present, some across page breaks or column layouts. Every web quote I fetched (18 pages) is verbatim. Party and statement order are properly randomised, there are no "recommended" labels, and no colour cues on stances. I found no fabricated sources.

The problems are in **editorial consistency**. A journalist or party representative could reasonably call the tool biased because of these:

1. **The published province rule is applied inconsistently.** The rule says a party is shown only if it has its own list or heads the coalition.
   - PP is shown in Navarra, where the coalition is UPN-led.
   - Frente Amplio is shown in Huesca, Zaragoza and Baleares, where the coalitions are led by CHA and Ara Més.
   - Podemos and Frente Amplio are hidden in Las Palmas and Santa Cruz de Tenerife, where the coalition is NC-led.
2. **Different coding standards per coder group.** The group-e coder (BNG, CC, EH Bildu, PNV) filled gaps from *related* or uncurated votes. Groups a and c (PP, PSOE, Frente Amplio, Podemos, Compromís) left identical evidence as `no_clear_position`. Same-evidence confidence also differs: PSOE gets medium for the regularisation vote, while CC, PNV and BNG get high.
3. **Several statements are outdated, ambiguous or double-barrelled, and this changes codings.**
   - `inm-regularizacion`: the regularisation was already approved in 2026.
   - `ext-gasto-defensa`: "NATO targets" could mean 2 % or 5 %. PP's 2 % pledge is coded "agree", but PSOE delivering 2.1 % is coded "disagree".
   - `eco-impuesto-energeticas-banca` covers both energy companies and banks.
   - `viv-desalojo-rapido` combines fast eviction with "including vulnerable occupants".
4. **The polarity reversal left defects behind.**
   - `ins-derogar-memoria`: high-confidence codings rest on a PNL that is mislabelled `direct`. Two of those parties' own quotes *criticise* the law.
   - Vote notes contradict themselves ("Sí = agree … sí = en desacuerdo").
   - The `cli-coches…` context sentence now has a dangling referent.
   - `der-cambio-sexo-informe` is coded mostly by inference from generic pro- or anti-LGTBI-law statements.
5. **Acquiescence and missing-data bias remain.** A user who answers "strongly agree" to everything is ranked CC 71 %, PNV 63 %, BNG 63 % … PP 44 %. 17 of 30 statements have agree = left, government or nationalist; 13 have agree = right. CC (14/30 coverage) tops the sorted list because its coded positions sit mainly on government-measure votes. Three statements are coded for only 2–3 parties.

Overall: **7 HIGH, 13 MEDIUM, 11 LOW** findings. None show deliberate partisanship. Most come from parallel automated coders without cross-calibration, and from the mechanical polarity flip.

## 2. Findings table

| # | Sev | Area | File / id | Evidence | Suggested fix |
|---|---|---|---|---|---|
| H1 | HIGH | Province filter | `data/candidacies.json` (navarra, huesca, zaragoza, balears vs las-palmas, santa-cruz-de-tenerife) | `inclusion_rule`: "aparece … solo si presenta lista propia … o encabeza la coalición". BOE-A-2026-22607 (fetched): Navarra list 7 is "UNIÓN DEL PUEBLO NAVARRO EN COALICIÓN CON PARTIDO POPULAR (UPN-PP)", headed by Leticia San Martín (UPN). PP is still listed. Huesca/Zaragoza "CHUNTA ARAGONESISTA-FRENTE AMPLIO ARAGÓN (CHA-IU-MS-FRENTE AMPLIO)" and Baleares "ARAMÉS-FRONT AMPLI" are mapped to frente-amplio. Canarias "UPC (NC-BC, PODEMOS, IU, SUMAR)" is **not** mapped, so Podemos and Frente Amplio are hidden by default. | Pick one rule and apply it everywhere. Recommended: list a party whenever its name or acronym appears in the coalition denomination, with a "en coalición: …" badge. That would show Podemos and Frente Amplio in Canarias, and Podemos (Podem) and Frente Amplio (EUPV) in Valencia. Alternatively, apply the strict rule to PP in Navarra and to Frente Amplio in Aragón and Baleares as well. |
| H2 | HIGH | Coding standard | `positions/{bng,cc,eh-bildu,pnv}.json` vs `{psoe,frente-amplio,podemos,compromis}.json` | DATA_GAPS says "Only DIRECT votes … may fill a missing position". But BNG, CC, EH Bildu and PNV `viv-desalojo-rapido` and CC and EH Bildu `eco-bajar-irpf` are coded **only** from related votes, or from an uncurated 22/04/2026 motion (VOT_20260422152001, which I verified live: GS 119 No, EH Bildu 6 No, Valido Sí). For the same votes, PSOE `eco-bajar-irpf` (voted No on all three) and Frente Amplio, Podemos and Compromís `viv-desalojo-rapido` (voted No on both bills) stay `no_clear_position`. | Apply one rule. Either drop the 6 related-only codings to `no_clear_position`, or code the 4 parallel cases the same way (medium). Add the 22/04/2026 vote to `curated.json` as `related`. Add a validator check that `evidence_type=vote_xv` requires at least one direct curated vote. |
| H3 | HIGH | Wording / facts | `statements.json` `inm-regularizacion` | The context mentions only the 2024 ILP. The repo's own sources show the Government approved the extraordinary regularisation in 2026: Movimiento Sumar, 14/04/2026, "se ha aprobado … el reglamento … regularización extraordinaria para más de 500.000"; Podemos/Ara 26/01/2026; PP motion of 18/03/2026 asking to "renunciar … a la regularización". "Debería hacerse" therefore asks about something already done. PSOE, the governing party that approved it, is coded only `medium` with "el programa de 2023 no trata la medida". | Reword to e.g. "Debería mantenerse (o ampliarse) la regularización extraordinaria aprobada en 2026" and update the context. Recode PSOE on the 2026 decree (high/official). |
| H4 | HIGH | Wording + asymmetric coding | `ext-gasto-defensa`; `positions/pp.json`, `psoe.json`, `pnv.json` | The statement does not say which NATO target (2 % or 5 %). PP is coded agree/medium on its 2023 program: "Cumpliremos … un 2% del PIB". PSOE is coded disagree/medium although the Government raised spending to 2.1 %, which the note says meets the capability targets. The same 2 % position counts as "agree" for PP and "disagree" for PSOE. PNV, "close to the Government (~2 %)", is coded no_clear_position. | Name the target: "hasta el 3,5 %/5 % del PIB acordado en la cumbre de la OTAN de 2025". Recode all 13 parties against that wording. |
| H5 | HIGH | Reversed statement / votes | `curated.json` `v-memoria-pnl-2024-05-23`; `ins-derogar-memoria` for BNG, CC, Junts, Compromís, Podemos | The PNL "sobre la garantía de la aplicación de las políticas de memoria democrática" is labelled `relation: direct` for "Debería derogarse la Ley 20/2022". It is not a vote on repeal. BNG, CC and Junts get **disagree/high** from this PNL alone, while their own cited quotes criticise the law: BNG "a Lei de Memoria Democrática, que mantén na impunidade os crimes do franquismo"; Junts "una llei de memòria per legitimar el règim del 78". Compromís high: its note admits the program "does not name the law" (ladder: medium). Podemos high: its note says "capped at medium". | Set the PNL to `related`. Cap BNG, CC, Junts, Compromís and Podemos at medium. For BNG and Junts, add a note that they criticise the law as insufficient (opposing repeal is still the plausible coding). |
| H6 | HIGH | Inference vs "never infer" rule | `der-cambio-sexo-informe` (BNG, PNV, EH Bildu, Compromís, PSOE disagree/medium; PP agree/medium) | The statement is about requiring a medical or psychological report. Most codings come from generic text:<br>• PNV: "seguimiento … del cumplimiento de la legislación aprobada"<br>• Compromís: "Blindaje de los avances, leyes y normas … LGTBI"<br>• BNG: "consolidar e ampliar o acadado"<br>• PP: pp.es 21/01/2025, a women's-sport article saying the PP "derogará" Law 4/2023, with no word on medical reports (fetched)<br>Junts, with equally generic text, is coded `no_clear_position`. Only ERC ("autodeterminació de gènere … despatologitzar") and Vox (explicit repeal) speak to it directly. | Recode generic-only cases to `no_clear_position`, or to low if a reasonable link exists. Apply the same treatment to PP and to the left parties. |
| H7 | HIGH | Wording (double-barrelled) | `eco-impuesto-energeticas-banca` | "Las grandes empresas energéticas **y** los bancos…". Several notes show the split. PNV is coded neutral because it accepts the bank tax but not the energy levy. Junts' note: "No hem trobat posició … sobre l'impost a la banca". Vox's note: "This vote covers only the energy-company part". Also, the context ("En 2023 y 2024 se aplicaron gravámenes temporales") omits that Ley 7/2024 (BOE 21/12/2024, BOE-A-2024-26694, fetched) created a bank tax (Impuesto sobre el margen de intereses y comisiones) that is in force now. | Split into two statements (energy and banks) or keep only one. Rewrite the context to state that the bank tax is currently in force under Ley 7/2024 and that the energy levy lapsed in January 2025. |
| M1 | MED | Same evidence, different confidence | `inm-regularizacion`: PSOE medium vs CC, PNV, BNG, EH Bildu, Compromís, Frente Amplio, Podemos high | All rely on the same `v-regularizacion-ilp-2024-04-09` (direct). The PSOE note says "Es un voto de toma en consideración, no de aprobación final"; nobody else gets that downgrade. | Use the same confidence for all, and raise PSOE on the 2026 decree (see H3). |
| M2 | MED | Inference asymmetry | `ins-referendum-monarquia`: Vox disagree/low vs BNG no_clear_position | Vox is coded from "máxima protección jurídica a los símbolos … la Corona" with the note "says nothing about a referendum". That is an inference the rules forbid. BNG, which attacks the monarchy and wants a Galician republic, is left uncoded. Only 3/13 parties are coded and 2 of those are low. | Set Vox to `no_clear_position`, or apply the same low-inference standard to BNG, EH Bildu and others. Better: replace the statement (see M8). |
| M3 | MED | Confidence ladder for press reports | Frente Amplio, PSOE `ext-gasto-defensa`; PSOE `cli-coches…`; Vox `viv-compra-no-residentes` (all medium) vs PSOE `ter-referendum`, `ter-financiacion-cataluna` (low) | The ladder says "media report of the party position" = **low**. Medium positions rest only on press reports: TheObjective/El Independiente for Frente Amplio, RTVC/Ara for PSOE, Forbes/brainsre for Vox. The PSOE `cli-coches` source on deia.eus returns 406. Comparable press-only PSOE positions are low. | Apply low to all press-only codings, or redefine the ladder (e.g. a press report quoting an official spokesperson = medium) and apply it everywhere. |
| M4 | MED | Methodology vs data | `metodologia.html` §3; `positions/frente-amplio.json` | The methodology says "Frente Amplio, Podemos y Compromís … cuando la única evidencia es aquel programa conjunto, la confianza es como máximo media". Frente Amplio has 10 program_2023/high codings based only on the Sumar program (e.g. `eco-suprimir-impuesto-fortunas`, `der-cambio-sexo-informe`, `edu-concertada`, `san-dental-publica`). | Either exempt Frente Amplio explicitly (as Sumar's successor) in the text, or cap it. |
| M5 | MED | Same evidence, different confidence | `cli-coches-combustion-despues-2035`: Frente Amplio medium vs Podemos low | Both cite the same Sumar quote ("en 2040 no circulen … motores de combustión interna"). | Use the same confidence. |
| M6 | MED | Acquiescence / missing-data ranking | `match.js` `sortByAgreement`, `limitedData` | Simulation on bundle.json:<br>• All "strongly agree" ranks CC 71.4 % (14/30, flagged), PNV 63.3 % (15/30, **not** flagged because the threshold is strict `<0.5`), BNG 63.0 % … PP 43.8 %.<br>• All "strongly disagree" puts PP first.<br>• Polarity is 17 left/government/nationalist vs 13 right.<br>• In the sorted view, parties with half the data can top the list. | Reverse 2 more statements to reach 15/15, e.g. `ter-lenguas-congreso` and `ext-embargo-israel` as "debería dejar de…". In the sorted view, group limited-data parties below the others or require a minimum N. Use `<=0.5`. |
| M7 | MED | Low-information statements | `viv-compra-no-residentes` (2 coded), `inm-reducir-llegadas` (2: Vox medium, SALF low), `ins-referendum-monarquia` (3) | A user who agrees with `inm-reducir-llegadas` can only ever match Vox or SALF. 11/13 parties are uncoded on it, and the SALF code rests on a natalist line ("no traer millones de inmigrantes"). | Replace these with statements that most parties have documented positions on, or search harder: e.g. Sánchez's statements on Spain's need for immigration, the PP Congreso motions. |
| M8 | MED | Regional parties disadvantaged | Statement set: `ter-financiacion-cataluna`, `edu-lengua-castellano` | 4 of the 5 territorial statements are Catalan-centred. `ter-financiacion-cataluna` names Catalonia, so BNG ("reclama un concierto económico para Galicia" per its note), Compromís, CC and PNV are uncoded. There are no Canarian, Basque or Galician-specific items. PNV has 15/30 and CC 16/30 no_clear_position. | Generalise: "Todas las comunidades que lo pidan deberían poder recaudar todos sus impuestos, como País Vasco y Navarra". Consider one item relevant to Canarias/Basque/Galicia (e.g. transfer of migration or other powers). |
| M9 | MED | Asymmetric framing | `eco-bajar-irpf` vs `tra-jornada-37h`, `san-dental-publica`, `ext-gasto-defensa` | Only the right-leaning tax-cut item carries a cost clause ("aunque el Estado ingrese menos"). The left items carry benefit clauses ("sin bajar el salario", "para toda la población") or no cost at all. | Remove the cost clause, or add symmetric trade-offs. Best is to remove it. |
| M10 | MED | Double-barrelled | `viv-desalojo-rapido` | "acelerarse … también cuando los ocupantes estén en situación vulnerable". PSOE and Junts are coded neutral because they support 48-hour evictions but not the vulnerable clause; PP, Vox and CC are coded agree although their sources do not address vulnerability. | Split it, or drop the clause and use a separate item on vulnerability protections. |
| M11 | MED | Outdated premise | `tra-salario-minimo` | "Debería seguir subiendo hasta llegar al 60 % del salario medio" presupposes the SMI is below 60 %. The Government has repeatedly stated the SMI already meets the 60 % European Social Charter benchmark. I fetched the Moncloa 11/02/2025 summary but could not extract the passage automatically, so this needs manual verification. | Verify. If confirmed, reword (e.g. "debería mantenerse por ley en al menos el 60 % del salario medio") and give the context the current figure. |
| M12 | MED | Vote note contradictions shown in UI | `curated.json` `v-memoria-mocion-2024-02-06`, `v-memoria-pnl-2024-05-23` | Notes say "Sí = apoyar la ley (agree) … (Afirmación reformulada en sentido inverso: sí = en desacuerdo.)" and "Sí = agree … sí = en desacuerdo". `app.js` displays `v.note`, so users see contradictory text. | Rewrite the notes: "Sí = apoyar la ley ⇒ en desacuerdo con derogarla". |
| M13 | MED | Inclusion criterion ambiguity | `metodologia.html` §1 (Geroa Bai listed as failing both criteria) | Geroa Bai was a member of the CEUS coalition (EAJ-PNV, CC, Geroa Bai…), which won about 1.6 % in the EP 2024 election. The rule does not say whether coalition votes count for components. PNV and CC qualify anyway under (a), so the question only matters for Geroa Bai. Also, PNV is a known Geroa Bai member but is excluded in Navarra because "el BOE no detalla sus integrantes". | State explicitly how coalition vote shares are attributed, and apply that to Geroa Bai. Confirm Geroa Bai's composition from an official source. |
| L1 | LOW | Context dangling after reversal | `cli-coches-combustion-despues-2035` context | ES "**Lo** establece una norma de la UE…" / EN "**This** comes from an EU rule" now refer to nothing, because the statement no longer mentions a ban. | "La prohibición de vender coches nuevos de combustión desde 2035 la estableció una norma de la UE de 2023; en diciembre de 2025 la Comisión propuso flexibilizarla". |
| L2 | LOW | Context incompleteness | `tra-jornada-37h`, `der-aborto-constitucion`, `ter-amnistia` | Jornada: the context omits that the 10/09/2025 vote **returned** the bill. Aborto: it omits the 2026 Government bill to reform art. 43 (lapsed with the dissolution). Amnistía: it omits that the Constitutional Court upheld the law (2025). | Add one clause each. |
| L3 | LOW | Context inaccuracy | `ter-recentralizar` | "Desde los años 80 y 90 las comunidades gestionan la educación y la sanidad". INSALUD transfers to 10 regions were completed only in 2002, and education transfers in 1999–2000. | "Entre los años 80 y 2002…". |
| L4 | LOW | Ambiguity | `eco-suprimir-impuesto-fortunas` | "el impuesto específico" is singular, but the context names two taxes. PP is coded on the ITSGF ("impuesto a las grandes fortunas"); Vox and SALF are coded on the Impuesto sobre el Patrimonio (SALF only regionally). | Name the tax explicitly (ITSGF), or say "los impuestos sobre el patrimonio (Patrimonio y Grandes Fortunas)". |
| L5 | LOW | Vote relation labels | `curated.json` `v-alquiler-rdl8-2026-04-28` | Labelled `direct`, but RDL 8/2026 is a national 2 % cap on rent updates plus contract extensions, not caps "en zonas donde es especialmente alto". It supports high confidence for Junts (disagree) and Cc. | Label it `related`, or note why it is treated as direct. |
| L6 | LOW | Neutral stance compresses scores | `match.js` | A party coded `neutral` can never score below 50 % on that item. PP and PSOE have 3 neutral codings each and most small parties have 0–1, so there is a slight centrist cushion. `pp tra-salario-minimo` is neutral/low with no explicit intermediate position, which looks like a fallback the schema forbids. | Audit neutral codings for an explicit intermediate stance. For PP SMI, use `no_clear_position`. |
| L7 | LOW | Loaded terms in authored notes | `curated.json` notes for `v-embargo-israel-rdl-2025-10-08` ("contra el genocidio en Gaza"), `v-okupacion-*` ("ocupación ilegal") | These are official titles, but they are repeated unquoted in the tool's own voice. The validator lints only statements, context and position notes, not curated notes. | Put official titles in quotes («…») and extend the lint to `curated.json` notes. |
| L8 | LOW | Stale doc | `DATA_GAPS.md` coverage table | Pre-reversal counts: PP shown as 5 agree / 16 disagree, actual is 9/12; PSOE 16/5 vs actual 11/10; and so on. | Regenerate the table. |
| L9 | LOW | Podemos note contradicts confidence | `podemos.json` (cli-nucleares, ins-cgpj, ins-derogar-memoria, …) | The note says "capped at medium" but the position is high, because of direct votes. | Adjust the note text. |
| L10 | LOW | Candidacy mapping unverified | asturias `"PODEMOS (PAZ, CASA Y TRABAJO)"` | The BOE text matches, but the denomination is unusual and might belong to a different party. | Confirm against the 3 Nov proclamation or Podemos' own communications. |
| L11 | LOW | Explainer nuance | `i18n.js` explainer item 2; `eleccion.html` §2 | "según su población" omits the guaranteed minimum of 2 seats per province (LOREG art. 162), which is the reason Soria has 2. Everything else is accurate: 3 % of valid votes including blank votes, D'Hondt, 176 / simple majority after 48 h, the two-month rule, the Senate limited vote of up to 3, and RD 806/2026 dates (verified on the BOE). | Add "(mínimo 2 por provincia)". |

## 3. Statement polarity count (after the 5 reversals)

- **Agree = left / government / nationalist (17):** viv-limite-alquiler, viv-compra-no-residentes, eco-impuesto-energeticas-banca, tra-jornada-37h, tra-salario-minimo, san-gestion-privada, san-dental-publica, der-aborto-constitucion, inm-regularizacion, inm-reparto-menores, ter-amnistia, ter-referendum, ter-financiacion-cataluna, ter-lenguas-congreso, edu-concertada, ins-referendum-monarquia, ext-embargo-israel.
- **Agree = right / opposition (13):** viv-desalojo-rapido, eco-suprimir-impuesto-fortunas, eco-bajar-irpf, der-derogar-eutanasia, der-cambio-sexo-informe, inm-reducir-llegadas, cli-nucleares, cli-coches-combustion-despues-2035, ter-recentralizar, edu-lengua-castellano, ins-cgpj, ins-derogar-memoria, ext-gasto-defensa.
- 3 statements use "keep" framing for government measures: ter-amnistia, ter-lenguas-congreso, ext-embargo-israel.

## 4. Sample of checked positions (51 stratified random + 12 targeted on the reversed statements)

How each source was checked:
- **Program PDFs:** downloaded to `/tmp/claude-0/-home-user-spanish-elections-2026/6a554eee-91f9-5666-b78a-04ec878c6534/scratchpad/audit/pdf/` and searched with pdftotext, both exact match and an in-order fuzzy match for multi-column layouts. All 226 program quotes in the repo were found.
- **Web pages:** fetched with curl into `/tmp/claude-0/-home-user-spanish-elections-2026/6a554eee-91f9-5666-b78a-04ec878c6534/scratchpad/audit/web/`.
- **Votes:** recomputed from `data/votes/raw` and spot-checked live against congreso.es.

| # | Party | Statement | Coded | Verdict | Comment |
|---|---|---|---|---|---|
| 1 | BNG | cli-nucleares | disagree/high | OK | Rego voted No on both PP nuclear initiatives (raw JSON). |
| 2 | BNG | eco-bajar-irpf | neutral/medium | OK | Quote verbatim (p. 39). Intermediate position is explicit. |
| 3 | BNG | ins-referendum-monarquia | ncp | OK | No referendum proposal in program. Asymmetric with Vox (M2). |
| 4 | BNG | ter-amnistia | agree/high | OK | Direct vote. |
| 5 | CC | tra-jornada-37h | agree/high | OK | Valido voted No to the totality amendments. |
| 6 | CC | viv-desalojo-rapido | agree/medium | inconsistent-standard | Related votes only (H2). |
| 7 | CC | der-derogar-eutanasia | ncp | OK | Not in the 14-page manifesto. |
| 8 | CC | inm-regularizacion | agree/high | OK | PSOE gets medium for the same vote (M1). |
| 9 | Compromís | inm-regularizacion | agree/high | OK | compromis.net quote verbatim. |
| 10 | Compromís | der-cambio-sexo-informe | disagree/medium | does-not-support | Generic LGTBI text (H6). |
| 11 | Compromís | san-dental-publica | ncp | OK | No "dental" in program. |
| 12 | Compromís | eco-impuesto-energeticas-banca | agree/high | OK | Verbatim. |
| 13 | EH Bildu | eco-suprimir-impuesto-fortunas | disagree/high | OK | "convertir en permanentes los impuestos a … grandes fortunas". Reversal correct. |
| 14 | EH Bildu | san-dental-publica | agree/medium | OK | "dentales básicos"; medium is justified. |
| 15 | EH Bildu | der-derogar-eutanasia | ncp | OK | Not in program. |
| 16 | EH Bildu | eco-bajar-irpf | disagree/medium | inconsistent-standard | Uncurated 2026 motion (verified live). PSOE voted the same and is ncp (H2). |
| 17 | ERC | inm-regularizacion | agree/high | OK | Verbatim p. 41. |
| 18 | ERC | cli-coches-combustion-despues-2035 | disagree/medium | OK | Reversal correct. |
| 19 | ERC | san-gestion-privada | ncp | OK | No privatisation-limit proposal found. |
| 20 | ERC | ter-referendum | agree/high | OK | "Negociar la convocatòria d'un referèndum". |
| 21 | Frente Amplio | ter-amnistia | agree/high | OK | Direct vote. |
| 22 | Frente Amplio | ext-gasto-defensa | disagree/medium | wrong-confidence | Press only, so low per ladder. Statement is ambiguous (H4, M3). |
| 23 | Frente Amplio | ter-referendum | ncp | OK | The program wants a vote on a negotiated agreement, not on independence. |
| 24 | Frente Amplio | eco-impuesto-energeticas-banca | agree/high | OK | Verbatim. |
| 25 | Junts | viv-limite-alquiler | disagree/high | OK (caveat) | Rests on an RDL vote labelled direct (L5). junts.cat quote verbatim. |
| 26 | Junts | inm-regularizacion | disagree/medium | OK | Mixed evidence explained. junts.cat quote verbatim. |
| 27 | Junts | san-dental-publica | ncp | OK | No "dental" in program. |
| 28 | Junts | edu-concertada | disagree/high | OK | "Les dues xarxes necessiten els mateixos recursos". |
| 29 | PNV | ter-lenguas-congreso | agree/high | OK | Direct vote. |
| 30 | PNV | der-cambio-sexo-informe | disagree/medium | does-not-support | Generic "seguimiento … legislación aprobada" (H6). |
| 31 | PNV | der-derogar-eutanasia | ncp | OK | Not in program. |
| 32 | PNV | inm-reparto-menores | agree/high | OK | Direct vote and verbatim quote. |
| 33 | Podemos | cli-nucleares | disagree/high | OK (note mismatch) | High via direct vote; note says "capped at medium" (L9). |
| 34 | Podemos | der-derogar-eutanasia | disagree/medium | OK | Cap applied. |
| 35 | Podemos | ter-recentralizar | ncp | OK | |
| 36 | Podemos | cli-coches-combustion-despues-2035 | disagree/low | wrong-confidence | Frente Amplio gets medium for the same quote (M5). |
| 37 | PP | der-aborto-constitucion | disagree/high | OK | Direct vote. pp.es quote verbatim. |
| 38 | PP | tra-salario-minimo | neutral/low | wrong-confidence/stance | No explicit intermediate position; program text, so not low (L6). |
| 39 | PP | ter-recentralizar | ncp | OK | |
| 40 | PP | ext-gasto-defensa | agree/medium | does-not-support | 2 % pledge vs PSOE's 2.1 % coded disagree (H4). |
| 41 | PSOE | der-aborto-constitucion | agree/high | OK | Verbatim p. 235 plus direct vote. |
| 42 | PSOE | eco-suprimir-impuesto-fortunas | disagree/medium | OK | Reversal correct. |
| 43 | PSOE | eco-bajar-irpf | ncp | inconsistent-standard | Voted No three times; EH Bildu coded on the same vote (H2). |
| 44 | PSOE | ter-amnistia | agree/high | OK | |
| 45 | SALF | viv-desalojo-rapido | agree/medium | OK | Regional program explicitly asks the State; verbatim. |
| 46 | SALF | cli-coches-combustion-despues-2035 | ncp | OK | Not in CyL program. |
| 47 | SALF | cli-nucleares | agree/medium | OK | "exigiremos al Gobierno de España que paralice…" verbatim. |
| 48 | Vox | eco-impuesto-energeticas-banca | disagree/high | OK (caveat) | Covers only the energy part (H7). |
| 49 | Vox | san-dental-publica | agree/medium | OK | |
| 50 | Vox | tra-salario-minimo | ncp | OK | |
| 51 | Vox | eco-bajar-irpf | agree/high | OK | Verbatim p. 75. |
| R1 | PP | eco-suprimir-impuesto-fortunas | agree/high | OK | "Eliminaremos el impuesto a las grandes fortunas" verbatim. |
| R2 | Vox | eco-suprimir-impuesto-fortunas | agree/high | OK (ambiguity) | Patrimonio vs ITSGF (L4). |
| R3 | PSOE | cli-coches-combustion-despues-2035 | disagree/medium | wrong-confidence / unreachable | deia.eus returns 406. Ara headline verbatim. Press only, so low. |
| R4 | PP | cli-coches-combustion-despues-2035 | agree/medium | OK | pp.es quote verbatim. |
| R5 | BNG | ins-derogar-memoria | disagree/high | wrong-confidence | Mislabelled "direct" PNL; own quote critical (H5). |
| R6 | Junts | ins-derogar-memoria | disagree/high | wrong-confidence | Same as R5. |
| R7 | CC | ins-derogar-memoria | disagree/high | wrong-confidence | PNL only. |
| R8 | Compromís | ins-derogar-memoria | disagree/high | wrong-confidence | Note admits the law is not named. |
| R9 | PP | ins-derogar-memoria | agree/high | OK | "DEROGANDO LA MAL LLAMADA LEY DE MEMORIA DEMOCRÁTICA" verbatim. |
| R10 | PP | der-cambio-sexo-informe | agree/medium | does-not-support | Source does not mention medical reports (H6). |
| R11 | PP | der-derogar-eutanasia | neutral/medium | OK | "revisaremos la Ley de Eutanasia". |
| R12 | Vox | der-derogar-eutanasia | agree/high | OK | "Derogaremos la Ley Orgánica 3/2021" verbatim. |

**Totals (63):**

| Verdict | Count |
|---|---|
| OK (incl. 4 with caveats) | 43 |
| wrong-confidence | 9 |
| does-not-support | 5 |
| inconsistent-standard | 3 |
| unreachable (deia.eus, partial) | 1 |
| quote-not-found | 0 |

The 5 reversed statements were all inverted correctly in direction. The defects that remain are confidence levels (memoria), inference (cambio-sexo), the dangling context (coches) and the contradictory vote notes (memoria).

**Votes checked:** all 27 `yes_means` values against the raw `textoExpediente`. Direction is correct in all 27 cases, including the reversed memoria votes and the totality-amendment votes (yes = disagree). Relation labels are questionable for `v-memoria-pnl` (H5) and `v-alquiler-rdl8` (L5).

**Blocked or unreachable (not circumvented):**
- deia.eus: HTTP 406.
- Per DATA_GAPS: psoe.es, voxespana.es, podemos.info and esquerra.cat are bot-checked. I did not retry them.
- Reachable: BOE, congreso.es, lamoncloa.gob.es, pp.es, junts.cat, compromis.net, bng.gal, eaj-pnv.eus.

## 5. UI and ordering review (site/js/app.js, match.js)

- Party order, statement order and results are shuffled with Fisher–Yates over `crypto.getRandomValues`. Topic order on the weights page and in the breakdown follows the shuffled statement order. Sorting is opt-in and ties keep the random order. **OK.**
- There are no colours per party or stance. The only stance styling is `no_clear_position` in muted italic. No "recommended" or "best match" labels. **OK.**
- The province `<select>` is alphabetical, which is fine. Parties hidden by the province filter are recoverable through the "mostrar también…" toggle, but the underlying mapping is inconsistent (H1).
- Missing data is never imputed. However, `limitedData` uses a strict `<0.5`, so PNV at 15/30 is not flagged, and sorted results reward partial coverage (M6).
- Agreement is symmetric for agree and disagree. A neutral party stance gives at least 50 % (L6). A user answer of "Neutral" counts as answered, scoring 0.5 against any agree or disagree.
- Confidence does not weight scores; it only matters for the "exclude low" toggle, which mostly removes SALF (7 of its 10 positions are low). That is acceptable but worth stating next to the toggle.

## 6. Prioritised fix list

1. **H1:** Apply one candidacy rule. Today PP is shown in Navarra and Frente Amplio in Aragón and Baleares while Podemos and Frente Amplio are hidden in Canarias. Update `inclusion_rule`, the notes and the methodology.
2. **H3, H4, H7:** Rewrite `inm-regularizacion` (the 2026 decree exists), `ext-gasto-defensa` (name the target) and `eco-impuesto-energeticas-banca` (split it; fix the context on Ley 7/2024). Recode all 13 parties on the new wording.
3. **H2, M1, M3, M5:** Run one calibration pass across all coders.
   - Related or uncurated votes never fill gaps on their own (or always do).
   - Press-only evidence is low.
   - The same evidence gets the same confidence.
   - Add validator checks for (a) `vote_xv` without a direct curated vote and (b) official_statement/high without a vote.
4. **H5, M12:** Relabel `v-memoria-pnl` as related, cap the affected memoria codings at medium, and fix the contradictory vote notes.
5. **H6, M2:** Remove inference-based codings (`der-cambio-sexo-informe` generic cases, Vox monarchy).
6. **M6, M9, M10:** Rebalance polarity to 15/15, remove the IRPF cost clause, split the desalojo item, and group or flag limited-data parties in the sorted view (use `<=0.5`).
7. **M7, M8:** Replace or generalise the low-coverage and Catalonia-specific items (Catalan financing, immigration numbers, monarchy referendum, non-EU buyers).
8. **M4, M11, M13:** Align the methodology with the data (Frente Amplio cap), verify the SMI 60 % premise, and clarify how coalition votes count for the 1 % criterion (Geroa Bai).
9. **LOW items:** context fixes (coches, jornada, aborto, recentralizar), relation label for RDL 8/2026, quoting official titles and linting curated notes, regenerating the DATA_GAPS table, the Podemos note text, the Asturias Podemos check and the explainer's minimum seats.
10. **After proclamation (BOE 3 Nov):** re-run the candidacy parse and set `status: proclaimed`.
