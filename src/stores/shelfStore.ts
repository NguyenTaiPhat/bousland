import { create } from "zustand";

export interface ShelfFileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  thumbnailUrl?: string;
  timestamp: number;
}

interface ShelfStoreState {
  files: ShelfFileItem[];
  isDraggingOver: boolean;

  // Actions
  setIsDraggingOver: (dragging: boolean) => void;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearShelf: () => void;
  copyFilePath: (path: string) => Promise<void>;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const useShelfStore = create<ShelfStoreState>((set) => ({
  files: [],
  isDraggingOver: false,

  setIsDraggingOver: (isDraggingOver) => set({ isDraggingOver }),

  addFiles: (newFiles) => {
    const items: ShelfFileItem[] = newFiles.map((f) => {
      const isImg = f.type.startsWith("image/");
      const path = (f as any).path || f.name;
      return {
        id: `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: f.name,
        path,
        size: f.size,
        type: f.type,
        thumbnailUrl: isImg ? URL.createObjectURL(f) : undefined,
        timestamp: Date.now(),
      };
    });

    set((state) => ({
      files: [...items, ...state.files].slice(0, 10), // keep up to 10 recent files
      isDraggingOver: false,
    }));
  },

  removeFile: (id) => {
    set((state) => ({ files: state.files.filter((f) => f.id !== id) }));
  },

  clearShelf: () => set({ files: [] }),

  copyFilePath: async (path) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(path);
      }
    } catch (err) {
      console.debug("[ShelfStore] Failed to copy path:", err);
    }
  },
}));
