use serde::{Deserialize, Serialize};
use tauri::{LogicalPosition, LogicalSize, Position, Size, WebviewWindow};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorInfo {
    pub name: Option<String>,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub is_primary: bool,
}

/// Reposition and resize the island window so it is perfectly centered at the top of the monitor
pub fn position_island_at_top(window: &WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    let monitor = match window.current_monitor().map_err(|e| e.to_string())? {
        Some(m) => m,
        None => match window.primary_monitor().map_err(|e| e.to_string())? {
            Some(pm) => pm,
            None => return Err("No monitor detected for window".to_string()),
        },
    };

    let scale_factor = monitor.scale_factor();
    let mon_size = monitor.size();
    let mon_pos = monitor.position();

    // Logical monitor dimensions
    let mon_logical_width = mon_size.width as f64 / scale_factor;
    let mon_logical_x = mon_pos.x as f64 / scale_factor;
    let mon_logical_y = mon_pos.y as f64 / scale_factor;

    // Center horizontally, position 10px below top edge
    let target_x = mon_logical_x + (mon_logical_width - width) / 2.0;
    let target_y = mon_logical_y + 10.0;

    window
        .set_size(Size::Logical(LogicalSize { width, height }))
        .map_err(|e| e.to_string())?;

    window
        .set_position(Position::Logical(LogicalPosition {
            x: target_x,
            y: target_y,
        }))
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn resize_island_canvas(
    window: WebviewWindow,
    width: f64,
    height: f64,
) -> Result<(), String> {
    position_island_at_top(&window, width, height)
}

#[tauri::command]
pub fn set_window_ignore_cursor(
    window: WebviewWindow,
    ignore: bool,
) -> Result<(), String> {
    window.set_ignore_cursor_events(ignore).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_monitors_info(window: WebviewWindow) -> Result<Vec<MonitorInfo>, String> {
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    let primary = window.primary_monitor().map_err(|e| e.to_string())?;

    let primary_name = primary.as_ref().and_then(|p| p.name());

    let list = monitors
        .into_iter()
        .map(|m| {
            let name = m.name().cloned();
            let is_primary = match (&name, &primary_name) {
                (Some(n), Some(pn)) => n == *pn,
                _ => false,
            };
            MonitorInfo {
                name,
                width: m.size().width,
                height: m.size().height,
                scale_factor: m.scale_factor(),
                is_primary,
            }
        })
        .collect();

    Ok(list)
}
