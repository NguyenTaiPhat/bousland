pub mod windows;
pub mod system;
pub mod media;
pub mod commands;
pub mod tray;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let running = Arc::new(AtomicBool::new(true));
    let running_clone = running.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.emit("bous://show-island", ());
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let str_shortcut = shortcut.to_string().to_lowercase();
                        if str_shortcut.contains("shift") && str_shortcut.contains("b") {
                            let _ = app.emit("bous://toggle-visibility", ());
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                            }
                        } else if str_shortcut.contains("shift") && str_shortcut.contains("v") {
                            let _ = app.emit("bous://open-clipboard", ());
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        } else if str_shortcut.contains("ctrl") && str_shortcut.contains("space") {
                            let _ = app.emit("bous://open-command-bar", ());
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            windows::manager::resize_island_canvas,
            windows::manager::set_window_ignore_cursor,
            windows::manager::get_monitors_info,
            system::volume::get_volume,
            system::volume::set_volume,
            system::volume::set_mute,
            system::battery::get_battery_status,
            system::metrics::get_system_metrics,
            media::manager::media_play,
            media::manager::media_pause,
            media::manager::media_toggle_play_pause,
            media::manager::media_next,
            media::manager::media_previous,
            media::manager::get_media_status,
            system::screenshot::trigger_snipping_tool,
            system::screenshot::open_screenshot_file,
            system::screenshot::copy_screenshot_to_clipboard,
            system::clipboard::get_clipboard_history,
            system::clipboard::copy_to_clipboard,
            system::clipboard::clear_clipboard_history,
            system::config::load_settings,
            system::config::save_settings,
            system::config::get_system_accent_color,
            system::config::get_device_name,
            system::autostart::get_autostart_status,
            system::autostart::set_autostart_status,
            system::scratchpad::load_scratchpad,
            system::scratchpad::save_scratchpad,
            system::launcher::quick_launch,
            system::updater::check_for_updates,
            system::updater::download_and_install_update,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();

            if let Some(window) = app.get_webview_window("main") {
                // Initial positioning: compact canvas wraps both normal (280px) and media (330px) pills with shadow breathing room
                let _ = windows::manager::position_island_at_top(&window, 360.0, 60.0);
            }

            // Synchronize Windows autostart configuration with saved settings
            if let Ok(settings) = system::config::load_settings() {
                let _ = system::autostart::set_autostart(settings.start_with_windows);
            }

            // Initialize real Windows Core Audio volume listener
            let _ = system::volume::init_volume_listener(handle.clone());

            // Start battery monitor
            system::battery::start_battery_monitor(handle.clone(), running_clone.clone());

            // Start system metrics monitor (CPU, RAM, Disk)
            system::metrics::start_metrics_monitor(handle.clone(), running_clone.clone());

            // Start network bandwidth monitor
            system::network::start_network_monitor(handle.clone(), running_clone.clone());

            // Start media playback monitor (SMTC)
            media::manager::start_media_monitor(handle.clone(), running_clone.clone());

            // Start fullscreen gaming mode detector
            system::fullscreen::start_fullscreen_detector(handle.clone(), running_clone.clone());

            // Start screenshot and clipboard monitors
            system::screenshot::start_screenshot_monitor(handle.clone(), running_clone.clone());
            system::clipboard::start_clipboard_monitor(handle.clone(), running_clone.clone());

            // Initialize global shortcuts
            commands::shortcuts::init_shortcuts(&handle);

            // Initialize Windows system tray menu
            let _ = tray::menu::setup_tray(&handle);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
