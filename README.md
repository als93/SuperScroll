<p align="center">
  <img src="assets/icon.png" width="96" alt="SuperScroll icon">
</p>

<h1 align="center">SuperScroll</h1>

<p align="center">
  <b>Scroll to the bottom and keep clicking “Load more” until every result is loaded.</b><br>
  A small, privacy-friendly browser extension for Floorp, Firefox and Chrome.
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-v3-green">
  <img alt="Browsers" src="https://img.shields.io/badge/browsers-Floorp%20%7C%20Firefox%20%7C%20Chrome-orange">
  <img alt="No data collection" src="https://img.shields.io/badge/data%20collection-none-success">
</p>

---

## What it does

Search results, product lists, forums, comment threads and social feeds often load in small chunks. You scroll, click **Load more**, scroll, click again… SuperScroll does that loop for you.

Press **Start** and it will:

1. Scroll to the bottom of the page (triggers infinite-scroll feeds).
2. Find and click “Load more”-style buttons.
3. Wait for new content, then repeat.
4. Stop on its own when the page stops growing and no button is left.

When it’s done, everything is on the page, so you can search with <kbd>Ctrl</kbd>+<kbd>F</kbd>, save it, or read at your own pace.

<!-- TODO: add screenshots to docs/screenshots/ and uncomment
![Popup](docs/screenshots/popup.png)
![Progress badge](docs/screenshots/badge.png)
-->

## Features

- One-click **Start / Stop** from the toolbar popup
- Handles both **infinite scroll** and **“Load more” buttons**
- Detects button labels in English, German, French, Spanish, Portuguese, Italian, Dutch, Russian, Japanese, Korean and Chinese
- Ignores “Show less”, “Hide” and “Collapse” buttons
- Skips links that would navigate away from the page
- Works on pages that scroll inside a container (feeds, panels, modals)
- Nudges the scroll position when stuck at the bottom to re-trigger scroll listeners
- Live **progress badge** on the page with its own Stop button
- Configurable limits, plus an optional **custom CSS selector** for unusual buttons

## Install

### Firefox Add-ons (AMO)

<!-- TODO: replace with the real listing URL once published -->
Coming soon.

### From source: Floorp / Firefox (temporary)

1. Download or clone this repository.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `manifest.json`.

Temporary add-ons are removed when the browser restarts. For a permanent install, use the AMO listing or a signed `.xpi`.

### From source: Chrome / Chromium

1. Download or clone this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and choose the repository folder.

## Usage

1. Open a page with a long list of results.
2. Click the SuperScroll toolbar icon and press **Start**.
3. Watch the badge in the bottom-right corner. Press **Stop** at any time.

> **Keep the tab in the foreground.** Browsers throttle hidden tabs, which can pause loading.

### Settings

| Setting | Default | What it does |
|---|---|---|
| Wait after each step (ms) | 1200 | Time to wait for new content after scrolling/clicking. Raise it on slow sites. |
| Stop after N rounds with no change | 4 | How many unchanged rounds count as “finished”. |
| Max runtime (minutes) | 10 | Safety limit. |
| Max button clicks | 1000 | Safety limit. |
| Click “Load more” buttons | on | Turn off to only scroll. |
| Custom button selector | empty | CSS selector for a button SuperScroll doesn’t recognize, e.g. `.btn-more`. |

**Button not detected?** Right-click it → **Inspect**, copy a CSS selector for it, and paste it into the custom selector field.

## Try it

Open [`demo/index.html`](demo/index.html) for a fake shop with 240 products. Use the header tabs to switch between a **“Load more” button** and **infinite scroll**. SuperScroll should finish with “240 of 240 results”.

If the extension doesn’t run on a `file://` page, serve the folder instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/demo/
```

## Privacy and permissions

SuperScroll collects **no data**, makes **no network requests**, and has no analytics. Settings are stored locally in your browser.

| Permission | Why |
|---|---|
| `activeTab` | Run on the current tab, only after you open the popup |
| `scripting` | Inject the content script when you press Start |
| `storage` | Remember your settings locally |

There are no host permissions and no background script.

## Known limitations

- Pages with constantly changing content (live tickers, rotating ads) may never look “finished”; the runtime and click limits will stop them.
- Buttons inside **shadow DOM** or **iframes** aren’t detected yet.
- Icon-only buttons with no text or label aren’t detected; use the custom selector.
- Won’t run on browser-internal pages (`about:`, `chrome://`) or the extension stores.
- Sites that load results very slowly may need a longer wait time.

## How it works

`popup.js` injects `content.js` into the active tab with `scripting.executeScript` and sends it the settings. `content.js` loops: scroll → find and click a matching button → wait → compare page height and DOM size with the last round. After enough unchanged rounds with no button left, it stops. The progress badge lives in a closed shadow root so page styles can’t affect it.

## Project structure

```
manifest.json      Manifest V3 (Firefox + Chrome)
content.js         Scroll / detect / click logic and the on-page badge
popup.html/css/js  Toolbar popup and settings
icons/             Extension icons
demo/index.html    Local test page (button + infinite scroll modes)
assets/            Artwork for the README / store
```

No build step, no dependencies: the repository *is* the extension.

## Development

```bash
# lint against Firefox's add-on rules
npx web-ext lint

# run in Floorp or Firefox with live reload
npx web-ext run --firefox=/path/to/floorp

# build an uploadable zip with manifest.json at the root
npx web-ext build --overwrite-dest \
  --ignore-files README.md CHANGELOG.md LICENSE demo assets .github
```

Before publishing a new version, bump `version` in `manifest.json` and add an entry to [CHANGELOG.md](CHANGELOG.md).

## Roadmap

- Per-site saved settings and selectors
- Click-to-pick button selector
- Stop after N items / when specific text appears
- Pause / resume and keyboard shortcut
- Shadow DOM and iframe support
- Localized UI

## Contributing

Bug reports and pull requests are welcome. When reporting a problem, include the page URL (if it’s public), what SuperScroll did, and what you expected. For undetected buttons, include the button’s HTML.

## License

Released under the [MIT License](LICENSE).
