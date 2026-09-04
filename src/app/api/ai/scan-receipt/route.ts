import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { visionCompletion } from '@/lib/ai/client';
import { s3, BUCKET } from '@/lib/storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { defaultExpenseCategories } from '@/lib/expense-categories';
import type { ReceiptScanResult } from '@/types/ai';

const CATEGORY_NAMES = Object.keys(defaultExpenseCategories);

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    let finalImageUrl = imageUrl;

    // Handle local storage paths by loading directly from S3/OCI into base64
    if (imageUrl.startsWith('/api/storage/')) {
      const key = imageUrl.replace(/^\/api\/storage\//, '');
      try {
        const s3Response = await s3.send(
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
          })
        );

        if (s3Response.Body) {
          const streamToBuffer = async (stream: any): Promise<Buffer> => {
            const chunks: any[] = [];
            for await (const chunk of stream) {
              chunks.push(chunk);
            }
            return Buffer.concat(chunks);
          };

          const buffer = await streamToBuffer(s3Response.Body);
          const mimeType = s3Response.ContentType || 'image/jpeg';
          finalImageUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
        }
      } catch (storageErr) {
        console.warn('Could not read file from storage directly, using original URL:', storageErr);
      }
    }

    const prompt = `You are a precision expense receipt and invoice parser for SplitIt.
Extract the relevant financial and purchase details from this receipt image.

APPROVED CATEGORIES:
[${CATEGORY_NAMES.join(', ')}]

INSTRUCTIONS:
1. "title": Merchant or store name, or short purchase description (e.g. "Starbucks Coffee", "Blinkit Groceries", "Uber Trip").
2. "amount": Total final bill/receipt amount as a positive floating number in INR. Omit currency symbols, commas, or words (e.g. 450.50). If unreadable, null.
3. "date": Date of purchase in ISO YYYY-MM-DD format. If unreadable, null.
4. "category": Best matching category from the APPROVED CATEGORIES list. If unsure, "Miscellaneous".
5. "notes": Optional brief notes listing items, tax, or receipt number, or null.
6. "confidence": 'high', 'medium', or 'low'.

Return ONLY valid JSON with this exact schema (no markdown, no backticks, no other text):
{
  "title": "string",
  "amount": number | null,
  "date": "YYYY-MM-DD" | null,
  "category": "string | null",
  "notes": "string | null",
  "confidence": "high" | "medium" | "low"
}`;

    const rawResponse = await visionCompletion(finalImageUrl, prompt);

    let parsed: any;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      const match = rawResponse.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Failed to parse structured JSON from vision model');
      }
    }

    const result: ReceiptScanResult = {
      title: typeof parsed.title === 'string' ? parsed.title.trim() : 'Scanned Receipt',
      amount: typeof parsed.amount === 'number' && !isNaN(parsed.amount) ? parsed.amount : null,
      date: typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
      category: typeof parsed.category === 'string' ? parsed.category : null,
      notes: typeof parsed.notes === 'string' ? parsed.notes.trim() : null,
      confidence: parsed.confidence === 'high' || parsed.confidence === 'medium' ? parsed.confidence : 'low',
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Receipt OCR error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scan receipt' },
      { status: 500 }
    );
  }
}
