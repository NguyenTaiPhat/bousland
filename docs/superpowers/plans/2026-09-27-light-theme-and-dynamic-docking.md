# Light Theme and Dynamic Edge Docking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai hệ thống Theme Màu Trắng (Pure Ceramic & Frosted Snow) và tính năng Dynamic Edge Docking (hít góc vuông ôm viền màn hình và xoay dọc khi neo cạnh trái/phải), loại bỏ triệt để lỗi che tab trình duyệt.

**Architecture:** Sử dụng enum `DockPosition` (`TOP_CENTER`, `TOP_LEFT`, `TOP_RIGHT`, `LEFT`, `RIGHT`) type-safe giữa Rust và TypeScript. Chuẩn hóa DPI qua Logical Units (DIP), lấy gốc tọa độ theo từng `current_monitor`. Áp dụng thuật toán Hysteresis hai chiều ($T_{in} \le 48\text{px}$, $T_{out} \ge 80\text{px}$) chống rung ranh giới, kết hợp hiệu ứng Morphing bằng Framer Motion và đảo màu Accent tự động trên nền sáng.

**Tech Stack:** Tauri 2 (Rust, Win32 API, windows-rs), React 19, TypeScript, Framer Motion, Zustand, CSS Custom Properties (Theme tokens).

## Global Constraints

- Backend: Rust 2021, Tauri 2.0, không dùng `unwrap()` trong luồng chính, dùng `Result<T, String>`.
- Frontend: TypeScript `strict: true`, không dùng `any`, tuân thủ Biome linter.
- Tọa độ: Toàn bộ tọa độ và kích thước truyền qua IPC đều dùng Logical Units (DIP).
- Style: Biến CSS chuẩn hóa trong `src/styles/theme.css`, không hardcode màu hex trong các module con.
- Single-instance & Visibility: Giữ vững tính duy nhất của tiến trình và đảm bảo Island luôn hiển thị đúng vị trí.

---

### Task 1: Backend Data Models & Multi-Monitor Window Positioning

**Files:**
- Modify: `src-tauri/src/system/config.rs:5-60`
- Modify: `src-tauri/src/windows/manager.rs:1-80`
- Test: `src-tauri/tests/docking_tests.rs`

**Interfaces:**
- Consumes: `windows::Win32::Graphics::Gdi`, Tauri `WebviewWindow`
- Produces: `DockPosition` enum, `position_island_window(window, width, height, dock_position, offset_x, offset_y)`

- [ ] **Step 1: Write backend tests for DockPosition and coordinate calculations**

Tạo file `src-tauri/tests/docking_tests.rs`:
```rust
use tauri_app_lib::system::config::{BousSettings, DockPosition};

#[test]
fn test_dock_position_serialization() {
    let settings = BousSettings {
        dock_position: DockPosition::TopLeft,
        island_x_offset: 15.0,
        island_y_offset: 0.0,
        ..Default::default()
    };

    let json = serde_json::to_string(&settings).expect("Must serialize");
    assert!(json.contains("\"dock_position\":\"TOP_LEFT\""));

    let deserialized: BousSettings = serde_json::from_str(&json).expect("Must deserialize");
    assert_eq!(deserialized.dock_position, DockPosition::TopLeft);
    assert_eq!(deserialized.island_x_offset, 15.0);
}

#[test]
fn test_dock_position_defaults() {
    let settings = BousSettings::default();
    assert_eq!(settings.dock_position, DockPosition::TopCenter);
    assert_eq!(settings.island_x_offset, 0.0);
    assert_eq!(settings.island_y_offset, 0.0);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --test docking_tests --manifest-path src-tauri/Cargo.toml`  
Expected: FAIL với lỗi `DockPosition` chưa được định nghĩa.

- [ ] **Step 3: Implement DockPosition enum and position_island_window**

Trong `src-tauri/src/system/config.rs`:
```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DockPosition {
    #[default]
    TopCenter,
    TopLeft,
    TopRight,
    Left,
    Right,
}
```
Cập nhật struct `BousSettings` với `pub dock_position: DockPosition`, `pub island_x_offset: f64`, `pub island_y_offset: f64`.

Trong `src-tauri/src/windows/manager.rs`:
Cập nhật hàm `position_island_window` tính toán tọa độ theo `DockPosition`, neo tương đối theo `mon_x` và `mon_y` của `current_monitor`. Cập nhật lệnh IPC:
```rust
#[tauri::command]
pub fn resize_island_canvas(
    window: WebviewWindow,
    width: f64,
    height: f64,
    dock_position: Option<crate::system::config::DockPosition>,
    offset_x: Option<f64>,
    offset_y: Option<f64>,
) -> Result<(), String> {
    let settings = crate::system::config::load_settings().unwrap_or_default();
    let pos = dock_position.unwrap_or(settings.dock_position);
    let ox = offset_x.unwrap_or(settings.island_x_offset);
    let oy = offset_y.unwrap_or(settings.island_y_offset);
    position_island_window(&window, width, height, pos, ox, oy)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test --test docking_tests --manifest-path src-tauri/Cargo.toml`  
Expected: PASS 2/2 tests.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/system/config.rs src-tauri/src/windows/manager.rs src-tauri/tests/docking_tests.rs
git commit -m "feat(backend): add DockPosition enum and multi-monitor window positioning"
```

---

### Task 2: Light Theme System (Pure Ceramic & Frosted Snow)

**Files:**
- Modify: `src/styles/theme.css:40-99`
- Modify: `src/stores/settingsStore.ts:40-60`
- Modify: `src/components/Settings/SettingsModal.tsx:30-65`
- Modify: `src/components/Scratchpad/scratchpad.module.css:100-115`
- Test: `src/__tests__/themeStore.test.ts`

**Interfaces:**
- Consumes: `settingsStore.setTheme`, `applyThemeToDOM`
- Produces: CSS themes `[data-theme="light"]`, `[data-theme="snow"]`, auto-inverted `--accent`

- [ ] **Step 1: Write test for theme switching and accent inversion**

Tạo file `src/__tests__/themeStore.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { applyThemeToDOM } from "../stores/settingsStore";

describe("applyThemeToDOM", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.cssText = "";
  });

  it("applies light theme with auto-inverted dark accent when accent is default white", () => {
    applyThemeToDOM("light", "#FFFFFF");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#111827");
  });

  it("applies snow theme with custom colorful accent unchanged", () => {
    applyThemeToDOM("snow", "#38bdf8");
    expect(document.documentElement.getAttribute("data-theme")).toBe("snow");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#38bdf8");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/themeStore.test.ts`  
Expected: FAIL do `applyThemeToDOM` chưa có logic đảo màu cho theme sáng.

- [ ] **Step 3: Implement light & snow themes and accent inversion**

Trong `src/styles/theme.css`: Bổ sung `[data-theme="light"]` và `[data-theme="snow"]` với đầy đủ các token `--surface`, `--surface-2`, `--border`, `--text-primary`, `--shadow-island`.

Trong `src/stores/settingsStore.ts`:
```typescript
export function applyThemeToDOM(theme: string, accentHex?: string) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);

  const isLight = theme === "light" || theme === "snow";
  let effectiveAccent = accentHex;
  if (isLight && (!accentHex || accentHex.toUpperCase() === "#FFFFFF")) {
    effectiveAccent = "#111827";
  }

  if (effectiveAccent && effectiveAccent !== "system") {
    document.documentElement.style.setProperty("--accent", effectiveAccent);
    document.documentElement.style.setProperty("--accent-hover", effectiveAccent);
    document.documentElement.style.setProperty(
      "--accent-subtle",
      `color-mix(in srgb, ${effectiveAccent} 16%, transparent)`
    );
    document.documentElement.style.setProperty(
      "--accent-border",
      `color-mix(in srgb, ${effectiveAccent} 42%, transparent)`
    );
    document.documentElement.style.setProperty(
      "--accent-glow",
      `color-mix(in srgb, ${effectiveAccent} 25%, transparent)`
    );
  }
}
```

Trong `src/components/Settings/SettingsModal.tsx`:
Thêm `light` (icon `Sun`) và `snow` (icon `Snowflake`) vào mảng `THEMES`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/themeStore.test.ts`  
Expected: PASS 2/2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/styles/theme.css src/stores/settingsStore.ts src/components/Settings/SettingsModal.tsx src/__tests__/themeStore.test.ts
git commit -m "feat(ui): add Pure Ceramic and Frosted Snow light themes with accent contrast"
```

---

### Task 3: Frontend Docking State, Canvas Dimensions & IPC Integration

**Files:**
- Modify: `src/core/types.ts:1-30`
- Modify: `src/stores/settingsStore.ts:1-70`
- Modify: `src/stores/islandStore.ts:60-120`
- Test: `src/__tests__/dockingStore.test.ts`

**Interfaces:**
- Consumes: `DockPosition` from `types.ts`, `invoke("resize_island_canvas")`
- Produces: `syncWindowCanvas(state, dockPosition)` supporting $360\times 60$ (ngang) và $60\times 360$ (dọc)

- [ ] **Step 1: Write test for window canvas dimension synchronization**

Tạo file `src/__tests__/dockingStore.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { STATE_DIMENSIONS, STATE_DIMENSIONS_VERTICAL } from "../stores/islandStore";

describe("Docking dimensions", () => {
  it("provides horizontal compact dimensions", () => {
    expect(STATE_DIMENSIONS.COMPACT).toEqual({ width: 360, height: 60 });
  });

  it("provides vertical compact dimensions", () => {
    expect(STATE_DIMENSIONS_VERTICAL.COMPACT).toEqual({ width: 60, height: 360 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dockingStore.test.ts`  
Expected: FAIL do `STATE_DIMENSIONS_VERTICAL` chưa tồn tại.

- [ ] **Step 3: Implement DockPosition in frontend stores**

Trong `src/core/types.ts`:
```typescript
export type DockPosition = "TOP_CENTER" | "TOP_LEFT" | "TOP_RIGHT" | "LEFT" | "RIGHT";
```

Trong `src/stores/islandStore.ts`:
- Thêm `STATE_DIMENSIONS_VERTICAL`:
```typescript
export const STATE_DIMENSIONS_VERTICAL: Record<IslandState, { width: number; height: number }> = {
  COMPACT: { width: 60, height: 360 },
  EXPANDED: { width: 110, height: 410 },
  CONTROL_CENTER: { width: 480, height: 630 },
  COMMAND_BAR: { width: 580, height: 420 },
  SETTINGS: { width: 660, height: 540 },
  CLIPBOARD_HISTORY: { width: 540, height: 500 },
  QUICK_SHELF: { width: 520, height: 460 },
  SCRATCHPAD: { width: 500, height: 480 },
};
```
- Cập nhật `syncWindowCanvas` đọc `dock_position` từ `useSettingsStore` và gọi `invoke("resize_island_canvas", { width, height, dockPosition, offsetX, offsetY })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dockingStore.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/types.ts src/stores/islandStore.ts src/stores/settingsStore.ts src/__tests__/dockingStore.test.ts
git commit -m "feat(store): add vertical dimensions and dock position canvas synchronization"
```

---

### Task 4: Vertical Compact View & Corner Hugging Border-Radius

**Files:**
- Create: `src/components/Island/VerticalCompactView.tsx`
- Modify: `src/components/Island/Island.tsx:60-140`
- Modify: `src/components/Island/island.module.css:30-80`
- Test: `src/__tests__/islandCornerRadius.test.ts`

**Interfaces:**
- Consumes: `useSettingsStore().dock_position`, `useIslandStore().media`
- Produces: `VerticalCompactView`, dynamic `borderRadius` styles based on screen edge attachment

- [ ] **Step 1: Write test for reactive border-radius calculation**

Tạo file `src/__tests__/islandCornerRadius.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

function getBorderRadiusForDock(dock: string): string {
  switch (dock) {
    case "TOP_LEFT":
      return "0px 22px 22px 22px";
    case "TOP_RIGHT":
      return "22px 0px 22px 22px";
    case "LEFT":
      return "0px 22px 22px 0px";
    case "RIGHT":
      return "22px 0px 0px 22px";
    default:
      return "22px 22px 22px 22px";
  }
}

describe("getBorderRadiusForDock", () => {
  it("gives square top-left for TOP_LEFT", () => {
    expect(getBorderRadiusForDock("TOP_LEFT")).toBe("0px 22px 22px 22px");
  });
  it("gives square top-right for TOP_RIGHT", () => {
    expect(getBorderRadiusForDock("TOP_RIGHT")).toBe("22px 0px 22px 22px");
  });
  it("gives flat left edge for LEFT", () => {
    expect(getBorderRadiusForDock("LEFT")).toBe("0px 22px 22px 0px");
  });
  it("gives flat right edge for RIGHT", () => {
    expect(getBorderRadiusForDock("RIGHT")).toBe("22px 0px 0px 22px");
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/__tests__/islandCornerRadius.test.ts`  
Expected: PASS 4/4.

- [ ] **Step 3: Implement VerticalCompactView and Island.tsx integration**

Tạo `src/components/Island/VerticalCompactView.tsx`:
- Render theo chiều dọc (`flex-direction: column`):
  - Đỉnh: Camera dot phát sáng nhịp nhàng.
  - Giữa: Ảnh đĩa nhạc mini xoay (hoặc icon sóng âm/volume) kích thước $26 \times 26\text{px}$, Audio Visualizer hiển thị 4 vạch ngang xếp tầng.
  - Đáy: Đồng hồ dạng xếp 2 dòng (`HH` trên, `MM` dưới) hoặc % Pin.

Cập nhật `src/components/Island/Island.tsx`:
- Lấy `dock_position` từ `useSettingsStore()`.
- Tính toán kích thước dynamic: nếu là `LEFT` hoặc `RIGHT` thì `width: 44px, height: isExpanded ? 380px : 280px`.
- Render `VerticalCompactView` khi là chế độ dọc với hiệu ứng AnimatePresence cross-fade `opacity`.
- Áp dụng `borderRadius` theo hàm `getBorderRadiusForDock`.

- [ ] **Step 4: Run build to verify TypeScript & JSX compilation**

Run: `npm run build`  
Expected: Build thành công 0 lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/components/Island/VerticalCompactView.tsx src/components/Island/Island.tsx src/components/Island/island.module.css src/__tests__/islandCornerRadius.test.ts
git commit -m "feat(ui): add VerticalCompactView and corner-hugging border radius"
```

---

### Task 5: Drag-to-Position, Snap Threshold & Dual Hysteresis Interaction

**Files:**
- Modify: `src/components/Island/Island.tsx:20-100`
- Modify: `src/components/Settings/SettingsModal.tsx:480-550`
- Test: `src/__tests__/snapHysteresis.test.ts`

**Interfaces:**
- Consumes: Mouse `clientX`, `clientY`, `window.innerWidth`, `window.innerHeight`
- Produces: Hysteresis evaluation logic, `settings.updateSettings({ dock_position, island_x_offset })`

- [ ] **Step 1: Write unit test for Hysteresis Snap logic**

Tạo file `src/__tests__/snapHysteresis.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

interface SnapInput {
  currentDock: string;
  x: number;
  y: number;
  screenWidth: number;
  screenHeight: number;
}

function evaluateSnapMode(input: SnapInput): string {
  const { currentDock, x, screenWidth } = input;
  const SNAP_IN_EDGE = 48;
  const BREAK_AWAY_EDGE = 80;
  const SNAP_IN_CORNER = 60;

  // Nếu đang ở mép LEFT, phải kéo vượt quá 80px mới nhả
  if (currentDock === "LEFT") {
    if (x > BREAK_AWAY_EDGE) return "TOP_CENTER";
    return "LEFT";
  }

  // Nếu đang ở mép RIGHT, phải kéo ra khỏi 80px mới nhả
  if (currentDock === "RIGHT") {
    if (x < screenWidth - BREAK_AWAY_EDGE) return "TOP_CENTER";
    return "RIGHT";
  }

  // Nếu đang ở tự do, vào vùng < 48px thì hít
  if (x <= SNAP_IN_EDGE) return "LEFT";
  if (x >= screenWidth - SNAP_IN_EDGE) return "RIGHT";

  // Góc trên
  if (x <= SNAP_IN_CORNER) return "TOP_LEFT";
  if (x >= screenWidth - SNAP_IN_CORNER) return "TOP_RIGHT";

  return "TOP_CENTER";
}

describe("Hysteresis Snap Evaluation", () => {
  it("snaps into LEFT when entering within 48px from left edge", () => {
    expect(evaluateSnapMode({ currentDock: "TOP_CENTER", x: 40, y: 10, screenWidth: 1920, screenHeight: 1080 })).toBe("LEFT");
  });

  it("holds LEFT dock when hovering at 60px (inside hysteresis zone)", () => {
    expect(evaluateSnapMode({ currentDock: "LEFT", x: 60, y: 10, screenWidth: 1920, screenHeight: 1080 })).toBe("LEFT");
  });

  it("breaks away from LEFT when dragged past 80px", () => {
    expect(evaluateSnapMode({ currentDock: "LEFT", x: 90, y: 10, screenWidth: 1920, screenHeight: 1080 })).toBe("TOP_CENTER");
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/__tests__/snapHysteresis.test.ts`  
Expected: PASS 3/3 tests.

- [ ] **Step 3: Implement Dragging & Settings UI selector**

Trong `src/components/Island/Island.tsx`:
- Bắt sự kiện kéo chuột khi giữ phím `Alt` (hoặc con trỏ `grab`).
- Áp dụng hàm `evaluateSnapMode` để xác định trạng thái snap tức thì.
- Khi thả chuột (`mouseUp`), tự động lưu vị trí mới qua `settings.updateSettings`.

Trong `src/components/Settings/SettingsModal.tsx`:
- Bổ sung nhóm cài đặt "Vị trí & Docking":
  - 5 nút bấm chọn vị trí trực quan: `Góc Trái (Top-Left)`, `Giữa Trên (Top-Center)`, `Góc Phải (Top-Right)`, `Cạnh Trái (Dọc)`, `Cạnh Phải (Dọc)`.
  - Thanh trượt Offset X kèm nút "Đặt lại về chính giữa".

- [ ] **Step 4: Run build to verify integration**

Run: `npm run build`  
Expected: Build thành công 0 lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/components/Island/Island.tsx src/components/Settings/SettingsModal.tsx src/__tests__/snapHysteresis.test.ts
git commit -m "feat(interaction): implement Alt-drag with hysteresis snap and docking settings selector"
```

---

### Task 6: Multi-Monitor, DPI & End-to-End Verification

**Files:**
- Test: All backend tests (`cargo test`)
- Test: All frontend tests (`npx vitest run`)
- Build: Frontend production build (`npm run build`)

- [ ] **Step 1: Run all Rust backend tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`  
Expected: 100% tests pass (bao gồm volume, visualizer, file actions, updater, autostart, và docking_tests).

- [ ] **Step 2: Run all frontend unit tests**

Run: `npx vitest run`  
Expected: 100% tests pass.

- [ ] **Step 3: Run production frontend build**

Run: `npm run build`  
Expected: Vite build thành công sạch sẽ.

- [ ] **Step 4: Verify git status and commit final verification checkpoint**

Run: `git status`  
Commit:
```bash
git commit --allow-empty -m "chore: complete verification for light themes and dynamic edge docking"
```
