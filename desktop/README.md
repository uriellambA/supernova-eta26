# Growvia Desktop and Android (Rust + Tauri 2)

The official Growvia app for Windows, macOS and Linux (and, in phase 5, Android). The core is Rust; the window
shows the official Growvia web app, so the SI, the voice and the NASA data keep running on the server.

## What Rust does here
- **Loading and offline screen** (`ui/index.html`): checks the connection, then opens the dashboard. Without internet it offers "Try again" and "Open saved pages".
- **Real window and menu**: Growvia (Home, Dashboard, Register farm, Print / Save PDF `Ctrl+P`, Reload, Open in browser, Quit), Edit and View.
- **Remembers size and position** (window-state plugin) and **one instance only** (a second launch focuses the open window).
- **External links** (WhatsApp, GitHub…) open in the system browser; Growvia pages stay in the app.
- **Print / Save as PDF** with the system dialog, also from the web (`lib/desktop.ts` → `print_page`).
- **Frost and wind alerts in the background** (`src-tauri/src/alerts.rs`): the dashboard tells the app where the farm is (`set_farm`); every 3 hours Rust reads the Open-Meteo forecast and sends a system notification for frost tonight / tomorrow night (≤ 0 °C, "hard" ≤ −3 °C) or gusts ≥ 60 km/h. Each alert is sent once. Settings live in the app config folder (`settings.json`).
- **Icon next to the clock**: tonight's low in the menu and tooltip, alerts on/off, "Check the forecast now", "Check for updates", Quit. Closing the window keeps Growvia there so alerts keep working (a one-time notification explains it).
- **Signed automatic updates** (updater plugin): a minute after start and every 12 hours it checks `latest.json` in GitHub Releases, asks, installs and restarts. Releases must be signed with the private key (secret `TAURI_SIGNING_PRIVATE_KEY`, phase 4); the public key is in `tauri.conf.json`.
- **Security**: the web app can only call `print_page`, `open_external` and `set_farm` (`capabilities/remote.json`).
- The web knows it runs inside the app (`window.__GROWVIA_DESKTOP__`): it hides the download button and shows the version on `/download`.

## Build
Requirements: Rust (stable) and Node 20+. On Linux also `libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libayatana-appindicator3-dev`.

```bash
cd desktop
npm install
GROWVIA_URL=https://your-app.vercel.app npm run build   # installers in src-tauri/target/release/bundle/
```

- `GROWVIA_URL`: the official web app (default `https://growvia-coral.vercel.app`). If you use a custom domain, also add it to `src-tauri/capabilities/remote.json`.
- Development against the local web: `npm run dev` in the root, then `GROWVIA_URL=http://localhost:3000 npm run dev` here.
- `GROWVIA_START_PATH=/download` opens another first page (testing).
- `GROWVIA_FORECAST_URL=http://127.0.0.1:8765/v1/forecast` replaces Open-Meteo (testing the alerts with a fake forecast).
- The default web app is `https://growvia-coral.vercel.app`.
- Icons: `npm run icons` regenerates them from `public/brand/growvia-mark.png`.
- Tests: `cargo test` in `src-tauri/`.

## Publish a version (GitHub Actions)
`.github/workflows/desktop-release.yml` builds the Windows (`-setup.exe`, `.msi`), macOS (universal `.dmg`) and Linux (`.AppImage`, `.deb`, `.rpm`) installers on GitHub's machines and publishes them as a Release. The `/download` page and the "Download Growvia Desktop" button pick up the latest one automatically (`/api/release`).

1. **Once:** in the repository, Settings → Secrets and variables → Actions → New repository secret:
   - `TAURI_SIGNING_PRIVATE_KEY`: the whole content of `growvia-updater.key` (signs automatic updates).
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: leave it out (the key has no password).
2. Bump the version in `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `package.json`.
3. Push a tag:
   ```bash
   git tag desktop-v0.1.0
   git push origin desktop-v0.1.0
   ```
   (or Actions → "Growvia Desktop release" → Run workflow, with the tag name).

It takes ~15–20 minutes. Installed apps find the new version by themselves (`latest.json` in the Release).

## Android (APK)
The same Rust project builds the Android app. PC-only parts (menu, tray, close to background, updater, window state) are in `src-tauri/src/pc.rs` (`#[cfg(desktop)]`); alerts, the bridge with the web and the loading screen are shared. On Android the frost / wind alerts run while the app is open, and Android 13+ asks once for permission to show notifications.

`.github/workflows/android.yml` builds and signs the APK on GitHub (the Android SDK and NDK are there): on every push to `desktop/` it is attached to the run as an artifact; on a `desktop-v*` tag it is also added to the Release, and `/download` shows it.

Signing (Settings → Secrets and variables → Actions):
- `ANDROID_KEYSTORE_BASE64`: content of `ANDROID_KEYSTORE_BASE64.txt` (the keystore `growvia-android.jks` in base64).
- `ANDROID_KEYSTORE_PASSWORD`: content of `ANDROID_KEYSTORE_PASSWORD.txt`.
Keep the keystore safe: every future APK must be signed with it, or phones will not install the update over the old version.

Locally (needs Android Studio / SDK + NDK, `NDK_HOME`): `npx tauri android init`, then `npx tauri android build --apk`.
