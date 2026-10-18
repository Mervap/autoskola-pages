(() => {
  "use strict";
  const updateTableHints = () => document.querySelectorAll(".table-wrap").forEach(table => {
    table.dataset.overflow = String(table.clientWidth > 0 && table.scrollWidth > table.clientWidth + 1);
  });
  window.addEventListener("resize", updateTableHints);
  updateTableHints();
  const storageKey = "autoskola:favorites:v1";
  let favorites;
  try { favorites = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]")); }
  catch { favorites = new Set(); }
  const cyrillic = {а:"a",б:"b",в:"v",г:"g",д:"d",ђ:"dj",е:"e",ж:"z",з:"z",и:"i",ј:"j",к:"k",л:"l",љ:"lj",м:"m",н:"n",њ:"nj",о:"o",п:"p",р:"r",с:"s",т:"t",ћ:"c",у:"u",ф:"f",х:"h",ц:"c",ч:"c",џ:"dz",ш:"s",ь:"",ы:"y",ъ:"",э:"e",ю:"ju",я:"ja",ё:"e",й:"j",щ:"sc"};
  const normalize = text => [...text.toLowerCase()].map(c => cyrillic[c] ?? c).join("").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "dj");
  const syncStars = () => document.querySelectorAll("[data-bookmark]").forEach(button => {
    const saved = favorites.has(button.dataset.bookmark);
    button.setAttribute("aria-pressed", String(saved));
    button.classList.toggle("saved", saved);
    const title = button.getAttribute("aria-label").replace(/^(В избранное|Убрать из избранного): /, "");
    button.setAttribute("aria-label", `${saved ? "Убрать из избранного" : "В избранное"}: ${title}`);
  });
  let updateResults = () => {};
  document.querySelectorAll("[data-bookmark]").forEach(button => button.addEventListener("click", () => {
    const slug = button.dataset.bookmark;
    favorites.has(slug) ? favorites.delete(slug) : favorites.add(slug);
    try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); } catch {}
    syncStars(); updateResults();
  }));
  syncStars();
  window.addEventListener("storage", event => {
    if (event.key !== storageKey) return;
    try { favorites = new Set(JSON.parse(event.newValue || "[]")); } catch { favorites = new Set(); }
    syncStars(); updateResults();
  });

  const input = document.querySelector("#search");
  if (input) {
    const cards = [...document.querySelectorAll(".topic-card")];
    const filters = [...document.querySelectorAll("[data-filter]")];
    const favoriteButton = document.querySelector(".favorites-filter");
    const count = document.querySelector("#result-count");
    const empty = document.querySelector(".empty-state");
    let category = "Все", onlyFavorites = false;
    const index = new Map(cards.map(card => [card.dataset.slug, normalize(card.dataset.search)]));
    updateResults = () => {
      const terms = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
      let visible = 0;
      cards.forEach(card => {
        const matches = (category === "Все" || card.dataset.category === category)
          && (!onlyFavorites || favorites.has(card.dataset.slug))
          && terms.every(term => (index.get(card.dataset.slug) || "").includes(term));
        card.hidden = !matches;
        if (matches) visible++;
      });
      empty.hidden = visible > 0;
      count.textContent = visible === cards.length && !terms.length && category === "Все" && !onlyFavorites ? `Все ${cards.length} тем` : `Найдено тем: ${visible}`;
      if (onlyFavorites && favorites.size === 0) empty.querySelector("p").textContent = "Добавь тему в избранное кнопкой со звёздочкой.";
      else empty.querySelector("p").textContent = "Попробуй другое слово или выбери «Все».";
    };
    input.addEventListener("input", updateResults);
    filters.forEach(button => button.addEventListener("click", () => {
      category = button.dataset.filter;
      filters.forEach(filter => {
        const active = filter === button;
        filter.classList.toggle("active", active);
        filter.setAttribute("aria-pressed", String(active));
      });
      updateResults();
    }));
    favoriteButton.addEventListener("click", () => {
      onlyFavorites = !onlyFavorites;
      favoriteButton.setAttribute("aria-pressed", String(onlyFavorites));
      updateResults();
    });
    document.querySelector("#reset-filters").addEventListener("click", () => {
      input.value = ""; onlyFavorites = false;
      favoriteButton.setAttribute("aria-pressed", "false");
      filters[0].click(); input.focus();
    });
    fetch("search-index.json").then(response => {
      if (!response.ok) throw new Error("Search index unavailable");
      return response.json();
    }).then(rows => { rows.forEach(row => index.set(row.slug, normalize(row.text))); updateResults(); }).catch(() => {});
  }

  const questionInput = document.querySelector("#question-search");
  if (questionInput) {
    const cards = [...document.querySelectorAll(".question-card")];
    const groups = [...document.querySelectorAll(".question-group")];
    const questionText = new Map(cards.map(card => [card, normalize(card.textContent)]));
    const updateQuestions = () => {
      const terms = normalize(questionInput.value.trim()).split(/\s+/).filter(Boolean);
      let visible = 0;
      cards.forEach(card => {
        card.hidden = !terms.every(term => questionText.get(card).includes(term));
        if (!card.hidden) visible++;
      });
      groups.forEach(group => { group.hidden = ![...group.querySelectorAll(".question-card")].some(card => !card.hidden); });
      document.querySelector("#question-count").textContent = visible ? `Найдено вопросов: ${visible}` : "Не нашлось. Попробуй другое слово или номер.";
    };
    questionInput.addEventListener("input", updateQuestions);
    document.querySelectorAll(".question-nav a").forEach(link => link.addEventListener("click", () => {
      questionInput.value = ""; updateQuestions();
    }));
  }

  const tabs = [...document.querySelectorAll("[data-tab]")];
  if (tabs.length) {
    const showView = () => {
      const hash = decodeURIComponent(location.hash.slice(1));
      const target = hash ? document.getElementById(hash) : null;
      const view = hash === "notes" || target?.closest("#notes") ? "notes" : "summary";
      tabs.forEach(tab => {
        const active = tab.dataset.tab === view;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        document.getElementById(tab.dataset.tab).hidden = !active;
      });
      if (target && hash !== "summary" && hash !== "notes") target.scrollIntoView();
      updateTableHints();
    };
    tabs.forEach((tab, position) => {
      tab.addEventListener("click", () => { history.replaceState(null, "", `#${tab.dataset.tab}`); showView(); });
      tab.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (position + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
        tabs[next].click(); tabs[next].focus();
      });
    });
    window.addEventListener("hashchange", showView);
    showView();
  }
})();
