//! PC only (Windows, macOS, Linux): menu, icon next to the clock, closing to the background and signed updates.

use crate::{alerts, app_url, es};
use std::sync::Arc;
use tauri::menu::{CheckMenuItem, CheckMenuItemBuilder, MenuBuilder, MenuItem, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Manager, Url, Wry};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_updater::UpdaterExt;

/// Tray items that change while the app runs.
struct TrayItems {
    tonight: MenuItem<Wry>,
    alerts: CheckMenuItem<Wry>,
}

pub fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
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

fn go(app: &AppHandle, path: &str) {
    if let (Some(w), Ok(url)) = (app.get_webview_window("main"), Url::parse(&format!("{}{}", app_url(), path))) {
        let _ = w.navigate(url);
        let _ = w.set_focus();
    }
}


/// Menu, tray, close-to-tray and the update loop.
pub fn setup(app: &mut App, shared: &Arc<alerts::Shared>) -> Result<(), Box<dyn std::error::Error>> {
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
}

/// Tonight's low in the tray menu and tooltip.
pub fn update_tray(handle: &AppHandle, label: &str) {
    let _ = handle.state::<TrayItems>().tonight.set_text(label);
    if let Some(tray) = handle.tray_by_id("growvia") {
        let _ = tray.set_tooltip(Some(format!("Growvia · {label}")));
    }
}

async fn tokio_sleep(secs: u64) {
    tokio::time::sleep(std::time::Duration::from_secs(secs)).await;
}

