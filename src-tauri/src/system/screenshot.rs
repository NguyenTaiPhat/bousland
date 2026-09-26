use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotNotice {
    pub file_path: String,
    pub filename: String,
}

fn get_screenshots_dir() -> Option<PathBuf> {
    dirs::picture_dir().map(|p| p.join("Screenshots"))
}

pub fn start_screenshot_monitor(app_handle: AppHandle, running: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let dir = match get_screenshots_dir() {
            Some(d) => d,
            None => return,
        };

        let mut known_files: HashSet<String> = HashSet::new();

        // Initial scan of existing files
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                if let Ok(name) = entry.file_name().into_string() {
                    known_files.insert(name);
                }
            }
        }

        while running.load(Ordering::Relaxed) {
            std::thread::sleep(Duration::from_millis(1500));

            if let Ok(entries) = fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Ok(name) = entry.file_name().into_string() {
                        if !known_files.contains(&name) {
                            known_files.insert(name.clone());

                            let notice = ScreenshotNotice {
                                file_path: path.to_string_lossy().to_string(),
                                filename: name,
                            };

                            let _ = app_handle.emit("bous://screenshot-captured", &notice);
                        }
                    }
                }
            }
        }
    });
}

#[tauri::command]
pub fn trigger_snipping_tool() -> Result<(), String> {
    // Launch Windows Snipping Tool protocol directly
    Command::new("cmd")
        .args(["/c", "start", "ms-screenclip:"])
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn open_screenshot_file(file_path: String) -> Result<(), String> {
    Command::new("explorer")
        .arg(&file_path)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn copy_screenshot_to_clipboard(file_path: String) -> Result<(), String> {
    // Use PowerShell to copy file to clipboard
    let script = format!(
        "Set-Clipboard -Path '{}'",
        file_path.replace("'", "''")
    );

    Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}
