fn main() {
    // Declaring the app commands creates one permission per command ("allow-set-farm"…), so each window /
    // origin gets only the ones listed in capabilities/*.json (the remote web app needs them explicitly).
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
            "app_url_cmd",
            "start_path",
            "print_page",
            "open_external",
            "set_farm",
        ])),
    )
    .expect("failed to run tauri-build");
}
