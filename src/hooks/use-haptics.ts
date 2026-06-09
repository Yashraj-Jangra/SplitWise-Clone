'use client';

/**
 * useHaptics — wraps navigator.vibrate() with named presets.
 *
 * Presets (differentiated by action type):
 *  light   → 10ms   — nav taps, accordion opens, checkbox toggles
 *  medium  → 30ms   — FAB press, form submit, confirmations
 *  heavy   → 60ms   — success settlement, strong confirmation
 *  error   → [80, 60, 80]  — validation failure, destructive error
 *  success → [20, 30, 20]  — data saved, settlement confirmed
 *  warning → [40, 50, 40]  — irreversible action about to happen
 *
 * Automatically no-ops when:
 *  - The browser doesn't support navigator.vibrate
 *  - The user has prefers-reduced-motion enabled
 */

type HapticPreset = 'light' | 'medium' | 'heavy' | 'error' | 'success' | 'warning';

const PATTERNS: Record<HapticPreset, number | number[]> = {
  light:   10,
  medium:  30,
  heavy:   60,
  error:   [80, 60, 80],
  success: [20, 30, 20],
  warning: [40, 50, 40],
};

function canVibrate(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!('vibrate' in navigator)) return false;
  // Respect the user's reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

export function useHaptics() {
  const trigger = (preset: HapticPreset = 'light') => {
    if (!canVibrate()) return;
    try {
      navigator.vibrate(PATTERNS[preset]);
    } catch {
      // Some browsers throw if vibrate is called in a hidden tab — ignore
    }
  };

  return {
    light:   () => trigger('light'),
    medium:  () => trigger('medium'),
    heavy:   () => trigger('heavy'),
    error:   () => trigger('error'),
    success: () => trigger('success'),
    warning: () => trigger('warning'),
    trigger,
  };
}
