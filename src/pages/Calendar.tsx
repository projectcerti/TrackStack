import React, { useState, useMemo } from 'react';
import { useTrades } from '@/context/TradeContext';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  getDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval
} from 'date-fns';
import { ChevronLeft, ChevronRight, Settings, Info, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function Calendar() {
  const { dailyStats } = useTrades();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [displayStats, setDisplayStats] = useState({
    rMultiple: true,
    dailyPnL: true,
    trades: true,
    winRate: true
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Get all weeks in the month
  const weeks = useMemo(() => {
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return eachWeekOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  const getDayStats = (date: Date) => {
    return dailyStats.find(stat => isSameDay(new Date(stat.date), date));
  };

  // Calculate Monthly Stats
  const monthlyStats = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    let pnl = 0;
    let tradedDays = 0;
    
    days.forEach(day => {
      const stat = getDayStats(day);
      if (stat && stat.tradesCount > 0) {
        pnl += stat.pnl;
        tradedDays += 1;
      }
    });

    return { pnl, tradedDays };
  }, [dailyStats, monthStart, monthEnd]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-sans font-extrabold tracking-tight text-white glow-text-purple">Profit Tracker</h1>
          <p className="text-sm font-mono uppercase tracking-widest text-brand-gray-med mt-2">
            Visualize your performance over time.
          </p>
        </div>
      </div>

      {/* Navigation & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6">
        
        {/* Left: Navigation */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handleToday}
            className="text-xs font-bold text-brand-gray-med hover:text-white uppercase tracking-wider flex items-center gap-1 mr-2"
          >
            TODAY
          </button>
          
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-white/5 rounded-full text-brand-gray-med hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xl font-bold text-white min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-white/5 rounded-full text-brand-gray-med hover:text-white transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center: Monthly Stats */}
        <div className="bg-black/40 border border-white/10 rounded-full px-6 py-2 flex items-center gap-4 shadow-lg backdrop-blur-md">
          <span className="text-sm text-brand-gray-med font-medium">Monthly stats:</span>
          <span className={cn(
            "text-lg font-bold font-mono",
            monthlyStats.pnl >= 0 ? "text-brand-lime" : "text-brand-purple"
          )}>
            ${monthlyStats.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-sm font-bold bg-white/5 px-2 py-0.5 rounded text-brand-gray-light">
            {monthlyStats.tradedDays} days
          </span>
          <div className="h-4 w-px bg-white/10 mx-2" />
          
          {/* Settings Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-brand-gray-med hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 bg-brand-dark border-white/10 text-white p-4" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-brand-gray-med mb-2">Display stats</h4>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="rMultiple" 
                    checked={displayStats.rMultiple}
                    onCheckedChange={(checked) => setDisplayStats(prev => ({ ...prev, rMultiple: !!checked }))}
                    className="border-white/20 data-[state=checked]:bg-brand-purple data-[state=checked]:border-brand-purple"
                  />
                  <Label htmlFor="rMultiple" className="text-sm cursor-pointer">R Multiple</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="dailyPnL" 
                    checked={displayStats.dailyPnL}
                    onCheckedChange={(checked) => setDisplayStats(prev => ({ ...prev, dailyPnL: !!checked }))}
                    className="border-white/20 data-[state=checked]:bg-brand-purple data-[state=checked]:border-brand-purple"
                  />
                  <Label htmlFor="dailyPnL" className="text-sm cursor-pointer">Daily P/L</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="trades" 
                    checked={displayStats.trades}
                    onCheckedChange={(checked) => setDisplayStats(prev => ({ ...prev, trades: !!checked }))}
                    className="border-white/20 data-[state=checked]:bg-brand-purple data-[state=checked]:border-brand-purple"
                  />
                  <Label htmlFor="trades" className="text-sm cursor-pointer">Number of trades</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="winRate" 
                    checked={displayStats.winRate}
                    onCheckedChange={(checked) => setDisplayStats(prev => ({ ...prev, winRate: !!checked }))}
                    className="border-white/20 data-[state=checked]:bg-brand-purple data-[state=checked]:border-brand-purple"
                  />
                  <Label htmlFor="winRate" className="text-sm cursor-pointer">Day Winrate</Label>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <button className="text-brand-gray-med hover:text-white transition-colors">
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Navigation Arrows */}
        <div className="flex items-center gap-2">
           {/* Placeholder to balance layout if needed, or just keep it simple */}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Week Header */}
          <div className="grid grid-cols-[repeat(7,1fr)_200px] gap-4 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-mono text-xs uppercase text-brand-gray-med py-2 border border-transparent">
                {day}
              </div>
            ))}
            <div className="text-center font-mono text-xs uppercase text-brand-gray-med py-2">
              Weekly Stats
            </div>
          </div>

          {/* Weeks */}
          <div className="space-y-4">
            {weeks.map((weekStart, weekIndex) => {
              const weekEnd = endOfWeek(weekStart);
              const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
              
              // Calculate Weekly Stats
              let weeklyPnL = 0;
              let weeklyTradedDays = 0;
              
              daysInWeek.forEach(day => {
                // Only count if day is in current month (optional, but usually weekly stats include overlap)
                // Actually, usually calendar views show full weeks even if they overlap months.
                // But for "Monthly" view, we might want to filter.
                // However, standard is to show the full week.
                const stat = getDayStats(day);
                if (stat && stat.tradesCount > 0) {
                  weeklyPnL += stat.pnl;
                  weeklyTradedDays += 1;
                }
              });

              return (
                <div key={weekStart.toISOString()} className="grid grid-cols-[repeat(7,1fr)_200px] gap-2">
                  {daysInWeek.map((day) => {
                    const stat = getDayStats(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const hasTrades = stat && stat.tradesCount > 0;
                    const isProfit = stat && stat.pnl > 0;
                    const isLoss = stat && stat.pnl < 0;

                    let bgClass = "bg-white/5 border-white/5";
                    if (hasTrades) {
                      if (isProfit) bgClass = "bg-brand-lime/20 border-brand-lime/40 hover:bg-brand-lime/30";
                      else if (isLoss) bgClass = "bg-brand-purple/20 border-brand-purple/40 hover:bg-brand-purple/30";
                    }

                    return (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "relative h-32 rounded-xl border p-3 transition-all",
                          bgClass,
                          !isCurrentMonth && "opacity-30 grayscale"
                        )}
                      >
                        {/* Date Number */}
                        <div className="flex justify-between items-start">
                          <span className={cn(
                            "text-xl font-mono font-bold",
                            isToday ? "bg-brand-lime text-black w-8 h-8 flex items-center justify-center rounded-full" : "text-brand-gray-med"
                          )}>
                            {format(day, 'd')}
                          </span>
                        </div>

                        {/* Stats Content */}
                        {hasTrades && (stat) && (
                          <div className="mt-2 flex flex-col gap-1 items-center justify-center h-[calc(100%-24px)]">
                            
                            {displayStats.dailyPnL && (
                              <span className={cn(
                                "text-2xl font-bold tracking-tight",
                                isProfit ? "text-brand-lime" : "text-brand-purple"
                              )}>
                                ${Math.abs(stat.pnl).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            )}

                            {displayStats.trades && (
                              <span className="text-[10px] font-medium text-brand-gray-med uppercase">
                                {stat.tradesCount} trade{stat.tradesCount !== 1 ? 's' : ''}
                              </span>
                            )}

                            <div className="flex gap-2 mt-1">
                              {displayStats.rMultiple && stat.rMultiple !== 0 && (
                                <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40",
                                  stat.rMultiple > 0 ? "text-brand-lime" : "text-brand-purple"
                                )}>
                                  {stat.rMultiple > 0 ? '+' : ''}{stat.rMultiple.toFixed(2)}R
                                </span>
                              )}
                              
                              {displayStats.winRate && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40 text-brand-gray-light">
                                  {Math.round(stat.winRate)}%
                                </span>
                              )}
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Weekly Stats Card */}
                  <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col justify-center gap-2 h-32 backdrop-blur-sm">
                    <span className="text-xs font-mono uppercase text-brand-gray-med">
                      Week {weekIndex + 1}
                    </span>
                    <span className={cn(
                      "text-2xl font-bold tracking-tight",
                      weeklyPnL >= 0 ? "text-brand-lime" : "text-brand-purple"
                    )}>
                      ${weeklyPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-bold bg-white/5 px-2 py-1 rounded text-brand-gray-light w-fit">
                      {weeklyTradedDays} days
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
