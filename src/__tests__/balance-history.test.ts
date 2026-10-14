import { describe, it, expect } from 'vitest';
import { calculateBalanceHistory } from '@splitit/core';

describe('Balance History Calculation Engine', () => {
  const refDate = new Date('2026-03-31T12:00:00.000Z');

  it('computes flat zero series when there are no transactions', () => {
    const result = calculateBalanceHistory([], 30, refDate);
    expect(result.netBalance).toBe(0);
    expect(result.chartData.length).toBe(30);
    expect(result.chartData[0].balance).toBe(0);
    expect(result.chartData[29].balance).toBe(0);
    expect(result.trendPercentage).toBe(0);
    expect(result.domain[0]).toBeLessThan(0);
    expect(result.domain[1]).toBeGreaterThan(0);
  });

  it('accumulates positive transactions across the window', () => {
    const transactions = [
      { date: '2026-03-05T10:00:00.000Z', amount: 500 },
      { date: '2026-03-15T12:00:00.000Z', amount: 300 },
      { date: '2026-03-25T15:00:00.000Z', amount: 200 },
    ];
    const result = calculateBalanceHistory(transactions, 30, refDate);
    expect(result.netBalance).toBe(1000);
    expect(result.chartData[result.chartData.length - 1].balance).toBe(1000);
    expect(result.minBalance).toBe(0);
    expect(result.maxBalance).toBe(1000);
    expect(result.gradientOffset).toBeGreaterThan(0.9);
  });

  it('correctly includes pre-window balance carryover', () => {
    const transactions = [
      { date: '2026-01-10T10:00:00.000Z', amount: 1500 }, // before 30-day window
      { date: '2026-03-10T10:00:00.000Z', amount: -500 },  // inside window
    ];
    const result = calculateBalanceHistory(transactions, 30, refDate);
    expect(result.netBalance).toBe(1000);
    expect(result.chartData[0].balance).toBe(1500);
    expect(result.chartData[result.chartData.length - 1].balance).toBe(1000);
  });

  it('computes gradient offset correctly when transitioning across zero', () => {
    const transactions = [
      { date: '2026-03-05T10:00:00.000Z', amount: -600 }, // in the red
      { date: '2026-03-20T10:00:00.000Z', amount: 1000 }, // into the green (+400)
    ];
    const result = calculateBalanceHistory(transactions, 30, refDate);
    expect(result.netBalance).toBe(400);
    expect(result.minBalance).toBe(-600);
    expect(result.maxBalance).toBe(400);
    expect(result.gradientOffset).toBeGreaterThan(0.3);
    expect(result.gradientOffset).toBeLessThan(0.7);
  });

  it('calculates trend percentage between current and prior 30-day windows', () => {
    const transactions = [
      { date: '2026-02-15T10:00:00.000Z', amount: 500 },  // prior window (Feb)
      { date: '2026-03-15T10:00:00.000Z', amount: 1000 }, // current window (Mar)
    ];
    const result = calculateBalanceHistory(transactions, 30, refDate);
    expect(result.trendPercentage).toBe(100); // 100% increase
  });
});
