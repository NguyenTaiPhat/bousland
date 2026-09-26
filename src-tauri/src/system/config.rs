use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct BousSettings {
    pub theme: String,
    pub accent_color: String,
    pub custom_colors: Vec<String>,
    pub dynamic_album_tint: bool,
    pub start_with_windows: bool,
    pub hover_to_expand: bool,
    pub auto_collapse: bool,
    pub collapse_delay: f32, // seconds
    pub animation_speed: f32,
    pub fullscreen_hide: bool,
    pub gaming_mode: bool,
    pub enabled_modules: HashMap<String, bool>,
    pub island_name: String,
    pub name_display_mode: String, // "default" ("BousLand"), "device" (tên laptop), "custom" (tên tự đặt)
}

impl Default for BousSettings {
    fn default() -> Self {
        let mut modules = HashMap::new();
        modules.insert("volume".to_string(), true);
        modules.insert("media".to_string(), true);
        modules.insert("battery".to_string(), true);
        modules.insert("system".to_string(), true);
        modules.insert("system_alert".to_string(), true);
        modules.insert("network".to_string(), true);
        modules.insert("clipboard".to_string(), false); // privacy-first default
        modules.insert("screenshot".to_string(), true);

        Self {
            theme: "dark".to_string(),
            accent_color: "system".to_string(),
            custom_colors: vec![
                "#6366f1".to_string(),
                "#ec4899".to_string(),
                "#14b8a6".to_string(),
            ],
            dynamic_album_tint: true,
            start_with_windows: true,
            hover_to_expand: true,
            auto_collapse: true,
            collapse_delay: 2.0,
            animation_speed: 1.0,
            fullscreen_hide: true,
            gaming_mode: true,
            enabled_modules: modules,
            island_name: "BousLand".to_string(),
            name_display_mode: "default".to_string(),
        }
    }
}

fn get_config_path() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("BousLand").join("config.json"))
}

#[tauri::command]
pub fn load_settings() -> Result<BousSettings, String> {
    let path = match get_config_path() {
        Some(p) => p,
        None => return Ok(BousSettings::default()),
    };

    if !path.exists() {
        let default_settings = BousSettings::default();
        let _ = save_settings(default_settings.clone());
        return Ok(default_settings);
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let settings: BousSettings = serde_json::from_str(&content).unwrap_or_default();
    Ok(settings)
}

#[tauri::command]
pub fn save_settings(settings: BousSettings) -> Result<(), String> {
    // Sync autostart configuration with Windows Run registry
    let _ = crate::system::autostart::set_autostart(settings.start_with_windows);

    let path = match get_config_path() {
        Some(p) => p,
        None => return Err("Could not determine config path".to_string()),
    };

    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_system_accent_color() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let output = std::process::Command::new("reg")
            .args(["query", "HKCU\\Software\\Microsoft\\Windows\\DWM", "/v", "AccentColor"])
            .creation_flags(0x08000000)
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                if line.contains("AccentColor") && line.contains("0x") {
                    if let Some(pos) = line.find("0x") {
                        let hex_part = line[pos + 2..].trim();
                        if let Ok(val) = u32::from_str_radix(hex_part, 16) {
                            // Windows DWM stores 0xAABBGGRR
                            let r = val & 0xFF;
                            let g = (val >> 8) & 0xFF;
                            let b = (val >> 16) & 0xFF;
                            return Ok(format!("#{:02x}{:02x}{:02x}", r, g, b));
                        }
                    }
                }
            }
        }
    }

    Ok("#0078d4".to_string())
}

#[tauri::command]
pub fn get_device_name() -> Result<String, String> {
    let name = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "BousLand PC".to_string());
    Ok(name)
}

#[tauri::command]
pub fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

