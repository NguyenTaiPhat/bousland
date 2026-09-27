use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST};
use windows::Win32::UI::WindowsAndMessaging::{
    GetClassNameW, GetDesktopWindow, GetForegroundWindow, GetShellWindow, GetWindowRect,
};

pub fn is_foreground_fullscreen(our_hwnd: Option<HWND>) -> bool {
    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0.is_null() {
            return false;
        }

        // Ignore shell window and desktop
        let shell = GetShellWindow();
        if hwnd == shell {
            return false;
        }

        let desktop = GetDesktopWindow();
        if hwnd == desktop {
            return false;
        }

        // Ignore our own window
        if let Some(own) = our_hwnd {
            if hwnd == own {
                return false;
            }
        }

        // Check window class name - ignore desktop and Windows UI elements
        let mut class_name = [0u16; 256];
        let len = GetClassNameW(hwnd, &mut class_name);
        if len > 0 {
            let class_str = String::from_utf16_lossy(&class_name[..len as usize]);
            if class_str == "Progman"
                || class_str == "WorkerW"
                || class_str == "Shell_TrayWnd"
                || class_str == "Shell_SecondaryTrayWnd"
                || class_str == "Windows.UI.Core.CoreWindow"
            {
                return false;
            }
        }

        let mut window_rect = RECT::default();
        if GetWindowRect(hwnd, &mut window_rect).is_err() {
            return false;
        }

        let hmonitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        let mut mi = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };

        if GetMonitorInfoW(hmonitor, &mut mi).as_bool() {
            let mon_rect = mi.rcMonitor;
            // Check if foreground window strictly covers the entire monitor
            let covers = window_rect.left <= mon_rect.left
                && window_rect.top <= mon_rect.top
                && window_rect.right >= mon_rect.right
                && window_rect.bottom >= mon_rect.bottom;

            return covers;
        }

        false
    }
}

pub fn start_fullscreen_detector(app_handle: AppHandle, running: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let mut was_fullscreen = false;

        while running.load(Ordering::Relaxed) {
            std::thread::sleep(Duration::from_millis(1000));

            // Only check if fullscreen_hide is enabled in settings
            let settings = crate::system::config::load_settings().unwrap_or_default();
            if !settings.fullscreen_hide {
                if was_fullscreen {
                    was_fullscreen = false;
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                    }
                    let _ = app_handle.emit("bous://fullscreen-state", false);
                }
                continue;
            }

            let our_hwnd = app_handle
                .get_webview_window("main")
                .and_then(|w| w.hwnd().ok())
                .map(|h| HWND(h.0 as _));

            let is_fs = is_foreground_fullscreen(our_hwnd);

            if is_fs != was_fullscreen {
                was_fullscreen = is_fs;
                if let Some(window) = app_handle.get_webview_window("main") {
                    if is_fs {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = crate::windows::manager::position_island_at_top(&window, 360.0, 60.0);
                    }
                }
                let _ = app_handle.emit("bous://fullscreen-state", is_fs);
            }
        }
    });
}
