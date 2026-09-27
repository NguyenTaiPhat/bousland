use tauri_app_lib::system::config::{BousSettings, DockPosition};

#[test]
fn test_dock_position_serialization() {
    let settings = BousSettings {
        dock_position: DockPosition::TopLeft,
        island_x_offset: 15.0,
        island_y_offset: 0.0,
        ..Default::default()
    };

    let json = serde_json::to_string(&settings).expect("Must serialize");
    assert!(json.contains("\"dock_position\":\"TOP_LEFT\""));

    let deserialized: BousSettings = serde_json::from_str(&json).expect("Must deserialize");
    assert_eq!(deserialized.dock_position, DockPosition::TopLeft);
    assert_eq!(deserialized.island_x_offset, 15.0);
}

#[test]
fn test_dock_position_defaults() {
    let settings = BousSettings::default();
    assert_eq!(settings.dock_position, DockPosition::TopCenter);
    assert_eq!(settings.island_x_offset, 0.0);
    assert_eq!(settings.island_y_offset, 0.0);
}
