# AjudaTSM

Pràctica interactiva del parcial de **Tecnologia i Selecció de Materials · 240151 · ETSEIB**.

**Aplicació:** [victorpech19.github.io/AjudaTSM](https://victorpech19.github.io/AjudaTSM/)

- Afirmacions vertader/fals dels temes de siderúrgia, acers i fundicions; tractaments tèrmics; alumini i solidificació.
- Explicació teòrica immediata després de respondre, amb el mecanisme físic i la confusió habitual.
- Filtres per tema, ordre aleatori o seqüencial, progrés de la tanda i repàs de les errades.
- Sessió, preferències i errades desades en aquest navegador. Les dades no se sincronitzen entre dispositius.
- Interfície adaptable a mòbil, tema clar/fosc i dreceres de teclat: V/F per respondre, espai per avançar després de llegir l'explicació.
- Còpia sense connexió després d'una primera càrrega completa amb internet.

## Fer servir al mòbil

Obre l'enllaç de l'aplicació a Safari, Chrome o un altre navegador actual. Per tenir-hi accés directe, utilitza «Afegir a la pantalla d'inici» del menú del navegador. La web funciona també sense instal·lar-la.

## Fonts i abast

Eina d'estudi independent, sense afiliació oficial a la UPC. Les afirmacions són adaptacions didàctiques i el raonament s'ha elaborat per explicar els conceptes. No representen una transcripció ni una plantilla oficial de correcció. Consulta [SOURCES.md](SOURCES.md) per a la procedència del material incorporat. Els PDF docents i els originals dels exàmens no es redistribueixen en aquest repositori.

La pràctica V/F complementa la preparació del parcial; els problemes gràfics o numèrics de CCT/Jominy requereixen treballar els seus enunciats i diagrames.

## Desenvolupament local

Aplicació estàtica, sense compilació ni serveis externs. Per servir-la des de la carpeta del projecte:

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

El banc viu a `preguntas.json`: cada registre té un identificador estable, tema, afirmació, valor lògic, explicació i paraules clau; les adaptacions d'exàmens inclouen la font i la trampa conceptual.
