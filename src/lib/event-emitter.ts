// A simple, shared event emitter for cross-component communication.
// This helps decouple components, particularly for triggering data refetches.

import { clearClientFetchCache } from './api.client';

type Listener = (...args: any[]) => void;

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

  emit(event: string, ...args: any[]): void {
    if (event === 'data-changed') {
      clearClientFetchCache();
    }
    if (!this.listeners.has(event)) {
      return;
    }
    this.listeners.get(event)!.forEach((listener) => listener(...args));
  }
}


export const appEventEmitter = new EventEmitter();
