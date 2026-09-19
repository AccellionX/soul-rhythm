const STATE_KEY = "sr_state";
const SOUND_KEY = "sr_sounds";

const FILTER_SLUGS = {
  All: null,
  Books: "book",
  Films: "film",
  Series: "series",
  New: "new",
  Recommended: "recommended"
};

const SLUG_FILTERS = {
  book: "Books",
  books: "Books",
  film: "Films",
  films: "Films",
  movie: "Films",
  movies: "Films",
  series: "Series",
  streaming: "Series",
  new: "New",
  recommended: "Recommended",
  all: "All"
};

const SCENE_AUDIO = {
  neighborhood: "neighborhood",
  porch: "porch",
  "meet-lori": "porch",
  journey: "pond",
  stories: "study",
  "stories-collection": "study",
  "story-item": "study",
  consulting: "garage",
  "thank-you": "porch"
};

const app = document.getElementById("app");
const menuBtn = document.getElementById("menu-btn");
const welcomeBack = document.getElementById("welcome-back");
const quickAccess = document.getElementById("quick-access");
const whereTo = document.getElementById("where-to");
const bagDrawer = document.getElementById("bag-drawer");
const sheetBackdrop = document.getElementById("sheet-backdrop");
const soundsToggle = document.getElementById("sounds-toggle");

let content = null;
let currentScreen = null;
let currentItemId = null;
let journeyTimer = 0;
let walkTimer = 0;
let lastFocus = null;
let storyObserver = null;
let parallaxEl = null;
let parallaxFrom = { x: 0, y: 0 };
let parallaxTo = { x: 0, y: 0 };
let parallaxRaf = 0;
let bag = [];
let soundsOn = false;
let audioA = null;
let audioB = null;
let activeAudio = null;
let fadeTimer = 0;
let editorGroup = "Welcome";
let openSheet = null;

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function calendly() {
  return (content && content.meta && content.meta.calendly) || "https://calendly.com";
}

function getState() {
  try {
    return window.localStorage.getItem(STATE_KEY);
  } catch (err) {
    return null;
  }
}

function setState(value) {
  try {
    if (value === "introduced" && getState() === "explored") return;
    window.localStorage.setItem(STATE_KEY, value);
  } catch (err) {
    /* private mode */
  }
}

function clearState() {
  try {
    window.localStorage.removeItem(STATE_KEY);
  } catch (err) {
    /* ignore */
  }
}

function getPath(obj, path) {
  return String(path).split(".").reduce(function (acc, key) {
    return acc == null ? undefined : acc[key];
  }, obj);
}

function setPath(obj, path, value) {
  const parts = String(path).split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeHash(hash) {
  const value = hash == null ? window.location.hash : hash;
  if (!value || value === "#") return "#/";
  return value;
}

function isHomeLanding() {
  const hash = window.location.hash;
  return !hash || hash === "#" || hash === "#/";
}

function slugToFilter(slug) {
  return SLUG_FILTERS[String(slug || "").toLowerCase()] || "All";
}

function routeHash(name, extras) {
  if (name === "story-item" && extras && extras.itemId) {
    return "#/stories/item/" + extras.itemId;
  }
  if (name === "thank-you") return "#/thank-you";
  if (name === "edit-preview") return "#/edit-preview";
  const routes = {
    neighborhood: "#/",
    porch: "#/porch",
    "meet-lori": "#/meet-lori",
    journey: "#/journey",
    stories: "#/stories",
    "stories-collection": "#/stories/collection",
    consulting: "#/consulting"
  };
  let hash = routes[name] || "#/";
  if (name === "stories-collection" && extras && extras.filter) {
    const slug = FILTER_SLUGS[extras.filter];
    if (slug) hash += "?format=" + slug;
  }
  return hash;
}

function parseHash() {
  const raw = (window.location.hash || "").replace(/^#/, "");
  if (!raw || raw === "/") return { screen: "neighborhood", filter: "All" };

  const split = raw.indexOf("?");
  let path = (split === -1 ? raw : raw.slice(0, split)).toLowerCase();
  const query = split === -1 ? "" : raw.slice(split + 1);
  if (path.charAt(0) !== "/") path = "/" + path;
  if (path.length > 1) path = path.replace(/\/+$/, "");

  let filter = "All";
  if (path === "/stories/collection" && query) {
    query.split("&").forEach(function (part) {
      const pair = part.split("=");
      if (decodeURIComponent(pair[0] || "") === "format") {
        filter = slugToFilter(decodeURIComponent(pair[1] || ""));
      }
    });
  }

  const itemMatch = path.match(/^\/stories\/item\/([^/]+)$/);
  if (itemMatch) return { screen: "story-item", itemId: itemMatch[1], filter: "All" };

  const screens = {
    "/porch": "porch",
    "/meet-lori": "meet-lori",
    "/journey": "journey",
    "/stories": "stories",
    "/stories/collection": "stories-collection",
    "/consulting": "consulting",
    "/thank-you": "thank-you",
    "/edit-preview": "edit-preview"
  };

  return { screen: screens[path] || "neighborhood", filter: filter };
}

function go(name, extras) {
  closeSheets();
  const next = routeHash(name, extras);
  if (normalizeHash() === next) {
    applyRoute(parseHash());
    return;
  }
  window.location.hash = next;
}

function applyRoute(route) {
  if (route.screen === "stories-collection") {
    const changed = getActiveFilter() !== route.filter;
    setCollectionFilter(route.filter);
    renderStories({
      crossfade: currentScreen === "stories-collection" && changed,
      observe: currentScreen === "stories-collection"
    });
  }
  if (route.screen === "story-item") currentItemId = route.itemId;
  showScreen(route.screen);
}

function onHashChange() {
  applyRoute(parseHash());
}

function applyCopy() {
  document.querySelectorAll("[data-copy]").forEach(function (el) {
    const value = getPath(content, el.getAttribute("data-copy"));
    if (value != null) el.textContent = value;
  });
  const search = document.getElementById("story-search");
  if (search) search.placeholder = content.stories.searchPlaceholder;
  const talk = document.getElementById("meet-talk");
  if (talk) talk.href = calendly();
  const wb1 = document.querySelector(".wb-s1");
  const wb2 = document.querySelector(".wb-s2");
  const wb3 = document.querySelector(".wb-s3");
  if (wb1) wb1.textContent = content.consulting.line1;
  if (wb2) wb2.textContent = content.consulting.line2;
  if (wb3) wb3.textContent = content.consulting.line3;
  const title = document.querySelector(".wb-svg title");
  if (title) title.textContent = content.consulting.line1 + " " + content.consulting.line2 + " " + content.consulting.line3;
}

function stories() {
  return content.stories.items;
}

function findStory(id) {
  return stories().filter(function (item) {
    return item.id === id;
  })[0] || stories()[0];
}

function wrapSceneMedia() {
  document.querySelectorAll(".scene > .scene-frame, .scene > .scene-photo").forEach(function (media) {
    if (media.closest(".scene-arrive")) return;
    const parallax = document.createElement("div");
    parallax.className = "scene-parallax";
    const arrive = document.createElement("div");
    arrive.className = "scene-arrive";
    const soft = media.cloneNode(true);
    const softImg = soft.tagName === "PICTURE" ? soft.querySelector("img") : soft;
    softImg.classList.add("scene-photo--soft");
    softImg.alt = "";
    softImg.removeAttribute("fetchpriority");
    soft.setAttribute("aria-hidden", "true");
    media.parentNode.insertBefore(parallax, media);
    parallax.appendChild(arrive);
    arrive.appendChild(media);
    arrive.appendChild(soft);

    const light = document.createElement("div");
    light.className = "living-light";
    light.setAttribute("aria-hidden", "true");
    parallax.parentNode.insertBefore(light, parallax.nextSibling);
  });

  const pondScene = document.querySelector('[data-screen="journey"] .scene');
  if (pondScene && !pondScene.querySelector(".pond-shimmer")) {
    const shimmer = document.createElement("div");
    shimmer.className = "pond-shimmer";
    shimmer.setAttribute("aria-hidden", "true");
    pondScene.appendChild(shimmer);
  }
}

function canParallax() {
  return !reduceMotion() && window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)").matches;
}

function setParallaxScene(screenEl) {
  parallaxTo = { x: 0, y: 0 };
  parallaxFrom = { x: 0, y: 0 };
  if (parallaxEl) parallaxEl.style.transform = "";
  parallaxEl = screenEl && canParallax() ? screenEl.querySelector(".scene-parallax") : null;
  if (!canParallax()) {
    if (parallaxRaf) {
      window.cancelAnimationFrame(parallaxRaf);
      parallaxRaf = 0;
    }
    return;
  }
  if (!parallaxRaf) parallaxRaf = window.requestAnimationFrame(tickParallax);
}

function tickParallax() {
  parallaxFrom.x += (parallaxTo.x - parallaxFrom.x) * 0.07;
  parallaxFrom.y += (parallaxTo.y - parallaxFrom.y) * 0.07;
  if (parallaxEl) {
    parallaxEl.style.transform = "translate3d(" + parallaxFrom.x.toFixed(2) + "px," + parallaxFrom.y.toFixed(2) + "px,0)";
  }
  parallaxRaf = window.requestAnimationFrame(tickParallax);
}

function onPointerMove(event) {
  if (!parallaxEl || !canParallax()) return;
  const rect = parallaxEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const nx = (event.clientX - rect.left) / rect.width - 0.5;
  const ny = (event.clientY - rect.top) / rect.height - 0.5;
  parallaxTo.x = Math.max(-8, Math.min(8, -nx * 8));
  parallaxTo.y = Math.max(-8, Math.min(8, -ny * 8));
}

function playWhiteboard() {
  const board = document.getElementById("whiteboard");
  if (!board) return;
  board.classList.remove("is-drawing");
  if (!reduceMotion()) void board.offsetWidth;
  board.classList.add("is-drawing");
}

function observeStoryCards() {
  if (storyObserver) storyObserver.disconnect();
  const cards = document.querySelectorAll(".story-card");
  if (reduceMotion()) {
    cards.forEach(function (card) {
      card.classList.add("is-in");
    });
    return;
  }
  const root = document.querySelector('[data-screen="stories-collection"]');
  storyObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      storyObserver.unobserve(entry.target);
    });
  }, { root: root, threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  cards.forEach(function (card, index) {
    card.style.transitionDelay = index * 0.08 + "s";
    storyObserver.observe(card);
  });
}

function playArrival(screenEl) {
  if (!screenEl) return;
  screenEl.querySelectorAll(".scene-arrive").forEach(function (el) {
    el.classList.remove("is-settled", "is-walking");
    el.style.transformOrigin = "";
    if (reduceMotion()) {
      el.classList.add("is-settled");
      return;
    }
    void el.offsetWidth;
    el.classList.add("is-settled");
  });

  const porch = screenEl.querySelector(".porch-stage");
  if (porch) {
    porch.classList.remove("is-revealed");
    if (!reduceMotion()) void porch.offsetWidth;
    porch.classList.add("is-revealed");
  }

  if (screenEl.getAttribute("data-screen") === "consulting") playWhiteboard();
  if (screenEl.getAttribute("data-screen") === "stories-collection") observeStoryCards();
  setParallaxScene(screenEl);
}

function walkThenGo(screenEl, origin, nextName) {
  if (reduceMotion() || !screenEl) {
    go(nextName);
    return;
  }
  const arrive = screenEl.querySelector(".scene-arrive");
  if (!arrive) {
    go(nextName);
    return;
  }
  window.clearTimeout(walkTimer);
  arrive.style.transformOrigin = origin.x + "% " + origin.y + "%";
  arrive.classList.add("is-walking");
  screenEl.classList.add("is-leaving");
  walkTimer = window.setTimeout(function () {
    arrive.classList.remove("is-walking");
    arrive.style.transformOrigin = "";
    screenEl.classList.remove("is-leaving");
    go(nextName);
  }, 700);
}

function parseWalk(value) {
  if (!value) return null;
  const parts = value.split(",");
  if (parts.length < 2) return null;
  return { x: Number(parts[0]), y: Number(parts[1]) };
}

function wrapWordGroups(text, size, pause) {
  const words = String(text).trim().split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks.map(function (chunk, index) {
    const space = index < chunks.length - 1 ? " " : "";
    return '<span class="word-group" style="animation-delay:' + (index * pause).toFixed(2) + 's">' + escapeHtml(chunk) + space + "</span>";
  }).join("");
}

function groupDelay(text, size, pause) {
  return Math.ceil(String(text).trim().split(/\s+/).length / size) * pause;
}

function bindScenePhotos() {
  document.querySelectorAll(".scene-photo").forEach(function (img) {
    const show = function () {
      img.classList.add("is-ready");
    };
    const hide = function () {
      img.classList.add("is-missing");
    };
    if (img.complete) {
      if (img.naturalWidth > 0) show();
      else hide();
      return;
    }
    img.addEventListener("load", show);
    img.addEventListener("error", hide);
  });
}

function twoLineLabel(name, detail) {
  return "<span>" + escapeHtml(name) + "</span><small>· " + escapeHtml(detail) + "</small>";
}

function renderHotspots() {
  const mount = document.getElementById("hotspots");
  mount.innerHTML = content.porch.hotspots.map(function (spot) {
    const pulse = spot.pulse ? " hotspot--pulse" : "";
    const edge = spot.x >= 80 ? " hotspot--right" : spot.x <= 14 ? " hotspot--left" : "";
    return (
      '<button type="button" class="hotspot' + pulse + edge + '" style="left:' + spot.x + "%;top:" + spot.y + '%" data-go="' + spot.target + '">' +
        '<span class="hotspot-dot" aria-hidden="true"></span>' +
        '<span class="hotspot-label">' + twoLineLabel(spot.name, spot.detail) + "</span>" +
      "</button>"
    );
  }).join("");
}

function renderPorchNav() {
  document.getElementById("porch-nav").innerHTML = content.porch.hotspots.map(function (spot) {
    return '<button type="button" data-go="' + spot.target + '">' + twoLineLabel(spot.name, spot.detail) + "</button>";
  }).join("");
}

function renderWhereTo() {
  const w = content.whereTo;
  const large = [
    { go: "porch", name: w.porch.name, detail: w.porch.detail, thumb: "porch", icon: "⌂" },
    { go: "journey", name: w.journey.name, detail: w.journey.detail, thumb: "pond", icon: "◎" },
    { go: "stories", name: w.stories.name, detail: w.stories.detail, thumb: "study", icon: "▣" },
    { go: "consulting", name: w.consulting.name, detail: w.consulting.detail, thumb: "garage", icon: "✎" }
  ];
  document.getElementById("where-large").innerHTML = large.map(function (row) {
    return (
      '<button type="button" class="where-row where-row--large" data-go="' + row.go + '">' +
        '<span class="where-thumb scene--' + row.thumb + '">' +
          '<span class="scene-ph">' + escapeHtml(row.detail) + "</span>" +
          '<img src="images/' + row.thumb + '.jpg" alt="" width="160" height="100">' +
        "</span>" +
        '<span class="where-icon" aria-hidden="true">' + row.icon + "</span>" +
        "<div><strong>" + escapeHtml(row.name) + "</strong><span>" + escapeHtml(row.detail) + "</span></div>" +
      "</button>"
    );
  }).join("");

  const count = bagCount();
  const bagDetail = count ? String(count) + (count === 1 ? " item" : " items") : w.bag.empty;
  document.getElementById("where-small").innerHTML =
    '<button type="button" class="where-row" data-go="meet-lori"><span class="where-icon" aria-hidden="true">♡</span><div><strong>' + escapeHtml(w.meet.name) + "</strong><span>" + escapeHtml(w.meet.detail) + "</span></div></button>" +
    '<button type="button" class="where-row" id="where-bag"><span class="where-icon" aria-hidden="true">○</span><div><strong>' + escapeHtml(w.bag.name) + "</strong><span>" + escapeHtml(bagDetail) + "</span></div></button>" +
    '<button type="button" class="where-row" data-go="neighborhood"><span class="where-icon" aria-hidden="true">◌</span><div><strong>' + escapeHtml(w.neighborhood.name) + "</strong><span>" + escapeHtml(w.neighborhood.detail) + "</span></div></button>";

  document.getElementById("say-hello").innerHTML =
    "<h3>" + escapeHtml(content.contact.heading) + "</h3>" +
    '<a href="mailto:' + escapeHtml(content.contact.email) + '">' + escapeHtml(content.contact.email) + "</a>" +
    '<a href="' + escapeHtml(content.contact.instagram) + '" target="_blank" rel="noopener noreferrer">Instagram</a>' +
    '<a href="' + escapeHtml(content.contact.facebook) + '" target="_blank" rel="noopener noreferrer">Facebook</a>' +
    '<a href="' + escapeHtml(content.contact.youtube) + '" target="_blank" rel="noopener noreferrer">YouTube</a>';

  document.getElementById("visit-card").innerHTML =
    "<h3>" + escapeHtml(content.visit.heading) + "</h3>" +
    "<p>" + escapeHtml(content.visit.body) + "</p>" +
    '<button type="button" class="text-link" id="forget-visit">' + escapeHtml(content.visit.forget) + "</button>";
}

function renderStoryChrome() {
  document.getElementById("story-quick-links").innerHTML = content.stories.quickLinks.map(function (link) {
    return '<button type="button" data-go="stories-collection" data-filter="' + escapeHtml(link.filter) + '">' + escapeHtml(link.label) + "</button>";
  }).join("");
  document.getElementById("story-filters").innerHTML = content.stories.filters.map(function (name, index) {
    const on = index === 0;
    return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-filter="' + escapeHtml(name) + '" aria-pressed="' + (on ? "true" : "false") + '">' + escapeHtml(name) + "</button>";
  }).join("");
}

function getActiveFilter() {
  const on = document.querySelector(".chip.is-on");
  return on ? on.getAttribute("data-filter") : "All";
}

function setCollectionFilter(filter) {
  document.querySelectorAll(".chip").forEach(function (btn) {
    const on = btn.getAttribute("data-filter") === filter;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function storyMatches(item, query, filter) {
  const hay = (item.title + " " + item.author + " " + item.line + " " + item.note).toLowerCase();
  if (query && hay.indexOf(query) === -1) return false;
  if (filter === "All") return true;
  if (filter === "Recommended") return item.lorisPick || item.tags.indexOf("Recommended") !== -1;
  if (filter === "New") return item.tags.indexOf("New") !== -1;
  return item.format === filter || item.tags.indexOf(filter) !== -1;
}

function cardMarkup(item, featured) {
  const index = stories().indexOf(item);
  const pick = item.lorisPick ? '<p class="pick-tag">' + escapeHtml(content.stories.lorisPick) + "</p>" : "";
  const price = item.forSale ? item.price : item.price;
  return (
    '<article class="story-card' + (featured ? " story-card--featured" : "") + '">' +
      '<div class="cover cover-' + index + '" aria-hidden="true">' + escapeHtml(item.format) + "</div>" +
      '<div class="story-card-body">' +
        pick +
        "<h2>" + escapeHtml(item.title) + "</h2>" +
        "<p>" + escapeHtml(item.author) + "</p>" +
        "<p>" + escapeHtml(item.line) + "</p>" +
        '<p class="story-meta">' + escapeHtml(price) + "</p>" +
        '<button type="button" class="btn" data-go-item="' + escapeHtml(item.id) + '">View</button>' +
      "</div>" +
    "</article>"
  );
}

function renderStories(options) {
  const query = document.getElementById("story-search").value.trim().toLowerCase();
  const filter = getActiveFilter();
  const grid = document.getElementById("story-grid");
  const featuredRow = document.getElementById("featured-row");
  const featuredTitle = document.getElementById("featured-title");
  const empty = document.getElementById("story-empty");
  const items = stories().filter(function (item) {
    return storyMatches(item, query, filter);
  });
  const featured = items.filter(function (item) {
    return item.featured;
  });
  const rest = items.filter(function (item) {
    return !item.featured;
  });
  const apply = function () {
    featuredTitle.textContent = content.stories.featuredTitle;
    featuredTitle.hidden = featured.length === 0;
    featuredRow.innerHTML = featured.map(function (item) {
      return cardMarkup(item, true);
    }).join("");
    grid.innerHTML = rest.map(function (item) {
      return cardMarkup(item, false);
    }).join("");
    empty.textContent = content.stories.empty;
    empty.hidden = items.length > 0;
    if (currentScreen === "stories-collection" || (options && options.observe)) {
      observeStoryCards();
    }
  };
  if (options && options.crossfade && !reduceMotion()) {
    grid.classList.add("is-fading");
    featuredRow.classList.add("is-fading");
    window.setTimeout(function () {
      apply();
      window.requestAnimationFrame(function () {
        grid.classList.remove("is-fading");
        featuredRow.classList.remove("is-fading");
      });
    }, 240);
    return;
  }
  apply();
}

function renderItem(id) {
  const item = findStory(id);
  currentItemId = item.id;
  const index = stories().indexOf(item);
  const action = item.forSale
    ? '<button type="button" class="btn" data-add-bag="' + escapeHtml(item.id) + '">' + escapeHtml(content.stories.addToBag) + "</button>"
    : '<button type="button" class="btn" data-where="' + escapeHtml(item.id) + '">' + escapeHtml(content.stories.whereTo) + "</button>" +
      '<p class="store-note" id="where-note" hidden>' + escapeHtml(content.stories.whereNote) + "</p>";
  document.getElementById("item-page").innerHTML =
    '<button type="button" class="text-link" data-go="stories-collection">' + escapeHtml(content.stories.continue) + "</button>" +
    '<div class="item-cover cover cover-' + index + '" aria-hidden="true">' + escapeHtml(item.format) + "</div>" +
    (item.lorisPick ? '<p class="pick-tag">' + escapeHtml(content.stories.lorisPick) + "</p>" : "") +
    "<h1>" + escapeHtml(item.title) + "</h1>" +
    '<p class="item-author">' + escapeHtml(item.author) + "</p>" +
    "<p>" + escapeHtml(item.note) + "</p>" +
    '<p class="story-meta">' + escapeHtml(item.price) + "</p>" +
    action;
}

function bagCount() {
  return bag.reduce(function (sum, line) {
    return sum + line.qty;
  }, 0);
}

function bagTotal() {
  return bag.reduce(function (sum, line) {
    const num = parseFloat(String(line.price).replace(/[^0-9.]/g, "")) || 0;
    return sum + num * line.qty;
  }, 0);
}

function addToBag(id) {
  const item = findStory(id);
  if (!item || !item.forSale) return;
  const existing = bag.filter(function (line) {
    return line.id === id;
  })[0];
  if (existing) existing.qty += 1;
  else bag.push({ id: item.id, title: item.title, price: item.price, qty: 1 });
  renderBag();
  renderWhereTo();
}

function changeBag(id, delta) {
  bag = bag.map(function (line) {
    if (line.id !== id) return line;
    return { id: line.id, title: line.title, price: line.price, qty: line.qty + delta };
  }).filter(function (line) {
    return line.qty > 0;
  });
  renderBag();
  renderWhereTo();
}

function renderBag() {
  const list = document.getElementById("bag-list");
  if (!bag.length) {
    list.innerHTML = "<p>" + escapeHtml(content.whereTo.bag.empty) + "</p>";
    document.getElementById("bag-total").textContent = "";
    document.getElementById("bag-checkout").disabled = true;
    return;
  }
  list.innerHTML = bag.map(function (line) {
    return (
      '<div class="bag-line">' +
        "<div><strong>" + escapeHtml(line.title) + "</strong><div>" + escapeHtml(line.price) + "</div></div>" +
        '<div class="bag-qty">' +
          '<button type="button" data-bag-delta="' + line.id + ',-1" aria-label="Remove one">−</button>' +
          "<span>" + line.qty + "</span>" +
          '<button type="button" data-bag-delta="' + line.id + ',1" aria-label="Add one">+</button>' +
        "</div>" +
      "</div>"
    );
  }).join("");
  document.getElementById("bag-total").textContent = "Total · $" + bagTotal().toFixed(2);
  document.getElementById("bag-checkout").disabled = false;
}

function checkout() {
  if (!bag.length) return;
  bag = [];
  renderBag();
  renderWhereTo();
  go("thank-you");
}

function chromeNodes() {
  return [document.getElementById("skip-link"), menuBtn, document.querySelector(".proto-footer"), app];
}

function setChromeInert(on) {
  chromeNodes().forEach(function (el) {
    if (el) el.toggleAttribute("inert", on);
  });
}

function focusables(root) {
  if (!root) return [];
  return Array.prototype.slice.call(root.querySelectorAll("button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])")).filter(function (el) {
    return !el.hasAttribute("hidden") && !el.closest("[hidden]");
  });
}

function trapFocus(event, root) {
  if (event.key !== "Tab" || !root) return;
  const items = focusables(root);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function openSheetEl(el) {
  closeSheets(true);
  lastFocus = document.activeElement;
  el.hidden = false;
  sheetBackdrop.hidden = false;
  void el.offsetWidth;
  el.classList.add("is-open");
  sheetBackdrop.classList.add("is-open");
  openSheet = el;
  setChromeInert(true);
  const first = focusables(el)[0] || el;
  if (first && first.focus) first.focus();
}

function closeSheets(quiet) {
  [whereTo, bagDrawer].forEach(function (el) {
    el.classList.remove("is-open");
  });
  sheetBackdrop.classList.remove("is-open");
  menuBtn.setAttribute("aria-expanded", "false");
  const wait = reduceMotion() ? 0 : 350;
  window.setTimeout(function () {
    if (openSheet) return;
    whereTo.hidden = true;
    bagDrawer.hidden = true;
    sheetBackdrop.hidden = true;
  }, wait);
  if (openSheet) {
    openSheet = null;
    setChromeInert(false);
    if (!quiet && lastFocus && lastFocus.focus) lastFocus.focus();
  }
}

function showScreen(name) {
  if (name === "journey" || name === "stories" || name === "consulting") {
    setState("explored");
  }
  if (name === "meet-lori") setState("introduced");

  const next = document.querySelector('[data-screen="' + name + '"]');
  const current = document.querySelector(".screen.is-active");
  if (!next) return;
  if (next === current) {
    currentScreen = name;
    if (name === "story-item") renderItem(currentItemId);
    if (name === "edit-preview") renderEditor();
    syncAudio(name);
    return;
  }

  if (current) current.classList.remove("is-active");
  next.classList.add("is-active");
  next.scrollTop = 0;
  currentScreen = name;
  playArrival(next);

  if (name === "journey") startJourney();
  if (name === "consulting") startConsulting();
  if (name === "story-item") renderItem(currentItemId);
  if (name === "edit-preview") renderEditor();
  if (name === "meet-lori") document.getElementById("meet-play").classList.remove("is-playing");
  syncAudio(name);
}

function showReturningPorch(explored) {
  showScreen("porch");
  welcomeBack.hidden = false;
  welcomeBack.classList.remove("is-on");
  void welcomeBack.offsetWidth;
  welcomeBack.classList.add("is-on");
  quickAccess.hidden = !explored;
}

function journeyMarkup(step) {
  const pause = reduceMotion() ? 0 : 0.7;
  const j = content.journey;
  if (step === 1) {
    const late = groupDelay(j.q1, 4, pause);
    return (
      '<label for="journey-q1">' + wrapWordGroups(j.q1, 4, pause) + "</label>" +
      '<span class="word-late" style="animation-delay:' + late.toFixed(2) + 's">' +
        '<textarea id="journey-q1" rows="3"></textarea>' +
        '<button type="button" class="continue-link" data-journey-next>Continue</button>' +
      "</span>"
    );
  }
  if (step === 2) {
    const late = groupDelay(j.bridge, 4, pause);
    return (
      "<p>" + wrapWordGroups(j.bridge, 4, pause) + "</p>" +
      '<span class="word-late" style="animation-delay:' + late.toFixed(2) + 's">' +
        '<button type="button" class="continue-link" data-journey-next>Continue</button>' +
      "</span>"
    );
  }
  if (step === 3) {
    const late = groupDelay(j.q2, 4, pause);
    return (
      '<label for="journey-q3">' + wrapWordGroups(j.q2, 4, pause) + "</label>" +
      '<span class="word-late" style="animation-delay:' + late.toFixed(2) + 's">' +
        '<textarea id="journey-q3" rows="3"></textarea>' +
        '<button type="button" class="continue-link" data-journey-next>Continue</button>' +
      "</span>"
    );
  }
  const late = groupDelay(j.close, 5, pause);
  return (
    "<p>" + wrapWordGroups(j.close, 5, pause) + "</p>" +
    '<span class="word-late" style="animation-delay:' + late.toFixed(2) + 's">' +
      '<a class="btn" href="' + calendly() + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(j.continue) + "</a>" +
      '<p class="fine-print">' + escapeHtml(j.finePrint) + "</p>" +
      '<button type="button" class="text-link" data-go="porch">' + escapeHtml(j.back) + "</button>" +
    "</span>"
  );
}

function startJourney() {
  const panel = document.getElementById("journey-panel");
  panel.innerHTML = "";
  window.clearTimeout(journeyTimer);
  journeyTimer = window.setTimeout(function () {
    if (currentScreen !== "journey") return;
    renderJourney(1);
  }, reduceMotion() ? 0 : 2000);
}

function renderJourney(step) {
  const panel = document.getElementById("journey-panel");
  panel.innerHTML = journeyMarkup(step);
  panel.dataset.step = String(step);
}

function startConsulting() {
  renderConsulting(1);
}

function consultingMarkup(step) {
  const c = content.consulting;
  if (step === 1) {
    return (
      '<label for="consult-q1">' + escapeHtml(c.q1) + "</label>" +
      '<textarea id="consult-q1" rows="3"></textarea>' +
      '<button type="button" class="continue-link" data-consult-next>Continue</button>'
    );
  }
  if (step === 2) {
    return (
      '<label for="consult-q2">' + escapeHtml(c.q2) + "</label>" +
      '<textarea id="consult-q2" rows="3"></textarea>' +
      '<button type="button" class="continue-link" data-consult-next>Continue</button>'
    );
  }
  if (step === 3) {
    return (
      "<p>" + escapeHtml(c.q3) + "</p>" +
      '<a class="btn" href="' + calendly() + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(c.continue) + "</a>" +
      '<button type="button" class="continue-link" data-consult-next>Continue</button>'
    );
  }
  return (
    "<p>" + escapeHtml(c.thanks) + "</p>" +
    '<button type="button" class="text-link" data-go="porch">' + escapeHtml(c.back) + "</button>"
  );
}

function renderConsulting(step) {
  const panel = document.getElementById("consulting-panel");
  panel.innerHTML = consultingMarkup(step);
  panel.dataset.step = String(step);
}

function field(path, label, multiline) {
  const value = getPath(content, path);
  if (value == null) return "";
  const tag = multiline
    ? '<textarea data-edit="' + path + '" rows="3">' + escapeHtml(value) + "</textarea>"
    : '<input data-edit="' + path + '" value="' + escapeHtml(value) + '">';
  return "<label>" + escapeHtml(label) + "</label>" + tag;
}

function renderEditor() {
  const groups = [
    { name: "Welcome", fields: [
      ["welcome.heading", "Heading"],
      ["welcome.line1", "Line 1", true],
      ["welcome.line2", "Line 2", true],
      ["welcome.explore", "Explore button"],
      ["welcome.direct", "Direct note", true]
    ]},
    { name: "Porch", fields: [
      ["porch.welcomeBack", "Welcome back"],
      ["porch.hotspots.0.name", "Journey name"],
      ["porch.hotspots.0.detail", "Journey detail"],
      ["porch.hotspots.1.name", "Stories name"],
      ["porch.hotspots.1.detail", "Stories detail"],
      ["porch.hotspots.2.name", "Consulting name"],
      ["porch.hotspots.2.detail", "Consulting detail"],
      ["porch.hotspots.3.name", "Meet Lori name"],
      ["porch.hotspots.3.detail", "Meet Lori detail"]
    ]},
    { name: "Meet Lori", fields: [
      ["meetLori.heading", "Heading"],
      ["meetLori.intro", "Intro", true],
      ["meetLori.play", "Play label"],
      ["meetLori.transcript", "Transcript", true],
      ["meetLori.noRush", "No rush"],
      ["meetLori.talk", "Talk link"]
    ]},
    { name: "Journey", fields: [
      ["journey.q1", "Question 1", true],
      ["journey.bridge", "Bridge"],
      ["journey.q2", "Question 2", true],
      ["journey.close", "Close", true],
      ["journey.finePrint", "Fine print"]
    ]},
    { name: "Stories", fields: [
      ["stories.heading", "Study heading", true],
      ["stories.intro", "Study intro", true],
      ["stories.looking", "Looking line"],
      ["stories.collectionTitle", "Collection title"]
    ]},
    { name: "Consulting", fields: [
      ["consulting.line1", "Board line 1"],
      ["consulting.line2", "Board line 2"],
      ["consulting.line3", "Board line 3"],
      ["consulting.q1", "Step 1"],
      ["consulting.q2", "Step 2"],
      ["consulting.q3", "Step 3"],
      ["consulting.thanks", "Thanks", true]
    ]},
    { name: "Contact", fields: [
      ["contact.email", "Email"],
      ["contact.instagram", "Instagram"],
      ["contact.facebook", "Facebook"],
      ["contact.youtube", "YouTube"],
      ["meta.calendly", "Calendly"]
    ]}
  ];

  stories().forEach(function (item, index) {
    groups[4].fields.push(
      ["stories.items." + index + ".title", item.title + " · title"],
      ["stories.items." + index + ".author", item.title + " · author"],
      ["stories.items." + index + ".line", item.title + " · line", true]
    );
  });

  document.getElementById("editor-fields").innerHTML = groups.map(function (group) {
    return (
      '<fieldset data-group="' + escapeHtml(group.name) + '">' +
        "<legend>" + escapeHtml(group.name) + "</legend>" +
        group.fields.map(function (f) {
          return field(f[0], f[1], f[2]);
        }).join("") +
      "</fieldset>"
    );
  }).join("");
  renderEditorPreview();
}

function renderEditorPreview() {
  const pane = document.getElementById("editor-preview");
  const map = {
    Welcome: "<h2>" + escapeHtml(content.welcome.heading) + "</h2><p>" + escapeHtml(content.welcome.line1) + "</p><p>" + escapeHtml(content.welcome.line2) + "</p><p>" + escapeHtml(content.welcome.explore) + "</p>",
    Porch: "<h2>" + escapeHtml(content.porch.welcomeBack) + "</h2>" + content.porch.hotspots.map(function (s) {
      return "<p>" + escapeHtml(s.name) + " · " + escapeHtml(s.detail) + "</p>";
    }).join(""),
    "Meet Lori": "<h2>" + escapeHtml(content.meetLori.heading) + "</h2><p>" + escapeHtml(content.meetLori.intro) + "</p>",
    Journey: "<h2>Journey</h2><p>" + escapeHtml(content.journey.q1) + "</p><p>" + escapeHtml(content.journey.close) + "</p>",
    Stories: "<h2>" + escapeHtml(content.stories.heading) + "</h2><p>" + escapeHtml(content.stories.items[0].title) + " — " + escapeHtml(content.stories.items[0].author) + "</p>",
    Consulting: "<h2>" + escapeHtml(content.consulting.line1) + "</h2><p>" + escapeHtml(content.consulting.line2) + "</p><p>" + escapeHtml(content.consulting.line3) + "</p>",
    Contact: "<h2>" + escapeHtml(content.contact.heading) + "</h2><p>" + escapeHtml(content.contact.email) + "</p>"
  };
  pane.innerHTML = '<div class="preview-card">' + (map[editorGroup] || map.Welcome) + "</div>";
}

function refreshFromContent() {
  applyCopy();
  renderHotspots();
  renderPorchNav();
  renderWhereTo();
  renderStoryChrome();
  renderStories();
  if (currentScreen === "story-item") renderItem(currentItemId);
  if (currentScreen === "journey" && document.getElementById("journey-panel").dataset.step) {
    renderJourney(Number(document.getElementById("journey-panel").dataset.step));
  }
  if (currentScreen === "consulting" && document.getElementById("consulting-panel").dataset.step) {
    renderConsulting(Number(document.getElementById("consulting-panel").dataset.step));
  }
  renderEditorPreview();
  updateSoundsLabel();
}

function initAudio() {
  audioA = new Audio();
  audioB = new Audio();
  [audioA, audioB].forEach(function (player) {
    player.loop = true;
    player.preload = "auto";
    player.volume = 0;
    player.addEventListener("error", function () {});
  });
  activeAudio = audioA;
  try {
    soundsOn = window.localStorage.getItem(SOUND_KEY) === "on";
  } catch (err) {
    soundsOn = false;
  }
  updateSoundsLabel();
}

function updateSoundsLabel() {
  soundsToggle.setAttribute("aria-pressed", soundsOn ? "true" : "false");
  document.getElementById("sounds-label").textContent = soundsOn ? content.sounds.on : content.sounds.off;
}

function fadeVolumes(fromEl, toEl, ms) {
  window.clearInterval(fadeTimer);
  const steps = 20;
  let i = 0;
  const startFrom = fromEl ? fromEl.volume : 0;
  fadeTimer = window.setInterval(function () {
    i += 1;
    const t = i / steps;
    if (fromEl) fromEl.volume = Math.max(0, startFrom * (1 - t));
    if (toEl) toEl.volume = Math.min(0.35, 0.35 * t);
    if (i >= steps) {
      window.clearInterval(fadeTimer);
      if (fromEl) {
        fromEl.pause();
        fromEl.volume = 0;
      }
      if (toEl) toEl.volume = 0.35;
    }
  }, ms / steps);
}

function syncAudio(name) {
  if (!soundsOn || document.hidden) {
    [audioA, audioB].forEach(function (player) {
      if (player) player.pause();
    });
    return;
  }
  const track = SCENE_AUDIO[name];
  if (!track) {
    fadeVolumes(activeAudio, null, 800);
    return;
  }
  const src = "audio/" + track + ".mp3";
  if (activeAudio.getAttribute("data-track") === track && !activeAudio.paused) return;
  const next = activeAudio === audioA ? audioB : audioA;
  next.src = src;
  next.setAttribute("data-track", track);
  next.volume = 0;
  const play = next.play();
  if (play && typeof play.catch === "function") {
    play.catch(function () {});
  }
  fadeVolumes(activeAudio, next, 1500);
  activeAudio = next;
}

function toggleSounds() {
  soundsOn = !soundsOn;
  try {
    window.localStorage.setItem(SOUND_KEY, soundsOn ? "on" : "off");
  } catch (err) {
    /* ignore */
  }
  updateSoundsLabel();
  if (soundsOn) syncAudio(currentScreen);
  else {
    [audioA, audioB].forEach(function (player) {
      if (!player) return;
      player.pause();
      player.volume = 0;
    });
  }
}

function onClick(event) {
  const itemBtn = event.target.closest("[data-go-item]");
  if (itemBtn) {
    event.preventDefault();
    go("story-item", { itemId: itemBtn.getAttribute("data-go-item") });
    return;
  }

  const trigger = event.target.closest("[data-go]");
  if (trigger) {
    event.preventDefault();
    const target = trigger.getAttribute("data-go");
    const filter = trigger.getAttribute("data-filter");
    if (trigger.classList.contains("hotspot")) {
      walkThenGo(
        document.querySelector('[data-screen="porch"]'),
        { x: parseFloat(trigger.style.left), y: parseFloat(trigger.style.top) },
        target
      );
      return;
    }
    const origin = parseWalk(trigger.getAttribute("data-walk"));
    if (origin) {
      walkThenGo(trigger.closest(".screen"), origin, target);
      return;
    }
    go(target, filter ? { filter: filter } : null);
    return;
  }

  if (event.target.closest("[data-journey-next]")) {
    renderJourney(Number(document.getElementById("journey-panel").dataset.step || "1") + 1);
    return;
  }
  if (event.target.closest("[data-consult-next]")) {
    renderConsulting(Number(document.getElementById("consulting-panel").dataset.step || "1") + 1);
    return;
  }

  const add = event.target.closest("[data-add-bag]");
  if (add) {
    addToBag(add.getAttribute("data-add-bag"));
    openSheetEl(bagDrawer);
    return;
  }
  const where = event.target.closest("[data-where]");
  if (where) {
    const note = document.getElementById("where-note");
    if (note) note.hidden = false;
    return;
  }
  const delta = event.target.closest("[data-bag-delta]");
  if (delta) {
    const parts = delta.getAttribute("data-bag-delta").split(",");
    changeBag(parts[0], Number(parts[1]));
    return;
  }
  if (event.target.closest("#where-bag")) {
    openSheetEl(bagDrawer);
    return;
  }
  if (event.target.closest("#forget-visit")) {
    clearState();
    welcomeBack.hidden = true;
    quickAccess.hidden = true;
    closeSheets();
    return;
  }
}

function start() {
  applyCopy();
  wrapSceneMedia();
  bindScenePhotos();
  renderHotspots();
  renderPorchNav();
  renderWhereTo();
  renderStoryChrome();
  renderStories();
  renderBag();
  initAudio();

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  app.addEventListener("click", onClick);
  whereTo.addEventListener("click", onClick);
  bagDrawer.addEventListener("click", onClick);
  document.querySelector(".proto-footer").addEventListener("click", onClick);

  menuBtn.addEventListener("click", function () {
    if (openSheet === whereTo) closeSheets();
    else {
      renderWhereTo();
      openSheetEl(whereTo);
      menuBtn.setAttribute("aria-expanded", "true");
    }
  });

  sheetBackdrop.addEventListener("click", function () {
    closeSheets();
  });

  document.getElementById("bag-checkout").addEventListener("click", checkout);
  document.getElementById("reset-prototype").addEventListener("click", function () {
    clearState();
    window.location.hash = "#/";
    window.location.reload();
  });
  soundsToggle.addEventListener("click", toggleSounds);

  document.getElementById("story-search").addEventListener("input", function () {
    renderStories();
  });
  document.getElementById("story-filters").addEventListener("click", function (event) {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    go("stories-collection", { filter: chip.getAttribute("data-filter") });
  });
  document.getElementById("continue-stories").addEventListener("click", function () {
    document.getElementById("story-search").value = "";
    go("stories-collection", { filter: "All" });
  });

  document.getElementById("meet-play").addEventListener("click", function () {
    document.getElementById("meet-play").classList.toggle("is-playing");
  });

  document.getElementById("editor-fields").addEventListener("focusin", function (event) {
    const set = event.target.closest("fieldset");
    if (set) editorGroup = set.getAttribute("data-group") || "Welcome";
  });
  document.getElementById("editor-fields").addEventListener("input", function (event) {
    const fieldEl = event.target.closest("[data-edit]");
    if (!fieldEl) return;
    setPath(content, fieldEl.getAttribute("data-edit"), fieldEl.value);
    const set = fieldEl.closest("fieldset");
    if (set) editorGroup = set.getAttribute("data-group") || "Welcome";
    refreshFromContent();
  });

  document.addEventListener("keydown", function (event) {
    if (openSheet) {
      trapFocus(event, openSheet);
      if (event.key === "Escape") closeSheets();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      [audioA, audioB].forEach(function (player) {
        if (player) player.pause();
      });
    } else if (soundsOn) {
      syncAudio(currentScreen);
    }
  });

  window.addEventListener("hashchange", onHashChange);

  if (isHomeLanding()) {
    const state = getState();
    if (state === "explored") {
      history.replaceState(null, "", "#/porch");
      showReturningPorch(true);
    } else if (state === "introduced") {
      history.replaceState(null, "", "#/porch");
      showReturningPorch(false);
    } else {
      history.replaceState(null, "", "#/");
      showScreen("neighborhood");
    }
  } else {
    applyRoute(parseHash());
  }
}

fetch("content.json")
  .then(function (res) {
    if (!res.ok) throw new Error("content");
    return res.json();
  })
  .then(function (data) {
    content = data;
    start();
  })
  .catch(function () {
    document.body.insertAdjacentHTML("afterbegin", "<p style=\"padding:1rem\">Could not load content.json. Serve the folder over http.</p>");
  });
