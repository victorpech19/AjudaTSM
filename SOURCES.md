# Fuentes del banco de preguntas

## Criterio de adaptación

Las preguntas nuevas con ID 76–120 son afirmaciones originales de verdadero/falso, redactadas a partir de conceptos examinados en los parciales indicados abajo. No reproducen literalmente los enunciados, las figuras ni las tablas de respuestas. El campo `fuente` de cada pregunta identifica examen, fecha, número y página para localizar el concepto de partida.

La respuesta y la explicación de cada adaptación son una síntesis didáctica contrastada con el temario de la asignatura; no deben interpretarse como una clave oficial de verdadero/falso. Los parciales contienen preguntas de formatos distintos, con opciones múltiples y problemas. Cuando un parcial incluye una solución, esta se usó como contexto del concepto, no como una respuesta oficial a la afirmación nueva.

## Parciales UPCommons

- UPC, *Tecnologia i Selecció de Materials*, examen parcial del 3 de noviembre de 2021. [UPCommons, handle 2117/364408](https://hdl.handle.net/2117/364408). Conceptos adaptados de las preguntas VF y problemas de siderurgia, tratamientos, selección de materiales y moldeo.
- UPC, *Tecnología y Selección de Materiales*, examen parcial del 31 de octubre de 2022. [UPCommons, handle 2117/382068](https://hdl.handle.net/2117/382068). Conceptos adaptados de las preguntas sobre afino, HSLA, martensita y bainita, templabilidad, nucleación, aleaciones de aluminio y solidificación.
- UPC, *Tecnología y Selección de Materiales*, examen parcial del 2 de noviembre de 2023. [UPCommons, handle 2117/401218](https://hdl.handle.net/2117/401218). Conceptos adaptados de las preguntas sobre alto horno, metalurgia secundaria, tratamientos térmicos, fundiciones, aluminio, moldeo y porosidad.
- UPC, *Tecnología y Selección de Materiales*, examen parcial del 3 de octubre de 2024. [UPCommons, handle 2117/420558](https://hdl.handle.net/2117/420558). Conceptos adaptados de las preguntas sobre revenido, templabilidad, inoxidables, HSLA, fundiciones, aluminio, colabilidad, siderurgia y diagramas CCT.

## Banco de opción múltiple

El banco único `preguntas.json` contiene 132 afirmaciones V/F y 124 preguntas de opción múltiple de exámenes entre 2021 y 2026. La distribución de las de opción múltiple es 79 preguntas del tema 1, 22 del tema 2 y 23 del tema 3. El 30 de octubre de 2026 se retiraron las 69 preguntas de opción múltiple de exámenes de 2020 o anteriores (1999–2014) y se añadieron las preguntas de test y V/F que faltaban de los parciales recopilados en UPCommons de 3/11/2021, 31/10/2022, 2/11/2023, 10/04/2024 y 3/10/2024 (22 de opción múltiple y 12 V/F oficiales con ID `vf-2021-11-03-NN`), omitiendo las que ya estaban en el banco. Cada pregunta identifica el examen, la fecha, el número y la página; no todos los PDF catalogados están representados. Se conserva el orden de las opciones cuando la estructura original lo permite y se reformulan algunas frases para estudio.

Las respuestas contrastadas con la cuadrícula de soluciones o las marcas de corrección del documento fuente se identifican en `baseRespuesta`. La explicación didáctica añade el razonamiento metalúrgico y las condiciones de validez; no sustituye ni amplía una clave oficial. Las preguntas adaptadas para eliminar dependencia de una figura, acotar una afirmación demasiado absoluta o reparar una opción científicamente dudosa se señalan expresamente en `fuente` y `baseRespuesta`. En las preguntas que piden la afirmación falsa o incorrecta, las explicaciones de las opciones verdaderas indican que son ciertas pero no responden a la negación del enunciado.

## Material docente contrastado

Documentos del material docente de *Tecnologia i Selecció de Materials* consultados para contrastar definiciones y mecanismos:

- *Aceros y fundiciones*.
- *Aceros y fundiciones (III): Tratamientos térmicos*.
- *Aceros y fundiciones (IV): Clasificación de los aceros*.
- *TSM Tema 1: Microestructuras, TTT y CCT*.
- *TSM Tema 2: Fundiciones de Fe*.
- *Aleaciones de aluminio*.
- *TSM Tema 3: Fundición y solidificación*.
- *Presentació i normatives TSM 2026-2027*, p. 3: orden de los temas de la primera parte.

## Organización de los temas

La clasificación sigue la presentación docente de 2026-2027, p. 3:

- Tema 1: aceros y fundiciones; extracción, estructura, tratamientos térmicos y clasificación.
- Tema 2: aleaciones ligeras; aluminio, sus aleaciones y endurecimiento por precipitación.
- Tema 3: conformado de metales por fundición; moldeo y solidificación de metales y aleaciones.

La antigua numeración de la aplicación se ha corregido en ambos formatos conservando los identificadores. Los tratamientos térmicos del acero pertenecen al tema 1; el envejecimiento del aluminio, al tema 2. Composición y modificación de aleaciones Al-Si se incluyen en aluminio, como en *Aleaciones de aluminio*, pp. 44–45; nucleación, alimentación, moldes y defectos de solidificación se incluyen en el tema 3.

## Inventario y cobertura actual

La búsqueda local reunió 62 PDF de la asignatura entre 1998 y 2026, procedentes de los registros de curso 24806 y 240151. El conjunto contiene duplicados y versiones permutadas, por lo que no equivale a 62 modelos únicos. En el catálogo y las descargas comprobadas no aparecen exámenes de 1996–1997; esto no descarta que existan copias fuera de esas fuentes.

Las 124 preguntas de opción múltiple publicadas citan 11 fechas de examen en `fuente`, entre el 31/10/2022 y el 8/01/2026. Las preguntas de test de los cinco parciales de 2021–2024 indicados arriba están completas; el resto de exámenes es una selección trazable. Ya no se incluyen preguntas de la asignatura predecesora «Tecnología de Materiales» (24806). Las fuentes y la clave oficial se distinguen pregunta por pregunta.

## Alcance y límites

El banco actual tiene 256 entradas: 132 V/F y 124 de opción múltiple. Se conservan los IDs de las 120 afirmaciones anteriores.
- Cuando la clave oficial resaltada es discutible (p. ej. una opción exagerada o un distractor también defendible), se mantiene la clave y el matiz se explica en `baseRespuesta`.
- Se corrigieron explicaciones antiguas con generalizaciones sobre cromo mínimo en inoxidables, inicio de ferrita proeutectoide, sensibilización, aceros ferríticos, dureza de martensita, diagramas CCT/TTT, microsegregación y macrosegregación, y dimensionamiento de mazarotas.
- Los valores que dependen de composición, tratamiento, geometría o medio se expresan como tendencias o se condicionan explícitamente.
- Ambos formatos se distribuyen en el mismo JSON; no se han copiado los PDF ni sus figuras al repositorio.
- No se distribuyen copias de los exámenes ni extractos extensos de sus enunciados.
