# AjudaTSM

Pràctica interactiva del parcial de **Tecnologia i Selecció de Materials · 240151 · ETSEIB**.

**Aplicació:** [victorpech19.github.io/AjudaTSM](https://victorpech19.github.io/AjudaTSM/)

291 preguntes: 120 V/F i 171 de test. Organització segons la presentació docent de 2026-2027: **tema 1**, acers, fundicions i tractaments tèrmics; **tema 2**, alumini i aliatges; **tema 3**, emmotllament i solidificació.

- Afirmacions vertader/fals i preguntes d'opció múltiple amb entre dues i sis alternatives dels temes de siderúrgia, acers i fundicions; tractaments tèrmics; alumini i solidificació.
- Explicació teòrica immediata després de respondre, amb el mecanisme físic i la confusió habitual. Les preguntes de test expliquen també per què cada opció és correcta o incorrecta.
- Filtres per tema i format, pràctica mixta, ordre aleatori o seqüencial, progrés de la tanda i repàs de les errades del tema i format seleccionats.
- Sessió, preferències i errades desades en aquest navegador. Les dades no se sincronitzen entre dispositius.
- Interfície adaptable a mòbil, tema clar/fosc i dreceres de teclat: V/F per a les afirmacions; A–F o 1–6 per al test; espai per avançar després de llegir l'explicació.
- Còpia sense connexió després d'una primera càrrega completa amb internet.

## Fer servir al mòbil

Obre l'enllaç de l'aplicació a Safari, Chrome o un altre navegador actual. Per tenir-hi accés directe, utilitza «Afegir a la pantalla d'inici» del menú del navegador. La web funciona també sense instal·lar-la.

## Fonts i abast

Eina d'estudi independent, sense afiliació oficial a la UPC. El banc combina afirmacions adaptades i preguntes de test procedents dels parcials. Les fonts indiquen les adaptacions i el contrast amb les solucions disponibles. Les explicacions s'han elaborat per explicar els conceptes i els distractors. Consulta [SOURCES.md](SOURCES.md) per a la procedència del material incorporat. Els PDF docents i els originals dels exàmens no es redistribueixen en aquest repositori.

La pràctica de preguntes complementa la preparació del parcial; els problemes gràfics o numèrics de CCT/Jominy requereixen treballar els seus enunciats i diagrames.

## Desenvolupament local

Aplicació estàtica, sense compilació. Les tipografies (Montserrat i Open Sans) es carreguen de Google Fonts; sense connexió es fan servir les del sistema. Per servir-la des de la carpeta del projecte:

```powershell
python -m http.server 4173
```

Obre `http://localhost:4173/`. Cal un servidor HTTP: obrir `index.html` amb `file://` no permet carregar el banc JSON de manera fiable.

Per executar les comprovacions de navegador:

```powershell
npm ci
npx playwright install chromium webkit
npm test
```

## Publicació

GitHub Pages publica la branca `main` des de l'arrel. Tots els camins de recursos són relatius per funcionar sota `/AjudaTSM/`. Si es modifica el contingut de la còpia sense connexió, cal actualitzar la versió de memòria cau de `sw.js`.

El banc viu a `preguntas.json`: cada registre té un identificador estable, tema, enunciat, resposta, explicació i paraules clau. Les afirmacions tenen resposta booleana. El tipus `multiple` incorpora entre dues i sis `opciones`, una `respuesta` com a índex vàlid i una explicació individual per opció. Les preguntes procedents d’exàmens inclouen la font i la trampa conceptual.
