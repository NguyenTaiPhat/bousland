import { describe, it, expect, vi } from "vitest";
import { PriorityManager } from "../core/priorityManager";
import { VolumeChangedEvent, BatteryChangedEvent, MediaChangedEvent } from "../core/types";

describe("PriorityManager", () => {
  it("displays an incoming event when idle", () => {
    const onDisplay = vi.fn();
    const onCollapse = vi.fn();
    const manager = new PriorityManager(onDisplay, onCollapse);

    const event: VolumeChangedEvent = {
      id: "1",
      timestamp: Date.now(),
      type: "VOLUME_CHANGED",
      priority: "HIGH",
      volume: 60,
      muted: false,
    };

    const handled = manager.processEvent(event);
    expect(handled).toBe(true);
    expect(onDisplay).toHaveBeenCalledWith(event);
    expect(manager.getCurrentEvent()).toEqual(event);
  });

  it("updates in-place for rapid updates of same event type", () => {
    const onDisplay = vi.fn();
    const onCollapse = vi.fn();
    const manager = new PriorityManager(onDisplay, onCollapse);

    const event1: VolumeChangedEvent = {
      id: "1",
      timestamp: Date.now(),
      type: "VOLUME_CHANGED",
      priority: "HIGH",
      volume: 50,
      muted: false,
    };

    const event2: VolumeChangedEvent = {
      id: "2",
      timestamp: Date.now() + 10,
      type: "VOLUME_CHANGED",
      priority: "HIGH",
      volume: 75,
      muted: false,
    };

    manager.processEvent(event1);
    expect(onDisplay).toHaveBeenCalledWith(event1);

    manager.processEvent(event2);
    expect(onDisplay).toHaveBeenCalledWith(event2);
    expect((manager.getCurrentEvent() as VolumeChangedEvent)?.volume).toBe(75);
  });

  it("allows higher priority to preempt lower priority", () => {
    const onDisplay = vi.fn();
    const onCollapse = vi.fn();
    const manager = new PriorityManager(onDisplay, onCollapse);

    const mediaEvent: MediaChangedEvent = {
      id: "1",
      timestamp: Date.now(),
      type: "MEDIA_CHANGED",
      priority: "NORMAL",
      title: "Song",
      artist: "Artist",
      isPlaying: true,
    };

    const batteryEvent: BatteryChangedEvent = {
      id: "2",
      timestamp: Date.now(),
      type: "BATTERY_CHANGED",
      priority: "CRITICAL",
      percentage: 5,
      charging: false,
      pluggedIn: false,
    };

    manager.processEvent(mediaEvent);
    expect(manager.getCurrentEvent()?.type).toBe("MEDIA_CHANGED");

    // Critical battery preempts normal media
    const handled = manager.processEvent(batteryEvent);
    expect(handled).toBe(true);
    expect(manager.getCurrentEvent()?.type).toBe("BATTERY_CHANGED");
  });

  it("rejects lower priority when higher priority is active", () => {
    const onDisplay = vi.fn();
    const onCollapse = vi.fn();
    const manager = new PriorityManager(onDisplay, onCollapse);

    const batteryEvent: BatteryChangedEvent = {
      id: "1",
      timestamp: Date.now(),
      type: "BATTERY_CHANGED",
      priority: "CRITICAL",
      percentage: 5,
      charging: false,
      pluggedIn: false,
    };

    const mediaEvent: MediaChangedEvent = {
      id: "2",
      timestamp: Date.now(),
      type: "MEDIA_CHANGED",
      priority: "NORMAL",
      title: "Song",
      artist: "Artist",
      isPlaying: true,
    };

    manager.processEvent(batteryEvent);
    const handled = manager.processEvent(mediaEvent);

    expect(handled).toBe(false);
    expect(manager.getCurrentEvent()?.type).toBe("BATTERY_CHANGED");
  });
});
