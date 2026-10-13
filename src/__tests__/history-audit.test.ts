import { describe, it, expect } from 'vitest';
import { parseComplexChange } from '@splitit/core';

describe('History audit logs and group activity parity tests', () => {
  describe('parseComplexChange', () => {
    it('returns empty array for empty, null, or undefined strings', () => {
      expect(parseComplexChange('')).toEqual([]);
      expect(parseComplexChange(null as any)).toEqual([]);
      expect(parseComplexChange(undefined as any)).toEqual([]);
    });

    it('correctly parses changed share / payment diffs', () => {
      const input = "changed Rohit's share from ₹1,250 to ₹1,925";
      const result = parseComplexChange(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'changed',
        name: 'Rohit',
        from: '₹1,250',
        to: '₹1,925',
      });
    });

    it('correctly parses added payer with paid detail', () => {
      const input = 'added Priya who paid ₹1,000';
      const result = parseComplexChange(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'added',
        name: 'Priya',
        detail: 'paid ₹1,000',
      });
    });

    it('correctly parses added split with owes detail', () => {
      const input = 'added Aman to split (owes ₹500)';
      const result = parseComplexChange(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'added',
        name: 'Aman',
        detail: 'owes ₹500',
      });
    });

    it('correctly parses removed payer with paid detail', () => {
      const input = 'removed Sneha (who paid ₹800)';
      const result = parseComplexChange(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'removed',
        name: 'Sneha',
        detail: 'paid ₹800',
      });
    });

    it('correctly parses removed split with was owing detail', () => {
      const input = 'removed Priya from split (was owing ₹450)';
      const result = parseComplexChange(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'removed',
        name: 'Priya',
        detail: 'was owing ₹450',
      });
    });

    it('parses multiple semicolon-delimited changes', () => {
      const input = "changed Rohit's share from ₹600 to ₹750; added Priya who paid ₹0; removed Aman (who paid ₹200)";
      const result = parseComplexChange(input);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        type: 'changed',
        name: 'Rohit',
        from: '₹600',
        to: '₹750',
      });
      expect(result[1]).toEqual({
        type: 'added',
        name: 'Priya',
        detail: 'paid ₹0',
      });
      expect(result[2]).toEqual({
        type: 'removed',
        name: 'Aman',
        detail: 'paid ₹200',
      });
    });
  });

  describe('Deleted expense tracking and strikethrough determination', () => {
    function computeDeletedExpenseIds(history: Array<{ eventType: string; data?: any; restored?: boolean }>): Set<string> {
      const deletedIds = new Set<string>();
      history.forEach((event) => {
        if (event.eventType === 'expense_deleted' && event.data?.expenseId && !event.restored) {
          deletedIds.add(event.data.expenseId);
        }
      });
      return deletedIds;
    }

    function isExpenseDeleted(
      event: { eventType: string; data?: any },
      deletedIds: Set<string>
    ): boolean {
      return (
        (event.eventType === 'expense_created' || event.eventType === 'expense_updated') &&
        Boolean(event.data?.expenseId && deletedIds.has(event.data.expenseId))
      );
    }

    it('identifies deleted expenses and applies strikethrough flag', () => {
      const history = [
        {
          eventType: 'expense_created',
          data: { expenseId: 'exp_1' },
        },
        {
          eventType: 'expense_deleted',
          data: { expenseId: 'exp_1' },
          restored: false,
        },
        {
          eventType: 'expense_created',
          data: { expenseId: 'exp_2' },
        },
      ];

      const deletedIds = computeDeletedExpenseIds(history);
      expect(deletedIds.has('exp_1')).toBe(true);
      expect(deletedIds.has('exp_2')).toBe(false);

      expect(isExpenseDeleted(history[0], deletedIds)).toBe(true);
      expect(isExpenseDeleted(history[2], deletedIds)).toBe(false);
    });

    it('does not mark expense as deleted if it has been restored', () => {
      const history = [
        {
          eventType: 'expense_created',
          data: { expenseId: 'exp_1' },
        },
        {
          eventType: 'expense_deleted',
          data: { expenseId: 'exp_1' },
          restored: true, // Marked restored
        },
      ];

      const deletedIds = computeDeletedExpenseIds(history);
      expect(deletedIds.has('exp_1')).toBe(false);
      expect(isExpenseDeleted(history[0], deletedIds)).toBe(false);
    });
  });

  describe('Viewable expense ID resolution ("Take there" button)', () => {
    function resolveViewableExpenseId(
      event: { eventType: string; data?: any },
      isDeleted: boolean
    ): string | null {
      if (isDeleted) return null;
      if (
        (event.eventType === 'expense_created' || event.eventType === 'expense_updated') &&
        event.data?.expenseId
      ) {
        return event.data.expenseId;
      }
      if (event.eventType === 'expense_restored' && event.data?.newExpenseId) {
        return event.data.newExpenseId;
      }
      return null;
    }

    it('resolves active expense id for created or updated events', () => {
      const createdEvent = { eventType: 'expense_created', data: { expenseId: 'exp_123' } };
      const updatedEvent = { eventType: 'expense_updated', data: { expenseId: 'exp_123' } };

      expect(resolveViewableExpenseId(createdEvent, false)).toBe('exp_123');
      expect(resolveViewableExpenseId(updatedEvent, false)).toBe('exp_123');
    });

    it('returns null when the expense is deleted', () => {
      const createdEvent = { eventType: 'expense_created', data: { expenseId: 'exp_123' } };
      expect(resolveViewableExpenseId(createdEvent, true)).toBeNull();
    });

    it('resolves new expense id for restored events', () => {
      const restoredEvent = { eventType: 'expense_restored', data: { newExpenseId: 'exp_new_456' } };
      expect(resolveViewableExpenseId(restoredEvent, false)).toBe('exp_new_456');
    });
  });

  describe('Restore and Admin-only Delete guards', () => {
    function canRestore(event: { eventType: string; restored?: boolean }): boolean {
      return (
        (event.eventType === 'expense_deleted' || event.eventType === 'settlement_deleted') &&
        !event.restored
      );
    }

    function canDelete(user?: { role?: string } | null): boolean {
      return user?.role === 'admin';
    }

    it('allows restore only on unrestored deleted items', () => {
      expect(canRestore({ eventType: 'expense_deleted', restored: false })).toBe(true);
      expect(canRestore({ eventType: 'settlement_deleted', restored: false })).toBe(true);
      expect(canRestore({ eventType: 'expense_deleted', restored: true })).toBe(false);
      expect(canRestore({ eventType: 'expense_updated', restored: false })).toBe(false);
    });

    it('strictly checks admin role for deletion', () => {
      expect(canDelete({ role: 'admin' })).toBe(true);
      expect(canDelete({ role: 'user' })).toBe(false);
      expect(canDelete({ role: 'member' })).toBe(false);
      expect(canDelete(null)).toBe(false);
      expect(canDelete(undefined)).toBe(false);
    });
  });
});
