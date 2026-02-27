import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrades } from '@/context/TradeContext';
import { toast } from 'sonner';

export default function InitialBalanceDialog() {
  const { account, setInitialBalance } = useTrades();
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState('');

  // Check if balance is 0 and no trades exist (assuming new account)
  // We use a simple check here. In a real app, we might want a specific flag.
  useEffect(() => {
    if (account && account.balance === 0 && account.equity === 0) {
      setOpen(true);
    }
  }, [account?.balance, account?.equity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(balance);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid positive number');
      return;
    }
    setInitialBalance(amount);
    setOpen(false);
    toast.success(`Account balance set to $${amount.toLocaleString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px] bg-black/90 backdrop-blur-xl border-white/10 text-white rounded-3xl shadow-glow-orange" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-brand-orange font-bold text-2xl glow-text-orange">Welcome to Trackstack</DialogTitle>
          <DialogDescription className="text-brand-gray-med">
            To get started, please enter your current trading account balance.
            You can also sync with a broker later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balance" className="text-right text-white">
                Balance
              </Label>
              <Input
                id="balance"
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="col-span-3 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-brand-orange rounded-xl"
                placeholder="e.g. 10000"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="bg-brand-orange text-black hover:bg-brand-orange/90 font-bold tracking-wide rounded-full glow-orange w-full sm:w-auto">Set Balance</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
