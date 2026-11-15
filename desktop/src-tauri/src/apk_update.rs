//! Android: a sideloaded APK has no store to update it, so the app checks GitHub Releases itself.
//! A few seconds after opening, if a newer "desktop-vX.Y.Z" release has an APK, it asks to download it
//! (the phone then installs it over the current version: same signing key).

const LATEST: &str = "https://api.github.com/repos/uriellambA/supernova-eta26/releases/latest";

/// "desktop-v0.1.10" / "v0.1.10" / "0.1.10" → (0, 1, 10)
pub fn parse_version(tag: &str) -> Option<(u32, u32, u32)> {
    let v = tag.trim().trim_start_matches("desktop-").trim_start_matches('v');
    let mut it = v.split(['.', '-']).map(|x| x.parse::<u32>());
    Some((it.next()?.ok()?, it.next()?.ok()?, it.next().and_then(|x| x.ok()).unwrap_or(0)))
}

/// From the GitHub "latest release" JSON: the version and the APK download link, if newer than `current`.
pub fn newer_apk(release_json: &str, current: &str) -> Option<(String, String)> {
    let v: serde_json::Value = serde_json::from_str(release_json).ok()?;
    let tag = v.get("tag_name")?.as_str()?;
    if parse_version(tag)? <= parse_version(current)? {
        return None;
    }
    let url = v.get("assets")?.as_array()?.iter().find_map(|a| {
        let name = a.get("name")?.as_str()?;
        if name.ends_with(".apk") { a.get("browser_download_url")?.as_str().map(String::from) } else { None }
    })?;
    Some((tag.trim_start_matches("desktop-v").to_string(), url))
}

#[cfg(mobile)]
pub fn spawn_check(app: tauri::AppHandle) {
    use tauri::Manager;
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(8));
        let current = app.package_info().version.to_string();
        let Ok(resp) = ureq::get(LATEST).set("User-Agent", "growvia-android").timeout(std::time::Duration::from_secs(15)).call() else { return };
        let Ok(body) = resp.into_string() else { return };
        let Some((version, url)) = newer_apk(&body, &current) else { return };
        let es = app.state::<std::sync::Arc<crate::alerts::Shared>>().settings.lock().map(|s| s.lang != "en").unwrap_or(true);
        let (title, msg, yes, no) = if es {
            ("Nueva versión de Growvia", format!("Está disponible Growvia {version} (tenés la {current}). ¿Querés descargarla? Después abrí el archivo para instalarla encima, sin perder tus datos."), "Descargar", "Más tarde")
        } else {
            ("New Growvia version", format!("Growvia {version} is available (you have {current}). Download it? Then open the file to install it over this one, keeping your data."), "Download", "Later")
        };
        let ok = app.dialog().message(msg).title(title).buttons(MessageDialogButtons::OkCancelCustom(yes.into(), no.into())).blocking_show();
        if ok {
            let _ = tauri_plugin_opener::open_url(url, None::<&str>);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn versions() {
        assert_eq!(parse_version("desktop-v0.1.10"), Some((0, 1, 10)));
        assert_eq!(parse_version("v1.2"), Some((1, 2, 0)));
        assert!(parse_version("desktop-v0.2.0") > parse_version("0.1.9"));
        assert_eq!(parse_version("latest"), None);
    }

    #[test]
    fn finds_a_newer_apk_only() {
        let rel = r#"{"tag_name":"desktop-v0.1.1","assets":[
            {"name":"Growvia_0.1.1_x64-setup.exe","browser_download_url":"https://x/a.exe"},
            {"name":"Growvia_0.1.1_android.apk","browser_download_url":"https://x/Growvia_0.1.1_android.apk"}]}"#;
        assert_eq!(newer_apk(rel, "0.1.0"), Some(("0.1.1".into(), "https://x/Growvia_0.1.1_android.apk".into())));
        assert_eq!(newer_apk(rel, "0.1.1"), None);
        assert_eq!(newer_apk(rel, "0.2.0"), None);
        let no_apk = r#"{"tag_name":"desktop-v0.1.1","assets":[]}"#;
        assert_eq!(newer_apk(no_apk, "0.1.0"), None);
    }
}
