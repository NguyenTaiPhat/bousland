use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScratchpadItem {
    pub id: String,
    pub text: String,
    pub completed: bool,
    pub pinned: bool,
    pub created_at: u64,
}

fn get_scratchpad_path() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("BousLand").join("scratchpad.json"))
}

#[tauri::command]
pub fn load_scratchpad() -> Result<Vec<ScratchpadItem>, String> {
    let path = match get_scratchpad_path() {
        Some(p) => p,
        None => return Ok(Vec::new()),
    };

    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read scratchpad file: {}", e))?;

    let items: Vec<ScratchpadItem> = serde_json::from_str(&content)
        .unwrap_or_default();

    Ok(items)
}

#[tauri::command]
pub fn save_scratchpad(items: Vec<ScratchpadItem>) -> Result<(), String> {
    let path = match get_scratchpad_path() {
        Some(p) => p,
        None => return Err("Cannot determine scratchpad directory path".to_string()),
    };

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    let json = serde_json::to_string_pretty(&items)
        .map_err(|e| format!("Serialization error: {}", e))?;

    fs::write(&path, json)
        .map_err(|e| format!("Failed to write scratchpad file: {}", e))?;

    Ok(())
}
