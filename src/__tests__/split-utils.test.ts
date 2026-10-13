import { describe, it, expect } from 'vitest';
import {
  areParticipantsValid,
  resolveParticipantName,
  formatParticipantOwedText,
  formatPayerText,
} from '@splitit/core';

describe('Split utilities and error guards', () => {
  describe('areParticipantsValid', () => {
    it('returns false for null, undefined, or empty arrays', () => {
      expect(areParticipantsValid(null)).toBe(false);
      expect(areParticipantsValid(undefined)).toBe(false);
      expect(areParticipantsValid([])).toBe(false);
    });

    it('returns false when participant name is missing or undefined', () => {
      const participants = [
        { userId: 'u1', name: undefined, amountOwed: 100 },
      ];
      expect(areParticipantsValid(participants)).toBe(false);
    });

    it('returns false when participant name is the literal string "undefined" or "null"', () => {
      expect(
        areParticipantsValid([{ userId: 'u1', name: 'undefined', amountOwed: 50 }])
      ).toBe(false);
      expect(
        areParticipantsValid([{ userId: 'u1', name: 'null', amountOwed: 50 }])
      ).toBe(false);
      expect(
        areParticipantsValid([{ userId: 'u1', name: '   ', amountOwed: 50 }])
      ).toBe(false);
    });

    it('returns false when amountOwed is undefined, null, or NaN', () => {
      expect(
        areParticipantsValid([{ userId: 'u1', name: 'Yashraj', amountOwed: undefined }])
      ).toBe(false);
      expect(
        areParticipantsValid([{ userId: 'u1', name: 'Yashraj', amountOwed: null }])
      ).toBe(false);
      expect(
        areParticipantsValid([{ userId: 'u1', name: 'Yashraj', amountOwed: NaN }])
      ).toBe(false);
      expect(
        areParticipantsValid([{ userId: 'u1', name: 'Yashraj', amountOwed: 'invalid' }])
      ).toBe(false);
    });

    it('returns true when isCurrentUser is true even without explicit name', () => {
      const participants = [
        { userId: 'u1', isCurrentUser: true, amountOwed: 150 },
      ];
      expect(areParticipantsValid(participants)).toBe(true);
    });

    it('returns true when all participants have valid names and numbers', () => {
      const participants = [
        { userId: 'u1', name: 'You', isCurrentUser: true, amountOwed: 100 },
        { userId: 'u2', name: 'Priya', isCurrentUser: false, amountOwed: 100 },
        { userId: 'u3', name: 'Aman', isCurrentUser: false, amountOwed: 100 },
      ];
      expect(areParticipantsValid(participants)).toBe(true);
    });
  });

  describe('resolveParticipantName', () => {
    it('returns "You" for current user', () => {
      expect(resolveParticipantName({ userId: 'u1', isCurrentUser: true })).toBe('You');
      expect(
        resolveParticipantName({ userId: 'u1', name: 'Priya' }, 'u1')
      ).toBe('You');
    });

    it('returns trimmed name when provided', () => {
      expect(
        resolveParticipantName({ userId: 'u2', name: '  Aman Verma  ' })
      ).toBe('Aman Verma');
    });

    it('falls back to group member name when participant name is missing or "undefined"', () => {
      const groupMembers = [
        { id: 'u2', name: 'Rohan Sharma' },
      ];
      expect(
        resolveParticipantName({ userId: 'u2', name: undefined }, 'u1', groupMembers)
      ).toBe('Rohan Sharma');
      expect(
        resolveParticipantName({ userId: 'u2', name: 'undefined' }, 'u1', groupMembers)
      ).toBe('Rohan Sharma');
    });

    it('falls back safely to "Member" if no name can be resolved', () => {
      expect(resolveParticipantName(null)).toBe('Member');
      expect(resolveParticipantName({ userId: 'unknown' })).toBe('Member');
      expect(resolveParticipantName({ userId: 'unknown', name: 'undefined' })).toBe('Member');
    });
  });

  describe('formatParticipantOwedText', () => {
    it('returns "Loading split..." if participant is null or undefined', () => {
      expect(formatParticipantOwedText(null)).toBe('Loading split...');
      expect(formatParticipantOwedText(undefined)).toBe('Loading split...');
    });

    it('formats owed text correctly for current user', () => {
      expect(
        formatParticipantOwedText({ userId: 'u1', isCurrentUser: true, amountOwed: 250 })
      ).toBe('You owe ₹250.00');
    });

    it('formats owed text correctly for other members', () => {
      expect(
        formatParticipantOwedText({ userId: 'u2', name: 'Mohit', amountOwed: 125.5 })
      ).toBe('Mohit owes ₹125.50');
    });

    it('never produces "undefined owes..." even with corrupted or incomplete data', () => {
      const corrupted = {
        userId: 'u9',
        name: undefined,
        amountOwed: undefined,
      };
      const text = formatParticipantOwedText(corrupted);
      expect(text).not.toContain('undefined');
      expect(text).toBe('Member owes ₹0.00');
    });

    it('resolves name from groupMembers if participant name is undefined', () => {
      const members = [{ id: 'u3', name: 'Kavita' }];
      const text = formatParticipantOwedText(
        { userId: 'u3', name: undefined, amountOwed: 75 },
        '₹',
        members
      );
      expect(text).toBe('Kavita owes ₹75.00');
    });
  });

  describe('formatPayerText', () => {
    it('formats payer with name and amount', () => {
      expect(formatPayerText('Mohit', 450)).toBe('Mohit paid ₹450.00');
    });

    it('falls back to "Member" when payer name is undefined, null, or literal "undefined"', () => {
      expect(formatPayerText(undefined, 200)).toBe('Member paid ₹200.00');
      expect(formatPayerText('undefined', 200)).toBe('Member paid ₹200.00');
      expect(formatPayerText(null, 200)).toBe('Member paid ₹200.00');
    });

    it('handles NaN or missing amount gracefully', () => {
      expect(formatPayerText('You', NaN)).toBe('You paid ₹0.00');
      expect(formatPayerText('You', undefined)).toBe('You paid ₹0.00');
    });
  });
});
