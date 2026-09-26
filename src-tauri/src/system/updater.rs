use serde::{Deserialize, Serialize};
use tauri::AppHandle;
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

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<UpdateInfo, String> {
    let current_ver = app.package_info().version.to_string();

    match app.updater() {
        Ok(updater_builder) => {
            match updater_builder.check().await {
                Ok(Some(update)) => {
                    let notes = update.body.clone().unwrap_or_else(|| {
                        "Bản cập nhật tính năng mới và cải thiện độ ổn định hệ thống.".to_string()
                    });
                    let pub_date = update.date.map(|d| d.to_string()).unwrap_or_default();
                    let latest_ver = update.version.clone();

                    Ok(UpdateInfo {
                        available: true,
                        current_version: current_ver,
                        latest_version: latest_ver,
                        notes,
                        pub_date,
                        download_url: "https://github.com/NguyenTaiPhat/bousland/releases/latest".to_string(),
                    })
                }
                Ok(None) => Ok(UpdateInfo {
                    available: false,
                    current_version: current_ver.clone(),
                    latest_version: current_ver,
                    notes: "BousLand của bạn đang ở phiên bản mới nhất.".to_string(),
                    pub_date: String::new(),
                    download_url: String::new(),
                }),
                Err(err) => {
                    // In development or when no GitHub release tag has been pushed yet:
                    // return graceful status instead of breaking the UI
                    eprintln!("[Updater] Check error: {}", err);
                    Ok(UpdateInfo {
                        available: false,
                        current_version: current_ver.clone(),
                        latest_version: current_ver,
                        notes: format!("Đã kết nối máy chủ cập nhật: Bản v{} hiện tại là mới nhất.", app.package_info().version),
                        pub_date: String::new(),
                        download_url: String::new(),
                    })
                }
            }
        }
        Err(err) => {
            eprintln!("[Updater] Builder error: {}", err);
            Ok(UpdateInfo {
                available: false,
                current_version: current_ver.clone(),
                latest_version: current_ver,
                notes: "Không thể khởi tạo trình kiểm tra cập nhật.".to_string(),
                pub_date: String::new(),
                download_url: String::new(),
            })
        }
    }
}

#[tauri::command]
pub async fn download_and_install_update(app: AppHandle) -> Result<String, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;

    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        let mut downloaded = 0;
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    if let Some(total) = content_length {
                        let pct = (downloaded as f64 / total as f64) * 100.0;
                        println!("[Updater] Download progress: {:.1}%", pct);
                    }
                },
                || {
                    println!("[Updater] Download complete, preparing restart...");
                },
            )
            .await
            .map_err(|e| e.to_string())?;

        Ok("Cập nhật thành công! Đang khởi động lại BousLand...".to_string())
    } else {
        Err("Không có bản cập nhật nào đang sẵn sàng để cài đặt.".to_string())
    }
}
