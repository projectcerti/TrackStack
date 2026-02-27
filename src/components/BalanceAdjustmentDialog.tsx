import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrades } from '@/context/TradeContext';
import { toast } from 'sonner';

interface BalanceAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'deposit' | 'withdraw' | 'set';
}

export default function BalanceAdjustmentDialog({ isOpen, onClose, mode }: BalanceAdjustmentDialogProps) {
  const { deposit, withdraw, setBalance } = useTrades();
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    
    if (isNaN(value) || value < 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    if (mode === 'deposit') {
      deposit(value);
      toast.success(`Successfully deposited $${value?.toLocaleString() ?? '0.00'}`);
    } else if (mode === 'withdraw') {
      withdraw(value);
      toast.success(`Successfully withdrew $${value?.toLocaleString() ?? '0.00'}`);
    } else if (mode === 'set') {
      setBalance(value);
      toast.success(`Balance set to $${value?.toLocaleString() ?? '0.00'}`);
    }
    
    setAmount('');
    onClose();
  };

  const getTitle = () => {
    switch (mode) {
      case 'deposit': return 'Deposit Funds';
      case 'withdraw': return 'Withdraw Funds';
      case 'set': return 'Set Balance';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'deposit': return 'Enter the amount you wish to add to your account balance.';
      case 'withdraw': return 'Enter the amount you wish to withdraw from your account balance.';
      case 'set': return 'Enter the new balance for your account. This will overwrite the current balance.';
    }
  };

  const getButtonColor = () => {
    switch (mode) {
      case 'deposit': return "bg-brand-purple hover:bg-brand-purple/90 text-white font-bold shadow-glow-purple";
      case 'withdraw': return "bg-brand-orange hover:bg-brand-orange/90 text-white font-bold shadow-glow-orange";
      case 'set': return "bg-white/10 hover:bg-white/20 text-white font-bold border border-white/10";
    }
  };

  const getButtonLabel = () => {
    switch (mode) {
      case 'deposit': return 'Deposit';
      case 'withdraw': return 'Withdraw';
      case 'set': return 'Set Balance';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-brand-dark border-white/10 text-white shadow-glow-purple">
        <DialogHeader>
          <DialogTitle className="text-brand-purple glow-text-purple">{getTitle()}</DialogTitle>
          <DialogDescription className="text-brand-gray-med">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right text-brand-purple font-mono uppercase text-xs tracking-wider">
                {mode === 'set' ? 'New Balance' : 'Amount'}
              </Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-3 bg-black/40 border-white/10 text-white placeholder:text-brand-gray-med focus-visible:ring-brand-purple"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              className={getButtonColor()}
            >
              {getButtonLabel()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
