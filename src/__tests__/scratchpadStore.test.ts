import { describe, it, expect, beforeEach, vi } from "vitest";
import { useScratchpadStore } from "../stores/scratchpadStore";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd) => {
    if (cmd === "load_scratchpad") {
      return Promise.resolve([]);
    }
    if (cmd === "save_scratchpad") {
      return Promise.resolve();
    }
    return Promise.resolve();
  }),
}));

describe("scratchpadStore", () => {
  beforeEach(() => {
    useScratchpadStore.setState({ items: [] });
  });

  it("should add a new todo item", async () => {
    await useScratchpadStore.getState().addTodo("Hoàn thành dự án BousLand");
    const items = useScratchpadStore.getState().items;

    expect(items.length).toBe(1);
    expect(items[0].text).toBe("Hoàn thành dự án BousLand");
    expect(items[0].completed).toBe(false);
    expect(items[0].pinned).toBe(false);
  });

  it("should toggle todo completion state", async () => {
    await useScratchpadStore.getState().addTodo("Task toggle");
    const item = useScratchpadStore.getState().items[0];

    await useScratchpadStore.getState().toggleTodo(item.id);
    expect(useScratchpadStore.getState().items[0].completed).toBe(true);

    await useScratchpadStore.getState().toggleTodo(item.id);
    expect(useScratchpadStore.getState().items[0].completed).toBe(false);
  });

  it("should pin and unpin item, returning pinned item in getPinnedItem", async () => {
    await useScratchpadStore.getState().addTodo("Task to pin");
    const item = useScratchpadStore.getState().items[0];

    await useScratchpadStore.getState().pinTodo(item.id);
    expect(useScratchpadStore.getState().items[0].pinned).toBe(true);
    expect(useScratchpadStore.getState().getPinnedItem()?.id).toBe(item.id);

    // Pinning again unpins it
    await useScratchpadStore.getState().pinTodo(item.id);
    expect(useScratchpadStore.getState().items[0].pinned).toBe(false);
    expect(useScratchpadStore.getState().getPinnedItem()).toBeUndefined();
  });

  it("should delete todo item and clear completed items", async () => {
    await useScratchpadStore.getState().addTodo("Task 1");
    await useScratchpadStore.getState().addTodo("Task 2");
    const items = useScratchpadStore.getState().items;

    // Toggle Task 2 to completed
    await useScratchpadStore.getState().toggleTodo(items[0].id);

    await useScratchpadStore.getState().clearCompleted();
    const remaining = useScratchpadStore.getState().items;
    expect(remaining.length).toBe(1);
    expect(remaining[0].text).toBe("Task 1");

    // Delete single item
    await useScratchpadStore.getState().deleteTodo(remaining[0].id);
    expect(useScratchpadStore.getState().items.length).toBe(0);
  });
});
