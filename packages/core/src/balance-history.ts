export interface BalanceTransaction {
  date: string | Date;
  amount: number;
}

export interface BalanceHistoryPoint {
  date: string;
  balance: number;
}

export interface BalanceHistoryCalculation {
  netBalance: number;
  chartData: BalanceHistoryPoint[];
  domain: [number, number];
  gradientOffset: number;
  trendPercentage: number;
  minBalance: number;
  maxBalance: number;
}

/**
 * Calculates a rolling daily cumulative net balance history series over N days,
 * along with the chart domain, vertical gradient split offset (at y=0), and trend %.
 */
export function calculateBalanceHistory(
  transactions: BalanceTransaction[],
  days: number = 30,
  referenceDate: Date = new Date()
): BalanceHistoryCalculation {
  const endDate = new Date(referenceDate);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  // 1. Group daily net changes
  const dailyNetChanges = new Map<string, number>();
  const normalizedTransactions: Array<{ date: Date; amount: number }> = [];

  for (const t of transactions) {
    const d = new Date(t.date);
    if (!isNaN(d.getTime())) {
      const amt = Number(t.amount) || 0;
      normalizedTransactions.push({ date: d, amount: amt });

      if (d >= startDate && d <= endDate) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dailyNetChanges.set(key, (dailyNetChanges.get(key) || 0) + amt);
      }
    }
  }

  // 2. Final overall net balance
  const overallNetBalance = normalizedTransactions.reduce((sum, t) => sum + t.amount, 0);

  // 3. Balance before the window starts
  const balanceBeforeWindow = normalizedTransactions
    .filter((t) => t.date < startDate)
    .reduce((sum, t) => sum + t.amount, 0);

  let cumulativeBalance = balanceBeforeWindow;
  let minBalance = cumulativeBalance;
  let maxBalance = cumulativeBalance;

  const chartData: BalanceHistoryPoint[] = [];

  const currentDay = new Date(startDate);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  while (currentDay <= endDate) {
    const key = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;
    cumulativeBalance += dailyNetChanges.get(key) || 0;
    if (cumulativeBalance < minBalance) minBalance = cumulativeBalance;
    if (cumulativeBalance > maxBalance) maxBalance = cumulativeBalance;

    const formattedDate = `${monthNames[currentDay.getMonth()]} ${currentDay.getDate()}`;

    chartData.push({
      date: formattedDate,
      balance: parseFloat(cumulativeBalance.toFixed(2)),
    });

    currentDay.setDate(currentDay.getDate() + 1);
  }

  // 4. Calculate chart domain and zero-crossing gradient offset
  const padding = Math.max(Math.abs(minBalance), Math.abs(maxBalance)) * 0.1 || 10;
  const finalDomain: [number, number] = [
    parseFloat((minBalance - padding).toFixed(2)),
    parseFloat((maxBalance + padding).toFixed(2)),
  ];

  let offset = 0;
  if (finalDomain[1] > finalDomain[0]) {
    offset = finalDomain[1] / (finalDomain[1] - finalDomain[0]);
  }
  offset = Math.max(0, Math.min(1, offset));

  // 5. Calculate Trend Percentage (current window vs prior window)
  const currentWindowBalance = normalizedTransactions
    .filter((t) => t.date >= startDate && t.date <= endDate)
    .reduce((sum, t) => sum + t.amount, 0);

  const priorStartDate = new Date(startDate);
  priorStartDate.setDate(priorStartDate.getDate() - days);

  const priorWindowBalance = normalizedTransactions
    .filter((t) => t.date >= priorStartDate && t.date < startDate)
    .reduce((sum, t) => sum + t.amount, 0);

  let trendPercentage = 0;
  if (Math.abs(priorWindowBalance) > 0) {
    trendPercentage = parseFloat(
      (((currentWindowBalance - priorWindowBalance) / Math.abs(priorWindowBalance)) * 100).toFixed(1)
    );
  }

  return {
    netBalance: parseFloat(overallNetBalance.toFixed(2)),
    chartData,
    domain: finalDomain,
    gradientOffset: parseFloat(offset.toFixed(4)),
    trendPercentage,
    minBalance: parseFloat(minBalance.toFixed(2)),
    maxBalance: parseFloat(maxBalance.toFixed(2)),
  };
}
