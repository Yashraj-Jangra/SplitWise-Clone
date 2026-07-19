import { EventEmitter } from 'events';

// A simple error event emitter for global application error handling
export const errorEmitter = new EventEmitter();
