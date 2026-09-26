import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type ClipboardKind = "all" | "text" | "url" | "color" | "code";

export interface ClipboardItem {
  id: string;
  text: string;
  kind: "text" | "url" | "color" | "code" | string;
  timestamp: number;
}

interface ClipboardStoreState {
  items: ClipboardItem[];
  searchQuery: string;
  filterKind: ClipboardKind;
  
  // Actions
  setItems: (items: ClipboardItem[]) => void;
  addItem: (item: ClipboardItem) => void;
  setSearchQuery: (query: string) => void;
  setFilterKind: (kind: ClipboardKind) => void;
  getFilteredItems: () => ClipboardItem[];
  copyItem: (text: string) => Promise<void>;
  removeItem: (id: string) => void;
  clearHistory: () => Promise<void>;
  loadHistory: () => Promise<void>;
}

export const useClipboardStore = create<ClipboardStoreState>((set, get) => ({
  items: [],
  searchQuery: "",
  filterKind: "all",

  setItems: (items) => set({ items }),

  addItem: (item) => {
    set((state) => {
      // Remove any existing duplicate text to bring it to top
      const filtered = state.items.filter((i) => i.text !== item.text);
      return { items: [item, ...filtered].slice(0, 25) };
    });
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setFilterKind: (filterKind) => set({ filterKind }),

  getFilteredItems: () => {
    const { items, searchQuery, filterKind } = get();
    let result = items;

    if (filterKind !== "all") {
      result = result.filter((i) => i.kind === filterKind);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((i) => i.text.toLowerCase().includes(q));
    }

    return result;
  },

  copyItem: async (text) => {
    try {
      await invoke("copy_to_clipboard", { text });
    } catch (err) {
      console.debug("[ClipboardStore] Failed to copy to clipboard:", err);
      // Fallback
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    }
  },

  removeItem: (id) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },

  clearHistory: async () => {
    set({ items: [] });
    try {
      await invoke("clear_clipboard_history");
    } catch (err) {
      console.debug("[ClipboardStore] Failed to clear history:", err);
    }
  },

  loadHistory: async () => {
    try {
      const data = await invoke<ClipboardItem[]>("get_clipboard_history");
      if (Array.isArray(data)) {
        set({ items: data });
      }
    } catch (err) {
      console.debug("[ClipboardStore] Failed to load history from Tauri:", err);
    }
  },
}));
