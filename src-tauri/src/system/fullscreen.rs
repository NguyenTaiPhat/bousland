use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowRect};

pub fn is_foreground_fullscreen() -> bool {
    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0 == std::ptr::null_mut() {
            return false;
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
            // Check if foreground window covers or exceeds the entire monitor
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
            let is_fs = is_foreground_fullscreen();

            if is_fs != was_fullscreen {
                was_fullscreen = is_fs;
                if let Some(window) = app_handle.get_webview_window("main") {
                    if is_fs {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                    }
                }
                let _ = app_handle.emit("bous://fullscreen-state", is_fs);
            }
        }
    });
}
