import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Journal from '@/pages/Journal';
import Calendar from '@/pages/Calendar';
import Analytics from '@/pages/Analytics';
import Analysis from '@/pages/Analysis';
import TradingView from '@/pages/TradingView';
import Settings from '@/pages/Settings';
import ReplayMode from '@/pages/ReplayMode';
import { TradeProvider } from '@/context/TradeContext';
import { AuthProvider } from '@/context/AuthContext';

export default function App() {
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('[App] Visibility Change:', document.visibilityState);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <AuthProvider>
      <TradeProvider>
        <Router>
          <Toaster position="top-center" />
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/replay" element={<ReplayMode />} />
              <Route path="/tradingview" element={<TradingView />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </Router>
      </TradeProvider>
    </AuthProvider>
  );
}
