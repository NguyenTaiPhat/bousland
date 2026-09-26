use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Format or validate quick launch target
pub fn normalize_launch_target(target: &str) -> String {
    let t = target.trim();
    if t.starts_with("http://") || t.starts_with("https://") {
        t.to_string()
    } else if t.contains('.') && !t.contains(' ') && (t.ends_with(".com") || t.ends_with(".org") || t.ends_with(".net") || t.ends_with(".io") || t.ends_with(".vn")) {
        format!("https://{}", t)
    } else {
        t.to_string()
    }
}

/// Quick launch any URL or Windows application without showing a terminal window
#[tauri::command]
pub fn quick_launch(target: String) -> Result<String, String> {
    let normalized = normalize_launch_target(&target);
    if normalized.is_empty() {
        return Err("Mục khởi chạy không được để trống".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        // 0x08000000 = CREATE_NO_WINDOW
        let status = Command::new("cmd")
            .args(["/C", "start", "", &normalized])
            .creation_flags(0x08000000)
            .status();

        match status {
            Ok(s) if s.success() => Ok(format!("Đã mở: {}", normalized)),
            Ok(_) => Err(format!("Không thể mở: {}", normalized)),
            Err(e) => Err(format!("Lỗi khởi chạy: {}", e)),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(format!("Đã mở: {}", normalized))
    }
}
