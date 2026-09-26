use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use windows::Win32::Media::Audio::{
    eConsole, eRender, AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK,
    IAudioCaptureClient, IAudioClient, IMMDevice, IMMDeviceEnumerator, MMDeviceEnumerator,
};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED,
};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct AudioSpectrum {
    pub bands: [f32; 4], // [Bass, Low-Mid, High-Mid, Treble], each 0.0 - 1.0
}

/// Simple 4-band filter bank splitting PCM samples into:
/// Band 0: Bass (< 250Hz)
/// Band 1: Low-Mid (250Hz - 1000Hz)
/// Band 2: High-Mid (1000Hz - 4000Hz)
/// Band 3: Treble (> 4000Hz)
pub fn extract_4_bands(pcm_samples: &[f32], channels: usize, sample_rate: f32) -> [f32; 4] {
    if pcm_samples.is_empty() || channels == 0 || sample_rate <= 0.0 {
        return [0.0, 0.0, 0.0, 0.0];
    }

    let alpha_bass = (2.0 * std::f32::consts::PI * 250.0 / sample_rate).min(1.0);
    let alpha_lmid = (2.0 * std::f32::consts::PI * 1000.0 / sample_rate).min(1.0);
    let alpha_hmid = (2.0 * std::f32::consts::PI * 4000.0 / sample_rate).min(1.0);

    let mut lp_bass = 0.0f32;
    let mut lp_lmid = 0.0f32;
    let mut lp_hmid = 0.0f32;

    let mut sum_sq_bass = 0.0f32;
    let mut sum_sq_lmid = 0.0f32;
    let mut sum_sq_hmid = 0.0f32;
    let mut sum_sq_treble = 0.0f32;
    let mut sample_count = 0.0f32;

    // Process mono downmix
    let step = channels.max(1);
    for chunk in pcm_samples.chunks(step) {
        let mono: f32 = chunk.iter().sum::<f32>() / (chunk.len() as f32);

        lp_bass += alpha_bass * (mono - lp_bass);
        lp_lmid += alpha_lmid * (mono - lp_lmid);
        lp_hmid += alpha_hmid * (mono - lp_hmid);

        let band_bass = lp_bass;
        let band_lmid = lp_lmid - lp_bass;
        let band_hmid = lp_hmid - lp_lmid;
        let band_treble = mono - lp_hmid;

        sum_sq_bass += band_bass * band_bass;
        sum_sq_lmid += band_lmid * band_lmid;
        sum_sq_hmid += band_hmid * band_hmid;
        sum_sq_treble += band_treble * band_treble;
        sample_count += 1.0;
    }

    if sample_count == 0.0 {
        return [0.0, 0.0, 0.0, 0.0];
    }

    // Convert RMS energy to normalized perceptual visual amplitude (0.0 to 1.0)
    let gain = 3.5f32;
    let rms_bass = ((sum_sq_bass / sample_count).sqrt() * gain).min(1.0);
    let rms_lmid = ((sum_sq_lmid / sample_count).sqrt() * gain * 1.2).min(1.0);
    let rms_hmid = ((sum_sq_hmid / sample_count).sqrt() * gain * 1.5).min(1.0);
    let rms_treble = ((sum_sq_treble / sample_count).sqrt() * gain * 2.0).min(1.0);

    [rms_bass, rms_lmid, rms_hmid, rms_treble]
}

/// Spawns the background WASAPI loopback audio visualizer thread
pub fn start_visualizer(app_handle: AppHandle, running: Arc<AtomicBool>) {
    std::thread::Builder::new()
        .name("bous-audio-visualizer".to_string())
        .spawn(move || {
            unsafe {
                let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            }

            let mut smoothed_bands = [0.0f32; 4];
            let mut silence_counter = 0;

            while running.load(Ordering::Relaxed) {
                match run_loopback_session(&app_handle, &running, &mut smoothed_bands, &mut silence_counter) {
                    Ok(_) => {}
                    Err(e) => {
                        eprintln!("[Visualizer] Session exited: {}. Re-attempting in 2s...", e);
                        std::thread::sleep(Duration::from_millis(2000));
                    }
                }
            }
        })
        .expect("Failed to spawn visualizer thread");
}

fn run_loopback_session(
    app_handle: &AppHandle,
    running: &Arc<AtomicBool>,
    smoothed_bands: &mut [f32; 4],
    silence_counter: &mut u32,
) -> Result<(), String> {
    unsafe {
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| format!("MMDeviceEnumerator failed: {}", e))?;

        let device: IMMDevice = enumerator
            .GetDefaultAudioEndpoint(eRender, eConsole)
            .map_err(|e| format!("GetDefaultAudioEndpoint failed: {}", e))?;

        let audio_client: IAudioClient = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("Activate IAudioClient failed: {}", e))?;

        let p_format = audio_client
            .GetMixFormat()
            .map_err(|e| format!("GetMixFormat failed: {}", e))?;

        let wave_format = &*p_format;
        let channels = wave_format.nChannels as usize;
        let sample_rate = wave_format.nSamplesPerSec as f32;
        let bits_per_sample = wave_format.wBitsPerSample;

        // Initialize in Loopback Shared mode
        // 10,000,000 hns = 1 second buffer
        audio_client
            .Initialize(
                AUDCLNT_SHAREMODE_SHARED,
                AUDCLNT_STREAMFLAGS_LOOPBACK,
                10_000_000,
                0,
                p_format,
                None,
            )
            .map_err(|e| format!("IAudioClient Initialize loopback failed: {}", e))?;

        let capture_client: IAudioCaptureClient = audio_client
            .GetService()
            .map_err(|e| format!("GetService IAudioCaptureClient failed: {}", e))?;

        audio_client
            .Start()
            .map_err(|e| format!("IAudioClient Start failed: {}", e))?;

        let decay = 0.65f32; // Smoothing decay factor

        while running.load(Ordering::Relaxed) {
            // Target ~35-40 fps update rate
            std::thread::sleep(Duration::from_millis(28));

            let mut packet_size = match capture_client.GetNextPacketSize() {
                Ok(size) => size,
                Err(_) => break, // Audio device changed or disconnected
            };

            let mut current_samples: Vec<f32> = Vec::new();

            while packet_size > 0 {
                let mut data_ptr = std::ptr::null_mut();
                let mut frames_read = 0;
                let mut flags = 0;

                if capture_client
                    .GetBuffer(&mut data_ptr, &mut frames_read, &mut flags, None, None)
                    .is_ok()
                {
                    if (flags & 1) == 0 && !data_ptr.is_null() && frames_read > 0 {
                        let total_samples = frames_read as usize * channels;
                        if bits_per_sample == 32 {
                            let float_slice =
                                std::slice::from_raw_parts(data_ptr as *const f32, total_samples);
                            current_samples.extend_from_slice(float_slice);
                        } else if bits_per_sample == 16 {
                            let i16_slice =
                                std::slice::from_raw_parts(data_ptr as *const i16, total_samples);
                            for &s in i16_slice {
                                current_samples.push(s as f32 / 32768.0);
                            }
                        }
                    }
                    let _ = capture_client.ReleaseBuffer(frames_read);
                }

                packet_size = capture_client.GetNextPacketSize().unwrap_or(0);
            }

            if !current_samples.is_empty() {
                let instant_bands = extract_4_bands(&current_samples, channels, sample_rate);

                let mut is_silent = true;
                for i in 0..4 {
                    // Smooth with lerp: quick attack, slow decay
                    if instant_bands[i] > smoothed_bands[i] {
                        smoothed_bands[i] = smoothed_bands[i] * 0.3 + instant_bands[i] * 0.7;
                    } else {
                        smoothed_bands[i] = smoothed_bands[i] * decay + instant_bands[i] * (1.0 - decay);
                    }
                    if smoothed_bands[i] > 0.02 {
                        is_silent = false;
                    }
                }

                if is_silent {
                    *silence_counter += 1;
                } else {
                    *silence_counter = 0;
                }

                // If silent for more than ~1 second (35 frames), gently fade to zero and sleep longer to save CPU
                if *silence_counter > 35 {
                    smoothed_bands.fill(0.0);
                    let _ = app_handle.emit("bous://audio-spectrum", AudioSpectrum { bands: *smoothed_bands });
                    std::thread::sleep(Duration::from_millis(150));
                } else {
                    let _ = app_handle.emit("bous://audio-spectrum", AudioSpectrum { bands: *smoothed_bands });
                }
            } else {
                // No audio packets in buffer
                *silence_counter += 1;
                if *silence_counter > 15 {
                    for b in smoothed_bands.iter_mut() {
                        *b *= decay;
                        if *b < 0.01 {
                            *b = 0.0;
                        }
                    }
                    let _ = app_handle.emit("bous://audio-spectrum", AudioSpectrum { bands: *smoothed_bands });
                    std::thread::sleep(Duration::from_millis(80));
                }
            }
        }

        let _ = audio_client.Stop();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_4_bands_silence() {
        let samples = vec![0.0f32; 512];
        let bands = extract_4_bands(&samples, 2, 48000.0);
        assert_eq!(bands, [0.0, 0.0, 0.0, 0.0]);
    }

    #[test]
    fn test_extract_4_bands_normalized_amplitude() {
        let samples: Vec<f32> = (0..1024)
            .map(|i| ((i as f32) * 0.1).sin() * 0.8)
            .collect();
        let bands = extract_4_bands(&samples, 2, 48000.0);
        for &val in &bands {
            assert!(
                val >= 0.0 && val <= 1.0,
                "Band amplitude out of range: {}",
                val
            );
        }
    }

    #[test]
    fn test_extract_4_bands_empty() {
        let bands = extract_4_bands(&[], 2, 48000.0);
        assert_eq!(bands, [0.0, 0.0, 0.0, 0.0]);
    }
}
