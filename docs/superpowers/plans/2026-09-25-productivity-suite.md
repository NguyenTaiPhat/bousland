# BousLand Productivity Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai bộ tính năng Năng suất & Tiện ích tệp cho BousLand bao gồm Lịch sử khay nhớ tạm (Clipboard History), Trạm kéo thả tệp tạm (Quick Shelf Drop Zone), và Ghi chú ghim nhanh (Quick Scratchpad).

**Architecture:** Mở rộng native Rust Win32 backend để đọc dữ liệu clipboard an toàn và lưu trữ ring buffer trong RAM; frontend React + Zustand + Framer Motion quản lý state và hiển thị UI; cấu hình scratchpad lưu tại `%APPDATA%/BousLand/scratchpad.json`.

**Tech Stack:** Tauri 2, Rust (windows-sys/windows-rs), React 19, TypeScript, Zustand, Framer Motion, Lucide SVG icons.

## Global Constraints
- 100% Native Windows API, zero placeholder/fake mockups.
- Clipboard processing strictly in RAM; no telemetry; clear all on demand.
- Design: Dark restrained theme (`#0D0D0F`, `#151518`, `#1B1B20`, `#25252A`, `#FFFFFF`).
- Không dùng icon emoji (chỉ dùng Lucide SVG icons).
- Tương thích song ngữ (Tiếng Việt mặc định, alias lệnh tiếng Anh & tiếng Việt).

---

### Task 1: Native Windows Clipboard History Engine (Rust)

**Files:**
- Modify: `src-tauri/src/system/clipboard.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/tests/system_tests.rs`

**Interfaces:**
- Consumes: Win32 `OpenClipboard`, `GetClipboardData(CF_UNICODETEXT)`, `GetClipboardSequenceNumber`.
- Produces: Tauri event `bous://clipboard-history-update` emitting JSON array of clipboard items `{ id: string, text: string, kind: "text" | "url" | "color" | "code", timestamp: u64 }`, IPC commands `get_clipboard_history`, `copy_to_clipboard(text: String)`, `clear_clipboard_history`.

- [x] **Step 1: Write test for clipboard item classification and ring buffer**

```rust
// in src-tauri/tests/system_tests.rs
#[test]
fn test_classify_clipboard_content() {
    assert_eq!(classify_content("https://google.com"), "url");
    assert_eq!(classify_content("#FF5733"), "color");
    assert_eq!(classify_content("const x = 10;"), "code");
    assert_eq!(classify_content("Xin chào BousLand"), "text");
}
```

- [x] **Step 2: Run test to verify it fails**

Run: `cargo test --test system_tests test_classify_clipboard_content`
Expected: FAIL (functions not yet defined).

- [x] **Step 3: Implement content classifier, ring buffer and Win32 text reader**

Modify `src-tauri/src/system/clipboard.rs`:
- Add `ClipboardItem` struct: `id`, `text`, `kind`, `timestamp`.
- Implement `classify_content(text: &str) -> &'static str`.
- Implement `read_clipboard_text() -> Option<String>` via `GetClipboardData(CF_UNICODETEXT)`.
- Implement Mutex-protected ring buffer of up to 25 items.
- Expose commands: `get_clipboard_history`, `copy_to_clipboard`, `clear_clipboard_history`.

- [x] **Step 4: Register IPC commands in `src-tauri/src/lib.rs` and run test**

Run: `cargo test --test system_tests`
Expected: PASS.

- [x] **Step 5: Verify Rust check**

Run: `cargo check` in `src-tauri`.
Expected: 0 errors.

---

### Task 2: React Clipboard Store & Native Bridge

**Files:**
- Create: `src/stores/clipboardStore.ts`
- Modify: `src/core/nativeBridge.ts`
- Test: `src/__tests__/clipboardStore.test.ts`

**Interfaces:**
- Consumes: `bous://clipboard-history-update` from Rust.
- Produces: `useClipboardStore` with items, search query, `copyItem(id: string)`, `clearAll()`, `filterType`.

- [x] **Step 1: Write unit tests for clipboard store**

```typescript
// src/__tests__/clipboardStore.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useClipboardStore } from "../stores/clipboardStore";

describe("useClipboardStore", () => {
  beforeEach(() => {
    useClipboardStore.setState({ items: [], searchQuery: "" });
  });

  it("filters items by search query", () => {
    useClipboardStore.getState().setItems([
      { id: "1", text: "React Tailwind", kind: "text", timestamp: 100 },
      { id: "2", text: "https://tauri.app", kind: "url", timestamp: 200 },
    ]);
    useClipboardStore.getState().setSearchQuery("tauri");
    const filtered = useClipboardStore.getState().getFilteredItems();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("2");
  });
});
```

- [x] **Step 2: Run test to verify failure**

Run: `npx vitest run src/__tests__/clipboardStore.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement `src/stores/clipboardStore.ts`**

- Create `ClipboardItem` interface (`id`, `text`, `kind`, `timestamp`).
- Implement Zustand store with search filter, type filter, and optimistic copy action via Tauri invoke.

- [x] **Step 4: Connect Native Bridge**

Modify `src/core/nativeBridge.ts`:
- Add listener for `bous://clipboard-history-update` to sync store.
- Add listener for global shortcut `bous://open-clipboard` -> switch island state to `CLIPBOARD_HISTORY`.

- [x] **Step 5: Run tests and verify**

Run: `npx vitest run`
Expected: PASS 100%.

---

### Task 3: Clipboard History Panel UI

**Files:**
- Create: `src/components/Clipboard/ClipboardPanel.tsx`
- Create: `src/components/Clipboard/clipboard.module.css`
- Modify: `src/App.tsx`
- Modify: `src/stores/islandStore.ts`

**Interfaces:**
- Consumes: `useClipboardStore`, `useIslandStore`.
- Produces: Full UI panel for browsing, searching, and 1-click re-copying items with toast confirmation.

- [x] **Step 1: Add `CLIPBOARD_HISTORY` state to `IslandState` in `src/core/types.ts` & `islandStore.ts`**

- Size dimensions: `{ width: 520, height: 460 }`.

- [x] **Step 2: Create `ClipboardPanel.tsx` and styling**

- Header: Tiêu đề "Khay nhớ tạm", ô tìm kiếm, nút xóa lịch sử.
- Danh sách item: Phân loại badge (Link, Màu, Code, Văn bản), preview 2 dòng, nút copy nhanh và nút xóa item.
- Phím tắt Esc để đóng về Island.

- [x] **Step 3: Register in `src/App.tsx`**

- Render `<ClipboardPanel key="clipboard-panel" />` inside `<AnimatePresence mode="wait">`.

- [x] **Step 4: Register shortcut `Ctrl + Shift + V` in `lib.rs` & Command Bar `clip` / `lichsu`**

- [x] **Step 5: Verify build**

Run: `npm run build`
Expected: 0 errors.

---

### Task 4: Quick Shelf Drag-and-Drop Zone (Kéo Thả Tệp)

**Files:**
- Create: `src/stores/shelfStore.ts`
- Create: `src/components/Shelf/ShelfDropZone.tsx`
- Create: `src/components/Shelf/ShelfPanel.tsx`
- Create: `src/components/Shelf/shelf.module.css`
- Modify: `src/components/Island/Island.tsx`

**Interfaces:**
- Consumes: Drag events `dragover`, `dragleave`, `drop`.
- Produces: Shelf store containing files `{ path: string, name: string, size: number, isImage: boolean }`, quick copy path, open in explorer.

- [x] **Step 1: Implement `src/stores/shelfStore.ts`**

- File item interface, `addFiles`, `removeFile`, `clearShelf`, `copyPath`.

- [x] **Step 2: Add Drag & Drop listener in `Island.tsx`**

- Detect file dragging over Island (`e.dataTransfer.types.includes("Files")`).
- Render animated glowing dashed drop border over Island when drag is active.
- On drop: extract file paths and append to shelf store, expand Island to display Quick Shelf.

- [x] **Step 3: Implement `ShelfPanel.tsx`**

- Hiển thị danh sách file đang ghim.
- Nút "Sao chép đường dẫn", "Mở thư mục", "Xóa".
- Cho phép kéo file ra khỏi shelf.

- [x] **Step 4: Verify build**

Run: `npm run build`
Expected: 0 errors.

---

### Task 5: Quick Scratchpad / Pinning Engine & UI

**Files:**
- Create: `src-tauri/src/system/scratchpad.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `src/stores/scratchpadStore.ts`
- Create: `src/components/Scratchpad/ScratchpadPanel.tsx`
- Modify: `src/components/Island/CompactView.tsx`

**Interfaces:**
- Consumes: Local `%APPDATA%/BousLand/scratchpad.json`.
- Produces: Note/todo list, pinned todo item shown on Compact Island.

- [x] **Step 1: Implement Rust persistence in `scratchpad.rs`**

- Read and save todo list `{ id: string, text: string, completed: boolean, pinned: boolean }` to `%APPDATA%/BousLand/scratchpad.json`.
- IPC commands: `load_scratchpad`, `save_scratchpad`.

- [x] **Step 2: Implement `src/stores/scratchpadStore.ts`**

- Zustand store with `addTodo`, `toggleTodo`, `deleteTodo`, `pinTodo`, auto-sync to backend.

- [x] **Step 3: Implement `ScratchpadPanel.tsx`**

- Mini checklist UI: ô nhập việc cần làm, danh sách việc, nút ghim (pin).
- Có thể mở từ tab Control Center hoặc lệnh `note` / `todo` trên Command Bar.

- [x] **Step 4: Render pinned todo on `CompactView.tsx`**

- Nếu có todo đang ghim: hiển thị badge hoặc đoạn chữ rút gọn của todo kèm icon check.

- [x] **Step 5: Verify build & tests**

Run: `npm run build && npx vitest run && cargo check` in `src-tauri`.
Expected: Tất cả vượt qua 100%.
