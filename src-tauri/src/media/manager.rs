use base64::Engine;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession,
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};
use windows::Storage::Streams::{DataReader, InputStreamOptions};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MediaInfo {
    pub has_media: bool,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub artwork: Option<String>,
    pub is_playing: bool,
    pub position: u64, // seconds
    pub duration: u64, // seconds
}

impl Default for MediaInfo {
    fn default() -> Self {
        Self {
            has_media: false,
            title: String::new(),
            artist: String::new(),
            album: String::new(),
            artwork: None,
            is_playing: false,
            position: 0,
            duration: 0,
        }
    }
}

fn read_thumbnail_base64(
    thumb_ref: windows::Storage::Streams::IRandomAccessStreamReference,
) -> Option<String> {
    let stream = thumb_ref.OpenReadAsync().ok()?.get().ok()?;
    let size = stream.Size().ok()? as u32;
    if size == 0 || size > 2_000_000 {
        return None;
    }
    let reader = DataReader::CreateDataReader(&stream).ok()?;
    let _ = reader.SetInputStreamOptions(InputStreamOptions::None);
    reader.LoadAsync(size).ok()?.get().ok()?;
    let mut bytes = vec![0u8; size as usize];
    reader.ReadBytes(&mut bytes).ok()?;

    Some(format!(
        "data:image/jpeg;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&bytes)
    ))
}

pub fn get_current_media_info() -> MediaInfo {
    let manager = match GlobalSystemMediaTransportControlsSessionManager::RequestAsync() {
        Ok(op) => match op.get() {
            Ok(mgr) => mgr,
            Err(_) => return MediaInfo::default(),
        },
        Err(_) => return MediaInfo::default(),
    };

    let session = match manager.GetCurrentSession() {
        Ok(s) => s,
        Err(_) => return MediaInfo::default(),
    };

    let mut info = MediaInfo::default();
    info.has_media = true;

    // Playback status
    if let Ok(playback) = session.GetPlaybackInfo() {
        if let Ok(status) = playback.PlaybackStatus() {
            info.is_playing = status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;
        }
    }

    // Media properties (Title, Artist, Album, Artwork)
    if let Ok(props_op) = session.TryGetMediaPropertiesAsync() {
        if let Ok(props) = props_op.get() {
            if let Ok(title) = props.Title() {
                info.title = title.to_string();
            }
            if let Ok(artist) = props.Artist() {
                info.artist = artist.to_string();
            }
            if let Ok(album) = props.AlbumTitle() {
                info.album = album.to_string();
            }
            if let Ok(thumb_ref) = props.Thumbnail() {
                info.artwork = read_thumbnail_base64(thumb_ref);
            }
        }
    }

    // Timeline properties
    if let Ok(timeline) = session.GetTimelineProperties() {
        if let Ok(pos) = timeline.Position() {
            // Duration is in 100-nanosecond units (10,000,000 per second)
            info.position = (pos.Duration / 10_000_000) as u64;
        }
        if let Ok(end) = timeline.EndTime() {
            info.duration = (end.Duration / 10_000_000) as u64;
        }
    }

    info
}

pub fn start_media_monitor(app_handle: AppHandle, running: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let mut last_title = String::new();
        let mut last_playing = false;

        while running.load(Ordering::Relaxed) {
            let current = get_current_media_info();

            // Emit when title or playing status changes
            if current.has_media {
                if current.title != last_title || current.is_playing != last_playing {
                    last_title = current.title.clone();
                    last_playing = current.is_playing;
                    let _ = app_handle.emit("bous://media-change", &current);
                }
            } else if !last_title.is_empty() {
                last_title.clear();
                last_playing = false;
                let _ = app_handle.emit("bous://media-change", &current);
            }

            // Check every 600ms for responsive background media detection
            std::thread::sleep(Duration::from_millis(600));
        }
    });
}

fn get_active_session() -> Result<GlobalSystemMediaTransportControlsSession, String> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| e.to_string())?
        .get()
        .map_err(|e| e.to_string())?;

    manager
        .GetCurrentSession()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn media_play() -> Result<(), String> {
    let session = get_active_session()?;
    session.TryPlayAsync().map_err(|e| e.to_string())?.get().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn media_pause() -> Result<(), String> {
    let session = get_active_session()?;
    session.TryPauseAsync().map_err(|e| e.to_string())?.get().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn media_toggle_play_pause() -> Result<(), String> {
    let session = get_active_session()?;
    session.TryTogglePlayPauseAsync().map_err(|e| e.to_string())?.get().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn media_next() -> Result<(), String> {
    let session = get_active_session()?;
    session.TrySkipNextAsync().map_err(|e| e.to_string())?.get().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn media_previous() -> Result<(), String> {
    let session = get_active_session()?;
    session.TrySkipPreviousAsync().map_err(|e| e.to_string())?.get().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_media_status() -> Result<MediaInfo, String> {
    Ok(get_current_media_info())
}
