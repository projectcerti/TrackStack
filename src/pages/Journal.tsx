import React, { useState } from 'react';
import { useTrades } from '@/context/TradeContext';
import { format, isSameDay, parseISO } from 'date-fns';
import { Filter, ChevronDown, Pencil, Trash2, X, BrainCircuit } from 'lucide-react';
import AddTradeDialog from '@/components/AddTradeDialog';
import EditTradeDialog from '@/components/EditTradeDialog';
import PostTradeWizard from '@/components/PostTradeWizard';
import CsvImportDialog from '@/components/CsvImportDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trade } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

import { Skeleton } from '@/components/ui/skeleton';

export default function Journal() {
  const { trades, deleteTrade, deleteTrades, loading } = useTrades();
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [wizardTrade, setWizardTrade] = useState<Trade | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // ... (rest of the filter logic)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center py-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>

        <div className="border border-white/10 rounded-xl overflow-hidden">
          <div className="bg-black/60 p-4 border-b border-white/10">
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Filter States
  const [strategyFilter, setStrategyFilter] = useState<string>('ALL');
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('ALL');

  // Unique values for filters
  const strategies = Array.from(new Set(trades.map(t => t.strategy).filter(Boolean)));
  const symbols = Array.from(new Set(trades.map(t => t.symbol).filter(Boolean)));

  const filteredTrades = trades.filter(trade => {
    if (strategyFilter !== 'ALL' && trade.strategy !== strategyFilter) return false;
    if (symbolFilter !== 'ALL' && trade.symbol !== symbolFilter) return false;
    if (statusFilter !== 'ALL' && trade.status !== statusFilter) return false;
    if (ratingFilter !== 'ALL' && trade.setupRating !== ratingFilter) return false;
    
    if (dateRangeFilter !== 'ALL') {
      const tradeDate = new Date(trade.openTime);
      if (isNaN(tradeDate.getTime())) return false;
      
      const today = new Date();
      
      if (dateRangeFilter === 'TODAY') {
        if (!isSameDay(tradeDate, today)) return false;
      } else if (dateRangeFilter === 'YESTERDAY') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (!isSameDay(tradeDate, yesterday)) return false;
      } else if (dateRangeFilter === 'WEEK') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (tradeDate < weekAgo) return false;
      } else if (dateRangeFilter === 'MONTH') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (tradeDate < monthAgo) return false;
      }
    }
    
    return true;
  });

  const clearFilters = () => {
    setStrategyFilter('ALL');
    setSymbolFilter('ALL');
    setStatusFilter('ALL');
    setRatingFilter('ALL');
    setDateRangeFilter('ALL');
  };

  const handleEditClick = (trade: Trade, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrade(trade);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteTrade(deleteId);
      toast.success('Trade deleted');
      setDeleteId(null);
    }
  };

  const handleSelectTrade = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTradeIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTradeIds.length === filteredTrades.length) {
      setSelectedTradeIds([]);
    } else {
      setSelectedTradeIds(filteredTrades.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await deleteTrades(selectedTradeIds);
      toast.success(`${selectedTradeIds.length} trades deleted`);
      setSelectedTradeIds([]);
      setIsBulkDeleteOpen(false);
    } catch (error) {
      toast.error('Failed to delete trades');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-sans font-extrabold tracking-tight text-white glow-text-purple">Trade Journal</h1>
          <p className="text-sm font-mono uppercase tracking-widest text-brand-gray-med mt-2">
            Review and manage your trading history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedTradeIds.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setIsBulkDeleteOpen(true)}
              className="bg-brand-orange/20 text-brand-orange hover:bg-brand-orange/30 border border-brand-orange/30 rounded-full font-mono text-xs uppercase"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Delete ({selectedTradeIds.length})
            </Button>
          )}
          <CsvImportDialog />
          <AddTradeDialog />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 items-center py-2">
        <div className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full text-xs font-mono uppercase bg-black/40 text-white">
          <Filter className="w-3 h-3" />
          Filters
        </div>
        
        {/* Strategy Filter */}
        <Select value={strategyFilter} onValueChange={setStrategyFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs font-mono uppercase bg-black/40 border-white/10 rounded-full focus:ring-brand-purple text-white">
            <SelectValue placeholder="Strategy" />
          </SelectTrigger>
          <SelectContent className="bg-brand-dark text-white border-white/10">
            <SelectItem value="ALL">Strategy</SelectItem>
            {strategies.map(s => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Symbol Filter */}
        <Select value={symbolFilter} onValueChange={setSymbolFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs font-mono uppercase bg-black/40 border-white/10 rounded-full focus:ring-brand-purple text-white">
            <SelectValue placeholder="Symbol" />
          </SelectTrigger>
          <SelectContent className="bg-brand-dark text-white border-white/10">
            <SelectItem value="ALL">Symbol</SelectItem>
            {symbols.map(s => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[110px] h-8 text-xs font-mono uppercase bg-black/40 border-white/10 rounded-full focus:ring-brand-purple text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-brand-dark text-white border-white/10">
            <SelectItem value="ALL">Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        {/* Rating Filter */}
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[110px] h-8 text-xs font-mono uppercase bg-black/40 border-white/10 rounded-full focus:ring-brand-purple text-white">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent className="bg-brand-dark text-white border-white/10">
            <SelectItem value="ALL">Rating</SelectItem>
            <SelectItem value="A+">A+</SelectItem>
            <SelectItem value="A">A</SelectItem>
            <SelectItem value="B+">B+</SelectItem>
            <SelectItem value="B">B</SelectItem>
            <SelectItem value="C">C</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
          <SelectTrigger className="w-[110px] h-8 text-xs font-mono uppercase bg-black/40 border-white/10 rounded-full focus:ring-brand-purple text-white">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent className="bg-brand-dark text-white border-white/10">
            <SelectItem value="ALL">Date</SelectItem>
            <SelectItem value="TODAY">Today</SelectItem>
            <SelectItem value="YESTERDAY">Yesterday</SelectItem>
            <SelectItem value="WEEK">Last 7 Days</SelectItem>
            <SelectItem value="MONTH">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>

        {(strategyFilter !== 'ALL' || symbolFilter !== 'ALL' || statusFilter !== 'ALL' || ratingFilter !== 'ALL' || dateRangeFilter !== 'ALL') && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-brand-orange hover:text-brand-orange/80 hover:bg-brand-orange/10 rounded-full">
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Trade Table */}
      <div className="overflow-x-auto border border-white/10 rounded-xl shadow-glow-purple">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/60 text-brand-gray-med font-mono uppercase text-xs tracking-wider border-b border-white/10 backdrop-blur-md">
            <tr>
              <th className="px-4 py-3 font-normal">Date</th>
              <th className="px-4 py-3 font-normal">Symbol</th>
              <th className="px-4 py-3 font-normal">Type</th>
              <th className="px-4 py-3 font-normal text-right">Size</th>
              <th className="px-4 py-3 font-normal text-right">Entry</th>
              <th className="px-4 py-3 font-normal text-right">Exit</th>
              <th className="px-4 py-3 font-normal text-right">P&L</th>
              <th className="px-4 py-3 font-normal text-center">Status</th>
              <th className="px-4 py-3 font-normal">Strategy</th>
              <th className="px-4 py-3 font-normal w-10 text-center">
                <input 
                  type="checkbox" 
                  className="rounded border-white/20 bg-black/40 text-brand-purple focus:ring-brand-purple"
                  checked={filteredTrades.length > 0 && selectedTradeIds.length === filteredTrades.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-4 py-3 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-transparent">
            {filteredTrades.length > 0 ? (
              filteredTrades.map((trade) => (
                <tr key={trade.id} className={`hover:bg-white/5 transition-colors group cursor-pointer ${selectedTradeIds.includes(trade.id) ? 'bg-brand-purple/5' : ''}`} onClick={() => {
                  setEditingTrade(trade);
                  setIsEditOpen(true);
                }}>
                  <td className="px-4 py-3 font-mono text-brand-gray-med">
                    {(() => {
                      const d = new Date(trade.openTime);
                      return isNaN(d.getTime()) ? 'Invalid Date' : format(d, 'MMM d, HH:mm');
                    })()}
                  </td>
                  <td className="px-4 py-3 font-bold text-white">{trade.symbol}</td>
                  <td className={`px-4 py-3 font-mono text-xs uppercase ${trade.type === 'BUY' ? 'text-brand-lime' : 'text-brand-orange'}`}>{trade.type}</td>
                  <td className="px-4 py-3 font-mono text-right text-brand-gray-light">{trade.size}</td>
                  <td className="px-4 py-3 font-mono text-right text-brand-gray-med">{trade.entryPrice?.toFixed(5) || '-'}</td>
                  <td className="px-4 py-3 font-mono text-right text-brand-gray-med">{trade.exitPrice?.toFixed(5) || '-'}</td>
                  <td className={`px-4 py-3 font-mono text-right font-bold ${Number(trade.pnl) > 0 ? 'text-brand-lime glow-text-lime' : 'text-brand-orange'}`}>
                    {Number(trade.pnl) > 0 ? '+' : ''}{(trade.pnl ?? 0).toFixed(2)}
                    <span className="text-xs text-brand-gray-med ml-1">
                      ({trade.pnlPercent ? (trade.pnlPercent > 0 ? '+' : '') + trade.pnlPercent.toFixed(2) : '0.00'}%)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wide ${
                      trade.status === 'CLOSED' ? 'bg-white/10 text-brand-gray-med' : 'bg-brand-lime text-black glow-lime'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-gray-med italic">{trade.strategy || '-'}</td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-white/20 bg-black/40 text-brand-purple focus:ring-brand-purple"
                      checked={selectedTradeIds.includes(trade.id)}
                      onChange={(e) => handleSelectTrade(trade.id, e as any)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-6 w-6 hover:bg-brand-purple/20 ${trade.behavior ? 'text-brand-purple' : 'text-brand-gray-med'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setWizardTrade(trade);
                          setIsWizardOpen(true);
                        }}
                        title="Psychology Analysis"
                      >
                        <BrainCircuit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/10 text-brand-gray-med hover:text-white" onClick={(e) => handleEditClick(trade, e)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-brand-orange/20 text-brand-orange" onClick={(e) => handleDeleteClick(trade.id, e)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-brand-gray-med font-mono text-sm uppercase">
                  No trades found. Log a trade to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingTrade && (
        <EditTradeDialog 
          trade={editingTrade} 
          open={isEditOpen} 
          onOpenChange={setIsEditOpen} 
        />
      )}

      {wizardTrade && (
        <PostTradeWizard
          trade={wizardTrade}
          open={isWizardOpen}
          onOpenChange={setIsWizardOpen}
        />
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[425px] bg-brand-dark border-white/10 text-white shadow-glow-orange">
          <DialogHeader>
            <DialogTitle className="text-brand-orange glow-text-orange">Delete Trade</DialogTitle>
            <DialogDescription className="text-brand-gray-med">
              Are you sure you want to delete this trade? This action cannot be undone and will adjust your account balance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="border-white/10 hover:bg-white/5 text-white">Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} className="bg-brand-orange hover:bg-brand-orange/90 text-black font-bold">Delete Trade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="sm:max-w-[425px] bg-brand-dark border-white/10 text-white shadow-glow-orange">
          <DialogHeader>
            <DialogTitle className="text-brand-orange glow-text-orange">Delete Multiple Trades</DialogTitle>
            <DialogDescription className="text-brand-gray-med">
              Are you sure you want to delete {selectedTradeIds.length} trades? This action cannot be undone and will adjust your account balance for each trade.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)} className="border-white/10 hover:bg-white/5 text-white">Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} className="bg-brand-orange hover:bg-brand-orange/90 text-black font-bold">Delete {selectedTradeIds.length} Trades</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
