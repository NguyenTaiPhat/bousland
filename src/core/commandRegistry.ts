import { invoke } from "@tauri-apps/api/core";
import { useIslandStore } from "../stores/islandStore";
import { useSettingsStore } from "../stores/settingsStore";
import { notifyUserVolumeAdjustment } from "./nativeBridge";

export interface CommandDefinition {
  id: string;
  name: string;
  syntax: string;
  description: string;
  category: "Audio" | "System" | "Media" | "Navigation" | "Utility" | "Launcher";
  execute: (args: string[]) => Promise<string | void> | string | void;
}

export class CommandRegistry {
  private commands: Map<string, CommandDefinition> = new Map();

  constructor() {
    this.registerDefaultCommands();
  }

  public register(cmd: CommandDefinition): void {
    this.commands.set(cmd.id, cmd);
  }

  public getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  public search(query: string): CommandDefinition[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getAll();

    const isUrl =
      (q.includes(".") && !q.includes(" ") && !q.startsWith("theme") && !q.startsWith("color")) ||
      q.startsWith("http://") ||
      q.startsWith("https://");

    const matched = this.getAll().filter(
      (cmd) =>
        cmd.id.includes(q) ||
        cmd.name.toLowerCase().includes(q) ||
        cmd.syntax.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q)
    );

    if (isUrl) {
      const dynamicUrlCmd: CommandDefinition = {
        id: `url-${q}`,
        name: `Mở liên kết web: ${q}`,
        syntax: q,
        description: `Mở ${q} trên trình duyệt mặc định`,
        category: "Launcher",
        execute: async () => {
          await invoke("quick_launch", { target: q });
          return `Đang mở ${q}...`;
        },
      };
      return [dynamicUrlCmd, ...matched];
    }

    return matched;
  }

  public async execute(rawInput: string): Promise<string> {
    const trimmed = rawInput.trim();
    if (!trimmed) return "";

    const parts = trimmed.split(/\s+/);
    const cmdKeyword = parts[0].toLowerCase();
    const args = parts.slice(1);

    // 1. Direct match by id or syntax keyword
    let found = this.commands.get(cmdKeyword);
    if (!found) {
      for (const cmd of this.commands.values()) {
        if (cmd.syntax.toLowerCase().startsWith(cmdKeyword)) {
          found = cmd;
          break;
        }
      }
    }

    if (found) {
      const res = await found.execute(args);
      return res || `Executed: ${found.name}`;
    }

    return `Unknown command: "${trimmed}". Type help for available commands.`;
  }

  private registerDefaultCommands(): void {
    // Volume commands
    this.register({
      id: "volume",
      name: "Đặt âm lượng",
      syntax: "volume <0-100> (amluong)",
      description: "Điều chỉnh mức âm lượng loa chính",
      category: "Audio",
      execute: async (args) => {
        const val = parseInt(args[0], 10);
        if (isNaN(val) || val < 0 || val > 100) {
          return "Invalid volume level. Please specify 0 to 100.";
        }
        notifyUserVolumeAdjustment();
        useIslandStore.getState().updateVolume(val, false);
        await invoke("set_volume", { volume: val });
        return `Volume set to ${val}%`;
      },
    });

    this.register({
      id: "amluong",
      name: "Đặt âm lượng (Tiếng Việt)",
      syntax: "amluong <0-100>",
      description: "Điều chỉnh âm lượng hệ thống bằng tiếng Việt",
      category: "Audio",
      execute: async (args) => {
        const val = parseInt(args[0], 10);
        if (isNaN(val) || val < 0 || val > 100) {
          return "Mức âm lượng không hợp lệ. Vui lòng chọn từ 0 đến 100.";
        }
        notifyUserVolumeAdjustment();
        useIslandStore.getState().updateVolume(val, false);
        await invoke("set_volume", { volume: val });
        return `Đã đặt âm lượng: ${val}%`;
      },
    });

    this.register({
      id: "mute",
      name: "Tắt tiếng",
      syntax: "mute (tattieng)",
      description: "Tắt âm thanh toàn hệ thống",
      category: "Audio",
      execute: async () => {
        notifyUserVolumeAdjustment();
        const curVol = useIslandStore.getState().volume.volume;
        useIslandStore.getState().updateVolume(curVol, true);
        await invoke("set_mute", { mute: true });
        return "Đã tắt tiếng loa chính (Audio muted)";
      },
    });

    this.register({
      id: "unmute",
      name: "Bật tiếng",
      syntax: "unmute (battieng)",
      description: "Bật lại âm thanh toàn hệ thống",
      category: "Audio",
      execute: async () => {
        notifyUserVolumeAdjustment();
        const curVol = useIslandStore.getState().volume.volume;
        useIslandStore.getState().updateVolume(curVol, false);
        await invoke("set_mute", { mute: false });
        return "Đã bật tiếng loa chính (Audio unmuted)";
      },
    });

    // Media commands
    this.register({
      id: "play",
      name: "Phát nhạc",
      syntax: "play (phat)",
      description: "Tiếp tục phát nhạc trên máy tính",
      category: "Media",
      execute: async () => {
        await invoke("media_play");
        return "Đã tiếp tục phát nhạc";
      },
    });

    this.register({
      id: "pause",
      name: "Tạm dừng",
      syntax: "pause (tamdung)",
      description: "Tạm dừng phát phương tiện",
      category: "Media",
      execute: async () => {
        await invoke("media_pause");
        return "Đã tạm dừng phát phương tiện";
      },
    });

    this.register({
      id: "next",
      name: "Bài tiếp theo",
      syntax: "next (baitiep)",
      description: "Chuyển sang bài nhạc tiếp theo",
      category: "Media",
      execute: async () => {
        await invoke("media_next");
        return "Đã chuyển bài tiếp theo";
      },
    });

    this.register({
      id: "prev",
      name: "Bài trước",
      syntax: "prev (baitruoc)",
      description: "Quay lại bài nhạc phía trước",
      category: "Media",
      execute: async () => {
        await invoke("media_previous");
        return "Đã chuyển bài phía trước";
      },
    });

    // System inspection commands
    this.register({
      id: "cpu",
      name: "Xem tải CPU",
      syntax: "cpu",
      description: "Kiểm tra mức sử dụng CPU thời gian thực",
      category: "System",
      execute: () => {
        useIslandStore.getState().setIslandState("CONTROL_CENTER");
        const cpu = useIslandStore.getState().system.cpuUsage;
        return `Mức tải CPU: ${cpu}%`;
      },
    });

    this.register({
      id: "ram",
      name: "Xem bộ nhớ RAM",
      syntax: "ram",
      description: "Kiểm tra dung lượng bộ nhớ RAM đã sử dụng",
      category: "System",
      execute: () => {
        useIslandStore.getState().setIslandState("CONTROL_CENTER");
        const ram = useIslandStore.getState().system.ramUsage;
        return `Mức sử dụng RAM: ${ram}%`;
      },
    });

    this.register({
      id: "battery",
      name: "Kiểm tra Pin",
      syntax: "battery (pin)",
      description: "Xem trạng thái sạc và mức pin còn lại",
      category: "System",
      execute: () => {
        useIslandStore.getState().setIslandState("CONTROL_CENTER");
        const bat = useIslandStore.getState().battery;
        return `Pin: ${bat.percentage}% (${bat.charging ? "Đang sạc" : "Dùng pin"})`;
      },
    });

    this.register({
      id: "network",
      name: "Kiểm tra Mạng",
      syntax: "network (mang)",
      description: "Xem tốc độ mạng tải lên và tải xuống",
      category: "System",
      execute: () => {
        useIslandStore.getState().setIslandState("CONTROL_CENTER");
        const net = useIslandStore.getState().network;
        return `Mạng: ${net.connected ? (net.isWifi ? "Wi-Fi" : "Mạng dây") : "Ngắt kết nối"}`;
      },
    });

    // Screenshot command
    this.register({
      id: "screenshot",
      name: "Chụp ảnh màn hình",
      syntax: "screenshot (chupanh)",
      description: "Khởi động công cụ Snipping Tool của Windows",
      category: "Utility",
      execute: async () => {
        await invoke("trigger_snipping_tool");
        return "Đã mở công cụ Snipping Tool";
      },
    });

    // Navigation and Settings
    this.register({
      id: "settings",
      name: "Cài đặt BousLand",
      syntax: "settings (caidat)",
      description: "Mở bảng tùy chọn cài đặt hệ thống",
      category: "Navigation",
      execute: () => {
        useIslandStore.getState().setIslandState("SETTINGS");
        return "Đã mở Cài đặt BousLand";
      },
    });

    this.register({
      id: "control-center",
      name: "Trung tâm điều khiển",
      syntax: "control center (trungtam)",
      description: "Mở Trung tâm điều khiển toàn diện",
      category: "Navigation",
      execute: () => {
        useIslandStore.getState().setIslandState("CONTROL_CENTER");
        return "Đã mở Trung tâm điều khiển";
      },
    });

    this.register({
      id: "clipboard",
      name: "Lịch sử Khay nhớ tạm",
      syntax: "clipboard (clip / lichsu)",
      description: "Xem và sao chép lại lịch sử clipboard",
      category: "Utility",
      execute: () => {
        useIslandStore.getState().setIslandState("CLIPBOARD_HISTORY");
        return "Đã mở Lịch sử khay nhớ tạm";
      },
    });

    this.register({
      id: "shelf",
      name: "Trạm tệp nhanh Quick Shelf",
      syntax: "shelf (teptam / quickshelf)",
      description: "Xem các tệp ghim tạm trên Quick Shelf",
      category: "Utility",
      execute: () => {
        useIslandStore.getState().setIslandState("QUICK_SHELF");
        return "Đã mở Quick Shelf";
      },
    });

    this.register({
      id: "scratchpad",
      name: "Ghi chú & Checklist",
      syntax: "scratchpad (todo / note / ghichu)",
      description: "Mở ghi chú mini và việc cần làm ghim đảo",
      category: "Utility",
      execute: () => {
        useIslandStore.getState().setIslandState("SCRATCHPAD");
        return "Đã mở Ghi chú & Checklist";
      },
    });

    this.register({
      id: "hide",
      name: "Ẩn Island",
      syntax: "hide (an)",
      description: "Ẩn Island lên mép trên màn hình",
      category: "Navigation",
      execute: () => {
        useIslandStore.getState().toggleVisibility();
        return "Đã ẩn Island";
      },
    });

    this.register({
      id: "theme",
      name: "Đổi chủ đề / phong cách",
      syntax: "theme <dark | glass | mica | titanium> (chude)",
      description: "Chuyển phong cách giao diện: Kính mờ trong suốt, Đen tối giản, Mica Windows 11, Titanium Slate",
      category: "Utility",
      execute: async (args) => {
        const themeInput = (args[0] || "").toLowerCase().trim();
        const valid = ["dark", "glass", "mica", "titanium"];
        if (!valid.includes(themeInput)) {
          return `Chủ đề không hợp lệ. Hãy chọn: ${valid.join(", ")}`;
        }
        await useSettingsStore.getState().setTheme(themeInput);
        return `Đã áp dụng chủ đề: ${themeInput.toUpperCase()}`;
      },
    });

    this.register({
      id: "color",
      name: "Đổi màu nhấn (Accent Color)",
      syntax: "color <system | white | blue | emerald | violet | amber | rose | hex> (mausac)",
      description: "Thay đổi màu nhấn phong cách cho thanh điều khiển và giao diện",
      category: "Utility",
      execute: async (args) => {
        const input = (args[0] || "").toLowerCase().trim();
        const colorMap: Record<string, string> = {
          system: "system",
          windows: "system",
          hethong: "system",
          white: "#FFFFFF",
          trang: "#FFFFFF",
          trangden: "#FFFFFF",
          silver: "#FFFFFF",
          bac: "#FFFFFF",
          blue: "#38bdf8",
          xanh: "#38bdf8",
          emerald: "#34d399",
          luc: "#34d399",
          violet: "#a78bfa",
          tim: "#a78bfa",
          amber: "#f59e0b",
          cam: "#f59e0b",
          rose: "#fb7185",
          hong: "#fb7185",
        };
        const hex = colorMap[input] || (input.startsWith("#") ? input : null);
        if (!hex) {
          return "Màu không hợp lệ. Ví dụ: color system, color white, color blue, color #38bdf8";
        }
        await useSettingsStore.getState().setAccentColor(hex);
        return `Đã đổi màu nhấn sang: ${hex}`;
      },
    });

    // Quick App & Web Launcher commands
    this.register({
      id: "yt",
      name: "Mở YouTube",
      syntax: "yt (youtube)",
      description: "Mở YouTube trên trình duyệt web mặc định",
      category: "Launcher",
      execute: async () => {
        await invoke("quick_launch", { target: "https://youtube.com" });
        return "Đang mở YouTube...";
      },
    });

    this.register({
      id: "google",
      name: "Tìm kiếm Google",
      syntax: "gg (google / timkiem)",
      description: "Mở công cụ tìm kiếm Google",
      category: "Launcher",
      execute: async () => {
        await invoke("quick_launch", { target: "https://google.com" });
        return "Đang mở Google...";
      },
    });

    this.register({
      id: "chatgpt",
      name: "Mở ChatGPT",
      syntax: "chat (gpt / ai)",
      description: "Mở trợ lý trí tuệ nhân tạo ChatGPT",
      category: "Launcher",
      execute: async () => {
        await invoke("quick_launch", { target: "https://chatgpt.com" });
        return "Đang mở ChatGPT...";
      },
    });

    this.register({
      id: "github",
      name: "Mở GitHub",
      syntax: "gh (github / git)",
      description: "Mở trang quản lý mã nguồn GitHub",
      category: "Launcher",
      execute: async () => {
        await invoke("quick_launch", { target: "https://github.com" });
        return "Đang mở GitHub...";
      },
    });

    this.register({
      id: "facebook",
      name: "Mở Facebook",
      syntax: "fb (facebook)",
      description: "Mở mạng xã hội Facebook",
      category: "Launcher",
      execute: async () => {
        await invoke("quick_launch", { target: "https://facebook.com" });
        return "Đang mở Facebook...";
      },
    });

    this.register({
      id: "calc",
      name: "Mở Máy tính Windows",
      syntax: "calc (maytinh)",
      description: "Mở ứng dụng Calculator",
      category: "Launcher",
      execute: async () => {
        await invoke("quick_launch", { target: "calc" });
        return "Đang mở Máy tính...";
      },
    });

    this.register({
      id: "notepad",
      name: "Mở Notepad",
      syntax: "notepad (soanthao / txt)",
      description: "Mở trình soạn thảo văn bản Windows Notepad",
      category: "Launcher",
      execute: async () => {
        await invoke("quick_launch", { target: "notepad" });
        return "Đang mở Notepad...";
      },
    });

    this.register({
      id: "terminal",
      name: "Mở Windows Terminal",
      syntax: "wt (terminal / cmd)",
      description: "Mở cửa sổ dòng lệnh Terminal",
      category: "Launcher",
      execute: async () => {
        await invoke("quick_launch", { target: "wt" });
        return "Đang mở Terminal...";
      },
    });

    this.register({
      id: "code",
      name: "Mở Visual Studio Code",
      syntax: "code (vscode)",
      description: "Mở trình biên soạn mã VS Code",
      category: "Launcher",
      execute: async () => {
        await invoke("quick_launch", { target: "code" });
        return "Đang mở VS Code...";
      },
    });

    this.register({
      id: "taskmgr",
      name: "Mở Task Manager",
      syntax: "taskmgr (tacvu)",
      description: "Mở Trình quản lý tác vụ Task Manager",
      category: "Launcher",
      execute: async () => {
        await invoke("quick_launch", { target: "taskmgr" });
        return "Đang mở Task Manager...";
      },
    });

    this.register({
      id: "explorer",
      name: "Mở File Explorer",
      syntax: "explorer (teptin / thumuc)",
      description: "Mở Trình duyệt tệp tin Windows",
      category: "Launcher",
      execute: async () => {
        await invoke("quick_launch", { target: "explorer" });
        return "Đang mở File Explorer...";
      },
    });

    this.register({
      id: "open",
      name: "Mở liên kết hoặc ứng dụng",
      syntax: "open <url hoặc app>",
      description: "Mở bất kỳ website hoặc ứng dụng Windows nào",
      category: "Launcher",
      execute: async (args) => {
        const target = args.join(" ").trim();
        if (!target) return "Vui lòng nhập đường dẫn hoặc tên ứng dụng";
        await invoke("quick_launch", { target });
        return `Đang mở ${target}...`;
      },
    });

    this.register({
      id: "collapse",
      name: "Thu gọn Island",
      syntax: "collapse (thugon)",
      description: "Thu nhỏ về dạng đảo thu gọn",
      category: "Navigation",
      execute: () => {
        useIslandStore.getState().collapse();
        return "Đã thu gọn Island";
      },
    });
  }
}

export const commandRegistry = new CommandRegistry();
