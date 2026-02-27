
const FINNHUB_API_KEY = 'd6g3u3pr01qt4931f1hgd6g3u3pr01qt4931f1i0';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const fetchHistoricalCandles = async (
  symbol: string,
  resolution: string,
  from: number,
  to: number
): Promise<CandleData[]> => {
  // Finnhub requires unix timestamp in seconds
  const fromSeconds = Math.floor(from / 1000);
  const toSeconds = Math.floor(to / 1000);

  // Format symbol for Finnhub (Forex usually needs a provider prefix like OANDA)
  // Attempt to detect if it's a forex pair (6 chars, usually uppercase)
  let formattedSymbol = symbol.toUpperCase();
  if (formattedSymbol.length === 6 && !formattedSymbol.includes(':')) {
      // Simple heuristic for forex pairs like EURUSD -> OANDA:EUR_USD
      // This is a best-effort guess. Real apps might need a symbol mapping.
      const base = formattedSymbol.substring(0, 3);
      const quote = formattedSymbol.substring(3, 6);
      formattedSymbol = `OANDA:${base}_${quote}`;
  }

  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${formattedSymbol}&resolution=${resolution}&from=${fromSeconds}&to=${toSeconds}&token=${FINNHUB_API_KEY}`;
  console.log(`Fetching Finnhub: ${url.replace(FINNHUB_API_KEY, 'API_KEY')}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.s === 'ok') {
      return data.t.map((timestamp: number, index: number) => ({
        time: timestamp, // lightweight-charts expects seconds for time
        open: data.o[index],
        high: data.h[index],
        low: data.l[index],
        close: data.c[index],
      }));
    } else {
      console.error('Finnhub API error:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching candle data:', error);
    return [];
  }
};
