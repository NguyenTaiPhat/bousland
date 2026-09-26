import { BousEvent } from "./types";

type EventListener<T extends BousEvent = BousEvent> = (event: T) => void;

class EventBus {
  private listeners: Map<string, Set<EventListener<any>>> = new Map();
  private allListeners: Set<EventListener> = new Set();

  public subscribe<T extends BousEvent>(
    eventType: T["type"] | "*",
    listener: EventListener<T>
  ): () => void {
    if (eventType === "*") {
      this.allListeners.add(listener as EventListener);
      return () => {
        this.allListeners.delete(listener as EventListener);
      };
    }

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  public publish(event: BousEvent): void {
    // Notify all wildcard listeners
    this.allListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error(`[EventBus] Error in wildcard listener:`, err);
      }
    });

    // Notify type-specific listeners
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error(`[EventBus] Error in listener for ${event.type}:`, err);
        }
      });
    }
  }

  public clear(): void {
    this.listeners.clear();
    this.allListeners.clear();
  }
}

export const eventBus = new EventBus();
