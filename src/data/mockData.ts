import { Trade, Account, DailyStats } from '../types';
import { subDays, format } from 'date-fns';

// Sample Account
export const mockAccount: Account = {
  id: 'acc_sample',
  name: 'Sample Trading Account',
  balance: 10000,
  equity: 10540.50,
  currency: 'USD',
};

// Generate some sample trades for the last 10 days
const generateSampleTrades = (): Trade[] => {
  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'];
  const strategies = ['Trend Following', 'Breakout', 'Mean Reversion'];
  const trades: Trade[] = [];

  for (let i = 0; i < 15; i++) {
    const date = subDays(new Date(), Math.floor(i / 1.5));
    const isWin = Math.random() > 0.4;
    const pnl = isWin ? (Math.random() * 200 + 50) : -(Math.random() * 100 + 20);
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
    
    trades.push({
      id: `sample_${i}`,
      accountId: 'acc_sample',
      symbol,
      type,
      entryPrice: 1.1000 + (Math.random() * 0.05),
      exitPrice: 1.1000 + (Math.random() * 0.05),
      size: 0.1 + (Math.random() * 0.5),
      pnl: Number(pnl.toFixed(2)),
      pnlPercent: Number((pnl / 10000 * 100).toFixed(2)),
      pips: Math.floor(Math.random() * 50) * (isWin ? 1 : -1),
      status: 'CLOSED',
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      openTime: date.toISOString(),
      closeTime: new Date(date.getTime() + 3600000 * 2).toISOString(),
      setupRating: isWin ? 'A+' : 'B',
      psychology: 'CONFIDENT',
      notes: 'Sample trade for demonstration purposes.'
    });
  }
  return trades.sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());
};

export const mockTrades: Trade[] = generateSampleTrades();

// Daily stats will be derived in the context, but we can export empty or calculated ones if needed
export const mockDailyStats: DailyStats[] = [];
