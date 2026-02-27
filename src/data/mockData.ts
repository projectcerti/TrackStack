import { Trade, Account, DailyStats } from '../types';

// Export empty arrays/objects to replace the previous mock data
// We keep the types but remove the data generation
export const mockAccount: Account = {
  id: '',
  name: '',
  balance: 0,
  equity: 0,
  currency: 'USD',
};

export const mockTrades: Trade[] = [];

export const mockDailyStats: DailyStats[] = [];
