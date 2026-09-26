use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use sysinfo::{Disks, System};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu_usage: f32, // 0.0 - 100.0
    pub ram_usage: f32, // 0.0 - 100.0
    pub ram_used_mb: u64,
    pub ram_total_mb: u64,
    pub disk_usage: f32, // 0.0 - 100.0
}

pub fn start_metrics_monitor(app_handle: AppHandle, running: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let mut sys = System::new();
        // Initial refresh
        sys.refresh_cpu_usage();
        sys.refresh_memory();
        std::thread::sleep(Duration::from_millis(500));

        while running.load(Ordering::Relaxed) {
            sys.refresh_cpu_usage();
            sys.refresh_memory();

            let cpu_usage = sys.global_cpu_usage();
            let total_ram = sys.total_memory() / (1024 * 1024);
            let used_ram = sys.used_memory() / (1024 * 1024);
            let ram_usage = if total_ram > 0 {
                (used_ram as f32 / total_ram as f32) * 100.0
            } else {
                0.0
            };

            // Calculate primary disk usage
            let disks = Disks::new_with_refreshed_list();
            let mut total_disk: u64 = 0;
            let mut available_disk: u64 = 0;
            for disk in &disks {
                total_disk += disk.total_space();
                available_disk += disk.available_space();
            }
            let disk_usage = if total_disk > 0 {
                ((total_disk - available_disk) as f32 / total_disk as f32) * 100.0
            } else {
                0.0
            };

            let metrics = SystemMetrics {
                cpu_usage,
                ram_usage,
                ram_used_mb: used_ram,
                ram_total_mb: total_ram,
                disk_usage,
            };

            let _ = app_handle.emit("bous://system-metrics", &metrics);

            // Update every 2 seconds to keep CPU overhead < 0.2%
            std::thread::sleep(Duration::from_secs(2));
        }
    });
}

#[tauri::command]
pub fn get_system_metrics() -> Result<SystemMetrics, String> {
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    sys.refresh_memory();
    std::thread::sleep(Duration::from_millis(200));
    sys.refresh_cpu_usage();

    let total_ram = sys.total_memory() / (1024 * 1024);
    let used_ram = sys.used_memory() / (1024 * 1024);
    let ram_usage = if total_ram > 0 {
        (used_ram as f32 / total_ram as f32) * 100.0
    } else {
        0.0
    };

    let disks = Disks::new_with_refreshed_list();
    let mut total_disk: u64 = 0;
    let mut available_disk: u64 = 0;
    for disk in &disks {
        total_disk += disk.total_space();
        available_disk += disk.available_space();
    }
    let disk_usage = if total_disk > 0 {
        ((total_disk - available_disk) as f32 / total_disk as f32) * 100.0
    } else {
        0.0
    };

    Ok(SystemMetrics {
        cpu_usage: sys.global_cpu_usage(),
        ram_usage,
        ram_used_mb: used_ram,
        ram_total_mb: total_ram,
        disk_usage,
    })
}
