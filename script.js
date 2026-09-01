
const APP_VERSION = "v100";
const APP_VERSION_DATE = "01/09/2026";
const appVersionEl = document.getElementById("appVersion");

if (appVersionEl) {
  appVersionEl.textContent =
    `P65-Lab Taxi • ${APP_VERSION} • Mise à jour : ${APP_VERSION_DATE.split(" ")[0]}`;
}

const baseLieux = window.TAXI_DB || [];
const baseAgents = [];

const LS_LIEUX = "taxiCustomLieux";
const LS_AGENTS = "taxiCustomAgents";
const LS_LIEUX_SUPPRIMES = "taxiLieuxSupprimes";
const LS_AGENTS_SUPPRIMES = "taxiAgentsSupprimes";
const LS_DESTINATAIRES = "taxiDestinataires";
const LS_OWNER_AGENT = "taxiOwnerAgentKey";
const LS_APPEARANCE = "taxiAppearance";

function loadLocalArray(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function saveLocalArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let customLieux = loadLocalArray(LS_LIEUX);
let customAgents = loadLocalArray(LS_AGENTS);
let lieuxSupprimes = loadLocalArray(LS_LIEUX_SUPPRIMES);
let agentsSupprimes = loadLocalArray(LS_AGENTS_SUPPRIMES);
let destinataires = loadLocalArray(LS_DESTINATAIRES);
let ownerAgentKey = localStorage.getItem(LS_OWNER_AGENT) || "";
let appearance = (() => { try { return JSON.parse(localStorage.getItem(LS_APPEARANCE)) || {}; } catch { return {}; } })();

function cleLieu(x) {
  return normalizeText(
    `${x.ville}|${x.lieu}|${x.adresse}|${x.codePostal}`
  );
}

function allLieux() {
  return [...baseLieux, ...customLieux]
    .filter(x => !lieuxSupprimes.includes(cleLieu(x)));
}

function cleAgent(x) {
  return normalizeText(
    `${x.nom}|${x.matricule}|${x.telephone}|${x.email}`
  );
}

function allAgents() {
  return [...baseAgents, ...customAgents]
    .filter(a => Number(a.actif ?? 1) === 1)
    .filter(a => !agentsSupprimes.includes(cleAgent(a)));
}

const ville = document.getElementById("ville");
const villeResults = document.getElementById("villeResults");

const depart = document.getElementById("depart");
const arrivee = document.getElementById("arrivee");
const departDetail = document.getElementById("departDetail");
const arriveeDetail = document.getElementById("arriveeDetail");
const dateEl = document.getElementById("date");
const heure = document.getElementById("heure");
const dateRetour = document.getElementById("dateRetour");
const heureRetour = document.getElementById("heureRetour");
const retourBloc = document.getElementById("retourBloc");
const allerTrajet = document.getElementById("allerTrajet");
const retourTrajet = document.getElementById("retourTrajet");
const btnAllerSimple = document.getElementById("btnAllerSimple");
const btnAllerRetour = document.getElementById("btnAllerRetour");
let allerRetour = false;
const message = document.getElementById("message");
const agents = document.getElementById("agents");
const nb = document.getElementById("nb");
const apercu = document.getElementById("apercu");

let participants = 0;
let selectedAgentNames = [];
let villeSelectionnee = "";

function normalizeText(v) {
  return (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function getVilles() {
  return [...new Set(allLieux().map(x => x.ville))]
    .filter(Boolean)
    .sort((a,b) => a.localeCompare(b, "fr"));
}

function getAgentsTries() {
  return [...allAgents()]
    .sort((a,b) => a.nom.localeCompare(b.nom, "fr"));
}

/* ==========================================================
   RECHERCHE VILLES
   ========================================================== */

function showVilleResults() {

  const villes = getVilles();
  const query = normalizeText(ville.value);

  let filtered = villes;

  if (query) {
    filtered = villes.filter(v =>
      normalizeText(v).includes(query)
    );
  }

  filtered = filtered.slice(0, 10);

  if (filtered.length === 0) {
    villeResults.innerHTML =
      '<div class="agent-empty">Aucune ville trouvée</div>';
    villeResults.hidden = false;
    return;
  }

  villeResults.innerHTML = filtered.map(v => `
    <button
      type="button"
      class="ville-result"
      data-ville="${v.replace(/"/g, "&quot;")}"
    >
      <strong>${v}</strong>
    </button>
  `).join("");

  villeResults.hidden = false;

  villeResults
    .querySelectorAll(".ville-result")
    .forEach(btn => {

      btn.addEventListener("mousedown", event => {

        event.preventDefault();

        villeSelectionnee = btn.dataset.ville;
        ville.value = villeSelectionnee;
        villeResults.hidden = true;

        fillLieux();
        update();
      });
    });
}

function villeValide() {

  const n = normalizeText(ville.value);

  return getVilles().find(v =>
    normalizeText(v) === n
  ) || "";
}

ville.addEventListener("input", () => {

  const exact = villeValide();

  if (exact) {
    villeSelectionnee = exact;
  } else {
    villeSelectionnee = "";

    depart.innerHTML =
      '<option value="">Choisir d’abord une ville...</option>';

    arrivee.innerHTML =
      '<option value="">Choisir d’abord une ville...</option>';

    departDetail.textContent = "";
    arriveeDetail.textContent = "";
  }

  showVilleResults();
  update();
});

ville.addEventListener("focus", showVilleResults);

ville.addEventListener("blur", () => {
  setTimeout(() => {
    villeResults.hidden = true;
  }, 150);
});

/* ==========================================================
   LIEUX
   ========================================================== */

function lieuxVille() {

  const v = villeSelectionnee || villeValide();

  return allLieux().filter(x => x.ville === v);
}

function optionLieu(x, i) {
  return `<option value="${i}">${x.lieu}</option>`;
}

function fillLieux() {

  const items = lieuxVille();

  if (!items.length) {

    depart.innerHTML =
      '<option value="">Aucun lieu disponible</option>';

    arrivee.innerHTML =
      '<option value="">Aucun lieu disponible</option>';

    return;
  }

  depart.innerHTML =
    '<option value="">Choisir un lieu...</option>' +
    items.map(optionLieu).join("");

  arrivee.innerHTML =
    '<option value="">Choisir un lieu...</option>' +
    items.map(optionLieu).join("");

  departDetail.textContent = "";
  arriveeDetail.textContent = "";

  filtrerLieux();
}

function getLieu(sel) {

  if (sel.value === "") return null;

  return lieuxVille()[Number(sel.value)] || null;
}

function detail(x) {

  if (!x) return "";

  return `${x.adresse} — ${x.codePostal}`;
}

function filtrerLieux() {

  const items = lieuxVille();

  const departChoisi =
    depart.value === "" ? null : Number(depart.value);

  const arriveeChoisie =
    arrivee.value === "" ? null : Number(arrivee.value);

  const valeurDepartActuelle = depart.value;
  const valeurArriveeActuelle = arrivee.value;

  depart.innerHTML =
    '<option value="">Choisir un lieu...</option>' +
    items.map((x, i) => {
      if (
        arriveeChoisie !== null &&
        i === arriveeChoisie
      ) {
        return "";
      }

      return `<option value="${i}">${x.lieu}</option>`;
    }).join("");

  arrivee.innerHTML =
    '<option value="">Choisir un lieu...</option>' +
    items.map((x, i) => {
      if (
        departChoisi !== null &&
        i === departChoisi
      ) {
        return "";
      }

      return `<option value="${i}">${x.lieu}</option>`;
    }).join("");

  if (
    valeurDepartActuelle !== "" &&
    depart.querySelector(
      `option[value="${valeurDepartActuelle}"]`
    )
  ) {
    depart.value = valeurDepartActuelle;
  }

  if (
    valeurArriveeActuelle !== "" &&
    arrivee.querySelector(
      `option[value="${valeurArriveeActuelle}"]`
    )
  ) {
    arrivee.value = valeurArriveeActuelle;
  }

  update();
}

/* ==========================================================
   AGENTS
   ========================================================== */

function findAgentExact(name) {

  const n = normalizeText(name);

  if (!n) return null;

  return getAgentsTries().find(a =>
    normalizeText(a.nom) === n
  ) || null;
}

function renderAgents() {

  const selection = selectedAgentNames
    .map(name => findAgentExact(name))
    .filter(Boolean);

  selectedAgentNames = selection.map(a => a.nom);
  participants = selection.length;

  // Zone technique invisible utilisée par les fonctions existantes.
  agents.innerHTML = selection.map((ag, i) => `
    <input
      type="hidden"
      id="agent${i + 1}"
      class="agent-search"
      value="${ag.nom.replace(/"/g, "&quot;")}"
      data-agent-name="${ag.nom.replace(/"/g, "&quot;")}"
    >
  `).join("");

  nb.textContent = String(participants);

  const badge =
    document.getElementById("agentsCountBadge");

  const summary =
    document.getElementById("agentsSelectedSummary");

  if (badge) {
    badge.textContent =
      participants === 0
        ? "0 sélectionné"
        : `${participants} sélectionné${participants > 1 ? "s" : ""}`;
  }

  if (summary) {

    if (!selection.length) {
      summary.hidden = true;
      summary.innerHTML = "";
    } else {
      summary.hidden = false;
      summary.innerHTML = selection.map(ag => `
        <div class="selected-agent-row">
          <div class="selected-agent-main">
            <strong>${ag.nom}</strong>
            ${ag.telephone ? `<span>${ag.telephone}</span>` : ""}
          </div>
          ${ag.email ? `<div class="selected-agent-email">${ag.email}</div>` : ""}
        </div>
      `).join("");
    }
  }

  update();
}

function showAgentResults(input, results) {

  const query = normalizeText(input.value);

  let filtered = getAgentsTries();

  if (query) {
    filtered = filtered.filter(a =>
      normalizeText(a.nom).includes(query)
    );
  }

  const dejaChoisis = [
    ...agents.querySelectorAll(".agent-search")
  ]
    .filter(x => x !== input)
    .map(x => findAgentExact(x.value))
    .filter(Boolean)
    .map(x => normalizeText(x.nom));

  filtered = filtered.filter(a =>
    !dejaChoisis.includes(normalizeText(a.nom))
  );

  filtered = filtered.slice(0, 8);

  if (filtered.length === 0) {

    results.innerHTML =
      '<div class="agent-empty">Aucun agent trouvé</div>';

    results.hidden = false;
    return;
  }

  results.innerHTML = filtered.map(a => `
    <button
      type="button"
      class="agent-result"
      data-name="${a.nom.replace(/"/g, "&quot;")}"
    >
      <strong>${a.nom}</strong>
      <span>${a.telephone || ""}</span>
    </button>
  `).join("");

  results.hidden = false;

  results
    .querySelectorAll(".agent-result")
    .forEach(btn => {

      btn.addEventListener("mousedown", event => {

        event.preventDefault();

        const agChoisi = findAgentExact(btn.dataset.name);
        input.dataset.agentName = btn.dataset.name;
        input.dataset.agentName = btn.dataset.name;
        input.value = btn.dataset.name;
        results.hidden = true;

        agents.querySelectorAll(".agent-results")
          .forEach(r => r.hidden = true);

        update();
      });
    });
}

function selectedAgents() {
  return selectedAgentNames
    .map(name => findAgentExact(name))
    .filter(Boolean);
}

/* ==========================================================
   APERCU
   ========================================================== */

function frDate(v) {

  if (!v) return "";

  const d = new Date(v + "T12:00:00");

  return d.toLocaleDateString("fr-FR");
}

function update() {

  const d = getLieu(depart);
  const a = getLieu(arrivee);

  departDetail.textContent = detail(d);
  arriveeDetail.textContent = detail(a);

  selectedAgents().forEach((ag, i) => {

    const el =
      document.getElementById(
        `agentDetail${i + 1}`
      );

    const input =
      document.getElementById(
        `agent${i + 1}`
      );

    if (!el || !input) return;

    const wrap =
      input.closest(".search-wrap");

    if (ag) {

      // Affichage agent épuré.
      input.dataset.agentName = ag.nom;
      input.value = ag.nom;

      if (wrap) {

        let telInline =
          wrap.querySelector(".agent-phone-inline");

        if (!telInline) {
          telInline =
            document.createElement("div");

          telInline.className =
            "agent-phone-inline";

          wrap.appendChild(telInline);
        }

        telInline.textContent =
          ag.telephone || "";

        telInline.hidden =
          !ag.telephone;
      }

      el.innerHTML =
        ag.email
          ? `<span class="agent-email">${ag.email}</span>`
          : "";

    } else {

      if (wrap) {
        const telInline =
          wrap.querySelector(".agent-phone-inline");

        if (telInline) {
          telInline.textContent = "";
          telInline.hidden = true;
        }
      }

      el.textContent = "";
    }
  });

  const noms = selectedAgents()
    .filter(Boolean)
    .map(x => x.nom);

 if (allerTrajet) {

  const trajetTexte =
    allerTrajet.querySelector(".trajet-texte");

  if (d && a) {

    if (trajetTexte) {
      trajetTexte.textContent =
        `${d.lieu} → ${a.lieu}`;
    }

    allerTrajet.hidden = false;

  } else {

    if (trajetTexte) {
      trajetTexte.textContent = "";
    }

    allerTrajet.hidden = true;

  }

}

if (retourTrajet) {

  const trajetTexteRetour =
    retourTrajet.querySelector(".trajet-texte");

  if (allerRetour && d && a) {

    if (trajetTexteRetour) {
      trajetTexteRetour.textContent =
        `${a.lieu} → ${d.lieu}`;
    }

    retourTrajet.hidden = false;

  } else {

    if (trajetTexteRetour) {
      trajetTexteRetour.textContent = "";
    }

    retourTrajet.hidden = true;

  }

}

  apercu.innerHTML = `
    <div class="previewrow">
      <span>Ville</span>
      <strong>${villeSelectionnee || ville.value || "—"}</strong>
    </div>

    <div class="previewrow">
      <span>Aller</span>
      <strong>
        ${d && a ? `${d.lieu} → ${a.lieu}` : "—"}<br>
        ${frDate(dateEl.value) || "—"}
        ${heure.value ? " à " + heure.value : ""}
      </strong>
    </div>

    ${allerRetour ? `
    <div class="previewrow retour-preview">
      <span>Retour</span>
      <strong>
        ${d && a ? `${a.lieu} → ${d.lieu}` : "—"}<br>
        ${frDate(dateRetour.value) || "—"}
        ${heureRetour.value ? " à " + heureRetour.value : ""}
      </strong>
    </div>` : ""}

    <div class="previewrow">
      <span>Agents</span>
      <strong>
        ${noms.length
          ? noms.join(", ")
          : participants + " participant(s)"
        }
      </strong>
    </div>
  `;
}



/* ==========================================================
   v87 - DATE RETOUR STRICTEMENT APRES LA DATE ALLER
   ========================================================== */

function lendemainISO(dateISO) {

  if (!dateISO) return "";

  const d =
    new Date(
      dateISO + "T12:00:00"
    );

  d.setDate(
    d.getDate() + 1
  );

  const y =
    d.getFullYear();

  const m =
    String(
      d.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      d.getDate()
    ).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function appliquerMinDateRetour() {

  if (!dateRetour) return;

  if (!dateEl.value) {

    dateRetour.removeAttribute(
      "min"
    );

    return;
  }

  const minRetour =
    lendemainISO(
      dateEl.value
    );

  dateRetour.min =
    minRetour;

  // Si une ancienne date retour est devenue invalide,
  // on la vide automatiquement.
  if (
    dateRetour.value &&
    dateRetour.value < minRetour
  ) {
    dateRetour.value = "";
  }
}

/* ==========================================================
   ALLER / RETOUR
   ========================================================== */

function setAllerRetour(value) {
  allerRetour = value;
  retourBloc.hidden = !value;
  btnAllerSimple.classList.toggle("active", !value);
  btnAllerRetour.classList.toggle("active", value);
  dateRetour.required = value;
  heureRetour.required = value;

  if (value) {
    appliquerMinDateRetour();
  }

  if (!value) {
    dateRetour.value = "";
    heureRetour.value = "";
  }
  update();
}

btnAllerSimple.addEventListener("click", () => setAllerRetour(false));
btnAllerRetour.addEventListener("click", () => setAllerRetour(true));
dateRetour.addEventListener("input", update);

dateEl.addEventListener(
  "change",
  () => {

    appliquerMinDateRetour();

    if (allerRetour && dateEl.value) {
      dateRetour.value =
        lendemainISO(dateEl.value);
    }

    update();
  }
);

dateEl.addEventListener(
  "input",
  () => {
    appliquerMinDateRetour();
  }
);

dateRetour.addEventListener(
  "change",
  () => {

    appliquerMinDateRetour();

    if (
      dateEl.value &&
      dateRetour.value &&
      dateRetour.value <
        lendemainISO(dateEl.value)
    ) {

      alert(
        "La date de retour doit être postérieure à la date de l’aller."
      );

      dateRetour.value = "";
    }

    update();
  }
);

heureRetour.addEventListener("input", update);

/* ==========================================================
   PARTICIPANTS - SELECTION PAR POPUP
   ========================================================== */



/* ==========================================================
   PARTICIPANTS - POPUP AGENTS
   ========================================================== */

let agentsPickerDraft = new Set();

function rendreListeAgentsPicker() {

  const listEl =
    document.getElementById("agentsPickerList");

  const searchEl =
    document.getElementById("agentsPickerSearch");

  if (!listEl) return;

  const query =
    normalizeText(
      searchEl?.value || ""
    );

  let liste =
    getAgentsTries();

  if (query) {
    liste = liste.filter(ag =>
      normalizeText(ag.nom).includes(query) ||
      normalizeText(ag.telephone || "").includes(query)
    );
  }

  listEl.innerHTML =
    liste.map((ag, index) => {

      const key =
        normalizeText(ag.nom);

      const coche =
        agentsPickerDraft.has(key);

      const id =
        `agentPick${index}`;

      return `
        <label
          class="agent-check-row ${coche ? "checked" : ""}"
          for="${id}"
        >
          <input
            type="checkbox"
            id="${id}"
            data-agent-picker-name="${ag.nom.replace(/"/g, "&quot;")}"
            ${coche ? "checked" : ""}
          >

          <span class="agent-check-box"></span>

          <span class="agent-check-content">
            <strong>${ag.nom}</strong>
            ${ag.telephone
              ? `<span>${ag.telephone}</span>`
              : ""}
          </span>
        </label>
      `;
    }).join("");

  listEl
    .querySelectorAll("[data-agent-picker-name]")
    .forEach(input => {

      input.addEventListener(
        "change",
        () => {

          const key =
            normalizeText(
              input.dataset.agentPickerName
            );

          if (input.checked) {
            agentsPickerDraft.add(key);
          } else {
            agentsPickerDraft.delete(key);
          }

          input
            .closest(".agent-check-row")
            ?.classList.toggle(
              "checked",
              input.checked
            );
        }
      );
    });
}

function ouvrirAgentsPicker() {

  const overlay =
    document.getElementById("agentsPickerOverlay");

  const search =
    document.getElementById("agentsPickerSearch");

  if (!overlay) {
    alert("Le sélecteur d’agents est indisponible.");
    return;
  }

  agentsPickerDraft =
    new Set(
      selectedAgentNames.map(
        normalizeText
      )
    );

  if (search) {
    search.value = "";
  }

  rendreListeAgentsPicker();

  overlay.hidden = false;
  overlay.style.display = "flex";

  document.body.classList.add(
    "agents-picker-open"
  );
}

function fermerAgentsPicker() {

  const overlay =
    document.getElementById("agentsPickerOverlay");

  if (overlay) {
    overlay.hidden = true;
    overlay.style.display = "none";
  }

  document.body.classList.remove(
    "agents-picker-open"
  );
}

function initialiserPopupAgents() {

  const chooseBtn =
    document.getElementById("chooseAgentsBtn");

  const search =
    document.getElementById("agentsPickerSearch");

  const validateBtn =
    document.getElementById("validateAgentsPicker");

  const cancelBtn =
    document.getElementById("cancelAgentsPicker");

  const closeBtn =
    document.getElementById("closeAgentsPicker");

  const overlay =
    document.getElementById("agentsPickerOverlay");

  if (chooseBtn) {
    chooseBtn.onclick =
      ouvrirAgentsPicker;
  }

  if (search) {
    search.oninput =
      rendreListeAgentsPicker;
  }

  if (cancelBtn) {
    cancelBtn.onclick =
      fermerAgentsPicker;
  }

  if (closeBtn) {
    closeBtn.onclick =
      fermerAgentsPicker;
  }

  if (validateBtn) {

    validateBtn.onclick = () => {

      selectedAgentNames =
        getAgentsTries()
          .filter(ag =>
            agentsPickerDraft.has(
              normalizeText(ag.nom)
            )
          )
          .map(ag => ag.nom);

      renderAgents();
      fermerAgentsPicker();
    };
  }

  if (overlay) {

    overlay.onclick = e => {

      if (e.target === overlay) {
        fermerAgentsPicker();
      }
    };
  }

  // Etat initial
  renderAgents();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialiserPopupAgents,
    { once:true }
  );
} else {
  initialiserPopupAgents();
}

/* ==========================================================
   EVENEMENTS
   ========================================================== */

[
  depart,
  arrivee,
  dateEl,
  heure,
  message
].forEach(x =>
  x.addEventListener("input", update)
);

depart.addEventListener("change", filtrerLieux);
arrivee.addEventListener("change", filtrerLieux);




/* ==========================================================
   EFFACER LA DEMANDE - VERSION ROBUSTE
   ========================================================== */

window.effacerDemande = function effacerDemande() {

  // Nettoyer d'abord les agents existants pour empêcher
  // renderAgents() de recopier leurs anciennes valeurs.
  document
    .querySelectorAll(".agent-search")
    .forEach(input => {
      input.value = "";
    });

  const form = document.getElementById("form");

  if (form) {
    HTMLFormElement.prototype.reset.call(form);
  }

  // Ville
  villeSelectionnee = "";
  ville.value = "";

  if (villeResults) {
    villeResults.hidden = true;
    villeResults.innerHTML = "";
  }

  // Départ / arrivée
  depart.innerHTML =
    '<option value="">Choisir d’abord une ville...</option>';

  arrivee.innerHTML =
    '<option value="">Choisir d’abord une ville...</option>';

  depart.value = "";
  arrivee.value = "";

  departDetail.textContent = "";
  arriveeDetail.textContent = "";

 // Dates et heures
dateEl.value = "";
heure.value = "";

dateRetour.value = "";
heureRetour.value = "";

// Conserver le mode actuel ALLER SIMPLE / ALLER-RETOUR
retourBloc.hidden = !allerRetour;

btnAllerSimple.classList.toggle("active", !allerRetour);
btnAllerRetour.classList.toggle("active", allerRetour);

dateRetour.required = allerRetour;
heureRetour.required = allerRetour;
// Trajets

if (allerTrajet) {

  const trajetTexte =
    allerTrajet.querySelector(".trajet-texte");

  if (trajetTexte) {
    trajetTexte.textContent = "";
  }

  allerTrajet.hidden = true;
}

if (retourTrajet) {

  const trajetTexteRetour =
    retourTrajet.querySelector(".trajet-texte");

  if (trajetTexteRetour) {
    trajetTexteRetour.textContent = "";
  }

  retourTrajet.hidden = true;
}

  // Agents : vider la sélection du popup.
  selectedAgentNames = [];
  participants = 0;
  agents.innerHTML = "";
  renderAgents();

  // Message
  message.value = "";

  // Recalcul affichage / aperçu
  update();

  // Fermer les éventuels résultats de recherche encore ouverts
  document
    .querySelectorAll(".agent-results")
    .forEach(el => {
      el.hidden = true;
      el.innerHTML = "";
    });

  // Retour en haut
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};
const resetBtn =
  document.getElementById("reset");

if (resetBtn) {
  resetBtn.addEventListener(
    "click",
    window.effacerDemande
  );
}

/* ==========================================================
   ENVOI EMAIL
   ========================================================== */

document
  .getElementById("form")
  .addEventListener("submit", e => {

    e.preventDefault();

    const villeExacte =
      villeSelectionnee || villeValide();

    const d = getLieu(depart);
    const a = getLieu(arrivee);
    const selected = selectedAgents();

    if (
      !villeExacte ||
      !d ||
      !a ||
      !dateEl.value ||
      !heure.value
    ) {
      alert(
        "Merci de sélectionner une ville dans les résultats, " +
        "puis le départ, l’arrivée, la date et l’heure."
      );
      return;
    }

    if (
      allerRetour &&
      (!dateRetour.value || !heureRetour.value)
    ) {
      alert("Merci de renseigner la date et l’heure du retour.");
      return;
    }

    if (
      allerRetour &&
      dateRetour.value < dateEl.value
    ) {
      alert("La date du retour ne peut pas être avant la date de l’aller.");
      return;
    }

    if (
      allerRetour &&
      dateRetour.value === dateEl.value &&
      heureRetour.value <= heure.value
    ) {
      alert("Pour un retour le même jour, l’heure du retour doit être après l’heure de l’aller.");
      return;
    }

    if (depart.value === arrivee.value) {
      alert(
        "Le lieu de départ et le lieu d’arrivée " +
        "doivent être différents."
      );
      return;
    }

    if (!selected.length) {
      alert(
        "Merci de sélectionner au moins un agent."
      );
      return;
    }

    const nomsSelectionnes = selected.map(x =>
      normalizeText(x.nom)
    );

    if (
      new Set(nomsSelectionnes).size !==
      nomsSelectionnes.length
    ) {
      alert(
        "Un même agent ne peut pas être sélectionné " +
        "plusieurs fois."
      );
      return;
    }

    const lignesMail = [
      "Bonjour,",
      "",
      "Je souhaite effectuer une demande de taxi.",
      "",
      `VILLE : ${villeExacte}`,
      allerRetour ? "ALLER / RETOUR" : "ALLER",
      "",
      `DÉPART : ${d.lieu}`,
      `${d.adresse}    ${d.codePostal}`,
      "",
      `ARRIVÉE : ${a.lieu}`,
      `${a.adresse}    ${a.codePostal}`,
      "",
      `DATE : ${frDate(dateEl.value)}`,
      `HEURE : ${heure.value}`,
      ""
    ];

    if (allerRetour) {
      lignesMail.push(
        "RETOUR",
        "",
        `DÉPART : ${a.lieu}`,
        `${a.adresse}    ${a.codePostal}`,
        "",
        `ARRIVÉE : ${d.lieu}`,
        `${d.adresse}    ${d.codePostal}`,
        "",
        `DATE : ${frDate(dateRetour.value)}`,
        `HEURE : ${heureRetour.value}`,
        ""
      );
    }

    lignesMail.push(
      `${participants} ${participants > 1 ? "AGENTS" : "AGENT"}`,
      ""
    );

    selected.forEach((ag, i) => {

      const tel =
        ag.telephone
          ? ` - ${ag.telephone}`
          : "";

      lignesMail.push(
        `${i + 1}. ${ag.nom}${tel}`
      );
    });

    const texteMessage = message.value.trim();

    if (texteMessage) {
      lignesMail.push(
        "",
        "MESSAGE",
        texteMessage
      );
    }

    lignesMail.push(
      "",
      "Merci."
    );

    const corps = lignesMail.join("\n");

    const sujet =
      encodeURIComponent(
        `Demande de taxi${allerRetour ? " A/R" : ""} - ${villeExacte} - ` +
        `${frDate(dateEl.value)}`
      );

    const corpsEncode = encodeURIComponent(corps);

    // Ouvre directement Outlook sur iPhone/iPad.
    // Si Outlook n'est pas disponible, on bascule vers l'application
    // e-mail par défaut après un court délai.
    const emailDestinataire =
      destinataires.length ? destinataires[0].email.trim() : "";

    const emailsAgentsCC = selected
      .filter(ag => ag && !estProprietaireTelephone(ag))
      .map(ag => (ag.email || "").trim())
      .filter(Boolean);
    const ccUnique = [...new Set(emailsAgentsCC)];
    const ccEncode = encodeURIComponent(ccUnique.join(","));

    const ua = navigator.userAgent || "";

const estIOS =
  /iPhone|iPad|iPod/i.test(ua) ||
  (
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1
  );

const estAndroid =
  /Android/i.test(ua);

const outlookUrl =
  `ms-outlook://compose?to=${encodeURIComponent(emailDestinataire)}` +
  `${ccUnique.length ? "&cc=" + ccEncode : ""}` +
  `&subject=${sujet}` +
  `&body=${corpsEncode}`;

const mailtoUrl =
  `mailto:${encodeURIComponent(emailDestinataire)}` +
  `?${ccUnique.length ? "cc=" + ccEncode + "&" : ""}` +
  `subject=${sujet}` +
  `&body=${corpsEncode}`;


/* ==========================================================
   ANDROID
   ========================================================== */

if (estAndroid) {
  window.location.href = mailtoUrl;
  return;
}


/* ==========================================================
   IPHONE / IPAD
   ========================================================== */

if (estIOS) {

  let pageMasquee = false;

  const detecterSortie = () => {
    if (document.visibilityState === "hidden") {
      pageMasquee = true;
    }
  };

  document.addEventListener(
    "visibilitychange",
    detecterSortie,
    { once: true }
  );

  window.location.href = outlookUrl;

  setTimeout(() => {
    if (
      !pageMasquee &&
      document.visibilityState === "visible"
    ) {
      window.location.href = mailtoUrl;
    }
  }, 1200);

  return;
}


/* ==========================================================
   AUTRES APPAREILS / PC
   ========================================================== */


window.location.href = mailtoUrl;

});


/* ==========================================================
   APERCU HTML DU MAIL TAXI
   ========================================================== */

function construireMailTaxiHtml() {
  const villeExacte = villeSelectionnee || villeValide();
  const d = getLieu(depart);
  const a = getLieu(arrivee);
  const selected = selectedAgents();

  if (!villeExacte || !d || !a || !dateEl.value || !heure.value) {
    alert("Complétez d’abord la demande de taxi.");
    return null;
  }

  const esc = v => String(v || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");

  const trajetAller = `
    <tr><th>Départ</th><td><strong>${esc(d.lieu)}</strong><br>${esc(d.adresse)} ${esc(d.codePostal)}</td></tr>
    <tr><th>Arrivée</th><td><strong>${esc(a.lieu)}</strong><br>${esc(a.adresse)} ${esc(a.codePostal)}</td></tr>
    <tr><th>Date</th><td>${esc(frDate(dateEl.value))}</td></tr>
    <tr><th>Heure</th><td>${esc(heure.value)}</td></tr>`;

  const trajetRetour = allerRetour ? `
    <tr><td colspan="2" class="section">RETOUR</td></tr>
    <tr><th>Départ</th><td><strong>${esc(a.lieu)}</strong><br>${esc(a.adresse)} ${esc(a.codePostal)}</td></tr>
    <tr><th>Arrivée</th><td><strong>${esc(d.lieu)}</strong><br>${esc(d.adresse)} ${esc(d.codePostal)}</td></tr>
    <tr><th>Date</th><td>${esc(frDate(dateRetour.value))}</td></tr>
    <tr><th>Heure</th><td>${esc(heureRetour.value)}</td></tr>` : "";

  const agentsHtml = selected.map((ag,i) => `
    <tr>
      <th>Agent ${i+1}</th>
      <td><strong>${esc(ag.nom)}</strong>${ag.telephone ? `<br>${esc(ag.telephone)}` : ""}</td>
    </tr>`).join("");

  const msg = message.value.trim();
  const messageHtml = msg ? `
    <tr><td colspan="2" class="section">MESSAGE</td></tr>
    <tr><td colspan="2">${esc(msg).replace(/\n/g,"<br>")}</td></tr>` : "";

  const corps = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:760px">
      <p>Bonjour,</p>
      <p>Je souhaite effectuer une demande de taxi.</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #94a3b8">
        <tr><td colspan="2" style="padding:12px;background:#eaf2ff;font-size:18px;font-weight:800;text-align:center">${esc(villeExacte)}</td></tr>
        <tr><td colspan="2" class="section" style="padding:9px;background:#f1f5f9;font-weight:800">ALLER</td></tr>
        ${trajetAller}
        ${trajetRetour}
        <tr><td colspan="2" class="section" style="padding:9px;background:#f1f5f9;font-weight:800">${participants} ${participants > 1 ? "AGENTS" : "AGENT"}</td></tr>
        ${agentsHtml}
        ${messageHtml}
      </table>
      <p>Merci.</p>
    </div>`;

  return {
    html: corps,
    sujet: `Demande de taxi${allerRetour ? " A/R" : ""} - ${villeExacte} - ${frDate(dateEl.value)}`,
    to: destinataires.length ? destinataires[0].email.trim() : ""
  };
}

function ouvrirApercuMailTaxiHtml() {

  const page =
    window.open(
      "",
      "_blank"
    );

  if (!page) {
    alert(
      "L’aperçu a été bloqué par le navigateur. Autorisez les fenêtres surgissantes pour cette PWA."
    );
    return;
  }

  const mail =
    construireMailTaxiHtml();

  if (!mail) {
    page.close();
    return;
  }

  page.document.open();

  page.document.write(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aperçu mail Taxi</title>

<style>
body{
  margin:0;
  padding:20px;
  background:#f3f4f6;
  font-family:Arial,Helvetica,sans-serif;
  color:#111827;
}

.toolbar{
  position:sticky;
  top:0;
  z-index:20;
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin:-20px -20px 18px;
  padding:12px 20px;
  background:#fff;
  border-bottom:1px solid #d1d5db;
}

.toolbar button{
  min-height:44px;
  padding:10px 16px;
  border:0;
  border-radius:10px;
  font-weight:800;
}

#copyRenderedBtn{
  background:#111827;
  color:#fff;
}

#openOutlookBtn{
  background:#2563eb;
  color:#fff;
}

#closePreviewBtn{
  background:#e5e7eb;
  color:#111827;
}

.help{
  width:100%;
  margin:0;
  color:#667085;
  font-size:13px;
}

#mailRendered{
  max-width:800px;
  margin:auto;
  padding:24px;
  background:#fff;
  border-radius:12px;
}

#mailRendered th,
#mailRendered td{
  border:1px solid #94a3b8;
  padding:10px;
  text-align:left;
}

#mailRendered th{
  width:125px;
  background:#f8fafc;
}

@media(max-width:700px){

  body{
    padding:10px;
  }

  .toolbar{
    margin:-10px -10px 12px;
    padding:10px;
  }

  #mailRendered{
    padding:12px;
    overflow-x:auto;
  }
}
</style>

</head>

<body>

<div class="toolbar">

  <button id="copyRenderedBtn">
    Copier la présentation
  </button>

  <button id="openOutlookBtn">
    Ouvrir Outlook
  </button>

  <button id="closePreviewBtn">
    Fermer
  </button>

  <p class="help">
    Copier la présentation → Ouvrir Outlook → Coller dans le corps du mail.
  </p>

</div>

<div id="mailRendered">
  ${mail.html}
</div>

<script>
(function(){

  const sujet =
    ${JSON.stringify(mail.sujet)};

  const to =
    ${JSON.stringify(mail.to)};

  document
    .getElementById("copyRenderedBtn")
    .onclick = function(){

      const zone =
        document.getElementById("mailRendered");

      const range =
        document.createRange();

      range.selectNodeContents(zone);

      const sel =
        window.getSelection();

      sel.removeAllRanges();
      sel.addRange(range);

      let ok = false;

      try {
        ok =
          document.execCommand("copy");
      } catch(e) {}

      sel.removeAllRanges();

      alert(
        ok
          ? "Présentation copiée. Ouvrez Outlook puis collez."
          : "Sélectionnez la présentation puis copiez-la."
      );
    };


  document
    .getElementById("closePreviewBtn")
    .onclick = function(){

      window.close();

    };


  document
    .getElementById("openOutlookBtn")
    .onclick = function(){

      const outlook =
        "ms-outlook://compose?to=" +
        encodeURIComponent(to) +
        "&subject=" +
        encodeURIComponent(sujet);

      const mailto =
        "mailto:" +
        encodeURIComponent(to) +
        "?subject=" +
        encodeURIComponent(sujet);

      location.href =
        outlook;

      setTimeout(function(){

        location.href =
          mailto;

      },1200);

    };

})();
<\/script>

</body>
</html>`);

  page.document.close();

}
/* ==========================================================
   SMS AUX AGENTS
   ========================================================== */

function nettoyerNumeroTel(numero) {
  return (numero || "")
    .replace(/[^\d+]/g, "")
    .trim();
}

function normaliserNumeroSMS(numero) {

  let n = nettoyerNumeroTel(numero);

  if (!n) return "";

  // France : 06XXXXXXXX / 07XXXXXXXX / etc. -> +336XXXXXXXX
  if (/^0\d{9}$/.test(n)) {
    n = "+33" + n.substring(1);
  }

  // 33XXXXXXXXX -> +33XXXXXXXXX
  if (/^33\d{9}$/.test(n)) {
    n = "+" + n;
  }

  return n;
}

function construireMessageSMS(villeExacte, d, a) {

  const separation = "----------------";

  const lignes = [
    "🚕 DEMANDE DE TAXI",
    `📍 ${villeExacte}`,
    separation,
    "➡️ ALLER",
    `${d.lieu} → ${a.lieu}`,
    `📅 ${frDate(dateEl.value)}`,
    `🕐 ${heure.value}`
  ];

  if (allerRetour) {
    lignes.push(
      "",
      "⬅️ RETOUR",
      `${a.lieu} → ${d.lieu}`,
      `📅 ${frDate(dateRetour.value)}`,
      `🕐 ${heureRetour.value}`
    );
  }

  const texteMessage = message.value.trim();

  if (texteMessage) {
    lignes.push(
      "",
      "💬 MESSAGE",
      texteMessage
    );
  }

  lignes.push(
    "",
    separation
  );

  return lignes.join("\n");
}

function ouvrirSMS(numeros, texte) {

  const ua = navigator.userAgent || "";

  const estIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1
    );

  const estAndroid =
    /Android/i.test(ua);

  /* ========================================================
     TEST IPHONE -> RACCOURCI APPLE
     ======================================================== */

 if (estIOS) {

  /* -----------------------------------------------
     TEST : PREMIER NUMERO + VRAI MESSAGE TAXI
     ----------------------------------------------- */

  const propres = [
    ...new Set(
      (numeros || [])
        .map(normaliserNumeroSMS)
        .filter(Boolean)
    )
  ];

  if (!propres.length) {
    alert("Aucun numéro de téléphone disponible.");
    return;
  }

  // Pour le premier test : UN SEUL numéro
  const numeroTest = propres[0];

  /*
     Données envoyées au raccourci :
     numéro + séparateur + message Taxi
  */

  const entreeRaccourci =
    numeroTest +
    "|||SMS_TAXI|||" +
    (texte || "");

  const urlRaccourci =
    "shortcuts://run-shortcut" +
    "?name=" +
    encodeURIComponent("SMS taxi") +
    "&input=text" +
    "&text=" +
    encodeURIComponent(entreeRaccourci);

  window.location.href = urlRaccourci;

  return;
}

  /* ========================================================
     ANDROID -> ON GARDE LE SMS GROUPE ACTUEL
     ======================================================== */

  const propres = [
    ...new Set(
      (numeros || [])
        .map(normaliserNumeroSMS)
        .filter(Boolean)
    )
  ];

  if (!propres.length) {
    alert("Aucun numéro de téléphone disponible.");
    return;
  }

  const corps =
    encodeURIComponent(
      texte || ""
    );

  let lienSMS;

  if (estAndroid) {

    const destinataires =
      propres.join(";");

    lienSMS =
      `sms:${destinataires}?body=${corps}`;

  } else {

    const destinataires =
      propres.join(",");

    lienSMS =
      `sms:${destinataires}?body=${corps}`;
  }

  window.location.href =
    lienSMS;
}
/* ==========================================================
   BASE AGENTS PRIVEE
   ========================================================== */
const importAgentsFile = document.getElementById("importAgentsFile");
const importAgentsBtn = document.getElementById("importAgentsBtn");
const exportAgentsBtn = document.getElementById("exportAgentsBtn");
const privateAgentsStatus = document.getElementById("privateAgentsStatus");

function updatePrivateAgentsStatus() {
  if (!privateAgentsStatus) return;
  privateAgentsStatus.textContent = customAgents.length
    ? `${customAgents.length} agent(s) stocké(s) uniquement sur cet appareil.`
    : "Aucune base privée importée.";
}

if (importAgentsBtn && importAgentsFile) {
  importAgentsBtn.addEventListener("click", () => importAgentsFile.click());
  importAgentsFile.addEventListener("change", async () => {
    const file = importAgentsFile.files && importAgentsFile.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error("Le fichier n'est pas une liste d'agents.");
      const nettoyes = data.map(a => ({
        nom: String(a.nom || "").trim().toUpperCase(),
        matricule: String(a.matricule || "---").trim() || "---",
        telephone: String(a.telephone || "").trim(),
        actif: Number(a.actif ?? 1),
        email: String(a.email || "").trim()
      })).filter(a => a.nom);
      const uniques = new Map();
      nettoyes.forEach(a => uniques.set(normalizeText(a.nom), a));
      customAgents = [...uniques.values()];
      saveLocalArray(LS_AGENTS, customAgents);
      renderAdminAgents();
      renderAgents();
      updatePrivateAgentsStatus();
      alert(`${customAgents.length} agent(s) importé(s) sur cet appareil.`);
    } catch (e) {
      alert("Import impossible : " + (e.message || "fichier invalide"));
    }
    importAgentsFile.value = "";
  });
}

if (exportAgentsBtn) {
  exportAgentsBtn.addEventListener("click", () => {
    if (!customAgents.length) { alert("Aucun agent privé à exporter."); return; }
    const blob = new Blob([JSON.stringify(customAgents, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agents_prives_taxi_sauvegarde.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

/* ==========================================================
   BASE LIEUX PRIVEE
   ========================================================== */

const importLieuxFile =
  document.getElementById("importLieuxFile");

const importLieuxBtn =
  document.getElementById("importLieuxBtn");

const exportLieuxBtn =
  document.getElementById("exportLieuxBtn");


// ==========================================================
// IMPORTER LES LIEUX
// ==========================================================

if (importLieuxBtn && importLieuxFile) {

  importLieuxBtn.addEventListener(
    "click",
    () => importLieuxFile.click()
  );

  importLieuxFile.addEventListener(
    "change",
    async () => {

      const file =
        importLieuxFile.files &&
        importLieuxFile.files[0];

      if (!file) return;

      try {

        const data =
          JSON.parse(await file.text());

        if (!Array.isArray(data)) {
          throw new Error(
            "Le fichier n'est pas une liste de lieux."
          );
        }

        const nettoyes =
          data.map(x => ({

            ville:
              String(x.ville || "")
                .trim()
                .toUpperCase(),

            lieu:
              String(x.lieu || "")
                .trim(),

            adresse:
              String(x.adresse || "")
                .trim(),

            codePostal:
              String(x.codePostal || "")
                .trim()

          }))
          .filter(x =>
            x.ville &&
            x.lieu
          );

        const uniques =
          new Map();

        nettoyes.forEach(x => {

          uniques.set(
            cleLieu(x),
            x
          );

        });

        customLieux =
          [...uniques.values()];

        saveLocalArray(
          LS_LIEUX,
          customLieux
        );

        renderAdminLieux();

        if (villeSelectionnee) {
          fillLieux();
        }

        alert(
          `${customLieux.length} lieu(x) importé(s) sur cet appareil.`
        );

      } catch (e) {

        alert(
          "Import impossible : " +
          (e.message || "fichier invalide")
        );

      }

      importLieuxFile.value = "";

    }
  );
}


// ==========================================================
// EXPORTER LES LIEUX
// ==========================================================

if (exportLieuxBtn) {

  exportLieuxBtn.addEventListener(
    "click",
    () => {

      if (!customLieux.length) {

        alert(
          "Aucun lieu privé à exporter."
        );

        return;
      }

      const blob =
        new Blob(
          [
            JSON.stringify(
              customLieux,
              null,
              2
            )
          ],
          {
            type:
              "application/json"
          }
        );

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = url;

      a.download =
        "lieux_prives_taxi_sauvegarde.json";

      document.body.appendChild(a);

      a.click();

      a.remove();

      URL.revokeObjectURL(url);

    }
  );
}

/* ==========================================================
   ADMINISTRATION
   ========================================================== */

const tabLieux = document.getElementById("tabLieux");
const tabAgents = document.getElementById("tabAgents");
const tabDestinataires = document.getElementById("tabDestinataires");
const tabAppearance = document.getElementById("tabAppearance");





let editLieuIndex = -1;
let editAgentIndex = -1;

const adminVille = document.getElementById("adminVille");
const adminLieu = document.getElementById("adminLieu");
const adminAdresse = document.getElementById("adminAdresse");
const adminCP = document.getElementById("adminCP");

const ownerAgent = document.getElementById("ownerAgent");
const adminNomAgent = document.getElementById("adminNomAgent");
const adminMatricule = document.getElementById("adminMatricule");
const adminTelephone = document.getElementById("adminTelephone");
const adminEmail = document.getElementById("adminEmail");

const saveLieuBtn = document.getElementById("saveLieu");


const saveAgentBtn = document.getElementById("saveAgent");


const listeLieuxAdmin = document.getElementById("listeLieuxAdmin");
const lieuxVilleBloc = document.getElementById("lieuxVilleBloc");
const listeAgentsAdmin = document.getElementById("listeAgentsAdmin");
const countLieux = document.getElementById("countLieux");
const countAgents = document.getElementById("countAgents");

adminNomAgent.addEventListener(
  "input",
  () => {
    renderAdminAgents();
  }
);


function clearLieuForm() {
  editLieuIndex = -1;
  adminVille.value = "";
  adminLieu.value = "";
  adminAdresse.value = "";
  adminCP.value = "";
  saveLieuBtn.textContent = "Ajouter le lieu";

  if (lieuxVilleBloc) {
    lieuxVilleBloc.hidden = true;
  }

  if (listeLieuxAdmin) {
    listeLieuxAdmin.innerHTML = "";
  }

  if (countLieux) {
    countLieux.textContent = "0";
  }
}

function clearAgentForm() {
  editAgentIndex = -1;
  adminNomAgent.value = "";
  adminMatricule.value = "";
  adminTelephone.value = "";
  adminEmail.value = "";
  saveAgentBtn.textContent = "💾 Valider";
}

function lieuExiste(villeNom, lieuNom, ignoreIndex = -1) {

  const v = normalizeText(villeNom);
  const l = normalizeText(lieuNom);

  const all = allLieux();

  return all.some((x, idx) => {
    const isCustom = idx >= baseLieux.length;
    const customIndex = idx - baseLieux.length;

    if (
      isCustom &&
      customIndex === ignoreIndex
    ) {
      return false;
    }

    return (
      normalizeText(x.ville) === v &&
      normalizeText(x.lieu) === l
    );
  });
}

function agentExiste(nom, ignoreIndex = -1) {

  const n = normalizeText(nom);

  const all = allAgents();

  return all.some((x, idx) => {
    const isCustom = idx >= baseAgents.length;
    const customIndex = idx - baseAgents.length;

    if (
      isCustom &&
      customIndex === ignoreIndex
    ) {
      return false;
    }

    return normalizeText(x.nom) === n;
  });
}


adminVille.addEventListener("input", () => {
  renderAdminLieux();
});

adminVille.addEventListener("focus", () => {
  renderAdminLieux();
});

saveLieuBtn.addEventListener("click", () => {

  const villeNom = adminVille.value.trim().toUpperCase();
  const lieuNom = adminLieu.value.trim();
  const adresse = adminAdresse.value.trim();
  const cp = adminCP.value.trim();

  if (!villeNom || !lieuNom || !adresse || !cp) {
    alert(
      "Merci de renseigner la ville, le lieu, " +
      "l’adresse et le code postal."
    );
    return;
  }

  if (lieuExiste(villeNom, lieuNom, editLieuIndex)) {
    alert(
      "Ce lieu existe déjà pour cette ville."
    );
    return;
  }

  const item = {
    lieu: lieuNom,
    ville: villeNom,
    adresse: adresse,
    codePostal: cp
  };

  if (editLieuIndex >= 0) {
    customLieux[editLieuIndex] = item;
  } else {
    customLieux.push(item);
  }

  saveLocalArray(LS_LIEUX, customLieux);

  const villeGardee = villeNom;
  clearLieuForm();
  adminVille.value = villeGardee;
  renderAdminLieux();
  renderAdminLieux();

  if (
    normalizeText(villeSelectionnee) ===
    normalizeText(villeNom)
  ) {
    fillLieux();
  }
});

saveAgentBtn.addEventListener("click", () => {

  const nom = adminNomAgent.value.trim().toUpperCase();
  const matricule =
    adminMatricule.value.trim() || "---";
  const telephone =
    adminTelephone.value.trim();
  const email =
    adminEmail.value.trim();

  if (!nom) {
    alert("Merci de renseigner le nom de l’agent.");
    return;
  }

  if (agentExiste(nom, editAgentIndex)) {
    alert("Cet agent existe déjà.");
    return;
  }

  const item = {
    nom,
    matricule,
    telephone,
    actif: 1,
    email
  };

  if (editAgentIndex >= 0) {
    customAgents[editAgentIndex] = item;
  } else {
    customAgents.push(item);
  }

  saveLocalArray(LS_AGENTS, customAgents);

  clearAgentForm();
  renderAdminAgents();
  renderAgents();
});


function renderAdminLieux() {

  const countLieuxTotal =
    document.getElementById("countLieuxTotal");

  if (countLieuxTotal) {
    countLieuxTotal.textContent =
      allLieux().length;
  }

  const q = normalizeText(adminVille.value);

  if (!q) {
    lieuxVilleBloc.hidden = true;
    listeLieuxAdmin.innerHTML = "";
    countLieux.textContent = "0";
    return;
  }

  const resultats = allLieux()
    .filter(x =>
      normalizeText(x.ville).includes(q)
    )
    .sort((a, b) => {

      const villeCmp =
        a.ville.localeCompare(b.ville, "fr");

      if (villeCmp !== 0) return villeCmp;

      return a.lieu.localeCompare(
        b.lieu,
        "fr"
      );
    });

  lieuxVilleBloc.hidden = false;
  countLieux.textContent = resultats.length;

  if (!resultats.length) {
    listeLieuxAdmin.innerHTML =
      '<div class="admin-empty">Aucun lieu trouvé pour cette ville.</div>';
    return;
  }

  listeLieuxAdmin.innerHTML =
    resultats.map(x => `

<div class="admin-item">

  <div class="admin-item-main">

    <strong>
      ${x.ville} — ${x.lieu}
    </strong>

    <span>
      ${x.adresse || ""}
    </span>

    <span>
      ${x.codePostal || ""}
    </span>

  </div>

  <div class="admin-item-actions">

    <button
      type="button"
      class="admin-edit"
      data-place-key="${encodeURIComponent(cleLieu(x))}"
      title="Modifier"
      aria-label="Modifier ${x.lieu}"
    >
      ✏️
    </button>

    <button
      type="button"
      class="admin-delete"
      data-delete-place-key="${encodeURIComponent(cleLieu(x))}"
      title="Supprimer"
      aria-label="Supprimer ${x.lieu}"
    >
      🗑️
    </button>

  </div>

</div>

    `).join("");

  listeLieuxAdmin
    .querySelectorAll("[data-place-key]")
    .forEach(btn => {

      btn.addEventListener("click", () => {

        const key =
          decodeURIComponent(btn.dataset.placeKey);

        const x =
          allLieux().find(
            item => cleLieu(item) === key
          );

        if (!x) return;

        adminVille.value = x.ville;
        adminLieu.value = x.lieu;
        adminAdresse.value = x.adresse || "";
        adminCP.value = x.codePostal || "";

        const customIndex =
          customLieux.findIndex(
            c => cleLieu(c) === key
          );

        editLieuIndex = customIndex;
        saveLieuBtn.textContent =
          customIndex >= 0
            ? "Enregistrer"
            : "Ajouter le lieu";

        renderAdminLieux();
      });
    });

  listeLieuxAdmin
    .querySelectorAll("[data-delete-place-key]")
    .forEach(btn => {

      btn.addEventListener("click", () => {

        const key =
          decodeURIComponent(
            btn.dataset.deletePlaceKey
          );

        const x =
          allLieux().find(
            item => cleLieu(item) === key
          );

        if (!x) return;

        if (!confirm(
          `Supprimer "${x.lieu}" à ${x.ville} ?`
        )) {
          return;
        }

        const customIndex =
          customLieux.findIndex(
            c => cleLieu(c) === key
          );

        if (customIndex >= 0) {

          customLieux.splice(
            customIndex,
            1
          );

          saveLocalArray(
            LS_LIEUX,
            customLieux
          );

        } else {

          if (!lieuxSupprimes.includes(key)) {
            lieuxSupprimes.push(key);

            saveLocalArray(
              LS_LIEUX_SUPPRIMES,
              lieuxSupprimes
            );
          }
        }

        if (
          normalizeText(villeSelectionnee) ===
          normalizeText(x.ville)
        ) {
          fillLieux();
        }

        if (
          normalizeText(adminLieu.value) ===
          normalizeText(x.lieu)
        ) {
          adminLieu.value = "";
          adminAdresse.value = "";
          adminCP.value = "";
          editLieuIndex = -1;
          saveLieuBtn.textContent =
            "Ajouter le lieu";
        }

        renderAdminLieux();
      });
    });
}


function renderOwnerAgent() {

  if (!ownerAgent) return;

  const liste = allAgents()
    .slice()
    .sort((a,b) => a.nom.localeCompare(b.nom, "fr"));

  ownerAgent.innerHTML =
    '<option value="">Choisir mon nom...</option>' +
    liste.map(a => `
      <option value="${encodeURIComponent(cleAgent(a))}">
        ${a.nom}
      </option>
    `).join("");

  if (ownerAgentKey) {
    ownerAgent.value = encodeURIComponent(ownerAgentKey);
  }
}

if (ownerAgent) {
  ownerAgent.addEventListener("change", () => {
    ownerAgentKey = ownerAgent.value
      ? decodeURIComponent(ownerAgent.value)
      : "";

    localStorage.setItem(
      LS_OWNER_AGENT,
      ownerAgentKey
    );
  });
}

function estProprietaireTelephone(agent) {
  return !!(
    agent &&
    ownerAgentKey &&
    cleAgent(agent) === ownerAgentKey
  );
}

function renderAdminAgents() {

  renderOwnerAgent();

  // Le compteur indique toujours le nombre total enregistré.
  countAgents.textContent =
    customAgents.length;

  const recherche =
    normalizeText(
      adminNomAgent.value
    );

  // Tant que rien n'est saisi dans NOM :
  // aucune fiche agent n'est affichée.
  if (!recherche) {

    listeAgentsAdmin.innerHTML =
      "";

    return;
  }

  const resultat =
    customAgents
      .map((x, i) => ({
        agent: x,
        index: i
      }))
      .filter(item =>
        normalizeText(
          item.agent.nom
        ).includes(recherche)
      );

  if (!resultat.length) {

    listeAgentsAdmin.innerHTML =
      '<div class="admin-empty">Aucun agent correspondant.</div>';

    return;
  }

  listeAgentsAdmin.innerHTML =
    resultat.map(item => {

      const x =
        item.agent;

      const i =
        item.index;

      return `
        <div class="admin-item">

          <div class="admin-item-main">

            <strong>
              ${x.nom}
            </strong>

            <span>
              ${x.matricule || "---"}
            </span>

            <span>
              ${x.telephone || ""}
            </span>

            <span>
              ${x.email || ""}
            </span>

          </div>

          <div class="admin-item-actions">

<button
  type="button"
  class="admin-edit"
  data-edit-agent="${i}"
  title="Modifier"
  aria-label="Modifier l’agent"
>
  ✏️
</button>

<button
  type="button"
  class="admin-delete"
  data-delete-agent="${i}"
  title="Supprimer"
  aria-label="Supprimer l’agent"
>
  🗑️
</button>

          </div>

        </div>
      `;
    }).join("");

  listeAgentsAdmin
    .querySelectorAll(
      "[data-edit-agent]"
    )
    .forEach(btn => {

      btn.addEventListener(
        "click",
        () => {

          const i =
            Number(
              btn.dataset.editAgent
            );

          const x =
            customAgents[i];

          editAgentIndex = i;

          adminNomAgent.value =
            x.nom;

          adminMatricule.value =
            x.matricule || "---";

          adminTelephone.value =
            x.telephone || "";

          adminEmail.value =
            x.email || "";

          saveAgentBtn.textContent =
            "Enregistrer";

          // Après sélection, garder uniquement cet agent visible.
          renderAdminAgents();
        }
      );
    });

  listeAgentsAdmin
    .querySelectorAll(
      "[data-delete-agent]"
    )
    .forEach(btn => {

      btn.addEventListener(
        "click",
        () => {

          const i =
            Number(
              btn.dataset.deleteAgent
            );

          const x =
            customAgents[i];

          if (
            !confirm(
              `Supprimer l’agent "${x.nom}" ?`
            )
          ) {
            return;
          }

          customAgents.splice(
            i,
            1
          );

          saveLocalArray(
            LS_AGENTS,
            customAgents
          );

          renderAdminAgents();
          renderAgents();
        }
      );
    });
}

/* ==========================================================
   DESTINATAIRES E-MAIL
   ========================================================== */
const adminNomDest = document.getElementById("adminNomDest");
const adminEmailDest = document.getElementById("adminEmailDest");
const saveDestBtn = document.getElementById("saveDest");
const listeDestAdmin = document.getElementById("listeDestAdmin");
const countDest = document.getElementById("countDest");

function clearDestForm() {
  adminNomDest.value = "";
  adminEmailDest.value = "";
}

function renderDestinataires() {
  countDest.textContent = destinataires.length;
  if (!destinataires.length) {
  listeDestAdmin.innerHTML = "";
  return;
}
  listeDestAdmin.innerHTML = destinataires.map((x,i) => `
    <div class="admin-item">
      <div class="admin-item-main">
        <strong>${x.nom}</strong>
        <span>${x.email}</span>
        ${i === 0 ? '<span class="origine-item">Utilisé automatiquement pour Outlook</span>' : ''}
      </div>
    </div>
  `).join("");
}

saveDestBtn.addEventListener("click", () => {
  const nom = adminNomDest.value.trim();
  const email = adminEmailDest.value.trim();

  if (!nom || !email) {
    alert("Renseignez le nom et l’adresse e-mail.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert("L’adresse e-mail n’est pas valide.");
    return;
  }

  // Un destinataire principal : un nouvel ajout remplace l'ancien.
  destinataires = [{ nom, email }];
  saveLocalArray(LS_DESTINATAIRES, destinataires);
  clearDestForm();
  renderDestinataires();
  alert("Destinataire enregistré.");
});

/* ==========================================================
   AJOUT RAPIDE +
   ========================================================== */

const quickAddBtn = document.getElementById("quickAddBtn");
const quickAddMenu = document.getElementById("quickAddMenu");
const quickAddLieu = document.getElementById("quickAddLieu");
const quickAddContacts = document.getElementById("quickAddContacts");
const quickAddAppearance = document.getElementById("quickAddAppearance");
const quickAddClose = document.getElementById("quickAddClose");



function ouvrirMenuAjout() {

  const taxiHome =
    document.getElementById("taxiHome");

  if (taxiHome) {
    taxiHome.hidden = true;
  }

  quickAddMenu.hidden = false;
}

function fermerMenuAjout(restaurerAccueil = true) {

  quickAddMenu.hidden = true;

  if (!restaurerAccueil) {
    return;
  }

  const taxiHome =
    document.getElementById("taxiHome");

  const taxiRequestPopup =
    document.getElementById("taxiRequestPopup");

  const taxiRecapPopup =
    document.getElementById("taxiRecapPopup");

  if (
    taxiHome &&
    taxiRequestPopup.hidden &&
    taxiRecapPopup.hidden
  ) {
    taxiHome.hidden = false;
  }
}

function ouvrirAdministrationSur(type) {

  fermerMenuAjout(false);

  const popupLieux =
    document.getElementById("popupLieux");

  const popupContacts =
    document.getElementById("popupContacts");

  const popupAppearance =
    document.getElementById("popupAppearance");

  // Fermer les 3 popups avant d'ouvrir celle demandée
  if (popupLieux) popupLieux.hidden = true;
  if (popupContacts) popupContacts.hidden = true;
  if (popupAppearance) popupAppearance.hidden = true;


  // ==========================================================
  // HOTEL / LIEU
  // ==========================================================

  if (type === "lieu") {

    if (popupLieux) {
      popupLieux.hidden = false;
    }

    clearLieuForm();

    setTimeout(() => {

      if (adminVille) {
        adminVille.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        adminVille.focus();
      }

    }, 120);
  }


  // ==========================================================
  // AGENTS + DESTINATAIRES
  // ==========================================================

  else if (type === "contacts") {

    if (popupContacts) {
      popupContacts.hidden = false;
    }

 if (agentFormBox) {
  agentFormBox.hidden = true;
}
  }


  // ==========================================================
  // APPARENCE
  // ==========================================================

  else if (type === "appearance") {

    if (popupAppearance) {
      popupAppearance.hidden = false;
    }

    setTimeout(() => {

      if (tabAppearance) {
        tabAppearance.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }

    }, 120);
  }

  document.body.style.overflow = "hidden";
}

// ==========================================================
// OUVRIR LE FORMULAIRE AJOUT AGENT
// ==========================================================

const openAgentForm =
  document.getElementById("openAgentForm");

const agentFormBox =
  document.getElementById("agentFormBox");

if (openAgentForm && agentFormBox) {

openAgentForm.addEventListener("click", () => {

  // Si le cadre est ouvert -> on le ferme
  if (!agentFormBox.hidden) {

    agentFormBox.hidden = true;
    clearAgentForm();

    openAgentForm.textContent = "+ Ajouter un agent";

    return;
  }

  // Si le cadre est fermé -> on l'ouvre
  agentFormBox.hidden = false;

  clearAgentForm();

  openAgentForm.textContent = "− Fermer";

  setTimeout(() => {
    adminNomAgent.focus();
  }, 100);

});

}

// ==========================================================
// OUVRIR / FERMER LE FORMULAIRE LIEU
// ==========================================================

const openLieuForm =
  document.getElementById("openLieuForm");

const lieuFormBox =
  document.getElementById("lieuFormBox");

if (openLieuForm && lieuFormBox) {

  openLieuForm.addEventListener("click", () => {

    // Si le cadre est ouvert -> on le ferme
    if (!lieuFormBox.hidden) {

      lieuFormBox.hidden = true;
      clearLieuForm();

      openLieuForm.textContent =
        "+ Ajouter un lieu";

      return;
    }

    // Si le cadre est fermé -> on l'ouvre
    lieuFormBox.hidden = false;

    clearLieuForm();

    openLieuForm.textContent =
      "− Fermer";

    setTimeout(() => {
      adminVille.focus();
    }, 100);

  });

}

// ==========================================================
// OUVRIR / FERMER LE FORMULAIRE DESTINATAIRE
// ==========================================================

const openDestForm =
  document.getElementById("openDestForm");

const destFormBox =
  document.getElementById("destFormBox");

if (openDestForm && destFormBox) {

  openDestForm.addEventListener("click", () => {

    if (!destFormBox.hidden) {

      destFormBox.hidden = true;
      clearDestForm();

      openDestForm.textContent =
        "+ Ajouter un destinataire";

      return;
    }

    destFormBox.hidden = false;
    clearDestForm();

    openDestForm.textContent =
      "− Fermer";

    setTimeout(() => {

      if (adminNomDest) {
        adminNomDest.focus();
      }

    }, 100);

  });

}
// ==========================================================
// FERMETURE DES POPUPS ADMINISTRATION
// ==========================================================

document
  .querySelectorAll("[data-close-popup]")
  .forEach(btn => {

    btn.addEventListener("click", () => {

      const popup =
        document.getElementById(
          btn.dataset.closePopup
        );

      if (popup) {
        popup.hidden = true;
      }

      document.body.style.overflow = "";

      const taxiHome =
        document.getElementById("taxiHome");

      if (taxiHome) {
        taxiHome.hidden = false;
      }

      if (quickAddBtn) {
        quickAddBtn.hidden = false;
      }

    });

  });

quickAddBtn.addEventListener("click", ouvrirMenuAjout);

quickAddClose.addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();
  fermerMenuAjout();
});

quickAddMenu.addEventListener("click", event => {
  if (event.target === quickAddMenu) {
    fermerMenuAjout();
  }
});

document.addEventListener("keydown", event => {
  if (
    event.key === "Escape" &&
    !quickAddMenu.hidden
  ) {
    fermerMenuAjout();
  }
});

quickAddLieu.addEventListener("click", () => {
  ouvrirAdministrationSur("lieu");
});

quickAddContacts.addEventListener("click", () => {
  ouvrirAdministrationSur("contacts");
});

quickAddAppearance.addEventListener("click", () => {
  alert("Bientôt");
});


/* ==========================================================
   APPARENCE TAXI
   ========================================================== */

const appearanceDefaults = {
  primary: "#111827",
  mail: "#111827",
  accent: "#16a34a",
  background: "#f3f4f6",
  card: "#ffffff",
  theme: "classic",
  textPrimary: "#ffffff",
  textSecondary: "#cbd5e1"
};

const appearanceThemes = {
  classic: {
    primary: "#111827",
    mail: "#111827",
    accent: "#111827",
    background: "#f3f4f6",
    card: "#ffffff"
  },
  blue: {
    primary: "#0b63d8",
    mail: "#0b63d8",
    accent: "#0b63d8",
    background: "#eef5ff",
    card: "#ffffff"
  },
  green: {
    primary: "#047857",
    mail: "#047857",
    accent: "#16a34a",
    background: "#eefbf5",
    card: "#ffffff"
  },
  orange: {
    primary: "#c2410c",
    mail: "#ea580c",
    accent: "#ea580c",
    background: "#fff7ed",
    card: "#ffffff"
  },
  red: {
    primary: "#b91c1c",
    mail: "#b91c1c",
    accent: "#dc2626",
    background: "#fff1f2",
    card: "#ffffff"
  },
  dark: {
    primary: "#111827",
    mail: "#16a34a",
    accent: "#22c55e",
    background: "#111827",
    card: "#1f2937"
  }
};

function saveAppearanceLocal(value) {
  localStorage.setItem(
    LS_APPEARANCE,
    JSON.stringify(value)
  );
}

function applyTaxiAppearance(values) {

  const a = {
    ...appearanceDefaults,
    ...values
  };

  document.documentElement.style.setProperty(
    "--taxi-primary",
    a.primary
  );

  document.documentElement.style.setProperty(
    "--taxi-mail",
    a.mail
  );

  document.documentElement.style.setProperty(
    "--taxi-accent",
    a.accent
  );

  document.documentElement.style.setProperty(
    "--taxi-background",
    a.background
  );

  document.documentElement.style.setProperty(
    "--taxi-card",
    a.card
  );

  document.documentElement.style.setProperty(
    "--taxi-text-primary",
    a.textPrimary || "#ffffff"
  );

  document.documentElement.style.setProperty(
    "--taxi-text-secondary",
    a.textSecondary || "#cbd5e1"
  );

  const modeSombre =
    String(a.theme || "").toLowerCase() === "dark";

  document.documentElement.style.setProperty(
    "--taxi-text",
    modeSombre
      ? "#f8fafc"
      : "#111827"
  );

  document.body.classList.toggle(
    "taxi-dark",
    modeSombre
  );

  const cp = document.getElementById("colorPrimary");
  const cm = document.getElementById("colorMail");
  const ca = document.getElementById("colorAccent");
  const cb = document.getElementById("colorBackground");
  const cc = document.getElementById("colorCard");
  const ctp = document.getElementById("colorTextPrimary");
  const cts = document.getElementById("colorTextSecondary");

  if (cp) cp.value = a.primary;
  if (cm) cm.value = a.mail;
  if (ca) ca.value = a.accent;
  if (cb) cb.value = a.background;
  if (cc) cc.value = a.card;
  if (ctp) ctp.value = a.textPrimary || "#ffffff";
  if (cts) cts.value = a.textSecondary || "#cbd5e1";

  document
    .querySelectorAll(".theme-choice")
    .forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.theme === a.theme
      );
    });
}

document
  .querySelectorAll(".theme-choice")
  .forEach(btn => {

    btn.addEventListener("click", () => {

      const name = btn.dataset.theme;
      const preset = appearanceThemes[name];

      if (!preset) return;

      appearance = {
        ...preset,
        theme: name
      };

      saveAppearanceLocal(appearance);
      applyTaxiAppearance(appearance);
    });
  });

const saveAppearanceBtn =
  document.getElementById("saveAppearance");

if (saveAppearanceBtn) {
  saveAppearanceBtn.addEventListener("click", () => {

    appearance = {
      primary:
        document.getElementById("colorPrimary").value,

      mail:
        document.getElementById("colorMail").value,

      accent:
        document.getElementById("colorAccent").value,

      background:
        document.getElementById("colorBackground").value,

      card:
        document.getElementById("colorCard").value,

      theme: "custom",
        textPrimary: document.getElementById("colorTextPrimary").value,
        textSecondary: document.getElementById("colorTextSecondary").value
    };

    saveAppearanceLocal(appearance);
    applyTaxiAppearance(appearance);

    alert("Apparence enregistrée.");
  });
}

const resetAppearanceBtn =
  document.getElementById("resetAppearance");

if (resetAppearanceBtn) {
  resetAppearanceBtn.addEventListener("click", () => {

    appearance = {
      ...appearanceDefaults
    };

    saveAppearanceLocal(appearance);
    applyTaxiAppearance(appearance);

    alert("Apparence réinitialisée.");
  });
}

applyTaxiAppearance(appearance);


/* ==========================================================
   INITIALISATION
   ========================================================== */

renderAgents();
renderAdminLieux();
renderAdminAgents();
updatePrivateAgentsStatus();
update();

if (
  "serviceWorker" in navigator &&
  location.protocol.startsWith("http")
) {
  addEventListener("load", async () => {

    try {

      const registration =
        await navigator.serviceWorker.register(
          "./service-worker.js",
          {
            updateViaCache: "none"
          }
        );

      await registration.update();

    } catch (e) {

      console.error(
        "Erreur mise à jour Service Worker :",
        e
      );

    }

  });
}

renderDestinataires();

/* ==========================================================
   v48 - BINDINGS ROBUSTES PARAMETRES + SMS
   ========================================================== */
document.addEventListener("DOMContentLoaded", () => {


  const btnSms = document.getElementById("smsAgents");

  if (btnSms) {
    btnSms.onclick = () => {

      const villeExacte =
        villeSelectionnee || villeValide();

      const d = getLieu(depart);
      const a = getLieu(arrivee);
      const selected = selectedAgents();

      if (
        !villeExacte ||
        !d ||
        !a ||
        !dateEl.value ||
        !heure.value
      ) {
        alert(
          "Merci de sélectionner la ville, le départ, " +
          "l’arrivée, la date et l’heure."
        );
        return;
      }

      if (
        allerRetour &&
        (!dateRetour.value || !heureRetour.value)
      ) {
        alert(
          "Merci de renseigner la date et l’heure du retour."
        );
        return;
      }

      if (selected.some(x => !x)) {
        alert(
          "Merci de sélectionner tous les agents avant " +
          "de préparer le SMS."
        );
        return;
      }

      const autresAgents = selected.filter(
        ag => !estProprietaireTelephone(ag)
      );

      if (!autresAgents.length) {
        alert("Aucun autre agent à prévenir par SMS.");
        return;
      }

      const sansTelephone = autresAgents.filter(
        ag => !normaliserNumeroSMS(ag.telephone)
      );

      if (sansTelephone.length) {
        alert(
          "Numéro de téléphone manquant pour :\n\n" +
          sansTelephone.map(a => "• " + a.nom).join("\n")
        );
        return;
      }
      const overlay =
        document.getElementById("smsChoiceOverlay");
     

      const liste =
        document.getElementById("smsChoiceList");

      const fermer =
        document.getElementById("smsChoiceClose");

      if (!overlay || !liste || !fermer) {
        alert("La fenêtre SMS n’est pas disponible.");
        return;
      }

      const texte =
        construireMessageSMS(
          villeExacte,
          d,
          a,
          selected
        );

      liste.innerHTML = "";

      autresAgents.forEach(ag => {

        const bouton =
          document.createElement("button");

        bouton.type = "button";
        bouton.className = "sms-agent-btn";

        bouton.innerHTML =
          `${ag.nom}` +
          `<small>${ag.telephone || ""}</small>`;

        bouton.onclick = () => {

          const numero =
            normaliserNumeroSMS(
              ag.telephone
            );

          overlay.hidden = true;

          ouvrirSMS(
            [numero],
            texte
          );
        };

        liste.appendChild(bouton);
      });


      const boutonTous =
        document.createElement("button");

      boutonTous.type =
        "button";

      boutonTous.className =
        "sms-all-agents-btn";

      boutonTous.innerHTML =
        `<strong>ENVOYER</strong>` +
        `<small>${autresAgents.length} destinataire${autresAgents.length > 1 ? "s" : ""}</small>`;

      boutonTous.onclick = () => {

        const numeros =
          [
            ...new Set(
              autresAgents
                .map(ag =>
                  normaliserNumeroSMS(
                    ag.telephone
                  )
                )
                .filter(Boolean)
            )
          ];

        if (!numeros.length) {

          alert(
            "Aucun numéro de téléphone disponible."
          );

          return;
        }

        overlay.hidden = true;

        ouvrirSMS(
          numeros,
          texte
        );
      };

      liste.appendChild(
        boutonTous
      );

      fermer.onclick = () => {
        overlay.hidden = true;
      };

      overlay.onclick = event => {
        if (event.target === overlay) {
          overlay.hidden = true;
        }
      };

      overlay.hidden = false;
    };
  }
});



/* ==========================================================
   NAVIGATION ACCUEIL / SAISIE / RECAPITULATIF
   ========================================================== */

const taxiHome =
  document.getElementById("taxiHome");

const taxiRequestPopup =
  document.getElementById("taxiRequestPopup");

const taxiRecapPopup =
  document.getElementById("taxiRecapPopup");

const openAllerSimple =
  document.getElementById("openAllerSimple");

const openAllerRetour =
  document.getElementById("openAllerRetour");

const closeTaxiRequestPopup =
  document.getElementById("closeTaxiRequestPopup");

const closeTaxiRecapPopup =
  document.getElementById("closeTaxiRecapPopup");

const validateTaxiRequest =
  document.getElementById("validateTaxiRequest");

const taxiRequestTitle =
  document.getElementById("taxiRequestTitle");

function ouvrirSaisieTaxi(modeRetour) {

  setAllerRetour(modeRetour);

  // Titre du popup suivant le choix fait à l'accueil
  if (taxiRequestTitle) {
    taxiRequestTitle.textContent =
      modeRetour
        ? "ALLER / RETOUR"
        : "ALLER SIMPLE";
  }

  const quickAddBtn =
    document.getElementById("quickAddBtn");

  taxiHome.hidden = true;
  taxiRecapPopup.hidden = true;
  taxiRequestPopup.hidden = false;

  if (quickAddBtn) {
    quickAddBtn.hidden = true;
  }

  document.body.style.overflow = "hidden";

  taxiRequestPopup.scrollTop = 0;
}


function fermerSaisieTaxi() {

  const quickAddBtn =
    document.getElementById("quickAddBtn");

  taxiRequestPopup.hidden = true;
  taxiRecapPopup.hidden = true;
  taxiHome.hidden = false;

  if (quickAddBtn) {
    quickAddBtn.hidden = false;
  }

  document.body.style.overflow = "";
}


function ouvrirRecapTaxi() {

  const form =
    document.getElementById("form");

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  update();

  taxiRequestPopup.hidden = true;
  taxiRecapPopup.hidden = false;

  taxiRecapPopup.scrollTop = 0;
}


function fermerRecapTaxi() {

  taxiRecapPopup.hidden = true;
  taxiRequestPopup.hidden = false;

  taxiRequestPopup.scrollTop = 0;
}


openAllerSimple.addEventListener(
  "click",
  () => ouvrirSaisieTaxi(false)
);


openAllerRetour.addEventListener(
  "click",
  () => ouvrirSaisieTaxi(true)
);


closeTaxiRequestPopup.addEventListener(
  "click",
  fermerSaisieTaxi
);


validateTaxiRequest.addEventListener(
  "click",
  ouvrirRecapTaxi
);


closeTaxiRecapPopup.addEventListener(
  "click",
  fermerRecapTaxi
);