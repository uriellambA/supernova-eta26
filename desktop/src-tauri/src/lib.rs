//! Growvia Desktop: the official app, written in Rust with Tauri 2.
//!
//! The window first shows a small local screen (`ui/index.html`): it checks the connection and then opens the
//! official Growvia web app (where the SI, the voice and the NASA data run). Rust takes care of what a website
//! cannot do: a real window with its menu, remembering size and position, a single instance, sending external
//! links (WhatsApp, GitHub…) to the system browser, and printing / saving the plan as PDF with the native dialog.

use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

/// Official web app. Set it when building (`GROWVIA_URL=https://… npm run build`) or at run time with the same variable.
const DEFAULT_URL: &str = "https://growvia.vercel.app";

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
        .invoke_handler(tauri::generate_handler![app_url_cmd, start_path, print_page, open_external])
        .setup(|app| {
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
                _ => {}
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
        let host = "growvia.vercel.app";
        assert!(is_internal(&Url::parse("https://growvia.vercel.app/app").unwrap(), host));
        assert!(is_internal(&Url::parse("http://tauri.localhost/index.html").unwrap(), host));
        assert!(is_internal(&Url::parse("tauri://localhost/index.html").unwrap(), host));
        assert!(!is_internal(&Url::parse("https://wa.me/?text=hola").unwrap(), host));
        assert!(!is_internal(&Url::parse("https://github.com/uriellambA/supernova-eta26").unwrap(), host));
        assert!(!is_internal(&Url::parse("mailto:hola@example.com").unwrap(), host));
    }
}
