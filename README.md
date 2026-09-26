# BousLand

> **A smarter space on your Windows desktop.**

BousLand is a lightweight, high-performance Windows desktop utility that lives as a floating intelligent control surface at the top of your screen. Built with **Tauri 2**, **Rust**, **React**, **TypeScript**, and **Framer Motion**, it delivers physical, 60 FPS transitions and real-time Windows hardware and media integration with near-zero idle resource consumption (< 1% CPU, < 100 MB RAM).

---

## Key Features

- **Dynamic Island Surface**:
  - **Compact State**: Discreet, non-intrusive 280×44 pill displaying subtle indicators (CPU load, battery percentage, active media playback).
  - **Expanded State**: Smooth spring animation expanding to 380×88 when system events occur (volume adjustments, media track changes, low battery warnings, screenshots, clipboard copies).
  - **Control Center**: Floating quick-access panel with real-time CPU/RAM/Network meters, media session controls, interactive volume slider, and shortcuts.
  - **Command Bar (`Ctrl + Space`)**: Spotlight-style command palette to control volume, inspect hardware metrics, trigger screenshots, and manage settings.

- **Real Windows Native Integrations (Zero Mock Data)**:
  - **Core Audio Integration**: Real-time master volume listener using Windows Core Audio (`IAudioEndpointVolumeCallback`). Responds instantly to physical volume dials, keyboards, or Windows sliders.
  - **Windows Media Sessions (SMTC)**: Real-time track title, artist, album, and embedded artwork via `GlobalSystemMediaTransportControlsSessionManager`. Supports Play, Pause, Next, Previous.
  - **Power & Battery**: Native power status query via `GetSystemPowerStatus` with automatic low/critical battery alerts.
  - **System Metrics**: Efficient CPU usage, RAM utilization, and disk space calculation via `sysinfo`.
  - **Network Bandwidth**: Live upload and download throughput calculation in KB/s and MB/s.
  - **Screenshot Module**: Direct trigger for Windows Snipping Tool (`ms-screenclip:`) and automatic detection of saved screenshots with 1-click **Open** and **Copy** actions.
  - **Privacy-First Clipboard**: Detects clipboard changes via `GetClipboardSequenceNumber` without inspecting or exposing contents unless explicitly allowed.
  - **Fullscreen / Gaming Mode**: Foreground window detection (`GetForegroundWindow`) automatically hides the island when playing fullscreen games or viewing full-screen media.
  - **System Tray**: Native Windows tray menu with quick toggles, autostart toggle, settings, and exit.

- **Design System**:
  - Restrained dark interface (`#0D0D0F`, `#151518`, `#1B1B20`, `#25252A`).
  - Lucide SVG icons (no emojis).
  - Framer Motion physics calibrated to 60 FPS.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Shell & Core** | Tauri 2 (Rust) |
| **Windows APIs** | `windows` crate (Core Audio, WinRT SMTC, Win32 Power, DataExchange, GDI) |
| **System Info** | `sysinfo`, `dirs` |
| **UI Framework** | React 19, TypeScript, Vite |
| **Styling** | Vanilla CSS Tokens & CSS Modules |
| **Motion** | Framer Motion (Spring Physics) |
| **State Management** | Zustand |
| **Icons** | Lucide React |

---

## Project Structure

```text
BOUSLAND/
├── docs/
│   └── superpowers/
│       └── plans/              # Architecture and implementation plan
├── src/
│   ├── __tests__/              # Unit tests (Vitest)
│   ├── components/
│   │   ├── Island/             # Compact & Expanded island views
│   │   ├── ControlCenter/      # Floating control center panel
│   │   ├── CommandBar/         # Spotlight-style command palette
│   │   └── Settings/           # Preferences and modules config modal
│   ├── core/
│   │   ├── types.ts            # Typed BousEvent definitions & state contracts
│   │   ├── eventBus.ts         # Pub/Sub event bus
│   │   ├── priorityManager.ts  # Preemption engine & debounce/throttling
│   │   ├── nativeBridge.ts     # Tauri IPC event listener bridge
│   │   └── commandRegistry.ts  # Extensible command registration engine
│   ├── stores/
│   │   ├── islandStore.ts      # Active state & metrics store (Zustand)
│   │   └── settingsStore.ts    # Persistent configuration store
│   ├── styles/
│   │   ├── theme.css           # Design tokens
│   │   └── globals.css         # Transparent window & utility styles
│   └── App.tsx                 # Root application
├── src-tauri/
│   ├── src/
│   │   ├── commands/           # Global shortcuts registration
│   │   ├── media/              # Windows SMTC media transport manager
│   │   ├── system/             # Volume, Battery, Metrics, Network, Screenshot, Clipboard
│   │   ├── tray/               # Windows system tray menu
│   │   ├── windows/            # Geometry manager, top-centering, DPI scaling
│   │   ├── lib.rs              # Tauri application initialization
│   │   └── main.rs             # Windows entry point
│   ├── tests/                  # Rust integration tests
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── tsconfig.json
```

---

## Global Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Space` | Toggle Command Bar |
| `Ctrl + Shift + Space` | Expand Island |
| `Ctrl + Shift + B` | Toggle BousLand visibility |
| `Esc` | Collapse Expanded Island / Close Control Center / Close Command Bar |

---

## Development Setup

### Prerequisites

- **Windows 10 / 11** (64-bit)
- **Node.js** v18+ and **npm**
- **Rust** 1.78+ with `x86_64-pc-windows-msvc` toolchain
- **Visual Studio C++ Build Tools**

### Running in Development

1. Install frontend dependencies:
   ```bash
   npm install
   ```

2. Run the Tauri development server:
   ```bash
   npm run tauri dev
   ```

---

## Verification & Testing

### Frontend Tests (Vitest)
```bash
npx vitest run
```
Runs unit tests for the `PriorityManager` (preemption, in-place throttling, priority levels) and the `CommandRegistry`.

### Rust Native Tests
```bash
cd src-tauri
cargo test
```
Verifies native Windows API queries (power status, monitor serialization, and system types).

### Production Frontend Build
```bash
npm run build
```

---

## Building the Windows Installer

To build the standalone release binary and Windows installer (MSI / NSIS):
```bash
npm run tauri build
```
The installer executable will be generated under `src-tauri/target/release/bundle/nsis/` or `msi/`.

---

## Privacy Guarantee

BousLand is strictly **local-first**:
- No user account or sign-in is required.
- No network requests are made to external telemetry or tracking services.
- Clipboard and media metadata are processed strictly in local RAM.
- Configuration is saved locally at `%APPDATA%\BousLand\config.json`.

---

## License

MIT License. Designed and built with pride for Windows desktop power users.
