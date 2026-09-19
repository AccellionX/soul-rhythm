/* Positions are percentages of the porch image. Tweak x/y after photos land. */
const PORCH_HOTSPOTS = [
  { id: "bird-feeder", label: "Bird feeder", target: "journey", x: 24, y: 12 },
  { id: "book", label: "Book", target: "stories", x: 49, y: 48 },
  { id: "metal-art", label: "Metal art", target: "consulting", x: 91, y: 26 },
  { id: "heart-sign", label: "Heart sign", target: "meet-lori", x: 63, y: 23, pulse: true }
];

const STORIES = [
  { title: "The Gift of Rest", line: "A quiet invitation to reclaim unhurried time.", price: "$18", tags: ["Books"] },
  { title: "Porch Light", line: "Essays on noticing what's already here.", price: "$22", tags: ["Books"] },
  { title: "Still Waters", line: "A film about returning home and beginning again.", price: "$4.99", tags: ["Movies"] },
  { title: "Morning Pages", line: "A short series on daily creative practice.", price: "Recommendation", tags: ["Streaming", "Recommended"] },
  { title: "Letters from the Garden", line: "Correspondence on growing and letting go.", price: "$16", tags: ["Books", "New"] },
  { title: "The Long Walk Home", line: "Two friends, one road, many questions.", price: "Recommendation", tags: ["Movies", "Recommended"] },
  { title: "Kitchen Table Talks", line: "Conversations that wander toward what matters.", price: "$3.99", tags: ["Streaming"] },
  { title: "Finding Your Rhythm", line: "A field guide for living at a human pace.", price: "$24", tags: ["Books", "New"] }
];

const STATE_KEY = "sr_state";
const CALENDLY = "https://calendly.com";

const app = document.getElementById("app");
const homeBtn = document.getElementById("home-btn");
const welcomeBack = document.getElementById("welcome-back");
const quickAccess = document.getElementById("quick-access");
const meetModal = document.getElementById("meet-lori");
const storyModal = document.getElementById("story-detail");
const pondAudio = document.getElementById("pond-audio");
const soundToggle = document.getElementById("sound-toggle");

let currentScreen = null;
let journeyTimer = 0;
let lastFocus = null;

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    /* private mode or blocked storage */
  }
}

function clearState() {
  try {
    window.localStorage.removeItem(STATE_KEY);
  } catch (err) {
    /* ignore */
  }
}

function bindScenePhotos() {
  document.querySelectorAll(".scene-photo").forEach((img) => {
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

function renderHotspots() {
  const mount = document.getElementById("hotspots");
  mount.innerHTML = PORCH_HOTSPOTS.map(function (spot) {
    const pulse = spot.pulse ? " hotspot--pulse" : "";
    const edge = spot.x >= 80 ? " hotspot--right" : spot.x <= 14 ? " hotspot--left" : "";
    return (
      '<button type="button" class="hotspot' + pulse + edge + '" style="left:' + spot.x + "%;top:" + spot.y + '%" data-go="' + spot.target + '">' +
        '<span class="hotspot-dot" aria-hidden="true"></span>' +
        '<span class="hotspot-label">' + spot.label + "</span>" +
      "</button>"
    );
  }).join("");
}

function showScreen(name) {
  if (name === "meet-lori") {
    openMeetLori();
    return;
  }

  closeMeetLori(true);
  if (name !== "journey") stopPondSound();
  if (name === "journey" || name === "stories" || name === "consulting") {
    setState("explored");
  }

  const next = document.querySelector('[data-screen="' + name + '"]');
  const current = document.querySelector(".screen.is-active");
  if (!next || next === current) {
    currentScreen = name;
    updateChrome(name);
    return;
  }

  if (current) current.classList.remove("is-active");
  next.classList.add("is-active");
  next.scrollTop = 0;
  currentScreen = name;
  updateChrome(name);

  if (name === "journey") startJourney();
  if (name === "consulting") startConsulting();
}

function updateChrome(name) {
  homeBtn.hidden = name === "neighborhood";
}

function setChromeInert(on) {
  homeBtn.toggleAttribute("inert", on);
  document.querySelector(".proto-footer").toggleAttribute("inert", on);
  if (on) app.setAttribute("inert", "");
  else app.removeAttribute("inert");
}

function openMeetLori() {
  const porch = document.querySelector('[data-screen="porch"]');
  if (!porch.classList.contains("is-active")) {
    showScreen("porch");
  }
  setState("introduced");
  lastFocus = document.activeElement;
  meetModal.hidden = false;
  setChromeInert(true);
  document.getElementById("close-meet").focus();
}

function closeMeetLori(silent) {
  if (meetModal.hidden) return;
  meetModal.hidden = true;
  setChromeInert(false);
  if (!silent && lastFocus && typeof lastFocus.focus === "function") {
    lastFocus.focus();
  }
}

function openStory(item) {
  lastFocus = document.activeElement;
  document.getElementById("story-detail-title").textContent = item.title;
  document.getElementById("story-detail-line").textContent = item.line;
  document.getElementById("story-detail-meta").textContent = item.price;
  storyModal.hidden = false;
  setChromeInert(true);
  document.getElementById("close-story").focus();
}

function closeStory() {
  if (storyModal.hidden) return;
  storyModal.hidden = true;
  setChromeInert(false);
  if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
}

function journeyMarkup(step) {
  if (step === 1) {
    return (
      "<label for=\"journey-q1\">What sort of experiences or activities fill you up?</label>" +
      "<textarea id=\"journey-q1\" rows=\"3\"></textarea>" +
      '<button type="button" class="continue-link" data-journey-next>Continue</button>'
    );
  }
  if (step === 2) {
    return (
      "<p>Okay, let's start there.</p>" +
      '<button type="button" class="continue-link" data-journey-next>Continue</button>'
    );
  }
  if (step === 3) {
    return (
      "<label for=\"journey-q3\">What is it about that activity or experience that gives you energy?</label>" +
      "<textarea id=\"journey-q3\" rows=\"3\"></textarea>" +
      '<button type="button" class="continue-link" data-journey-next>Continue</button>'
    );
  }
  return (
    "<p>Sometimes all it takes is a moment to notice. And sometimes, that moment makes us curious about what might be possible. If you'd like to keep exploring, I'm here.</p>" +
    '<a class="btn" href="' + CALENDLY + '" target="_blank" rel="noopener noreferrer">Continue the conversation</a>' +
    '<p class="fine-print">It can take as little or as much time as you have.</p>' +
    '<button type="button" class="text-link" data-go="porch">Back to the porch</button>'
  );
}

function startJourney() {
  const panel = document.getElementById("journey-panel");
  panel.innerHTML = "";
  window.clearTimeout(journeyTimer);
  const wait = reduceMotion() ? 0 : 2000;
  journeyTimer = window.setTimeout(function () {
    if (currentScreen !== "journey") return;
    renderJourney(1);
  }, wait);
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
  if (step === 1) {
    return (
      "<label for=\"consult-q1\">What's got you thinking?</label>" +
      "<textarea id=\"consult-q1\" rows=\"3\"></textarea>" +
      '<button type="button" class="continue-link" data-consult-next>Continue</button>'
    );
  }
  if (step === 2) {
    return (
      "<label for=\"consult-q2\">Interesting. What makes this matter to you?</label>" +
      "<textarea id=\"consult-q2\" rows=\"3\"></textarea>" +
      '<button type="button" class="continue-link" data-consult-next>Continue</button>'
    );
  }
  if (step === 3) {
    return (
      "<p>Want to talk it through?</p>" +
      '<a class="btn" href="' + CALENDLY + '" target="_blank" rel="noopener noreferrer">Continue the conversation</a>' +
      '<button type="button" class="continue-link" data-consult-next>Continue</button>'
    );
  }
  return (
    "<p>Thanks for sharing that. Ideas don't have to be finished before we talk about them.</p>" +
    '<button type="button" class="text-link" data-go="porch">Back to the porch</button>'
  );
}

function renderConsulting(step) {
  const panel = document.getElementById("consulting-panel");
  panel.innerHTML = consultingMarkup(step);
  panel.dataset.step = String(step);
}

function stopPondSound() {
  pondAudio.pause();
  pondAudio.currentTime = 0;
  soundToggle.setAttribute("aria-pressed", "false");
  soundToggle.setAttribute("aria-label", "Play pond sounds");
}

function togglePondSound() {
  if (soundToggle.getAttribute("aria-pressed") === "true") {
    stopPondSound();
    return;
  }
  const play = pondAudio.play();
  if (play && typeof play.catch === "function") {
    play.catch(function () {
      stopPondSound();
    });
  }
  soundToggle.setAttribute("aria-pressed", "true");
  soundToggle.setAttribute("aria-label", "Mute pond sounds");
}

function storyMatches(item, query, filter) {
  const hay = (item.title + " " + item.line + " " + item.tags.join(" ")).toLowerCase();
  if (query && hay.indexOf(query) === -1) return false;
  if (filter === "All") return true;
  return item.tags.indexOf(filter) !== -1;
}

function renderStories() {
  const query = document.getElementById("story-search").value.trim().toLowerCase();
  const filterBtn = document.querySelector(".chip.is-on");
  const filter = filterBtn ? filterBtn.getAttribute("data-filter") : "All";
  const grid = document.getElementById("story-grid");
  const empty = document.getElementById("story-empty");
  const items = STORIES.filter(function (item) {
    return storyMatches(item, query, filter);
  });
  grid.innerHTML = items.map(function (item, index) {
    const sourceIndex = STORIES.indexOf(item);
    const tag = item.price === "Recommendation" ? "Recommendation" : item.price;
    return (
      '<article class="story-card">' +
        '<div class="cover cover-' + sourceIndex + '" aria-hidden="true">' + item.tags[0] + "</div>" +
        "<div class=\"story-card-body\">" +
          "<h2>" + item.title + "</h2>" +
          "<p>" + item.line + "</p>" +
          '<p class="story-meta">' + tag + "</p>" +
          '<button type="button" class="btn" data-view-story="' + sourceIndex + '">View</button>' +
        "</div>" +
      "</article>"
    );
  }).join("");
  empty.hidden = items.length > 0;
}

function showReturningPorch(explored) {
  showScreen("porch");
  welcomeBack.hidden = false;
  welcomeBack.classList.remove("is-on");
  void welcomeBack.offsetWidth;
  welcomeBack.classList.add("is-on");
  quickAccess.hidden = !explored;
}

function onClick(event) {
  const go = event.target.closest("[data-go]");
  if (go) {
    event.preventDefault();
    showScreen(go.getAttribute("data-go"));
    return;
  }

  const journeyNext = event.target.closest("[data-journey-next]");
  if (journeyNext) {
    const step = Number(document.getElementById("journey-panel").dataset.step || "1");
    renderJourney(step + 1);
    return;
  }

  const consultNext = event.target.closest("[data-consult-next]");
  if (consultNext) {
    const step = Number(document.getElementById("consulting-panel").dataset.step || "1");
    renderConsulting(step + 1);
    return;
  }

  const view = event.target.closest("[data-view-story]");
  if (view) {
    openStory(STORIES[Number(view.getAttribute("data-view-story"))]);
    return;
  }

  if (event.target.closest("[data-close-meet]")) {
    closeMeetLori();
    return;
  }

  if (event.target.closest("[data-close-story]")) {
    closeStory();
  }
}

function boot() {
  bindScenePhotos();
  renderHotspots();
  renderStories();

  app.addEventListener("click", onClick);
  document.getElementById("meet-lori").addEventListener("click", onClick);
  document.getElementById("story-detail").addEventListener("click", onClick);

  homeBtn.addEventListener("click", function () {
    closeStory();
    showScreen("porch");
  });

  document.getElementById("close-meet").addEventListener("click", function () {
    closeMeetLori();
  });

  document.getElementById("close-story").addEventListener("click", function () {
    closeStory();
  });

  document.getElementById("reset-prototype").addEventListener("click", function () {
    clearState();
    window.location.reload();
  });

  soundToggle.addEventListener("click", togglePondSound);
  pondAudio.addEventListener("error", function () {
    /* missing file is fine */
  });

  document.getElementById("story-search").addEventListener("input", renderStories);
  document.getElementById("story-filters").addEventListener("click", function (event) {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll(".chip").forEach(function (btn) {
      const on = btn === chip;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    renderStories();
  });

  document.getElementById("continue-stories").addEventListener("click", function () {
    document.getElementById("story-search").value = "";
    document.querySelectorAll(".chip").forEach(function (btn, index) {
      const on = index === 0;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    renderStories();
    document.getElementById("story-grid").scrollIntoView({ block: "start", behavior: reduceMotion() ? "auto" : "smooth" });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!meetModal.hidden) closeMeetLori();
    else if (!storyModal.hidden) closeStory();
  });

  const state = getState();
  if (state === "explored") showReturningPorch(true);
  else if (state === "introduced") showReturningPorch(false);
  else showScreen("neighborhood");
}

boot();
