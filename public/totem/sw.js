// Service worker mínimo do totem.
// Privacidade: NÃO guarda nada em cache (nem HTML, nem API). Só existe para o PWA ser
// instalável e para mostrar uma tela neutra quando a rede cair.

const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Espaço de Escuta</title>
<style>html,body{height:100%;margin:0;background:#f6f2ec;color:#1f2a2b;font-family:system-ui,sans-serif;
user-select:none;-webkit-user-select:none}main{height:100%;display:flex;flex-direction:column;align-items:center;
justify-content:center;text-align:center;padding:2rem;gap:1rem}h1{font-size:2rem;margin:0}p{font-size:1.25rem;
max-width:32rem;color:#5b6667}</style></head><body><main><h1>Voltamos já</h1>
<p>O totem está sem conexão no momento. Se precisar de ajuda agora, ligue para o CVV: <strong>188</strong> (24h, gratuito).</p>
</main><script>setTimeout(function(){location.reload()},30000)</script></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Limpa qualquer cache deixado por versões anteriores.
      for (const key of await caches.keys()) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
