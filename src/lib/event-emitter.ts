// A simple, shared event emitter for cross-component communication.
// This helps decouple components, particularly for triggering data refetches.

type Listener = () => void;

class EventEmitter {
  private listeners: Map<string, Listener[]> = new Map();

  on(event: string, listener: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Listener): void {
    if (!this.listeners.has(event)) {
      return;
    }
    const filteredListeners = this.listeners.get(event)!.filter(
      (l) => l !== listener
    );
    this.listeners.set(event, filteredListeners);
  }

  emit(event: string): void {
    if (!this.listeners.has(event)) {
      return;
    }
    this.listeners.get(event)!.forEach((listener) => listener());
  }
}

export const appEventEmitter = new EventEmitter();
