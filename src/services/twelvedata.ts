import { CandlestickData, Time } from 'lightweight-charts';

const TWELVE_DATA_API_KEY = '4afb1cd9ab91468a9f183ebe7e79afe8';

interface TwelveDataCandle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export const fetchHistoricalCandles = async (
  symbol: string,
  interval: string, // '1min', '5min', etc.
  from: number, // timestamp in ms
  to: number // timestamp in ms
): Promise<CandlestickData<Time>[]> => {
  // Format symbol for TwelveData (e.g., EUR/USD instead of OANDA:EUR_USD)
  // Remove broker prefix if present
  let formattedSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
  
  // TwelveData uses '/' for forex pairs (e.g. EUR/USD)
  // If the symbol is 6 chars and looks like a forex pair (e.g. EURUSD), try adding a slash
  // But for now, let's just strip the prefix and let the user/system provide the correct format or rely on TwelveData's flexibility
  // Common forex pairs in TwelveData are like EUR/USD
  if (!formattedSymbol.includes('/') && formattedSymbol.length === 6 && /^[A-Z]+$/.test(formattedSymbol)) {
      // Heuristic: if it's a 6-letter forex pair, it might need a slash. 
      // However, TwelveData often accepts EURUSD. Let's try without slash first, or with slash if it fails.
      // Actually, TwelveData documentation says "EUR/USD".
      formattedSymbol = `${formattedSymbol.substring(0, 3)}/${formattedSymbol.substring(3)}`;
  }

  // Convert timestamps to YYYY-MM-DD HH:mm:ss for TwelveData
  // Note: TwelveData uses local time of the exchange by default, or UTC if specified.
  // We'll request UTC to be safe.
  const fromDate = new Date(from).toISOString().replace('T', ' ').split('.')[0];
  const toDate = new Date(to).toISOString().replace('T', ' ').split('.')[0];

  // Map Finnhub resolution to TwelveData interval
  // Finnhub '1' -> TwelveData '1min'
  const intervalMap: Record<string, string> = {
    '1': '1min',
    '5': '5min',
    '15': '15min',
    '30': '30min',
    '60': '1h',
    'D': '1day',
    'W': '1week',
    'M': '1month'
  };
  const tdInterval = intervalMap[interval] || '1min';

  const url = `https://api.twelvedata.com/time_series?symbol=${formattedSymbol}&interval=${tdInterval}&start_date=${fromDate}&end_date=${toDate}&apikey=${TWELVE_DATA_API_KEY}&timezone=UTC&order=ASC`;
  
  console.log(`Fetching TwelveData: ${url.replace(TWELVE_DATA_API_KEY, 'API_KEY')}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TwelveData API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[TwelveData] Response:', data);

    if (data.status === 'error') {
      console.error('TwelveData Error:', data.message);
      throw new Error(data.message || 'Failed to fetch data from TwelveData');
    }

    if (!data.values || !Array.isArray(data.values)) {
      console.warn('TwelveData: No data values found', data);
      return [];
    }

    // Transform data to lightweight-charts format
    const candles = data.values.map((candle: TwelveDataCandle) => {
      // Ensure UTC parsing by appending Z if missing
      const timeStr = candle.datetime.endsWith('Z') ? candle.datetime : `${candle.datetime}Z`;
      return {
        time: (new Date(timeStr).getTime() / 1000) as Time,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
      };
    });

    return candles.sort((a: any, b: any) => (a.time as number) - (b.time as number));

  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('TwelveData request timed out (10s)');
    }
    console.error('Error fetching historical candles:', error);
    throw error;
  }
};
