/* Optional offline shell. Quiz loading and error recovery also work without it. */
(() => {
  'use strict';
  const status = document.getElementById('connection-status');
  let ready = false;
  let canSaveProgress = true;
  const update = () => {
    if (status) status.textContent = !canSaveProgress
      ? 'Progrés temporal · el navegador no permet desar-lo'
      : !navigator.onLine
      ? (ready ? 'Sense connexió · còpia desada' : 'Sense connexió')
      : (ready ? 'Disponible sense connexió' : 'Progrés desat en aquest navegador');
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  window.addEventListener('ajudatsm:storage-unavailable', () => {
    canSaveProgress = false;
    update();
  });
  update();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', async () => {
      try {
        await navigator.serviceWorker.register('./sw.js');
        await navigator.serviceWorker.ready;
        ready = true;
        update();
      } catch {
        // Browsing and answering questions remain available online.
      }
    });
  }
})();
