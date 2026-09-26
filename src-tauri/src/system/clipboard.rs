use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use windows::Win32::Foundation::{HANDLE, HGLOBAL, HWND};
use windows::Win32::System::DataExchange::{
    CloseClipboard, EmptyClipboard, GetClipboardData, GetClipboardSequenceNumber, OpenClipboard,
    SetClipboardData,
};
use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GHND};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardNotice {
    pub has_content: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardItem {
    pub id: String,
    pub text: String,
    pub kind: String, // "url", "color", "code", "text"
    pub timestamp: u64,
}

static CLIPBOARD_HISTORY: Mutex<Vec<ClipboardItem>> = Mutex::new(Vec::new());

pub fn classify_content(text: &str) -> &'static str {
    let trimmed = text.trim();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return "url";
    }
    if (trimmed.starts_with('#') && (trimmed.len() == 4 || trimmed.len() == 7 || trimmed.len() == 9))
        && trimmed[1..].chars().all(|c| c.is_ascii_hexdigit())
    {
        return "color";
    }
    if trimmed.starts_with("rgb(") || trimmed.starts_with("rgba(") || trimmed.starts_with("hsl(") {
        return "color";
    }
    if trimmed.contains("function ")
        || trimmed.contains("const ")
        || trimmed.contains("let ")
        || trimmed.contains("var ")
        || trimmed.contains("class ")
        || trimmed.contains("import ")
        || trimmed.contains("fn ")
        || trimmed.contains("pub fn ")
        || trimmed.contains("def ")
        || trimmed.contains("public static void")
        || trimmed.contains("SELECT ")
        || trimmed.contains("FROM ")
        || (trimmed.starts_with('{') && trimmed.ends_with('}'))
        || (trimmed.starts_with('[') && trimmed.ends_with(']'))
    {
        return "code";
    }
    "text"
}

pub fn read_clipboard_text() -> Option<String> {
    unsafe {
        if OpenClipboard(HWND(std::ptr::null_mut())).is_err() {
            return None;
        }

        let cf_unicodetext = 13u32;
        let handle = match GetClipboardData(cf_unicodetext) {
            Ok(h) => h,
            Err(_) => {
                let _ = CloseClipboard();
                return None;
            }
        };

        let h_global = HGLOBAL(handle.0);
        let ptr = GlobalLock(h_global);
        if ptr.is_null() {
            let _ = CloseClipboard();
            return None;
        }

        let wide_slice = std::slice::from_raw_parts(ptr as *const u16, 5000);
        let len = wide_slice.iter().position(|&c| c == 0).unwrap_or(wide_slice.len());
        let s = String::from_utf16_lossy(&wide_slice[..len]);

        let _ = GlobalUnlock(h_global);
        let _ = CloseClipboard();

        if s.trim().is_empty() {
            None
        } else {
            Some(s)
        }
    }
}

pub fn write_clipboard_text(text: &str) -> Result<(), String> {
    unsafe {
        if OpenClipboard(HWND(std::ptr::null_mut())).is_err() {
            return Err("Cannot open clipboard".to_string());
        }
        let _ = EmptyClipboard();

        let utf16: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
        let bytes = utf16.len() * std::mem::size_of::<u16>();

        let h_global = GlobalAlloc(GHND, bytes).map_err(|e| e.to_string())?;
        let ptr = GlobalLock(h_global);
        if ptr.is_null() {
            let _ = CloseClipboard();
            return Err("Failed to lock global memory".to_string());
        }

        std::ptr::copy_nonoverlapping(utf16.as_ptr() as *const u8, ptr as *mut u8, bytes);
        let _ = GlobalUnlock(h_global);

        let cf_unicodetext = 13u32;
        let _ = SetClipboardData(cf_unicodetext, HANDLE(h_global.0));
        let _ = CloseClipboard();

        Ok(())
    }
}

pub fn add_clipboard_item(text: String) -> Option<ClipboardItem> {
    let mut history = CLIPBOARD_HISTORY.lock().unwrap();
    if let Some(first) = history.first() {
        if first.text == text {
            return None;
        }
    }

    let kind = classify_content(&text).to_string();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let item = ClipboardItem {
        id: format!("clip-{}", timestamp),
        text,
        kind,
        timestamp,
    };

    history.insert(0, item.clone());
    if history.len() > 25 {
        history.truncate(25);
    }

    Some(item)
}

#[tauri::command]
pub fn get_clipboard_history() -> Vec<ClipboardItem> {
    CLIPBOARD_HISTORY.lock().unwrap().clone()
}

#[tauri::command]
pub fn copy_to_clipboard(text: String) -> Result<(), String> {
    write_clipboard_text(&text)
}

#[tauri::command]
pub fn clear_clipboard_history() {
    let mut history = CLIPBOARD_HISTORY.lock().unwrap();
    history.clear();
}

pub fn start_clipboard_monitor(app_handle: AppHandle, running: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let mut last_seq: u32 = unsafe { GetClipboardSequenceNumber() };

        while running.load(Ordering::Relaxed) {
            std::thread::sleep(Duration::from_millis(800));

            let current_seq = unsafe { GetClipboardSequenceNumber() };
            if current_seq != last_seq && current_seq != 0 {
                last_seq = current_seq;

                if let Some(text) = read_clipboard_text() {
                    if let Some(_) = add_clipboard_item(text) {
                        let history = get_clipboard_history();
                        let _ = app_handle.emit("bous://clipboard-history-update", &history);
                    }
                }

                let notice = ClipboardNotice {
                    has_content: true,
                };
                let _ = app_handle.emit("bous://clipboard-notice", &notice);
            }
        }
    });
}
