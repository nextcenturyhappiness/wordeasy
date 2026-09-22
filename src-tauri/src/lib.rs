fn navigation_is_local_for_build(url: &tauri::Url, debug: bool) -> bool {
    if debug {
        return url.scheme() == "http"
            && url.host_str() == Some("127.0.0.1")
            && url.port() == Some(1420);
    }

    url.scheme() == "tauri" && url.host_str() == Some("localhost")
}

fn navigation_is_allowed_for_build(url: &tauri::Url, debug: bool) -> bool {
    navigation_is_local_for_build(url, debug)
}

fn navigation_is_allowed(url: &tauri::Url) -> bool {
    navigation_is_allowed_for_build(url, cfg!(debug_assertions))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri::plugin::Builder::<_, ()>::new("navigation-guard")
                .on_navigation(|_webview, url| navigation_is_allowed(url))
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::navigation_is_allowed_for_build;

    #[test]
    fn rejects_unrelated_remote_navigation() {
        let remote = tauri::Url::parse("https://example.com/").expect("valid remote URL");
        assert!(!navigation_is_allowed_for_build(&remote, true));
        assert!(!navigation_is_allowed_for_build(&remote, false));
    }

    #[test]
    fn navigation_guard_allows_only_the_expected_build_origin() {
        let production =
            tauri::Url::parse("tauri://localhost/today/research").expect("valid production URL");
        let development =
            tauri::Url::parse("http://127.0.0.1:1420/today/research").expect("valid dev URL");

        assert!(navigation_is_allowed_for_build(&development, true));
        assert!(!navigation_is_allowed_for_build(&production, true));
        assert!(navigation_is_allowed_for_build(&production, false));
        assert!(!navigation_is_allowed_for_build(&development, false));
    }

    #[test]
    fn navigation_guard_rejects_supabase_and_other_remote_origins() {
        let personal_host = ["kksllqgtjtfxfnknlrfn", "supabase", "co"].join(".");
        let auth = tauri::Url::parse(&format!("https://{personal_host}/auth/v1/otp"))
            .expect("valid supabase auth URL");
        let functions =
            tauri::Url::parse(&format!("https://{personal_host}/functions/v1/review-sync"))
                .expect("valid supabase function URL");
        let realtime = tauri::Url::parse(&format!("wss://{personal_host}/realtime/v1/websocket"))
            .expect("valid supabase realtime URL");
        let other_project = tauri::Url::parse("https://another-project.supabase.co/auth/v1/otp")
            .expect("valid other project URL");

        assert!(!navigation_is_allowed_for_build(&auth, true));
        assert!(!navigation_is_allowed_for_build(&auth, false));
        assert!(!navigation_is_allowed_for_build(&functions, false));
        assert!(!navigation_is_allowed_for_build(&realtime, false));
        assert!(!navigation_is_allowed_for_build(&other_project, false));
    }
}
