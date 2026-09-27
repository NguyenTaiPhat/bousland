use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use windows::core::{w, PCWSTR};
use windows::Win32::System::Registry::{
    RegCloseKey, RegDeleteValueW, RegOpenKeyExW, RegQueryValueExW, RegSetKeyValueW,
    HKEY, HKEY_CURRENT_USER, KEY_READ, KEY_SET_VALUE, REG_SZ,
};

const RUN_SUBKEY: PCWSTR = w!("Software\\Microsoft\\Windows\\CurrentVersion\\Run");
const APP_NAME: PCWSTR = w!("BousLand");

fn get_startup_shortcut_path() -> Option<PathBuf> {
    dirs::config_dir().map(|p| {
        p.join("Microsoft")
            .join("Windows")
            .join("Start Menu")
            .join("Programs")
            .join("Startup")
            .join("BousLand.lnk")
    })
}

fn sync_startup_shortcut(enable: bool, exe_str: &str) {
    if let Some(shortcut_path) = get_startup_shortcut_path() {
        if enable {
            if let Some(parent) = shortcut_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            let working_dir = std::path::Path::new(exe_str)
                .parent()
                .unwrap_or(std::path::Path::new(""))
                .to_string_lossy()
                .replace('\'', "''");
            let script = format!(
                "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('{}'); $s.TargetPath = '{}'; $s.WorkingDirectory = '{}'; $s.Save()",
                shortcut_path.to_string_lossy().replace('\'', "''"),
                exe_str.replace('\'', "''"),
                working_dir
            );
            let _ = std::process::Command::new("powershell")
                .arg("-NoProfile")
                .arg("-Command")
                .arg(script)
                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                .output();
        } else if shortcut_path.exists() {
            let _ = std::fs::remove_file(shortcut_path);
        }
    }
}

pub fn is_autostart_enabled() -> bool {
    let reg_enabled = unsafe {
        let mut hkey = HKEY::default();
        if RegOpenKeyExW(HKEY_CURRENT_USER, RUN_SUBKEY, 0, KEY_READ, &mut hkey).is_err() {
            false
        } else {
            let mut data_type = REG_SZ;
            let mut data_size: u32 = 0;
            let query_res = RegQueryValueExW(
                hkey,
                APP_NAME,
                None,
                Some(&mut data_type),
                None,
                Some(&mut data_size),
            );
            let _ = RegCloseKey(hkey);
            query_res.is_ok() && data_size > 0
        }
    };

    let shortcut_enabled = get_startup_shortcut_path()
        .map(|p| p.exists())
        .unwrap_or(false);

    reg_enabled || shortcut_enabled
}

pub fn set_autostart(enable: bool) -> Result<(), String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_str = exe_path.to_str().ok_or("Invalid executable path")?;

    unsafe {
        if enable {
            let formatted_path = format!("\"{}\"", exe_str);
            let wide_data: Vec<u16> = formatted_path.encode_utf16().chain(std::iter::once(0)).collect();
            let byte_len = (wide_data.len() * std::mem::size_of::<u16>()) as u32;

            let res = RegSetKeyValueW(
                HKEY_CURRENT_USER,
                RUN_SUBKEY,
                APP_NAME,
                REG_SZ.0,
                Some(wide_data.as_ptr() as *const _),
                byte_len,
            );
            let _ = res.ok();
        } else {
            let mut hkey = HKEY::default();
            if RegOpenKeyExW(HKEY_CURRENT_USER, RUN_SUBKEY, 0, KEY_SET_VALUE, &mut hkey).is_ok() {
                let _ = RegDeleteValueW(hkey, APP_NAME);
                let _ = RegCloseKey(hkey);
            }
        }
    }

    sync_startup_shortcut(enable, exe_str);

    Ok(())
}

#[tauri::command]
pub fn get_autostart_status() -> Result<bool, String> {
    Ok(is_autostart_enabled())
}

#[tauri::command]
pub fn set_autostart_status(enable: bool) -> Result<(), String> {
    set_autostart(enable)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_autostart_toggle() {
        let initial_state = is_autostart_enabled();

        // Test enabling autostart
        assert!(set_autostart(true).is_ok());
        assert!(is_autostart_enabled());

        // Restore original user autostart state
        let _ = set_autostart(initial_state);
        assert_eq!(is_autostart_enabled(), initial_state);
    }
}
