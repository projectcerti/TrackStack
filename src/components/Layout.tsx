import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  BarChart2, 
  Settings, 
  LogOut,
  LogIn,
  Menu,
  X,
  LineChart,
  Brain,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileSelector from '@/components/ProfileSelector';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { user, signInWithGoogle, logout, isSigningIn } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: BookOpen, label: 'Journal', href: '/journal' },
    { icon: Calendar, label: 'Profit Tracker', href: '/calendar' },
    { icon: BarChart2, label: 'Analytics', href: '/analytics' },
    { icon: LineChart, label: 'TradingView', href: '/tradingview' },
    { icon: Brain, label: 'Analysis', href: '/analysis' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <div className="min-h-screen font-sans text-white bg-brand-dark selection:bg-brand-lime selection:text-black relative">
      <div className="atmosphere-bg">
        <div className="organic-shape" />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Logo className="w-6 h-6 text-brand-lime" />
          <h1 className="font-sans font-extrabold text-xl tracking-tight text-white">Trackstack</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-black/60 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 flex flex-col sidebar-glow-separator",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-6 border-b border-white/10 flex items-center gap-3">
            <Logo className="w-8 h-8 text-brand-lime" />
            <div>
              <h1 className="font-sans font-extrabold text-2xl tracking-tighter text-white">
                TRACK<span className="text-brand-lime">STACK</span>
              </h1>
              <p className="text-[10px] text-brand-gray-med font-mono uppercase tracking-widest">Stack Your Wins</p>
            </div>
          </div>

          <div className="p-4 border-b border-white/10">
            <ProfileSelector />
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-brand-lime/10 hover:shadow-glow-lime hover:border hover:border-brand-lime/30 transition-all duration-300 group border border-transparent"
              >
                <item.icon className="w-5 h-5 text-brand-gray-med group-hover:text-brand-lime transition-colors" />
                <span className="font-mono text-sm tracking-wide uppercase text-brand-gray-light group-hover:text-white transition-colors">{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10 bg-black/40">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    {user.photoURL ? (
                      <img src={user.photoURL} className="w-8 h-8 rounded-full border border-brand-purple/50 glow-purple" alt="User" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-purple flex items-center justify-center text-xs font-bold glow-purple text-white">
                        {user.displayName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate text-white">{user.displayName}</p>
                        <p className="text-xs text-brand-gray-med truncate">{user.email}</p>
                    </div>
                </div>
                <button 
                  onClick={() => logout()}
                  className="flex items-center gap-3 px-4 py-3 w-full rounded-full hover:bg-brand-lime/10 transition-colors text-brand-gray-med hover:text-brand-lime hover:shadow-glow-lime"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-mono text-sm tracking-wide uppercase">Logout</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => signInWithGoogle()}
                disabled={isSigningIn}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-full bg-brand-lime hover:bg-brand-lime/90 transition-all text-black font-bold glow-lime disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningIn ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                <span className="font-mono text-sm tracking-wide uppercase">
                  {isSigningIn ? 'Signing In...' : 'Sign In'}
                </span>
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-transparent">
          <div className="container mx-auto p-6 lg:p-10 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
