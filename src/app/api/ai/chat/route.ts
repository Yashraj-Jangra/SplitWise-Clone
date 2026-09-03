import { auth } from '@/lib/auth.server';
import { embed } from '@/lib/ai/embedder';
import { retrieveSimilar } from '@/lib/ai/retriever';
import { buildContextBlock } from '@/lib/ai/context-builder';
import { streamCompletion } from '@/lib/ai/client';
import type { ChatMessage } from '@/types/ai';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json().catch(() => ({}));
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const history: ChatMessage[] = Array.isArray(body?.history) ? body.history.slice(-6) : [];
    const groupId = typeof body?.groupId === 'string' ? body.groupId : undefined;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message cannot be empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Generate query embedding
    let contextBlock = 'No relevant prior financial records found.';
    try {
      const queryVector = await embed(message);
      // 2. Vector search against user's partition in Oracle 23ai
      const chunks = await retrieveSimilar(queryVector, session.user.id, {
        groupId,
        topK: 6,
      });
      if (chunks.length > 0) {
        contextBlock = buildContextBlock(chunks);
      }
    } catch (retrievalErr: any) {
      console.warn('[RAG Chat] Vector retrieval note:', retrievalErr.message || retrievalErr);
    }

    // 3. Construct system prompt
    const systemPrompt = `You are SplitIt AI, the intelligent financial assistant for the SplitIt group expense-sharing app.
You help users understand their spending, debts, group finances, and balances using their actual verified records.

RELEVANT FINANCIAL RECORDS (from user's database):
${contextBlock}

ACTIVE USER:
- Name: ${session.user.name || 'Member'}
- User ID: ${session.user.id}
${groupId ? `- Scoped to Group: ${groupId}` : '- Global account view'}

GUIDELINES:
1. Ground your answers directly in the retrieved records above whenever specific amounts, dates, or members are mentioned.
2. Format all financial figures in Indian Rupees (e.g. ₹500, ₹1,200.50).
3. If asked who owes whom, summarize clearly with member names and net directions.
4. If the retrieved records do not have enough detail to answer a specific question, answer honestly based on what is available and offer helpful general guidance.
5. Keep your response concise, well-structured with markdown bullets, and easy to read on mobile.`;

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: m.role,
        content: String(m.content || ''),
      })),
      { role: 'user', content: message },
    ];

    // 4. Stream response via SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const token of streamCompletion(fullMessages)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err: any) {
          const errorMsg = err.message || 'Stream processing error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
