use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use windows::core::implement;
use windows::Win32::Foundation::BOOL;
use windows::Win32::Media::Audio::Endpoints::{
    IAudioEndpointVolume, IAudioEndpointVolumeCallback, IAudioEndpointVolumeCallback_Impl,
};
use windows::Win32::Media::Audio::{
    eConsole, eRender, AUDIO_VOLUME_NOTIFICATION_DATA, IMMDevice, IMMDeviceEnumerator,
    MMDeviceEnumerator,
};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeStatus {
    pub volume: u32, // 0 - 100
    pub muted: bool,
}

#[implement(IAudioEndpointVolumeCallback)]
struct VolumeChangeCallback {
    app_handle: AppHandle,
}

impl IAudioEndpointVolumeCallback_Impl for VolumeChangeCallback_Impl {
    fn OnNotify(&self, pnotify: *mut AUDIO_VOLUME_NOTIFICATION_DATA) -> windows::core::Result<()> {
        if pnotify.is_null() {
            return Ok(());
        }
        unsafe {
            let data = &*pnotify;
            let vol = (data.fMasterVolume * 100.0).round() as u32;
            let muted = data.bMuted.as_bool();

            let status = VolumeStatus {
                volume: vol.min(100),
                muted,
            };

            let _ = self.app_handle.emit("bous://volume-change", status);
        }
        Ok(())
    }
}

#[allow(dead_code)]
pub struct VolumeManager {
    endpoint_volume: Option<IAudioEndpointVolume>,
    callback: Option<IAudioEndpointVolumeCallback>,
}

unsafe impl Send for VolumeManager {}
unsafe impl Sync for VolumeManager {}

static VOLUME_MGR: Mutex<Option<VolumeManager>> = Mutex::new(None);

pub fn init_volume_listener(app_handle: AppHandle) -> Result<(), String> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| format!("Failed to create MMDeviceEnumerator: {}", e))?;

        let device: IMMDevice = enumerator
            .GetDefaultAudioEndpoint(eRender, eConsole)
            .map_err(|e| format!("Failed to get default audio endpoint: {}", e))?;

        let endpoint_volume: IAudioEndpointVolume = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("Failed to activate IAudioEndpointVolume: {}", e))?;

        let callback: IAudioEndpointVolumeCallback = VolumeChangeCallback {
            app_handle: app_handle.clone(),
        }
        .into();

        endpoint_volume
            .RegisterControlChangeNotify(&callback)
            .map_err(|e| format!("Failed to register volume notify callback: {}", e))?;

        // Emit initial volume status
        let current_vol = endpoint_volume.GetMasterVolumeLevelScalar().unwrap_or(0.5);
        let current_mute = endpoint_volume.GetMute().unwrap_or(BOOL(0));

        let initial_status = VolumeStatus {
            volume: (current_vol * 100.0).round() as u32,
            muted: current_mute.as_bool(),
        };
        let _ = app_handle.emit("bous://volume-change", initial_status);

        let mut mgr_lock = VOLUME_MGR.lock().unwrap();
        *mgr_lock = Some(VolumeManager {
            endpoint_volume: Some(endpoint_volume),
            callback: Some(callback),
        });

        Ok(())
    }
}

#[tauri::command]
pub fn get_volume() -> Result<VolumeStatus, String> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| e.to_string())?;

        let device: IMMDevice = enumerator
            .GetDefaultAudioEndpoint(eRender, eConsole)
            .map_err(|e| e.to_string())?;

        let endpoint_volume: IAudioEndpointVolume = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| e.to_string())?;

        let current_vol = endpoint_volume
            .GetMasterVolumeLevelScalar()
            .map_err(|e| format!("Failed to get volume scalar: {}", e))?;
        let current_mute = endpoint_volume
            .GetMute()
            .map_err(|e| format!("Failed to get mute status: {}", e))?;

        Ok(VolumeStatus {
            volume: (current_vol * 100.0).round() as u32,
            muted: current_mute.as_bool(),
        })
    }
}

pub fn volume_to_scalar(vol: u32) -> f32 {
    (vol.min(100) as f32) / 100.0
}

pub fn scalar_to_volume(scalar: f32) -> u32 {
    (scalar.clamp(0.0, 1.0) * 100.0).round() as u32
}

#[tauri::command]
pub fn set_volume(app: AppHandle, volume: u32) -> Result<(), String> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| e.to_string())?;

        let device: IMMDevice = enumerator
            .GetDefaultAudioEndpoint(eRender, eConsole)
            .map_err(|e| e.to_string())?;

        let endpoint_volume: IAudioEndpointVolume = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| e.to_string())?;

        let scalar = volume_to_scalar(volume);
        endpoint_volume
            .SetMasterVolumeLevelScalar(scalar, std::ptr::null())
            .map_err(|e| e.to_string())?;

        // Emit instant volume event to synchronize all frontend surfaces
        let _ = app.emit("bous://volume-change", VolumeStatus {
            volume: volume.min(100),
            muted: false,
        });

        Ok(())
    }
}

#[tauri::command]
pub fn set_mute(app: AppHandle, mute: bool) -> Result<(), String> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| e.to_string())?;

        let device: IMMDevice = enumerator
            .GetDefaultAudioEndpoint(eRender, eConsole)
            .map_err(|e| e.to_string())?;

        let endpoint_volume: IAudioEndpointVolume = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| e.to_string())?;

        endpoint_volume
            .SetMute(BOOL(if mute { 1 } else { 0 }), std::ptr::null())
            .map_err(|e| e.to_string())?;

        let current_vol = endpoint_volume.GetMasterVolumeLevelScalar().unwrap_or(0.5);
        let _ = app.emit("bous://volume-change", VolumeStatus {
            volume: scalar_to_volume(current_vol),
            muted: mute,
        });

        Ok(())
    }
}
