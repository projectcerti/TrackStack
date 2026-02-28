import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Trade, Account, DailyStats } from '@/types';
import { subDays, format, isSameDay } from 'date-fns';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';

interface TradeContextType {
  trades: Trade[]; // Filtered by active account
  allTrades: Trade[]; // All trades (for internal use if needed)
  account: Account; // Active account
  accounts: Account[];
  activeAccountId: string;
  dailyStats: DailyStats[];
  addTrade: (trade: Omit<Trade, 'id' | 'accountId' | 'pnlPercent' | 'status'> & { pnl?: number }) => void;
  editTrade: (id: string, updates: Partial<Omit<Trade, 'id' | 'accountId'>>) => void;
  deleteTrade: (id: string) => void;
  deleteTrades: (ids: string[]) => Promise<void>;
  createAccount: (name: string, initialBalance: number, currency: string) => void;
  switchAccount: (id: string) => void;
  syncBroker: () => Promise<void>;
  setInitialBalance: (amount: number) => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => void;
  setBalance: (amount: number) => void;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export function TradeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  // Initialize accounts from local storage or create default
  const [accounts, setAccounts] = useState<Account[]>(() => {
    console.log('[TradeContext] Initializing accounts state');
    const saved = localStorage.getItem('accounts');
    if (saved) return JSON.parse(saved);
    
    // Migration: Check for old single 'account'
    const oldAccount = localStorage.getItem('account');
    if (oldAccount) {
      return [JSON.parse(oldAccount)];
    }

    return [{
      id: 'acc_main',
      name: 'Main Account',
      balance: 0,
      equity: 0,
      currency: 'USD',
    }];
  });

  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    console.log('[TradeContext] Initializing activeAccountId state');
    const saved = localStorage.getItem('activeAccountId');
    return saved || accounts[0]?.id || 'acc_main';
  });

  // Initialize trades
  const [trades, setTrades] = useState<Trade[]>(() => {
    console.log('[TradeContext] Initializing trades state');
    const saved = localStorage.getItem('trades');
    return saved ? JSON.parse(saved) : [];
  });

  // Log state changes
  useEffect(() => {
    console.log('[TradeContext] State Update:', {
      accountsCount: accounts.length,
      activeAccountId,
      tradesCount: trades.length,
      userEmail: user?.email || 'Guest',
      authLoading
    });
  }, [accounts, activeAccountId, trades, user, authLoading]);

  // Derived active account
  const activeAccount = useMemo(() => {
    const acc = accounts.find(a => a.id === activeAccountId) || accounts[0] || {
      id: 'loading',
      name: 'Loading...',
      balance: 0,
      equity: 0,
      currency: 'USD'
    };
    console.log('[TradeContext] Derived activeAccount:', acc.id);
    return acc;
  }, [accounts, activeAccountId]);

  // Derived filtered trades for active account
  const activeTrades = useMemo(() => {
    const filtered = trades.filter(t => t.accountId === activeAccount.id || (!t.accountId && activeAccount.id === accounts[0]?.id));
    console.log('[TradeContext] Derived activeTrades count:', filtered.length);
    return filtered;
  }, [trades, activeAccount.id, accounts]);

  // Persist data to LocalStorage
  useEffect(() => {
    // Always persist activeAccountId preference
    localStorage.setItem('activeAccountId', activeAccountId);
    localStorage.setItem('accounts', JSON.stringify(accounts));
    localStorage.setItem('trades', JSON.stringify(trades));
  }, [accounts, activeAccountId, trades]);

  // Clear state on logout
  useEffect(() => {
      if (authLoading) {
          console.log('[TradeContext] Auth is loading, skipping logout check');
          return;
      }

      console.log('[TradeContext] Auth state effect triggered. User:', user?.email || 'None');
      if (!user) {
          console.log('[TradeContext] User logged out or null. Loading from LocalStorage.');
          const savedAccounts = localStorage.getItem('accounts');
          const savedTrades = localStorage.getItem('trades');
          // activeAccountId is loaded in useState initializer
          const savedActiveId = localStorage.getItem('activeAccountId');

          if (savedAccounts) {
              setAccounts(JSON.parse(savedAccounts));
          } else {
              setAccounts([{
                  id: 'acc_main',
                  name: 'Main Account',
                  balance: 0,
                  equity: 0,
                  currency: 'USD',
                }]);
          }

          if (savedTrades) {
              setTrades(JSON.parse(savedTrades));
          } else {
              setTrades([]);
          }

          if (savedActiveId) {
              setActiveAccountId(savedActiveId);
          } else {
              setActiveAccountId('acc_main');
          }
      }
  }, [user]);

  // Helper to calculate pips
  const calculatePips = (symbol: string, entry: number, exit: number, type: 'BUY' | 'SELL'): number => {
    if (!symbol || !entry || !exit) return 0;
    
    const sym = symbol.toUpperCase();
    let multiplier = 10000; // Standard pairs (4th decimal)

    if (sym.includes('JPY')) {
      multiplier = 100; // JPY pairs (2nd decimal)
    }
    
    // Determine Direction
    let diff = 0;
    if (type === 'BUY') {
        diff = exit - entry;
    } else {
        diff = entry - exit;
    }

    return Number((diff * multiplier).toFixed(1));
  };

  // Sync with Firestore if logged in
  useEffect(() => {
    console.log('[TradeContext] Firestore effect triggered. UID:', user?.uid || 'None');
    if (!user?.uid || !db) return;

    console.log('[TradeContext] Setting up Firestore listeners for UID:', user.uid);

    // Accounts Listener
    const unsubAccounts = onSnapshot(collection(db, 'users', user.uid, 'accounts'), (snapshot) => {
      console.log('[TradeContext] Firestore Accounts snapshot received. Count:', snapshot.size);
      const newAccounts = snapshot.docs.map(d => d.data() as Account);
      // Sort accounts by name to ensure stability
      newAccounts.sort((a, b) => a.name.localeCompare(b.name));
      
      if (newAccounts.length > 0) {
        setAccounts(newAccounts);
        
        // Immediate validation of activeAccountId to prevent "disappearing" data
        // We check against the *new* accounts list immediately
        setActiveAccountId(prevId => {
            const exists = newAccounts.find(a => a.id === prevId);
            if (exists) return prevId;
            console.log('[TradeContext] Active account not found in snapshot, falling back to first account');
            return newAccounts[0].id;
        });
      } else {
        console.log('[TradeContext] No accounts found in Firestore, creating default');
        // Initialize default account for new user
        const defaultAccount: Account = {
          id: 'acc_main',
          name: 'Main Account',
          balance: 0,
          equity: 0,
          currency: 'USD',
        };
        setDoc(doc(db, 'users', user.uid, 'accounts', defaultAccount.id), defaultAccount);
      }
    }, (error) => {
      console.error('[TradeContext] Firestore Accounts listener error:', error);
    });

    // Trades Listener
    const unsubTrades = onSnapshot(collection(db, 'users', user.uid, 'trades'), (snapshot) => {
      console.log('[TradeContext] Firestore Trades snapshot received. Count:', snapshot.size);
      const newTrades = snapshot.docs.map(d => d.data() as Trade);
      // Sort by closeTime desc
      newTrades.sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());
      setTrades(newTrades);
    }, (error) => {
      console.error('[TradeContext] Firestore Trades listener error:', error);
    });

    return () => {
      console.log('[TradeContext] Cleaning up Firestore listeners for UID:', user.uid);
      unsubAccounts();
      unsubTrades();
    };
  }, [user?.uid]); // Only re-run if UID changes, not on every user object refresh

  // Helper to update local state (for non-logged in users)
  const updateAccountBalanceLocal = (accountId: string, amountChange: number) => {
    setAccounts(prev => prev.map(acc => {
      if (acc.id === accountId) {
        return {
          ...acc,
          balance: acc.balance + amountChange,
          equity: acc.equity + amountChange
        };
      }
      return acc;
    }));
  };

  const setAccountBalanceLocal = (accountId: string, newBalance: number) => {
    setAccounts(prev => prev.map(acc => {
      if (acc.id === accountId) {
        return {
          ...acc,
          balance: newBalance,
          equity: newBalance
        };
      }
      return acc;
    }));
  };

  const createAccount = async (name: string, initialBalance: number, currency: string) => {
    const newAccount: Account = {
      id: `acc_${crypto.randomUUID()}`,
      name,
      balance: initialBalance,
      equity: initialBalance,
      currency
    };

    if (user && db) {
      await setDoc(doc(db, 'users', user.uid, 'accounts', newAccount.id), newAccount);
      setActiveAccountId(newAccount.id);
    } else {
      setAccounts(prev => [...prev, newAccount]);
      setActiveAccountId(newAccount.id);
    }
  };

  const switchAccount = (id: string) => {
    if (accounts.find(a => a.id === id)) {
      setActiveAccountId(id);
      if (!user) {
        localStorage.setItem('activeAccountId', id);
      }
    }
  };

  const setInitialBalance = async (amount: number) => {
    if (user && db) {
      const accountRef = doc(db, 'users', user.uid, 'accounts', activeAccountId);
      await setDoc(accountRef, { ...activeAccount, balance: amount, equity: amount }, { merge: true });
    } else {
      setAccountBalanceLocal(activeAccountId, amount);
    }
  };

  const deposit = async (amount: number) => {
    if (user && db) {
      const accountRef = doc(db, 'users', user.uid, 'accounts', activeAccountId);
      const newBalance = activeAccount.balance + amount;
      await setDoc(accountRef, { ...activeAccount, balance: newBalance, equity: newBalance }, { merge: true });
    } else {
      updateAccountBalanceLocal(activeAccountId, amount);
    }
  };

  const withdraw = async (amount: number) => {
    if (user && db) {
      const accountRef = doc(db, 'users', user.uid, 'accounts', activeAccountId);
      const newBalance = activeAccount.balance - amount;
      await setDoc(accountRef, { ...activeAccount, balance: newBalance, equity: newBalance }, { merge: true });
    } else {
      updateAccountBalanceLocal(activeAccountId, -amount);
    }
  };

  const setBalance = async (amount: number) => {
    if (user && db) {
      const accountRef = doc(db, 'users', user.uid, 'accounts', activeAccountId);
      await setDoc(accountRef, { ...activeAccount, balance: amount, equity: amount }, { merge: true });
    } else {
      setAccountBalanceLocal(activeAccountId, amount);
    }
  };

  // Derived state for daily stats (only for active trades)
  const dailyStats = useMemo(() => {
    const statsMap = new Map<string, DailyStats>();
    
    // Initialize last 30 days with 0
    for (let i = 0; i < 30; i++) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      statsMap.set(dateStr, {
        date: dateStr,
        pnl: 0,
        tradesCount: 0,
        winRate: 0,
        rMultiple: 0,
        pips: 0
      });
    }

    activeTrades.forEach(trade => {
      const dateStr = format(new Date(trade.closeTime), 'yyyy-MM-dd');
      const stat = statsMap.get(dateStr);
      if (stat) {
        stat.pnl += trade.pnl;
        stat.tradesCount += 1;
        stat.rMultiple += trade.rMultiple || 0;
        stat.pips += trade.pips || 0;
      } else {
         statsMap.set(dateStr, {
             date: dateStr,
             pnl: trade.pnl,
             tradesCount: 1,
             winRate: 0,
             rMultiple: trade.rMultiple || 0,
             pips: trade.pips || 0
         });
      }
    });

    // Calculate win rates
    const result = Array.from(statsMap.values()).map(stat => {
        const dayTrades = activeTrades.filter(t => isSameDay(new Date(t.closeTime), new Date(stat.date)));
        const wins = dayTrades.filter(t => t.pnl > 0).length;
        stat.winRate = dayTrades.length > 0 ? (wins / dayTrades.length) * 100 : 0;
        return stat;
    });

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [activeTrades]);

  const addTrade = async (newTradeData: Omit<Trade, 'id' | 'accountId' | 'pnlPercent' | 'status'> & { pnl?: number }) => {
    let pnl = newTradeData.pnl;
    
    if (pnl === undefined) {
      if (newTradeData.exits && newTradeData.exits.length > 0) {
        // PnL already calculated in AddTradeDialog if exits present, but let's double check or trust the input?
        // Actually AddTradeDialog passes 'pnl' if it calculated it.
        // If it didn't pass pnl (undefined), it means we should calculate it here.
        // But AddTradeDialog logic was: if exits, calculate pnl and pass it.
        // So if we are here and pnl is undefined, it means no exits or simple entry.
        pnl = (newTradeData.exitPrice - newTradeData.entryPrice) * newTradeData.size * (newTradeData.type === 'BUY' ? 1 : -1) * 100;
      } else {
        pnl = (newTradeData.exitPrice - newTradeData.entryPrice) * newTradeData.size * (newTradeData.type === 'BUY' ? 1 : -1) * 100; // Simplified PnL calc
      }
    }

    // Calculate Pips if not provided
    let pips = newTradeData.pips;
    if (pips === undefined) {
       // If exits exist, maybe average exit price is used for pips?
       // newTradeData.exitPrice should be the average exit price if exits exist (handled in Dialog)
      pips = calculatePips(newTradeData.symbol, newTradeData.entryPrice, newTradeData.exitPrice, newTradeData.type);
    }

    // Calculate Percent based on current active account balance
    const currentBalance = activeAccount.balance;
    const pnlPercent = currentBalance !== 0 ? (Number(pnl) / currentBalance) * 100 : 0;
    
    const trade: Trade = {
      ...newTradeData,
      id: crypto.randomUUID(),
      accountId: activeAccountId,
      pnl: Number(pnl),
      pnlPercent: Number(pnlPercent.toFixed(2)),
      pips: Number(pips?.toFixed(1)), // Keep 1 decimal for pips
      status: 'CLOSED', // Assuming manual entry is for closed trades
    };

    if (user && db) {
      const batch = writeBatch(db);
      const tradeRef = doc(db, 'users', user.uid, 'trades', trade.id);
      
      // Firestore doesn't support 'undefined' values, so we must sanitize the object
      const sanitizedTrade = Object.entries(trade).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      batch.set(tradeRef, sanitizedTrade);

      const accountRef = doc(db, 'users', user.uid, 'accounts', activeAccountId);
      const newBalance = activeAccount.balance + trade.pnl;
      batch.update(accountRef, { balance: newBalance, equity: newBalance });

      await batch.commit();
    } else {
      setTrades(prev => [trade, ...prev]);
      updateAccountBalanceLocal(activeAccountId, trade.pnl);
    }
  };

  const editTrade = async (id: string, updates: Partial<Omit<Trade, 'id' | 'accountId'>>) => {
    // Helper to calculate PnL from exits
    const calculatePnlFromExits = (entry: number, size: number, type: 'BUY' | 'SELL', exits: any[]) => {
        let totalPnl = 0;
        exits.forEach(exit => {
            const exitPnl = (exit.price - entry) * (size * (exit.percentage / 100)) * (type === 'BUY' ? 1 : -1) * 100;
            totalPnl += exitPnl;
        });
        return totalPnl;
    };

    if (user && db) {
      const trade = trades.find(t => t.id === id);
      if (!trade) return;

      const updatedTrade = { ...trade, ...updates };
      
      // Recalculate P&L if needed
      if (updates.pnl === undefined) {
          // If exits are updated, recalculate PnL based on exits
          if (updates.exits && updates.exits.length > 0) {
              // We need entry price, size, type from updatedTrade (merging updates with existing)
              updatedTrade.pnl = calculatePnlFromExits(updatedTrade.entryPrice, updatedTrade.size, updatedTrade.type, updates.exits);
              
              // Also update average exit price?
              let totalExitPrice = 0;
              let totalPercentage = 0;
              updates.exits.forEach(exit => {
                  totalExitPrice += exit.price * (exit.percentage / 100);
                  totalPercentage += exit.percentage;
              });
              if (totalPercentage > 0) {
                  updatedTrade.exitPrice = totalExitPrice; // Weighted average
              }
          } else if (updates.entryPrice || updates.exitPrice || updates.size || updates.type) {
             // Fallback to simple calc if no exits or exits cleared
             updatedTrade.pnl = (updatedTrade.exitPrice - updatedTrade.entryPrice) * updatedTrade.size * (updatedTrade.type === 'BUY' ? 1 : -1) * 100;
          }
      }
      
      // Recalculate Pips if needed
      if (updates.pips === undefined && (updates.entryPrice || updates.exitPrice || updates.type)) {
        updatedTrade.pips = calculatePips(updatedTrade.symbol, updatedTrade.entryPrice, updatedTrade.exitPrice, updatedTrade.type);
      }

      const pnlDiff = updatedTrade.pnl - trade.pnl;

      const batch = writeBatch(db);
      const tradeRef = doc(db, 'users', user.uid, 'trades', id);
      
      // Sanitize updatedTrade to remove undefined values
      const sanitizedUpdatedTrade = Object.entries(updatedTrade).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      batch.set(tradeRef, sanitizedUpdatedTrade, { merge: true });

      if (pnlDiff !== 0) {
        const accountRef = doc(db, 'users', user.uid, 'accounts', trade.accountId);
        // We need to find the account to update its balance
        const account = accounts.find(a => a.id === trade.accountId);
        if (account) {
            const newBalance = account.balance + pnlDiff;
            batch.update(accountRef, { balance: newBalance, equity: newBalance });
        }
      }
      await batch.commit();

    } else {
      setTrades(prev => {
        const tradeIndex = prev.findIndex(t => t.id === id);
        if (tradeIndex === -1) return prev;
  
        const oldTrade = prev[tradeIndex];
        const updatedTrade = { ...oldTrade, ...updates };
  
        // Recalculate P&L if relevant fields changed and P&L wasn't manually set in updates
        if (updates.pnl === undefined) {
             if (updates.exits && updates.exits.length > 0) {
                  updatedTrade.pnl = calculatePnlFromExits(updatedTrade.entryPrice, updatedTrade.size, updatedTrade.type, updates.exits);
                  
                  let totalExitPrice = 0;
                  let totalPercentage = 0;
                  updates.exits.forEach(exit => {
                      totalExitPrice += exit.price * (exit.percentage / 100);
                      totalPercentage += exit.percentage;
                  });
                  if (totalPercentage > 0) {
                      updatedTrade.exitPrice = totalExitPrice;
                  }
             } else if (updates.entryPrice || updates.exitPrice || updates.size || updates.type) {
                updatedTrade.pnl = (updatedTrade.exitPrice - updatedTrade.entryPrice) * updatedTrade.size * (updatedTrade.type === 'BUY' ? 1 : -1) * 100;
             }
        }

        // Recalculate Pips if needed
        if (updates.pips === undefined && (updates.entryPrice || updates.exitPrice || updates.type)) {
          updatedTrade.pips = calculatePips(updatedTrade.symbol, updatedTrade.entryPrice, updatedTrade.exitPrice, updatedTrade.type);
        }
  
        // Calculate P&L difference to update balance
        const pnlDiff = updatedTrade.pnl - oldTrade.pnl;
        
        if (pnlDiff !== 0) {
          updateAccountBalanceLocal(oldTrade.accountId, pnlDiff);
        }
  
        const newTrades = [...prev];
        newTrades[tradeIndex] = updatedTrade;
        return newTrades;
      });
    }
  };

  const deleteTrade = async (id: string) => {
    await deleteTrades([id]);
  };

  const deleteTrades = async (ids: string[]) => {
    if (ids.length === 0) return;

    if (user && db) {
      const batch = writeBatch(db);
      const accountPnlChanges = new Map<string, number>();

      ids.forEach(id => {
        const trade = trades.find(t => t.id === id);
        if (trade) {
          const tradeRef = doc(db, 'users', user.uid, 'trades', id);
          batch.delete(tradeRef);
          
          const currentChange = accountPnlChanges.get(trade.accountId) || 0;
          accountPnlChanges.set(trade.accountId, currentChange - trade.pnl);
        }
      });

      accountPnlChanges.forEach((pnlChange, accountId) => {
        const account = accounts.find(a => a.id === accountId);
        if (account) {
          const accountRef = doc(db, 'users', user.uid, 'accounts', accountId);
          const newBalance = account.balance + pnlChange;
          batch.update(accountRef, { balance: newBalance, equity: newBalance });
        }
      });

      await batch.commit();
    } else {
      const tradesToDelete = trades.filter(t => ids.includes(t.id));
      const accountPnlChanges = new Map<string, number>();
      
      tradesToDelete.forEach(trade => {
        const currentChange = accountPnlChanges.get(trade.accountId || activeAccountId) || 0;
        accountPnlChanges.set(trade.accountId || activeAccountId, currentChange - trade.pnl);
      });

      setTrades(prev => prev.filter(t => !ids.includes(t.id)));
      
      accountPnlChanges.forEach((pnlChange, accountId) => {
        updateAccountBalanceLocal(accountId, pnlChange);
      });
    }
  };

  const syncBroker = async () => {
    // No-op for manual only mode
    return Promise.resolve();
  };

  return (
    <TradeContext.Provider value={{ 
      trades: activeTrades, 
      allTrades: trades,
      account: activeAccount, 
      accounts,
      activeAccountId,
      dailyStats, 
      addTrade, 
      editTrade,
      deleteTrade, 
      deleteTrades,
      createAccount,
      switchAccount,
      syncBroker, 
      setInitialBalance, 
      deposit, 
      withdraw, 
      setBalance 
    }}>
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  const context = useContext(TradeContext);
  if (context === undefined) {
    throw new Error('useTrades must be used within a TradeProvider');
  }
  return context;
}
