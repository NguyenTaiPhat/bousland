use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use std::path::{Path, PathBuf};
use std::process::Command;

#[tauri::command]
pub fn show_in_folder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("Tệp hoặc thư mục không tồn tại.".to_string());
    }

    Command::new("explorer")
        .arg(format!("/select,\"{}\"", path))
        .spawn()
        .map_err(|e| format!("Lỗi mở Explorer: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn compress_to_zip(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err("Tệp không tồn tại.".to_string());
    }

    let parent = p.parent().unwrap_or(Path::new("."));
    let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("archive");
    let zip_name = format!("{}.zip", stem);
    let mut zip_path = parent.join(&zip_name);

    if zip_path.exists() {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        zip_path = parent.join(format!("{}_{}.zip", stem, ts));
    }

    let file_name = p.file_name().and_then(|s| s.to_str()).unwrap_or(&path);

    let status = Command::new("tar")
        .current_dir(parent)
        .args(["-a", "-c", "-f"])
        .arg(&zip_path)
        .arg(file_name)
        .status()
        .map_err(|e| format!("Lỗi gọi tar.exe: {}", e))?;

    if !status.success() {
        return Err("Nén tệp ZIP thất bại.".to_string());
    }

    Ok(zip_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn compute_file_hash(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("Tệp không tồn tại.".to_string());
    }

    let output = Command::new("certutil")
        .args(["-hashfile", &path, "SHA256"])
        .output()
        .map_err(|e| format!("Lỗi gọi certutil: {}", e))?;

    if !output.status.success() {
        return Err("Không thể tính mã băm SHA256.".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();
    if lines.len() >= 2 {
        let hash = lines[1].trim().replace(" ", "").to_lowercase();
        Ok(hash)
    } else {
        Err("Không phân tích được kết quả băm.".to_string())
    }
}

#[tauri::command]
pub fn copy_file_base64(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("Tệp không tồn tại.".to_string());
    }

    let metadata = std::fs::metadata(p).map_err(|e| e.to_string())?;
    if metadata.len() > 25 * 1024 * 1024 {
        return Err("Tệp quá lớn (> 25MB) để chuyển đổi sang Base64.".to_string());
    }

    let bytes = std::fs::read(p).map_err(|e| format!("Lỗi đọc tệp: {}", e))?;
    let b64 = BASE64.encode(&bytes);

    let mime = match p.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()).as_deref() {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("svg") => "image/svg+xml",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        Some("pdf") => "application/pdf",
        Some("txt") => "text/plain",
        Some("json") => "application/json",
        _ => "application/octet-stream",
    };

    Ok(format!("data:{};base64,{}", mime, b64))
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ShelfFileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub extension: String,
}

#[tauri::command]
pub fn get_file_metadata(path: String) -> Result<ShelfFileInfo, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("Tệp hoặc thư mục không tồn tại.".to_string());
    }

    let metadata = std::fs::metadata(p).map_err(|e| format!("Lỗi đọc metadata: {}", e))?;
    let name = p
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or(&path)
        .to_string();
    let ext = p
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    Ok(ShelfFileInfo {
        name,
        path,
        size: metadata.len(),
        is_dir: metadata.is_dir(),
        extension: ext,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_hash_non_existent() {
        let res = compute_file_hash("C:\\non_existent_file_test.txt".to_string());
        assert!(res.is_err());
    }

    #[test]
    fn test_base64_encode_temp_file() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("bous_test.txt");
        let _ = std::fs::write(&file_path, "BousLand Test Content");
        let res = copy_file_base64(file_path.to_string_lossy().to_string());
        assert!(res.is_ok());
        let val = res.unwrap();
        assert!(val.starts_with("data:text/plain;base64,"));
        let _ = std::fs::remove_file(file_path);
    }

    #[test]
    fn test_get_file_metadata() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("bous_meta_test.txt");
        let _ = std::fs::write(&file_path, "12345");
        let res = get_file_metadata(file_path.to_string_lossy().to_string());
        assert!(res.is_ok());
        let info = res.unwrap();
        assert_eq!(info.name, "bous_meta_test.txt");
        assert_eq!(info.size, 5);
        assert_eq!(info.extension, "txt");
        assert!(!info.is_dir);
        let _ = std::fs::remove_file(file_path);
    }
}
