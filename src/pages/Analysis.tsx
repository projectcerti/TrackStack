import React, { useMemo } from 'react';
import { useTrades } from '@/context/TradeContext';
import { format, getDay, getHours, differenceInMinutes, parseISO } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowUpRight, ArrowDownRight, Target, Brain, Clock, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';

export default function Analysis() {
  const { trades } = useTrades();

  // --- 1. Tracker Score (Consistency Metric) ---
  const trackerScore = useMemo(() => {
    if (trades.length === 0) return 0;
    
    let score = 100;
    let adherenceCount = 0;
    let stopLossMovedCount = 0;
    let revengeCount = 0;

    trades.forEach(t => {
      if (t.behavior?.risk.isAdheredToPlan) adherenceCount++;
      if (t.behavior?.risk.didMoveStopLoss) stopLossMovedCount++;
      if (t.psychology === 'REVENGE' || t.behavior?.emotions.entry.includes('REVENGE')) revengeCount++;
    });

    // Penalties
    const adherenceRate = adherenceCount / trades.length;
    score -= (1 - adherenceRate) * 40; // Up to 40 pts penalty for not following plan
    
    const slMovedRate = stopLossMovedCount / trades.length;
    score -= slMovedRate * 30; // Up to 30 pts penalty for moving SL

    const revengeRate = revengeCount / trades.length;
    score -= revengeRate * 30; // Up to 30 pts penalty for revenge trading

    return Math.max(0, Math.round(score));
  }, [trades]);

  // --- 2. Profitability & Performance Metrics ---
  const performanceMetrics = useMemo(() => {
    let grossProfit = 0;
    let grossLoss = 0;
    let wins = 0;
    let losses = 0;
    let breakeven = 0;
    let totalR = 0; // Mock R-multiple based on PnL (assuming 1R = Avg Loss for simplicity if risk not tracked)

    trades.forEach(t => {
      if (t.pnl > 0) {
        grossProfit += t.pnl;
        wins++;
      } else if (t.pnl < 0) {
        grossLoss += Math.abs(t.pnl);
        losses++;
      } else {
        breakeven++;
      }
    });

    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = losses > 0 ? grossLoss / losses : 0;
    const expectancy = (winRate / 100 * avgWin) - ((losses / trades.length) * avgLoss);

    // Calculate Consecutive Wins/Losses
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;
    
    // Sort trades by time for consecutive analysis
    const sortedTrades = [...trades].sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime());
    
    sortedTrades.forEach(t => {
        if (t.pnl > 0) {
            currentWins++;
            currentLosses = 0;
            if (currentWins > maxConsecutiveWins) maxConsecutiveWins = currentWins;
        } else if (t.pnl < 0) {
            currentLosses++;
            currentWins = 0;
            if (currentLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentLosses;
        }
    });

    // Calculate Max Drawdown (Absolute $)
    let peakBalance = 0;
    let currentBalance = 0;
    let maxDrawdown = 0;
    
    sortedTrades.forEach(t => {
        currentBalance += t.pnl;
        if (currentBalance > peakBalance) peakBalance = currentBalance;
        const drawdown = peakBalance - currentBalance;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    return {
      profitFactor: profitFactor.toFixed(2),
      expectancy: expectancy.toFixed(2),
      winRate: winRate.toFixed(1),
      lossRate: trades.length > 0 ? ((losses / trades.length) * 100).toFixed(1) : 0,
      breakevenRate: trades.length > 0 ? ((breakeven / trades.length) * 100).toFixed(1) : 0,
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      totalTrades: trades.length,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      maxDrawdown: maxDrawdown.toFixed(2)
    };
  }, [trades]);

  // --- 3. Behavioral & Time Analysis ---
  const timeAnalysis = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStats = new Array(7).fill(0).map((_, i) => ({ name: days[i], pnl: 0, trades: 0 }));
    const hourStats = new Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, pnl: 0, trades: 0 }));
    
    let totalDuration = 0;
    let durationCount = 0;

    trades.forEach(t => {
      const date = parseISO(t.openTime);
      const day = getDay(date);
      const hour = getHours(date);

      dayStats[day].pnl += t.pnl;
      dayStats[day].trades += 1;

      hourStats[hour].pnl += t.pnl;
      hourStats[hour].trades += 1;

      if (t.closeTime) {
        const close = parseISO(t.closeTime);
        const duration = differenceInMinutes(close, date);
        if (!isNaN(duration)) {
          totalDuration += duration;
          durationCount++;
        }
      }
    });

    const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    return { dayStats, hourStats, avgDuration };
  }, [trades]);

  // --- 4. Setup & Playbook Tracking ---
  const setupStats = useMemo(() => {
    const stats: Record<string, { pnl: number, wins: number, total: number }> = {};

    trades.forEach(t => {
      const strategy = t.strategy || 'Unknown';
      if (!stats[strategy]) stats[strategy] = { pnl: 0, wins: 0, total: 0 };
      
      stats[strategy].pnl += t.pnl;
      stats[strategy].total += 1;
      if (t.pnl > 0) stats[strategy].wins += 1;
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        pnl: data.pnl,
        winRate: (data.wins / data.total) * 100,
        count: data.total
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  // --- 6. Mistakes Heatmap ---
  const mistakesStats = useMemo(() => {
    const mistakes: Record<string, number> = {};

    trades.forEach(t => {
      // Check psychology tag
      if (t.psychology && ['FOMO', 'REVENGE', 'ANXIOUS'].includes(t.psychology)) {
        mistakes[t.psychology] = (mistakes[t.psychology] || 0) + Math.abs(t.pnl < 0 ? t.pnl : 0);
      }
      
      // Check behavior emotions
      t.behavior?.emotions.entry.forEach(e => {
        if (['FOMO', 'REVENGE', 'BOREDOM'].includes(e)) {
           mistakes[e] = (mistakes[e] || 0) + Math.abs(t.pnl < 0 ? t.pnl : 0);
        }
      });
      
      // Check exit reasons
      if (t.behavior?.risk.exitType === 'PANIC') {
         mistakes['PANIC_EXIT'] = (mistakes['PANIC_EXIT'] || 0) + Math.abs(t.pnl < 0 ? t.pnl : 0);
      }
    });

    return Object.entries(mistakes)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [trades]);

  // --- 5. Equity Curve (Simple) ---
  const equityCurve = useMemo(() => {
    let balance = 0;
    return trades
      .slice()
      .sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime())
      .map(t => {
        balance += t.pnl;
        return { date: format(parseISO(t.closeTime), 'MMM d'), balance };
      });
  }, [trades]);

  const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B'];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-sans font-extrabold tracking-tight text-white glow-text-purple">Performance Analysis</h1>
          <p className="text-sm font-mono uppercase tracking-widest text-brand-gray-med mt-2">
            Deep dive into your trading edge and behavior.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-brand-dark/50 px-4 py-2 rounded-xl border border-white/10 shadow-glow-purple">
          <div className="text-right">
            <p className="text-xs text-brand-gray-med uppercase font-mono">Tracker Score</p>
            <div className={`text-2xl font-bold ${trackerScore >= 80 ? 'text-brand-lime glow-text-lime' : trackerScore >= 50 ? 'text-brand-orange' : 'text-red-500'}`}>
              {trackerScore}/100
            </div>
          </div>
          <div className="h-10 w-10 rounded-full border-4 border-white/5 flex items-center justify-center bg-brand-lime/20">
             <Target className="w-5 h-5 text-brand-lime" />
          </div>
        </div>
      </div>

      {/* 2. Profitability & Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-brand-dark/50 border-white/10 shadow-glow-purple backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase text-brand-gray-med">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{performanceMetrics.profitFactor}</div>
            <p className="text-xs text-brand-gray-med mt-1">Target: &gt; 1.5</p>
          </CardContent>
        </Card>
        <Card className="bg-brand-dark/50 border-white/10 shadow-glow-purple backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase text-brand-gray-med">Expectancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${Number(performanceMetrics.expectancy) > 0 ? 'text-brand-lime glow-text-lime' : 'text-brand-orange'}`}>
              {performanceMetrics.expectancy}
            </div>
            <p className="text-xs text-brand-gray-med mt-1">Avg return per trade</p>
          </CardContent>
        </Card>
        <Card className="bg-brand-dark/50 border-white/10 shadow-glow-purple backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase text-brand-gray-med">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brand-lime glow-text-lime">{performanceMetrics.winRate}%</div>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="text-white">{performanceMetrics.avgWin} Avg Win</span>
              <span className="text-brand-gray-med">|</span>
              <span className="text-brand-orange">{performanceMetrics.avgLoss} Avg Loss</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-brand-dark/50 border-white/10 shadow-glow-purple backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase text-brand-gray-med">Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brand-orange">-${performanceMetrics.maxDrawdown}</div>
            <div className="flex gap-2 mt-2 text-xs text-brand-gray-med">
              <span>Max DD</span>
              <span className="text-brand-gray-med">|</span>
              <span className="text-white">{performanceMetrics.maxConsecutiveWins} W</span>
              <span className="text-brand-gray-med">/</span>
              <span className="text-brand-orange">{performanceMetrics.maxConsecutiveLosses} L</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. Behavioral & Time Analysis */}
        <Card className="bg-brand-dark/50 border-white/10 shadow-glow-purple backdrop-blur-md col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-purple" />
              Time Analysis
            </CardTitle>
            <CardDescription className="text-brand-gray-med">P&L Performance by Day & Hour</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="day" className="w-full">
              <TabsList className="bg-black/40 border border-white/10 mb-4">
                <TabsTrigger value="day">Day of Week</TabsTrigger>
                <TabsTrigger value="hour">Time of Day</TabsTrigger>
              </TabsList>
              <TabsContent value="day" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeAnalysis.dayStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="#999" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#999" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A0730', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="pnl" fill="#CCFF00" radius={[4, 4, 0, 0]}>
                      {timeAnalysis.dayStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#CCFF00' : '#FE5000'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="hour" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeAnalysis.hourStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="#999" fontSize={12} tickLine={false} axisLine={false} interval={2} />
                    <YAxis stroke="#999" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A0730', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="pnl" fill="#CCFF00" radius={[4, 4, 0, 0]}>
                       {timeAnalysis.hourStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#CCFF00' : '#FE5000'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 6. Mistakes Heatmap */}
        <Card className="bg-brand-dark/50 border-white/10 shadow-glow-orange backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-brand-orange" />
              Cost of Mistakes
            </CardTitle>
            <CardDescription className="text-brand-gray-med">Total loss from tagged errors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mistakesStats.length > 0 ? (
                mistakesStats.map((stat, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-gray-light font-medium">{stat.name}</span>
                      <span className="text-brand-orange font-mono">-${stat.cost.toFixed(2)}</span>
                    </div>
                    <Progress value={(stat.cost / Math.max(...mistakesStats.map(s => s.cost))) * 100} className="h-2 bg-white/10" indicatorClassName="bg-brand-orange shadow-glow-orange" />
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-brand-gray-med text-sm">
                  No mistakes tagged yet. Good job!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 4. Setup & Playbook Tracking */}
        <Card className="bg-brand-dark/50 border-white/10 shadow-glow-purple backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-brand-purple" />
              Setup Performance
            </CardTitle>
            <CardDescription className="text-brand-gray-med">Which strategies are working?</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {setupStats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                  <div>
                    <div className="font-bold text-white">{stat.name}</div>
                    <div className="text-xs text-brand-gray-med">{stat.count} trades</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono font-bold ${stat.pnl > 0 ? 'text-brand-lime' : 'text-brand-orange'}`}>
                      {stat.pnl > 0 ? '+' : ''}{stat.pnl.toFixed(2)}
                    </div>
                    <div className="text-xs text-brand-gray-light">{stat.winRate.toFixed(1)}% Win Rate</div>
                  </div>
                </div>
              ))}
              {setupStats.length === 0 && (
                <div className="text-center py-8 text-brand-gray-med">No strategies logged.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 5. Equity Curve */}
        <Card className="bg-brand-dark/50 border-white/10 shadow-glow-purple backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-brand-lime" />
              Equity Curve
            </CardTitle>
            <CardDescription className="text-brand-gray-med">Account growth over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#CCFF00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="#999" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#999" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A0730', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                />
                <Area type="monotone" dataKey="balance" stroke="#CCFF00" fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
