const CACHE_NAME = "taxi-pwa-cache-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./database.js",
  "./manifest.json"
];


/* ==========================================================
   INSTALLATION
   Prépare la nouvelle version MAIS NE L'ACTIVE PAS
   ========================================================== */

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {

        for (const url of APP_FILES) {

          try {

            const response = await fetch(
              new Request(url, {
                cache: "no-store"
              })
            );

            if (response.ok) {
              await cache.put(
                url,
                response.clone()
              );
            }

          } catch (e) {
            console.error(
              "Impossible de mettre en cache :",
              url,
              e
            );
          }

        }

      })
  );

  /*
    IMPORTANT :
    PAS de self.skipWaiting() ici.
    La nouvelle version reste en attente.
  */

});


/* ==========================================================
   L'UTILISATEUR CLIQUE SUR "METTRE A JOUR"
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
          keys
            .filter(key =>
              key !== CACHE_NAME
            )
            .map(key =>
              caches.delete(key)
            )
        )
      )
      .then(() =>
        self.clients.claim()
      )

  );

});


/* ==========================================================
   NAVIGATION
   Tant que l'utilisateur n'a pas accepté la mise à jour,
   on garde l'ancienne page de l'application.
   ========================================================== */

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }


  /* PAGE PRINCIPALE */

  if (event.request.mode === "navigate") {

    event.respondWith(

      caches.match("./index.html")
        .then(cached => {

          if (cached) {
            return cached;
          }

          return fetch(event.request);

        })

    );

    return;
  }


  /* CSS / JAVASCRIPT / AUTRES FICHIERS */

  event.respondWith(

    caches.match(
      event.request,
      {
        ignoreSearch: true
      }
    )
    .then(cached => {

      if (cached) {
        return cached;
      }

      return fetch(event.request);

    })

  );

});