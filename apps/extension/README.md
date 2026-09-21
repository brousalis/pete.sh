# Pete Home New Tab (Firefox)

Legacy new-tab extension that iframes [pete.sh](https://pete.sh).

**Note:** `apps/web` is petehome-only and runs locally; it is no longer published to pete.sh.
This extension is obsolete for the current coaching stack unless you change the iframe target
to a local origin and ensure framing is allowed.

## Load in Firefox (if you still want it)

1. Open `about:debugging`.
2. **This Firefox** → **Load Temporary Add-on…**.
3. Choose `manifest.json` in this folder.

## Files

- `manifest.json` – new-tab override
- `newtab.html` – full-page iframe
- `newtab.css` – viewport styling
