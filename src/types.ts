export interface Exit {
  id: string;
  type: 'PARTIAL_1' | 'PARTIAL_2' | 'PARTIAL_3' | 'PARTIAL_4' | 'FULL_TP';
  percentage: number;
  price: number;
  date?: string;
}

export interface Trade {
  id: string;
  accountId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  slStatus?: 'INITIAL' | 'BREAK_EVEN';
  movedSlPrice?: number;
  exits?: Exit[];
  size: number; // Lots/Contracts
  pnl: number;
  pnlPercent: number;
  pips?: number; // Added for pips tracking
  rMultiple?: number;
  openTime: string; // ISO string
  closeTime: string; // ISO string
  status: 'OPEN' | 'CLOSED' | 'PENDING';
  strategy?: string;
  tags?: string[];
  notes?: string;
  psychology?: 'CONFIDENT' | 'NEUTRAL' | 'ANXIOUS' | 'FOMO' | 'REVENGE';
  screenshotUrl?: string;
  tradingViewUrl?: string;
  setupRating?: 'A+' | 'A' | 'B+' | 'B' | 'C';
  
  // Behavioral Analysis
  behavior?: {
    risk: {
      isAdheredToPlan: boolean;
      didMoveStopLoss: boolean;
      didRespectPositionSize: boolean;
      exitType: 'PLANNED' | 'PANIC' | 'GREED' | 'STOP_OUT' | 'TAKE_PROFIT';
    };
    timing: {
      plannedDurationMinutes?: number;
      actualDurationMinutes?: number;
      timingDeviation: 'EARLY' | 'LATE' | 'ON_TIME';
    };
    emotions: {
      entry: ('FOMO' | 'CONFIDENT' | 'HESITANT' | 'BOREDOM' | 'REVENGE' | 'DISCIPLINED')[];
      during: ('ANXIOUS' | 'HOPEFUL' | 'GREEDY' | 'NUMB' | 'FOCUSED')[];
      exit: ('RELIEVED' | 'REGRET' | 'SATISFIED' | 'TILTED' | 'PROUD')[];
    };
    psychScore: number;
  };
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  equity: number;
  currency: string;
}

export interface DailyStats {
  date: string;
  pnl: number;
  tradesCount: number;
  winRate: number;
  rMultiple: number;
  pips: number;
}
