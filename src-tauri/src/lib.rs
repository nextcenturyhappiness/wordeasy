fn navigation_is_local_for_build(url: &tauri::Url, debug: bool) -> bool {
    if debug {
        return url.scheme() == "http"
            && url.host_str() == Some("127.0.0.1")
            && url.port() == Some(1420);
    }

    url.scheme() == "tauri" && url.host_str() == Some("localhost")
}

fn navigation_is_local(url: &tauri::Url) -> bool {
    navigation_is_local_for_build(url, cfg!(debug_assertions))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri::plugin::Builder::<_, ()>::new("navigation-guard")
                .on_navigation(|_webview, url| navigation_is_local(url))
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::navigation_is_local_for_build;

    #[test]
    fn rejects_remote_navigation() {
        let remote = tauri::Url::parse("https://example.com/").expect("valid remote URL");
        assert!(!navigation_is_local_for_build(&remote, true));
        assert!(!navigation_is_local_for_build(&remote, false));
    }

    #[test]
    fn navigation_guard_allows_only_the_expected_build_origin() {
        let production =
            tauri::Url::parse("tauri://localhost/today/research").expect("valid production URL");
        let development =
            tauri::Url::parse("http://127.0.0.1:1420/today/research").expect("valid dev URL");

        assert!(navigation_is_local_for_build(&development, true));
        assert!(!navigation_is_local_for_build(&production, true));
        assert!(navigation_is_local_for_build(&production, false));
        assert!(!navigation_is_local_for_build(&development, false));
    }
}
