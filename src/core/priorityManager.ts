import { BousEvent, EventPriority } from "./types";

const PRIORITY_WEIGHTS: Record<EventPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};

const DEFAULT_DURATIONS: Record<string, number> = {
  VOLUME_CHANGED: 2000,
  BATTERY_CHANGED: 3000,
  MEDIA_CHANGED: 3500,
  SCREENSHOT_CAPTURED: 4500,
  CLIPBOARD_CHANGED: 2500,
  BLUETOOTH_CHANGED: 3000,
  SYSTEM_METRICS: 0, // Does not expand island automatically
  NETWORK_CHANGED: 0,
  SYSTEM_ALERT: 4000,
};

export class PriorityManager {
  private currentEvent: BousEvent | null = null;
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;
  private onDisplayCallback: ((event: BousEvent) => void) | null = null;
  private onCollapseCallback: (() => void) | null = null;

  constructor(
    onDisplay?: (event: BousEvent) => void,
    onCollapse?: () => void
  ) {
    if (onDisplay) this.onDisplayCallback = onDisplay;
    if (onCollapse) this.onCollapseCallback = onCollapse;
  }

  public setCallbacks(
    onDisplay: (event: BousEvent) => void,
    onCollapse: () => void
  ) {
    this.onDisplayCallback = onDisplay;
    this.onCollapseCallback = onCollapse;
  }

  public processEvent(event: BousEvent): boolean {
    const duration = this.getDurationForEvent(event);
    if (duration <= 0) {
      // Background-only event (e.g. periodic system metrics), no island expansion needed
      return false;
    }

    if (!this.currentEvent) {
      // No active event, display immediately
      this.display(event, duration);
      return true;
    }

    // Check if this is the SAME event type updating in real-time (e.g. Volume scrolling)
    if (this.currentEvent.type === event.type) {
      // In-place update: reset collapse timer, notify display without restarting layout animation
      this.currentEvent = event;
      this.resetTimer(duration);
      if (this.onDisplayCallback) {
        this.onDisplayCallback(event);
      }
      return true;
    }

    // Check priority preemption
    const currentWeight = PRIORITY_WEIGHTS[this.currentEvent.priority];
    const incomingWeight = PRIORITY_WEIGHTS[event.priority];

    if (incomingWeight >= currentWeight) {
      // Preempt current event
      this.display(event, duration);
      return true;
    }

    // Lower priority event while a higher priority event is displaying: ignored
    return false;
  }

  private display(event: BousEvent, duration: number): void {
    this.currentEvent = event;
    if (this.onDisplayCallback) {
      this.onDisplayCallback(event);
    }
    this.resetTimer(duration);
  }

  private resetTimer(duration: number): void {
    if (this.collapseTimer) {
      clearTimeout(this.collapseTimer);
    }
    this.collapseTimer = setTimeout(() => {
      this.currentEvent = null;
      if (this.onCollapseCallback) {
        this.onCollapseCallback();
      }
    }, duration);
  }

  public forceCollapse(): void {
    if (this.collapseTimer) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
    this.currentEvent = null;
    if (this.onCollapseCallback) {
      this.onCollapseCallback();
    }
  }

  public getCurrentEvent(): BousEvent | null {
    return this.currentEvent;
  }

  private getDurationForEvent(event: BousEvent): number {
    if (event.type === "BATTERY_CHANGED" && event.priority === "CRITICAL") {
      return 5000;
    }
    return DEFAULT_DURATIONS[event.type] ?? 2500;
  }
}
