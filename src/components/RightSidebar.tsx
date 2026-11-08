import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  SlidersHorizontal, 
  Bell, 
  Layers, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  TrendingDown, 
  X,
  Volume2,
  Activity,
  Newspaper,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TableProperties,
  Calendar,
  Clock,
  Flag,
  Search,
  ArrowUpDown,
  FolderPlus,
  Check,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { WatchlistItem, PriceAlert, DrawingElement, IndicatorConfig, CandleData } from '../types';
import { newsService, NewsItem, EconomicEventItem } from '../services/newsService';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD, 
  calculateStochastic, 
  calculateCCI, 
  calculateAwesomeOscillator,
  calculateBollingerBands,
  calculateSupertrend,
  calculateATR
} from '../indicators/math';
import { useTranslation } from '../i18n';

interface RightSidebarProps {
  watchlist: WatchlistItem[];
  alerts: PriceAlert[];
  drawings: DrawingElement[];
  indicators: IndicatorConfig[];
  currentSymbol: string;
  candles?: CandleData[];
  hoverCandle?: CandleData | null;
  timeframe?: string;
  onSelectSymbol: (symbol: string) => void;
  onAddWatchlistSymbol: (symbol: string) => void;
  onRemoveWatchlistSymbol: (symbol: string) => void;
  onOpenAddSymbolModal?: () => void;
  onUpdateWatchlist?: (updated: WatchlistItem[]) => void;
  onDeleteAlert: (id: string) => void;
  onOpenCreateAlert: () => void;
  onDeleteDrawing: (id: string) => void;
  onToggleDrawingVisibility: (id: string) => void;
  onDeleteIndicator: (id: string) => void;
  onToggleIndicatorVisibility: (id: string) => void;
  onClose: () => void;
}

type TabType = 'watchlist' | 'alerts' | 'dataWindow' | 'technical' | 'depth' | 'news' | 'objects';

export const RightSidebar: React.FC<RightSidebarProps> = React.memo(({
  watchlist,
  alerts,
  drawings,
  indicators,
  currentSymbol,
  candles = [],
  hoverCandle,
  timeframe = '15m',
  onSelectSymbol,
  onAddWatchlistSymbol,
  onRemoveWatchlistSymbol,
  onOpenAddSymbolModal,
  onUpdateWatchlist,
  onDeleteAlert,
  onOpenCreateAlert,
  onDeleteDrawing,
  onToggleDrawingVisibility,
  onDeleteIndicator,
  onToggleIndicatorVisibility,
  onClose,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('watchlist');
  const [newSymbolInput, setNewSymbolInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [watchlistSearch, setWatchlistSearch] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [sortMode, setSortMode] = useState<'default' | 'symbol-asc' | 'symbol-desc' | 'change-desc' | 'change-asc' | 'price-desc' | 'price-asc'>('default');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  // Dynamic width state with mouse resizing & localStorage persistence
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('openchart_right_sidebar_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 220 && val <= 800) {
          return val;
        }
      }
    } catch (_) {}
    return 288;
  });
  const [isResizing, setIsResizing] = useState(false);

  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startW = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX; // dragging left expands sidebar
      const minW = 220;
      const maxW = Math.min(window.innerWidth * 0.65, 800);
      const newWidth = Math.round(Math.min(Math.max(startW + deltaX, minW), maxW));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        setSidebarWidth(w => {
          localStorage.setItem('openchart_right_sidebar_width', String(w));
          return w;
        });
      } catch (_) {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // News & Economic Calendar State
  const [newsSubTab, setNewsSubTab] = useState<'news' | 'calendar'>('news');
  const [newsFilter, setNewsFilter] = useState<'all' | 'symbol'>('all');
  const [calendarImpactFilter, setCalendarImpactFilter] = useState<'all' | 'high'>('all');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<EconomicEventItem[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState<boolean>(false);
  const [newsLastFetchTime, setNewsLastFetchTime] = useState<string>('');

  const loadNewsAndCalendar = useCallback(async (force = false) => {
    setIsNewsLoading(true);
    try {
      const [fetchedNews, fetchedEvents] = await Promise.all([
        newsService.getNews(currentSymbol, force),
        newsService.getEconomicCalendar(force)
      ]);
      setNewsItems(fetchedNews);
      setCalendarEvents(fetchedEvents);
      const now = new Date();
      setNewsLastFetchTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] [WARN] RightSidebar: Failed to fetch news/calendar:`, err);
    } finally {
      setIsNewsLoading(false);
    }
  }, [currentSymbol]);

  useEffect(() => {
    if (activeTab === 'news') {
      loadNewsAndCalendar(false);
      const interval = setInterval(() => {
        loadNewsAndCalendar(true);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadNewsAndCalendar]);

  const filteredNews = useMemo(() => {
    if (newsFilter === 'symbol') {
      const symBase = currentSymbol.replace(/USDT|USD|BUSD|USDC|EUR|TRY/i, '').toUpperCase();
      const filtered = newsItems.filter(n => 
        n.title.toUpperCase().includes(symBase) || 
        n.tag.toUpperCase().includes(symBase) ||
        (n.description && n.description.toUpperCase().includes(symBase))
      );
      return filtered.length > 0 ? filtered : newsItems;
    }
    return newsItems;
  }, [newsItems, newsFilter, currentSymbol]);

  const filteredEvents = useMemo(() => {
    if (calendarImpactFilter === 'high') {
      return calendarEvents.filter(e => e.impact === 'High');
    }
    return calendarEvents;
  }, [calendarEvents, calendarImpactFilter]);

  const handleCycleFlag = (symbol: string, currentFlag?: string) => {
    if (!onUpdateWatchlist) return;
    const colors = [undefined, '#ef5350', '#26a69a', '#2962ff', '#ff9800', '#ab47bc'];
    const currentIndex = colors.indexOf(currentFlag);
    const nextColor = colors[(currentIndex + 1) % colors.length];
    
    const updated = watchlist.map(item => {
      if (item.symbol === symbol) {
        return { ...item, flagColor: nextColor };
      }
      return item;
    });
    onUpdateWatchlist(updated);
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim() || !onUpdateWatchlist) return;
    const newSection: WatchlistItem = {
      symbol: `SECTION_${Date.now()}`,
      name: newSectionTitle.trim(),
      price: 0,
      change24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      isSectionHeader: true,
      sectionTitle: newSectionTitle.trim()
    };
    onUpdateWatchlist([...watchlist, newSection]);
    setNewSectionTitle('');
    setIsAddingSection(false);
  };

  const formatPrice = (price?: number) => {
    if (!price || price === 0) return '0.00';
    if (price < 0.0001) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const processedWatchlist = useMemo(() => {
    let list = [...watchlist];

    if (watchlistSearch.trim()) {
      const q = watchlistSearch.trim().toLowerCase();
      list = list.filter(item => 
        (item.isSectionHeader && item.sectionTitle?.toLowerCase().includes(q)) ||
        item.symbol.toLowerCase().includes(q) ||
        (item.name && item.name.toLowerCase().includes(q))
      );
    }

    if (sortMode !== 'default') {
      list.sort((a, b) => {
        if (a.isSectionHeader || b.isSectionHeader) return 0;
        switch (sortMode) {
          case 'symbol-asc':
            return a.symbol.localeCompare(b.symbol);
          case 'symbol-desc':
            return b.symbol.localeCompare(a.symbol);
          case 'price-desc':
            return (b.price || 0) - (a.price || 0);
          case 'price-asc':
            return (a.price || 0) - (b.price || 0);
          case 'change-desc':
            return (b.change24h || 0) - (a.change24h || 0);
          case 'change-asc':
            return (a.change24h || 0) - (b.change24h || 0);
          default:
            return 0;
        }
      });
    }

    return list;
  }, [watchlist, watchlistSearch, sortMode]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbolInput.trim()) {
      onAddWatchlistSymbol(newSymbolInput.trim().toUpperCase());
      setNewSymbolInput('');
      setIsAdding(false);
    }
  };

  // Technical Analysis Calculation (Only computed when user is actively viewing the Technical tab)
  const technicalAnalysis = useMemo(() => {
    if (activeTab !== 'technical' || !candles || candles.length < 20) {
      return {
        summary: t.rightSidebar.neutralSignal,
        score: 50,
        ma: { buy: 0, sell: 0, neutral: 0, items: [] },
        osc: { buy: 0, sell: 0, neutral: 0, items: [] },
      };
    }

    const lastCandle = candles[candles.length - 1];
    const currentPrice = lastCandle.close;

    // Moving Averages Evaluation
    const maConfigs = [
      { name: 'EMA (10)', fn: () => calculateEMA(candles, 10) },
      { name: 'SMA (10)', fn: () => calculateSMA(candles, 10) },
      { name: 'EMA (20)', fn: () => calculateEMA(candles, 20) },
      { name: 'SMA (20)', fn: () => calculateSMA(candles, 20) },
      { name: 'EMA (50)', fn: () => calculateEMA(candles, 50) },
      { name: 'SMA (50)', fn: () => calculateSMA(candles, 50) },
    ];

    let maBuy = 0;
    let maSell = 0;
    let maNeutral = 0;
    const maItems: { name: string; value: number; signal: string }[] = [];

    for (const conf of maConfigs) {
      const res = conf.fn();
      if (res && res.length > 0) {
        const lastVal = res[res.length - 1].value;
        let signal: string = t.rightSidebar.neutralSignal;
        if (currentPrice > lastVal * 1.0005) {
          signal = t.rightSidebar.buySignal;
          maBuy++;
        } else if (currentPrice < lastVal * 0.9995) {
          signal = t.rightSidebar.sellSignal;
          maSell++;
        } else {
          maNeutral++;
        }
        maItems.push({ name: conf.name, value: lastVal, signal });
      }
    }

    // Oscillators Evaluation
    let oscBuy = 0;
    let oscSell = 0;
    let oscNeutral = 0;
    const oscItems: { name: string; value: number; signal: string }[] = [];

    // 1. RSI
    const rsiRes = calculateRSI(candles, 14);
    if (rsiRes && rsiRes.length > 0) {
      const rsiVal = rsiRes[rsiRes.length - 1].value;
      let sig: string = t.rightSidebar.neutralSignal;
      if (rsiVal < 30) { sig = t.rightSidebar.buySignal; oscBuy++; }
      else if (rsiVal > 70) { sig = t.rightSidebar.sellSignal; oscSell++; }
      else { oscNeutral++; }
      oscItems.push({ name: 'RSI (14)', value: rsiVal, signal: sig });
    }

    // 2. Stochastic
    const stochRes = calculateStochastic(candles, 14, 3, 3);
    if (stochRes && stochRes.length > 0) {
      const kVal = stochRes[stochRes.length - 1].k;
      let sig: string = t.rightSidebar.neutralSignal;
      if (kVal < 20) { sig = t.rightSidebar.buySignal; oscBuy++; }
      else if (kVal > 80) { sig = t.rightSidebar.sellSignal; oscSell++; }
      else { oscNeutral++; }
      oscItems.push({ name: 'Stochastic %K', value: kVal, signal: sig });
    }

    // 3. CCI
    const cciRes = calculateCCI(candles, 20);
    if (cciRes && cciRes.length > 0) {
      const cciVal = cciRes[cciRes.length - 1].value;
      let sig: string = t.rightSidebar.neutralSignal;
      if (cciVal < -100) { sig = t.rightSidebar.buySignal; oscBuy++; }
      else if (cciVal > 100) { sig = t.rightSidebar.sellSignal; oscSell++; }
      else { oscNeutral++; }
      oscItems.push({ name: 'CCI (20)', value: cciVal, signal: sig });
    }

    // 4. MACD Histogram
    const macdRes = calculateMACD(candles, 12, 26, 9);
    if (macdRes && macdRes.length > 0) {
      const histVal = macdRes[macdRes.length - 1].histogram;
      let sig: string = t.rightSidebar.neutralSignal;
      if (histVal > 0) { sig = t.rightSidebar.buySignal; oscBuy++; }
      else if (histVal < 0) { sig = t.rightSidebar.sellSignal; oscSell++; }
      else { oscNeutral++; }
      oscItems.push({ name: 'MACD Hist', value: histVal, signal: sig });
    }

    // 5. Awesome Oscillator
    const aoRes = calculateAwesomeOscillator(candles);
    if (aoRes && aoRes.length > 0) {
      const aoVal = aoRes[aoRes.length - 1].value;
      let sig: string = t.rightSidebar.neutralSignal;
      if (aoVal > 0) { sig = t.rightSidebar.buySignal; oscBuy++; }
      else if (aoVal < 0) { sig = t.rightSidebar.sellSignal; oscSell++; }
      else { oscNeutral++; }
      oscItems.push({ name: 'Awesome Osc', value: aoVal, signal: sig });
    }

    // Overall Consensus
    const totalBuy = maBuy + oscBuy;
    const totalSell = maSell + oscSell;
    const totalSignals = totalBuy + totalSell + maNeutral + oscNeutral || 1;

    let summary: string = t.rightSidebar.neutralSignal;
    if (totalBuy >= totalSell + 4) summary = t.rightSidebar.strongBuy;
    else if (totalBuy > totalSell) summary = t.rightSidebar.buySignal;
    else if (totalSell >= totalBuy + 4) summary = t.rightSidebar.strongSell;
    else if (totalSell > totalBuy) summary = t.rightSidebar.sellSignal;
    else summary = t.rightSidebar.neutralSignal;

    // Gauge Score (0 - 100)
    const score = Math.min(100, Math.max(0, Math.round(((totalBuy - totalSell) / totalSignals) * 50 + 50)));

    return {
      summary,
      score,
      ma: { buy: maBuy, sell: maSell, neutral: maNeutral, items: maItems },
      osc: { buy: oscBuy, sell: oscSell, neutral: oscNeutral, items: oscItems },
    };
  }, [candles, activeTab, t]);


  return (
    <aside 
      style={{ width: `${sidebarWidth}px`, minWidth: '220px', maxWidth: '800px' }}
      className="relative bg-tv-surface border-l border-tv-border flex flex-col h-full select-none text-xs text-tv-text z-20 flex-shrink-0"
    >
      {/* Resizer Handle on Left Edge for Mouse Dragging */}
      <div
        onMouseDown={handleStartResize}
        onDoubleClick={() => {
          setSidebarWidth(288);
          try { localStorage.setItem('openchart_right_sidebar_width', '288'); } catch (_) {}
        }}
        className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-tv-blue/70 active:bg-tv-blue transition-colors z-30 select-none flex items-center justify-center group"
        title={t.subPane.resizeTooltip}
      >
        <div className="w-0.5 h-8 bg-tv-border/80 group-hover:bg-tv-blue rounded-full transition-colors" />
      </div>

      {/* Fullscreen transparent backdrop while dragging to prevent pointer event dropping */}
      {isResizing && (
        <div className="fixed inset-0 cursor-ew-resize z-50 select-none bg-transparent" />
      )}
      {/* Tab Navigation Icons / Pills */}
      <div className="h-10 border-b border-tv-border flex items-center justify-between px-2 bg-tv-bg">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'watchlist' ? 'bg-tv-hover text-tv-blue' : 'text-tv-muted hover:text-tv-text'
            }`}
            title={t.rightSidebar.watchlistTab}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`p-1.5 rounded transition-colors relative ${
              activeTab === 'alerts' ? 'bg-tv-hover text-tv-blue' : 'text-tv-muted hover:text-tv-text'
            }`}
            title={t.rightSidebar.alertsTab}
          >
            <Bell className="w-4 h-4" />
            {alerts.filter(a => !a.triggered).length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-tv-blue text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                {alerts.filter(a => !a.triggered).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('dataWindow')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'dataWindow' ? 'bg-tv-hover text-tv-blue' : 'text-tv-muted hover:text-tv-text'
            }`}
            title={t.rightSidebar.dataWindowTab}
          >
            <TableProperties className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'technical' ? 'bg-tv-hover text-tv-blue' : 'text-tv-muted hover:text-tv-text'
            }`}
            title={t.rightSidebar.technicalTab}
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('depth')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'depth' ? 'bg-tv-hover text-tv-blue' : 'text-tv-muted hover:text-tv-text'
            }`}
            title={t.rightSidebar.depthTab}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'news' ? 'bg-tv-hover text-tv-blue' : 'text-tv-muted hover:text-tv-text'
            }`}
            title={t.rightSidebar.newsCalendarTab}
          >
            <Newspaper className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('objects')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'objects' ? 'bg-tv-hover text-tv-blue' : 'text-tv-muted hover:text-tv-text'
            }`}
            title={t.rightSidebar.objectTreeTab}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-tv-text"
          title={t.common.close}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* TAB 1: WATCHLIST */}
        {activeTab === 'watchlist' && (
          <div className="flex flex-col h-full select-none">
            {/* Watchlist Header Toolbar */}
            <div className="p-2 border-b border-tv-border flex items-center justify-between bg-tv-panel">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-bold text-tv-muted uppercase tracking-wider">
                  {t.rightSidebar.watchlistTab} ({watchlist.filter(w => !w.isSectionHeader).length})
                </span>
              </div>

              <div className="flex items-center space-x-1">
                {/* + Sembol Ekle Button (Modal trigger) */}
                <button
                  onClick={() => {
                    if (onOpenAddSymbolModal) {
                      onOpenAddSymbolModal();
                    } else {
                      setIsAdding(!isAdding);
                    }
                  }}
                  className="px-2 py-1 bg-tv-blue hover:bg-tv-blue-hover text-white rounded text-[11px] font-medium flex items-center space-x-1 transition-colors shadow-sm"
                  title={t.rightSidebar.addSymbol}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.rightSidebar.addSymbol}</span>
                </button>

                {/* Bölüm Ekle */}
                {onUpdateWatchlist && (
                  <button
                    onClick={() => {
                      setIsAddingSection(!isAddingSection);
                      setIsAdding(false);
                    }}
                    className={`p-1 rounded hover:bg-tv-hover transition-colors ${
                      isAddingSection ? 'text-tv-blue bg-tv-hover' : 'text-tv-muted hover:text-tv-text'
                    }`}
                    title={t.common.custom}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Liste İçi Arama Toggle */}
                <button
                  onClick={() => {
                    setShowSearchInput(!showSearchInput);
                    if (showSearchInput) setWatchlistSearch('');
                  }}
                  className={`p-1 rounded hover:bg-tv-hover transition-colors ${
                    showSearchInput || watchlistSearch ? 'text-tv-blue bg-tv-hover' : 'text-tv-muted hover:text-tv-text'
                  }`}
                  title={t.common.search}
                >
                  <Search className="w-3.5 h-3.5" />
                </button>

                {/* Sıralama Menüsü */}
                <div className="relative">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className={`p-1 rounded hover:bg-tv-hover transition-colors ${
                      sortMode !== 'default' ? 'text-tv-blue bg-tv-hover' : 'text-tv-muted hover:text-tv-text'
                    }`}
                    title={t.common.type}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>

                  {showSortDropdown && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-tv-card border border-tv-border rounded shadow-xl py-1 z-50 text-xs">
                      <button
                        onClick={() => { setSortMode('default'); setShowSortDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-tv-hover flex items-center justify-between ${
                          sortMode === 'default' ? 'text-tv-blue font-bold' : 'text-tv-text'
                        }`}
                      >
                        <span>{t.common.reset}</span>
                        {sortMode === 'default' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { setSortMode('symbol-asc'); setShowSortDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-tv-hover flex items-center justify-between ${
                          sortMode === 'symbol-asc' ? 'text-tv-blue font-bold' : 'text-tv-text'
                        }`}
                      >
                        <span>{t.rightSidebar.symbol} (A - Z)</span>
                        {sortMode === 'symbol-asc' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { setSortMode('symbol-desc'); setShowSortDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-tv-hover flex items-center justify-between ${
                          sortMode === 'symbol-desc' ? 'text-tv-blue font-bold' : 'text-tv-text'
                        }`}
                      >
                        <span>{t.rightSidebar.symbol} (Z - A)</span>
                        {sortMode === 'symbol-desc' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { setSortMode('change-desc'); setShowSortDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-tv-hover flex items-center justify-between ${
                          sortMode === 'change-desc' ? 'text-tv-blue font-bold' : 'text-tv-text'
                        }`}
                      >
                        <span>{t.rightSidebar.changePct} (↓)</span>
                        {sortMode === 'change-desc' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { setSortMode('change-asc'); setShowSortDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-tv-hover flex items-center justify-between ${
                          sortMode === 'change-asc' ? 'text-tv-blue font-bold' : 'text-tv-text'
                        }`}
                      >
                        <span>{t.rightSidebar.changePct} (↑)</span>
                        {sortMode === 'change-asc' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { setSortMode('price-desc'); setShowSortDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-tv-hover flex items-center justify-between ${
                          sortMode === 'price-desc' ? 'text-tv-blue font-bold' : 'text-tv-text'
                        }`}
                      >
                        <span>{t.rightSidebar.lastPrice} (↓)</span>
                        {sortMode === 'price-desc' && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* In-list Search Filter Bar */}
            {showSearchInput && (
              <div className="p-2 border-b border-tv-border bg-tv-bg flex items-center space-x-1.5 animate-fadeIn">
                <Search className="w-3.5 h-3.5 text-tv-muted flex-shrink-0" />
                <input
                  type="text"
                  placeholder={t.common.search}
                  value={watchlistSearch}
                  onChange={(e) => setWatchlistSearch(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white placeholder-tv-muted focus:outline-none"
                  autoFocus
                />
                {watchlistSearch && (
                  <button onClick={() => setWatchlistSearch('')} className="text-tv-muted hover:text-white p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Add Section Form */}
            {isAddingSection && (
              <form onSubmit={handleAddSection} className="p-2 border-b border-tv-border bg-tv-card flex gap-1">
                <input
                  type="text"
                  placeholder={t.common.custom}
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="flex-1 bg-tv-bg border border-tv-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-tv-blue"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-tv-blue text-white px-2.5 py-1 rounded text-xs hover:bg-tv-blue-hover font-medium"
                >
                  {t.common.apply}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSection(false)}
                  className="px-2 py-1 rounded text-xs text-tv-muted hover:text-white"
                >
                  {t.common.cancel}
                </button>
              </form>
            )}

            {/* Fallback Inline Add Form */}
            {isAdding && (
              <form onSubmit={handleAddSubmit} className="p-2 border-b border-tv-border bg-tv-card flex gap-1">
                <input
                  type="text"
                  placeholder="SOLUSDT..."
                  value={newSymbolInput}
                  onChange={(e) => setNewSymbolInput(e.target.value)}
                  className="flex-1 bg-tv-bg border border-tv-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-tv-blue uppercase"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-tv-blue text-white px-2 py-1 rounded text-xs hover:bg-tv-blue-hover"
                >
                  {t.common.apply}
                </button>
              </form>
            )}

            {/* Watchlist Table Headers */}
            <div className="grid grid-cols-12 px-2.5 py-1 text-[10px] text-tv-muted font-semibold uppercase tracking-wider bg-tv-bg/50 border-b border-tv-border/50">
              <span className="col-span-7">{t.rightSidebar.symbol}</span>
              <span className="col-span-3 text-right">{t.rightSidebar.lastPrice}</span>
              <span className="col-span-2 text-right">{t.rightSidebar.changePct}</span>
            </div>

            {/* Items List */}
            <div className="divide-y divide-tv-border/30 flex-1 overflow-y-auto">
              {processedWatchlist.length === 0 ? (
                <div className="p-6 text-center text-tv-muted space-y-2">
                  <p className="text-xs">
                    {t.rightSidebar.noWatchlist}
                  </p>
                  <button
                    onClick={() => {
                      if (onOpenAddSymbolModal) onOpenAddSymbolModal();
                      else setIsAdding(true);
                    }}
                    className="text-xs text-tv-blue hover:underline inline-flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t.rightSidebar.addSymbol}</span>
                  </button>
                </div>
              ) : (
                processedWatchlist.map((item) => {
                  // Render Section Header
                  if (item.isSectionHeader) {
                    return (
                      <div
                        key={item.symbol}
                        data-section-header="true"
                        className="bg-tv-card/90 px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-tv-text tracking-wide border-y border-tv-border/80 group"
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-tv-blue"></span>
                          <span>{item.sectionTitle || item.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveWatchlistSymbol(item.symbol);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-tv-muted hover:text-tv-red p-0.5 rounded transition-opacity"
                          title={t.common.delete}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }

                  const isSelected = item.symbol === currentSymbol;
                  const isPositive = (item.change24h || 0) >= 0;
                  const flagColor = item.flagColor;

                  return (
                    <div
                      key={item.symbol}
                      onClick={() => onSelectSymbol(item.symbol)}
                      className={`grid grid-cols-12 px-2.5 py-2 items-center cursor-pointer group transition-colors ${
                        isSelected ? 'bg-tv-hover border-l-2 border-tv-blue' : 'hover:bg-tv-hover/50'
                      }`}
                    >
                      {/* Left: Flag + Symbol + Name */}
                      <div className="col-span-7 flex items-center space-x-1.5 min-w-0 pr-1">
                        {/* Colored Flag Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCycleFlag(item.symbol, item.flagColor);
                          }}
                          className="p-0.5 rounded hover:bg-tv-border/60 transition-colors flex-shrink-0"
                          title={t.rightSidebar.flagColor}
                        >
                          <Flag
                            className="w-3 h-3"
                            fill={flagColor || 'transparent'}
                            stroke={flagColor || 'currentColor'}
                            style={{ color: flagColor || '#787b86' }}
                          />
                        </button>

                        <div className="truncate min-w-0">
                          <div className="font-bold text-white flex items-center space-x-1 text-xs">
                            <span className="truncate">{item.symbol}</span>
                            {item.exchange && (
                              <span className="text-[9px] text-tv-muted px-1 py-0 bg-tv-card rounded border border-tv-border/80 font-normal">
                                {item.exchange}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-tv-muted truncate">
                            {item.name || item.symbol}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Price */}
                      <div className="col-span-3 text-right font-mono text-xs font-medium text-white truncate">
                        ${formatPrice(item.price)}
                      </div>

                      {/* Right: % Change & Action */}
                      <div className="col-span-2 flex items-center justify-end relative">
                        <div
                          className={`font-mono text-[10px] font-semibold text-right group-hover:opacity-0 transition-opacity ${
                            isPositive ? 'text-tv-green' : 'text-tv-red'
                          }`}
                        >
                          {isPositive ? '+' : ''}{(item.change24h || 0).toFixed(2)}%
                        </div>

                        {/* Delete button appears on hover over row */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveWatchlistSymbol(item.symbol);
                          }}
                          className="absolute right-0 opacity-0 group-hover:opacity-100 p-1 hover:text-tv-red transition-opacity text-tv-muted"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TECHNICAL ANALYSIS GAUGE */}
        {activeTab === 'technical' && (
          <div className="p-3 space-y-4">
            <div className="border-b border-tv-border pb-2">
              <span className="text-[11px] font-bold text-tv-muted uppercase tracking-wider">
                {currentSymbol} {t.rightSidebar.technicalTab}
              </span>
            </div>

            {/* Gauge Dial / Bar Meter */}
            <div className="bg-tv-card p-3 rounded border border-tv-border flex flex-col items-center">
              <span className="text-[10px] text-tv-muted uppercase font-bold tracking-wider mb-1">
                {t.rightSidebar.summary}
              </span>
              <div className={`text-base font-bold ${
                technicalAnalysis.summary === t.rightSidebar.buySignal || technicalAnalysis.summary === t.rightSidebar.strongBuy ? 'text-tv-green' :
                technicalAnalysis.summary === t.rightSidebar.sellSignal || technicalAnalysis.summary === t.rightSidebar.strongSell ? 'text-tv-red' : 'text-tv-blue'
              }`}>
                {technicalAnalysis.summary}
              </div>

              {/* Progress Bar Dial */}
              <div className="w-full mt-3">
                <div className="h-2 rounded-full w-full bg-gradient-to-r from-red-500 via-yellow-500 via-blue-500 to-green-500 relative">
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-tv-bg rounded-full shadow-md transition-all duration-300"
                    style={{ left: `calc(${technicalAnalysis.score}% - 7px)` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-tv-muted mt-1 font-mono">
                  <span>{t.rightSidebar.strongSell}</span>
                  <span>{t.rightSidebar.neutralSignal}</span>
                  <span>{t.rightSidebar.strongBuy}</span>
                </div>
              </div>

              {/* Counts Summary */}
              <div className="grid grid-cols-3 gap-2 w-full mt-3 pt-2 border-t border-tv-border/60 text-center">
                <div className="bg-tv-bg/50 p-1 rounded">
                  <div className="text-tv-red font-bold text-sm font-mono">
                    {technicalAnalysis.ma.sell + technicalAnalysis.osc.sell}
                  </div>
                  <div className="text-[9px] text-tv-muted">{t.rightSidebar.sellSignal}</div>
                </div>
                <div className="bg-tv-bg/50 p-1 rounded">
                  <div className="text-tv-muted font-bold text-sm font-mono">
                    {technicalAnalysis.ma.neutral + technicalAnalysis.osc.neutral}
                  </div>
                  <div className="text-[9px] text-tv-muted">{t.rightSidebar.neutralSignal}</div>
                </div>
                <div className="bg-tv-bg/50 p-1 rounded">
                  <div className="text-tv-green font-bold text-sm font-mono">
                    {technicalAnalysis.ma.buy + technicalAnalysis.osc.buy}
                  </div>
                  <div className="text-[9px] text-tv-muted">{t.rightSidebar.buySignal}</div>
                </div>
              </div>
            </div>

            {/* Oscillators Breakdown */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-tv-muted uppercase tracking-wider">
                <span>{t.rightSidebar.oscillators}</span>
                <span className="font-mono text-white">
                  {technicalAnalysis.osc.buy} {t.rightSidebar.buySignal} / {technicalAnalysis.osc.sell} {t.rightSidebar.sellSignal}
                </span>
              </div>
              <div className="bg-tv-card rounded border border-tv-border divide-y divide-tv-border/40 text-[11px]">
                {technicalAnalysis.osc.items.map((it, idx) => (
                  <div key={idx} className="p-2 flex justify-between items-center">
                    <span className="text-tv-muted font-medium">{it.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-tv-text">{it.value.toFixed(2)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        it.signal === t.rightSidebar.buySignal ? 'bg-tv-green/15 text-tv-green' :
                        it.signal === t.rightSidebar.sellSignal ? 'bg-tv-red/15 text-tv-red' : 'bg-tv-muted/15 text-tv-muted'
                      }`}>
                        {it.signal}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Moving Averages Breakdown */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-tv-muted uppercase tracking-wider">
                <span>{t.rightSidebar.movingAverages}</span>
                <span className="font-mono text-white">
                  {technicalAnalysis.ma.buy} {t.rightSidebar.buySignal} / {technicalAnalysis.ma.sell} {t.rightSidebar.sellSignal}
                </span>
              </div>
              <div className="bg-tv-card rounded border border-tv-border divide-y divide-tv-border/40 text-[11px]">
                {technicalAnalysis.ma.items.map((it, idx) => (
                  <div key={idx} className="p-2 flex justify-between items-center">
                    <span className="text-tv-muted font-medium">{it.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-tv-text">${it.value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        it.signal === t.rightSidebar.buySignal ? 'bg-tv-green/15 text-tv-green' :
                        it.signal === t.rightSidebar.sellSignal ? 'bg-tv-red/15 text-tv-red' : 'bg-tv-muted/15 text-tv-muted'
                      }`}>
                        {it.signal}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NEWS & ECONOMIC CALENDAR */}
        {activeTab === 'news' && (
          <div className="p-3 space-y-3">
            {/* Top Toolbar: Sub-tab switch & Refresh */}
            <div className="flex items-center justify-between border-b border-tv-border pb-2.5">
              <div className="flex items-center space-x-1 bg-tv-bg p-0.5 rounded border border-tv-border">
                <button
                  onClick={() => setNewsSubTab('news')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center space-x-1 ${
                    newsSubTab === 'news' 
                      ? 'bg-tv-blue text-white shadow-sm' 
                      : 'text-tv-muted hover:text-white'
                  }`}
                >
                  <Newspaper className="w-3 h-3" />
                  <span>{t.rightSidebar.newsTitle}</span>
                </button>
                <button
                  onClick={() => setNewsSubTab('calendar')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center space-x-1 ${
                    newsSubTab === 'calendar' 
                      ? 'bg-tv-blue text-white shadow-sm' 
                      : 'text-tv-muted hover:text-white'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{t.rightSidebar.calendarTitle}</span>
                </button>
              </div>

              <div className="flex items-center space-x-1.5">
                {newsLastFetchTime && (
                  <span className="text-[9px] text-tv-muted font-mono hidden sm:inline">
                    {newsLastFetchTime}
                  </span>
                )}
                <button
                  onClick={() => loadNewsAndCalendar(true)}
                  disabled={isNewsLoading}
                  className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isNewsLoading ? 'animate-spin text-tv-blue' : ''}`} />
                </button>
              </div>
            </div>

            {/* Sub-Filters */}
            {newsSubTab === 'news' ? (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[10px] font-bold text-tv-muted uppercase tracking-wider">
                  {t.rightSidebar.newsTitle} ({filteredNews.length})
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setNewsFilter('all')}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      newsFilter === 'all' 
                        ? 'bg-tv-hover text-white font-bold border border-tv-border' 
                        : 'text-tv-muted hover:text-white'
                    }`}
                  >
                    {t.common.all}
                  </button>
                  <button
                    onClick={() => setNewsFilter('symbol')}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      newsFilter === 'symbol' 
                        ? 'bg-tv-hover text-tv-blue font-bold border border-tv-blue/40' 
                        : 'text-tv-muted hover:text-white'
                    }`}
                  >
                    {currentSymbol.replace(/USDT|USD|BUSD/i, '')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[10px] font-bold text-tv-muted uppercase tracking-wider">
                  {t.rightSidebar.calendarTitle} ({filteredEvents.length})
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCalendarImpactFilter('all')}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      calendarImpactFilter === 'all' 
                        ? 'bg-tv-hover text-white font-bold border border-tv-border' 
                        : 'text-tv-muted hover:text-white'
                    }`}
                  >
                    {t.common.all}
                  </button>
                  <button
                    onClick={() => setCalendarImpactFilter('high')}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors flex items-center space-x-1 ${
                      calendarImpactFilter === 'high' 
                        ? 'bg-tv-red/20 text-tv-red font-bold border border-tv-red/40' 
                        : 'text-tv-muted hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-tv-red" />
                    <span>{t.rightSidebar.highImpact}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isNewsLoading && newsItems.length === 0 && (
              <div className="py-8 text-center text-tv-muted space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-tv-blue mx-auto" />
                <p className="text-xs">{t.common.loading}</p>
              </div>
            )}

            {/* TAB: NEWS FEED */}
            {newsSubTab === 'news' && (
              <div className="space-y-2.5">
                {filteredNews.length === 0 && !isNewsLoading ? (
                  <div className="py-8 text-center text-tv-muted">
                    <p className="text-xs">{t.rightSidebar.noNews}</p>
                    <button
                      onClick={() => setNewsFilter('all')}
                      className="mt-2 text-[11px] text-tv-blue underline hover:text-tv-blue-hover"
                    >
                      {t.rightSidebar.allNews}
                    </button>
                  </div>
                ) : (
                  filteredNews.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => window.open(n.url, '_blank', 'noopener,noreferrer')}
                      className="p-2.5 bg-tv-card border border-tv-border rounded hover:border-tv-blue/70 hover:bg-tv-hover/40 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[10px] text-tv-muted mb-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-tv-blue">{n.source}</span>
                          <span>•</span>
                          <span>{n.time}</span>
                        </div>
                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-tv-muted group-hover:text-white transition-opacity" />
                      </div>
                      
                      <h4 className="text-xs font-medium text-white group-hover:text-tv-blue transition-colors leading-snug">
                        {n.title}
                      </h4>

                      {n.description && n.description !== n.title && (
                        <p className="text-[10px] text-tv-muted mt-1 line-clamp-2 leading-relaxed">
                          {n.description}
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[9px] bg-tv-bg px-1.5 py-0.5 rounded text-tv-muted border border-tv-border">
                          {n.tag}
                        </span>

                        <div className="flex items-center space-x-1">
                          {n.sentiment === 'positive' && (
                            <span className="text-[9px] text-tv-green font-medium flex items-center space-x-0.5">
                              <TrendingUp className="w-2.5 h-2.5" />
                              <span>{t.rightSidebar.buySignal}</span>
                            </span>
                          )}
                          {n.sentiment === 'negative' && (
                            <span className="text-[9px] text-tv-red font-medium flex items-center space-x-0.5">
                              <TrendingDown className="w-2.5 h-2.5" />
                              <span>{t.rightSidebar.sellSignal}</span>
                            </span>
                          )}
                          {n.sentiment === 'neutral' && (
                            <span className="text-[9px] text-tv-muted font-medium flex items-center space-x-0.5">
                              <Minus className="w-2.5 h-2.5" />
                              <span>{t.rightSidebar.neutralSignal}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: ECONOMIC CALENDAR */}
            {newsSubTab === 'calendar' && (
              <div className="space-y-2">
                {filteredEvents.length === 0 && !isNewsLoading ? (
                  <div className="py-8 text-center text-tv-muted">
                    <p className="text-xs">{t.rightSidebar.noNews}</p>
                    <button
                      onClick={() => setCalendarImpactFilter('all')}
                      className="mt-2 text-[11px] text-tv-blue underline hover:text-tv-blue-hover"
                    >
                      {t.rightSidebar.allNews}
                    </button>
                  </div>
                ) : (
                  filteredEvents.slice(0, 30).map((ev) => (
                    <div 
                      key={ev.id}
                      onClick={() => ev.url && window.open(ev.url, '_blank', 'noopener,noreferrer')}
                      className={`p-2.5 bg-tv-card border border-tv-border rounded transition-all group ${
                        ev.url ? 'hover:border-tv-blue/70 hover:bg-tv-hover/40 cursor-pointer' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold font-mono px-1 py-0.2 rounded bg-tv-bg text-white border border-tv-border text-[9px]">
                            {ev.currency}
                          </span>
                          <span className="text-tv-muted">
                            {ev.formattedDate} • {ev.formattedTime}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                            ev.impact === 'High' 
                              ? 'bg-tv-red/15 text-tv-red border-tv-red/30' 
                              : ev.impact === 'Medium'
                              ? 'bg-orange-500/15 text-[#ff9800] border-orange-500/30'
                              : 'bg-tv-bg text-tv-muted border-tv-border'
                          }`}>
                            {ev.impact === 'High' ? t.rightSidebar.highImpact : ev.impact === 'Medium' ? t.rightSidebar.mediumImpact : t.rightSidebar.lowImpact}
                          </span>
                          {ev.url && (
                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-tv-muted transition-opacity" />
                          )}
                        </div>
                      </div>

                      <h4 className="text-xs font-medium text-white group-hover:text-tv-blue transition-colors mt-1.5 leading-snug">
                        {ev.name}
                      </h4>

                      <div className="mt-2 grid grid-cols-3 gap-1 bg-tv-bg/70 p-1.5 rounded border border-tv-border/50 text-center font-mono text-[9px]">
                        <div>
                          <span className="text-tv-muted block font-sans text-[8px]">{t.rightSidebar.forecast}</span>
                          <span className="font-bold text-white">{ev.forecast || '-'}</span>
                        </div>
                        <div>
                          <span className="text-tv-muted block font-sans text-[8px]">{t.rightSidebar.previous}</span>
                          <span className="text-tv-muted">{ev.previous || '-'}</span>
                        </div>
                        <div>
                          <span className="text-tv-muted block font-sans text-[8px]">{t.rightSidebar.actual}</span>
                          <span className={ev.actual ? 'font-bold text-tv-green' : 'text-tv-muted'}>
                            {ev.actual || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ALERTS */}
        {activeTab === 'alerts' && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-tv-border pb-2">
              <span className="text-[11px] font-bold text-tv-muted uppercase tracking-wider">
                {t.rightSidebar.priceAlerts} ({alerts.length})
              </span>
              <button
                onClick={onOpenCreateAlert}
                className="px-2 py-1 bg-tv-blue text-white rounded text-[11px] hover:bg-tv-blue-hover flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>{t.rightSidebar.createAlert}</span>
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-8 text-tv-muted">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>{t.rightSidebar.noAlertsDesc}</p>
                <p className="text-[10px] mt-1">{t.rightSidebar.alertAudioDesc}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-2.5 rounded border ${
                      alert.triggered 
                        ? 'bg-tv-card/40 border-tv-border/40 opacity-60' 
                        : 'bg-tv-card border-tv-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{alert.symbol}</span>
                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="text-tv-muted hover:text-tv-red p-1"
                        title={t.rightSidebar.deleteAlert}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-tv-muted">
                        {alert.condition === 'cross_up' && t.rightSidebar.crossingUp}
                        {alert.condition === 'cross_down' && t.rightSidebar.crossingDown}
                        {alert.condition === 'crossing' && t.rightSidebar.crossingPrice}
                      </span>
                      <span className="font-mono font-bold text-white">
                        ${alert.targetPrice.toLocaleString()}
                      </span>
                    </div>

                    {alert.note && (
                      <div className="text-[10px] text-tv-blue mt-1 bg-tv-bg/60 p-1 rounded">
                        {alert.note}
                      </div>
                    )}

                    <div className="mt-2 text-[9px] text-tv-muted flex items-center justify-between">
                      <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
                      <span className={alert.triggered ? 'text-tv-yellow' : 'text-tv-green'}>
                        {alert.triggered ? t.rightSidebar.triggered : t.rightSidebar.activeWaiting}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DATA WINDOW (VERİ PENCERESİ) */}
        {activeTab === 'dataWindow' && (() => {
          const activeCandle = hoverCandle || (candles.length > 0 ? candles[candles.length - 1] : null);
          if (!activeCandle) {
            return (
              <div className="p-6 text-center text-tv-muted">
                <TableProperties className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>{t.rightSidebar.noCandleData}</p>
              </div>
            );
          }

          const diff = activeCandle.close - activeCandle.open;
          const pct = activeCandle.open > 0 ? (diff / activeCandle.open) * 100 : 0;
          const isUp = diff >= 0;
          const colorClass = isUp ? 'text-tv-green' : 'text-tv-red';
          const sign = isUp ? '+' : '';
          const barRange = activeCandle.high - activeCandle.low;

          return (
            <div className="flex flex-col h-full divide-y divide-tv-border/50">
              {/* Header Info */}
              <div className="p-3 bg-tv-card/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{currentSymbol}</span>
                  <span className="bg-tv-blue/20 text-tv-blue border border-tv-blue/40 px-1.5 py-0.2 rounded font-mono text-[10px] font-bold">
                    {timeframe}
                  </span>
                </div>
                <div className="text-[11px] text-tv-muted flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-tv-muted" />
                  <span>{new Date(activeCandle.time * 1000).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                </div>
              </div>

              {/* OHLCV Metrics */}
              <div className="p-3 space-y-2">
                <div className="text-[10px] font-bold text-tv-muted uppercase tracking-wider">
                  {t.rightSidebar.barValues}
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="bg-tv-bg p-2 rounded border border-tv-border/40">
                    <span className="text-[10px] text-tv-muted block font-sans">{t.rightSidebar.openPrice}</span>
                    <span className="font-bold text-white">${activeCandle.open.toFixed(2)}</span>
                  </div>
                  <div className="bg-tv-bg p-2 rounded border border-tv-border/40">
                    <span className="text-[10px] text-tv-muted block font-sans">{t.rightSidebar.closePrice}</span>
                    <span className={`font-bold ${colorClass}`}>${activeCandle.close.toFixed(2)}</span>
                  </div>
                  <div className="bg-tv-bg p-2 rounded border border-tv-border/40">
                    <span className="text-[10px] text-tv-muted block font-sans">{t.rightSidebar.highPrice}</span>
                    <span className="font-bold text-tv-green">${activeCandle.high.toFixed(2)}</span>
                  </div>
                  <div className="bg-tv-bg p-2 rounded border border-tv-border/40">
                    <span className="text-[10px] text-tv-muted block font-sans">{t.rightSidebar.lowPrice}</span>
                    <span className="font-bold text-tv-red">${activeCandle.low.toFixed(2)}</span>
                  </div>
                  <div className="bg-tv-bg p-2 rounded border border-tv-border/40">
                    <span className="text-[10px] text-tv-muted block font-sans">{t.rightSidebar.pnlChange}</span>
                    <span className={`font-bold ${colorClass}`}>{sign}{diff.toFixed(2)} ({sign}{pct.toFixed(2)}%)</span>
                  </div>
                  <div className="bg-tv-bg p-2 rounded border border-tv-border/40">
                    <span className="text-[10px] text-tv-muted block font-sans">{t.rightSidebar.volume}</span>
                    <span className="font-bold text-white">{activeCandle.volume.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-tv-bg p-2 rounded border border-tv-border/40 flex justify-between items-center text-[11px] font-mono">
                  <span className="text-tv-muted font-sans">{t.rightSidebar.barRange}:</span>
                  <span className="text-white font-bold">${barRange.toFixed(2)}</span>
                </div>
              </div>

              {/* Active Indicators */}
              <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                <div className="text-[10px] font-bold text-tv-muted uppercase tracking-wider flex items-center justify-between">
                  <span>{t.rightSidebar.activeIndicators} ({indicators.length})</span>
                  <span className="text-[9px] text-tv-muted font-normal">{t.rightSidebar.liveValues}</span>
                </div>

                {indicators.length === 0 ? (
                  <div className="text-[11px] text-tv-muted text-center py-4">
                    {t.rightSidebar.noIndicators}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {indicators.map(ind => {
                      const color = Object.values(ind.styles)[0]?.color || '#2962ff';
                      return (
                        <div key={ind.id} className="bg-tv-bg p-2 rounded border border-tv-border/40 space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="font-semibold text-white text-[11px]">{ind.name}</span>
                          </div>
                          <div className="flex items-center justify-between font-mono text-[11px] pt-0.5">
                            <span className="text-[10px] text-tv-muted">{ind.pane === 'overlay' ? t.rightSidebar.overlay : t.rightSidebar.subPanel}</span>
                            <span className="text-tv-blue font-bold">
                              {ind.visible ? t.rightSidebar.calculatedActive : t.rightSidebar.hidden}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 5: OBJECT TREE */}
        {activeTab === 'objects' && (
          <div className="p-3 space-y-4">
            <div className="border-b border-tv-border pb-2">
              <span className="text-[11px] font-bold text-tv-muted uppercase tracking-wider">
                {t.rightSidebar.objectTreeLayers}
              </span>
            </div>

            {/* Active Indicators */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-tv-muted uppercase tracking-wider">
                {t.rightSidebar.indicatorsHeader} ({indicators.length})
              </div>
              {indicators.length === 0 ? (
                <div className="text-tv-muted text-[11px] italic">{t.rightSidebar.noIndicators}</div>
              ) : (
                <div className="space-y-1">
                  {indicators.map((ind) => (
                    <div key={ind.id} className="p-2 bg-tv-card border border-tv-border rounded flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: Object.values(ind.styles)[0]?.color || '#2962ff' }} />
                        <span className="font-medium text-white">{ind.name}</span>
                        <span className="text-[9px] text-tv-muted">({ind.pane})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onToggleIndicatorVisibility(ind.id)}
                          className="p-1 hover:text-white text-tv-muted"
                          title={ind.visible ? t.rightSidebar.hide : t.rightSidebar.show}
                        >
                          {ind.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-tv-red" />}
                        </button>
                        <button
                          onClick={() => onDeleteIndicator(ind.id)}
                          className="p-1 hover:text-tv-red text-tv-muted"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Drawings */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-tv-muted uppercase tracking-wider">
                {t.rightSidebar.drawingsHeader} ({drawings.length})
              </div>
              {drawings.length === 0 ? (
                <div className="text-tv-muted text-[11px] italic">{t.rightSidebar.noDrawings}</div>
              ) : (
                <div className="space-y-1">
                  {drawings.map((draw) => (
                    <div key={draw.id} className="p-2 bg-tv-card border border-tv-border rounded flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: draw.color }} />
                        <span className="font-medium text-white capitalize">{draw.type}</span>
                        {draw.text && <span className="text-[9px] text-tv-muted truncate max-w-[80px]">"{draw.text}"</span>}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onToggleDrawingVisibility(draw.id)}
                          className="p-1 hover:text-white text-tv-muted"
                          title={draw.visible !== false ? t.rightSidebar.hide : t.rightSidebar.show}
                        >
                          {draw.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-tv-red" />}
                        </button>
                        <button
                          onClick={() => onDeleteDrawing(draw.id)}
                          className="p-1 hover:text-tv-red text-tv-muted"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: DEPTH OF MARKET (DOM) & ORDERBOOK */}
        {activeTab === 'depth' && (
          <div className="p-3 space-y-3">
            <div className="border-b border-tv-border pb-2 flex justify-between items-center">
              <span className="text-[11px] font-bold text-tv-muted uppercase tracking-wider">
                {currentSymbol} {t.rightSidebar.depthOrderBook}
              </span>
              <span className="text-[10px] text-tv-green font-mono">{t.rightSidebar.liveLevel2}</span>
            </div>

            {/* Asks (Sell orders - red) */}
            <div className="space-y-1">
              {[
                { p: 1.002, q: 3.45, pct: 75 },
                { p: 1.0015, q: 2.12, pct: 45 },
                { p: 1.001, q: 4.80, pct: 85 },
                { p: 1.0005, q: 1.89, pct: 35 },
              ].map((item, i) => {
                const currentItem = watchlist.find(w => w.symbol === currentSymbol);
                const baseP = currentItem?.price || 100;
                const price = (baseP * item.p).toFixed(2);
                return (
                  <div key={i} className="relative flex justify-between font-mono text-[11px] py-0.5 px-1 rounded overflow-hidden">
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-tv-red/15 z-0" 
                      style={{ width: `${item.pct}%` }} 
                    />
                    <span className="text-tv-red font-medium z-10">{price}</span>
                    <span className="text-tv-text z-10">{item.q.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Spread Divider */}
            {(() => {
              const currentItem = watchlist.find(w => w.symbol === currentSymbol);
              const price = currentItem?.price || 100;
              return (
                <div className="py-2 px-1 border-y border-tv-border/80 flex items-center justify-between font-mono bg-tv-card rounded">
                  <span className="text-base font-bold text-white">${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-tv-muted">{t.rightSidebar.spread}: ~0.01%</span>
                </div>
              );
            })()}

            {/* Bids (Buy orders - green) */}
            <div className="space-y-1">
              {[
                { p: 0.9995, q: 2.34, pct: 40 },
                { p: 0.999, q: 5.12, pct: 90 },
                { p: 0.9985, q: 3.88, pct: 65 },
                { p: 0.998, q: 1.45, pct: 25 },
              ].map((item, i) => {
                const currentItem = watchlist.find(w => w.symbol === currentSymbol);
                const baseP = currentItem?.price || 100;
                const price = (baseP * item.p).toFixed(2);
                return (
                  <div key={i} className="relative flex justify-between font-mono text-[11px] py-0.5 px-1 rounded overflow-hidden">
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-tv-green/15 z-0" 
                      style={{ width: `${item.pct}%` }} 
                    />
                    <span className="text-tv-green font-medium z-10">{price}</span>
                    <span className="text-tv-text z-10">{item.q.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* 24h Stats */}
            {(() => {
              const item = watchlist.find(w => w.symbol === currentSymbol);
              if (!item) return null;
              return (
                <div className="border-t border-tv-border pt-2 space-y-1.5 text-[11px]">
                  <div className="text-[10px] font-bold text-tv-muted uppercase tracking-wider">
                    {t.rightSidebar.stats24h}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tv-muted">{t.rightSidebar.high24h}</span>
                    <span className="font-mono text-white">${item.high24h.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tv-muted">{t.rightSidebar.low24h}</span>
                    <span className="font-mono text-white">${item.low24h.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tv-muted">{t.rightSidebar.volume24h}</span>
                    <span className="font-mono text-white">{item.volume24h.toLocaleString()} {currentSymbol.replace('USDT', '')}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </aside>
  );
});
