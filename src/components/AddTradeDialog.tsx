import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useTrades } from '@/context/TradeContext';
import { toast } from 'sonner';
import { Exit } from '@/types';

export default function AddTradeDialog() {
  const { addTrade } = useTrades();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    type: '',
    entryPrice: '',
    exitPrice: '',
    size: '',
    pnl: '', // New field for manual P&L
    strategy: '',
    psychology: '',
    tradingViewUrl: '',
    setupRating: '',
    notes: '',
    slStatus: 'INITIAL',
    movedSlPrice: '',
    openTime: new Date().toISOString().slice(0, 16),
    closeTime: new Date().toISOString().slice(0, 16)
  });

  const [exits, setExits] = useState<Omit<Exit, 'id'>[]>([]);

  const addExit = () => {
    setExits([...exits, { type: 'PARTIAL_1', percentage: 0, price: 0 }]);
  };

  const removeExit = (index: number) => {
    setExits(exits.filter((_, i) => i !== index));
  };

  const updateExit = (index: number, field: keyof Omit<Exit, 'id'>, value: any) => {
    const newExits = [...exits];
    newExits[index] = { ...newExits[index], [field]: value };
    setExits(newExits);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation: Symbol, Type, and either (Entry+Exit+Size) OR (P&L) must be present
    if (!formData.symbol || !formData.type) {
      toast.error('Please fill in Symbol and Type');
      return;
    }

    const hasPriceData = formData.entryPrice && formData.size && (formData.exitPrice || exits.length > 0);
    const hasPnlData = formData.pnl;

    if (!hasPriceData && !hasPnlData) {
      toast.error('Please enter either Trade Details (Entry, Exit/Exits, Size) OR Profit/Loss amount');
      return;
    }

    // Calculate P&L from exits if not manually provided
    let calculatedPnl = undefined;
    let finalExitPrice = Number(formData.exitPrice) || 0;

    if (!hasPnlData && exits.length > 0) {
        let totalPnl = 0;
        let totalExitPrice = 0;
        let totalPercentage = 0;
        const entry = Number(formData.entryPrice);
        const size = Number(formData.size);
        const isBuy = formData.type === 'BUY';

        exits.forEach(exit => {
            const exitPnl = (exit.price - entry) * (size * (exit.percentage / 100)) * (isBuy ? 1 : -1) * 100; // Assuming standard lot size multiplier logic from context
             // Note: The context logic uses * 100 for PnL calc, keeping consistent.
             // Actually, context uses: (exit - entry) * size * (isBuy ? 1 : -1) * 100
            totalPnl += exitPnl;
            totalExitPrice += exit.price * (exit.percentage / 100);
            totalPercentage += exit.percentage;
        });
        
        // If exits don't sum to 100%, assume remaining is closed at main exit price if provided, or warn?
        // For now, let's just use the calculated PnL from exits + remaining if exitPrice is set
        if (totalPercentage < 100 && formData.exitPrice) {
            const remainingPct = 100 - totalPercentage;
            const remainingPnl = (Number(formData.exitPrice) - entry) * (size * (remainingPct / 100)) * (isBuy ? 1 : -1) * 100;
            totalPnl += remainingPnl;
            totalExitPrice += Number(formData.exitPrice) * (remainingPct / 100);
        }
        
        calculatedPnl = totalPnl;
        // If we have exits, the "exitPrice" field on trade becomes the weighted average
        if (totalPercentage > 0) {
             finalExitPrice = totalExitPrice; // Weighted average
        }
    }

    const parsedOpenTime = formData.openTime ? new Date(formData.openTime) : new Date();
    const parsedCloseTime = formData.closeTime ? new Date(formData.closeTime) : new Date();

    addTrade({
      symbol: formData.symbol.toUpperCase(),
      type: formData.type as 'BUY' | 'SELL',
      entryPrice: Number(formData.entryPrice) || 0,
      exitPrice: finalExitPrice,
      size: Number(formData.size) || 0,
      pnl: hasPnlData ? Number(formData.pnl) : calculatedPnl,
      strategy: formData.strategy,
      psychology: formData.psychology as any,
      tradingViewUrl: formData.tradingViewUrl,
      setupRating: formData.setupRating as any,
      notes: formData.notes,
      slStatus: formData.slStatus as any,
      movedSlPrice: formData.movedSlPrice ? Number(formData.movedSlPrice) : undefined,
      exits: exits.map(e => ({ ...e, id: crypto.randomUUID() })),
      openTime: parsedOpenTime.toISOString(),
      closeTime: parsedCloseTime.toISOString(),
    });

    toast.success('Trade logged successfully');
    setOpen(false);
    setFormData({
      symbol: '',
      type: '',
      entryPrice: '',
      exitPrice: '',
      size: '',
      pnl: '',
      strategy: '',
      psychology: '',
      tradingViewUrl: '',
      setupRating: '',
      notes: '',
      slStatus: 'INITIAL',
      movedSlPrice: '',
      openTime: new Date().toISOString().slice(0, 16),
      closeTime: new Date().toISOString().slice(0, 16)
    });
    setExits([]);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-black/40 text-white hover:bg-white/10 border border-white/10 shadow-glow-purple">
          <Plus className="w-4 h-4 mr-2" />
          Log Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] bg-brand-dark border-white/10 text-white max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-black [&::-webkit-scrollbar-thumb]:bg-brand-purple [&::-webkit-scrollbar-thumb]:rounded-full shadow-glow-purple">
        <DialogHeader>
          <DialogTitle className="text-brand-purple glow-text-purple text-xl font-bold tracking-tight">Log New Trade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Core Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Symbol *</Label>
                <Input 
                  id="symbol" 
                  placeholder="EURUSD" 
                  value={formData.symbol}
                  onChange={(e) => handleChange('symbol', e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Type *</Label>
                <Select onValueChange={(val) => handleChange('type', val)} value={formData.type}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white focus:ring-brand-purple">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-brand-dark border-white/10 text-white">
                    <SelectItem value="BUY" className="focus:bg-brand-purple/20 focus:text-white">BUY</SelectItem>
                    <SelectItem value="SELL" className="focus:bg-brand-purple/20 focus:text-white">SELL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="openTime" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Open Date & Time *</Label>
                <Input 
                  id="openTime" 
                  type="datetime-local" 
                  value={formData.openTime}
                  onChange={(e) => handleChange('openTime', e.target.value)}
                  className="bg-black/40 border-white/10 text-white focus-visible:ring-brand-purple"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closeTime" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Close Date & Time *</Label>
                <Input 
                  id="closeTime" 
                  type="datetime-local" 
                  value={formData.closeTime}
                  onChange={(e) => handleChange('closeTime', e.target.value)}
                  className="bg-black/40 border-white/10 text-white focus-visible:ring-brand-purple"
                />
              </div>
            </div>

            {/* Entry & Size */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Entry Price</Label>
                <Input 
                  id="entry" 
                  type="number" 
                  step="0.00001" 
                  placeholder="1.0000" 
                  value={formData.entryPrice}
                  onChange={(e) => handleChange('entryPrice', e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Size (Lots)</Label>
                <Input 
                  id="size" 
                  type="number" 
                  step="0.01" 
                  placeholder="1.0" 
                  value={formData.size}
                  onChange={(e) => handleChange('size', e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
                />
              </div>
            </div>

            {/* Partials & Exits Section */}
            <div className="space-y-3 border border-white/10 rounded-lg p-4 bg-white/5">
                <div className="flex justify-between items-center">
                    <Label className="text-brand-purple font-mono uppercase text-xs tracking-wider">Partials & Exits</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addExit} className="text-xs text-brand-purple hover:text-brand-purple/80 hover:bg-brand-purple/10">
                        <Plus className="w-3 h-3 mr-1" /> Add Exit
                    </Button>
                </div>
                
                {exits.length === 0 && (
                     <div className="space-y-2">
                        <Label htmlFor="exit" className="text-brand-gray-med font-mono uppercase text-xs tracking-wider">Full Exit Price</Label>
                        <Input 
                        id="exit" 
                        type="number" 
                        step="0.00001" 
                        placeholder="1.0050" 
                        value={formData.exitPrice}
                        onChange={(e) => handleChange('exitPrice', e.target.value)}
                        className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
                        />
                    </div>
                )}

                {exits.map((exit, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                        <div className="space-y-1">
                            <Label className="text-[10px] text-brand-gray-med">Type</Label>
                            <Select 
                                value={exit.type} 
                                onValueChange={(val) => updateExit(index, 'type', val)}
                            >
                                <SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white focus:ring-brand-purple">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-brand-dark border-white/10 text-white">
                                    <SelectItem value="PARTIAL_1">Partial 1</SelectItem>
                                    <SelectItem value="PARTIAL_2">Partial 2</SelectItem>
                                    <SelectItem value="PARTIAL_3">Partial 3</SelectItem>
                                    <SelectItem value="PARTIAL_4">Partial 4</SelectItem>
                                    <SelectItem value="FULL_TP">Full TP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] text-brand-gray-med">% Closed</Label>
                            <Input 
                                type="number" 
                                className="h-8 text-xs bg-black/40 border-white/10 text-white focus-visible:ring-brand-purple"
                                placeholder="50"
                                value={exit.percentage || ''}
                                onChange={(e) => updateExit(index, 'percentage', Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] text-brand-gray-med">Exit Price</Label>
                            <Input 
                                type="number" 
                                step="0.00001"
                                className="h-8 text-xs bg-black/40 border-white/10 text-white focus-visible:ring-brand-purple"
                                placeholder="Price"
                                value={exit.price || ''}
                                onChange={(e) => updateExit(index, 'price', Number(e.target.value))}
                            />
                        </div>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-brand-orange hover:bg-brand-orange/20"
                            onClick={() => removeExit(index)}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                ))}
            </div>

            {/* Stop Loss Management Section */}
            <div className="space-y-3 border border-white/10 rounded-lg p-4 bg-white/5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-brand-purple font-mono uppercase text-xs tracking-wider">Stop Loss Management</Label>
                        <Select onValueChange={(val) => handleChange('slStatus', val)} value={formData.slStatus}>
                            <SelectTrigger className="bg-black/40 border-white/10 text-white focus:ring-brand-purple">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-brand-dark border-white/10 text-white">
                                <SelectItem value="INITIAL">Initial Stop Loss</SelectItem>
                                <SelectItem value="BREAK_EVEN">Break Even</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-brand-purple font-mono uppercase text-xs tracking-wider">Moved SL Price (Optional)</Label>
                        <Input 
                            type="number" 
                            step="0.00001"
                            placeholder="Price" 
                            value={formData.movedSlPrice}
                            onChange={(e) => handleChange('movedSlPrice', e.target.value)}
                            className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
                        />
                    </div>
                </div>
            </div>

            {/* Manual P&L Override */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-brand-dark px-2 text-brand-gray-med font-mono">OR Enter P&L Directly</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pnl" className="text-brand-purple font-mono uppercase text-xs tracking-wider font-bold">Profit / Loss ($)</Label>
              <Input 
                id="pnl" 
                type="number" 
                step="0.01" 
                placeholder="e.g. 50.00 or -25.00" 
                value={formData.pnl}
                onChange={(e) => handleChange('pnl', e.target.value)}
                className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
              />
              <p className="text-[10px] text-brand-gray-med font-mono">
                If entered, this value overrides automatic calculation from exits.
              </p>
            </div>

            {/* Extra Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="strategy" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Strategy</Label>
                <Select onValueChange={(val) => handleChange('strategy', val)} value={formData.strategy}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white focus:ring-brand-purple">
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent className="bg-brand-dark border-white/10 text-white">
                    <SelectItem value="Trend Following" className="focus:bg-brand-purple/20 focus:text-white">Trend Following</SelectItem>
                    <SelectItem value="Breakout" className="focus:bg-brand-purple/20 focus:text-white">Breakout</SelectItem>
                    <SelectItem value="Mean Reversion" className="focus:bg-brand-purple/20 focus:text-white">Mean Reversion</SelectItem>
                    <SelectItem value="Scalping" className="focus:bg-brand-purple/20 focus:text-white">Scalping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="psychology" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Psychology</Label>
                <Select onValueChange={(val) => handleChange('psychology', val)} value={formData.psychology}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white focus:ring-brand-purple">
                    <SelectValue placeholder="How did you feel?" />
                  </SelectTrigger>
                  <SelectContent className="bg-brand-dark border-white/10 text-white">
                    <SelectItem value="CONFIDENT" className="focus:bg-brand-purple/20 focus:text-white">Confident</SelectItem>
                    <SelectItem value="NEUTRAL" className="focus:bg-brand-purple/20 focus:text-white">Neutral</SelectItem>
                    <SelectItem value="ANXIOUS" className="focus:bg-brand-purple/20 focus:text-white">Anxious</SelectItem>
                    <SelectItem value="FOMO" className="focus:bg-brand-purple/20 focus:text-white">FOMO</SelectItem>
                    <SelectItem value="REVENGE" className="focus:bg-brand-purple/20 focus:text-white">Revenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tradingViewUrl" className="text-brand-purple font-mono uppercase text-xs tracking-wider">TradingView URL</Label>
                <Input 
                  id="tradingViewUrl" 
                  placeholder="https://www.tradingview.com/..." 
                  value={formData.tradingViewUrl}
                  onChange={(e) => handleChange('tradingViewUrl', e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setupRating" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Setup Rating</Label>
                <Select onValueChange={(val) => handleChange('setupRating', val)} value={formData.setupRating}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white focus:ring-brand-purple">
                    <SelectValue placeholder="Rate Setup" />
                  </SelectTrigger>
                  <SelectContent className="bg-brand-dark border-white/10 text-white">
                    <SelectItem value="A+" className="focus:bg-brand-purple/20 focus:text-white">A+</SelectItem>
                    <SelectItem value="A" className="focus:bg-brand-purple/20 focus:text-white">A</SelectItem>
                    <SelectItem value="B+" className="focus:bg-brand-purple/20 focus:text-white">B+</SelectItem>
                    <SelectItem value="B" className="focus:bg-brand-purple/20 focus:text-white">B</SelectItem>
                    <SelectItem value="C" className="focus:bg-brand-purple/20 focus:text-white">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Enter trade notes..." 
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button" className="border-white/10 text-brand-gray-med hover:bg-white/10 hover:text-white">Cancel</Button>
            </DialogClose>
            <Button type="submit" className="bg-brand-orange text-white hover:bg-brand-orange/80 font-bold tracking-wide shadow-glow-orange">Save Trade</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
