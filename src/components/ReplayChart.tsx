import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';
import { Trade } from '@/types';
import { fetchHistoricalCandles } from '@/services/twelvedata';
import { Button } from '@/components/ui/button';

interface ReplayChartProps {
  trade: Trade;
}

const ReplayChart: React.FC<ReplayChartProps> = ({ trade }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string, data?: any) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const logLine = `[${timestamp}] ${msg} ${data ? JSON.stringify(data) : ''}`;
    console.log(logLine);
    setLogs(prev => [...prev, logLine]);
  };

  // Initialize Chart
  useEffect(() => {
    addLog("ReplayChart: useEffect triggered", { tradeId: trade?.id });
    
    // Delay initialization to ensure modal animation is complete and container has size
    const timer = setTimeout(() => {
      addLog("ReplayChart: Timeout fired");
      
      try {
        if (!chartContainerRef.current) {
          addLog("ReplayChart: Container ref is null");
          setLoading(false);
          setError("Chart container initialization failed.");
          return;
        }

        const { clientWidth, clientHeight } = chartContainerRef.current;
        addLog("ReplayChart: Container dimensions", { clientWidth, clientHeight });
        
        // Fallback dimensions if container is 0 (should be prevented by min-h CSS)
        const width = clientWidth > 0 ? clientWidth : 800;
        const height = clientHeight > 0 ? clientHeight : 500;

        // Clean up previous chart if exists (safety check)
        if (chartRef.current) {
            addLog("ReplayChart: Removing existing chart instance");
            chartRef.current.remove();
            chartRef.current = null;
        }

        addLog("ReplayChart: Calling createChart...");
        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#1A0730' }, // brand-dark
            textColor: '#999999', // brand-gray-med
          },
          grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
          },
          width: width,
          height: height,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          },
          rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }
        });
        addLog("ReplayChart: createChart success");
        
        // Log available methods to debug "not a function" error
        try {
            const keys = Object.keys(chart);
            const protoKeys = Object.keys(Object.getPrototypeOf(chart));
            addLog("Chart keys:", keys);
            addLog("Chart proto keys:", protoKeys);
        } catch (e) {
            addLog("Could not log chart keys");
        }

        addLog("ReplayChart: Adding candlestick series...");
        
        let candlestickSeries;
        // Try new v5 API first, then fallback to old API
        if (typeof (chart as any).addSeries === 'function') {
             addLog("Using v5 addSeries API");
             candlestickSeries = (chart as any).addSeries(CandlestickSeries, {
                upColor: '#CCFF00', // brand-lime
                downColor: '#FE5000', // brand-orange
                borderVisible: false,
                wickUpColor: '#CCFF00', // brand-lime
                wickDownColor: '#FE5000', // brand-orange
             });
        } else if (typeof (chart as any).addCandlestickSeries === 'function') {
             addLog("Using v4 addCandlestickSeries API");
             candlestickSeries = (chart as any).addCandlestickSeries({
                upColor: '#CCFF00', // brand-lime
                downColor: '#FE5000', // brand-orange
                borderVisible: false,
                wickUpColor: '#CCFF00', // brand-lime
                wickDownColor: '#FE5000', // brand-orange
             });
        } else {
            throw new Error("No method found to add candlestick series. Check lightweight-charts version.");
        }
        
        addLog("ReplayChart: Series added");

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;
        addLog("ReplayChart: Refs assigned");

        // Use ResizeObserver for responsive chart sizing
        const resizeObserver = new ResizeObserver((entries) => {
          if (!entries || entries.length === 0) return;
          const { width, height } = entries[0].contentRect;
          // Ensure dimensions are valid before applying
          if (width > 0 && height > 0 && chartRef.current) {
            chartRef.current.applyOptions({ width, height });
          }
        });

        resizeObserver.observe(chartContainerRef.current);

        // Trigger data load after chart is ready
        loadData();
      } catch (err: any) {
        console.error("ReplayChart Initialization Error:", err);
        addLog("Init Error:", err.message);
        setError(`Chart Init Failed: ${err.message}`);
        setLoading(false);
      }

      return () => {
        // Cleanup logic (this return inside setTimeout is actually ignored by useEffect cleanup!)
        // The cleanup should be in the useEffect return.
        // But we can't access the local variables there easily.
        // Actually, the useEffect return handles cleanup using the refs.
      };
    }, 100); // 100ms delay

    return () => clearTimeout(timer);
  }, [trade]);

  const loadData = async (useMock = false) => {
    addLog("ReplayChart: loadData called", { useMock });
    
    // Wait for seriesRef to be initialized
    if (!seriesRef.current || !trade) {
        addLog("ReplayChart: Series or trade missing", { series: !!seriesRef.current, trade: !!trade });
        setLoading(false);
        setError("Chart initialization failed (refs missing).");
        return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      if (!trade.openTime) {
           throw new Error("Trade missing open time.");
      }

      // Calculate time range with padding (30 mins = 1800000 ms)
      const entryTime = new Date(trade.openTime).getTime();
      const exitTime = trade.closeTime ? new Date(trade.closeTime).getTime() : Date.now();
      
      if (isNaN(entryTime) || isNaN(exitTime)) {
          throw new Error("Invalid trade dates.");
      }

      const padding = 30 * 60 * 1000;
      const from = entryTime - padding;
      const to = exitTime + padding;

      setDebugInfo({
          symbol: trade.symbol,
          from: new Date(from).toISOString(),
          to: new Date(to).toISOString(),
          entryTime: new Date(entryTime).toISOString(),
          exitTime: new Date(exitTime).toISOString()
      });

      let candles: CandlestickData<Time>[] = [];

      if (useMock) {
        addLog("Generating mock data...");
        // Generate mock data centered around entry price
        const startPrice = trade.entryPrice;
        let currentPrice = startPrice;
        const startTime = Math.floor(from / 1000);
        const endTime = Math.floor(to / 1000);
        
        for (let t = startTime; t <= endTime; t += 60) {
          const change = (Math.random() - 0.5) * (startPrice * 0.001);
          const open = currentPrice;
          const close = currentPrice + change;
          const high = Math.max(open, close) + Math.random() * (startPrice * 0.0005);
          const low = Math.min(open, close) - Math.random() * (startPrice * 0.0005);
          
          candles.push({
            time: t as Time,
            open,
            high,
            low,
            close
          });
          currentPrice = close;
        }
      } else {
        // Fetch Data
        addLog(`Fetching candles for ${trade.symbol}`);
        
        // Add 10s timeout
        const fetchPromise = fetchHistoricalCandles(trade.symbol, '1', from, to);
        const timeoutPromise = new Promise<CandlestickData<Time>[]>((_, reject) => 
            setTimeout(() => reject(new Error("API Request timed out (10s)")), 10000)
        );

        try {
            candles = await Promise.race([fetchPromise, timeoutPromise]);
        } catch (e: any) {
            addLog("Fetch failed:", e.message);
            throw e;
        }
      }

      addLog(`Candles received: ${candles.length}`);

      if (candles.length === 0) {
        addLog('No data returned from API.');
        setError('No data available for this time range.');
        setLoading(false);
        return;
      }

      // Set Data
      seriesRef.current.setData(candles);
      addLog('Chart Data Set');

      // Add Markers
      const markers: any[] = [];

      // Helper to align time to nearest minute
      const alignToMinute = (ms: number) => {
           if (isNaN(ms)) return 0 as Time;
           return (Math.floor(ms / 1000 / 60) * 60) as Time;
      };

      // Entry Marker
      markers.push({
        time: alignToMinute(entryTime),
        position: 'belowBar',
        color: '#2196F3',
        shape: 'arrowUp',
        text: `Entry @ ${trade.entryPrice}`,
      });

      // Exit Marker (Final Exit)
      if (trade.closeTime) {
          markers.push({
            time: alignToMinute(exitTime),
            position: 'aboveBar',
            color: '#E91E63',
            shape: 'arrowDown',
            text: `Exit @ ${trade.exitPrice}`,
          });
      }

      // Partial Exits Markers
      if (trade.exits && trade.exits.length > 0) {
        trade.exits.forEach((exit, index) => {
          if (exit.date) {
              const exitTimestamp = new Date(exit.date).getTime();
              markers.push({
                time: alignToMinute(exitTimestamp),
                position: 'aboveBar',
                color: '#FF9800',
                shape: 'arrowDown',
                text: `${exit.type} @ ${exit.price}`,
              });
          }
        });
      }

      // Sort markers by time (required by lightweight-charts)
      markers.sort((a, b) => (a.time as number) - (b.time as number));
      seriesRef.current.setMarkers(markers);

      // Add Price Lines
      // Stop Loss (Red)
      if (trade.stopLoss) {
        seriesRef.current.createPriceLine({
          price: trade.stopLoss,
          color: '#FE5000', // brand-orange
          lineWidth: 2,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: 'SL',
        });
      }

      // Take Profit (Green) - Only if Win
      const isWin = trade.pnl > 0;
      if (isWin && trade.takeProfit) {
        seriesRef.current.createPriceLine({
          price: trade.takeProfit,
          color: '#CCFF00', // brand-lime
          lineWidth: 2,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: 'TP',
        });
      }

      // Fit Content with a small delay
      setTimeout(() => {
          chartRef.current?.timeScale().fitContent();
          addLog("Chart fitted to content");
      }, 100);

    } catch (err: any) {
      addLog("Error:", err.message);
      setError(err.message || 'Failed to load chart data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gray-900 rounded-lg overflow-hidden border border-gray-800 flex flex-col">
      {/* Debug Log Overlay - Always visible if there are logs and loading/error */}
      {(loading || error) && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-black/90 text-green-400 font-mono text-xs p-2 max-h-[200px] overflow-y-auto border-b border-gray-700">
            <p className="font-bold text-white mb-1">Debug Logs:</p>
            {logs.map((log, i) => (
                <div key={i}>{log}</div>
            ))}
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 text-white pt-[200px]">
          Loading Chart Data...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 text-red-500 p-4 text-center pt-[200px]">
          <p className="font-bold text-lg mb-2">{error}</p>
          {debugInfo && (
              <div className="mt-4 p-2 bg-gray-800 rounded text-xs text-left font-mono text-gray-300 mb-4">
                  <p>Symbol: {debugInfo.symbol}</p>
                  <p>From: {debugInfo.from}</p>
                  <p>To: {debugInfo.to}</p>
              </div>
          )}
          <Button onClick={() => loadData(true)} variant="secondary" size="sm">
            Load Mock Data
          </Button>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full flex-1" />
    </div>
  );
};

export default ReplayChart;
