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

use crate::system::config::DockPosition;

/// Reposition and resize the island window based on DockPosition and offsets
pub fn position_island_window(
    window: &WebviewWindow,
    width: f64,
    height: f64,
    dock_position: DockPosition,
    offset_x: f64,
    offset_y: f64,
) -> Result<(), String> {
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
    let mon_logical_height = mon_size.height as f64 / scale_factor;
    let mon_logical_x = mon_pos.x as f64 / scale_factor;
    let mon_logical_y = mon_pos.y as f64 / scale_factor;

    let (target_x, target_y) = match dock_position {
        DockPosition::TopLeft => (mon_logical_x, mon_logical_y),
        DockPosition::TopRight => (mon_logical_x + mon_logical_width - width, mon_logical_y),
        DockPosition::Left => {
            let base_y = mon_logical_y + (mon_logical_height - height) / 2.0 + offset_y;
            let clamped_y = base_y.clamp(mon_logical_y, mon_logical_y + mon_logical_height - height);
            (mon_logical_x, clamped_y)
        }
        DockPosition::Right => {
            let base_y = mon_logical_y + (mon_logical_height - height) / 2.0 + offset_y;
            let clamped_y = base_y.clamp(mon_logical_y, mon_logical_y + mon_logical_height - height);
            (mon_logical_x + mon_logical_width - width, clamped_y)
        }
        DockPosition::TopCenter => {
            let base_x = mon_logical_x + (mon_logical_width - width) / 2.0 + offset_x;
            let clamped_x = base_x.clamp(mon_logical_x, mon_logical_x + mon_logical_width - width);
            (clamped_x, mon_logical_y)
        }
    };

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

/// Backward compatibility: Reposition and resize the island window centered at top
pub fn position_island_at_top(window: &WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    let settings = crate::system::config::load_settings().unwrap_or_default();
    position_island_window(
        window,
        width,
        height,
        settings.dock_position,
        settings.island_x_offset,
        settings.island_y_offset,
    )
}

#[tauri::command]
pub fn resize_island_canvas(
    window: WebviewWindow,
    width: f64,
    height: f64,
    dock_position: Option<DockPosition>,
    offset_x: Option<f64>,
    offset_y: Option<f64>,
) -> Result<(), String> {
    let settings = crate::system::config::load_settings().unwrap_or_default();
    let pos = dock_position.unwrap_or(settings.dock_position);
    let ox = offset_x.unwrap_or(settings.island_x_offset);
    let oy = offset_y.unwrap_or(settings.island_y_offset);
    position_island_window(&window, width, height, pos, ox, oy)
}

#[tauri::command]
pub fn set_window_ignore_cursor(
    window: WebviewWindow,
    ignore: bool,
) -> Result<(), String> {
    window.set_ignore_cursor_events(ignore).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_window_position(
    window: WebviewWindow,
    x: f64,
    y: f64,
) -> Result<(), String> {
    window
        .set_position(Position::Logical(LogicalPosition { x, y }))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_window_position(
    window: WebviewWindow,
) -> Result<(f64, f64), String> {
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    Ok((pos.x as f64 / scale, pos.y as f64 / scale))
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
