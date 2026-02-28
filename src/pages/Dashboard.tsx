import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTrades } from '@/context/TradeContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, DollarSign, Percent, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { trades, account, dailyStats, syncBroker, loading } = useTrades();

  const handleSync = () => {
    const promise = syncBroker();
    toast.promise(promise, {
      loading: 'Syncing with broker...',
      success: 'Trades synced successfully!',
      error: 'Error syncing trades',
    });
  };

  // Calculate aggregate stats
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : "0.0";
  const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0).toFixed(2);
  const grossProfit = trades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "∞" : "0.00";

  const recentTrades = trades.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right space-y-1">
              <Skeleton className="h-3 w-12 ml-auto" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="text-right border-l border-white/10 pl-4 space-y-1">
              <Skeleton className="h-3 w-12 ml-auto" />
              <Skeleton className="h-7 w-20" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="glass-card border-0 shadow-none rounded-3xl p-6 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-10 w-24" />
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 glass-card border-0 rounded-3xl p-6">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48 mb-6" />
            <Skeleton className="h-[300px] w-full" />
          </Card>
          <Card className="glass-card border-0 rounded-3xl p-6">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-sans font-extrabold tracking-tight text-white glow-text-purple">Dashboard</h1>
          <p className="text-sm font-mono uppercase tracking-widest text-brand-gray-med mt-2">
            Account: {account.name} ({account.id})
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="font-mono text-xs uppercase tracking-wider hidden md:flex border-white/10 text-brand-gray-med hover:bg-brand-lime/10 hover:text-brand-lime rounded-full" onClick={handleSync}>
            <RefreshCw className="w-3 h-3 mr-2" />
            Sync
          </Button>
          <div className="text-right">
            <p className="text-xs font-mono uppercase text-brand-gray-med">Equity</p>
            <p className="text-2xl font-mono font-bold text-brand-lime glow-text-lime">
              ${account?.equity?.toLocaleString() ?? '0.00'}
            </p>
          </div>
          <div className="text-right border-l border-white/10 pl-4">
            <p className="text-xs font-mono uppercase text-brand-gray-med">Balance</p>
            <p className="text-xl font-mono text-brand-gray-light">
              ${account?.balance?.toLocaleString() ?? '0.00'}
            </p>
          </div>
        </div>
      </div>


      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Net P&L" 
          value={`$${totalPnL}`} 
          trend={Number(totalPnL) > 0 ? 'up' : 'down'}
          icon={DollarSign}
        />
        <KpiCard 
          title="Win Rate" 
          value={`${winRate}%`} 
          trend={Number(winRate) > 50 ? 'up' : 'down'}
          icon={Percent}
        />
        <KpiCard 
          title="Profit Factor" 
          value={profitFactor} 
          trend={Number(profitFactor) > 1.5 ? 'up' : 'down'}
          icon={TrendingUp}
        />
        <KpiCard 
          title="Total Trades" 
          value={totalTrades.toString()} 
          trend="neutral"
          icon={TrendingDown} // Just as a placeholder icon
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Equity Curve */}
        <Card className="lg:col-span-2 glass-card shadow-none rounded-3xl border-0">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="font-sans font-bold text-xl text-white">Equity Curve</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-widest text-brand-gray-med">
              Performance over last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              {dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyStats}>
                    <defs>
                      <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#CCFF00" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(str) => {
                        const d = new Date(str);
                        return isNaN(d.getTime()) ? '' : format(d, 'MMM d');
                      }}
                      stroke="#525252"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#525252"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const d = new Date(label);
                          const dateStr = isNaN(d.getTime()) ? 'Invalid Date' : format(d, 'MMM d, yyyy');
                          return (
                            <div className="bg-black/90 backdrop-blur-md p-3 border border-white/10 shadow-glow-lime rounded-xl">
                              <p className="text-brand-gray-med font-mono text-xs mb-1">{dateStr}</p>
                              <p className="text-brand-lime font-mono font-bold text-lg glow-text-lime">
                                ${Number(payload[0].value).toFixed(2)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pnl" 
                      stroke="#CCFF00" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPnl)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-brand-gray-med font-mono text-sm uppercase">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Trades List */}
        <Card className="glass-card shadow-none rounded-3xl border-0 overflow-hidden">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="font-sans font-bold text-xl text-white">Recent Trades</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-widest text-brand-gray-med">
              Last 5 executions
            </CardDescription>
          </CardHeader>
          <div className="divide-y divide-white/5">
            {recentTrades.length > 0 ? (
              recentTrades.map((trade) => (
                <div key={trade.id} className="p-4 hover:bg-white/5 transition-colors group cursor-pointer">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold font-mono text-white group-hover:text-brand-orange transition-colors">{trade.symbol}</span>
                    <span className={`font-mono text-sm ${trade.pnl > 0 ? 'text-brand-lime glow-text-lime' : 'text-brand-orange'}`}>
                      {trade.pnl > 0 ? '+' : ''}{trade.pnl}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-brand-gray-med group-hover:text-brand-gray-light">
                    <span className="uppercase tracking-wider">{trade.type} • {trade.size} Lots</span>
                    <span>{(() => {
                      const d = new Date(trade.closeTime);
                      return isNaN(d.getTime()) ? 'Invalid Date' : format(d, 'MMM d, HH:mm');
                    })()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-brand-gray-med font-mono text-sm uppercase">
                No trades logged yet
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, icon: Icon }: { title: string, value: string, trend: 'up' | 'down' | 'neutral', icon: any }) {
  return (
    <Card className="glass-card border-0 shadow-none rounded-3xl group hover:shadow-glow-purple transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <p className="font-sans font-bold text-sm text-brand-gray-med group-hover:text-white transition-colors">{title}</p>
          <div className="p-2 rounded-full bg-white/5 group-hover:bg-brand-purple/20 transition-colors">
            <Icon className="w-4 h-4 text-brand-gray-med group-hover:text-brand-purple transition-colors" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-mono font-bold text-white tracking-tighter group-hover:text-brand-purple transition-colors">{value}</h3>
          {trend !== 'neutral' && (
            <span className={`flex items-center text-xs font-bold mb-1 ${trend === 'up' ? 'text-brand-lime' : 'text-brand-orange'}`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
