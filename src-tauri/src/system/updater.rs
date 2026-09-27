use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub notes: String,
    pub pub_date: String,
    pub download_url: String,
}

#[derive(Deserialize, Debug, Clone)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}

#[derive(Deserialize, Debug, Clone)]
struct GitHubRelease {
    tag_name: String,
    #[serde(default)]
    body: Option<String>,
    html_url: String,
    published_at: Option<String>,
    #[serde(default)]
    assets: Vec<GitHubAsset>,
}

async fn fetch_latest_github_release() -> Result<GitHubRelease, String> {
    let client = reqwest::Client::builder()
        .user_agent("BousLand-App")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Lỗi tạo HTTP client: {}", e))?;

    let res = client
        .get("https://api.github.com/repos/NguyenTaiPhat/bousland/releases/latest")
        .send()
        .await
        .map_err(|e| format!("Không thể kết nối máy chủ GitHub: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Máy chủ GitHub phản hồi mã {}", res.status()));
    }

    let release = res
        .json::<GitHubRelease>()
        .await
        .map_err(|e| format!("Lỗi phân tích dữ liệu phát hành: {}", e))?;

    Ok(release)
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<UpdateInfo, String> {
    let current_ver = app.package_info().version.to_string();

    // 1. Thử dùng Tauri Plugin Updater nếu endpoint có latest.json và đã ký hợp lệ
    if let Ok(updater_builder) = app.updater() {
        if let Ok(Some(update)) = updater_builder.check().await {
            let notes = update.body.clone().unwrap_or_else(|| {
                "Bản cập nhật tính năng mới và cải thiện độ ổn định hệ thống.".to_string()
            });
            let pub_date = update.date.map(|d| d.to_string()).unwrap_or_default();
            let latest_ver = update.version.clone();

            return Ok(UpdateInfo {
                available: true,
                current_version: current_ver,
                latest_version: latest_ver,
                notes,
                pub_date,
                download_url: "https://github.com/NguyenTaiPhat/bousland/releases/latest".to_string(),
            });
        }
    }

    // 2. Fallback: Truy vấn trực tiếp GitHub Releases API để luôn nhận diện chính xác bản mới nhất
    match fetch_latest_github_release().await {
        Ok(release) => {
            let remote_tag = release
                .tag_name
                .trim_start_matches('v')
                .trim_start_matches('V')
                .to_string();

            let is_newer = match (
                semver::Version::parse(&remote_tag),
                semver::Version::parse(&current_ver),
            ) {
                (Ok(remote), Ok(current)) => remote > current,
                _ => remote_tag != current_ver,
            };

            if is_newer {
                let download_url = release
                    .assets
                    .iter()
                    .find(|a| a.name.ends_with(".exe"))
                    .or_else(|| release.assets.iter().find(|a| a.name.ends_with(".msi")))
                    .map(|a| a.browser_download_url.clone())
                    .unwrap_or_else(|| release.html_url.clone());

                let notes = release
                    .body
                    .filter(|b| !b.trim().is_empty())
                    .unwrap_or_else(|| {
                        format!(
                            "Bản phát hành BousLand v{} đã sẵn sàng trên GitHub Releases.",
                            remote_tag
                        )
                    });

                Ok(UpdateInfo {
                    available: true,
                    current_version: current_ver,
                    latest_version: remote_tag,
                    notes,
                    pub_date: release.published_at.unwrap_or_default(),
                    download_url,
                })
            } else {
                Ok(UpdateInfo {
                    available: false,
                    current_version: current_ver.clone(),
                    latest_version: current_ver.clone(),
                    notes: format!(
                        "BousLand của bạn đang ở phiên bản mới nhất (v{}).",
                        current_ver
                    ),
                    pub_date: release.published_at.unwrap_or_default(),
                    download_url: String::new(),
                })
            }
        }
        Err(err) => {
            eprintln!("[Updater] GitHub fallback error: {}", err);
            Ok(UpdateInfo {
                available: false,
                current_version: current_ver.clone(),
                latest_version: current_ver,
                notes: format!("Không thể kết nối máy chủ cập nhật: {}", err),
                pub_date: String::new(),
                download_url: String::new(),
            })
        }
    }
}

pub fn start_update_checker(app: AppHandle, running: Arc<AtomicBool>) {
    tauri::async_runtime::spawn(async move {
        // Initial delay: wait 10 seconds after app boot to allow smooth network & UI startup
        tokio::time::sleep(std::time::Duration::from_secs(10)).await;

        while running.load(Ordering::Relaxed) {
            if let Ok(info) = check_for_updates(app.clone()).await {
                if info.available {
                    let _ = app.emit("bous://auto-updating", &info);
                    let _ = download_and_install_update(app.clone()).await;
                }
            }

            // Check again every 1 hour
            tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
        }
    });
}

#[tauri::command]
pub async fn download_and_install_update(app: AppHandle) -> Result<String, String> {
    // 1. Thử nâng cấp native qua Tauri Plugin Updater nếu có package hợp lệ
    if let Ok(updater) = app.updater() {
        if let Ok(Some(update)) = updater.check().await {
            update
                .download_and_install(|_, _| {}, || {})
                .await
                .map_err(|e| e.to_string())?;
            return Ok("Cập nhật thành công! Đang khởi động lại BousLand...".to_string());
        }
    }

    // 2. Fallback: Tải file từ GitHub Releases và khởi chạy với quyền quản trị viên UAC
    let release = fetch_latest_github_release().await.map_err(|e| e.to_string())?;
    let asset = release
        .assets
        .iter()
        .find(|a| a.name.ends_with(".exe"))
        .or_else(|| release.assets.iter().find(|a| a.name.ends_with(".msi")))
        .ok_or_else(|| "Không tìm thấy bộ cài đặt (.exe hoặc .msi) trong bản phát hành mới.".to_string())?;

    let file_name = &asset.name;
    let temp_dir = std::env::temp_dir();
    let target_path: PathBuf = temp_dir.join(file_name);

    let client = reqwest::Client::builder()
        .user_agent("BousLand-App")
        .build()
        .map_err(|e| format!("Lỗi tạo HTTP client: {}", e))?;

    let resp = client
        .get(&asset.browser_download_url)
        .send()
        .await
        .map_err(|e| format!("Lỗi tải gói cài đặt: {}", e))?;

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Lỗi đọc dữ liệu tệp: {}", e))?;

    tokio::fs::write(&target_path, bytes)
        .await
        .map_err(|e| format!("Lỗi lưu tệp cài đặt: {}", e))?;

    let exe_path = std::env::current_exe().unwrap_or_else(|_| PathBuf::from("C:\\Program Files\\BousLand\\tauri-app.exe"));
    let exe_str = exe_path.to_string_lossy().replace('\'', "''");

    if file_name.ends_with(".msi") {
        let ps_script = format!(
            "Start-Sleep -Milliseconds 1200; Start-Process msiexec.exe -ArgumentList '/i', '\"{}\"', '/passive' -Wait -Verb RunAs; Start-Process '{}'",
            target_path.to_string_lossy().replace('\'', "''"),
            exe_str
        );
        let _ = std::process::Command::new("powershell")
            .arg("-NoProfile")
            .arg("-Command")
            .arg(ps_script)
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("Lỗi khởi chạy bộ cài đặt MSI: {}", e))?;
    } else {
        let ps_script = format!(
            "Start-Sleep -Milliseconds 1200; Start-Process -FilePath '{}' -ArgumentList '/S' -Wait -Verb RunAs; Start-Process '{}'",
            target_path.to_string_lossy().replace('\'', "''"),
            exe_str
        );
        let _ = std::process::Command::new("powershell")
            .arg("-NoProfile")
            .arg("-Command")
            .arg(ps_script)
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("Lỗi khởi chạy bộ cài đặt EXE: {}", e))?;
    }

    // Đóng ứng dụng hiện tại để trình cài đặt nâng cấp an toàn không bị khóa file
    let app_clone = app.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(800)).await;
        app_clone.exit(0);
    });

    Ok("Đã tải xong bộ cài đặt và đang tiến hành nâng cấp BousLand...".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fetch_latest_github_release() {
        let res = fetch_latest_github_release().await;
        assert!(res.is_ok(), "Fetch release should succeed: {:?}", res.err());
        let release = res.unwrap();
        assert!(release.tag_name.starts_with('v') || release.tag_name.chars().next().map_or(false, |c| c.is_ascii_digit()));
        assert!(!release.assets.is_empty(), "Release assets should not be empty");
    }
}
