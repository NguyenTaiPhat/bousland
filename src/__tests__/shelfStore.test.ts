import { describe, it, expect, beforeEach } from "vitest";
import { useShelfStore, formatFileSize } from "../stores/shelfStore";

describe("shelfStore", () => {
  beforeEach(() => {
    useShelfStore.getState().clearShelf();
  });

  it("should format file size accurately", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("should add and remove files from shelf", () => {
    const fakeFile1 = new File(["test-content-1"], "document.pdf", { type: "application/pdf" });
    const fakeFile2 = new File(["test-content-2"], "photo.png", { type: "image/png" });

    useShelfStore.getState().addFiles([fakeFile1, fakeFile2]);
    const files = useShelfStore.getState().files;
    expect(files.length).toBe(2);
    expect(files[0].name).toBe("document.pdf");

    // Remove first file
    useShelfStore.getState().removeFile(files[0].id);
    expect(useShelfStore.getState().files.length).toBe(1);
    expect(useShelfStore.getState().files[0].name).toBe("photo.png");

    // Clear
    useShelfStore.getState().clearShelf();
    expect(useShelfStore.getState().files.length).toBe(0);
  });
});
