import { generateEmbedding } from './client';

interface CacheEntry {
  embedding: number[];
  expiresAt: number;
}

const embeddingCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1-hour cache
const MAX_CACHE_ENTRIES = 500;

function cleanCacheIfFull() {
  if (embeddingCache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [key, val] of embeddingCache.entries()) {
      if (val.expiresAt < now) {
        embeddingCache.delete(key);
      }
    }
    // If still full, delete oldest 100 entries
    if (embeddingCache.size >= MAX_CACHE_ENTRIES) {
      const keys = Array.from(embeddingCache.keys()).slice(0, 100);
      for (const k of keys) embeddingCache.delete(k);
    }
  }
}

/**
 * Normalizes input text for consistent embedding calculation
 */
export function normalizeEmbeddingText(text: string): string {
  return text
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 768);
}

/**
 * Embed a text string with in-memory caching
 */
export async function embed(text: string): Promise<number[]> {
  const normalized = normalizeEmbeddingText(text);
  if (!normalized) {
    throw new Error('Cannot generate embedding for empty text');
  }

  const cached = embeddingCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.embedding;
  }

  const embedding = await generateEmbedding(normalized);

  cleanCacheIfFull();
  embeddingCache.set(normalized, {
    embedding,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return embedding;
}
