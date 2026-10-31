# Gaps: provinces and candidacies (as of 2026-10-31)

## Sources used
- Seats per constituency and the calendar: Real Decreto 806/2026, de 5 de octubre (BOE 6 Oct 2026, BOE-A-2026-20742), Annex and arts. 2, 4, 5.
  The 52 constituencies add up to 350. Madrid has 38 and Cádiz 8, as the decree states.
- Candidacies: "Candidaturas presentadas para las elecciones al Congreso de los Diputados y al Senado" (BOE núm. 267, 28 Oct 2026, section III, Juntas Electorales Provinciales, BOE-A-2026-22607, pp. 144124–144354).
  Parsed from the official XML (`diario_boe/xml.php?id=BOE-A-2026-22607`). All 52 provincial certificates were found, and only the "CONGRESO DE LOS DIPUTADOS" blocks were used.
  Status is `presented`. The 2023 fallback was **not** needed.

## Open uncertainties
1. **Presented, not proclaimed.** The Juntas Electorales proclaim candidacies on 2 Nov (BOE 3 Nov). Lists can still be rejected or corrected. Re-check against the proclamation and set status to `proclaimed`.
2. **Coalition membership rule used.** A party is listed when the BOE denomination is the party itself, or a coalition whose name or acronym explicitly contains the party. The party may lead the coalition or be a member of it.
   - **Canarias (Las Palmas, S.C. Tenerife):** "Unidad del Pueblo Canario UPC (NC-BC, PODEMOS, IU, SUMAR)" is led by NC-BC, which is not one of the 13 parties. Both `podemos` and `frente-amplio` are listed because of IU and Sumar. The tool should not present them as separate ballots.
   - **Comunitat Valenciana (Alicante, Castellón, Valencia):** "Compromís: Front Valencià (Compromís-EUPV-Podem-ERPV)" is mapped to `compromis` only. In parties.json, the Compromís components already include Podem and EUPV. Under a strict "belongs to" reading, Podemos (Podem) and arguably Frente Amplio (EUPV/IU) would also be listed. Choose one rule and apply it consistently.
   - **Aragón (Huesca, Zaragoza):** "Chunta Aragonesista-Frente Amplio Aragón (CHA-IU-MS-Frente Amplio)" is mapped to `frente-amplio`. In Huesca the list is headed by a CHA candidate.
   - **Baleares:** "Ara Més-Front Ampli (ARAMÉS-EU-MS)" is mapped to `frente-amplio`.
   - **Andalucía:** "Frente Amplio Andaluz (FA)" appears in Cádiz, Córdoba, Granada, Huelva and Sevilla. Its candidates are Movimiento Sumar and IU Andalucía, so it is mapped to `frente-amplio`. Almería, Jaén and Málaga carry plain "Frente Amplio (FA)".
3. **Asturias Podemos.** The list is printed as "PODEMOS (PAZ, CASA Y TRABAJO)". The acronym is unusual. It is assumed to be Podemos, but this is not confirmed.
4. **Navarra PNV.** "Geroa Bai" presents a list, but the BOE does not name its member parties. PNV is therefore **not** listed for Navarra. Confirm Geroa Bai's composition from an official source if PNV should appear.
5. **ERC outside Catalonia.** "EH Bildu-ERC" appears only in the **Senate** blocks of Álava and Bizkaia, and "ERC-EH Bildu" only in the Senate block of Tarragona. These Senate entries were not used for Congreso. ERC is listed only in the 4 Catalan provinces, where it runs alone ("Esquerra Republicana de Catalunya (ERC)"). EH Bildu is listed only in its own Congreso lists in Álava, Bizkaia, Gipuzkoa and Navarra.
6. **Notable absences, taken from the BOE as printed:**
   - No Frente Amplio list: Alicante, Castellón, Valencia (Compromís), Teruel, Ceuta, Melilla.
   - No Podemos list: Baleares, the 4 Catalan provinces, Melilla. The Valencian provinces have Podem only inside Compromís.
   - No SALF list: Bizkaia, Gipuzkoa, Cantabria, Ciudad Real, Girona, Lleida.
7. **Party name variants.** PSOE appears under provincial brands, all treated as `psoe`: PSC, PSE-EE, PSdeG, PSIB, PSN, and "Partido Socialista de Cáceres/Huelva/Santa Cruz de Tenerife (PSOE)". PP appears as "Partit Popular/Partido Popular" in Catalonia and as UPN-PP in Navarra.
8. The parsing relies on the XML structure (`centro_negrita` = Junta, `centro_cursiva` = chamber, `centro_redonda` = candidacy). The extracted denominations are kept in `candidacies.json` → `list_names`, so each mapping can be checked against the BOE text.

## Decision applied by maintainer (2026-10-31)
Single rule for all provinces: a party is listed only if it has its own list (or own regional brand) or heads the coalition. Consequences: Canarias (UPC headed by NC-BC) → Podemos and Frente Amplio NOT listed, explained in the province note; Comunitat Valenciana → Compromís only. Asturias "PODEMOS (PAZ, CASA Y TRABAJO)" kept as Podemos — re-check against the 3 Nov proclamation.
