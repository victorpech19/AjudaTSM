# Comprobación de entrega · V/F y opción múltiple · 21 de octubre de 2026

Aplicación pública: [AjudaTSM](https://victorpech19.github.io/AjudaTSM/).

## Publicación

- Repositorio público en `victorpech19/AjudaTSM`, rama `main`, GitHub Pages desde la raíz y HTTPS obligatorio.
- Versión con ambos formatos y temario corregido `8aebf4f`: [ejecución de Pages completada](https://github.com/victorpech19/AjudaTSM/actions/runs/39652584484).
- Los diez recursos de la aplicación devolvieron HTTP 200 sin autenticación. Sus SHA-256 coincidieron con los archivos del commit publicado. Los textos locales se compararon normalizando CRLF a LF; los PNG, byte a byte.
- SHA-256 del banco publicado: `4626ed24dd15f1c07b15b02f20e1822a62ee0249b5122f33419a0f9c2482b832`.

## Banco

- 165 identificadores únicos: 120 afirmaciones V/F y 45 preguntas de test con cuatro alternativas.
- Las 45 preguntas de test identifican fecha, pregunta y página del parcial fuente; sus claves se contrastaron con las marcas de solución disponibles.
- Explicación y trampa conceptual en las 165 entradas; las preguntas de test añaden cuatro explicaciones individuales.
- JSON válido; respuestas booleanas para V/F e índices entre 0 y 3 para el test, sin caracteres de sustitución procedentes de la codificación.
- Originales docentes y exámenes conservados fuera del repositorio público.

## Temario corregido

Clasificación contrastada con *Presentació i normatives TSM 2026-2027*, p. 3:

- Tema 1: aceros, fundiciones y tratamientos térmicos; 108 preguntas.
- Tema 2: aluminio y sus aleaciones, incluido endurecimiento por precipitación; 28 preguntas.
- Tema 3: moldeo y solidificación; 29 preguntas.

Se conservaron los identificadores y el contenido de las 120 preguntas anteriores al corregir sus metadatos temáticos. Los detalles de procedencia y adaptación constan en [SOURCES.md](SOURCES.md).

## Pruebas sobre la dirección pública

Playwright completó **56 de 56 pruebas**, sin omisiones, tanto en local como sobre la dirección pública. La ejecución pública duró 33,6 segundos, con dos trabajadores y los motores Chromium y WebKit:

- Respuestas verdaderas y falsas, explicación inmediata, veredicto y bloqueo de respuestas repetidas.
- Las 120 preguntas V/F con ambas respuestas posibles y las 45 preguntas de test con cada una de las cuatro opciones, verificando teoría, detalle de las alternativas, veredicto, fuente y bloqueo de respuestas.
- Filtros combinados de tema y formato, práctica mixta, orden aleatorio, repaso del ámbito seleccionado, estadísticas, final de tanda y progreso al 100 %.
- Recarga después de responder, después de completar y con un tema seleccionado; conservación de fallos y sesión.
- Reinicio confirmado o cancelado, datos locales corruptos y almacenamiento bloqueado.
- Banco no disponible, formato inválido y recuperación mediante reintento.
- Migración de sesiones de la versión V/F anterior: conservación de respuestas, estadísticas y fallos; reclasificación de la cola histórica de tratamientos térmicos al tema 1; incorporación de test al final de la cola.
- Atajos V/F y A–D o 1–4, navegación de filtros con flechas y tema claro/oscuro.
- Carga del modo de opción múltiple sin conexión tras instalar la copia de caché del service worker.
- Anchuras de 320, 375, 390, 768 y 1440 px, y horizontal de 844 × 390 px, sin desbordamiento horizontal.
- Axe: cero infracciones automáticas en los análisis de ambos temas y navegadores. Capturas móviles revisadas visualmente para comprobar legibilidad, cabecera y foco de la explicación.

Comando local: `npx playwright test --workers=2`. Para comprobar la publicación se utilizó el mismo comando con `BASE_URL=https://victorpech19.github.io/AjudaTSM/`. Las capturas y los resultados detallados se conservan como artefactos locales ignorados por Git. La actualización posterior de este informe no modifica los recursos de la aplicación comprobados.

## Alcance de la evidencia

Las vistas móviles se comprobaron mediante emulación de tamaño y motores de navegador. No se accedió al teléfono físico del usuario. La sesión se guarda en cada navegador; no hay sincronización de progreso entre dispositivos.
