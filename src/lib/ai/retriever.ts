import { executeOracleQuery } from '@/lib/nosql';
import type { RetrievedChunk } from '@/types/ai';

const DEFAULT_TOP_K = parseInt(process.env.AI_VECTOR_TOP_K || '10', 10);
const DEFAULT_MIN_SIMILARITY = parseFloat(process.env.AI_VECTOR_MIN_SIMILARITY || '0.25');

interface RetrieveOptions {
  groupId?: string;
  entityType?: string;
  textFilter?: string;
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

  // Fetch candidate nearest neighbors based on semantic vector distance
  sql += `
    ORDER BY distance ASC
    FETCH FIRST ${Math.max(1, topK * 3)} ROWS ONLY
  `;

  const rows = await executeOracleQuery<{
    ID: string;
    ENTITYTYPE: string;
    TEXTCHUNK: string;
    DISTANCE: number;
  }>(sql, params);

  const results: RetrievedChunk[] = [];
  const normalizedFilter = opts?.textFilter ? opts.textFilter.toLowerCase().trim() : '';

  for (const row of rows) {
    const distance = typeof row.DISTANCE === 'number' ? row.DISTANCE : parseFloat(String(row.DISTANCE));
    // Cosine similarity = 1 - cosine distance
    let similarity = 1 - distance;

    // Soft keyword boost if text matches keyword without hard-filtering out semantic matches
    if (normalizedFilter && row.TEXTCHUNK.toLowerCase().includes(normalizedFilter)) {
      similarity = Math.min(1.0, similarity + 0.05);
    }

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

  // Ensure top results are ordered by final similarity score
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}
