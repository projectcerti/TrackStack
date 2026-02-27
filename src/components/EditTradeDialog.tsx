import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrades } from '@/context/TradeContext';
import { toast } from 'sonner';
import { Trade, Exit } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

interface EditTradeDialogProps {
  trade: Trade;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTradeDialog({ trade, open, onOpenChange }: EditTradeDialogProps) {
  const { editTrade } = useTrades();
  const [formData, setFormData] = useState({
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
    openTime: '',
    closeTime: ''
  });

  const [exits, setExits] = useState<Exit[]>([]);

  useEffect(() => {
    if (trade) {
      setFormData({
        symbol: trade.symbol,
        type: trade.type,
        entryPrice: trade.entryPrice?.toString() || '',
        exitPrice: trade.exitPrice?.toString() || '',
        size: trade.size?.toString() || '',
        pnl: trade.pnl?.toString() || '',
        strategy: trade.strategy || '',
        psychology: trade.psychology || '',
        tradingViewUrl: trade.tradingViewUrl || '',
        setupRating: trade.setupRating || '',
        notes: trade.notes || '',
        slStatus: trade.slStatus || 'INITIAL',
        movedSlPrice: trade.movedSlPrice?.toString() || '',
        openTime: trade.openTime ? new Date(trade.openTime).toISOString().slice(0, 16) : '',
        closeTime: trade.closeTime ? new Date(trade.closeTime).toISOString().slice(0, 16) : ''
      });
      setExits(trade.exits || []);
    }
  }, [trade]);

  const addExit = () => {
    setExits([...exits, { id: crypto.randomUUID(), type: 'PARTIAL_1', percentage: 0, price: 0 }]);
  };

  const removeExit = (index: number) => {
    setExits(exits.filter((_, i) => i !== index));
  };

  const updateExit = (index: number, field: keyof Exit, value: any) => {
    const newExits = [...exits];
    newExits[index] = { ...newExits[index], [field]: value };
    setExits(newExits);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.symbol || !formData.type) {
      toast.error('Please fill in Symbol and Type');
      return;
    }

    // Calculate P&L from exits if not manually provided (or if we want to update it based on new exits)
    // However, for edit, we might want to respect the existing PnL unless user clears it?
    // Let's assume if they are editing exits, they might want PnL to update. 
    // But the PnL field is editable. Let's stick to the same logic as AddTrade:
    // If PnL field is filled, use it. If not, calculate.
    // But here PnL is pre-filled from trade. So it will always be "filled".
    // Maybe we should just update the trade with the form values.
    
    // Actually, if they add exits, we should probably re-calculate PnL IF they haven't manually overridden it *now*.
    // But we don't know if the current value is manual or calculated.
    // Let's just save what is in the form. If they want to recalculate, they might need to clear the PnL field?
    // Or we can just calculate it and if it differs significantly, maybe warn?
    // For simplicity, let's just save the form data as is, but if they added exits, we save them.
    
    // Wait, if I add exits in Edit mode, the PnL won't update automatically because it's already set in state.
    // That might be confusing. 
    // Let's check if the user modified exits.
    
    let finalPnl = Number(formData.pnl);
    let finalExitPrice = Number(formData.exitPrice);

    // If we have exits, let's try to recalculate PnL to see if we should update it.
    // But maybe the user entered a manual PnL.
    // Let's just trust the input fields for now. The user can manually update PnL if they change exits.
    // OR, we could add a "Recalculate P&L" button? No, too complex.
    
    // Let's stick to: Save what's in the inputs.

    editTrade(trade.id, {
      symbol: formData.symbol.toUpperCase(),
      type: formData.type as 'BUY' | 'SELL',
      entryPrice: Number(formData.entryPrice) || 0,
      exitPrice: finalExitPrice,
      size: Number(formData.size) || 0,
      pnl: finalPnl,
      strategy: formData.strategy,
      psychology: formData.psychology as any,
      tradingViewUrl: formData.tradingViewUrl,
      setupRating: formData.setupRating as any,
      notes: formData.notes,
      slStatus: formData.slStatus as any,
      movedSlPrice: formData.movedSlPrice ? Number(formData.movedSlPrice) : undefined,
      openTime: formData.openTime ? new Date(formData.openTime).toISOString() : undefined,
      closeTime: formData.closeTime ? new Date(formData.closeTime).toISOString() : undefined,
      exits: exits
    });

    toast.success('Trade updated successfully');
    onOpenChange(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-brand-dark border-white/10 text-white max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-black [&::-webkit-scrollbar-thumb]:bg-brand-purple [&::-webkit-scrollbar-thumb]:rounded-full shadow-glow-purple">
        <DialogHeader>
          <DialogTitle className="text-brand-purple glow-text-purple text-xl font-bold tracking-tight">Edit Trade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Core Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-symbol" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Symbol *</Label>
                <Input 
                  id="edit-symbol" 
                  value={formData.symbol}
                  onChange={(e) => handleChange('symbol', e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Type *</Label>
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
                <Label htmlFor="edit-openTime" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Open Date & Time *</Label>
                <Input 
                  id="edit-openTime" 
                  type="datetime-local" 
                  value={formData.openTime}
                  onChange={(e) => handleChange('openTime', e.target.value)}
                  className="bg-black/40 border-white/10 text-white focus-visible:ring-brand-purple"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-closeTime" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Close Date & Time *</Label>
                <Input 
                  id="edit-closeTime" 
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
                <Label htmlFor="edit-entry" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Entry Price</Label>
                <Input 
                  id="edit-entry" 
                  type="number" 
                  step="0.00001" 
                  value={formData.entryPrice}
                  onChange={(e) => handleChange('entryPrice', e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-size" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Size (Lots)</Label>
                <Input 
                  id="edit-size" 
                  type="number" 
                  step="0.01" 
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
                        <Label htmlFor="edit-exit" className="text-brand-gray-med font-mono uppercase text-xs tracking-wider">Full Exit Price</Label>
                        <Input 
                        id="edit-exit" 
                        type="number" 
                        step="0.00001" 
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
                        <Label className="text-xs text-brand-gray-med">Moved SL Price (Optional)</Label>
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

            <div className="space-y-2">
              <Label htmlFor="edit-pnl" className="text-brand-purple font-mono uppercase text-xs tracking-wider font-bold">Profit / Loss ($)</Label>
              <Input 
                id="edit-pnl" 
                type="number" 
                step="0.01" 
                value={formData.pnl}
                onChange={(e) => handleChange('pnl', e.target.value)}
                className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-strategy" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Strategy</Label>
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
                <Label htmlFor="edit-psychology" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Psychology</Label>
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
                <Label htmlFor="edit-tradingViewUrl" className="text-brand-purple font-mono uppercase text-xs tracking-wider">TradingView URL</Label>
                <Input 
                  id="edit-tradingViewUrl" 
                  value={formData.tradingViewUrl}
                  onChange={(e) => handleChange('tradingViewUrl', e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-setupRating" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Setup Rating</Label>
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
              <Label htmlFor="edit-notes" className="text-brand-purple font-mono uppercase text-xs tracking-wider">Notes</Label>
              <Textarea 
                id="edit-notes" 
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
            <Button type="submit" className="bg-brand-orange text-white hover:bg-brand-orange/80 font-bold tracking-wide shadow-glow-orange">Update Trade</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
