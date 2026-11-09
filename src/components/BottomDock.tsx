import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart2, 
  Terminal, 
  Wallet, 
  Play, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  ChevronUp, 
  ChevronDown,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Save,
  FileCode,
  Sliders,
  Code,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { WatchlistItem, CandleData, IndicatorType, IndicatorConfig } from '../types';
import { runBacktest, StrategyConfig, BacktestReport, StrategyType } from '../services/backtestEngine';
import { executePythonScript, extractPythonInputs, PythonInputDef } from '../services/pythonEngine';
import { soundService } from '../services/sound';
import { marketDataService } from '../services/marketData';
import { useTranslation } from '../i18n';

export type BottomTabType = 'screener' | 'paperTrading' | 'pythonEditor' | 'strategyTester';

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  qty: number;
  timestamp: number;
}

interface TradeHistory {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  pnlPercent: number;
  timestamp: number;
}

interface BottomDockProps {
  isOpen: boolean;
  activeTab: BottomTabType;
  onTabChange: (tab: BottomTabType) => void;
  onToggleOpen: () => void;
  activeSymbol: string;
  currentPrice: number;
  onSelectSymbol: (symbol: string) => void;
  watchlist: WatchlistItem[];
  candles?: CandleData[];
  onAddIndicator?: (type: IndicatorType) => void;
  onAddParsedIndicators?: (indicators: IndicatorConfig[]) => void;
  onOpenBacktestModal?: () => void;
}

const PAPER_STORAGE_KEY = 'openchart_paper_account_v1';

const PYTHON_TEMPLATES: Record<string, string> = {
  custom: `# OpenChart Python Quant Engine v3.11
# Strateji: Vektörize Trend Takip & Momentum

fast_len = param("fast_len", default=9, min=2, max=100, label="Hızlı EMA")
slow_len = param("slow_len", default=21, min=5, max=200, label="Yavaş EMA")
rsi_len = param("rsi_len", default=14, min=2, max=50, label="RSI Periyodu")

# 1. Göstergeleri Hesapla (Vectorized EMA & RSI)
df['ema_fast'] = ta.ema(df['close'], period=fast_len)
df['ema_slow'] = ta.ema(df['close'], period=slow_len)
df['rsi'] = ta.rsi(df['close'], period=rsi_len)

# 2. Grafiğe Çizgileri Ekle
plot(df['ema_fast'], title="EMA Hızlı (9)", color="#00e676", linewidth=2)
plot(df['ema_slow'], title="EMA Yavaş (21)", color="#ff5252", linewidth=2)

# 3. Kesişim Sinyalleri
buy_signal = crossover(df['ema_fast'], df['ema_slow']) & (df['rsi'] > 50)
sell_signal = crossunder(df['ema_fast'], df['ema_slow'])

plot_shape(buy_signal, title="ALIŞ", shape="triangle_up", color="#00e676")
plot_shape(sell_signal, title="SATIŞ", shape="triangle_down", color="#ff5252")`,

  emaCross: `# Python: EMA Golden Cross Stratejisi
fast_period = param("fast_period", 9, label="Hızlı Periyot")
slow_period = param("slow_period", 21, label="Yavaş Periyot")

fast_ema = ta.ema(df['close'], fast_period)
slow_ema = ta.ema(df['close'], slow_period)

plot(fast_ema, title="EMA 9", color="#00e676", linewidth=2)
plot(slow_ema, title="EMA 21", color="#ff5252", linewidth=2)

buy_cross = crossover(fast_ema, slow_ema)
sell_cross = crossunder(fast_ema, slow_ema)

plot_shape(buy_cross, title="Alış Sinyali", shape="triangle_up", color="#00e676")
plot_shape(sell_cross, title="Satış Sinyali", shape="triangle_down", color="#ff5252")`,

  rsiPullback: `# Python: RSI Momentum & Mean Reversion
rsi_period = param("rsi_period", 14, label="RSI Periyodu")
rsi_vals = ta.rsi(df['close'], rsi_period)

plot(rsi_vals, title="RSI (14)", color="#7e57c2", linewidth=2, overlay=False)
hline(70, title="Aşırı Alım", color="#ef5350")
hline(30, title="Aşırı Satış", color="#26a69a")`,

  macdMomentum: `# Python: MACD Momentum Squeeze
fast = param("fast", 12, label="Hızlı EMA")
slow = param("slow", 26, label="Yavaş EMA")
signal = param("signal", 9, label="Sinyal Periyodu")

macd_line, signal_line, hist = ta.macd(df['close'], fast=fast, slow=slow, signal_period=signal)

plot(macd_line, title="MACD", color="#2962ff", overlay=False)
plot(signal_line, title="Sinyal", color="#ff6d00", overlay=False)
plot(hist, title="Histogram", color="#26a69a", linewidth=3, overlay=False)`,

  supertrend: `# Python: Supertrend Volatilite & Stop-Loss Takipçisi
factor = param("factor", 3.0, label="Çarpan (Multiplier)")
atr_period = param("atr_period", 10, label="ATR Periyodu")

st_line, direction = ta.supertrend(df, factor=factor, atr_period=atr_period)
plot(st_line, title="Supertrend", color="#00e676", linewidth=2)`,

  bollinger: `# Python: Bollinger Bantları Volatilite Squeeze
period = param("period", 20, label="Bant Periyodu")
std_dev = param("std_dev", 2.0, label="Standart Sapma")

upper, middle, lower = ta.bollinger(df['close'], period=period, mult=std_dev)

plot(upper, title="Üst Bant", color="#2962ff", linewidth=1.5)
plot(middle, title="Orta Bant (SMA)", color="#ff9800", linewidth=1.5)
plot(lower, title="Alt Bant", color="#2962ff", linewidth=1.5)`
};

export const BottomDock: React.FC<BottomDockProps> = React.memo(({
  isOpen,
  activeTab,
  onTabChange,
  onToggleOpen,
  activeSymbol,
  currentPrice,
  onSelectSymbol,
  watchlist,
  candles = [],
  onAddIndicator,
  onAddParsedIndicators,
  onOpenBacktestModal,
}) => {
  const { t } = useTranslation();
  // Screener state
  const [screenerSearch, setScreenerSearch] = useState('');
  const [screenerFilter, setScreenerFilter] = useState<'all' | 'gainers' | 'losers' | 'oversold' | 'overbought'>('all');

  // Paper Trading state
  const [balance, setBalance] = useState<number>(100000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<TradeHistory[]>([]);
  const [orderQty, setOrderQty] = useState<string>('0.1');
  const [orderSide, setOrderSide] = useState<'long' | 'short'>('long');
  const [tradeMessage, setTradeMessage] = useState<string | null>(null);

  // Dock height sizing state
  const [dockSize, setDockSize] = useState<'normal' | 'expanded' | 'fullscreen'>('normal');

  // Python Quant Editor state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [pythonViewMode, setPythonViewMode] = useState<'editor' | 'inputs'>('editor');
  const [pythonInputOverrides, setPythonInputOverrides] = useState<Record<string, any>>({});
  const [pythonCode, setPythonCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('openchart_python_code');
      if (saved) return saved;
    } catch (_) {}
    return PYTHON_TEMPLATES.custom;
  });
  const [pythonConsoleOutput, setPythonConsoleOutput] = useState<string>('Python Quant Engine v3.11 Ready.');
  const [pythonStatus, setPythonStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Extract live inputs from Python Code for visual customization
  const liveInputs = useMemo(() => extractPythonInputs(pythonCode), [pythonCode]);

  const groupedLiveInputs = useMemo(() => {
    const groups: Record<string, PythonInputDef[]> = {};
    for (const inp of liveInputs) {
      const g = inp.group || t.modals.chartSettingsTitle || 'General';
      if (!groups[g]) groups[g] = [];
      groups[g].push(inp);
    }
    return groups;
  }, [liveInputs, t]);

  // Dynamic pixel height state with mouse dragging
  const [customDockHeight, setCustomDockHeight] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('openchart_bottom_dock_height');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 120 && val <= 850) return val;
      }
    } catch (_) {}
    return null;
  });
  const [isResizingDock, setIsResizingDock] = useState(false);

  const handleStartResizeDock = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingDock(true);
    const startY = e.clientY;
    const startH = customDockHeight ?? (dockSize === 'fullscreen' ? window.innerHeight * 0.8 : dockSize === 'expanded' ? 440 : 256);

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Dragging mouse UP increases dock height
      const deltaY = startY - moveEvent.clientY;
      const minH = 120;
      const maxH = Math.round(window.innerHeight * 0.85);
      const newHeight = Math.round(Math.min(Math.max(startH + deltaY, minH), maxH));
      setCustomDockHeight(newHeight);
    };

    const onMouseUp = () => {
      setIsResizingDock(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        setCustomDockHeight(h => {
          if (h) localStorage.setItem('openchart_bottom_dock_height', String(h));
          return h;
        });
      } catch (_) {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Strategy Tester state
  const [btStrategy, setBtStrategy] = useState<StrategyType>('EMA_CROSS');
  const [btAllowShort, setBtAllowShort] = useState<boolean>(true);
  const [btFastEma, setBtFastEma] = useState<number>(9);
  const [btSlowEma, setBtSlowEma] = useState<number>(21);
  const [btRsiPeriod, setBtRsiPeriod] = useState<number>(14);
  const [btRsiOversold, setBtRsiOversold] = useState<number>(30);
  const [btStPeriod, setBtStPeriod] = useState<number>(10);
  const [btStMult, setBtStMult] = useState<number>(3);
  const [btCapital, setBtCapital] = useState<number>(10000);
  const [btReport, setBtReport] = useState<BacktestReport | null>(null);

  // Run Backtest
  const executeBacktest = useCallback(() => {
    if (!candles || candles.length < 50) return;
    const config: StrategyConfig = {
      type: btStrategy,
      params: {
        fast: btFastEma,
        slow: btSlowEma,
        period: btStrategy === 'RSI_REVERSAL' ? btRsiPeriod : btStPeriod,
        oversold: btRsiOversold,
        multiplier: btStMult,
      },
      makerFee: 0.0002, // 0.02%
      takerFee: 0.0005, // 0.05%
      slippage: 0.0003, // 0.03%
      allowShort: btAllowShort,
    };

    const report = runBacktest(candles, config, btCapital);
    setBtReport(report);
  }, [candles, btStrategy, btAllowShort, btFastEma, btSlowEma, btRsiPeriod, btRsiOversold, btStPeriod, btStMult, btCapital]);

  // Automatically run backtest when strategy tab becomes active or candles update
  useEffect(() => {
    if (activeTab === 'strategyTester' && candles.length > 50 && !btReport) {
      executeBacktest();
    }
  }, [activeTab, candles.length, btReport, executeBacktest]);

  // Load paper trading from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PAPER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.balance === 'number') setBalance(parsed.balance);
        if (Array.isArray(parsed.positions)) setPositions(parsed.positions);
        if (Array.isArray(parsed.history)) setHistory(parsed.history);
      }
    } catch (_) {}
  }, []);

  // Save paper trading to LocalStorage
  const savePaperState = (newBalance: number, newPositions: Position[], newHistory: TradeHistory[]) => {
    try {
      localStorage.setItem(PAPER_STORAGE_KEY, JSON.stringify({
        balance: newBalance,
        positions: newPositions,
        history: newHistory,
      }));
      window.dispatchEvent(new Event('openchart_paper_update'));
    } catch (_) {}
  };

  // Open Paper Trade
  const handleOpenTrade = () => {
    const qty = parseFloat(orderQty);
    if (isNaN(qty) || qty <= 0 || currentPrice <= 0) {
      setTradeMessage(t.common.error);
      return;
    }

    const orderCost = qty * currentPrice;
    const fee = orderCost * 0.0005; // 0.05% taker fee
    const totalCost = orderCost + fee;

    if (totalCost > balance) {
      setTradeMessage(t.common.error);
      return;
    }

    const nextBal = balance - fee;
    const newPos: Position = {
      id: `pos_${Date.now()}`,
      symbol: activeSymbol,
      side: orderSide,
      entryPrice: currentPrice,
      qty,
      timestamp: Date.now(),
    };

    const nextPositions = [newPos, ...positions];
    setBalance(nextBal);
    setPositions(nextPositions);
    setTradeMessage(`${activeSymbol} ${orderSide.toUpperCase()} ${qty} (${t.common.success})`);
    savePaperState(nextBal, nextPositions, history);
  };

  // Close Paper Trade
  const handleClosePosition = (id: string) => {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;

    const cur = pos.symbol === activeSymbol ? currentPrice : pos.entryPrice;
    const pnl = pos.side === 'long'
      ? (cur - pos.entryPrice) * pos.qty
      : (pos.entryPrice - cur) * pos.qty;

    const fee = (cur * pos.qty) * 0.0005;
    const netPnl = pnl - fee;
    const pnlPct = (pnl / (pos.entryPrice * pos.qty)) * 100;

    const nextBal = balance + netPnl;
    const nextPositions = positions.filter(p => p.id !== id);
    const newHistoryItem: TradeHistory = {
      id: `trade_${Date.now()}`,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice: cur,
      qty: pos.qty,
      pnl: netPnl,
      pnlPercent: pnlPct,
      timestamp: Date.now(),
    };

    const nextHistory = [newHistoryItem, ...history];

    setBalance(nextBal);
    setPositions(nextPositions);
    setHistory(nextHistory);
    savePaperState(nextBal, nextPositions, nextHistory);
  };

  // Reset Paper Trading Account
  const handleResetPaper = () => {
    if (window.confirm(`${t.bottomDock.resetAccount}?`)) {
      setBalance(100000);
      setPositions([]);
      setHistory([]);
      savePaperState(100000, [], []);
    }
  };

  // Total Equity calculation
  const totalUnrealizedPnl = positions.reduce((acc, pos) => {
    const p = pos.symbol === activeSymbol ? currentPrice : pos.entryPrice;
    const pnl = pos.side === 'long'
      ? (p - pos.entryPrice) * pos.qty
      : (pos.entryPrice - p) * pos.qty;
    return acc + pnl;
  }, 0);

  const equity = balance + totalUnrealizedPnl;

  // Filtered screener list
  const filteredScreener = watchlist.filter(item => {
    const matchesSearch = item.symbol.toLowerCase().includes(screenerSearch.toLowerCase()) || 
                          item.name.toLowerCase().includes(screenerSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (screenerFilter === 'gainers') return item.change24h > 1.5;
    if (screenerFilter === 'losers') return item.change24h < -1.0;
    if (screenerFilter === 'oversold') return item.change24h < -2.5;
    if (screenerFilter === 'overbought') return item.change24h > 4.0;
    return true;
  });

  // Python Script compilation & add to chart using full PythonEngine
  const handleApplyPythonToChart = async () => {
    try {
      const timeStr = new Date().toLocaleTimeString();
      let activeCandles = candles;
      if (!activeCandles || activeCandles.length === 0) {
        try {
          activeCandles = await marketDataService.fetchHistoricalCandles(activeSymbol || 'BTCUSDT', '15m', 1000);
        } catch (_) {}
      }

      if (!activeCandles || activeCandles.length === 0) {
        setPythonStatus('error');
        setPythonConsoleOutput(`[${timeStr}] Data Error: No candle data found for ${activeSymbol}.`);
        return;
      }

      const result = executePythonScript(pythonCode, activeCandles, pythonInputOverrides);

      if (!result.success) {
        setPythonStatus('error');
        setPythonConsoleOutput(`[${timeStr}] Python Compilation / Runtime Error:\n${result.error || 'Unknown error'}`);
        return;
      }

      const customIndicator: IndicatorConfig = {
        id: `py_custom_${Date.now()}`,
        type: 'CustomPython',
        name: result.title || 'Python Quant Strategy',
        pane: result.isOverlay ? 'overlay' : 'subpane',
        visible: true,
        params: { ...pythonInputOverrides },
        styles: {},
        pythonCode: pythonCode,
        customPlots: result.plots,
        customHlines: result.hlines,
      };

      if (onAddParsedIndicators) {
        onAddParsedIndicators([customIndicator]);
      } else if (onAddIndicator) {
        onAddIndicator('EMA');
      }

      soundService.playClickSound();
      setPythonStatus('success');

      const plotNames = result.plots.map(p => `"${p.title}" (${p.color})`).join(', ');
      setPythonConsoleOutput(
        `[${timeStr}] Python Build Success (${result.executionTimeMs} ms):\n` +
        `• ${activeCandles.length} bars vectorized.\n` +
        `• Target: ${result.isOverlay ? 'Overlay' : 'Subpane'}\n` +
        `• Plots (${result.plots.length}): ${plotNames || 'Close'}\n` +
        (result.hlines.length > 0 ? `• H-Lines (${result.hlines.length}): ${result.hlines.map(h => h.price).join(', ')}\n` : '') +
        (result.logs.length > 0 ? `• Logs:\n  ${result.logs.join('\n  ')}` : '')
      );

      try {
        localStorage.setItem('openchart_python_code', pythonCode);
      } catch (_) {}
    } catch (err: any) {
      const timeStr = new Date().toLocaleTimeString();
      setPythonStatus('error');
      setPythonConsoleOutput(`[${timeStr}] Runtime Error:\n${err?.message || 'Error'}`);
    }
  };

  const handleSavePythonCode = () => {
    try {
      localStorage.setItem('openchart_python_code', pythonCode);
      soundService.playClickSound();
      const timeStr = new Date().toLocaleTimeString();
      setPythonConsoleOutput(`[${timeStr}] Python script saved to storage.`);
    } catch (_) {}
  };

  // Transfer Python Strategy to Strategy Tester
  const handleTransferPythonToBacktest = () => {
    try {
      const timeStr = new Date().toLocaleTimeString();
      if (pythonCode.includes('rsi') || pythonCode.includes('RSI')) {
        setBtStrategy('RSI_REVERSAL');
      } else if (pythonCode.includes('supertrend') || pythonCode.includes('Supertrend')) {
        setBtStrategy('SUPERTREND_FOLLOW');
      } else if (pythonCode.includes('macd') || pythonCode.includes('MACD')) {
        setBtStrategy('MACD_CROSS');
      } else if (pythonCode.includes('bollinger') || pythonCode.includes('bb')) {
        setBtStrategy('BOLLINGER_REVERSAL');
      } else {
        setBtStrategy('EMA_CROSS');
      }

      onTabChange('strategyTester');
      setTimeout(() => {
        executeBacktest();
      }, 50);
      soundService.playClickSound();
      setPythonConsoleOutput(`[${timeStr}] Strategy transferred to Strategy Tester.`);
    } catch (err: any) {
      const timeStr = new Date().toLocaleTimeString();
      setPythonConsoleOutput(`[${timeStr}] Error: ${err?.message || 'Error'}`);
    }
  };

  if (!isOpen) return null;

  const currentHeightStyle = customDockHeight !== null && dockSize !== 'fullscreen'
    ? { height: `${customDockHeight}px` }
    : undefined;

  const dockHeightClass = dockSize === 'fullscreen' 
    ? 'h-[80vh]' 
    : customDockHeight !== null 
      ? '' 
      : dockSize === 'expanded' 
        ? 'h-[440px]' 
        : 'h-64';

  return (
    <div 
      style={currentHeightStyle}
      className={`relative ${dockHeightClass} bg-tv-surface border-t border-tv-border flex flex-col z-30 select-none animate-in slide-in-from-bottom-2 transition-all duration-200`}
    >
      {/* Top resize handle for dragging dock height with mouse */}
      <div 
        onMouseDown={handleStartResizeDock}
        onDoubleClick={() => {
          setCustomDockHeight(null);
          try { localStorage.removeItem('openchart_bottom_dock_height'); } catch (_) {}
        }}
        className="absolute -top-1 left-0 right-0 h-2.5 cursor-ns-resize z-40 group flex items-center justify-center hover:bg-tv-blue/60 active:bg-tv-blue transition-colors select-none"
        title={t.subPane.resizeTooltip}
      >
        <div className="w-12 h-0.5 bg-tv-border/80 group-hover:bg-tv-blue rounded-full transition-colors" />
      </div>

      {isResizingDock && (
        <div className="fixed inset-0 cursor-ns-resize z-50 select-none bg-transparent" />
      )}
      {/* Top Dock Bar (Tabs + Size toggle + Minimize button) */}
      <div className="h-9 border-b border-tv-border px-3 flex items-center justify-between bg-tv-bg text-xs">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onTabChange('screener')}
            className={`px-3 py-1.5 rounded flex items-center space-x-1.5 font-medium transition-colors ${
              activeTab === 'screener' ? 'bg-tv-surface text-tv-blue border border-tv-border font-bold' : 'text-tv-muted hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{t.bottomDock.screener}</span>
          </button>

          <button
            onClick={() => onTabChange('paperTrading')}
            className={`px-3 py-1.5 rounded flex items-center space-x-1.5 font-medium transition-colors ${
              activeTab === 'paperTrading' ? 'bg-tv-surface text-tv-blue border border-tv-border font-bold' : 'text-tv-muted hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>{t.bottomDock.paperTrading}</span>
          </button>

          <button
            onClick={() => onTabChange('pythonEditor')}
            className={`px-3 py-1.5 rounded flex items-center space-x-1.5 font-medium transition-colors ${
              activeTab === 'pythonEditor' ? 'bg-tv-surface text-tv-blue border border-tv-border font-bold' : 'text-tv-muted hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#3776ab]" />
            <span>{t.bottomDock.pythonEditor}</span>
          </button>

          <button
            onClick={() => onTabChange('strategyTester')}
            className={`px-3 py-1.5 rounded flex items-center space-x-1.5 font-medium transition-colors ${
              activeTab === 'strategyTester' ? 'bg-tv-surface text-tv-blue border border-tv-border font-bold' : 'text-tv-muted hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-tv-green" />
            <span>{t.bottomDock.strategyTester}</span>
          </button>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setDockSize(s => s === 'normal' ? 'expanded' : s === 'expanded' ? 'fullscreen' : 'normal')}
            className="p-1.5 rounded hover:bg-tv-hover text-tv-muted hover:text-white transition-colors"
            title={dockSize === 'fullscreen' ? t.subPane.resizeTooltip : t.header.fullscreen}
          >
            {dockSize === 'fullscreen' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded hover:bg-tv-hover text-tv-muted hover:text-white transition-colors"
            title="Paneli Kapat"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dock Content Body */}
      <div className="flex-1 overflow-hidden bg-tv-surface p-3">
        {/* ======================================================== */}
        {/* TAB 1: SCREENER (PİYASA TARAYICISI)                      */}
        {/* ======================================================== */}
        {activeTab === 'screener' && (
          <div className="h-full flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 text-tv-muted absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder={t.bottomDock.screenerSearchPlaceholder}
                    value={screenerSearch}
                    onChange={(e) => setScreenerSearch(e.target.value)}
                    className="w-full bg-tv-bg border border-tv-border rounded pl-8 pr-3 py-1 text-xs text-white placeholder-tv-muted focus:outline-none focus:border-tv-blue"
                  />
                </div>

                <div className="flex items-center space-x-1">
                  {([
                    { id: 'all', label: t.bottomDock.allFilter },
                    { id: 'gainers', label: t.bottomDock.gainersFilter },
                    { id: 'losers', label: t.bottomDock.losersFilter },
                    { id: 'oversold', label: t.bottomDock.oversoldFilter },
                    { id: 'overbought', label: t.bottomDock.overboughtFilter },
                  ] as const).map(f => (
                    <button
                      key={f.id}
                      onClick={() => setScreenerFilter(f.id)}
                      className={`px-2 py-1 rounded text-[11px] ${
                        screenerFilter === f.id ? 'bg-tv-blue text-white font-bold' : 'bg-tv-card text-tv-muted hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-tv-muted font-mono">
                {filteredScreener.length} {t.bottomDock.assetsListed}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-tv-border rounded">
              <table className="w-full text-left text-xs">
                <thead className="bg-tv-bg text-tv-muted sticky top-0 border-b border-tv-border text-[11px]">
                  <tr>
                    <th className="py-1.5 px-3">{t.bottomDock.symbol}</th>
                    <th className="py-1.5 px-3 text-right">{t.bottomDock.lastPriceCol}</th>
                    <th className="py-1.5 px-3 text-right">{t.bottomDock.change24hCol}</th>
                    <th className="py-1.5 px-3 text-right">{t.bottomDock.volume24hCol}</th>
                    <th className="py-1.5 px-3 text-right">{t.bottomDock.high24hCol}</th>
                    <th className="py-1.5 px-3 text-right">{t.bottomDock.low24hCol}</th>
                    <th className="py-1.5 px-3 text-center">{t.bottomDock.technicalSignalCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tv-border/40 font-mono text-[11px]">
                  {filteredScreener.map(item => {
                    const isGain = item.change24h >= 0;
                    const signal = item.change24h > 4 ? t.rightSidebar.strongBuy : item.change24h > 1 ? t.rightSidebar.buySignal : item.change24h < -3 ? t.rightSidebar.strongSell : t.rightSidebar.neutralSignal;
                    const sigColor = item.change24h > 1 ? 'text-tv-green bg-tv-green/10' : item.change24h < -1 ? 'text-tv-red bg-tv-red/10' : 'text-tv-muted bg-tv-card';

                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => onSelectSymbol(item.symbol)}
                        className={`hover:bg-tv-hover cursor-pointer transition-colors ${
                          item.symbol === activeSymbol ? 'bg-tv-blue/15 text-tv-blue font-bold' : ''
                        }`}
                      >
                        <td className="py-1.5 px-3 font-sans font-bold flex items-center space-x-1.5">
                          <span>{item.symbol}</span>
                          <span className="text-[10px] text-tv-muted font-normal font-mono">{item.name}</span>
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-white">
                          ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`py-1.5 px-3 text-right font-bold ${isGain ? 'text-tv-green' : 'text-tv-red'}`}>
                          {isGain ? '+' : ''}{item.change24h.toFixed(2)}%
                        </td>
                        <td className="py-1.5 px-3 text-right text-tv-muted">
                          {item.volume24h.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-3 text-right text-tv-muted">
                          ${item.high24h.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-3 text-right text-tv-muted">
                          ${item.low24h.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sigColor}`}>
                            {signal}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PAPER TRADING (SANAL PORTFÖY)                    */}
        {/* ======================================================== */}
        {activeTab === 'paperTrading' && (
          <div className="h-full flex space-x-4">
            {/* Account Summary & Order Entry Panel */}
            <div className="w-72 bg-tv-bg border border-tv-border rounded p-3 flex flex-col justify-between text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-tv-border pb-1.5">
                  <div className="flex items-center space-x-1 font-bold text-white">
                    <Wallet className="w-3.5 h-3.5 text-tv-blue" />
                    <span>{t.bottomDock.paperAccountTitle}</span>
                  </div>
                  <button
                    onClick={handleResetPaper}
                    className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white"
                    title={t.bottomDock.resetAccount}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-tv-muted">
                    <span>{t.bottomDock.cashBalance}:</span>
                    <strong className="text-white">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between text-tv-muted">
                    <span>{t.bottomDock.openPnl}:</span>
                    <strong className={totalUnrealizedPnl >= 0 ? 'text-tv-green' : 'text-tv-red'}>
                      {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-tv-muted border-t border-tv-border/50 pt-1">
                    <span>{t.bottomDock.totalEquity}:</span>
                    <strong className="text-tv-blue font-bold">${equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>

                <div className="border-t border-tv-border pt-2 space-y-2">
                  <div className="text-[11px] font-bold text-white">{t.bottomDock.orderEntry} ({activeSymbol})</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setOrderSide('long')}
                      className={`py-1.5 rounded font-bold text-xs transition-colors ${
                        orderSide === 'long' ? 'bg-tv-green text-white' : 'bg-tv-card text-tv-muted hover:text-white'
                      }`}
                    >
                      {t.bottomDock.buyLong}
                    </button>
                    <button
                      onClick={() => setOrderSide('short')}
                      className={`py-1.5 rounded font-bold text-xs transition-colors ${
                        orderSide === 'short' ? 'bg-tv-red text-white' : 'bg-tv-card text-tv-muted hover:text-white'
                      }`}
                    >
                      {t.bottomDock.sellShort}
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-tv-muted block mb-0.5">{t.bottomDock.qtyLabel}:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderQty}
                      onChange={(e) => setOrderQty(e.target.value)}
                      className="w-full bg-tv-surface border border-tv-border rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-tv-blue"
                    />
                  </div>

                  <button
                    onClick={handleOpenTrade}
                    className={`w-full py-1.5 rounded font-bold text-xs text-white transition-opacity ${
                      orderSide === 'long' ? 'bg-tv-green hover:opacity-90' : 'bg-tv-red hover:opacity-90'
                    }`}
                  >
                    {orderSide === 'long' ? t.bottomDock.sendMarketBuy : t.bottomDock.sendMarketSell}
                  </button>

                  {tradeMessage && (
                    <div className="text-[10px] text-tv-blue bg-tv-blue/10 p-1 rounded text-center">
                      {tradeMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Open Positions & Trade History Table */}
            <div className="flex-1 flex flex-col overflow-hidden border border-tv-border rounded bg-tv-bg">
              <div className="p-2 border-b border-tv-border font-bold text-xs text-white flex items-center justify-between">
                <span>{t.bottomDock.openPositions} ({positions.length})</span>
                <span className="text-[10px] text-tv-muted font-normal">{t.bottomDock.takerFeeNotice}</span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {positions.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-tv-muted text-xs">
                    {t.bottomDock.noOpenPositionsDesc}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-tv-surface text-tv-muted text-[10px] sticky top-0 border-b border-tv-border">
                      <tr>
                        <th className="py-1 px-3">{t.bottomDock.symbol}</th>
                        <th className="py-1 px-3">{t.bottomDock.side}</th>
                        <th className="py-1 px-3 text-right">{t.bottomDock.qty}</th>
                        <th className="py-1 px-3 text-right">{t.bottomDock.entryPrice}</th>
                        <th className="py-1 px-3 text-right">{t.bottomDock.currentPriceCol}</th>
                        <th className="py-1 px-3 text-right">{t.bottomDock.pnlCol}</th>
                        <th className="py-1 px-3 text-center">{t.bottomDock.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-tv-border/30 font-mono text-[11px]">
                      {positions.map(pos => {
                        const cur = pos.symbol === activeSymbol ? currentPrice : pos.entryPrice;
                        const pnl = pos.side === 'long'
                          ? (cur - pos.entryPrice) * pos.qty
                          : (pos.entryPrice - cur) * pos.qty;
                        const pnlPct = (pnl / (pos.entryPrice * pos.qty)) * 100;
                        const isProfit = pnl >= 0;

                        return (
                          <tr key={pos.id} className="hover:bg-tv-surface/60">
                            <td className="py-1.5 px-3 font-bold text-white">{pos.symbol}</td>
                            <td className="py-1.5 px-3">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                pos.side === 'long' ? 'text-tv-green bg-tv-green/10' : 'text-tv-red bg-tv-red/10'
                              }`}>
                                {pos.side}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-right text-white">{pos.qty}</td>
                            <td className="py-1.5 px-3 text-right text-tv-muted">${pos.entryPrice.toFixed(2)}</td>
                            <td className="py-1.5 px-3 text-right text-white">${cur.toFixed(2)}</td>
                            <td className={`py-1.5 px-3 text-right font-bold ${isProfit ? 'text-tv-green' : 'text-tv-red'}`}>
                              {isProfit ? '+' : ''}${pnl.toFixed(2)} ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <button
                                onClick={() => handleClosePosition(pos.id)}
                                className="px-2 py-0.5 rounded bg-tv-card hover:bg-tv-hover text-tv-red text-[10px] font-semibold"
                              >
                                {t.bottomDock.closeBtn}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PYTHON QUANT SCRIPT EDITOR                        */}
        {/* ======================================================== */}
        {activeTab === 'pythonEditor' && (() => {
          const linesList = pythonCode.split('\n');
          return (
            <div className="h-full flex flex-col space-y-2">
              {/* Python Editor Top Toolbar */}
              <div className="flex items-center justify-between text-xs bg-tv-bg p-1.5 rounded border border-tv-border">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1.5 font-bold text-white pr-2 border-r border-tv-border">
                    <FileCode className="w-3.5 h-3.5 text-[#3776ab]" />
                    <span className="text-white font-bold">{t.bottomDock.pythonEditor}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#3776ab]/20 text-[#3776ab] font-mono font-bold">v3.11</span>
                  </div>

                  {/* Mode switcher: Code Editor vs Inputs Panel */}
                  <div className="flex items-center space-x-1 bg-tv-surface p-0.5 rounded border border-tv-border select-none">
                    <button
                      onClick={() => setPythonViewMode('editor')}
                      className={`px-2.5 py-1 rounded flex items-center space-x-1 text-xs font-semibold transition-colors ${
                        pythonViewMode === 'editor' ? 'bg-tv-blue text-white shadow-sm' : 'text-tv-muted hover:text-white'
                      }`}
                      title="Python"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>{t.bottomDock.codeEditorBtn}</span>
                    </button>
                    <button
                      onClick={() => setPythonViewMode('inputs')}
                      className={`px-2.5 py-1 rounded flex items-center space-x-1 text-xs font-semibold transition-colors ${
                        pythonViewMode === 'inputs' ? 'bg-tv-blue text-white shadow-sm' : 'text-tv-muted hover:text-white'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{t.bottomDock.inputsBtn} ({liveInputs.length})</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-tv-muted font-bold pl-1 border-l border-tv-border">{t.bottomDock.templateLabel}</span>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value);
                      if (PYTHON_TEMPLATES[e.target.value]) {
                        setPythonCode(PYTHON_TEMPLATES[e.target.value]);
                        setPythonInputOverrides({});
                      }
                    }}
                    className="bg-tv-surface border border-tv-border rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-tv-blue font-medium max-w-[240px]"
                  >
                    <option value="custom">Quant Alpha (EMA 9/21 + RSI 14)</option>
                    <option value="emaCross">EMA Golden Cross (9 / 21)</option>
                    <option value="rsiPullback">RSI Momentum & Mean Reversion (14)</option>
                    <option value="macdMomentum">MACD Momentum Squeeze</option>
                    <option value="supertrend">Supertrend Trend Follower</option>
                    <option value="bollinger">Bollinger Bands Squeeze</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSavePythonCode}
                    className="px-2.5 py-1 rounded bg-tv-surface hover:bg-tv-hover border border-tv-border text-tv-text text-xs font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5 text-tv-blue" />
                    <span>{t.common.save}</span>
                  </button>

                  <button
                    onClick={handleTransferPythonToBacktest}
                    className="px-2.5 py-1 rounded bg-tv-surface hover:bg-tv-hover border border-tv-border text-tv-text text-xs font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-tv-green" />
                    <span>{t.bottomDock.testStrategyBtn}</span>
                  </button>

                  <button
                    onClick={handleApplyPythonToChart}
                    className="px-3.5 py-1 rounded bg-tv-blue text-white text-xs font-semibold hover:bg-blue-600 flex items-center space-x-1.5 shadow-sm transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t.bottomDock.addToChartBtn}</span>
                  </button>
                </div>
              </div>

              {/* Code Editor Body / Visual Inputs Panel + Compiler Console Split */}
              <div className="flex-1 flex space-x-3 overflow-hidden">
                {pythonViewMode === 'editor' ? (
                  /* Code Editor with Line Numbers */
                  <div className="flex-1 flex bg-tv-bg border border-tv-border rounded overflow-hidden focus-within:border-tv-blue">
                    {/* Line Numbers Column */}
                    <div className="w-9 bg-tv-surface/60 border-r border-tv-border/50 py-2 font-mono text-[11px] text-tv-muted/60 text-right select-none overflow-hidden pr-2 leading-[20px]">
                      {linesList.map((_, idx) => (
                        <div key={idx}>{idx + 1}</div>
                      ))}
                    </div>

                    {/* Code Textarea */}
                    <textarea
                      value={pythonCode}
                      onChange={(e) => setPythonCode(e.target.value)}
                      className="flex-1 bg-transparent p-2 font-mono text-xs text-white resize-none focus:outline-none leading-[20px] selection:bg-tv-blue selection:text-white overflow-auto whitespace-pre"
                      spellCheck={false}
                      placeholder="# Python Quant..."
                    />
                  </div>
                ) : (
                  /* Visual Inputs & Properties GUI Panel */
                  <div className="flex-1 bg-tv-bg border border-tv-border rounded p-3 overflow-y-auto space-y-3">
                    <div className="flex items-center justify-between border-b border-tv-border pb-2 text-xs">
                      <div>
                        <span className="font-bold text-white text-sm">{t.bottomDock.pythonEditor}</span>
                      </div>
                      <button
                        onClick={() => {
                          const defaults: Record<string, any> = {};
                          liveInputs.forEach(inp => defaults[inp.id] = inp.defval);
                          setPythonInputOverrides(defaults);
                        }}
                        className="px-2.5 py-1 rounded bg-tv-surface hover:bg-tv-hover border border-tv-border text-tv-muted hover:text-white text-xs flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{t.modals.resetToDefaults}</span>
                      </button>
                    </div>

                    {liveInputs.length === 0 ? (
                      <div className="p-6 text-center text-tv-muted text-xs">
                        {t.common.none} - param("length", 14)
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(groupedLiveInputs).map(([groupName, inps]) => (
                          <div key={groupName} className="bg-tv-surface/60 p-3 rounded border border-tv-border/80 space-y-2.5">
                            <div className="font-bold text-white text-xs uppercase tracking-wider border-b border-tv-border/60 pb-1.5 flex items-center justify-between">
                              <span className="text-tv-blue font-semibold">{groupName}</span>
                              <span className="text-[10px] text-tv-muted font-mono">{inps.length}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                              {inps.map(inp => {
                                const curVal = pythonInputOverrides[inp.id] !== undefined
                                  ? pythonInputOverrides[inp.id]
                                  : inp.defval;

                                return (
                                  <div key={inp.id} className="flex items-center justify-between p-2 rounded bg-tv-bg border border-tv-border/50 text-xs">
                                    <div className="flex items-center space-x-1.5 flex-1 min-w-0 pr-2">
                                      <label className="text-tv-text font-medium truncate" title={inp.title}>
                                        {inp.title}
                                      </label>
                                      {inp.tooltip && (
                                        <span className="text-tv-muted hover:text-tv-blue cursor-help flex-shrink-0" title={inp.tooltip}>
                                          <HelpCircle className="w-3.5 h-3.5" />
                                        </span>
                                      )}
                                    </div>

                                    {/* Boolean toggle */}
                                    {inp.type === 'bool' && (
                                      <input
                                        type="checkbox"
                                        checked={Boolean(curVal)}
                                        onChange={(e) => setPythonInputOverrides(prev => ({ ...prev, [inp.id]: e.target.checked }))}
                                        className="w-4 h-4 rounded border-tv-border text-tv-blue accent-tv-blue cursor-pointer"
                                      />
                                    )}

                                    {/* Dropdown options */}
                                    {inp.type === 'string' && inp.options && (
                                      <select
                                        value={String(curVal)}
                                        onChange={(e) => setPythonInputOverrides(prev => ({ ...prev, [inp.id]: e.target.value }))}
                                        className="bg-tv-surface border border-tv-border rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-tv-blue font-medium max-w-[150px]"
                                      >
                                        {inp.options.map(opt => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    )}

                                    {/* Numbers */}
                                    {(inp.type === 'int' || inp.type === 'float') && (
                                      <input
                                        type="number"
                                        value={curVal ?? ''}
                                        min={inp.min}
                                        max={inp.max}
                                        step={inp.step || (inp.type === 'float' ? 0.1 : 1)}
                                        onChange={(e) => setPythonInputOverrides(prev => ({ ...prev, [inp.id]: parseFloat(e.target.value) || 0 }))}
                                        className="w-20 bg-tv-surface border border-tv-border rounded px-2 py-0.5 text-white font-mono text-right focus:outline-none focus:border-tv-blue"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Compiler Output & Status Console */}
                <div className="w-80 bg-tv-bg border border-tv-border rounded p-3 font-mono text-[11px] flex flex-col justify-between overflow-hidden">
                  <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between border-b border-tv-border pb-1.5">
                      <div className="flex items-center space-x-1.5 text-tv-muted font-bold text-xs">
                        <Terminal className="w-3.5 h-3.5 text-tv-blue" />
                        <span>{t.bottomDock.pythonConsoleTitle}</span>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        pythonStatus === 'success' ? 'bg-tv-green/15 text-tv-green border border-tv-green/30' :
                        pythonStatus === 'error' ? 'bg-tv-red/15 text-tv-red border border-tv-red/30' :
                        'bg-tv-card text-tv-muted'
                      }`}>
                        {pythonStatus === 'success' ? t.bottomDock.successStatus : pythonStatus === 'error' ? t.bottomDock.errorStatus : t.bottomDock.readyStatus}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1">
                      <div className={`flex items-start space-x-1.5 text-[11px] ${
                        pythonStatus === 'error' ? 'text-tv-red' : 'text-tv-green'
                      }`}>
                        {pythonStatus === 'error' ? (
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-tv-red" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-tv-green" />
                        )}
                        <span className="whitespace-pre-line leading-relaxed text-tv-text flex-1">
                          {pythonConsoleOutput}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-tv-muted pt-2 border-t border-tv-border space-y-0.5">
                    <div>✓ df['close'], df['open'], df['high'], df['low'], df['volume']</div>
                    <div>✓ ta.sma, ta.ema, ta.wma, ta.rsi, ta.macd, ta.bollinger, ta.supertrend</div>
                    <div>✓ plot(), hline(), plot_shape(), crossover(), crossunder(), param()</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ======================================================== */}
        {/* TAB 4: STRATEGY TESTER (QUANT BACKTEST CİHAZI)           */}
        {/* ======================================================== */}
        {activeTab === 'strategyTester' && (
          <div className="h-full flex flex-col space-y-2 text-xs">
            {/* Top Toolbar Controls */}
            <div className="flex items-center justify-between bg-tv-bg p-2 rounded border border-tv-border">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5">
                  <label className="text-[10px] text-tv-muted font-bold">{t.bottomDock.strategyLabel}</label>
                  <select
                    value={btStrategy}
                    onChange={(e) => setBtStrategy(e.target.value as any)}
                    className="bg-tv-surface border border-tv-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-tv-blue"
                  >
                    <option value="EMA_CROSS">EMA Golden/Death Cross (9/21)</option>
                    <option value="RSI_REVERSAL">RSI Mean Reversion (14)</option>
                    <option value="SUPERTREND_FOLLOW">Supertrend Trend Follow</option>
                    <option value="MACD_CROSS">MACD Signal Cross (12/26/9)</option>
                    <option value="BOLLINGER_REVERSAL">Bollinger Bands Mean Reversion</option>
                  </select>
                </div>

                <label className="flex items-center space-x-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={btAllowShort}
                    onChange={(e) => setBtAllowShort(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-tv-border text-tv-blue accent-tv-blue cursor-pointer"
                  />
                  <span className="text-[10px] text-tv-muted font-medium">{t.bottomDock.allowShortLabel}</span>
                </label>

                {btStrategy === 'EMA_CROSS' && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-tv-muted">EMA 1:</span>
                      <input
                        type="number"
                        value={btFastEma}
                        onChange={(e) => setBtFastEma(Number(e.target.value))}
                        className="w-12 bg-tv-surface border border-tv-border rounded px-1.5 py-0.5 text-xs text-center font-mono text-white"
                      />
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-tv-muted">EMA 2:</span>
                      <input
                        type="number"
                        value={btSlowEma}
                        onChange={(e) => setBtSlowEma(Number(e.target.value))}
                        className="w-12 bg-tv-surface border border-tv-border rounded px-1.5 py-0.5 text-xs text-center font-mono text-white"
                      />
                    </div>
                  </div>
                )}

                {btStrategy === 'RSI_REVERSAL' && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-tv-muted">Len:</span>
                      <input
                        type="number"
                        value={btRsiPeriod}
                        onChange={(e) => setBtRsiPeriod(Number(e.target.value))}
                        className="w-12 bg-tv-surface border border-tv-border rounded px-1.5 py-0.5 text-xs text-center font-mono text-white"
                      />
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-tv-muted">&lt;:</span>
                      <input
                        type="number"
                        value={btRsiOversold}
                        onChange={(e) => setBtRsiOversold(Number(e.target.value))}
                        className="w-12 bg-tv-surface border border-tv-border rounded px-1.5 py-0.5 text-xs text-center font-mono text-white"
                      />
                    </div>
                  </div>
                )}

                {btStrategy === 'SUPERTREND_FOLLOW' && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-tv-muted">ATR:</span>
                      <input
                        type="number"
                        value={btStPeriod}
                        onChange={(e) => setBtStPeriod(Number(e.target.value))}
                        className="w-12 bg-tv-surface border border-tv-border rounded px-1.5 py-0.5 text-xs text-center font-mono text-white"
                      />
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-tv-muted">Mult:</span>
                      <input
                        type="number"
                        value={btStMult}
                        onChange={(e) => setBtStMult(Number(e.target.value))}
                        className="w-12 bg-tv-surface border border-tv-border rounded px-1.5 py-0.5 text-xs text-center font-mono text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-tv-muted">{t.bottomDock.capitalLabel}</span>
                  <input
                    type="number"
                    value={btCapital}
                    onChange={(e) => setBtCapital(Number(e.target.value))}
                    className="w-20 bg-tv-surface border border-tv-border rounded px-1.5 py-0.5 text-xs text-center font-mono text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={executeBacktest}
                  className="px-3 py-1 rounded bg-tv-green text-white font-bold text-xs hover:bg-emerald-600 flex items-center space-x-1"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t.bottomDock.startBacktest}</span>
                </button>
              </div>
            </div>

            {/* Metrics Overview Cards */}
            {btReport && (
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                <div className="bg-tv-bg border border-tv-border rounded p-1.5 text-center">
                  <div className="text-[9px] text-tv-muted uppercase font-semibold">{t.bottomDock.netProfit}</div>
                  <div className={`text-xs font-bold font-mono ${btReport.netProfitPercent >= 0 ? 'text-tv-green' : 'text-tv-red'}`}>
                    {btReport.netProfitPercent >= 0 ? '+' : ''}%{btReport.netProfitPercent} (${btReport.netProfitCash >= 0 ? '+' : ''}{btReport.netProfitCash})
                  </div>
                </div>

                <div className="bg-tv-bg border border-tv-border rounded p-1.5 text-center">
                  <div className="text-[9px] text-tv-muted uppercase font-semibold">{t.bottomDock.winRate}</div>
                  <div className="text-xs font-bold font-mono text-white">
                    %{btReport.winRate}
                  </div>
                </div>

                <div className="bg-tv-bg border border-tv-border rounded p-1.5 text-center">
                  <div className="text-[9px] text-tv-muted uppercase font-semibold">{t.bottomDock.totalTrades}</div>
                  <div className="text-xs font-bold font-mono text-white">
                    {btReport.totalTrades}
                  </div>
                </div>

                <div className="bg-tv-bg border border-tv-border rounded p-1.5 text-center">
                  <div className="text-[9px] text-tv-muted uppercase font-semibold">{t.bottomDock.profitFactor}</div>
                  <div className="text-xs font-bold font-mono text-tv-blue">
                    {btReport.profitFactor}
                  </div>
                </div>

                <div className="bg-tv-bg border border-tv-border rounded p-1.5 text-center">
                  <div className="text-[9px] text-tv-muted uppercase font-semibold">{t.bottomDock.maxDrawdown}</div>
                  <div className="text-xs font-bold font-mono text-tv-red">
                    %{btReport.maxDrawdown}
                  </div>
                </div>

                <div className="bg-tv-bg border border-tv-border rounded p-1.5 text-center">
                  <div className="text-[9px] text-tv-muted uppercase font-semibold">{t.bottomDock.sharpeRatio}</div>
                  <div className="text-xs font-bold font-mono text-tv-yellow">
                    {btReport.sharpeRatio}
                  </div>
                </div>

                <div className="bg-tv-bg border border-tv-border rounded p-1.5 text-center">
                  <div className="text-[9px] text-tv-muted uppercase font-semibold">{t.bottomDock.sortinoRatio}</div>
                  <div className="text-xs font-bold font-mono text-tv-blue">
                    {btReport.sortinoRatio}
                  </div>
                </div>

                <div className="bg-tv-bg border border-tv-border rounded p-1.5 text-center">
                  <div className="text-[9px] text-tv-muted uppercase font-semibold">{t.bottomDock.buyAndHold}</div>
                  <div className={`text-xs font-bold font-mono ${btReport.buyAndHoldPercent >= 0 ? 'text-tv-green' : 'text-tv-red'}`}>
                    {btReport.buyAndHoldPercent >= 0 ? '+' : ''}%{btReport.buyAndHoldPercent}
                  </div>
                </div>
              </div>
            )}

            {/* Interactive SVG Equity Curve Chart */}
            {btReport && btReport.equityCurve && btReport.equityCurve.length > 1 && (
              <div className="bg-tv-bg border border-tv-border rounded p-2 flex flex-col space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-tv-muted uppercase tracking-wider flex items-center space-x-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-tv-blue" />
                    <span>{t.bottomDock.equityCurve}</span>
                  </span>
                  <div className="flex items-center space-x-3 font-mono text-[11px]">
                    <span className="text-tv-muted">{t.bottomDock.startLabel} <span className="text-white">${btCapital.toLocaleString()}</span></span>
                    <span className="text-tv-muted">{t.bottomDock.endLabel} <span className={btReport.netProfitCash >= 0 ? 'text-tv-green font-bold' : 'text-tv-red font-bold'}>${(btCapital + btReport.netProfitCash).toLocaleString()}</span></span>
                  </div>
                </div>
                {(() => {
                  const curve = btReport.equityCurve;
                  let minEq = Infinity;
                  let maxEq = -Infinity;
                  for (const p of curve) {
                    if (p.equity < minEq) minEq = p.equity;
                    if (p.equity > maxEq) maxEq = p.equity;
                  }
                  const range = maxEq - minEq || 1;
                  const h = 50;
                  const w = 800;

                  const points = curve.map((p, idx) => {
                    const x = (idx / (curve.length - 1)) * w;
                    const y = h - ((p.equity - minEq) / range) * (h - 8) - 4;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  }).join(' ');

                  const isNetProfit = btReport.netProfitCash >= 0;
                  const strokeColor = isNetProfit ? '#089981' : '#f23645';
                  const areaPoints = `0,${h} ${points} ${w},${h}`;
                  const baselineY = h - ((btCapital - minEq) / range) * (h - 8) - 4;

                  return (
                    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12 overflow-visible">
                      <defs>
                        <linearGradient id="dockEqGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {baselineY >= 0 && baselineY <= h && (
                        <line x1="0" y1={baselineY} x2={w} y2={baselineY} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                      )}
                      <polygon points={areaPoints} fill="url(#dockEqGrad)" />
                      <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  );
                })()}
              </div>
            )}

            {/* Trade List Table */}
            <div className="flex-1 overflow-y-auto border border-tv-border rounded bg-tv-bg">
              {btReport && btReport.trades.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-tv-surface text-tv-muted text-[10px] sticky top-0 border-b border-tv-border">
                    <tr>
                      <th className="py-1 px-3">{t.bottomDock.entryTimeCol}</th>
                      <th className="py-1 px-3 text-right">{t.bottomDock.entryPrice} ($)</th>
                      <th className="py-1 px-3">{t.bottomDock.exitTimeCol}</th>
                      <th className="py-1 px-3 text-right">{t.bottomDock.markPrice} ($)</th>
                      <th className="py-1 px-3 text-center">{t.bottomDock.side}</th>
                      <th className="py-1 px-3 text-right">{t.bottomDock.netPnlCol}</th>
                      <th className="py-1 px-3">{t.bottomDock.reasonCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tv-border/30 font-mono text-[11px]">
                    {btReport.trades.map((trItem, idx) => {
                      const isProfit = trItem.pnlPercent >= 0;
                      return (
                        <tr key={idx} className="hover:bg-tv-surface/60">
                          <td className="py-1 px-3 text-tv-muted">
                            {new Date(trItem.entryTime * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-1 px-3 text-right text-white">${trItem.entryPrice}</td>
                          <td className="py-1 px-3 text-tv-muted">
                            {new Date(trItem.exitTime * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-1 px-3 text-right text-white">${trItem.exitPrice}</td>
                          <td className="py-1 px-3 text-center">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-tv-green/10 text-tv-green">
                              {trItem.type}
                            </span>
                          </td>
                          <td className={`py-1 px-3 text-right font-bold ${isProfit ? 'text-tv-green' : 'text-tv-red'}`}>
                            {isProfit ? '+' : ''}${trItem.pnlNet} ({isProfit ? '+' : ''}%{trItem.pnlPercent})
                          </td>
                          <td className="py-1 px-3 text-tv-muted text-[10px]">{trItem.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex items-center justify-center text-tv-muted text-xs">
                  {t.bottomDock.runTestPrompt}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
