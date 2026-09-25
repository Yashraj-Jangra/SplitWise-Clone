import { NextResponse } from 'next/server';
import { processEntityEmbedding } from '@/lib/ai/indexing.service';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || '';

export async function POST(request: Request) {
  try {
    // Protect queue from unauthorized public triggers if a secret is configured
    if (INTERNAL_API_SECRET) {
      const authHeader = request.headers.get('Authorization') || request.headers.get('x-internal-secret');
      const token = authHeader?.replace(/^Bearer\s+/i, '');
      if (token !== INTERNAL_API_SECRET) {
        return NextResponse.json({ error: 'Unauthorized internal trigger' }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const { id, groupId, entityType, action = 'upsert' } = body;

    const result = await processEntityEmbedding(id, groupId, entityType, action);
    if (!result.success && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Embed queue error:', error);
    return NextResponse.json({ error: error.message || 'Queue error' }, { status: 500 });
  }
}

