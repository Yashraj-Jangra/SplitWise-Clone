import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { chatCompletion } from '@/lib/ai/client';
import { defaultExpenseCategories } from '@/lib/expense-categories';
import type { CategorySuggestion } from '@/types/ai';

// Flattened lookup for subCategory -> masterCategory
const CATEGORY_MAP: Record<string, string> = {};
for (const [master, masterObj] of Object.entries(defaultExpenseCategories)) {
  if (masterObj?.subCategories) {
    for (const sub of Object.keys(masterObj.subCategories)) {
      CATEGORY_MAP[sub.toLowerCase()] = master;
      CATEGORY_MAP[sub] = master;
    }
  }
}

const CATEGORY_LIST_PROMPT = Object.entries(defaultExpenseCategories)
  .map(([master, details]) => {
    const subs = Object.keys(details.subCategories || {}).join(', ');
    return `- ${master}: [${subs}]`;
  })
  .join('\n');

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const description = typeof body?.description === 'string' ? body.description.trim() : '';

    if (!description || description.length < 3) {
      return NextResponse.json(
        { error: 'Description must be at least 3 characters long' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert expense categorizer for SplitIt, a group expense-sharing app in India.
Your task is to analyze the user's expense description and accurately map it to one of the approved categories.

APPROVED CATEGORIES AND SUB-CATEGORIES:
${CATEGORY_LIST_PROMPT}

INSTRUCTIONS:
1. Select the most accurate sub-category from the approved list above.
2. Select its corresponding master category.
3. Determine confidence as 'high', 'medium', or 'low'.
4. If ambiguous (e.g. "Payment", "Stuff"), choose sub-category "Other" under "Miscellaneous".
5. Return ONLY a JSON object with this exact schema:
{
  "category": "<Exact Sub-Category Name>",
  "masterCategory": "<Exact Master Category Name>",
  "confidence": "high" | "medium" | "low"
}`;

    const userPrompt = `Expense description: "${description}"`;

    const rawResponse = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }
    );

    let parsed: any;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      // Fallback regex matching if JSON was wrapped in markdown
      const match = rawResponse.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse AI category response');
      }
    }

    let subCategory = parsed.category || 'Other';
    // Validate that subCategory exists in our known categories
    let masterCategory = CATEGORY_MAP[subCategory] || CATEGORY_MAP[subCategory.toLowerCase()];

    if (!masterCategory) {
      // Find closest key if case mismatch
      const matchedKey = Object.keys(CATEGORY_MAP).find(
        (k) => k.toLowerCase() === subCategory.toLowerCase()
      );
      if (matchedKey) {
        subCategory = matchedKey;
        masterCategory = CATEGORY_MAP[matchedKey];
      } else {
        subCategory = 'Other';
        masterCategory = 'Miscellaneous';
      }
    }

    const suggestion: CategorySuggestion = {
      category: subCategory,
      masterCategory,
      confidence: parsed.confidence === 'high' || parsed.confidence === 'medium' ? parsed.confidence : 'low',
    };

    return NextResponse.json(suggestion);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to suggest category' },
      { status: 500 }
    );
  }
}
