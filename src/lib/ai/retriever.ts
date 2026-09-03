import { executeOracleQuery } from '@/lib/nosql';
import type { RetrievedChunk } from '@/types/ai';

const DEFAULT_TOP_K = parseInt(process.env.AI_VECTOR_TOP_K || '6', 10);
const DEFAULT_MIN_SIMILARITY = parseFloat(process.env.AI_VECTOR_MIN_SIMILARITY || '0.55');

interface RetrieveOptions {
  groupId?: string;
  entityType?: string;
  topK?: number;
  minSimilarity?: number;
}

export async function retrieveSimilar(
  queryEmbedding: number[],
  userId: string,
  opts?: RetrieveOptions
): Promise<RetrievedChunk[]> {
  if (!queryEmbedding || queryEmbedding.length === 0 || !userId) {
    return [];
  }

  const topK = opts?.topK ?? DEFAULT_TOP_K;
  const minSimilarity = opts?.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const embeddingVec = new Float32Array(queryEmbedding);

  let sql = `
    SELECT id, entityType, textChunk,
           VECTOR_DISTANCE(embedding, :vec, COSINE) AS distance
    FROM SPLITITVECTORS
    WHERE userId = :userId
  `;

  const params: Record<string, any> = {
    userId,
    vec: embeddingVec,
  };

  if (opts?.groupId) {
    sql += ` AND groupId = :groupId`;
    params.groupId = opts.groupId;
  }

  if (opts?.entityType) {
    sql += ` AND entityType = :entityType`;
    params.entityType = opts.entityType;
  }

  sql += `
    ORDER BY distance ASC
    FETCH FIRST ${Math.max(1, topK * 2)} ROWS ONLY
  `;

  const rows = await executeOracleQuery<{
    ID: string;
    ENTITYTYPE: string;
    TEXTCHUNK: string;
    DISTANCE: number;
  }>(sql, params);

  const results: RetrievedChunk[] = [];

  for (const row of rows) {
    const distance = typeof row.DISTANCE === 'number' ? row.DISTANCE : parseFloat(String(row.DISTANCE));
    // Cosine similarity = 1 - cosine distance
    const similarity = 1 - distance;

    if (similarity >= minSimilarity) {
      results.push({
        id: row.ID,
        entityType: row.ENTITYTYPE,
        textChunk: row.TEXTCHUNK,
        similarity,
      });
    }

    if (results.length >= topK) break;
  }

  return results;
}
