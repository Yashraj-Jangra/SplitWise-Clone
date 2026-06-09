'use client';

import React from 'react';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useHaptics } from '@/hooks/use-haptics';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  /** Pixels required to trigger. Default: 80 */
  threshold?: number;
}

/**
 * PullToRefresh — wraps any scrollable content.
 * Pull down from the top to reload data.
 * Shows a spinner indicator that grows with pull progress.
 */
export function PullToRefresh({ onRefresh, children, className, threshold = 80 }: PullToRefreshProps) {
  const haptic = useHaptics();
  const hasFiredHapticRef = React.useRef(false);

  const handleRefresh = React.useCallback(async () => {
    hasFiredHapticRef.current = false;
    await onRefresh();
    haptic.success();
  }, [onRefresh, haptic]);

  const { state, handlers } = usePullToRefresh({ onRefresh: handleRefresh, threshold });

  // Fire a medium haptic exactly when the threshold is reached
  React.useEffect(() => {
    if (state.progress >= 1 && !hasFiredHapticRef.current) {
      hasFiredHapticRef.current = true;
      haptic.medium();
    }
    if (state.progress < 1) {
      hasFiredHapticRef.current = false;
    }
  }, [state.progress, haptic]);

  const indicatorSize = 32;
  const indicatorScale = Math.min(state.progress * 1.2, 1);
  const strokeDashoffset = (1 - state.progress) * (2 * Math.PI * 11); // circumference of r=11

  return (
    <div
      className={cn('relative', className)}
      {...handlers}
    >
      {/* Pull indicator */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-10 transition-all duration-150"
        style={{
          height: `${Math.max(state.progress * 56, state.isRefreshing ? 56 : 0)}px`,
          opacity: state.progress > 0.1 || state.isRefreshing ? 1 : 0,
        }}
      >
        <div
          className="self-center"
          style={{ transform: `scale(${indicatorScale})`, transition: 'transform 0.1s ease' }}
        >
          {state.isRefreshing ? (
            /* Spinning loader when refreshing */
            <svg
              width={indicatorSize}
              height={indicatorSize}
              viewBox="0 0 32 32"
              className="ptr-spinner text-primary"
            >
              <circle
                cx="16" cy="16" r="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="20 50"
              />
            </svg>
          ) : (
            /* Progress arc */
            <svg
              width={indicatorSize}
              height={indicatorSize}
              viewBox="0 0 32 32"
              className="text-primary -rotate-90"
            >
              <circle
                cx="16" cy="16" r="11"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="2.5"
              />
              <circle
                cx="16" cy="16" r="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 11}`}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.05s linear' }}
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content shifted down to make room for indicator */}
      <div
        style={{
          transform: `translateY(${state.isRefreshing ? 56 : state.progress * 56}px)`,
          transition: state.isRefreshing ? 'transform 0.2s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
