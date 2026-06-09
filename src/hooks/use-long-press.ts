'use client';

import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  /** Duration (ms) before the long-press fires. Default: 450 */
  threshold?: number;
  /** Called when threshold is reached */
  onLongPress: () => void;
  /** Called on a regular short tap (fires if threshold NOT reached) */
  onTap?: () => void;
}

/**
 * useLongPress — returns event handlers that detect long presses on any element.
 *
 * Usage:
 *   const longPress = useLongPress({ onLongPress: () => openMenu() });
 *   <div {...longPress.handlers}>...</div>
 */
export function useLongPress({
  threshold = 450,
  onLongPress,
  onTap,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const start = useCallback(
    (clientX: number, clientY: number) => {
      firedRef.current = false;
      startPosRef.current = { x: clientX, y: clientY };
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress();
      }, threshold);
    },
    [threshold, onLongPress]
  );

  const cancel = useCallback(
    (clientX?: number, clientY?: number) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // If the finger moved > 10px, treat as scroll — don't fire tap
      if (clientX !== undefined && clientY !== undefined) {
        const dx = Math.abs(clientX - startPosRef.current.x);
        const dy = Math.abs(clientY - startPosRef.current.y);
        if (dx > 10 || dy > 10) return;
      }
      if (!firedRef.current) {
        onTap?.();
      }
    },
    [onTap]
  );

  const handlers = {
    onMouseDown: (e: React.MouseEvent) => start(e.clientX, e.clientY),
    onMouseUp: (e: React.MouseEvent) => cancel(e.clientX, e.clientY),
    onMouseLeave: () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      start(t.clientX, t.clientY);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const t = e.changedTouches[0];
      cancel(t.clientX, t.clientY);
    },
    onTouchMove: (e: React.TouchEvent) => {
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - startPosRef.current.x);
      const dy = Math.abs(t.clientY - startPosRef.current.y);
      // Cancel if scrolling
      if ((dx > 8 || dy > 8) && timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    onContextMenu: (e: React.MouseEvent) => {
      // Prevent the native browser context menu on long press
      e.preventDefault();
    },
  };

  return { handlers };
}
