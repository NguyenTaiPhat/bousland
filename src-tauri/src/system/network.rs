use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use sysinfo::Networks;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkMetrics {
    pub connected: bool,
    pub is_wifi: bool,
    pub upload_speed: u64,   // Bytes per second
    pub download_speed: u64, // Bytes per second
}

pub fn start_network_monitor(app_handle: AppHandle, running: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let mut networks = Networks::new_with_refreshed_list();
        let mut last_total_rx: u64 = 0;
        let mut last_total_tx: u64 = 0;

        for (_interface_name, data) in &networks {
            last_total_rx += data.total_received();
            last_total_tx += data.total_transmitted();
        }

        while running.load(Ordering::Relaxed) {
            std::thread::sleep(Duration::from_secs(2));
            networks.refresh(true);

            let mut current_total_rx: u64 = 0;
            let mut current_total_tx: u64 = 0;
            let mut is_wifi = false;

            for (name, data) in &networks {
                current_total_rx += data.total_received();
                current_total_tx += data.total_transmitted();

                let lower = name.to_lowercase();
                if lower.contains("wi-fi") || lower.contains("wireless") || lower.contains("wlan") {
                    is_wifi = true;
                }
            }

            let rx_delta = current_total_rx.saturating_sub(last_total_rx);
            let tx_delta = current_total_tx.saturating_sub(last_total_tx);

            // Per second rate (sleep is 2 seconds)
            let download_speed = rx_delta / 2;
            let upload_speed = tx_delta / 2;

            last_total_rx = current_total_rx;
            last_total_tx = current_total_tx;

            let metrics = NetworkMetrics {
                connected: !networks.is_empty(),
                is_wifi,
                upload_speed,
                download_speed,
            };

            let _ = app_handle.emit("bous://network-change", &metrics);
        }
    });
}
