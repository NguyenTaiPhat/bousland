use windows::core::{w, PCWSTR};
use windows::Win32::System::Registry::{
    RegCloseKey, RegDeleteValueW, RegOpenKeyExW, RegQueryValueExW, RegSetKeyValueW,
    HKEY, HKEY_CURRENT_USER, KEY_READ, KEY_SET_VALUE, REG_SZ,
};

const RUN_SUBKEY: PCWSTR = w!("Software\\Microsoft\\Windows\\CurrentVersion\\Run");
const APP_NAME: PCWSTR = w!("BousLand");

pub fn is_autostart_enabled() -> bool {
    unsafe {
        let mut hkey = HKEY::default();
        if RegOpenKeyExW(HKEY_CURRENT_USER, RUN_SUBKEY, 0, KEY_READ, &mut hkey).is_err() {
            return false;
        }

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
}

pub fn set_autostart(enable: bool) -> Result<(), String> {
    unsafe {
        if enable {
            let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
            let exe_str = exe_path.to_str().ok_or("Invalid executable path")?;
            
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
            res.ok().map_err(|e| format!("Failed to set autostart registry: {}", e))?;
        } else {
            let mut hkey = HKEY::default();
            if RegOpenKeyExW(HKEY_CURRENT_USER, RUN_SUBKEY, 0, KEY_SET_VALUE, &mut hkey).is_ok() {
                let _ = RegDeleteValueW(hkey, APP_NAME);
                let _ = RegCloseKey(hkey);
            }
        }
    }
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
        // Initially disable
        let _ = set_autostart(false);
        assert!(!is_autostart_enabled());

        // Enable
        assert!(set_autostart(true).is_ok());
        assert!(is_autostart_enabled());

        // Verify registry contains valid path
        // Cleanup after test
        assert!(set_autostart(false).is_ok());
        assert!(!is_autostart_enabled());
    }
}

