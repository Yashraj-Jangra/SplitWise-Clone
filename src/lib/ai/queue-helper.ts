/**
 * Helper to trigger background embedding generation asynchronously
 */
export function queueVectorEmbedding(
  id: string,
  groupId: string,
  entityType: 'expense' | 'settlement' | 'group',
  action: 'upsert' | 'delete' = 'upsert'
): void {
  if (process.env.AI_EMBEDDING_QUEUE_ENABLED === 'false') return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231';
  const secret = process.env.INTERNAL_API_SECRET || '';

  // Fire and forget, completely non-blocking for write paths
  fetch(`${appUrl}/api/ai/embed-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secret}`,
    },
    body: JSON.stringify({ id, groupId, entityType, action }),
  }).catch((err) => {
    // Non-fatal background error
    console.warn(`[AI Embed Queue] Notice: Background embedding task deferred:`, err.message || err);
  });
}
