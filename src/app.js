import { APP_CONFIG } from "./config.js";
import {
  initFirebase,
  hasValidFirebaseConfig,
  listenAuth,
  loginWithGoogle,
  logout,
  isAllowedEmail,
  observeIdeas,
  observeLogs,
  saveIdea,
  removeIdea,
  archiveIdea,
  seedStarterIdeas,
  logIdeaDone
} from "./firebase.js";
import {
  averageRating,
  escapeHtml,
  formatDate,
  moneyCOP,
  parseTags,
  relativeLastDone,
  repeatStatus,
  scoreIdea,
  tagsToText,
  todayInputValue,
  toDate
} from "./utils.js";

const state = {
  firebaseReady: false,
  user: null,
  authChecked: false,
  ideas: [],
  logs: [],
  historyVisible: 8,
  filters: {
    search: "",
    category: "all",
    energy: "all",
    budget: "all",
    view: "active",
    sort: "recommended"
  },
  selectedIdeaId: null,
  unsubIdeas: null,
  unsubLogs: null
};

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const ideaDialog = document.querySelector("#ideaDialog");
const ideaForm = document.querySelector("#ideaForm");
const logDialog = document.querySelector("#logDialog");
const logForm = document.querySelector("#logForm");

function showToast(message, type = "info") {
  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3600);
}

function setupStaticFormOptions() {
  document.querySelector("#categoryList").innerHTML = APP_CONFIG.categories
    .map((item) => `<option value="${escapeHtml(item)}"></option>`)
    .join("");

  document.querySelector("#budgetLevel").innerHTML = APP_CONFIG.budgetLevels
    .map((item) => `<option value="${item.value}">${escapeHtml(item.label)}</option>`)
    .join("");

  document.querySelector("#energyLevel").innerHTML = APP_CONFIG.energyLevels
    .map((item) => `<option value="${item.value}">${escapeHtml(item.label)}</option>`)
    .join("");
}

function labelFrom(list, value) {
  return list.find((item) => item.value === value)?.label || value || "Sin dato";
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function attachCharCounters() {
  document.querySelectorAll("textarea[maxlength]").forEach((textarea) => {
    const max = Number(textarea.getAttribute("maxlength"));
    const existing = textarea.parentElement.querySelector(".char-counter");
    if (existing) existing.remove();

    const counter = document.createElement("small");
    counter.className = "char-counter";

    function update() {
      const remaining = max - textarea.value.length;
      counter.textContent = `${textarea.value.length} / ${max}`;
      counter.classList.toggle("near-limit", remaining < 100 && remaining >= 20);
      counter.classList.toggle("at-limit", remaining < 20);
    }

    update();
    textarea.addEventListener("input", update);
    textarea.parentElement.appendChild(counter);
  });
}

const RATING_LABELS = {
  1: "1 · la humanidad falló",
  2: "2 · meh",
  3: "3 · normalito",
  4: "4 · estuvo muy bien",
  5: "5 · repetir urgente"
};

function attachStarRating() {
  const container = document.querySelector("#starRating");
  if (!container) return;
  const stars = container.querySelectorAll(".star");
  const hiddenInput = document.querySelector("#rating");
  const label = document.querySelector("#ratingLabel");

  function setRating(value) {
    hiddenInput.value = value;
    container.dataset.value = value;
    label.textContent = RATING_LABELS[value] || "";
    stars.forEach((star) => {
      const n = Number(star.dataset.star);
      star.classList.toggle("active", n <= value);
    });
  }

  setRating(5);

  stars.forEach((star) => {
    star.addEventListener("click", () => setRating(Number(star.dataset.star)));
    star.addEventListener("mouseenter", () => {
      const hoverVal = Number(star.dataset.star);
      stars.forEach((s) => s.classList.toggle("active", Number(s.dataset.star) <= hoverVal));
    });
    star.addEventListener("mouseleave", () => {
      setRating(Number(hiddenInput.value));
    });
  });
}

function countActiveFilters() {
  const defaults = { search: "", category: "all", energy: "all", budget: "all", view: "active", sort: "recommended" };
  return Object.entries(defaults).filter(([key, def]) => state.filters[key] !== def).length;
}

function launchConfetti() {
  const colors = ["#8f3ffc", "#ef4fa2", "#4f8dff", "#f59e0b", "#10b981", "#ff6b6b"];
  const count = 48;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    el.style.cssText = `
      left: ${20 + Math.random() * 60}vw;
      top: -12px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
      animation-duration: ${1.4 + Math.random() * 1.2}s;
      animation-delay: ${Math.random() * 0.4}s;
    `;
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }
}

function activeIdeas() {
  return state.ideas.filter((idea) => !idea.archived);
}

function visibleIdeas() {
  const { search, category, energy, budget, view, sort } = state.filters;
  const term = search.trim().toLowerCase();

  let result = state.ideas.filter((idea) => {
    if (view === "active" && idea.archived) return false;
    if (view === "archived" && !idea.archived) return false;
    if (view === "favorites" && !idea.favorite) return false;
    if (view === "never" && idea.timesDone > 0) return false;
    if (view === "due" && repeatStatus(idea).level !== "hot") return false;
    if (category !== "all" && idea.category !== category) return false;
    if (energy !== "all" && idea.energyLevel !== energy) return false;
    if (budget !== "all" && idea.budgetLevel !== budget) return false;

    if (!term) return true;
    const haystack = [
      idea.title,
      idea.description,
      idea.category,
      idea.locationType,
      idea.idealMoment,
      ...(idea.tags || [])
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });

  result = [...result].sort((a, b) => {
    if (sort === "recommended") return scoreIdea(b, state.filters) - scoreIdea(a, state.filters);
    if (sort === "oldest") return (toDate(a.lastDoneAt)?.getTime() || 0) - (toDate(b.lastDoneAt)?.getTime() || 0);
    if (sort === "recent") return (toDate(b.lastDoneAt)?.getTime() || 0) - (toDate(a.lastDoneAt)?.getTime() || 0);
    if (sort === "rating") return (averageRating(b) || 0) - (averageRating(a) || 0);
    if (sort === "az") return String(a.title || "").localeCompare(String(b.title || ""), "es");
    return 0;
  });

  return result;
}

function monthlyLogs() {
  const now = new Date();
  return state.logs.filter((log) => {
    const date = toDate(log.dateAt);
    return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
}

function bestNextIdea() {
  const candidates = visibleIdeas().filter((idea) => !idea.archived);
  if (!candidates.length) return null;
  const top = [...candidates].sort((a, b) => scoreIdea(b, state.filters) - scoreIdea(a, state.filters)).slice(0, 5);
  return top[Math.floor(Math.random() * top.length)];
}

function render() {
  if (!state.firebaseReady) return renderConfigMissing();
  if (!state.authChecked) return renderLoading();
  if (!state.user) return renderLogin();
  return renderDashboard();
}

function renderConfigMissing() {
  app.innerHTML = `
    <section class="login-card">
      <div class="brand-badge">💜</div>
      <p class="eyebrow">Configuración pendiente</p>
      <h1>${APP_CONFIG.appName}</h1>
      <p>La app está lista, pero falta pegar la configuración real de Firebase en <code>src/config.js</code>. Sin eso, obviamente no hay nube, solo ilusión con CSS bonito.</p>
      <div class="setup-list">
        <p><strong>Pasos rápidos:</strong></p>
        <ol>
          <li>Crear proyecto en Firebase.</li>
          <li>Activar Authentication con Google.</li>
          <li>Crear Firestore Database.</li>
          <li>Pegar las reglas del archivo <code>firestore.rules</code>.</li>
          <li>Pegar el SDK config en <code>src/config.js</code>.</li>
        </ol>
      </div>
    </section>
  `;
}

function renderLoading() {
  app.innerHTML = `
    <section class="login-card">
      <div class="loader"></div>
      <h1>Cargando sus planes...</h1>
      <p>La app está revisando si son ustedes o un intruso con ganas de archivar helados.</p>
    </section>
  `;
}

function renderLogin() {
  app.innerHTML = `
    <section class="login-card">
      <div class="brand-badge">💜</div>
      <p class="eyebrow">App privada</p>
      <h1>${APP_CONFIG.appName}</h1>
      <p>Un lugar para guardar planes, repetir los que sí valen la pena y rescatar al cerebro cuando esté demasiado cansado para decidir.</p>
      <button class="primary big" data-action="login">Entrar con Google</button>
      <p class="tiny">Acceso permitido: ${APP_CONFIG.allowedEmails.map(escapeHtml).join(" · ")}</p>
    </section>
  `;
}

function renderDashboard() {
  const ideas = visibleIdeas();
  const allActive = activeIdeas();
  const dueCount = allActive.filter((idea) => repeatStatus(idea).level === "hot").length;
  const favoriteCount = allActive.filter((idea) => idea.favorite).length;
  const monthCount = monthlyLogs().length;
  const oldest = [...allActive].sort((a, b) => (toDate(a.lastDoneAt)?.getTime() || 0) - (toDate(b.lastDoneAt)?.getTime() || 0))[0];

  app.innerHTML = `
    <header class="topbar">
      <div>
        <p class="eyebrow">Alek + Cata</p>
        <h1>${APP_CONFIG.appName}</h1>
      </div>
      <div class="user-pill">
        ${state.user.photoURL ? `<img src="${state.user.photoURL}" alt="" />` : ""}
        <span>${escapeHtml(state.user.displayName || state.user.email)}</span>
        <button class="ghost small" data-action="logout">Salir</button>
      </div>
    </header>

    <section class="hero-panel">
      <div>
        <p class="eyebrow">Para cuando el cerebro dice “no más decisiones”</p>
        <h2>Elijan un plan sin hacer arqueología emocional de qué no han hecho hace rato.</h2>
        <p>La app calcula ideas pendientes, favoritas, repetibles y abandonadas por la agenda, esa criatura hostil.</p>
      </div>
      <div class="hero-actions">
        <button class="primary" data-action="surprise">✨ Sorpréndanos</button>
        <button class="secondary" data-action="new-idea">+ Nueva idea</button>
      </div>
    </section>

    <section class="stats-grid">
      <article class="stat-card">
        <span>${allActive.length}</span>
        <p>Ideas activas</p>
      </article>
      <article class="stat-card hot">
        <span>${dueCount}</span>
        <p>Para repetir</p>
      </article>
      <article class="stat-card">
        <span>${favoriteCount}</span>
        <p>Favoritas</p>
      </article>
      <article class="stat-card">
        <span>${monthCount}</span>
        <p>Planes este mes</p>
      </article>
      <article class="stat-card wide">
        <span>${oldest ? escapeHtml(oldest.title) : "Nada todavía"}</span>
        <p>${oldest ? relativeLastDone(oldest.lastDoneAt) : "Carguen ideas base para empezar"}</p>
      </article>
    </section>

    <section class="workspace">
      <aside class="filters-panel" id="filtersPanelEl">
        <button class="filters-toggle" data-action="toggle-filters" aria-expanded="false">
          <span>Filtros ${countActiveFilters() > 0 ? `<span class="filter-badge">${countActiveFilters()}</span>` : ""}</span>
          <span id="filtersToggleArrow">▼</span>
        </button>
        <div class="panel-title">
          <h2>Filtros</h2>
          ${(() => {
            const n = countActiveFilters();
            return `<button class="ghost small" data-action="reset-filters" ${n === 0 ? "disabled" : ""}>
              Limpiar${n > 0 ? ` <span class="filter-badge">${n}</span>` : ""}
            </button>`;
          })()}
        </div>

        <div class="filters-panel-inner">
          <label>
            Buscar
            <input id="filterSearch" value="${escapeHtml(state.filters.search)}" placeholder="helado, cine, moto..." />
          </label>

          <label>
            Vista
            <select id="filterView">
              ${option("active", "Activas", state.filters.view)}
              ${option("due", "Para repetir", state.filters.view)}
              ${option("favorites", "Favoritas", state.filters.view)}
              ${option("never", "Nunca hechas", state.filters.view)}
              ${option("archived", "Archivadas", state.filters.view)}
            </select>
          </label>

          <label>
            Categoría
            <select id="filterCategory">
              ${option("all", "Todas", state.filters.category)}
              ${APP_CONFIG.categories.map((item) => option(item, item, state.filters.category)).join("")}
            </select>
          </label>

          <label>
            Energía
            <select id="filterEnergy">
              ${option("all", "Todas", state.filters.energy)}
              ${APP_CONFIG.energyLevels.map((item) => option(item.value, item.label, state.filters.energy)).join("")}
            </select>
          </label>

          <label>
            Presupuesto
            <select id="filterBudget">
              ${option("all", "Todos", state.filters.budget)}
              ${APP_CONFIG.budgetLevels.map((item) => option(item.value, item.label, state.filters.budget)).join("")}
            </select>
          </label>

          <label>
            Ordenar
            <select id="filterSort">
              ${option("recommended", "Recomendado", state.filters.sort)}
              ${option("oldest", "Más olvidados", state.filters.sort)}
              ${option("recent", "Más recientes", state.filters.sort)}
              ${option("rating", "Mejor calificados", state.filters.sort)}
              ${option("az", "A-Z", state.filters.sort)}
            </select>
          </label>

          <button class="secondary full" data-action="seed">Cargar ideas base</button>
        </div>
      </aside>

      <section class="ideas-section">
        <div class="section-head">
          <div>
            <p class="eyebrow">${ideas.length} resultado${ideas.length === 1 ? "" : "s"}</p>
            <h2>Ideas de cita</h2>
          </div>
        </div>
        <div class="ideas-grid">
          ${ideas.length ? ideas.map(renderIdeaCard).join("") : renderEmptyState()}
        </div>
      </section>
    </section>

    <section class="history-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Memoria compartida</p>
          <h2>Últimos planes realizados</h2>
        </div>
      </div>
      ${(() => {
        const mLogs = monthlyLogs();
        const monthTotal = mLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0);
        const monthName = new Intl.DateTimeFormat("es-CO", { month: "long" }).format(new Date());
        return mLogs.length > 0
          ? `<div class="month-summary">
              <span>📅 <strong>${monthName.charAt(0).toUpperCase() + monthName.slice(1)}:</strong> ${mLogs.length} plan${mLogs.length === 1 ? "" : "es"}</span>
              ${monthTotal > 0 ? `<span>💸 Total gastado: <strong>${moneyCOP(monthTotal)}</strong></span>` : ""}
             </div>`
          : "";
      })()}
      <div class="history-list">
        ${state.logs.slice(0, state.historyVisible).map(renderLogItem).join("") || `<p class="empty-copy">Todavía no hay recuerdos guardados. Dramático, pero solucionable.</p>`}
        ${state.logs.length > state.historyVisible
          ? `<button class="ghost full" style="margin-top:10px" data-action="show-more-history">Ver más recuerdos (${state.logs.length - state.historyVisible} más)</button>`
          : ""}
      </div>
    </section>
  `;
}

function option(value, label, selectedValue) {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function renderIdeaCard(idea) {
  const status = repeatStatus(idea);
  const rating = averageRating(idea);
  const tags = Array.isArray(idea.tags) ? idea.tags : [];

  return `
    <article class="idea-card ${idea.favorite ? "favorite" : ""}" data-id="${idea.id}">
      <div class="idea-topline">
        <span class="chip ${status.level}">${escapeHtml(status.label)}</span>
        <button class="icon-button" data-action="toggle-favorite" data-id="${idea.id}" title="Favorita">${idea.favorite ? "♥" : "♡"}</button>
      </div>
      <h3>${escapeHtml(idea.title || "Plan sin nombre")}</h3>
      <p class="idea-description">${escapeHtml(idea.description || "Sin descripción. Misterio, el género favorito de la mala documentación.")}</p>
      <div class="meta-grid">
        <span>📍 ${escapeHtml(idea.locationType || "Sin lugar")}</span>
        <span>⚡ ${escapeHtml(labelFrom(APP_CONFIG.energyLevels, idea.energyLevel))}</span>
        <span>💸 ${escapeHtml(labelFrom(APP_CONFIG.budgetLevels, idea.budgetLevel))}</span>
        <span>⏱️ ${Number(idea.durationMinutes || 0) || "?"} min</span>
      </div>
      <div class="idea-metrics">
        <span>${relativeLastDone(idea.lastDoneAt)}</span>
        <span>${Number(idea.timesDone || 0)} vez${Number(idea.timesDone || 0) === 1 ? "" : "es"}</span>
        <span>${rating ? `★ ${rating.toFixed(1)}` : "Sin rating"}</span>
      </div>
      <div class="tag-row">
        <span class="tag">${APP_CONFIG.categoryIcons[idea.category] || APP_CONFIG.categoryIcons["Sin categoría"]} ${escapeHtml(idea.category || "Sin categoría")}</span>
        ${tags.slice(0, 4).map((tag) => `<span class="tag muted">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="card-actions">
        <button class="primary small" data-action="log" data-id="${idea.id}">Marcar hecho</button>
        <button class="ghost small" data-action="edit" data-id="${idea.id}">Editar</button>
        <button class="ghost small" data-action="archive" data-id="${idea.id}">${idea.archived ? "Restaurar" : "Archivar"}</button>
      </div>
    </article>
  `;
}

function renderLogItem(log) {
  return `
    <article class="history-item">
      <div>
        <h3>${escapeHtml(log.ideaTitle || "Plan")}</h3>
        <p>${formatDate(log.dateAt)} · ${escapeHtml(log.mood || "Sin mood")} · ★ ${Number(log.rating || 0)}</p>
        ${log.note ? `<p class="history-note">${escapeHtml(log.note)}</p>` : ""}
      </div>
      <span>${moneyCOP(log.cost)}</span>
    </article>
  `;
}

function renderEmptyState() {
  return `
    <div class="empty-state">
      <div>🧺</div>
      <h3>No hay ideas con esos filtros</h3>
      <p>O los filtros están muy exigentes, o la vida social fue archivada accidentalmente.</p>
      <button class="secondary" data-action="new-idea">Crear una idea</button>
    </div>
  `;
}

function updateSubscriptions() {
  state.unsubIdeas?.();
  state.unsubLogs?.();

  if (!state.user) return;

  state.unsubIdeas = observeIdeas(
    (ideas) => {
      state.ideas = ideas;
      render();
    },
    (error) => showToast(error.message, "error")
  );

  state.unsubLogs = observeLogs(
    (logs) => {
      state.logs = logs;
      render();
    },
    (error) => showToast(error.message, "error")
  );
}

function openIdeaModal(ideaId = null) {
  const idea = ideaId ? state.ideas.find((item) => item.id === ideaId) : null;
  document.querySelector("#ideaDialogTitle").textContent = idea ? "Editar idea" : "Nueva idea";
  document.querySelector("#ideaId").value = idea?.id || "";
  document.querySelector("#title").value = idea?.title || "";
  document.querySelector("#category").value = idea?.category || "";
  document.querySelector("#budgetLevel").value = idea?.budgetLevel || "bajo";
  document.querySelector("#energyLevel").value = idea?.energyLevel || "baja";
  document.querySelector("#durationMinutes").value = idea?.durationMinutes || "";
  document.querySelector("#repeatEveryDays").value = idea?.repeatEveryDays || "";
  document.querySelector("#locationType").value = idea?.locationType || "";
  document.querySelector("#idealMoment").value = idea?.idealMoment || "";
  document.querySelector("#tags").value = tagsToText(idea?.tags || []);
  document.querySelector("#description").value = idea?.description || "";
  document.querySelector("#favorite").checked = Boolean(idea?.favorite);
  document.querySelector("#archived").checked = Boolean(idea?.archived);
  ideaDialog.showModal();
  attachCharCounters();
}

function openLogModal(ideaId) {
  const idea = state.ideas.find((item) => item.id === ideaId);
  if (!idea) return;
  document.querySelector("#logDialogTitle").textContent = `Marcar: ${idea.title}`;
  document.querySelector("#logIdeaId").value = idea.id;
  document.querySelector("#dateAt").value = todayInputValue();
  document.querySelector("#rating").value = "5";
  document.querySelector("#mood").value = "";
  document.querySelector("#cost").value = "";
  document.querySelector("#note").value = "";
  logDialog.showModal();
  attachCharCounters();
  attachStarRating();
}

function surpriseMe() {
  const idea = bestNextIdea();
  if (!idea) {
    showToast("No encontré ideas con esos filtros. Qué tragedia de catálogo vacío.", "error");
    return;
  }

  state.filters.search = "";
  render();
  window.setTimeout(() => {
    const card = document.querySelector(`[data-id="${idea.id}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    card?.classList.add("pulse");
    window.setTimeout(() => card?.classList.remove("pulse"), 1200);
    showToast(`Plan sugerido: ${idea.title}`, "success");
  }, 50);
}

function resetFilters() {
  state.filters = {
    search: "",
    category: "all",
    energy: "all",
    budget: "all",
    view: "active",
    sort: "recommended"
  };
  render();
}

app.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const id = event.target.closest("[data-id]")?.dataset.id;
  if (!action) return;

  try {
    if (action === "login") await loginWithGoogle();
    if (action === "logout") await logout();
    if (action === "new-idea") openIdeaModal();
    if (action === "edit") openIdeaModal(id);
    if (action === "log") openLogModal(id);
    if (action === "archive") {
      const idea = state.ideas.find((item) => item.id === id);
      await archiveIdea(id, !idea.archived);
      showToast(idea.archived ? "Idea restaurada" : "Idea archivada", "success");
    }
    if (action === "toggle-favorite") {
      const idea = state.ideas.find((item) => item.id === id);
      await saveIdea(id, { ...idea, favorite: !idea.favorite }, state.user);
    }
    if (action === "seed") {
      await seedStarterIdeas(state.user);
      showToast("Ideas base cargadas. Ya no hay excusa para decir ‘no sé’.", "success");
    }
    if (action === "surprise") surpriseMe();
    if (action === "reset-filters") resetFilters();
    if (action === "show-more-history") {
      state.historyVisible += 8;
      render();
    }
    if (action === "toggle-filters") {
      const panel = document.querySelector("#filtersPanelEl");
      const arrow = document.querySelector("#filtersToggleArrow");
      if (!panel) return;
      panel.classList.toggle("expanded");
      const isExpanded = panel.classList.contains("expanded");
      event.target.closest("button")?.setAttribute("aria-expanded", isExpanded);
      if (arrow) arrow.textContent = isExpanded ? "▲" : "▼";
    }
  } catch (error) {
    showToast(error.message, "error");
  }
});

const debouncedSearch = debounce((value) => {
  state.filters.search = value;
  render();
}, 300);

app.addEventListener("input", (event) => {
  const map = {
    filterView: "view",
    filterCategory: "category",
    filterEnergy: "energy",
    filterBudget: "budget",
    filterSort: "sort"
  };
  if (event.target.id === "filterSearch") {
    debouncedSearch(event.target.value);
    return;
  }
  const key = map[event.target.id];
  if (!key) return;
  state.filters[key] = event.target.value;
  render();
});

document.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-modal]")) {
    event.target.closest("dialog")?.close();
  }
});

ideaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const ideaId = document.querySelector("#ideaId").value;
  const data = {
    title: document.querySelector("#title").value.trim(),
    category: document.querySelector("#category").value.trim() || "Sin categoría",
    budgetLevel: document.querySelector("#budgetLevel").value,
    energyLevel: document.querySelector("#energyLevel").value,
    durationMinutes: Number(document.querySelector("#durationMinutes").value || 0),
    repeatEveryDays: Number(document.querySelector("#repeatEveryDays").value || 0),
    locationType: document.querySelector("#locationType").value.trim(),
    idealMoment: document.querySelector("#idealMoment").value.trim(),
    tags: parseTags(document.querySelector("#tags").value),
    description: document.querySelector("#description").value.trim(),
    favorite: document.querySelector("#favorite").checked,
    archived: document.querySelector("#archived").checked
  };

  try {
    await saveIdea(ideaId, data, state.user);
    ideaDialog.close();
    showToast("Idea guardada", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
});

logForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const ideaId = document.querySelector("#logIdeaId").value;
  const idea = state.ideas.find((item) => item.id === ideaId);
  if (!idea) return;

  const data = {
    dateAt: document.querySelector("#dateAt").value,
    rating: document.querySelector("#rating").value,
    mood: document.querySelector("#mood").value.trim(),
    cost: document.querySelector("#cost").value,
    note: document.querySelector("#note").value.trim()
  };

  try {
    await logIdeaDone(idea, data, state.user);
    logDialog.close();
    showToast("Recuerdo guardado 🎉", "success");
    launchConfetti();
  } catch (error) {
    showToast(error.message, "error");
  }
});

function boot() {
  setupStaticFormOptions();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  }

  if (!hasValidFirebaseConfig()) {
    state.firebaseReady = false;
    render();
    return;
  }

  initFirebase();
  state.firebaseReady = true;

  listenAuth((user) => {
    state.authChecked = true;

    if (user && isAllowedEmail(user.email)) {
      state.user = user;
      updateSubscriptions();
    } else {
      if (user) logout();
      state.user = null;
      state.ideas = [];
      state.logs = [];
      state.historyVisible = 8;
      state.unsubIdeas?.();
      state.unsubLogs?.();
      render();
    }
  });
}

boot();
