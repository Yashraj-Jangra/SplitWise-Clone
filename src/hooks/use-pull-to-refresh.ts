'use client';

import { useRef, useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  /** Pixels of pull needed to trigger a refresh. Default: 80 */
  threshold?: number;
  /** Called when the pull threshold is reached and the user releases */
  onRefresh: () => Promise<void> | void;
}

interface PullToRefreshState {
  /** 0-1 pull progress (clamped) */
  progress: number;
  /** true while the refresh callback is running */
  isRefreshing: boolean;
}

export function usePullToRefresh({ threshold = 80, onRefresh }: UsePullToRefreshOptions) {
  const startYRef = useRef<number | null>(null);
  const [state, setState] = useState<PullToRefreshState>({ progress: 0, isRefreshing: false });
  const isRefreshingRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start tracking if scrolled to the very top
    const el = (e.currentTarget as HTMLElement);
    if (window.scrollY > 0 || el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null || isRefreshingRef.current) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy <= 0) {
      startYRef.current = null;
      setState(s => ({ ...s, progress: 0 }));
      return;
    }
    // Rubber-band: slow down pull as it goes further
    const progress = Math.min(dy / threshold, 1);
    setState(s => ({ ...s, progress }));
  }, [threshold]);

  const onTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return;
    const progress = state.progress;
    startYRef.current = null;

    if (progress >= 1 && !isRefreshingRef.current) {
      isRefreshingRef.current = true;
      setState({ progress: 1, isRefreshing: true });
      try {
        await onRefresh();
      } finally {
        isRefreshingRef.current = false;
        setState({ progress: 0, isRefreshing: false });
      }
    } else {
      setState({ progress: 0, isRefreshing: false });
    }
  }, [state.progress, onRefresh]);

  return {
    state,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
