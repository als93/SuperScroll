const api = globalThis.browser ?? globalThis.chrome;
const DEFAULTS = {
  delay: 1200, idleRounds: 4, maxMinutes: 10, maxClicks: 1000,
  clickButtons: true, customSelector: ""
};
const $ = (id) => document.getElementById(id);
const fields = ["delay", "idleRounds", "maxMinutes", "maxClicks", "clickButtons", "customSelector"];

let tabId = null, running = false, timer = null;

async function loadSettings() {
  const saved = await api.storage.local.get("opts");
  const o = { ...DEFAULTS, ...(saved.opts || {}) };
  for (const f of fields) {
    const el = $(f);
    if (el.type === "checkbox") el.checked = o[f]; else el.value = o[f];
  }
}

function readSettings() {
  const o = {};
  for (const f of fields) {
    const el = $(f);
    o[f] = el.type === "checkbox" ? el.checked
         : el.type === "number" ? (Number(el.value) || DEFAULTS[f])
         : el.value.trim();
  }
  return o;
}

function paint(st) {
  running = !!(st && st.running);
  $("toggle").textContent = running ? "Stop" : "Start";
  $("toggle").classList.toggle("stop", running);
  $("status").textContent = st ? st.message : "Idle";
}

async function poll() {
  try {
    const st = await api.tabs.sendMessage(tabId, { type: "SS_STATUS" });
    paint(st);
  } catch { paint(null); }
}

async function start() {
  const opts = readSettings();
  await api.storage.local.set({ opts });
  try {
    await api.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await api.tabs.sendMessage(tabId, { type: "SS_START", opts });
    poll();
  } catch (e) {
    $("status").textContent = "Can't run on this page (browser-internal or store pages are blocked).";
  }
}

async function stop() {
  try { await api.tabs.sendMessage(tabId, { type: "SS_STOP" }); } catch {}
  setTimeout(poll, 200);
}

(async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  tabId = tab.id;
  await loadSettings();
  $("toggle").addEventListener("click", () => (running ? stop() : start()));
  poll();
  timer = setInterval(poll, 500);
})();
