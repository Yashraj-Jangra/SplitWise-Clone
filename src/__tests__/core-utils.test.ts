import { describe, it, expect } from 'vitest';
import { getFullName, getInitials, classifyExpense, getMasterCategory, defaultExpenseCategories, parseComplexChange } from '@splitit/core';

describe('@splitit/core utility functions', () => {
  describe('Name utilities', () => {
    it('formats full name correctly with first and last name', () => {
      expect(getFullName('Yashraj', 'Jangra')).toBe('Yashraj Jangra');
    });

    it('handles missing last name gracefully', () => {
      expect(getFullName('Yashraj')).toBe('Yashraj');
      expect(getFullName('Yashraj', '')).toBe('Yashraj');
    });

    it('returns empty string if first name is missing', () => {
      expect(getFullName()).toBe('');
      expect(getFullName('', 'Jangra')).toBe('');
    });

    it('computes initials accurately', () => {
      expect(getInitials('Yashraj', 'Jangra')).toBe('YJ');
      expect(getInitials('Yashraj')).toBe('Y');
      expect(getInitials('', '')).toBe('??');
      expect(getInitials(undefined, undefined)).toBe('??');
    });
  });

  describe('Category classification', () => {
    it('classifies grocery store keywords', () => {
      const match = classifyExpense('Bought food from BigBasket', defaultExpenseCategories);
      expect(match.master).toBe('Food and Drink');
      expect(match.sub).toBe('Groceries');
    });

    it('classifies taxi and cab keywords', () => {
      const match = classifyExpense('Uber ride to airport', defaultExpenseCategories);
      expect(match.master).toBe('Transportation');
      expect(match.sub).toBe('Taxi');
    });

    it('classifies flight keywords', () => {
      const match = classifyExpense('IndiGo flight tickets', defaultExpenseCategories);
      expect(match.master).toBe('Transportation');
      expect(match.sub).toBe('Flights');
    });

    it('falls back to Uncategorized for unknown text', () => {
      const match = classifyExpense('Random unknown expense XYZ123', defaultExpenseCategories);
      expect(match.master).toBe('Uncategorized');
      expect(match.sub).toBe('Other');
    });

    it('resolves master category given a valid subcategory', () => {
      expect(getMasterCategory('Rent', defaultExpenseCategories)).toBe('Housing');
      expect(getMasterCategory('Electricity', defaultExpenseCategories)).toBe('Utilities');
      expect(getMasterCategory('NonExistentSub', defaultExpenseCategories)).toBe('Uncategorized');
    });
  });

  describe('History log parsing', () => {
    it('parses changed share/payment accurately', () => {
      const res = parseComplexChange("changed Rohit's share from ₹200 to ₹150");
      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        type: 'changed',
        name: 'Rohit',
        from: '₹200',
        to: '₹150',
      });
    });

    it('parses added participant and payment accurately', () => {
      const res = parseComplexChange("added Priya who paid ₹450; added Aman to split (owes ₹150)");
      expect(res).toHaveLength(2);
      expect(res[0]).toEqual({
        type: 'added',
        name: 'Priya',
        detail: 'paid ₹450',
      });
      expect(res[1]).toEqual({
        type: 'added',
        name: 'Aman',
        detail: 'owes ₹150',
      });
    });

    it('parses removed participant accurately', () => {
      const res = parseComplexChange("removed Sneha from split (was owing ₹150)");
      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        type: 'removed',
        name: 'Sneha',
        detail: 'was owing ₹150',
      });
    });
  });
});
