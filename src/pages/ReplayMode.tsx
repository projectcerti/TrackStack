import React, { useState } from 'react';
import { useTrades } from '@/context/TradeContext';
import { Trade } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isValid } from 'date-fns';
import ReplayChart from '@/components/ReplayChart';
import { PlayCircle } from 'lucide-react';

const ReplayMode = () => {
  const { trades } = useTrades();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleReplay = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsModalOpen(true);
  };

  const formatDateSafe = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isValid(date) ? format(date, 'MMM dd, yyyy HH:mm') : 'Invalid Date';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-sans font-extrabold tracking-tight text-white glow-text-purple">Replay Mode</h1>
          <p className="text-sm font-mono uppercase tracking-widest text-brand-gray-med mt-2">
            Relive your trades and refine your execution.
          </p>
        </div>
      </div>

      <Card className="bg-surface border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white">Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-500 uppercase bg-surface/50 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Symbol</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Result</th>
                  <th className="px-6 py-3">P&L</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-800 hover:bg-surface/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      {formatDateSafe(trade.openTime)}
                    </td>
                    <td className="px-6 py-4 font-mono text-primary">{trade.symbol}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        trade.type === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.pnl >= 0 ? 'WIN' : 'LOSS'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary"
                        onClick={() => handleReplay(trade)}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Replay
                      </Button>
                    </td>
                  </tr>
                ))}
                {trades.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No trades found. Log a trade to start replaying.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] h-[90vh] bg-background border-gray-800 text-white flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-gray-800 bg-surface/50">
            <DialogTitle className="flex items-center gap-4 text-xl font-bold">
              <span className="text-primary">Replay: {selectedTrade?.symbol}</span>
              <span className="text-sm font-normal text-gray-400">
                {formatDateSafe(selectedTrade?.openTime)}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 w-full h-full bg-black relative">
            {selectedTrade && isModalOpen && <ReplayChart trade={selectedTrade} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReplayMode;
