import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  TrendingUp, 
  Clock, 
  Sliders, 
  LayoutGrid, 
  PenTool, 
  Bell, 
  Camera, 
  Play, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Maximize, 
  Keyboard, 
  Download, 
  Check,
  Compass,
  FileCode,
  Layers
} from 'lucide-react';
import { ChartType, DrawingToolType, LayoutType, Timeframe } from '../../types';
import { useTranslation } from '../../i18n';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
  onSelectTimeframe: (tf: Timeframe) => void;
  onSelectChartType: (ct: ChartType) => void;
  onSelectLayout: (l: LayoutType) => void;
  onSelectDrawingTool: (tool: DrawingToolType) => void;
  onOpenIndicators: () => void;
  onOpenAlerts: () => void;
  onOpenChartSettings: () => void;
  onOpenBacktest: () => void;
  onOpenHotkeys: () => void;
  onToggleReplay: () => void;
  onClearDrawings: () => void;
  onTakeScreenshot: () => void;
  onExportData: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  onSelectTimeframe,
  onSelectChartType,
  onSelectLayout,
  onSelectDrawingTool,
  onOpenIndicators,
  onOpenAlerts,
  onOpenChartSettings,
  onOpenBacktest,
  onOpenHotkeys,
  onToggleReplay,
  onClearDrawings,
  onTakeScreenshot,
  onExportData,
  onUndo,
  onRedo,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands: CommandItem[] = [
    // --- Actions ---
    {
      id: 'act_alert',
      title: t.chart.addAlertAtPrice,
      subtitle: t.modals.alertTitle,
      category: t.common.action,
      icon: <Bell className="w-4 h-4 text-tv-yellow" />,
      shortcut: 'Alt + A',
      action: () => { onOpenAlerts(); onClose(); },
    },
    {
      id: 'act_indicators',
      title: t.header.indicators,
      subtitle: t.modals.indicatorsTitle,
      category: t.common.action,
      icon: <Sliders className="w-4 h-4 text-tv-blue" />,
      shortcut: '/',
      action: () => { onOpenIndicators(); onClose(); },
    },
    {
      id: 'act_chart_settings',
      title: t.header.chartSettings,
      subtitle: t.modals.chartSettingsTitle,
      category: t.common.action,
      icon: <Sliders className="w-4 h-4 text-[#787b86]" />,
      action: () => { onOpenChartSettings(); onClose(); },
    },
    {
      id: 'act_replay',
      title: t.header.barReplay,
      subtitle: t.replay.title,
      category: t.common.action,
      icon: <Play className="w-4 h-4 text-tv-green" />,
      shortcut: 'Alt + G',
      action: () => { onToggleReplay(); onClose(); },
    },
    {
      id: 'act_undo',
      title: 'Undo',
      subtitle: 'Ctrl + Z',
      category: t.common.action,
      icon: <RotateCcw className="w-4 h-4 text-tv-muted" />,
      shortcut: 'Ctrl + Z',
      action: () => { onUndo?.(); onClose(); },
    },
    {
      id: 'act_redo',
      title: 'Redo',
      subtitle: 'Ctrl + Y',
      category: t.common.action,
      icon: <RotateCw className="w-4 h-4 text-tv-muted" />,
      shortcut: 'Ctrl + Y',
      action: () => { onRedo?.(); onClose(); },
    },
    {
      id: 'act_screenshot',
      title: t.header.screenshot,
      subtitle: 'PNG',
      category: t.common.action,
      icon: <Camera className="w-4 h-4 text-tv-blue" />,
      shortcut: 'Alt + S',
      action: () => { onTakeScreenshot(); onClose(); },
    },
    {
      id: 'act_export',
      title: t.header.exportCsv,
      subtitle: 'CSV / Excel',
      category: t.common.action,
      icon: <Download className="w-4 h-4 text-tv-green" />,
      action: () => { onExportData(); onClose(); },
    },
    {
      id: 'act_clear_drawings',
      title: t.chart.removeAllDrawings,
      subtitle: t.chart.removeAllDrawings,
      category: t.common.action,
      icon: <Trash2 className="w-4 h-4 text-tv-red" />,
      shortcut: 'Alt + C',
      action: () => { onClearDrawings(); onClose(); },
    },
    {
      id: 'act_hotkeys',
      title: t.header.hotkeys,
      subtitle: t.modals.hotkeysTitle,
      category: t.common.action,
      icon: <Keyboard className="w-4 h-4 text-[#ffd600]" />,
      shortcut: '?',
      action: () => { onOpenHotkeys(); onClose(); },
    },
    {
      id: 'act_backtest',
      title: t.header.strategyBacktest,
      subtitle: t.modals.backtestSimulatorTitle,
      category: t.common.action,
      icon: <FileCode className="w-4 h-4 text-tv-blue" />,
      action: () => { onOpenBacktest(); onClose(); },
    },

    // --- Symbols ---
    {
      id: 'sym_btc',
      title: 'BTCUSDT',
      subtitle: 'Bitcoin / TetherUS',
      category: t.modals.symbolSearchTitle,
      icon: <TrendingUp className="w-4 h-4 text-[#f7931a]" />,
      action: () => { onSelectSymbol('BTCUSDT'); onClose(); },
    },
    {
      id: 'sym_eth',
      title: 'ETHUSDT',
      subtitle: 'Ethereum / TetherUS',
      category: t.modals.symbolSearchTitle,
      icon: <TrendingUp className="w-4 h-4 text-[#627eea]" />,
      action: () => { onSelectSymbol('ETHUSDT'); onClose(); },
    },
    {
      id: 'sym_sol',
      title: 'SOLUSDT',
      subtitle: 'Solana / TetherUS',
      category: t.modals.symbolSearchTitle,
      icon: <TrendingUp className="w-4 h-4 text-[#14f195]" />,
      action: () => { onSelectSymbol('SOLUSDT'); onClose(); },
    },
    {
      id: 'sym_bnb',
      title: 'BNBUSDT',
      subtitle: 'BNB / TetherUS',
      category: t.modals.symbolSearchTitle,
      icon: <TrendingUp className="w-4 h-4 text-[#f3ba2f]" />,
      action: () => { onSelectSymbol('BNBUSDT'); onClose(); },
    },
    {
      id: 'sym_gold',
      title: 'XAUUSD',
      subtitle: 'Gold / US Dollar',
      category: t.modals.symbolSearchTitle,
      icon: <TrendingUp className="w-4 h-4 text-[#ffd700]" />,
      action: () => { onSelectSymbol('XAUUSD'); onClose(); },
    },
    {
      id: 'sym_eur',
      title: 'EURUSD',
      subtitle: 'Euro / US Dollar',
      category: t.modals.symbolSearchTitle,
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectSymbol('EURUSD'); onClose(); },
    },

    // --- Timeframes ---
    {
      id: 'tf_1m',
      title: `1m (${t.header.timeframe1m})`,
      category: t.header.timeframes,
      icon: <Clock className="w-4 h-4 text-tv-muted" />,
      action: () => { onSelectTimeframe('1m'); onClose(); },
    },
    {
      id: 'tf_5m',
      title: `5m (${t.header.timeframe5m})`,
      category: t.header.timeframes,
      icon: <Clock className="w-4 h-4 text-tv-muted" />,
      action: () => { onSelectTimeframe('5m'); onClose(); },
    },
    {
      id: 'tf_15m',
      title: `15m (${t.header.timeframe15m})`,
      category: t.header.timeframes,
      icon: <Clock className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectTimeframe('15m'); onClose(); },
    },
    {
      id: 'tf_1h',
      title: `1h (${t.header.timeframe1h})`,
      category: t.header.timeframes,
      icon: <Clock className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectTimeframe('1h'); onClose(); },
    },
    {
      id: 'tf_4h',
      title: `4h (${t.header.timeframe4h})`,
      category: t.header.timeframes,
      icon: <Clock className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectTimeframe('4h'); onClose(); },
    },
    {
      id: 'tf_1d',
      title: `1D (${t.header.timeframe1d})`,
      category: t.header.timeframes,
      icon: <Clock className="w-4 h-4 text-tv-yellow" />,
      action: () => { onSelectTimeframe('1d'); onClose(); },
    },

    // --- Chart Types ---
    {
      id: 'ct_volume_footprint',
      title: t.header.volumeFootprint,
      category: t.header.chartTypes,
      icon: <Layers className="w-4 h-4 text-[#ff9800]" />,
      action: () => { onSelectChartType('volume-footprint'); onClose(); },
    },
    {
      id: 'ct_volume_candle',
      title: t.header.volumeCandles,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-green" />,
      action: () => { onSelectChartType('volume-candle'); onClose(); },
    },
    {
      id: 'ct_candlestick',
      title: t.header.candlestick,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-green" />,
      action: () => { onSelectChartType('candlestick'); onClose(); },
    },
    {
      id: 'ct_hollow',
      title: t.header.hollowCandles,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('hollow-candlestick'); onClose(); },
    },
    {
      id: 'ct_bar',
      title: t.header.bars,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('bar'); onClose(); },
    },
    {
      id: 'ct_baseline',
      title: t.header.baseline,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-yellow" />,
      action: () => { onSelectChartType('baseline'); onClose(); },
    },
    {
      id: 'ct_heikin',
      title: t.header.heikinAshi,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-purple" />,
      action: () => { onSelectChartType('heikin-ashi'); onClose(); },
    },
    {
      id: 'ct_renko',
      title: t.header.renko,
      category: t.header.chartTypes,
      icon: <LayoutGrid className="w-4 h-4 text-tv-purple" />,
      action: () => { onSelectChartType('renko'); onClose(); },
    },
    {
      id: 'ct_line_break',
      title: t.header.threeLineBreak,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-yellow" />,
      action: () => { onSelectChartType('line-break'); onClose(); },
    },
    {
      id: 'ct_line',
      title: t.header.line,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('line'); onClose(); },
    },
    {
      id: 'ct_area',
      title: t.header.area,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('area'); onClose(); },
    },
    {
      id: 'ct_step_line',
      title: t.header.stepLine,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('step-line'); onClose(); },
    },
    {
      id: 'ct_line_markers',
      title: t.header.lineWithMarkers,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-green" />,
      action: () => { onSelectChartType('line-with-markers'); onClose(); },
    },
    {
      id: 'ct_columns',
      title: t.header.columns,
      category: t.header.chartTypes,
      icon: <LayoutGrid className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('columns'); onClose(); },
    },
    {
      id: 'ct_high_low',
      title: t.header.highLow,
      category: t.header.chartTypes,
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('high-low'); onClose(); },
    },

    // --- Drawing Tools ---
    {
      id: 'dt_trendline',
      title: t.leftToolbar.trendLine,
      category: t.modals.drawingToolsCat,
      icon: <PenTool className="w-4 h-4 text-tv-green" />,
      shortcut: 'Alt + T',
      action: () => { onSelectDrawingTool('trendLine'); onClose(); },
    },
    {
      id: 'dt_horz',
      title: t.leftToolbar.horizontalLine,
      category: t.modals.drawingToolsCat,
      icon: <PenTool className="w-4 h-4 text-tv-blue" />,
      shortcut: 'Alt + H',
      action: () => { onSelectDrawingTool('horizontalLine'); onClose(); },
    },
    {
      id: 'dt_vert',
      title: t.leftToolbar.verticalLine,
      category: t.modals.drawingToolsCat,
      icon: <PenTool className="w-4 h-4 text-tv-blue" />,
      shortcut: 'Alt + V',
      action: () => { onSelectDrawingTool('verticalLine'); onClose(); },
    },
    {
      id: 'dt_fib',
      title: t.leftToolbar.fibRetracement,
      category: t.modals.drawingToolsCat,
      icon: <PenTool className="w-4 h-4 text-[#ffd600]" />,
      shortcut: 'Alt + F',
      action: () => { onSelectDrawingTool('fibonacci'); onClose(); },
    },
    {
      id: 'dt_measure',
      title: t.leftToolbar.measureTool,
      category: t.modals.drawingToolsCat,
      icon: <Compass className="w-4 h-4 text-tv-blue" />,
      shortcut: 'Alt + R',
      action: () => { onSelectDrawingTool('measure'); onClose(); },
    },
    {
      id: 'dt_long',
      title: t.leftToolbar.longPosition,
      category: t.modals.drawingToolsCat,
      icon: <PenTool className="w-4 h-4 text-tv-green" />,
      action: () => { onSelectDrawingTool('longPosition'); onClose(); },
    },
    {
      id: 'dt_short',
      title: t.leftToolbar.shortPosition,
      category: t.modals.drawingToolsCat,
      icon: <PenTool className="w-4 h-4 text-tv-red" />,
      action: () => { onSelectDrawingTool('shortPosition'); onClose(); },
    },

    // --- Layouts ---
    {
      id: 'lay_1',
      title: t.header.layout1x1,
      category: t.header.layouts,
      icon: <LayoutGrid className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectLayout('1x1'); onClose(); },
    },
    {
      id: 'lay_2v',
      title: t.header.layout1x2,
      category: t.header.layouts,
      icon: <LayoutGrid className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectLayout('1x2'); onClose(); },
    },
    {
      id: 'lay_2h',
      title: t.header.layout2x1,
      category: t.header.layouts,
      icon: <LayoutGrid className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectLayout('2x1'); onClose(); },
    },
    {
      id: 'lay_4',
      title: t.header.layout2x2,
      category: t.header.layouts,
      icon: <LayoutGrid className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectLayout('2x2'); onClose(); },
    },
  ];

  const filtered = commands.filter(c => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
      c.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-tv-surface border border-tv-border rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden text-tv-text text-xs"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-3.5 border-b border-tv-border flex items-center space-x-2.5 bg-tv-bg">
          <Search className="w-4 h-4 text-tv-blue" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t.modals.commandPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-tv-muted"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-tv-surface border border-tv-border/80 text-[10px] text-tv-muted font-mono font-medium">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="max-h-[420px] overflow-y-auto divide-y divide-tv-border/20 p-1.5"
        >
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-tv-muted">
              {t.common.none}
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-tv-blue text-white shadow-md' 
                      : 'hover:bg-tv-hover text-tv-text'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-tv-card text-tv-text'}`}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-sm flex items-center space-x-2">
                        <span>{item.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-tv-border/40 text-tv-muted'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <div className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-tv-muted'}`}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.shortcut && (
                    <kbd className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      isSelected 
                        ? 'bg-white/20 text-white border border-white/30' 
                        : 'bg-tv-card border border-tv-border text-tv-blue'
                    }`}>
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Tips */}
        <div className="h-9 border-t border-tv-border px-4 bg-tv-bg flex items-center justify-between text-[11px] text-tv-muted">
          <div className="flex items-center space-x-3">
            <span><strong className="text-white">↑↓</strong> Navigate</span>
            <span><strong className="text-white">Enter</strong> Select</span>
            <span><strong className="text-white">Esc</strong> {t.common.close}</span>
          </div>
          <span>OpenChart Spotlight</span>
        </div>
      </div>
    </div>
  );
};
