(() => {
  if (window.__superScrollLoaded) return;
  window.__superScrollLoaded = true;

  const api = globalThis.browser ?? globalThis.chrome;

  const state = {
    running: false, stop: false, clicks: 0, rounds: 0,
    height: 0, nodes: 0, message: "Idle", finished: false
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- "Load more" detection ----------
  const PHRASES = [
    "load more", "show more", "view more", "see more", "read more results",
    "more results", "more posts", "more comments", "more replies", "more items",
    "more stories", "more products", "load all", "show all", "view all",
    "see all", "load older", "older posts", "older comments", "previous comments",
    "load next", "show next", "load additional", "more...", "more…",
    // a few other languages
    "mehr laden", "mehr anzeigen", "weitere laden", "weitere anzeigen",
    "voir plus", "afficher plus", "charger plus", "plus de résultats",
    "ver más", "mostrar más", "cargar más", "más resultados",
    "ver mais", "mostrar mais", "carregar mais",
    "mostra altro", "carica altro", "carica più", "mostra di più",
    "meer laden", "toon meer", "laad meer", "показать ещё", "показать еще",
    "загрузить ещё", "もっと見る", "さらに表示", "더보기", "加载更多", "查看更多", "更多"
  ];
  const NEGATIVE = /\b(less|fewer|hide|collapse|close|minimi[sz]e)\b|weniger|moins|menos|meno\b|menos|少|閉じる|접기/i;
  const SELECTOR =
    'button, [role="button"], a, input[type="button"], input[type="submit"], ' +
    '[class*="load-more" i], [class*="loadmore" i], [class*="load_more" i], ' +
    '[class*="show-more" i], [class*="showmore" i], [class*="more-button" i], ' +
    '[data-testid*="load-more" i], [data-testid*="show-more" i], [id*="load-more" i], [id*="loadmore" i]';

  function labelOf(el) {
    return (
      (el.innerText || el.value || el.textContent || "") + " " +
      (el.getAttribute("aria-label") || "") + " " + (el.getAttribute("title") || "")
    ).replace(/\s+/g, " ").trim().toLowerCase();
  }

  function isVisible(el) {
    if (!el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || s.pointerEvents === "none") return false;
    if (parseFloat(s.opacity) === 0) return false;
    if (el.disabled || el.getAttribute("aria-disabled") === "true") return false;
    return true;
  }

  function isRealNavigation(el) {
    if (el.tagName !== "A") return false;
    const href = el.getAttribute("href");
    if (!href || href.startsWith("#") || href.toLowerCase().startsWith("javascript:")) return false;
    try {
      const u = new URL(href, location.href);
      return (u.origin + u.pathname + u.search) !== (location.origin + location.pathname + location.search);
    } catch { return true; }
  }

  function findButton(customSelector) {
    if (customSelector) {
      try {
        for (const el of document.querySelectorAll(customSelector)) {
          if (isVisible(el)) return el;
        }
      } catch { /* invalid selector, fall through */ }
    }
    const candidates = [];
    for (const el of document.querySelectorAll(SELECTOR)) {
      if (el.closest("#superscroll-host")) continue;
      const label = labelOf(el);
      if (!label || label.length > 60 || NEGATIVE.test(label)) continue;
      const matchesPhrase = PHRASES.some((p) => label.includes(p));
      const bareMore = /^(\+\s*)?(more|mehr|plus|más|mais|altro|更多)\s*[+…\.]*$/.test(label);
      if (!(matchesPhrase || bareMore)) continue;
      if (isRealNavigation(el) || !isVisible(el)) continue;
      candidates.push(el);
    }
    // Prefer the lowest one on the page (the one that's actually at the end of the list)
    candidates.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    // Prefer the innermost match so we don't click a big wrapper
    return candidates.find((c) => !candidates.some((o) => o !== c && c.contains(o))) || candidates[0] || null;
  }

  // ---------- Scrolling ----------
  function findScroller() {
    const root = document.scrollingElement || document.documentElement;
    if (root.scrollHeight > window.innerHeight + 50) return root;
    // The page itself doesn't scroll; look for an inner scroll container (feeds, modals, etc.)
    let best = null, bestH = 0;
    for (const el of document.body.querySelectorAll("*")) {
      if (el.scrollHeight <= el.clientHeight + 50 || el.clientHeight < 150) continue;
      const oy = getComputedStyle(el).overflowY;
      if (oy !== "auto" && oy !== "scroll") continue;
      if (el.scrollHeight > bestH) { best = el; bestH = el.scrollHeight; }
    }
    return best || root;
  }

  function scrollToBottom(sc) {
    if (sc === document.scrollingElement || sc === document.documentElement || sc === document.body) {
      window.scrollTo(0, document.documentElement.scrollHeight);
    } else {
      sc.scrollTop = sc.scrollHeight;
    }
  }

  function scrollBy(sc, dy) {
    if (sc === document.scrollingElement || sc === document.documentElement || sc === document.body) {
      window.scrollBy(0, dy);
    } else {
      sc.scrollTop += dy;
    }
  }

  function snapshot(sc) {
    return { h: sc.scrollHeight, n: document.getElementsByTagName("*").length };
  }

  // ---------- Overlay ----------
  let host, shadow, textEl, stopBtn;
  function ensureOverlay() {
    if (host && host.isConnected) return;
    host = document.createElement("div");
    host.id = "superscroll-host";
    host.style.cssText = "all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483647;";
    shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `
      <style>
        .box{font:13px/1.4 system-ui,sans-serif;background:#111827;color:#f9fafb;padding:10px 12px;
          border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.35);display:flex;gap:10px;align-items:center;max-width:320px}
        .dot{width:9px;height:9px;border-radius:50%;background:#34d399;flex:none;animation:p 1s infinite}
        .done .dot{animation:none;background:#60a5fa}
        @keyframes p{50%{opacity:.3}}
        button{all:unset;cursor:pointer;background:#374151;padding:4px 10px;border-radius:6px;font-weight:600}
        button:hover{background:#4b5563}
      </style>
      <div class="box" id="box"><span class="dot"></span><span id="t"></span><button id="b">Stop</button></div>`;
    textEl = shadow.getElementById("t");
    stopBtn = shadow.getElementById("b");
    stopBtn.addEventListener("click", () => {
      if (state.running) { state.stop = true; } else { host.remove(); }
    });
    document.documentElement.appendChild(host);
  }

  function render() {
    ensureOverlay();
    shadow.getElementById("box").className = "box" + (state.running ? "" : " done");
    textEl.textContent = state.message;
    stopBtn.textContent = state.running ? "Stop" : "Close";
  }

  function setMessage(msg) {
    state.message = msg;
    render();
    try { api.runtime.sendMessage({ type: "SS_PROGRESS", state: publicState() }).catch?.(() => {}); } catch {}
  }

  const publicState = () => ({ ...state });

  // ---------- Main loop ----------
  async function run(opts) {
    if (state.running) return;
    Object.assign(state, { running: true, stop: false, clicks: 0, rounds: 0, finished: false });
    const started = Date.now();
    const maxMs = opts.maxMinutes * 60 * 1000;
    let idle = 0;
    let lastClicked = null;
    setMessage("SuperScroll: starting…");

    while (!state.stop) {
      if (Date.now() - started > maxMs) { await finish("Stopped: time limit reached"); return; }

      const sc = findScroller();
      const before = snapshot(sc);

      scrollToBottom(sc);

      let btn = null;
      if (opts.clickButtons) {
        btn = findButton(opts.customSelector);
        if (btn && state.clicks >= opts.maxClicks) { await finish("Stopped: click limit reached"); return; }
        if (btn) {
          btn.scrollIntoView({ block: "center", behavior: "instant" });
          await sleep(80);
          btn.click();
          state.clicks++;
          lastClicked = btn;
        }
      }

      await sleep(opts.delay);

      // If we're stuck at the bottom, nudge up & down to re-trigger scroll observers
      if (idle > 0 && !btn) {
        scrollBy(sc, -400);
        await sleep(150);
        scrollToBottom(sc);
        await sleep(Math.min(opts.delay, 800));
      }

      const after = snapshot(findScroller());
      state.rounds++;
      state.height = after.h;
      state.nodes = after.n;

      if (after.h !== before.h || after.n !== before.n) idle = 0; else idle++;

      setMessage(
        `Loading… ${state.clicks} click${state.clicks === 1 ? "" : "s"}, ` +
        `${Math.round(after.h).toLocaleString()}px tall` + (idle ? ` (waiting ${idle}/${opts.idleRounds})` : "")
      );

      if (idle >= opts.idleRounds) {
        const still = opts.clickButtons ? findButton(opts.customSelector) : null;
        if (still && still === lastClicked && idle >= opts.idleRounds * 2) {
          await finish("Stopped: button stopped producing results");
          return;
        }
        if (!still) { await finish(`Done: everything loaded (${state.clicks} clicks)`); return; }
      }
    }
    await finish("Stopped by you");
  }

  async function finish(msg) {
    state.running = false;
    state.finished = true;
    setMessage(msg);
  }

  // ---------- Messaging ----------
  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg.type !== "string") return;
    if (msg.type === "SS_START") { run(msg.opts); sendResponse({ ok: true }); }
    else if (msg.type === "SS_STOP") { state.stop = true; sendResponse({ ok: true }); }
    else if (msg.type === "SS_STATUS") { sendResponse(publicState()); }
  });
})();
