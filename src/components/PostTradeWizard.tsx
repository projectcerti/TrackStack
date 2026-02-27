import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trade } from '@/types';
import { useTrades } from '@/context/TradeContext';
import { GoogleGenAI } from "@google/genai";
import { Loader2, BrainCircuit, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes, parseISO } from 'date-fns';

interface PostTradeWizardProps {
  trade: Trade;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PostTradeWizard({ trade, open, onOpenChange }: PostTradeWizardProps) {
  const { editTrade } = useTrades();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Form State
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [didMoveStopLoss, setDidMoveStopLoss] = useState<boolean>(false);
  const [exitReason, setExitReason] = useState<string>('PLANNED');
  const [emotions, setEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>(trade.notes || '');

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        toast.error("Gemini API Key is missing.");
        setIsAnalyzing(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Calculate Hold Time
      const openTime = parseISO(trade.openTime);
      const closeTime = trade.closeTime ? parseISO(trade.closeTime) : new Date();
      const durationMinutes = differenceInMinutes(closeTime, openTime);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const holdTimeStr = `${hours}h ${minutes}m`;

      // Calculate Pips (Strict Logic)
      const isJpy = trade.symbol.toUpperCase().includes('JPY');
      const multiplier = isJpy ? 100 : 10000;
      let pips = 0;
      if (trade.type === 'BUY') {
          pips = (trade.exitPrice - trade.entryPrice) * multiplier;
      } else {
          pips = (trade.entryPrice - trade.exitPrice) * multiplier;
      }
      const pipsFormatted = pips > 0 ? `🟢 +${pips.toFixed(1)} Pips` : `🔴 ${pips.toFixed(1)} Pips`;

      // Calculate R-Multiple
      const sl = parseFloat(stopLoss);
      const tp = parseFloat(takeProfit);
      let plannedR = 0;
      let realizedR = 0;

      if (!isNaN(sl) && sl !== 0) {
          const risk = Math.abs(trade.entryPrice - sl);
          const rewardPlanned = Math.abs(tp - trade.entryPrice);
          const rewardRealized = Math.abs(trade.exitPrice - trade.entryPrice);
          
          if (risk !== 0) {
              plannedR = rewardPlanned / risk;
              realizedR = rewardRealized / risk;
              // Adjust sign for realized R
              if (pips < 0) realizedR = -realizedR;
          }
      }

      // Calculate Consistency Score
      let score = 100;
      const breaches: string[] = [];
      
      if (didMoveStopLoss) {
          score -= 50;
          breaches.push("Moved Stop Loss (-50%)");
      }
      
      if (exitReason === 'PANIC' || exitReason === 'GREED') {
          score -= 30;
          breaches.push("Early Exit / Emotional Exit (-30%)");
      }

      if (trade.strategy === 'Impulse' || !trade.strategy) {
           score -= 20;
           breaches.push("Outside Playbook (-20%)");
      }

      const scoreStr = Math.max(0, score);
      const breachesStr = breaches.length > 0 ? breaches.join(", ") : "None. Flawless execution.";

      // Construct Prompt
      const prompt = `
        SYSTEM INSTRUCTION: TRADETRACKER ANALYTICS ENGINE
        
        You are the backend analytical engine for "Trackstack."
        
        INPUT DATA:
        - Asset: ${trade.symbol}
        - Direction: ${trade.type}
        - Date/Time: ${format(openTime, 'EEEE, HH:mm')}
        - Result Pips: ${pipsFormatted}
        - Realized R: ${realizedR.toFixed(2)}R
        - Planned R: ${plannedR.toFixed(2)}R
        - Hold Time: ${holdTimeStr}
        - Playbook Setup: ${trade.strategy || 'Unknown'}
        - Consistency Score: ${scoreStr}%
        - Rule Breaches: ${breachesStr}
        - Mistakes Logged: ${emotions.join(', ') || 'None'}
        - User Notes: "${notes}"
        
        OUTPUT FORMAT (Strict Markdown):
        
        📊 Trackstack Execution Report
        Asset: [Pair] | Direction: [Buy/Sell] | Date/Time: [Day, Hour]

        1. Performance Metrics
        Result: [Result Pips]
        Realized R-Multiple: [Realized R]R (Planned: [Planned R]R)
        Hold Time: [Hold Time]

        2. Execution & Consistency
        Playbook Setup: [Playbook Setup]
        Consistency Score: [Consistency Score]%
        Rule Breaches: [Rule Breaches]

        3. Behavioral Heatmap
        Mistakes Logged: [Mistakes Logged]
        Psychological Notes: [Summarize the trader's mental state based on notes and mistakes in 1-2 sentences. Be direct and emotionless.]
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-latest",
        contents: prompt,
      });

      const text = response.text;
      setAnalysisResult(text);
      
      // Save analysis to trade notes
      editTrade(trade.id, {
          notes: text,
          stopLoss: !isNaN(sl) ? sl : undefined,
          takeProfit: !isNaN(tp) ? tp : undefined,
          rMultiple: realizedR,
          pips: pips,
          behavior: {
              risk: {
                  isAdheredToPlan: !didMoveStopLoss,
                  didMoveStopLoss,
                  didRespectPositionSize: true, // Assumption for now
                  exitType: exitReason as any
              },
              timing: {
                  actualDurationMinutes: durationMinutes,
                  timingDeviation: 'ON_TIME'
              },
              emotions: {
                  entry: [],
                  during: [],
                  exit: emotions as any
              },
              psychScore: score
          }
      });

    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Failed to generate analysis.");
      setIsAnalyzing(false);
    }
  };

  const toggleEmotion = (emotion: string) => {
    if (emotions.includes(emotion)) {
      setEmotions(emotions.filter(e => e !== emotion));
    } else {
      setEmotions([...emotions, emotion]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-black/90 backdrop-blur-xl border-white/10 text-white max-h-[90vh] overflow-y-auto rounded-3xl shadow-glow-purple">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-purple glow-text-purple">
            <BrainCircuit className="w-5 h-5" />
            Post-Trade Analysis
          </DialogTitle>
          <DialogDescription className="text-brand-gray-med">
            Review your execution to generate a Trackstack Report.
          </DialogDescription>
        </DialogHeader>

        {!analysisResult ? (
          <div className="space-y-6 py-4">
            {/* Step 1: Risk Parameters */}
            <div className="space-y-4">
                <h3 className="text-sm font-mono uppercase text-brand-purple border-b border-white/10 pb-1 glow-text-purple">1. Risk Parameters</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Stop Loss Price</Label>
                        <Input 
                            type="number" 
                            step="0.00001" 
                            placeholder="1.0000" 
                            value={stopLoss} 
                            onChange={e => setStopLoss(e.target.value)}
                            className="bg-white/5 border-white/10 rounded-xl focus-visible:ring-brand-purple"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Take Profit Price</Label>
                        <Input 
                            type="number" 
                            step="0.00001" 
                            placeholder="1.0050" 
                            value={takeProfit} 
                            onChange={e => setTakeProfit(e.target.value)}
                            className="bg-white/5 border-white/10 rounded-xl focus-visible:ring-brand-purple"
                        />
                    </div>
                </div>
            </div>

            {/* Step 2: Execution Discipline */}
            <div className="space-y-4">
                <h3 className="text-sm font-mono uppercase text-brand-purple border-b border-white/10 pb-1 glow-text-purple">2. Execution Discipline</h3>
                
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                    <Label className="cursor-pointer flex-1">Did you move your Stop Loss?</Label>
                    <div className="flex gap-2">
                        <Button 
                            size="sm" 
                            variant={didMoveStopLoss ? "destructive" : "outline"} 
                            onClick={() => setDidMoveStopLoss(true)}
                            className={`rounded-full ${didMoveStopLoss ? "border-brand-orange text-brand-orange shadow-glow-orange" : "border-white/10 hover:bg-white/5"}`}
                        >
                            Yes (-50pts)
                        </Button>
                        <Button 
                            size="sm" 
                            variant={!didMoveStopLoss ? "default" : "outline"} 
                            onClick={() => setDidMoveStopLoss(false)}
                            className={`rounded-full ${!didMoveStopLoss ? "bg-brand-purple text-white hover:bg-brand-purple/90 glow-purple" : "border-white/10 hover:bg-white/5"}`}
                        >
                            No
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Exit Reason</Label>
                    <Select value={exitReason} onValueChange={setExitReason}>
                        <SelectTrigger className="bg-white/5 border-white/10 rounded-xl focus:ring-brand-purple">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/95 border-white/10 text-white rounded-xl">
                            <SelectItem value="PLANNED">Planned (TP/SL Hit)</SelectItem>
                            <SelectItem value="PANIC">Panic / Fear (-30pts)</SelectItem>
                            <SelectItem value="GREED">Greed / Early Take Profit (-30pts)</SelectItem>
                            <SelectItem value="MANUAL">Manual Technical Exit</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Step 3: Psychology */}
            <div className="space-y-4">
                <h3 className="text-sm font-mono uppercase text-brand-purple border-b border-white/10 pb-1 glow-text-purple">3. Behavioral Heatmap</h3>
                <div className="flex flex-wrap gap-2">
                    {['FOMO', 'REVENGE', 'HESITATION', 'CONFIDENT', 'ANXIOUS', 'BOREDOM'].map(emotion => (
                        <BadgeButton 
                            key={emotion}
                            label={emotion} 
                            selected={emotions.includes(emotion)} 
                            onClick={() => toggleEmotion(emotion)} 
                        />
                    ))}
                </div>
                <Textarea 
                    placeholder="Brief psychological notes (e.g., 'Felt rushed due to news event...')" 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="bg-white/5 border-white/10 min-h-[80px] rounded-xl focus-visible:ring-brand-purple"
                />
            </div>

            <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing} 
                className="w-full bg-brand-orange text-black hover:bg-brand-orange/90 font-bold py-6 rounded-full glow-orange transition-all"
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Report...
                    </>
                ) : (
                    <>
                        <BrainCircuit className="w-4 h-4 mr-2" />
                        Generate Trackstack Report
                    </>
                )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-sm whitespace-pre-wrap text-brand-gray-light max-h-[60vh] overflow-y-auto shadow-inner">
                {analysisResult}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setAnalysisResult(null)} className="rounded-full border-white/10 hover:bg-white/5">Edit Inputs</Button>
                <Button onClick={() => onOpenChange(false)} className="bg-brand-purple hover:bg-brand-purple/90 text-white rounded-full glow-purple font-bold">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save & Close
                </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BadgeButton({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void, key?: string }) {
    return (
        <button 
            onClick={onClick}
            className={`px-3 py-1 rounded-full text-xs font-mono uppercase border transition-all ${
                selected 
                ? 'bg-brand-purple/20 border-brand-purple text-brand-purple glow-text-purple shadow-glow-purple' 
                : 'bg-transparent border-white/10 text-brand-gray-med hover:border-white/30 hover:text-brand-gray-light'
            }`}
        >
            {label}
        </button>
    );
}
