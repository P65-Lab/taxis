const C = "taxi-pwa-v1";

/* ==========================================================
   INSTALLATION
   La nouvelle version attend la validation de l'utilisateur
   ========================================================== */

self.addEventListener("install", event => {

  /* PAS de self.skipWaiting() ici */

});


/* ==========================================================
   MESSAGE : METTRE A JOUR
   ========================================================== */

self.addEventListener("message", event => {

  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {

    self.skipWaiting();

  }

});


/* ==========================================================
   ACTIVATION
   ========================================================== */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()
      .then(keys =>
        Promise.all(
          keys.map(k => caches.delete(k))
        )
      )
      .then(() =>
        self.clients.claim()
      )

  );

});


/* ==========================================================
   RESEAU EN PRIORITE
   ========================================================== */

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(

    fetch(
      event.request,
      {
        cache: "no-store"
      }
    )
    .catch(() =>
      caches.match(event.request)
    )

  );

});