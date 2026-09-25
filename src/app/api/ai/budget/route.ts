import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getItem, putItem } from '@/lib/nosql';
import { getUserProfile } from '@/lib/services/user.service';
import { logHistoryEvent } from '@/lib/services/history.service';
import { getFullName } from '@/lib/utils';
import { queueVectorEmbedding } from '@/lib/ai/queue-helper';
import type { BudgetActionProposal } from '@/types/ai';

const MIN_LIMIT = 100;
const MAX_LIMIT = 10_000_000;

function clampLimit(value: number): number {
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.round(value)));
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as {
      proposal: BudgetActionProposal;
      approved: boolean;
    };

    const { proposal, approved } = body;

    // --- Basic validation ---
    if (!proposal || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!approved) {
      // User denied — nothing to do
      return NextResponse.json({ success: false, denied: true });
    }

    const { groupId, action, newMonthlyLimit, deltaAmount, categoryKey, newCategoryLimit } = proposal;

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    // --- Authorisation: must be a group member ---
    const groupDoc = await getItem<any>(`GROUP#${groupId}`, 'METADATA');
    if (!groupDoc) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const memberIds: string[] = (groupDoc.members || []).map((m: any) =>
      typeof m === 'string' ? m : m.userId
    );

    const isAdmin = session.user.role === 'admin';
    const isMember = isAdmin || memberIds.includes(session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this group' }, { status: 403 });
    }

    // --- Apply the budget action ---
    const currentBudget = groupDoc.budget || {
      monthlyLimit: 0,
      enabled: false,
      alertThresholds: [75, 90, 100],
    };

    let updatedBudget = { ...currentBudget };
    let historyDescription = '';
    const actorId = session.user.id;

    switch (action) {
      case 'set_monthly_limit': {
        if (typeof newMonthlyLimit !== 'number' || isNaN(newMonthlyLimit)) {
          return NextResponse.json({ error: 'newMonthlyLimit must be a number' }, { status: 400 });
        }
        const clamped = clampLimit(newMonthlyLimit);
        const oldLimit = updatedBudget.monthlyLimit;
        updatedBudget.monthlyLimit = clamped;
        updatedBudget.enabled = true;
        historyDescription = `AI set monthly budget from ₹${oldLimit.toLocaleString('en-IN')} to ₹${clamped.toLocaleString('en-IN')} on behalf of user.`;
        break;
      }

      case 'increase_monthly_limit': {
        if (typeof deltaAmount !== 'number' || isNaN(deltaAmount) || deltaAmount <= 0) {
          return NextResponse.json({ error: 'deltaAmount must be a positive number' }, { status: 400 });
        }
        const oldLimit = updatedBudget.monthlyLimit || 0;
        const newLimit = clampLimit(oldLimit + deltaAmount);
        updatedBudget.monthlyLimit = newLimit;
        updatedBudget.enabled = true;
        historyDescription = `AI increased monthly budget by ₹${deltaAmount.toLocaleString('en-IN')} (₹${oldLimit.toLocaleString('en-IN')} → ₹${newLimit.toLocaleString('en-IN')}) on behalf of user.`;
        break;
      }

      case 'decrease_monthly_limit': {
        if (typeof deltaAmount !== 'number' || isNaN(deltaAmount) || deltaAmount <= 0) {
          return NextResponse.json({ error: 'deltaAmount must be a positive number' }, { status: 400 });
        }
        const oldLimit = updatedBudget.monthlyLimit || 0;
        if (oldLimit <= 0) {
          return NextResponse.json({ error: 'Cannot decrease budget because no monthly limit is currently set.' }, { status: 400 });
        }
        if (oldLimit - deltaAmount < MIN_LIMIT) {
          return NextResponse.json({
            error: `Cannot decrease budget by ₹${deltaAmount.toLocaleString('en-IN')}: minimum monthly budget is ₹${MIN_LIMIT.toLocaleString('en-IN')} (current limit is ₹${oldLimit.toLocaleString('en-IN')}). If you want to disable the budget, ask me to turn it off.`,
          }, { status: 400 });
        }
        const newLimit = clampLimit(oldLimit - deltaAmount);
        updatedBudget.monthlyLimit = newLimit;
        updatedBudget.enabled = true;
        historyDescription = `AI decreased monthly budget by ₹${deltaAmount.toLocaleString('en-IN')} (₹${oldLimit.toLocaleString('en-IN')} → ₹${newLimit.toLocaleString('en-IN')}) on behalf of user.`;
        break;
      }

      case 'enable_budget': {
        if (!updatedBudget.monthlyLimit || updatedBudget.monthlyLimit < MIN_LIMIT) {
          if (typeof newMonthlyLimit === 'number' && !isNaN(newMonthlyLimit)) {
            updatedBudget.monthlyLimit = clampLimit(newMonthlyLimit);
          } else {
            return NextResponse.json({ error: 'Cannot enable budget without a valid monthlyLimit' }, { status: 400 });
          }
        }
        updatedBudget.enabled = true;
        historyDescription = `AI enabled group budget (₹${updatedBudget.monthlyLimit.toLocaleString('en-IN')}/month) on behalf of user.`;
        break;
      }

      case 'disable_budget': {
        updatedBudget.enabled = false;
        historyDescription = `AI disabled group budget on behalf of user.`;
        break;
      }

      case 'set_category_limit': {
        if (!categoryKey || typeof categoryKey !== 'string') {
          return NextResponse.json({ error: 'categoryKey is required for set_category_limit' }, { status: 400 });
        }
        if (typeof newCategoryLimit !== 'number' || isNaN(newCategoryLimit) || newCategoryLimit < 0) {
          return NextResponse.json({ error: 'newCategoryLimit must be a non-negative number' }, { status: 400 });
        }
        const clamped = clampLimit(newCategoryLimit);
        const oldCatLimit = updatedBudget.categoryLimits?.[categoryKey];
        updatedBudget.categoryLimits = {
          ...(updatedBudget.categoryLimits || {}),
          [categoryKey]: clamped,
        };
        historyDescription = oldCatLimit !== undefined
          ? `AI updated category budget for "${categoryKey}" from ₹${oldCatLimit.toLocaleString('en-IN')} to ₹${clamped.toLocaleString('en-IN')} on behalf of user.`
          : `AI set category budget for "${categoryKey}" to ₹${clamped.toLocaleString('en-IN')} on behalf of user.`;
        break;
      }

      case 'remove_category_limit': {
        if (!categoryKey || typeof categoryKey !== 'string') {
          return NextResponse.json({ error: 'categoryKey is required for remove_category_limit' }, { status: 400 });
        }
        if (updatedBudget.categoryLimits) {
          const copy = { ...updatedBudget.categoryLimits };
          delete copy[categoryKey];
          updatedBudget.categoryLimits = copy;
        }
        historyDescription = `AI removed category budget for "${categoryKey}" on behalf of user.`;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown budget action: ${action}` }, { status: 400 });
    }

    // Stamp audit metadata
    updatedBudget.updatedAt = new Date().toISOString();
    updatedBudget.updatedBy = actorId;
    if (!updatedBudget.alertThresholds) {
      updatedBudget.alertThresholds = [75, 90, 100];
    }

    // Persist
    const updatedGroup = {
      ...groupDoc,
      budget: updatedBudget,
      updatedAt: new Date().toISOString(),
    };

    await putItem(
      `GROUP#${groupId}`,
      'METADATA',
      'GROUP',
      updatedGroup,
      `USER#${groupDoc.createdById}`,
      `GROUP#${groupId}`
    );

    queueVectorEmbedding(groupId, groupId, 'group', 'upsert');

    // --- Log to group history ---
    const actor = await getUserProfile(actorId);
    const actorName = getFullName(actor?.firstName, actor?.lastName) || actor?.username || 'A member';
    const fullDescription = `🤖 ${actorName} approved an AI budget change: ${historyDescription}`;

    await logHistoryEvent(groupId, 'budget_updated', actorId, fullDescription, {
      action,
      proposal,
      newBudget: updatedBudget,
      approvedByUserId: actorId,
      approvedByName: actorName,
      aiInitiated: true,
    });

    return NextResponse.json({
      success: true,
      newBudget: updatedBudget,
      description: historyDescription,
    });
  } catch (error: any) {
    console.error('[AI Budget] Error applying budget change:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
