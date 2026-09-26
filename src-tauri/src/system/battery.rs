use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BatteryStatus {
    pub percentage: u32,
    pub charging: bool,
    pub plugged_in: bool,
    pub has_battery: bool,
    pub is_critical: bool,
}

pub fn get_battery_status_native() -> BatteryStatus {
    unsafe {
        let mut status = SYSTEM_POWER_STATUS::default();
        if GetSystemPowerStatus(&mut status).is_ok() {
            // ACLineStatus: 0 = Offline (on battery), 1 = Online (plugged in), 255 = Unknown
            let plugged_in = status.ACLineStatus == 1;

            // BatteryFlag:
            // 1 = High, 2 = Low, 4 = Critical, 8 = Charging, 128 = No system battery, 255 = Unknown
            let has_battery = status.BatteryFlag != 128 && status.BatteryLifePercent != 255;
            let charging = (status.BatteryFlag & 8) != 0;
            let is_critical = (status.BatteryFlag & 4) != 0 || (status.BatteryLifePercent <= 10 && has_battery);

            let percentage = if status.BatteryLifePercent == 255 {
                100
            } else {
                status.BatteryLifePercent as u32
            };

            BatteryStatus {
                percentage,
                charging,
                plugged_in,
                has_battery,
                is_critical,
            }
        } else {
            BatteryStatus {
                percentage: 100,
                charging: false,
                plugged_in: true,
                has_battery: false,
                is_critical: false,
            }
        }
    }
}

pub fn start_battery_monitor(app_handle: AppHandle, running: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let mut last_status: Option<BatteryStatus> = None;

        while running.load(Ordering::Relaxed) {
            let current = get_battery_status_native();

            let should_emit = match &last_status {
                Some(last) => last != &current,
                None => true,
            };

            if should_emit {
                let _ = app_handle.emit("bous://battery-change", &current);
                last_status = Some(current);
            }

            // Sleep 4 seconds between checks (extremely lightweight, <0.01% CPU)
            std::thread::sleep(Duration::from_secs(4));
        }
    });
}

#[tauri::command]
pub fn get_battery_status() -> Result<BatteryStatus, String> {
    Ok(get_battery_status_native())
}
