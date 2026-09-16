importScripts("./version.js");

const CACHE_NAME =
  "taxi-pwa-cache-" + globalThis.TAXI_VERSION;


/* ==========================================================
   INFORMATIONS DE LA NOUVELLE VERSION
   ========================================================== */

const UPDATE_INFO = {
  version: globalThis.TAXI_VERSION,
  date: globalThis.TAXI_VERSION_DATE,
  notes: globalThis.TAXI_UPDATE_NOTES
};


/* ==========================================================
   FICHIERS DE L'APPLICATION
   ========================================================== */

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./version.js",
  "./script.js",
  "./database.js",
  "./manifest.json"
];


/* ==========================================================
   INSTALLATION

   La nouvelle version est préparée dans un nouveau cache.
   Elle attend ensuite le clic sur « Mettre à jour ».
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
    Ne pas ajouter self.skipWaiting() ici.

    La nouvelle version doit rester en attente
    jusqu'au clic sur le bouton « Mettre à jour ».
  */

});


/* ==========================================================
   MESSAGES REÇUS DE L'APPLICATION
   ========================================================== */

self.addEventListener("message", event => {

  if (!event.data) {
    return;
  }


  /* ----------------------------------------------------------
     ENVOYER LES INFORMATIONS DE LA MISE À JOUR
     ---------------------------------------------------------- */

  if (event.data.type === "GET_UPDATE_INFO") {

    if (event.source) {

      event.source.postMessage({
        type: "UPDATE_INFO",
        version: UPDATE_INFO.version,
        date: UPDATE_INFO.date,
        notes: UPDATE_INFO.notes
      });

    }

    return;
  }


  /* ----------------------------------------------------------
     CLIC SUR LE BOUTON « METTRE À JOUR »
     ---------------------------------------------------------- */

  if (event.data.type === "SKIP_WAITING") {

    self.skipWaiting();

  }

});


/* ==========================================================
   ACTIVATION DE LA NOUVELLE VERSION
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
   NAVIGATION ET FICHIERS
   ========================================================== */

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }


  /* ----------------------------------------------------------
     PAGE PRINCIPALE
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     CSS, JAVASCRIPT ET AUTRES FICHIERS
     ---------------------------------------------------------- */

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