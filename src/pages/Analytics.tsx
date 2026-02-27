import React from 'react';
import { useTrades } from '@/context/TradeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Analytics() {
  const { trades } = useTrades();

  // Group trades by strategy
  const strategyStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    trades.forEach(trade => {
      const strategy = trade.strategy || 'Unknown';
      stats[strategy] = (stats[strategy] || 0) + trade.pnl;
    });
    return Object.entries(stats).map(([name, pnl]) => ({ name, pnl }));
  }, [trades]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-sans font-extrabold tracking-tight text-white glow-text-purple">Analytics</h1>
          <p className="text-sm font-mono uppercase tracking-widest text-brand-gray-med mt-2">
            Deep dive into your trading metrics.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-black/40 border border-white/10 shadow-glow-purple rounded-xl backdrop-blur-md">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-sans font-bold text-xl text-white">Strategy Performance</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-widest text-brand-gray-med">
              Net P&L by Strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              {strategyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={strategyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#999"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#999"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ 
                        backgroundColor: '#1A0730', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: '#ffffff',
                        fontFamily: 'monospace',
                        boxShadow: '0 0 20px rgba(189, 75, 248, 0.2)'
                      }}
                    />
                    <Bar dataKey="pnl">
                      {strategyStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl > 0 ? '#BD4BF8' : '#FE5000'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-brand-gray-med font-mono text-sm uppercase">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for Win Rate by Time of Day */}
        <Card className="bg-black/40 border border-white/10 shadow-glow-orange rounded-xl backdrop-blur-md">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-sans font-bold text-xl text-white">Win Rate by Session</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-widest text-brand-gray-med">
              Performance by Market Session
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex items-center justify-center h-[300px]">
            <p className="font-mono text-brand-gray-med uppercase tracking-widest text-sm">Coming Soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
