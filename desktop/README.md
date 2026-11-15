# Growvia Desktop (Rust + Tauri 2)

The official Growvia app for Windows, macOS and Linux (and, in phase 5, Android). The core is Rust; the window
shows the official Growvia web app, so the SI, the voice and the NASA data keep running on the server.

## What Rust does here
- **Loading and offline screen** (`ui/index.html`): checks the connection, then opens the dashboard. Without internet it offers "Try again" and "Open saved pages".
- **Real window and menu**: Growvia (Home, Dashboard, Register farm, Print / Save PDF `Ctrl+P`, Reload, Open in browser, Quit), Edit and View.
- **Remembers size and position** (window-state plugin) and **one instance only** (a second launch focuses the open window).
- **External links** (WhatsApp, GitHub…) open in the system browser; Growvia pages stay in the app.
- **Print / Save as PDF** with the system dialog, also from the web (`lib/desktop.ts` → `print_page`).
- The web knows it runs inside the app (`window.__GROWVIA_DESKTOP__`): it hides the download button and shows the version on `/download`.

## Build
Requirements: Rust (stable) and Node 20+. On Linux also `libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libayatana-appindicator3-dev`.

```bash
cd desktop
npm install
GROWVIA_URL=https://your-app.vercel.app npm run build   # installers in src-tauri/target/release/bundle/
```

- `GROWVIA_URL`: the official web app (default `https://growvia.vercel.app`). If you use a custom domain, also add it to `src-tauri/capabilities/remote.json`.
- Development against the local web: `npm run dev` in the root, then `GROWVIA_URL=http://localhost:3000 npm run dev` here.
- `GROWVIA_START_PATH=/download` opens another first page (testing).
- Icons: `npm run icons` regenerates them from `public/brand/growvia-mark.png`.
- Tests: `cargo test` in `src-tauri/`.
