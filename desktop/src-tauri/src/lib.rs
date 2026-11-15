//! Growvia Desktop: the official app, written in Rust with Tauri 2.
//!
//! The window first shows a small local screen (`ui/index.html`): it checks the connection and then opens the
//! official Growvia web app (where the SI, the voice and the NASA data run). Rust takes care of what a website
//! cannot do: a real window with its menu, remembering size and position, a single instance, sending external
//! links (WhatsApp, GitHub…) to the system browser, and printing / saving the plan as PDF with the native dialog.
//! Phase 3: frost and wind alerts in the background (`alerts.rs`), an icon next to the clock with tonight's
//! minimum, closing the window keeps Growvia running there, and signed automatic updates.

mod alerts;

use std::sync::Arc;
use tauri::menu::{CheckMenuItem, CheckMenuItemBuilder, MenuBuilder, MenuItem, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Wry};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_updater::UpdaterExt;

/// Official web app. Set it when building (`GROWVIA_URL=https://… npm run build`) or at run time with the same variable.
const DEFAULT_URL: &str = "https://growvia-coral.vercel.app";

fn app_url() -> String {
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
    window.print().map_err(|e| e.to_string())
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

/// Tray items that change while the app runs.
struct TrayItems {
    tonight: MenuItem<Wry>,
    alerts: CheckMenuItem<Wry>,
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn es(app: &AppHandle) -> bool {
    app.state::<Arc<alerts::Shared>>().settings.lock().unwrap().lang != "en"
}

/// Checks GitHub Releases for a signed new version; asks before installing it.
async fn check_update(app: AppHandle, manual: bool) {
    let es = es(&app);
    let found = match app.updater() {
        Ok(u) => u.check().await,
        Err(e) => Err(e),
    };
    match found {
        Ok(Some(update)) => {
            let (title, msg) = if es {
                ("Nueva versión de Growvia", format!("Está disponible Growvia {}. ¿Querés instalarla ahora? La app se reinicia sola.", update.version))
            } else {
                ("New Growvia version", format!("Growvia {} is available. Install it now? The app restarts by itself.", update.version))
            };
            let yes = app.dialog().message(msg).title(title).buttons(MessageDialogButtons::OkCancelCustom(
                if es { "Instalar" } else { "Install" }.into(),
                if es { "Más tarde" } else { "Later" }.into(),
            )).blocking_show();
            if yes && update.download_and_install(|_, _| {}, || {}).await.is_ok() {
                app.restart();
            }
        }
        Ok(None) if manual => {
            let _ = app.dialog().message(if es { "Ya tenés la última versión de Growvia." } else { "You already have the latest Growvia." }).title("Growvia").blocking_show();
        }
        Err(e) if manual => {
            let _ = app.dialog().message(format!("{}: {e}", if es { "No se pudo buscar actualizaciones" } else { "Could not check for updates" })).title("Growvia").blocking_show();
        }
        _ => {}
    }
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

fn go(app: &AppHandle, path: &str) {
    if let (Some(w), Ok(url)) = (app.get_webview_window("main"), Url::parse(&format!("{}{}", app_url(), path))) {
        let _ = w.navigate(url);
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // a second launch focuses the window that is already open
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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

            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Growvia")
                .inner_size(1280.0, 820.0)
                .min_inner_size(420.0, 600.0)
                .center()
                .initialization_script(&init)
                .on_navigation(move |url| {
                    if is_internal(url, &host) {
                        return true;
                    }
                    let _ = tauri_plugin_opener::open_url(url.as_str(), None::<&str>);
                    false
                })
                .build()?;

            // ---------- menu ----------
            let growvia = SubmenuBuilder::new(app, "Growvia")
                .item(&MenuItemBuilder::with_id("home", "Inicio · Home").accelerator("CmdOrCtrl+1").build(app)?)
                .item(&MenuItemBuilder::with_id("dashboard", "Panel · Dashboard").accelerator("CmdOrCtrl+2").build(app)?)
                .item(&MenuItemBuilder::with_id("register", "Registrar chacra · Register farm").accelerator("CmdOrCtrl+3").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("print", "Imprimir / Guardar PDF · Print / Save PDF").accelerator("CmdOrCtrl+P").build(app)?)
                .item(&MenuItemBuilder::with_id("reload", "Recargar · Reload").accelerator("CmdOrCtrl+R").build(app)?)
                .item(&MenuItemBuilder::with_id("browser", "Abrir en el navegador · Open in browser").build(app)?)
                .item(&MenuItemBuilder::with_id("update", "Buscar actualizaciones · Check for updates").build(app)?)
                .separator()
                .item(&PredefinedMenuItem::quit(app, Some("Salir · Quit"))?)
                .build()?;
            let edit = SubmenuBuilder::new(app, "Editar · Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;
            let view = SubmenuBuilder::new(app, "Ver · View")
                .item(&PredefinedMenuItem::fullscreen(app, Some("Pantalla completa · Full screen"))?)
                .item(&PredefinedMenuItem::minimize(app, Some("Minimizar · Minimize"))?)
                .build()?;
            let menu = MenuBuilder::new(app).items(&[&growvia, &edit, &view]).build()?;
            app.set_menu(menu)?;
            app.on_menu_event(|app, event| match event.id().as_ref() {
                "home" => go(app, "/"),
                "dashboard" => go(app, "/app"),
                "register" => go(app, "/register"),
                "print" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.print();
                    }
                }
                "reload" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.eval("location.reload()");
                    }
                }
                "browser" => {
                    let _ = tauri_plugin_opener::open_url(app_url(), None::<&str>);
                }
                "update" => {
                    let app = app.clone();
                    tauri::async_runtime::spawn(check_update(app, true));
                }
                _ => {}
            });

            // ---------- icon next to the clock ----------
            let on = shared.settings.lock().unwrap().alerts;
            let tonight = MenuItemBuilder::with_id("tonight", "Esta noche: buscando pronóstico…").enabled(false).build(app)?;
            let alerts_item = CheckMenuItemBuilder::with_id("alerts", "Alertas de helada y viento").checked(on).build(app)?;
            let tray_menu = MenuBuilder::new(app)
                .item(&MenuItemBuilder::with_id("open", "Abrir Growvia").build(app)?)
                .separator()
                .item(&tonight)
                .item(&alerts_item)
                .item(&MenuItemBuilder::with_id("check", "Revisar el pronóstico ahora").build(app)?)
                .item(&MenuItemBuilder::with_id("update", "Buscar actualizaciones").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("quit", "Salir de Growvia").build(app)?)
                .build()?;
            app.manage(TrayItems { tonight: tonight.clone(), alerts: alerts_item.clone() });
            TrayIconBuilder::with_id("growvia")
                .icon(app.default_window_icon().cloned().ok_or("no icon")?)
                .tooltip("Growvia")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_main(app),
                    "check" => app.state::<Arc<alerts::Shared>>().check_now(),
                    "update" => {
                        tauri::async_runtime::spawn(check_update(app.clone(), true));
                    }
                    "alerts" => {
                        let st = app.state::<Arc<alerts::Shared>>();
                        let on = {
                            let mut s = st.settings.lock().unwrap();
                            s.alerts = !s.alerts;
                            s.alerts
                        };
                        st.save();
                        let _ = app.state::<TrayItems>().alerts.set_checked(on);
                        if on {
                            st.check_now();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            // closing the window keeps Growvia next to the clock, so the alerts keep working
            if let Some(w) = app.get_webview_window("main") {
                let handle = app.handle().clone();
                w.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(w) = handle.get_webview_window("main") {
                            let _ = w.hide();
                        }
                        let st = handle.state::<Arc<alerts::Shared>>();
                        let first = { let mut s = st.settings.lock().unwrap(); let f = !s.tray_tip; s.tray_tip = true; f };
                        if first {
                            st.save();
                            let es = es(&handle);
                            let _ = handle.notification().builder()
                                .title("Growvia")
                                .body(if es { "Growvia sigue junto al reloj para avisarte de heladas y viento. Para cerrarla del todo: clic derecho → Salir." } else { "Growvia keeps running next to the clock to warn you about frost and wind. To quit: right-click → Quit." })
                                .show();
                        }
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
                let _ = handle.state::<TrayItems>().tonight.set_text(&label);
                if let Some(tray) = handle.tray_by_id("growvia") {
                    let _ = tray.set_tooltip(Some(format!("Growvia · {label}")));
                }
                for a in new {
                    let _ = handle.notification().builder().title(&a.title).body(&a.body).show();
                }
            });

            // ---------- updates: a minute after start, then every 12 hours ----------
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio_sleep(60).await;
                loop {
                    check_update(handle.clone(), false).await;
                    tokio_sleep(12 * 60 * 60).await;
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Growvia");
}

async fn tokio_sleep(secs: u64) {
    tokio::time::sleep(std::time::Duration::from_secs(secs)).await;
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
