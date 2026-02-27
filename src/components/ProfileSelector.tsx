import React, { useState } from 'react';
import { useTrades } from '@/context/TradeContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, User } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileSelector() {
  const { accounts, activeAccountId, switchAccount, createAccount } = useTrades();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName) {
      toast.error('Please enter an account name');
      return;
    }
    
    const balance = parseFloat(initialBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error('Please enter a valid initial balance');
      return;
    }

    createAccount(newAccountName, balance, 'USD');
    setIsCreateOpen(false);
    setNewAccountName('');
    setInitialBalance('');
    toast.success('New profile created');
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2 px-2">
        <User className="w-4 h-4 text-brand-gray-med" />
        <span className="text-xs font-mono uppercase text-brand-gray-med tracking-wider">Profile</span>
      </div>
      <Select value={activeAccountId} onValueChange={switchAccount}>
        <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:ring-brand-orange rounded-xl">
          <SelectValue placeholder="Select Account" />
        </SelectTrigger>
        <SelectContent className="bg-black/95 border-white/10 text-white rounded-xl backdrop-blur-xl">
          {accounts.map(account => (
            <SelectItem key={account.id} value={account.id} className="focus:bg-brand-orange/20 focus:text-brand-orange cursor-pointer">
              {account.name}
            </SelectItem>
          ))}
          <div className="p-2 border-t border-white/10 mt-1">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-xs h-8 text-brand-gray-med hover:text-brand-orange hover:bg-brand-orange/10 rounded-lg transition-colors">
                  <Plus className="w-3 h-3 mr-2" />
                  Create New Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-black/90 backdrop-blur-xl border-white/10 text-white rounded-3xl shadow-glow-orange">
                <DialogHeader>
                  <DialogTitle className="text-brand-orange font-bold text-xl glow-text-orange">Create New Trading Profile</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-brand-orange font-mono uppercase text-xs tracking-wider">Profile Name</Label>
                    <Input
                      id="name"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g. Scalping Account"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-brand-orange rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="balance" className="text-brand-orange font-mono uppercase text-xs tracking-wider">Initial Balance</Label>
                    <Input
                      id="balance"
                      type="number"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      placeholder="0.00"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-brand-orange rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateAccount} className="bg-brand-orange text-white hover:bg-brand-orange/90 font-bold tracking-wide rounded-full glow-orange w-full">Create Profile</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
