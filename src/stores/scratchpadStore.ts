import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface ScratchpadItem {
  id: string;
  text: string;
  completed: boolean;
  pinned: boolean;
  created_at: number;
}

interface ScratchpadStoreState {
  items: ScratchpadItem[];
  isLoading: boolean;

  // Actions
  loadItems: () => Promise<void>;
  addTodo: (text: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  pinTodo: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  getPinnedItem: () => ScratchpadItem | undefined;
}

export const useScratchpadStore = create<ScratchpadStoreState>((set, get) => ({
  items: [],
  isLoading: false,

  loadItems: async () => {
    try {
      set({ isLoading: true });
      const data = await invoke<ScratchpadItem[]>("load_scratchpad");
      set({ items: data || [], isLoading: false });
    } catch (err) {
      console.debug("[ScratchpadStore] Load IPC error:", err);
      set({ isLoading: false });
    }
  },

  addTodo: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newItem: ScratchpadItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      completed: false,
      pinned: false,
      created_at: Date.now(),
    };

    const updated = [newItem, ...get().items];
    set({ items: updated });

    try {
      await invoke("save_scratchpad", { items: updated });
    } catch (err) {
      console.debug("[ScratchpadStore] Save IPC error:", err);
    }
  },

  toggleTodo: async (id: string) => {
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    set({ items: updated });

    try {
      await invoke("save_scratchpad", { items: updated });
    } catch (err) {
      console.debug("[ScratchpadStore] Save IPC error:", err);
    }
  },

  deleteTodo: async (id: string) => {
    const updated = get().items.filter((item) => item.id !== id);
    set({ items: updated });

    try {
      await invoke("save_scratchpad", { items: updated });
    } catch (err) {
      console.debug("[ScratchpadStore] Save IPC error:", err);
    }
  },

  pinTodo: async (id: string) => {
    // Only 1 item can be pinned at a time; clicking pinned unpins it
    const current = get().items.find((item) => item.id === id);
    const shouldPin = current ? !current.pinned : false;

    const updated = get().items.map((item) => ({
      ...item,
      pinned: item.id === id ? shouldPin : false,
    }));
    set({ items: updated });

    try {
      await invoke("save_scratchpad", { items: updated });
    } catch (err) {
      console.debug("[ScratchpadStore] Save IPC error:", err);
    }
  },

  clearCompleted: async () => {
    const updated = get().items.filter((item) => !item.completed);
    set({ items: updated });

    try {
      await invoke("save_scratchpad", { items: updated });
    } catch (err) {
      console.debug("[ScratchpadStore] Save IPC error:", err);
    }
  },

  getPinnedItem: () => {
    return get().items.find((item) => item.pinned && !item.completed);
  },
}));
