import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useTrades } from '@/context/TradeContext';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Trade } from '@/types';

export default function CsvImportDialog() {
  const { bulkAddTrades } = useTrades();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please upload a valid CSV file.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setParsing(false);
        return;
      }

      const lines = text.split(/\r\n|\n/);
      
      // Smart Header Detection
      // We score each of the first 40 lines based on how many "trading keywords" they contain.
      let bestHeaderIndex = 0;
      let maxKeywords = 0;
      const keywords = [
          'symbol', 'ticker', 'pair', 'instrument', 'asset',
          'type', 'direction', 'side', 'action', 'buy', 'sell',
          'price', 'entry', 'exit', 'open', 'close', 'avg',
          'size', 'qty', 'quantity', 'amount', 'volume', 'lots',
          'date', 'time', 'created', 'filled',
          'pnl', 'profit', 'loss', 'net', 'gross', 'realized'
      ];
      
      for (let i = 0; i < Math.min(lines.length, 40); i++) {
        const lineLower = lines[i].toLowerCase().trim();
        
        // Skip section headers like "Deals", "Transactions", "Summary"
        if (lineLower === 'deals' || lineLower === 'transactions' || lineLower === 'summary' || lineLower === 'balance') {
            continue;
        }

        let count = 0;
        keywords.forEach(k => {
            if (lineLower.includes(k)) count++;
        });
        
        // Bonus points if it looks like a CSV header (has commas)
        if (lines[i].includes(',')) count += 1;

        if (count > maxKeywords) {
            maxKeywords = count;
            bestHeaderIndex = i;
        }
      }
      
      // If we found a likely header (at least 2 keywords match), use it. 
      // Otherwise, if we didn't find anything good, we might just try 0 or 1.
      // For safety, if maxKeywords is very low, we might just fallback to 0, 
      // but usually a trade CSV has at least "Symbol" and "Price" or "Date".
      const headerIndex = maxKeywords >= 2 ? bestHeaderIndex : 0;
      
      console.log(`Detected header at line ${headerIndex} with score ${maxKeywords}: "${lines[headerIndex]}"`);

      const csvContent = lines.slice(headerIndex).join('\n');

      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          setParsing(false);
          
          const validRows = results.data.filter((row: any) => {
             // Relaxed validation: Just check if it's not a summary row
             // We'll try to extract data even if some fields are missing
             const values = Object.values(row).map(v => String(v).toLowerCase().trim());
             
             // Check for summary keywords in the first few columns
             const firstValues = values.slice(0, 3);
             const summaryKeywords = ['summary', 'deposit', 'withdrawal', 'balance', 'total', 'transactions', 'deals', 'id', 'time'];
             if (firstValues.some(v => summaryKeywords.includes(v))) {
                 return false;
             }
             
             // Check if row is empty or just commas
             if (values.every(v => v === '' || v === 'undefined' || v === 'null')) return false;

             // If the row has a symbol but no price/size, it might be a section header that PapaParse misidentified
             const rowKeys = Object.keys(row).map(k => k.toLowerCase());
             const hasSymbol = rowKeys.some(k => k.includes('symbol') || k.includes('ticker')) && row[Object.keys(row).find(k => k.toLowerCase().includes('symbol'))!];
             const hasPrice = rowKeys.some(k => k.includes('price')) && row[Object.keys(row).find(k => k.toLowerCase().includes('price'))!];
             
             if (hasSymbol && !hasPrice && values.filter(v => v !== '').length < 3) return false;

             return true;
          });

          if (results.errors.length > 0) {
            const fatalErrors = results.errors.filter(e => e.type === 'Quotes' || e.type === 'Delimiter');
            if (fatalErrors.length > 0) {
               console.warn("CSV Parse Warnings:", results.errors);
            }
          }
          
          setPreviewData(validRows);
          if (validRows.length === 0) {
            setError('No valid trade rows found in CSV.');
          } else {
              setError(null);
          }
        },
        error: (err) => {
          setParsing(false);
          setError(`Failed to read file: ${err.message}`);
        }
      });
    };
    reader.readAsText(file);
  };

  const mapCsvToTrade = (row: any): Omit<Trade, 'id' | 'accountId' | 'pnlPercent' | 'status'> & { pnl: number, status?: 'OPEN' | 'CLOSED' | 'PENDING' } | null => {
    try {
      // Helper to find value case-insensitively
      const getValue = (keys: string[]) => {
        const rowKeys = Object.keys(row);
        for (const key of keys) {
          const foundKey = rowKeys.find(k => k.toLowerCase().trim() === key.toLowerCase());
          if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
        }
        return undefined;
      };

      // 1. Symbol Detection
      let symbol = getValue(['Symbol', 'Ticker', 'Pair', 'Instrument', 'Market', 'Asset', 'Contract', 'Security', 'Product', 'Item', 'Description']);
      if (!symbol) {
          // Fallback: Look for any value that looks like a ticker (2-12 uppercase letters/numbers, maybe with / . _)
          const values = Object.values(row);
          for (const val of values) {
              const s = String(val).trim().toUpperCase();
              // Regex for common tickers: GBPUSD, BTC/USD, AAPL, EUR.USD, XAUUSD, etc.
              // Avoid "Buy", "Sell", dates, numbers, and common boolean strings
              if (/^[A-Z0-9\/\._-]{2,12}$/.test(s) && 
                  !/^(BUY|SELL|LONG|SHORT|OPEN|CLOSE|TRUE|FALSE|NULL|NAN|TOTAL|SUM|AVG)$/i.test(s) && 
                  isNaN(parseFloat(s))) {
                  symbol = s;
                  break;
              }
          }
      }
      if (!symbol) {
          console.warn("[CsvImport] Could not detect symbol for row:", row);
          return null; 
      }

      // 2. Type/Direction Detection
      let typeStr = getValue(['Opening Direction', 'Type', 'Side', 'Direction', 'Action', 'Order Type']);
      let type: 'BUY' | 'SELL' = 'BUY'; // Default
      
      // If we found a type string, parse it
      if (typeStr) {
          const t = String(typeStr).toLowerCase();
          if (t.includes('sell') || t.includes('short')) type = 'SELL';
      } else {
          // Fallback: Look for "Buy"/"Sell" in any column
          const values = Object.values(row);
          for (const val of values) {
              const s = String(val).toLowerCase();
              if (s === 'buy' || s === 'long') { type = 'BUY'; break; }
              if (s === 'sell' || s === 'short') { type = 'SELL'; break; }
          }
      }

      // 3. Numeric Fields
      const entryPriceVal = getValue(['Entry price', 'Entry', 'Open Price', 'Avg Price', 'Price', 'Exec Price']);
      const exitPriceVal = getValue(['Closing Price', 'Exit Price', 'Exit', 'Close Price']);
      const sizeVal = getValue(['Closing Quantity', 'Size', 'Quantity', 'Qty', 'Amount', 'Volume', 'Lots']);
      const pnlVal = getValue(['Net GBP', 'Net USD', 'Net Profit', 'PnL', 'Profit', 'Loss', 'Net PnL', 'Realized PnL', 'Amount']); // Sometimes "Amount" is PnL if Size is "Qty"

      const cleanNum = (val: any) => {
          if (!val) return 0;
          // Remove currency symbols, commas, "Lots", etc.
          // Keep digits, dot, minus sign
          const s = String(val).replace(/[^0-9.\-]/g, '');
          const n = parseFloat(s);
          return isNaN(n) ? 0 : n;
      };

      const entryPrice = cleanNum(entryPriceVal);
      const exitPrice = cleanNum(exitPriceVal);
      const size = cleanNum(sizeVal);
      const pnl = cleanNum(pnlVal);

      // Extract Pips if available
      const pipsVal = getValue(['Pips', 'Points']);
      const pips = pipsVal ? cleanNum(pipsVal) : undefined;

      // 4. Date Detection
      const openTimeVal = getValue(['Opening Time', 'Open Time', 'Date', 'Time', 'Open Date', 'Entry Time', 'Created Time']);
      const closeTimeVal = getValue(['Closing Time (UTC+0)', 'Closing Time', 'Close Time', 'Close Date', 'Exit Time', 'Updated Time']);

      const parseDateSafe = (val: any) => {
          if (!val) return null;
          const d = new Date(val);
          return isNaN(d.getTime()) ? null : d.toISOString();
      };

      let closeTime = parseDateSafe(closeTimeVal);
      let openTime = parseDateSafe(openTimeVal);

      // Fallbacks for dates
      if (!closeTime && openTime) closeTime = openTime;
      if (!openTime && closeTime) openTime = closeTime;
      if (!openTime && !closeTime) {
          openTime = new Date().toISOString();
          closeTime = new Date().toISOString();
      }

      // 5. Status
      const statusStr = getValue(['Status', 'State']);
      let status: 'OPEN' | 'CLOSED' | 'PENDING' = 'CLOSED';
      if (statusStr) {
          const s = String(statusStr).toUpperCase();
          if (s === 'OPEN' || s === 'CLOSED' || s === 'PENDING') status = s;
      }

      // 6. Other Metadata
      const strategyVal = getValue(['Strategy', 'Setup', 'Method']);
      const notesVal = getValue(['Notes', 'Comments', 'Description']);
      const tagsVal = getValue(['Tags', 'Labels']);

      return {
        symbol: String(symbol).toUpperCase(),
        type,
        entryPrice,
        exitPrice,
        size,
        pnl,
        pips,
        openTime: openTime!,
        closeTime: closeTime!,
        status,
        strategy: strategyVal ? String(strategyVal) : undefined,
        notes: notesVal ? String(notesVal) : undefined,
        tags: tagsVal ? String(tagsVal).split(',').map((t: string) => t.trim()) : undefined
      };
    } catch (e) {
      console.error("Error mapping row:", row, e);
      return null;
    }
  };

  const handleImport = async () => {
    if (!previewData.length) return;

    setParsing(true);
    const tradesToImport: any[] = [];
    
    for (const row of previewData) {
      const tradeData = mapCsvToTrade(row);
      if (tradeData) {
        tradesToImport.push(tradeData);
      }
    }

    try {
      await bulkAddTrades(tradesToImport);
      toast.success(`Imported ${tradesToImport.length} trades successfully.`);
      setIsOpen(false);
      setFile(null);
      setPreviewData([]);
    } catch (e) {
      console.error("[CsvImport] Bulk import failed:", e);
      toast.error("Failed to import trades. Check console for details.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-dashed border-brand-gray-med text-brand-gray-med hover:border-brand-purple hover:text-brand-purple hover:bg-brand-purple/10">
          <Upload className="w-4 h-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-brand-dark border-white/10 text-white shadow-glow-purple">
        <DialogHeader>
          <DialogTitle className="text-brand-purple glow-text-purple">Import Trades from CSV</DialogTitle>
          <DialogDescription className="text-brand-gray-med">
            Upload a CSV file with your trade history.
            <br />
            <span className="text-xs text-brand-gray-med/70">
              Required columns: Symbol, Type, Entry Price, Exit Price, Size, Open Time.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-brand-purple bg-brand-purple/5' : 'border-white/10 hover:border-brand-purple/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv" 
              onChange={handleFileChange} 
            />
            
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-brand-purple" />
                <p className="font-medium text-white">{file.name}</p>
                <p className="text-xs text-brand-gray-med">{(file.size / 1024).toFixed(1)} KB</p>
                <Button variant="ghost" size="sm" className="text-brand-orange hover:text-brand-orange/80 hover:bg-brand-orange/10 h-6 mt-2" onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreviewData([]);
                  setError(null);
                }}>
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 cursor-pointer">
                <Upload className="w-8 h-8 text-brand-gray-med" />
                <p className="font-medium text-brand-gray-light">Click to upload CSV</p>
                <p className="text-xs text-brand-gray-med">or drag and drop here</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-brand-orange bg-brand-orange/10 p-3 rounded-md text-sm border border-brand-orange/20">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {previewData.length > 0 && !error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-brand-purple bg-brand-purple/10 p-3 rounded-md text-sm border border-brand-purple/20">
                <CheckCircle className="w-4 h-4" />
                Found {previewData.length} rows to import
              </div>
              <div className="max-h-[200px] overflow-y-auto border border-white/10 rounded-md [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-black [&::-webkit-scrollbar-thumb]:bg-brand-purple [&::-webkit-scrollbar-thumb]:rounded-full">
                <table className="w-full text-xs text-left">
                  <thead className="bg-black/40 text-brand-gray-med sticky top-0">
                    <tr>
                      {Object.keys(previewData[0]).slice(0, 5).map(key => (
                        <th key={key} className="px-2 py-1 font-normal">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {previewData.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).slice(0, 5).map((val: any, j) => (
                          <td key={j} className="px-2 py-1 text-brand-gray-light truncate max-w-[100px]">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 5 && (
                  <div className="p-2 text-center text-xs text-brand-gray-med border-t border-white/10">
                    ...and {previewData.length - 5} more rows
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="border-white/10 text-brand-gray-med hover:bg-white/10 hover:text-white">Cancel</Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || parsing || !!error || previewData.length === 0}
            className="bg-brand-orange text-white hover:bg-brand-orange/80 shadow-glow-orange disabled:opacity-50 disabled:shadow-none"
          >
            Import {previewData.length} Trades
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
