import { processEntityEmbedding } from './indexing.service';

/**
 * Helper to trigger background embedding generation asynchronously in-process.
 * Non-blocking for all write paths with graceful logging on error.
 */
export function queueVectorEmbedding(
  id: string,
  groupId: string,
  entityType: 'expense' | 'settlement' | 'group',
  action: 'upsert' | 'delete' = 'upsert'
): void {
  if (process.env.AI_EMBEDDING_QUEUE_ENABLED === 'false') return;

  // Non-blocking in-process background task
  Promise.resolve()
    .then(() => processEntityEmbedding(id, groupId, entityType, action))
    .catch((err) => {
      console.warn(`[AI Embed Queue] Notice: Background embedding task error:`, err.message || err);
    });
}

