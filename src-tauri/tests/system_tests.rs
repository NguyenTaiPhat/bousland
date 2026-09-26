use tauri_app_lib::windows::manager::MonitorInfo;
use tauri_app_lib::system::battery::get_battery_status_native;

#[test]
fn test_monitor_info_serialization() {
    let info = MonitorInfo {
        name: Some("Primary".to_string()),
        width: 1920,
        height: 1080,
        scale_factor: 1.25,
        is_primary: true,
    };

    let serialized = serde_json::to_string(&info).expect("Failed to serialize");
    assert!(serialized.contains("1920"));
    assert!(serialized.contains("Primary"));
}

#[test]
fn test_battery_native_query() {
    // Should run on any Windows system without panicking
    let status = get_battery_status_native();
    assert!(status.percentage <= 100);
}

#[test]
fn test_classify_clipboard_content() {
    use tauri_app_lib::system::clipboard::classify_content;

    assert_eq!(classify_content("https://tauri.app/v2"), "url");
    assert_eq!(classify_content("http://localhost:1420"), "url");
    assert_eq!(classify_content("#3E3E48"), "color");
    assert_eq!(classify_content("rgb(255, 100, 50)"), "color");
    assert_eq!(classify_content("const isExpanded = true;"), "code");
    assert_eq!(classify_content("pub fn get_volume() {}"), "code");
    assert_eq!(classify_content("Xin chào BousLand desktop"), "text");
}

#[test]
fn test_volume_scalar_conversion() {
    use tauri_app_lib::system::volume::{scalar_to_volume, volume_to_scalar};

    assert_eq!(volume_to_scalar(0), 0.0);
    assert_eq!(volume_to_scalar(50), 0.5);
    assert_eq!(volume_to_scalar(100), 1.0);
    assert_eq!(volume_to_scalar(150), 1.0); // clamped

    assert_eq!(scalar_to_volume(0.0), 0);
    assert_eq!(scalar_to_volume(0.499), 50);
    assert_eq!(scalar_to_volume(1.0), 100);
}

#[test]
fn test_normalize_launch_target() {
    use tauri_app_lib::system::launcher::normalize_launch_target;

    assert_eq!(normalize_launch_target("https://youtube.com"), "https://youtube.com");
    assert_eq!(normalize_launch_target("google.com"), "https://google.com");
    assert_eq!(normalize_launch_target("calc"), "calc");
    assert_eq!(normalize_launch_target("notepad"), "notepad");
}

