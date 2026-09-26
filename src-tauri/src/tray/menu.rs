use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let title_item = MenuItem::with_id(app, "title", "BousLand", false, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let toggle_island =
        MenuItem::with_id(app, "toggle_island", "Ẩn / Hiện Island", true, None::<&str>)?;
    let control_center =
        MenuItem::with_id(app, "control_center", "Trung tâm điều khiển", true, None::<&str>)?;
    let command_bar = MenuItem::with_id(app, "command_bar", "Thanh lệnh", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let settings = MenuItem::with_id(app, "settings", "Cài đặt", true, None::<&str>)?;
    let modules = MenuItem::with_id(app, "modules", "Mô-đun", true, None::<&str>)?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let pause = MenuItem::with_id(app, "pause", "Tạm dừng", true, None::<&str>)?;
    let sep4 = PredefinedMenuItem::separator(app)?;
    let is_autostart = crate::system::autostart::is_autostart_enabled();
    let autostart = CheckMenuItem::with_id(
        app,
        "autostart",
        "Khởi động cùng Windows",
        true,
        is_autostart,
        None::<&str>,
    )?;
    let sep5 = PredefinedMenuItem::separator(app)?;
    let exit_item = MenuItem::with_id(app, "exit", "Thoát BousLand", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &title_item,
            &sep1,
            &toggle_island,
            &control_center,
            &command_bar,
            &sep2,
            &settings,
            &modules,
            &sep3,
            &pause,
            &sep4,
            &autostart,
            &sep5,
            &exit_item,
        ],
    )?;

    let icon = match app.default_window_icon() {
        Some(i) => i.clone(),
        None => return Ok(()),
    };

    let _tray = TrayIconBuilder::with_id("bousland-tray")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("BousLand - Không gian thông minh trên Windows")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "toggle_island" => {
                let _ = app.emit("bous://toggle-visibility", ());
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                }
            }
            "control_center" => {
                let _ = app.emit("bous://open-control-center", ());
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "command_bar" => {
                let _ = app.emit("bous://open-command-bar", ());
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "settings" | "modules" => {
                let _ = app.emit("bous://open-settings", ());
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "autostart" => {
                let current_state = crate::system::autostart::is_autostart_enabled();
                let new_state = !current_state;
                let _ = crate::system::autostart::set_autostart(new_state);
                if let Ok(mut settings) = crate::system::config::load_settings() {
                    settings.start_with_windows = new_state;
                    let _ = crate::system::config::save_settings(settings);
                }
                let _ = app.emit("bous://autostart-changed", new_state);
            }
            "exit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    if let Ok(visible) = w.is_visible() {
                        if visible {
                            let _ = w.set_focus();
                        } else {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
