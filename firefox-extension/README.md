# Pete Home New Tab (Firefox)

Personal new-tab extension that shows [pete.sh](https://pete.sh) in a full-page iframe so the URL bar stays on the extension.

## Load in Firefox

1. Open `about:debugging` in Firefox.
2. Click **This Firefox** (or **This Nightly**, etc.).
3. Click **Load Temporary Add-on…**.
4. Choose the `manifest.json` file in this folder.

The extension stays loaded until you restart Firefox. To make it permanent, use **Load Temporary Add-on** again after each restart, or [package and sign the extension](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/) for install from file.

## Files

- `manifest.json` – extension manifest (new-tab override).
- `newtab.html` – loads pete.sh in a full-page iframe.
- `newtab.css` – full-viewport iframe styling.

The site (pete.sh) must allow being framed; `next.config.mjs` in the repo sets `Content-Security-Policy: frame-ancestors ... moz-extension:` so the extension can embed it. Redeploy after that change if the iframe is blank.
