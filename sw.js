'use strict';
const CACHE = 'ajudatsm-v5-redesign';
const SHELL = ['./', './index.html', './style.css', './app.js', './preguntas.json',
  './pwa.js', './icon.svg', './icon-192.png', './icon-512.png', './manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    const response = await fetch('./preguntas.json');
    const bank = await response.json();
    const images = [...new Set(bank.flatMap(question =>
      question.imagen && typeof question.imagen.src === 'string' ? [question.imagen.src] : []
    ))].map(src => new URL(src, self.registration.scope).href);
    if (images.length) await cache.addAll(images);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('ajudatsm-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      const saved = await cache.match(event.request, { ignoreSearch: true });
      if (saved) return saved;
      if (event.request.mode === 'navigate') {
        const home = await cache.match('./index.html');
        if (home) return home;
      }
      throw error;
    }
  })());
});
