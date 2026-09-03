import type { ChatMessage } from '@/types/ai';

const AI_BASE_URL = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'minimax/minimax-m3:free';
const AI_VISION_MODEL = process.env.AI_VISION_MODEL || 'minimax/minimax-m3:free';
const AI_EMBEDDING_MODEL = process.env.AI_EMBEDDING_MODEL || 'nvidia/llama-nemotron-embed-vl-1b-v2:free';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231';

export class AIClientError extends Error {
  constructor(message: string, public status?: number, public details?: any) {
    super(message);
    this.name = 'AIClientError';
  }
}

function getBaseUrl(): string {
  return process.env.AI_BASE_URL || AI_BASE_URL;
}

function getHeaders(): HeadersInit {
  const apiKey = process.env.AI_API_KEY || AI_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || APP_URL;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': appUrl,
    'X-Title': 'SplitIt Financial Intelligence',
  };
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 1): Promise<Response> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;

      // If rate limited or server overloaded and we have retries left, wait and retry
      if ((res.status === 429 || res.status === 503 || res.status === 502) && attempt < maxRetries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 1200 * attempt));
        continue;
      }

      const errorBody = await res.text().catch(() => '');
      throw new AIClientError(
        `AI API request failed with status ${res.status}: ${errorBody.slice(0, 300)}`,
        res.status,
        errorBody
      );
    } catch (err: any) {
      if (attempt < maxRetries && err.name !== 'AIClientError') {
        attempt++;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      throw err instanceof AIClientError ? err : new AIClientError(err.message || 'Network error connecting to AI provider');
    }
  }
  throw new AIClientError('AI request exceeded maximum retry attempts');
}

/**
 * Standard Chat Completion (Non-streaming)
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: 'json_object' };
  }
): Promise<string> {
  const model = options?.model || AI_CHAT_MODEL;
  const payload: Record<string, any> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.max_tokens ?? 1024,
  };

  if (options?.response_format) {
    payload.response_format = options.response_format;
  }

  const res = await fetchWithRetry(`${getBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  const choice = data?.choices?.[0]?.message?.content;
  if (typeof choice !== 'string') {
    throw new AIClientError('Invalid response format from AI completion endpoint', 500, data);
  }
  return choice.trim();
}

/**
 * Streaming Chat Completion Generator (Server-Side Events / Readable stream)
 */
export async function* streamCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }
): AsyncGenerator<string, void, unknown> {
  const model = options?.model || AI_CHAT_MODEL;
  const payload = {
    model,
    messages,
    temperature: options?.temperature ?? 0.4,
    max_tokens: options?.max_tokens ?? 1500,
    stream: true,
  };

  const res = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new AIClientError(`Stream request failed (${res.status}): ${errorBody}`, res.status);
  }

  if (!res.body) {
    throw new AIClientError('No response body received for stream', 500);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') return;

        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const token = parsed?.choices?.[0]?.delta?.content;
            if (token) {
              yield token;
            }
          } catch {
            // Partial JSON chunk, ignore and continue
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Multimodal Vision Completion (Receipt OCR)
 */
export async function visionCompletion(
  imageUrl: string,
  prompt: string,
  options?: { model?: string }
): Promise<string> {
  const model = options?.model || AI_VISION_MODEL;

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
        },
      ],
    },
  ];

  const res = await fetchWithRetry(`${getBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1, // Strict temperature for structured OCR extraction
      max_tokens: 1024,
    }),
  });

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new AIClientError('Empty response from vision endpoint', 500, data);
  }
  return typeof content === 'string' ? content.trim() : JSON.stringify(content);
}

/**
 * Generate 2048-dimension float vector embedding using the configured embedding model
 */
export async function generateEmbedding(
  text: string,
  options?: { model?: string }
): Promise<number[]> {
  const model = options?.model || AI_EMBEDDING_MODEL;

  const res = await fetchWithRetry(`${getBaseUrl()}/embeddings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model,
      input: text.slice(0, 1000), // Protect token boundaries
    }),
  });

  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new AIClientError('Invalid vector embedding received from embedding API', 500, data);
  }
  return embedding;
}
