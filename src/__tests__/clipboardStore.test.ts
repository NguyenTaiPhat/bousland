import { describe, it, expect, beforeEach, vi } from "vitest";
import { useClipboardStore } from "../stores/clipboardStore";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

describe("useClipboardStore", () => {
  beforeEach(() => {
    useClipboardStore.setState({
      items: [],
      searchQuery: "",
      filterKind: "all",
    });
  });

  it("filters items by search query", () => {
    useClipboardStore.getState().setItems([
      { id: "1", text: "React Tailwind Framer", kind: "text", timestamp: 100 },
      { id: "2", text: "https://tauri.app", kind: "url", timestamp: 200 },
      { id: "3", text: "const a = 123;", kind: "code", timestamp: 300 },
    ]);

    useClipboardStore.getState().setSearchQuery("tauri");
    const filtered = useClipboardStore.getState().getFilteredItems();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("2");
  });

  it("filters items by kind", () => {
    useClipboardStore.getState().setItems([
      { id: "1", text: "React Tailwind Framer", kind: "text", timestamp: 100 },
      { id: "2", text: "https://tauri.app", kind: "url", timestamp: 200 },
      { id: "3", text: "#3E3E48", kind: "color", timestamp: 250 },
    ]);

    useClipboardStore.getState().setFilterKind("color");
    const filtered = useClipboardStore.getState().getFilteredItems();
    expect(filtered.length).toBe(1);
    expect(filtered[0].kind).toBe("color");
  });

  it("adds new items at the beginning avoiding duplicates", () => {
    useClipboardStore.getState().addItem({
      id: "1",
      text: "First text",
      kind: "text",
      timestamp: 100,
    });
    useClipboardStore.getState().addItem({
      id: "2",
      text: "Second text",
      kind: "text",
      timestamp: 200,
    });

    const items = useClipboardStore.getState().items;
    expect(items.length).toBe(2);
    expect(items[0].text).toBe("Second text");
  });
});
