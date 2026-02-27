import React from 'react';
import { useTrades } from '@/context/TradeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExternalLink, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TradingView() {
  const { trades } = useTrades();

  // Filter trades that have TradingView links
  const tradesWithLinks = trades.filter(t => 
    t.notes?.includes('tradingview.com') || 
    t.notes?.includes('tv.com') ||
    // Also check if we have a dedicated field for it later, but for now check notes
    (t.images && t.images.some(img => img.includes('tradingview.com')))
  );

  const extractLink = (trade: any) => {
    // Simple regex to find URL in notes
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = trade.notes?.match(urlRegex);
    if (match) return match[0];
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-sans font-extrabold tracking-tight text-white glow-text-purple">TradingView Analysis</h1>
          <p className="text-sm font-mono uppercase tracking-widest text-brand-gray-med mt-2">
            Review your charts and technical setups.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tradesWithLinks.map(trade => {
          const link = extractLink(trade);
          if (!link) return null;

          return (
            <Card key={trade.id} className="bg-black/40 border-white/10 hover:border-brand-purple/50 transition-all shadow-glow-purple backdrop-blur-md">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold text-white">{trade.symbol}</CardTitle>
                    <CardDescription className="font-mono text-xs mt-1 text-brand-gray-med">{new Date(trade.openTime).toLocaleDateString()}</CardDescription>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${trade.pnl > 0 ? 'bg-brand-lime/20 text-brand-lime glow-text-lime' : 'bg-brand-orange/20 text-brand-orange glow-text-orange'}`}>
                    {trade.pnl > 0 ? '+' : ''}{trade.pnl}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-black/50 rounded-md mb-4 flex items-center justify-center border border-white/10 overflow-hidden relative group">
                    {/* If it's an image link, try to show it, otherwise show placeholder */}
                    {link.match(/\.(jpeg|jpg|gif|png)$/) ? (
                        <img src={link} alt="Chart" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center p-4">
                            <LineChart className="w-12 h-12 text-brand-gray-dark mx-auto mb-2" />
                            <p className="text-xs text-brand-gray-med">External Chart Link</p>
                        </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={link} target="_blank" rel="noopener noreferrer">
                            <Button variant="secondary" size="sm" className="gap-2 bg-brand-purple text-white hover:bg-brand-purple/80 border-none">
                                <ExternalLink className="w-4 h-4" />
                                Open Chart
                            </Button>
                        </a>
                    </div>
                </div>
                <p className="text-xs text-brand-gray-med line-clamp-2 italic">
                    {trade.notes?.replace(link, '').trim() || "No notes."}
                </p>
              </CardContent>
            </Card>
          );
        })}

        {tradesWithLinks.length === 0 && (
            <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-xl bg-black/20">
                <LineChart className="w-16 h-16 text-brand-gray-dark mx-auto mb-4" />
                <h3 className="text-xl font-bold text-brand-gray-med">No Charts Found</h3>
                <p className="text-brand-gray-med mt-2 max-w-md mx-auto">
                    Add TradingView links to your trade notes to see them here.
                </p>
            </div>
        )}
      </div>
    </div>
  );
}
