'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import type { CategorySuggestion } from '@/types/ai';

const clientCache = new Map<string, CategorySuggestion>();

export function useSuggestCategory(description: string, enabled: boolean = true) {
  const debouncedDescription = useDebounce(description, 400);
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = (debouncedDescription || '').trim();

    if (!enabled || trimmed.length < 3) {
      setSuggestion(null);
      setIsLoading(false);
      return;
    }

    // Check local client cache
    const cached = clientCache.get(trimmed.toLowerCase());
    if (cached) {
      setSuggestion(cached);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);

    fetch('/api/ai/suggest-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: trimmed }),
      signal: abortController.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to suggest');
        return res.json();
      })
      .then((data: CategorySuggestion) => {
        if (data?.category && data?.masterCategory) {
          clientCache.set(trimmed.toLowerCase(), data);
          setSuggestion(data);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          // Silent fallback on error
          setSuggestion(null);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, [debouncedDescription, enabled]);

  return { suggestion, isLoading };
}
