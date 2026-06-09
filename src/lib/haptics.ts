export function vibrate(pattern: number | number[] = 50) {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors (e.g., policy restrictions)
      console.warn('Vibration failed', e);
    }
  }
}

export const haptic = {
  light: () => vibrate(10),
  medium: () => vibrate(20),
  heavy: () => vibrate(30),
  success: () => vibrate([10, 30, 10]),
  error: () => vibrate([30, 50, 30, 50, 30]),
};
