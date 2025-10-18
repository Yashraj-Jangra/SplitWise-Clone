
import { EventEmitter } from 'events';

// This is a simple event emitter that can be used to broadcast errors
// from anywhere in the application to a central listener.
export const errorEmitter = new EventEmitter();
