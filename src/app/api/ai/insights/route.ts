import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getItem, putItem } from '@/lib/nosql';
import { getExpensesByUserId } from '@/lib/services/expense.service';
import { chatCompletion } from '@/lib/ai/client';
import type { AIInsight } from '@/types/ai';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const forceRefresh = body?.force === true;

    const now = new Date();
    const yyyyMM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cachePk = `INSIGHT#${session.user.id}#${yyyyMM}`;

    // 1. Check in-database 6-hour cache
    if (!forceRefresh) {
      const cached = await getItem<any>(cachePk, 'METADATA');
      if (cached && cached.summary && cached.createdAt) {
        const age = Date.now() - new Date(cached.createdAt).getTime();
        if (age < SIX_HOURS_MS) {
          return NextResponse.json({
            summary: cached.summary,
            generatedAt: cached.createdAt,
            cached: true,
          });
        }
      }
    }

    // 2. Aggregate user's recent financial numbers & net balances
    const { getAllUserBalances } = await import('@/lib/services/balance.service');
    const [expenses, userBalances] = await Promise.all([
      getExpensesByUserId(session.user.id).catch(() => []),
      getAllUserBalances(session.user.id).catch(() => []),
    ]);

    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let totalMonthSpent = 0;
    const categoryMap = new Map<string, number>();

    for (const exp of expenses) {
      const expDate = new Date(exp.date);
      if (expDate.getFullYear() === thisYear && expDate.getMonth() === thisMonth) {
        // Calculate user's actual share in this expense
        const myPart = exp.participants.find((p) => p.user.uid === session.user.id);
        const myOwed = myPart ? Number(myPart.amountOwed) || 0 : 0;
        totalMonthSpent += myOwed;

        const cat = exp.category || 'Miscellaneous';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + myOwed);
      }
    }

    const netBalance = userBalances.reduce((sum, b) => sum + b.netBalance, 0);
    const netStatusStr = netBalance > 0.01
      ? `Net Owed to You: ₹${netBalance.toFixed(0)} (others owe you)`
      : netBalance < -0.01
      ? `Net You Owe: ₹${Math.abs(netBalance).toFixed(0)} (you have pending debts)`
      : 'Net Balance: ₹0 (all settled up)';

    const sortedCats = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => `${cat} (₹${amt.toFixed(0)})`);

    const categoriesStr = sortedCats.length > 0 ? sortedCats.join(', ') : 'Various';

    // 3. Prompt LLM for financial insight
    const systemPrompt = `You are an expert personal finance coach for SplitIt, a collaborative expense-sharing app.
Your job is to provide concise, friendly, and actionable financial summaries based on the user's spending data.`;

    const userPrompt = `USER FINANCIAL METRICS:
- Total Personal Spend This Month: ₹${totalMonthSpent.toFixed(0)}
- Top Categories: ${categoriesStr}
- Overall Balance Status: ${netStatusStr}
- Current Month: ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}

INSTRUCTIONS:
1. Summarize their spending trend and balance status in 2-3 short, engaging sentences.
2. Highlight their biggest category and suggest one practical action (e.g. setting a budget or settling shared tabs).
3. Format all currency numbers using ₹.
4. Keep the entire response under 80 words.`;

    const summary = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.3,
      max_tokens: 250,
    });

    const insightData = {
      summary,
      createdAt: new Date().toISOString(),
    };

    // 4. Save to cache
    await putItem(cachePk, 'METADATA', 'AI_INSIGHT', insightData);

    const result: AIInsight = {
      summary,
      generatedAt: insightData.createdAt,
      cached: false,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Insights generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate financial insight' },
      { status: 500 }
    );
  }
}
