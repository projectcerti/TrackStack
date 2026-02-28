import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BalanceAdjustmentDialog from '@/components/BalanceAdjustmentDialog';
import { useTrades } from '@/context/TradeContext';
import { toast } from 'sonner';
import { Database, Trash2, RefreshCw } from 'lucide-react';

export default function Settings() {
  const { seedTestData, deleteTrades, trades } = useTrades();
  const [adjustmentDialog, setAdjustmentDialog] = useState<{ isOpen: boolean; mode: 'deposit' | 'withdraw' | 'set' }>({
    isOpen: false,
    mode: 'deposit'
  });

  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedTestData();
      toast.success('Test data seeded successfully!');
    } catch (error) {
      toast.error('Failed to seed test data');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all trades? This cannot be undone.')) return;
    setIsClearing(true);
    try {
      const tradeIds = trades.map(t => t.id);
      await deleteTrades(tradeIds);
      toast.success('All trades cleared successfully!');
    } catch (error) {
      toast.error('Failed to clear trades');
    } finally {
      setIsClearing(false);
    }
  };

  const openAdjustmentDialog = (mode: 'deposit' | 'withdraw' | 'set') => {
    setAdjustmentDialog({ isOpen: true, mode });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-sans font-extrabold tracking-tight text-white glow-text-purple">Settings</h1>
          <p className="text-sm font-mono uppercase tracking-widest text-brand-gray-med mt-2">
            Configure your account and preferences.
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 max-w-2xl">
        <Card className="bg-black/40 border border-white/10 shadow-glow-purple rounded-xl backdrop-blur-md">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-sans font-bold text-xl text-white">Account Preferences</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-widest text-brand-gray-med">
              Manage your display settings
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-white">Base Currency</Label>
                <Select defaultValue="usd">
                  <SelectTrigger className="bg-black/40 border-white/10 text-white focus:ring-brand-purple">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-brand-dark border-white/10 text-white">
                    <SelectItem value="usd" className="focus:bg-brand-purple/20 focus:text-white">USD ($)</SelectItem>
                    <SelectItem value="eur" className="focus:bg-brand-purple/20 focus:text-white">EUR (€)</SelectItem>
                    <SelectItem value="gbp" className="focus:bg-brand-purple/20 focus:text-white">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-white">Timezone</Label>
                <Select defaultValue="utc">
                  <SelectTrigger className="bg-black/40 border-white/10 text-white focus:ring-brand-purple">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="bg-brand-dark border-white/10 text-white">
                    <SelectItem value="utc" className="focus:bg-brand-purple/20 focus:text-white">UTC (GMT+0)</SelectItem>
                    <SelectItem value="est" className="focus:bg-brand-purple/20 focus:text-white">EST (GMT-5)</SelectItem>
                    <SelectItem value="pst" className="focus:bg-brand-purple/20 focus:text-white">PST (GMT-8)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border border-white/10 shadow-glow-orange rounded-xl backdrop-blur-md">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-sans font-bold text-xl text-white">Balance Management</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-widest text-brand-gray-med">
              Manually adjust your account balance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex gap-4">
              <Button 
                className="flex-1 bg-brand-purple hover:bg-brand-purple/80 text-white font-bold shadow-glow-purple"
                onClick={() => openAdjustmentDialog('deposit')}
              >
                Deposit
              </Button>
              <Button 
                className="flex-1 bg-brand-orange hover:bg-brand-orange/80 text-white font-bold shadow-glow-orange"
                onClick={() => openAdjustmentDialog('withdraw')}
              >
                Withdraw
              </Button>
              <Button 
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold border border-white/10"
                onClick={() => openAdjustmentDialog('set')}
              >
                Set Balance
              </Button>
            </div>
            <p className="text-xs text-brand-gray-med text-center">
              Use 'Set Balance' to overwrite the current amount directly.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border border-white/10 shadow-glow-purple rounded-xl backdrop-blur-md">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-sans font-bold text-xl text-white">Broker Integration</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-widest text-brand-gray-med">
              Connect your trading accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 border border-white/10 bg-black/60 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-purple rounded-full flex items-center justify-center text-white font-bold shadow-glow-purple">MT4</div>
                <div>
                  <p className="font-bold text-white">MetaTrader 4</p>
                  <p className="text-xs text-brand-gray-med">Connected (Account #123456)</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-brand-orange hover:text-brand-orange/80 hover:bg-brand-orange/10 border-white/10">Disconnect</Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-white/10 bg-black/60 rounded-lg opacity-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-violet rounded-full flex items-center justify-center text-white font-bold border border-white/10">cT</div>
                <div>
                  <p className="font-bold text-white">cTrader</p>
                  <p className="text-xs text-brand-gray-med">Not Connected</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-white border-white/10 hover:bg-white/10">Connect</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border border-red-500/20 shadow-glow-orange rounded-xl backdrop-blur-md">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="font-sans font-bold text-xl text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-orange" />
              Developer Tools
            </CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-widest text-brand-gray-med">
              Test and debug utilities
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline"
                className="border-white/10 text-white hover:bg-brand-purple/20 hover:text-brand-purple"
                onClick={handleSeedData}
                disabled={isSeeding}
              >
                {isSeeding ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                Seed Test Data
              </Button>
              <Button 
                variant="outline"
                className="border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-500"
                onClick={handleClearData}
                disabled={isClearing}
              >
                {isClearing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Clear All Data
              </Button>
            </div>
            <p className="text-[10px] text-brand-gray-med font-mono uppercase text-center">
              Use these tools to verify application behavior with sample data.
            </p>
          </CardContent>
        </Card>
      </div>

      <BalanceAdjustmentDialog 
        isOpen={adjustmentDialog.isOpen} 
        onClose={() => setAdjustmentDialog(prev => ({ ...prev, isOpen: false }))} 
        mode={adjustmentDialog.mode} 
      />
    </div>
  );
}
