export type IslandState =
  | "COMPACT"
  | "EXPANDED"
  | "CONTROL_CENTER"
  | "COMMAND_BAR"
  | "SETTINGS"
  | "CLIPBOARD_HISTORY"
  | "QUICK_SHELF"
  | "SCRATCHPAD";

export type EventPriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";

export interface BaseEvent {
  id: string;
  timestamp: number;
  priority: EventPriority;
}

export interface VolumeChangedEvent extends BaseEvent {
  type: "VOLUME_CHANGED";
  priority: "HIGH";
  volume: number; // 0 - 100
  muted: boolean;
}

export interface BatteryChangedEvent extends BaseEvent {
  type: "BATTERY_CHANGED";
  priority: "HIGH" | "CRITICAL";
  percentage: number;
  charging: boolean;
  pluggedIn: boolean;
}

export interface MediaChangedEvent extends BaseEvent {
  type: "MEDIA_CHANGED";
  priority: "NORMAL";
  title: string;
  artist: string;
  album?: string;
  artwork?: string | null;
  isPlaying: boolean;
  position?: number;
  duration?: number;
}

export interface NetworkChangedEvent extends BaseEvent {
  type: "NETWORK_CHANGED";
  priority: "LOW";
  connected: boolean;
  isWifi: boolean;
  uploadSpeed: number; // Bytes/sec
  downloadSpeed: number; // Bytes/sec
}

export interface SystemMetricsEvent extends BaseEvent {
  type: "SYSTEM_METRICS";
  priority: "LOW";
  cpuUsage: number;
  ramUsage: number;
  ramUsedMb: number;
  ramTotalMb: number;
  diskUsage: number;
}

export interface ScreenshotEvent extends BaseEvent {
  type: "SCREENSHOT_CAPTURED";
  priority: "HIGH";
  filePath: string;
  thumbnail?: string;
}

export interface ClipboardEvent extends BaseEvent {
  type: "CLIPBOARD_CHANGED";
  priority: "NORMAL";
  textPreview?: string;
  hasContent: boolean;
}

export interface BluetoothEvent extends BaseEvent {
  type: "BLUETOOTH_CHANGED";
  priority: "HIGH";
  deviceName: string;
  connected: boolean;
}

export interface SystemAlertEvent extends BaseEvent {
  type: "SYSTEM_ALERT";
  priority: "HIGH" | "CRITICAL";
  metricType: "cpu" | "ram";
  value: number;
  title: string;
  message: string;
}

export type BousEvent =
  | VolumeChangedEvent
  | BatteryChangedEvent
  | MediaChangedEvent
  | NetworkChangedEvent
  | SystemMetricsEvent
  | ScreenshotEvent
  | ClipboardEvent
  | BluetoothEvent
  | SystemAlertEvent;
