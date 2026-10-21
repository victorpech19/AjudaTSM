# Comprobación de entrega · 21 de octubre de 2026

Aplicación pública: [AjudaTSM](https://victorpech19.github.io/AjudaTSM/).

## Publicación

- Repositorio público en `victorpech19/AjudaTSM`, rama `main`, GitHub Pages desde la raíz y HTTPS obligatorio.
- Despliegue inicial `4d051f0`: [ejecución de Pages completada](https://github.com/victorpech19/AjudaTSM/actions/runs/39648741370).
- Los diez recursos de la aplicación devolvieron HTTP 200 sin autenticación. Sus SHA-256 coincidieron con los archivos del commit publicado. Los textos locales se compararon normalizando CRLF a LF; los PNG, byte a byte.
- SHA-256 del banco publicado: `1c50bc8d81f58a8ae23041a587b0402ffa14e5f61d08d3f9e3871bf3bde906db`.

## Banco

- 120 identificadores únicos; 40 preguntas por tema.
- 45 adaptaciones nuevas con referencia al parcial y pregunta de origen.
- Explicación y trampa conceptual en las 120 entradas.
- JSON válido, respuestas booleanas y sin caracteres de sustitución procedentes de la codificación.
- Originales docentes y exámenes conservados fuera del repositorio público.

## Pruebas sobre la dirección pública

Comprobadas con Playwright en Chromium y WebKit:

- Respuestas verdaderas y falsas, explicación inmediata, veredicto y bloqueo de respuestas repetidas.
- Las 120 preguntas con ambas respuestas posibles, verificando explicación y trampa; además, recorrido completo mediante los botones de respuesta en ambos navegadores.
- Filtros, orden aleatorio, repaso, estadísticas, final de tanda y progreso al 100 %.
- Recarga después de responder, después de completar y con un tema seleccionado; conservación de fallos y sesión.
- Reinicio confirmado o cancelado, datos locales corruptos y almacenamiento bloqueado.
- Banco no disponible, formato inválido y recuperación mediante reintento.
- Atajos de teclado, navegación de filtros con flechas y tema claro/oscuro.
- Carga sin conexión tras instalar la copia de caché del service worker.
- Anchuras de 320, 375, 390, 768 y 1440 px, y horizontal de 844 × 390 px, sin desbordamiento horizontal.
- Axe: cero infracciones automáticas en los análisis de ambos temas y navegadores. Capturas móviles revisadas visualmente para comprobar legibilidad, cabecera y foco de la explicación.

La primera ejecución pública completó 39 pruebas y omitió el recorrido duplicado de botones en WebKit. Se habilitó ese recorrido y pasó en una ejecución adicional de 47,5 segundos. En conjunto, las 40 combinaciones de prueba y navegador quedaron ejecutadas y superadas. Las últimas modificaciones del repositorio afectan a pruebas y documentación; los recursos de la aplicación conservan los mismos bytes publicados.

## Alcance de la evidencia

Las vistas móviles se comprobaron mediante emulación de tamaño y motores de navegador. No se accedió al teléfono físico del usuario. La sesión se guarda en cada navegador; no hay sincronización de progreso entre dispositivos.
