use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

pub fn init_shortcuts(app: &AppHandle) {
    
    // Register default shortcuts
    if let Ok(cmd_space) = "ctrl+space".parse::<Shortcut>() {
        let _ = app.global_shortcut().register(cmd_space);
    }
    if let Ok(expand) = "ctrl+shift+space".parse::<Shortcut>() {
        let _ = app.global_shortcut().register(expand);
    }
    if let Ok(toggle) = "ctrl+shift+b".parse::<Shortcut>() {
        let _ = app.global_shortcut().register(toggle);
    }
}
