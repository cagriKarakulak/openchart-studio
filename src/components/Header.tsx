import React, { useState, useMemo } from 'react';
import { 
  Search, 
  CandlestickChart, 
  BarChart2, 
  TrendingUp, 
  Activity, 
  Grid, 
  Save, 
  Camera, 
  Bell, 
  SlidersHorizontal,
  ChevronDown,
  Maximize2,
  FolderOpen,
  Check,
  Zap,
  RotateCcw,
  Keyboard,
  Download,
  Settings,
  LayoutTemplate,
  Sparkles,
  Star,
  Plus,
  Globe
} from 'lucide-react';
import { Timeframe, ChartType, LayoutType, IndicatorTemplate } from '../types';
import { useTranslation } from '../i18n';

interface TimeframeOption {
  label: string;
  value: Timeframe;
  shortLabel: string;
}

interface TimeframeCategory {
  categoryKey: 'timeframeSeconds' | 'timeframeMinutes' | 'timeframeHours' | 'timeframeDays' | 'timeframeWeeksMonths';
  items: { value: Timeframe; number: number; unit: string }[];
}

const BASE_CATEGORIES: TimeframeCategory[] = [
  {
    categoryKey: 'timeframeSeconds',
    items: [
      { value: '1s', number: 1, unit: 's' },
      { value: '5s', number: 5, unit: 's' },
      { value: '10s', number: 10, unit: 's' },
      { value: '15s', number: 15, unit: 's' },
      { value: '30s', number: 30, unit: 's' },
      { value: '45s', number: 45, unit: 's' },
    ],
  },
  {
    categoryKey: 'timeframeMinutes',
    items: [
      { value: '1m', number: 1, unit: 'm' },
      { value: '2m', number: 2, unit: 'm' },
      { value: '3m', number: 3, unit: 'm' },
      { value: '5m', number: 5, unit: 'm' },
      { value: '10m', number: 10, unit: 'm' },
      { value: '15m', number: 15, unit: 'm' },
      { value: '30m', number: 30, unit: 'm' },
      { value: '45m', number: 45, unit: 'm' },
    ],
  },
  {
    categoryKey: 'timeframeHours',
    items: [
      { value: '1h', number: 1, unit: 'h' },
      { value: '2h', number: 2, unit: 'h' },
      { value: '3h', number: 3, unit: 'h' },
      { value: '4h', number: 4, unit: 'h' },
      { value: '6h', number: 6, unit: 'h' },
      { value: '8h', number: 8, unit: 'h' },
      { value: '12h', number: 12, unit: 'h' },
    ],
  },
  {
    categoryKey: 'timeframeDays',
    items: [
      { value: '1d', number: 1, unit: 'd' },
      { value: '2d', number: 2, unit: 'd' },
      { value: '3d', number: 3, unit: 'd' },
    ],
  },
  {
    categoryKey: 'timeframeWeeksMonths',
    items: [
      { value: '1w', number: 1, unit: 'w' },
      { value: '1M', number: 1, unit: 'M' },
      { value: '3M', number: 3, unit: 'M' },
      { value: '6M', number: 6, unit: 'M' },
      { value: '12M', number: 12, unit: 'M' },
    ],
  },
];

interface HeaderProps {
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  layout: LayoutType;
  indicatorCount: number;
  onSymbolClick: () => void;
  onTimeframeChange: (tf: Timeframe) => void;
  onChartTypeChange: (type: ChartType) => void;
  onLayoutChange: (layout: LayoutType) => void;
  onOpenIndicators: () => void;
  onOpenAlerts: () => void;
  onOpenLayouts: () => void;
  onOpenBacktest: () => void;
  onToggleReplay: () => void;
  isReplayActive: boolean;
  onOpenHotkeys: () => void;
  onQuickSave: () => void;
  onTakeScreenshot: () => void;
  onExportData?: () => void;
  onOpenChartSettings?: () => void;
  onOpenCommandPalette?: () => void;
  onToggleWatchlist: () => void;
  onOpenCompare?: () => void;
  overlaySymbol?: string;
  isWatchlistOpen: boolean;
  currentPrice?: number;
  change24h?: number;
  syncSymbol?: boolean;
  syncTimeframe?: boolean;
  syncCrosshair?: boolean;
  syncTime?: boolean;
  onToggleSyncSymbol?: () => void;
  onToggleSyncTimeframe?: () => void;
  onToggleSyncCrosshair?: () => void;
  onToggleSyncTime?: () => void;
  templates?: IndicatorTemplate[];
  onApplyIndicatorTemplate?: (tmpl: IndicatorTemplate) => void;
  onSaveCurrentAsTemplate?: () => void;
}

const DEFAULT_STARRED_TIMEFRAMES: string[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

export const Header: React.FC<HeaderProps> = React.memo(({
  symbol,
  timeframe,
  chartType,
  layout,
  indicatorCount,
  onSymbolClick,
  onTimeframeChange,
  onChartTypeChange,
  onLayoutChange,
  onOpenIndicators,
  onOpenAlerts,
  onOpenLayouts,
  onOpenBacktest,
  onToggleReplay,
  isReplayActive,
  onOpenHotkeys,
  onQuickSave,
  onTakeScreenshot,
  onExportData,
  onOpenChartSettings,
  onOpenCommandPalette,
  onToggleWatchlist,
  onOpenCompare,
  overlaySymbol,
  isWatchlistOpen,
  currentPrice,
  change24h,
  syncSymbol = false,
  syncTimeframe = false,
  syncCrosshair = true,
  syncTime = true,
  onToggleSyncSymbol,
  onToggleSyncTimeframe,
  onToggleSyncCrosshair,
  onToggleSyncTime,
  templates = [],
  onApplyIndicatorTemplate,
  onSaveCurrentAsTemplate,
}) => {
  const { t, language, setLanguage, languages, currentLanguageOption } = useTranslation();

  const [showTfMenu, setShowTfMenu] = useState(false);
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

  // Timeframe starring & custom timeframe state
  const [starredTfs, setStarredTfs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('openchart_starred_timeframes');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_STARRED_TIMEFRAMES;
  });

  const [customTfs, setCustomTfs] = useState<TimeframeOption[]>(() => {
    try {
      const saved = localStorage.getItem('openchart_custom_timeframes');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  const [customNum, setCustomNum] = useState<string>('7');
  const [customUnit, setCustomUnit] = useState<'s' | 'm' | 'h' | 'd' | 'w' | 'M'>('m');

  const unitLabels = useMemo(() => {
    return {
      s: { full: t.header.unitSecond, short: t.header.unitSecond.slice(0, 1).toLowerCase() },
      m: { full: t.header.unitMinute, short: t.header.unitMinute.slice(0, 1).toLowerCase() },
      h: { full: t.header.unitHour, short: t.header.unitHour.slice(0, 1).toLowerCase() },
      d: { full: t.header.unitDay, short: t.header.unitDay.slice(0, 1).toUpperCase() },
      w: { full: t.header.unitWeek, short: t.header.unitWeek.slice(0, 1).toUpperCase() },
      M: { full: t.header.unitMonth, short: t.header.unitMonth.slice(0, 1).toUpperCase() },
    };
  }, [t]);

  const categories = useMemo(() => {
    return BASE_CATEGORIES.map(cat => ({
      categoryName: t.header[cat.categoryKey],
      items: cat.items.map(item => {
        const u = unitLabels[item.unit as keyof typeof unitLabels] || { full: item.unit, short: item.unit };
        return {
          value: item.value,
          label: `${item.number} ${u.full}`,
          shortLabel: `${item.number}${u.short}`,
        };
      })
    }));
  }, [t, unitLabels]);

  const getTfShortLabel = (val: string): string => {
    for (const cat of categories) {
      const found = cat.items.find(i => i.value === val);
      if (found) return found.shortLabel;
    }
    const custom = customTfs.find(c => c.value === val);
    if (custom) return custom.shortLabel;
    return val;
  };

  const toggleStarTf = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredTfs(prev => {
      const next = prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val];
      try {
        localStorage.setItem('openchart_starred_timeframes', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const handleAddCustomTimeframe = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(customNum, 10);
    if (isNaN(n) || n <= 0) return;
    const val = `${n}${customUnit}` as Timeframe;
    const u = unitLabels[customUnit] || { full: customUnit, short: customUnit };
    const shortLabel = `${n}${u.short}`;
    const label = `${n} ${u.full}`;

    const newOption: TimeframeOption = { label, value: val, shortLabel };
    if (!customTfs.some(c => c.value === val)) {
      const nextCustom = [...customTfs, newOption];
      setCustomTfs(nextCustom);
      try {
        localStorage.setItem('openchart_custom_timeframes', JSON.stringify(nextCustom));
      } catch (_) {}
    }

    if (!starredTfs.includes(val)) {
      const nextStarred = [...starredTfs, val];
      setStarredTfs(nextStarred);
      try {
        localStorage.setItem('openchart_starred_timeframes', JSON.stringify(nextStarred));
      } catch (_) {}
    }

    onTimeframeChange(val);
    setShowTfMenu(false);
  };

  const handleSaveClick = () => {
    onQuickSave();
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <header className="h-12 bg-tv-surface border-b border-tv-border flex items-center justify-between px-3 select-none text-xs text-tv-text z-40 relative">
      {/* Left side: Symbol, Timeframes, Chart Types, Indicators */}
      <div className="flex items-center space-x-1 sm:space-x-2">

        {/* Symbol Search Button */}
        <button
          onClick={onSymbolClick}
          className="flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-tv-hover transition-colors font-bold text-white text-sm"
          title={t.header.symbolSearchPlaceholder}
        >
          <Search className="w-3.5 h-3.5 text-tv-muted" />
          <span>{symbol}</span>
          {currentPrice !== undefined && (
            <span className="font-mono text-xs hidden sm:inline ml-1 font-normal">
              ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
          )}
          {change24h !== undefined && (
            <span className={`text-[11px] font-mono font-medium hidden md:inline ${change24h >= 0 ? 'text-tv-green' : 'text-tv-red'}`}>
              {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
            </span>
          )}
        </button>

        {/* Universal Command Palette Button */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-tv-card hover:bg-tv-hover border border-tv-border text-[11px] text-tv-muted hover:text-white transition-colors"
            title={t.header.commandPalette}
          >
            <Search className="w-3 h-3 text-tv-blue" />
            <span>{t.header.commandPalette.split(' ')[0]}</span>
            <kbd className="px-1 py-0.2 rounded bg-tv-surface border border-tv-border/80 text-[9px] font-mono font-bold text-tv-blue">
              Ctrl+K
            </kbd>
          </button>
        )}

        {/* Compare Symbol Button */}
        {onOpenCompare && (
          <button
            onClick={onOpenCompare}
            className={`px-2 py-1 rounded flex items-center space-x-1 transition-colors text-xs font-semibold ${
              overlaySymbol ? 'bg-orange-500/20 text-[#ff9800] border border-orange-500/40' : 'hover:bg-tv-hover text-tv-muted hover:text-white'
            }`}
            title={t.header.compare}
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span className="hidden lg:inline text-[11px]">{overlaySymbol ? overlaySymbol : t.header.compare}</span>
          </button>
        )}

        <div className="h-4 w-[1px] bg-tv-border hidden sm:block" />

        {/* Timeframe quick selector (Starred / Pinned) */}
        <div className="flex items-center space-x-0.5">
          {starredTfs.map(tfVal => {
            const isCurrent = timeframe === tfVal;
            const short = getTfShortLabel(tfVal);
            return (
              <button
                key={tfVal}
                onClick={() => onTimeframeChange(tfVal as Timeframe)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-tv-blue text-white shadow-sm'
                    : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
                }`}
                title={`${t.header.timeframes}: ${tfVal}`}
              >
                {short}
              </button>
            );
          })}

          {/* If current timeframe is not pinned in favorites, show it with active styling */}
          {!starredTfs.includes(timeframe) && (
            <button
              onClick={() => onTimeframeChange(timeframe)}
              className="px-2 py-1 rounded text-[11px] font-semibold bg-tv-blue text-white shadow-sm"
              title={`${t.header.timeframes}: ${timeframe}`}
            >
              {getTfShortLabel(timeframe)}
            </button>
          )}

          {/* Timeframe Dropdown (All Categories + Custom Timeframes) */}
          <div className="relative">
            <button
              onClick={() => setShowTfMenu(!showTfMenu)}
              className={`p-1 rounded transition-colors ${
                showTfMenu ? 'bg-tv-hover text-white' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
              }`}
              title={t.header.timeframes}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showTfMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowTfMenu(false)} 
                />
                <div 
                  className="absolute top-8 left-0 w-64 bg-tv-surface border border-tv-border rounded-lg shadow-2xl z-50 text-xs flex flex-col max-h-[480px] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
                  onMouseLeave={() => setShowTfMenu(false)}
                >
                {/* Scrollable list of categories */}
                <div className="flex-1 overflow-y-auto divide-y divide-tv-border/40 py-1">
                  {categories.map(category => (
                    <div key={category.categoryName} className="py-1">
                      <div className="px-3 py-1 text-[10px] font-bold text-tv-muted tracking-wider uppercase">
                        {category.categoryName}
                      </div>
                      {category.items.map(item => {
                        const isCurrent = timeframe === item.value;
                        const isStarred = starredTfs.includes(item.value);

                        return (
                          <div
                            key={item.value}
                            onClick={() => {
                              onTimeframeChange(item.value);
                              setShowTfMenu(false);
                            }}
                            className={`group px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors ${
                              isCurrent ? 'bg-tv-blue/15 text-tv-blue font-bold' : 'text-tv-text hover:bg-tv-hover'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-3.5 flex items-center justify-center">
                                {isCurrent && <Check className="w-3.5 h-3.5 text-tv-blue" />}
                              </span>
                              <span className="text-[12px]">{item.label}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-tv-muted font-mono">{item.shortLabel}</span>
                              <button
                                type="button"
                                onClick={(e) => toggleStarTf(item.value, e)}
                                className={`p-0.5 rounded hover:bg-tv-bg transition-colors ${
                                  isStarred 
                                    ? 'text-yellow-400' 
                                    : 'text-tv-border group-hover:text-tv-muted hover:!text-yellow-400'
                                }`}
                                title={isStarred ? t.common.delete : t.common.confirm}
                              >
                                <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-yellow-400' : ''}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Custom timeframes group (if any) */}
                  {customTfs.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] font-bold text-tv-muted tracking-wider uppercase">
                        {t.header.customTimeframes}
                      </div>
                      {customTfs.map(item => {
                        const isCurrent = timeframe === item.value;
                        const isStarred = starredTfs.includes(item.value);

                        return (
                          <div
                            key={item.value}
                            onClick={() => {
                              onTimeframeChange(item.value);
                              setShowTfMenu(false);
                            }}
                            className={`group px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors ${
                              isCurrent ? 'bg-tv-blue/15 text-tv-blue font-bold' : 'text-tv-text hover:bg-tv-hover'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-3.5 flex items-center justify-center">
                                {isCurrent && <Check className="w-3.5 h-3.5 text-tv-blue" />}
                              </span>
                              <span className="text-[12px]">{item.label}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-tv-muted font-mono">{item.shortLabel}</span>
                              <button
                                type="button"
                                onClick={(e) => toggleStarTf(item.value, e)}
                                className={`p-0.5 rounded hover:bg-tv-bg transition-colors ${
                                  isStarred 
                                    ? 'text-yellow-400' 
                                    : 'text-tv-border group-hover:text-tv-muted hover:!text-yellow-400'
                                }`}
                              >
                                <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-yellow-400' : ''}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom Custom Timeframe Creator */}
                <form
                  onSubmit={handleAddCustomTimeframe}
                  className="p-2.5 bg-tv-bg border-t border-tv-border flex items-center space-x-1.5"
                >
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={customNum}
                    onChange={(e) => setCustomNum(e.target.value)}
                    placeholder="7"
                    className="w-12 bg-tv-surface border border-tv-border rounded px-1.5 py-1 text-xs text-center text-white focus:outline-none focus:border-tv-blue"
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as any)}
                    className="bg-tv-surface border border-tv-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-tv-blue flex-1"
                  >
                    <option value="s">{t.header.unitSecond} (s)</option>
                    <option value="m">{t.header.unitMinute} (m)</option>
                    <option value="h">{t.header.unitHour} (h)</option>
                    <option value="d">{t.header.unitDay} (d)</option>
                    <option value="w">{t.header.unitWeek} (w)</option>
                    <option value="M">{t.header.unitMonth} (M)</option>
                  </select>
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded bg-tv-blue hover:bg-blue-600 text-white text-xs font-semibold flex items-center space-x-1 shadow-sm transition-colors"
                    title={t.header.addCustomTimeframe}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.common.apply}</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

        <div className="h-4 w-[1px] bg-tv-border" />

        {/* Chart Types Menu */}
        <div className="relative">
          <button
            onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
            className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-tv-hover text-tv-text"
            title={t.header.chartType}
          >
            {chartType === 'candlestick' && <CandlestickChart className="w-4 h-4 text-tv-blue" />}
            {chartType === 'hollow-candlestick' && <CandlestickChart className="w-4 h-4 text-tv-green" />}
            {chartType === 'volume-footprint' && <SlidersHorizontal className="w-4 h-4 text-[#ff9800]" />}
            {chartType === 'volume-candle' && <BarChart2 className="w-4 h-4 text-tv-green" />}
            {chartType === 'bar' && <BarChart2 className="w-4 h-4 text-tv-blue" />}
            {chartType === 'line' && <TrendingUp className="w-4 h-4 text-tv-blue" />}
            {chartType === 'area' && <Activity className="w-4 h-4 text-tv-blue" />}
            {chartType === 'baseline' && <TrendingUp className="w-4 h-4 text-tv-yellow" />}
            {chartType === 'heikin-ashi' && <CandlestickChart className="w-4 h-4 text-tv-purple" />}
            {chartType === 'columns' && <Grid className="w-4 h-4 text-tv-blue" />}
            {chartType === 'high-low' && <Activity className="w-4 h-4 text-tv-blue" />}
            {chartType === 'step-line' && <TrendingUp className="w-4 h-4 text-tv-blue" />}
            {chartType === 'line-with-markers' && <Activity className="w-4 h-4 text-tv-green" />}
            {chartType === 'renko' && <Grid className="w-4 h-4 text-tv-purple" />}
            {chartType === 'line-break' && <BarChart2 className="w-4 h-4 text-tv-yellow" />}
            <ChevronDown className="w-3 h-3 text-tv-muted" />
          </button>

          {showChartTypeMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowChartTypeMenu(false)} 
              />
              <div 
                className="absolute top-8 left-0 w-64 bg-tv-surface border border-tv-border rounded shadow-2xl py-1.5 z-50 text-xs max-h-[460px] overflow-y-auto"
                onMouseLeave={() => setShowChartTypeMenu(false)}
              >
              <div className="px-3 py-1 text-[10px] font-bold text-tv-muted uppercase tracking-wider bg-tv-bg/50">
                {t.chart.orderFlowBidAsk}
              </div>
              <button
                onClick={() => { onChartTypeChange('volume-footprint'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover ${chartType === 'volume-footprint' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#ff9800]" />
                  <span>{t.header.volumeFootprint}</span>
                </div>
                <span className="text-[9px] font-mono px-1 rounded bg-orange-500/20 text-[#ff9800] font-bold">Orderflow</span>
              </button>
              <button
                onClick={() => { onChartTypeChange('volume-candle'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover ${chartType === 'volume-candle' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-tv-green" />
                  <span>{t.header.volumeCandle}</span>
                </div>
              </button>

              <div className="px-3 py-1 text-[10px] font-bold text-tv-muted uppercase tracking-wider bg-tv-bg/50 mt-1">
                {t.modals.candlesGroup}
              </div>
              <button
                onClick={() => { onChartTypeChange('candlestick'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'candlestick' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <CandlestickChart className="w-4 h-4 text-tv-blue" />
                <span>{t.header.candlestick}</span>
              </button>
              <button
                onClick={() => { onChartTypeChange('hollow-candlestick'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'hollow-candlestick' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <CandlestickChart className="w-4 h-4 text-tv-green" />
                <span>{t.header.hollowCandle}</span>
              </button>
              <button
                onClick={() => { onChartTypeChange('bar'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'bar' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <BarChart2 className="w-4 h-4 text-tv-blue" />
                <span>{t.header.bar}</span>
              </button>

              <div className="px-3 py-1 text-[10px] font-bold text-tv-muted uppercase tracking-wider bg-tv-bg/50 mt-1">
                {t.header.line} & {t.header.area}
              </div>
              <button
                onClick={() => { onChartTypeChange('line'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'line' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <TrendingUp className="w-4 h-4 text-tv-blue" />
                <span>{t.header.line}</span>
              </button>
              <button
                onClick={() => { onChartTypeChange('area'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'area' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <Activity className="w-4 h-4 text-tv-blue" />
                <span>{t.header.area}</span>
              </button>
              <button
                onClick={() => { onChartTypeChange('baseline'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'baseline' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <TrendingUp className="w-4 h-4 text-tv-yellow" />
                <span>{t.header.baseline}</span>
              </button>
              <button
                onClick={() => { onChartTypeChange('step-line'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'step-line' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <TrendingUp className="w-4 h-4 text-tv-blue" />
                <span>{t.header.stepLine}</span>
              </button>
              <button
                onClick={() => { onChartTypeChange('line-with-markers'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'line-with-markers' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <Activity className="w-4 h-4 text-tv-green" />
                <span>{t.header.lineWithMarkers}</span>
              </button>
              <button
                onClick={() => { onChartTypeChange('columns'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'columns' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <Grid className="w-4 h-4 text-tv-blue" />
                <span>{t.header.columns}</span>
              </button>
              <button
                onClick={() => { onChartTypeChange('high-low'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'high-low' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <Activity className="w-4 h-4 text-tv-blue" />
                <span>{t.header.highLow}</span>
              </button>

              <div className="px-3 py-1 text-[10px] font-bold text-tv-muted uppercase tracking-wider bg-tv-bg/50 mt-1">
                {t.header.heikinAshi} & {t.header.renko}
              </div>
              <button
                onClick={() => { onChartTypeChange('heikin-ashi'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'heikin-ashi' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <CandlestickChart className="w-4 h-4 text-tv-purple" />
                <span>{t.header.heikinAshi}</span>
              </button>
              <button
                onClick={() => { onChartTypeChange('renko'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'renko' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <Grid className="w-4 h-4 text-tv-purple" />
                <span>{t.header.renko}</span>
              </button>
              <button
                onClick={() => { onChartTypeChange('line-break'); setShowChartTypeMenu(false); }}
                className={`w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-tv-hover ${chartType === 'line-break' ? 'text-tv-blue font-bold bg-tv-blue/10' : ''}`}
              >
                <BarChart2 className="w-4 h-4 text-tv-yellow" />
                <span>{t.header.threeLineBreak}</span>
              </button>
            </div>
          </>
        )}
      </div>

        <div className="h-4 w-[1px] bg-tv-border" />

        {/* Indicators fx Button */}
        <button
          onClick={onOpenIndicators}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-tv-card hover:bg-tv-hover border border-tv-border transition-colors text-white font-medium"
          title={t.header.unlimitedIndicators}
        >
          <span className="font-serif italic font-bold text-tv-blue">fx</span>
          <span>{t.header.indicators}</span>
          {indicatorCount > 0 && (
            <span className="bg-tv-blue text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {indicatorCount}
            </span>
          )}
        </button>

        {/* Indicator Templates Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
            className={`flex items-center space-x-1 px-2 py-1 rounded border transition-colors ${
              showTemplatesMenu ? 'bg-tv-hover border-tv-blue text-tv-blue' : 'bg-tv-card hover:bg-tv-hover border-tv-border text-tv-muted hover:text-white'
            }`}
            title={t.header.templates}
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-tv-blue" />
            <span className="hidden lg:inline text-xs">{t.header.templates}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showTemplatesMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowTemplatesMenu(false)} 
              />
              <div 
                className="absolute top-9 left-0 w-72 bg-tv-surface border border-tv-border rounded-lg shadow-2xl py-2 z-50 text-xs text-tv-text backdrop-blur-md"
                onMouseLeave={() => setShowTemplatesMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] font-bold text-tv-muted uppercase tracking-wider border-b border-tv-border/50">
                  {t.header.templates}
                </div>
                <div className="py-1 max-h-64 overflow-y-auto divide-y divide-tv-border/20">
                  {templates.map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => {
                        onApplyIndicatorTemplate?.(tmpl);
                        setShowTemplatesMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-tv-hover flex flex-col group transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white group-hover:text-tv-blue">{tmpl.name}</span>
                        {tmpl.isBuiltin && (
                          <span className="text-[9px] bg-tv-card border border-tv-border/60 text-tv-muted px-1.5 rounded">Ready</span>
                        )}
                      </div>
                      {tmpl.description && (
                        <span className="text-[10px] text-tv-muted line-clamp-1 mt-0.5">{tmpl.description}</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-tv-border/50 pt-2 px-2">
                  <button
                    onClick={() => {
                      setShowTemplatesMenu(false);
                      onSaveCurrentAsTemplate?.();
                    }}
                    className="w-full px-2 py-1.5 rounded bg-tv-blue text-white text-center hover:bg-tv-blue-hover font-semibold transition-colors flex items-center justify-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.header.saveTemplate}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Strategy Backtest Button */}
        <button
          onClick={onOpenBacktest}
          className="hidden md:flex items-center space-x-1 px-2.5 py-1 rounded bg-tv-card hover:bg-tv-hover border border-tv-border transition-colors text-white font-medium"
          title={t.header.strategyBacktest}
        >
          <Zap className="w-3.5 h-3.5 text-tv-yellow" />
          <span>{t.header.strategyBacktest}</span>
        </button>

        {/* Bar Replay Button */}
        <button
          onClick={onToggleReplay}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded border transition-colors font-medium ${
            isReplayActive
              ? 'bg-tv-blue border-tv-blue text-white'
              : 'bg-tv-card hover:bg-tv-hover border-tv-border text-white'
          }`}
          title={t.header.barReplay}
        >
          <RotateCcw className="w-3.5 h-3.5 text-tv-blue" />
          <span className="hidden sm:inline">{t.header.barReplay}</span>
        </button>
      </div>

      {/* Right side: Layout, Alerts, Screenshot, Save, Language, Watchlist */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Multi-chart Layout Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-tv-hover text-tv-text"
            title={t.header.layouts}
          >
            <Grid className="w-4 h-4" />
            <span className="text-[11px] font-mono">{layout}</span>
            <ChevronDown className="w-3 h-3 text-tv-muted" />
          </button>

          {showLayoutMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowLayoutMenu(false)} 
              />
              <div 
                className="absolute top-8 right-0 w-48 bg-tv-surface border border-tv-border rounded shadow-xl py-1.5 z-50 text-xs"
                onMouseLeave={() => setShowLayoutMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] text-tv-muted uppercase font-bold tracking-wider">
                  {t.header.layouts}
                </div>
                <button
                  onClick={() => { onLayoutChange('1x1'); setShowLayoutMenu(false); }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover ${layout === '1x1' ? 'text-tv-blue font-bold' : ''}`}
                >
                  <span>{t.header.layout1x1}</span>
                </button>
                <button
                  onClick={() => { onLayoutChange('1x2'); setShowLayoutMenu(false); }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover ${layout === '1x2' ? 'text-tv-blue font-bold' : ''}`}
                >
                  <span>{t.header.layout1x2}</span>
                </button>
                <button
                  onClick={() => { onLayoutChange('2x1'); setShowLayoutMenu(false); }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover ${layout === '2x1' ? 'text-tv-blue font-bold' : ''}`}
                >
                  <span>{t.header.layout2x1}</span>
                </button>
                <button
                  onClick={() => { onLayoutChange('2x2'); setShowLayoutMenu(false); }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover ${layout === '2x2' ? 'text-tv-blue font-bold' : ''}`}
                >
                  <span>{t.header.layout2x2}</span>
                </button>
                <button
                  onClick={() => { onLayoutChange('1x3'); setShowLayoutMenu(false); }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover ${layout === '1x3' ? 'text-tv-blue font-bold' : ''}`}
                >
                  <span>{t.header.layout1x3}</span>
                </button>
                <button
                  onClick={() => { onLayoutChange('3x1'); setShowLayoutMenu(false); }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover ${layout === '3x1' ? 'text-tv-blue font-bold' : ''}`}
                >
                  <span>{t.header.layout3x1}</span>
                </button>
                <button
                  onClick={() => { onLayoutChange('1left-2right'); setShowLayoutMenu(false); }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover ${layout === '1left-2right' ? 'text-tv-blue font-bold' : ''}`}
                >
                  <span>{t.header.layout1left2right}</span>
                </button>
                <button
                  onClick={() => { onLayoutChange('3x2'); setShowLayoutMenu(false); }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover ${layout === '3x2' ? 'text-tv-blue font-bold' : ''}`}
                >
                  <span>{t.header.layout3x2}</span>
                </button>

                <div className="border-t border-tv-border my-1" />
                <div className="px-3 py-1 text-[10px] text-tv-muted uppercase font-bold tracking-wider">
                  {t.header.syncAllCharts}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSyncSymbol?.(); }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover cursor-pointer"
                >
                  <span>{t.header.syncSymbol}</span>
                  <input 
                    type="checkbox" 
                    checked={Boolean(syncSymbol)} 
                    readOnly 
                    className="accent-tv-blue cursor-pointer" 
                  />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSyncTimeframe?.(); }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover cursor-pointer"
                >
                  <span>{t.header.syncTimeframe}</span>
                  <input 
                    type="checkbox" 
                    checked={Boolean(syncTimeframe)} 
                    readOnly 
                    className="accent-tv-blue cursor-pointer" 
                  />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSyncCrosshair?.(); }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover cursor-pointer"
                >
                  <span>{t.header.syncCrosshair}</span>
                  <input 
                    type="checkbox" 
                    checked={Boolean(syncCrosshair)} 
                    readOnly 
                    className="accent-tv-blue cursor-pointer" 
                  />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSyncTime?.(); }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover cursor-pointer"
                >
                  <span>{t.header.syncTime}</span>
                  <input 
                    type="checkbox" 
                    checked={Boolean(syncTime)} 
                    readOnly 
                    className="accent-tv-blue cursor-pointer" 
                  />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="h-4 w-[1px] bg-tv-border" />

        {/* Quick Save / Layouts button */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleSaveClick}
            className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-tv-hover text-tv-text"
            title={t.header.saveLayout}
          >
            {savedBadge ? (
              <>
                <Check className="w-3.5 h-3.5 text-tv-green" />
                <span className="text-tv-green font-medium text-[11px]">{t.header.saved}</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden md:inline">{t.header.saveLayout}</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenLayouts}
            className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-tv-text"
            title={t.header.layouts}
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alerts Button */}
        <button
          onClick={onOpenAlerts}
          className="p-1.5 rounded hover:bg-tv-hover text-tv-text"
          title={t.rightSidebar.alertsTab}
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Screenshot Button */}
        <button
          onClick={onTakeScreenshot}
          className="p-1.5 rounded hover:bg-tv-hover text-tv-text hidden sm:block"
          title={t.header.screenshot}
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Export Data Button */}
        {onExportData && (
          <button
            onClick={onExportData}
            className="p-1.5 rounded hover:bg-tv-hover text-tv-text hidden sm:block"
            title={t.header.exportCsv}
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Chart Settings Gear Button */}
        {onOpenChartSettings && (
          <button
            onClick={onOpenChartSettings}
            className="p-1.5 rounded hover:bg-tv-hover text-tv-text"
            title={t.header.chartSettings}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullScreen}
          className="p-1.5 rounded hover:bg-tv-hover text-tv-text hidden sm:block"
          title={t.header.fullscreen}
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Hotkeys Button */}
        <button
          onClick={onOpenHotkeys}
          className="p-1.5 rounded hover:bg-tv-hover text-tv-text"
          title={t.header.hotkeys}
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center space-x-1 px-1.5 py-1 rounded hover:bg-tv-hover text-tv-text transition-colors border border-tv-border/50 bg-tv-card/60"
            title={t.header.language}
          >
            <span className="text-sm leading-none">{currentLanguageOption.flag}</span>
            <span className="text-[11px] font-bold uppercase hidden md:inline ml-0.5">{currentLanguageOption.code}</span>
            <ChevronDown className="w-3 h-3 text-tv-muted" />
          </button>

          {showLangMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowLangMenu(false)} 
              />
              <div 
                className="absolute top-8 right-0 w-48 bg-tv-surface border border-tv-border rounded-lg shadow-2xl py-1.5 z-50 text-xs animate-in fade-in-50 zoom-in-95 duration-100"
                onMouseLeave={() => setShowLangMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] text-tv-muted uppercase font-bold tracking-wider border-b border-tv-border/40 mb-1">
                  {t.header.language}
                </div>
                {languages.map((lang) => {
                  const isSelected = lang.code === language;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover transition-colors ${
                        isSelected ? 'text-tv-blue font-bold bg-tv-blue/10' : 'text-tv-text'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base">{lang.flag}</span>
                        <span className="text-xs">{lang.nativeName}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-tv-blue" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="h-4 w-[1px] bg-tv-border" />

        {/* Toggle Watchlist sidebar */}
        <button
          onClick={onToggleWatchlist}
          className={`px-2 py-1 rounded flex items-center space-x-1 transition-colors ${
            isWatchlistOpen ? 'bg-tv-blue text-white' : 'hover:bg-tv-hover text-tv-text'
          }`}
          title={t.header.watchlist}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden md:inline">{t.header.watchlist}</span>
        </button>
      </div>
    </header>
  );
});
