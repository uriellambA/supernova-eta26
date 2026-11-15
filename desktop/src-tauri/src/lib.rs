//! Growvia Desktop: the official app, written in Rust with Tauri 2.
//!
//! The window first shows a small local screen (`ui/index.html`): it checks the connection and then opens the
//! official Growvia web app (where the SI, the voice and the NASA data run). Rust takes care of what a website
//! cannot do: a real window with its menu, remembering size and position, a single instance, sending external
//! links (WhatsApp, GitHub…) to the system browser, and printing / saving the plan as PDF with the native dialog.
//! Phase 3: frost and wind alerts in the background (`alerts.rs`), an icon next to the clock with tonight's
//! minimum, closing the window keeps Growvia running there, and signed automatic updates.

//! Phase 5: the same project builds the Android app (APK); PC-only parts live in `pc.rs`.

mod alerts;
#[cfg(desktop)]
mod pc;

use std::sync::Arc;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_notification::NotificationExt;

/// Official web app. Set it when building (`GROWVIA_URL=https://… npm run build`) or at run time with the same variable.
const DEFAULT_URL: &str = "https://growvia-coral.vercel.app";

pub(crate) fn app_url() -> String {
    std::env::var("GROWVIA_URL")
        .ok()
        .or_else(|| option_env!("GROWVIA_URL").map(String::from))
        .unwrap_or_else(|| DEFAULT_URL.to_string())
        .trim_end_matches('/')
        .to_string()
}

/// Runs in every page of the window (local and remote) before its own scripts.
const INIT_SCRIPT: &str = r#"
(() => {
  window.__GROWVIA_DESKTOP__ = { version: "__VERSION__", platform: "__OS__" };
  // Pages that open a new tab (the PDF plan, WhatsApp): same-site pages open here, the rest in the browser.
  window.open = function (url) {
    try { window.location.href = new URL(String(url), window.location.href).href; } catch (e) {}
    return null;
  };
})();
"#;

/// URL the web app should use (shown by the loading screen).
#[tauri::command]
fn app_url_cmd() -> String {
    app_url()
}

/// First page to open (the dashboard). `GROWVIA_START_PATH=/download` opens another one (handy for testing).
#[tauri::command]
fn start_path() -> String {
    std::env::var("GROWVIA_START_PATH").ok().filter(|p| p.starts_with('/')).unwrap_or_else(|| "/app".to_string())
}

/// Native print dialog of the current page (from there: "Save as PDF").
#[tauri::command]
fn print_page(window: WebviewWindow) -> Result<(), String> {
    #[cfg(desktop)]
    return window.print().map_err(|e| e.to_string());
    #[cfg(mobile)]
    {
        let _ = window;
        Err("printing is not available on this device".into())
    }
}

/// Opens a link in the system browser.
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    tauri_plugin_opener::open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// The web app tells Rust where the farm is (and the language), for the background alerts.
#[tauri::command]
fn set_farm(state: tauri::State<'_, Arc<alerts::Shared>>, lat: f64, lon: f64, name: String, lang: String) {
    if !(lat.is_finite() && lon.is_finite() && lat.abs() <= 90.0 && lon.abs() <= 180.0) {
        return;
    }
    let farm = alerts::Farm { lat, lon, name: name.chars().take(60).collect() };
    let changed = {
        let mut s = state.settings.lock().unwrap();
        let lang = if lang == "en" { "en" } else { "es" }.to_string();
        let changed = s.farm.as_ref() != Some(&farm) || s.lang != lang;
        s.farm = Some(farm);
        s.lang = lang;
        changed
    };
    if changed {
        state.save();
        state.check_now();
    }
}

pub(crate) fn es(app: &AppHandle) -> bool {
    app.state::<Arc<alerts::Shared>>().settings.lock().unwrap().lang != "en"
}

/// Pages that belong to the app; anything else goes to the system browser.
fn is_internal(url: &Url, app_host: &str) -> bool {
    match url.scheme() {
        "tauri" | "asset" | "about" | "data" | "blob" | "ipc" => true,
        "http" | "https" => match url.host_str() {
            Some(h) => h == app_host || h == "tauri.localhost" || h == "localhost" || h == "127.0.0.1",
            None => false,
        },
        _ => false,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(desktop)]
    let builder = builder
        // a second launch focuses the window that is already open
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build());
    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![app_url_cmd, start_path, print_page, open_external, set_farm])
        .setup(|app| {
            // ---------- background alerts ----------
            let (tx, rx) = std::sync::mpsc::channel();
            let path = app.path().app_config_dir()?.join("settings.json");
            let shared = alerts::Shared::load(path, tx);
            app.manage(shared.clone());

            let base = app_url();
            let host = Url::parse(&base).ok().and_then(|u| u.host_str().map(String::from)).unwrap_or_default();
            let init = INIT_SCRIPT.replace("__VERSION__", &app.package_info().version.to_string()).replace("__OS__", std::env::consts::OS);

            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()));
            #[cfg(desktop)]
            let window = window.title("Growvia").inner_size(1280.0, 820.0).min_inner_size(420.0, 600.0).center();
            window
                .initialization_script(&init)
                .on_navigation(move |url| {
                    if is_internal(url, &host) {
                        return true;
                    }
                    let _ = tauri_plugin_opener::open_url(url.as_str(), None::<&str>);
                    false
                })
                .build()?;

            // ---------- PC: menu, icon next to the clock, close to background, updates ----------
            #[cfg(desktop)]
            pc::setup(app, &shared)?;

            // Android 13+: ask once for permission to show notifications (frost / wind alerts)
            #[cfg(mobile)]
            {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    use tauri_plugin_notification::PermissionState;
                    if let Ok(PermissionState::Prompt | PermissionState::PromptWithRationale) = handle.notification().permission_state() {
                        let _ = handle.notification().request_permission();
                    }
                });
            }

            // ---------- the loop: forecast → tray text + notifications ----------
            let handle = app.handle().clone();
            alerts::run_loop(shared, rx, move |new, status| {
                let es = es(&handle);
                let farm = handle.state::<Arc<alerts::Shared>>().settings.lock().unwrap().farm.clone();
                let label = match (status.tonight, &farm) {
                    (_, None) => if es { "Abrí el panel para elegir tu chacra".to_string() } else { "Open the dashboard to choose your farm".to_string() },
                    (Some(t), Some(_)) => if es { format!("Esta noche: mínima {t:.0} °C") } else { format!("Tonight: low {t:.0} °C") },
                    (None, Some(_)) => if es { "Esta noche: sin pronóstico (¿hay internet?)".to_string() } else { "Tonight: no forecast (internet?)".to_string() },
                };
                #[cfg(desktop)]
                pc::update_tray(&handle, &label);
                #[cfg(mobile)]
                let _ = &label;
                for a in new {
                    let _ = handle.notification().builder().title(&a.title).body(&a.body).show();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Growvia");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn internal_and_external_links() {
        let host = "growvia-coral.vercel.app";
        assert!(is_internal(&Url::parse("https://growvia-coral.vercel.app/app").unwrap(), host));
        assert!(is_internal(&Url::parse("http://tauri.localhost/index.html").unwrap(), host));
        assert!(is_internal(&Url::parse("tauri://localhost/index.html").unwrap(), host));
        assert!(!is_internal(&Url::parse("https://wa.me/?text=hola").unwrap(), host));
        assert!(!is_internal(&Url::parse("https://github.com/uriellambA/supernova-eta26").unwrap(), host));
        assert!(!is_internal(&Url::parse("mailto:hola@example.com").unwrap(), host));
    }
}
