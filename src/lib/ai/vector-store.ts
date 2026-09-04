import { executeOracleQuery } from '@/lib/nosql';
import type { VectorRecord } from '@/types/ai';

/**
 * Insert or update a vector record in Oracle 23ai SPLITITVECTORS table
 */
export async function upsertVector(record: VectorRecord): Promise<void> {
  if (!record.id || !record.userId || !record.embedding || record.embedding.length === 0) {
    throw new Error('Invalid vector record for upsert');
  }

  const embeddingVec = new Float32Array(record.embedding);

  const sql = `
    MERGE INTO SPLITITVECTORS dst
    USING (SELECT :id AS id FROM dual) src
    ON (dst.id = src.id)
    WHEN MATCHED THEN
      UPDATE SET 
        dst.userId = :userId,
        dst.groupId = :groupId,
        dst.entityType = :entityType,
        dst.textChunk = :textChunk,
        dst.embedding = :embedding,
        dst.updatedAt = CURRENT_TIMESTAMP
    WHEN NOT MATCHED THEN
      INSERT (id, userId, groupId, entityType, textChunk, embedding)
      VALUES (:id, :userId, :groupId, :entityType, :textChunk, :embedding)
  `;

  await executeOracleQuery(sql, {
    id: record.id,
    userId: record.userId,
    groupId: record.groupId || null,
    entityType: record.entityType,
    textChunk: record.textChunk.slice(0, 4000),
    embedding: embeddingVec,
  });
}

/**
 * Delete a specific vector record by its ID
 */
export async function deleteVector(id: string): Promise<void> {
  await executeOracleQuery(`DELETE FROM SPLITITVECTORS WHERE id = :id`, { id });
}

/**
 * Delete all vector records belonging to a specific group
 */
export async function deleteVectorsByGroup(groupId: string): Promise<void> {
  await executeOracleQuery(`DELETE FROM SPLITITVECTORS WHERE groupId = :groupId`, { groupId });
}

/**
 * Delete all vector records belonging to a user
 */
export async function deleteVectorsByUser(userId: string): Promise<void> {
  await executeOracleQuery(`DELETE FROM SPLITITVECTORS WHERE userId = :userId`, { userId });
}
