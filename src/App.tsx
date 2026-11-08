import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { LeftToolbar } from './components/LeftToolbar';
import { RightSidebar } from './components/RightSidebar';
import { BottomBar } from './components/BottomBar';
import { ChartPane } from './components/ChartPane';
import { ReplayToolbar } from './components/ReplayToolbar';
import { BottomDock, BottomTabType } from './components/BottomDock';

import { IndicatorsModal } from './components/modals/IndicatorsModal';
import { IndicatorSettingsModal } from './components/modals/IndicatorSettingsModal';
import { SymbolSearchModal } from './components/modals/SymbolSearchModal';
import { AlertModal } from './components/modals/AlertModal';
import { LayoutsModal } from './components/modals/LayoutsModal';
import { StrategyBacktestModal } from './components/modals/StrategyBacktestModal';
import { HotkeysModal } from './components/modals/HotkeysModal';
import { CompareModal } from './components/modals/CompareModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { ChartSettingsModal, DEFAULT_VISUAL_SETTINGS } from './components/modals/ChartSettingsModal';
import { OrderModal } from './components/modals/OrderModal';
import { FloatingFavoritesBar } from './components/FloatingFavoritesBar';
import { paperTradingService } from './services/paperTradingService';

import { 
  AppState, 
  CandleData,
  ChartPaneConfig, 
  ChartType, 
  DrawingToolType, 
  IndicatorConfig, 
  IndicatorType, 
  LayoutType, 
  PriceAlert, 
  Timeframe, 
  WatchlistItem,
  IndicatorTemplate
} from './types';
import { storageService, INITIAL_STATE, getDefaultPane } from './services/storage';
import { createDefaultIndicator } from './indicators/registry';
import { marketDataService } from './services/marketData';
import { soundService } from './services/sound';
import { executePineScript } from './services/pineEngine';
import { executePythonScript } from './services/pythonEngine';
import { findCandleByTime } from './indicators/math';
import { BellRing, X } from 'lucide-react';
import { useTranslation } from './i18n';

export const App: React.FC = () => {
  const { t } = useTranslation();
  // Global State
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Active Tool & UI States
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolType>('crosshair');
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'simulated'>('connected');
  const [areDrawingsHidden, setAreDrawingsHidden] = useState(false);
  const [lockDrawings, setLockDrawings] = useState(false);
  const [stayInDrawingMode, setStayInDrawingMode] = useState(false);
  const [screenshotTrigger, setScreenshotTrigger] = useState(0);

  // Bottom Dock State (Screener, Paper Trading, Pine Editor, Strategy Tester)
  const [isBottomDockOpen, setIsBottomDockOpen] = useState(false);
  const [bottomDockTab, setBottomDockTab] = useState<BottomTabType>('paperTrading');

  // Modals State
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isSymbolSearchOpen, setIsSymbolSearchOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertInitialPrice, setAlertInitialPrice] = useState<number | undefined>(undefined);
  const [isChartSettingsOpen, setIsChartSettingsOpen] = useState(false);
  const [isLayoutsModalOpen, setIsLayoutsModalOpen] = useState(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [symbolSearchInitial, setSymbolSearchInitial] = useState('');
  const [symbolSearchMode, setSymbolSearchMode] = useState<'select' | 'watchlist'>('select');
  const [quickIntervalInput, setQuickIntervalInput] = useState<string | null>(null);

  // Paper Trading Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderModalInitialPrice, setOrderModalInitialPrice] = useState<number | undefined>(undefined);
  const [orderModalInitialSide, setOrderModalInitialSide] = useState<'long' | 'short'>('long');
  const [tradeExecutionNotification, setTradeExecutionNotification] = useState<string | null>(null);
  const [showFavoritesBar, setShowFavoritesBar] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tv_show_fav_bar') === 'true';
    } catch (_) {
      return true;
    }
  });

  // Drawing Undo / Redo stacks
  const drawingsUndoStackRef = useRef<Map<string, any[][]>>(new Map());
  const drawingsRedoStackRef = useRef<Map<string, any[][]>>(new Map());
  const [editingIndicator, setEditingIndicator] = useState<IndicatorConfig | null>(null);

  // Bar Replay State
  const [isReplayActive, setIsReplayActive] = useState(false);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replayIdx, setReplayIdx] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [isReplayJumpMode, setIsReplayJumpMode] = useState(false);
  const [activeCandlesData, setActiveCandlesData] = useState<CandleData[]>([]);

  // Crosshair Sync across panes
  const [syncedCrosshair, setSyncedCrosshair] = useState<{ time: number; sourcePaneId: string } | null>(null);
  const [activeHoverCandle, setActiveHoverCandle] = useState<CandleData | null>(null);

  // Indicator Templates
  const [templates, setTemplates] = useState<IndicatorTemplate[]>([]);

  // Paper Trading Positions
  const [paperPositions, setPaperPositions] = useState<any[]>([]);

  // Active Alert Trigger Banner
  const [activeAlertNotification, setActiveAlertNotification] = useState<PriceAlert | null>(null);

  // Debounced auto-save timer
  const saveTimeoutRef = useRef<any>(null);

  // 1. Load initial saved state from IndexedDB on startup
  useEffect(() => {
    const init = async () => {
      const saved = await storageService.loadState();
      setAppState(saved);
      setTemplates(storageService.getIndicatorTemplates());
      setIsLoaded(true);
    };
    init();
  }, []);

  // Sync Paper Trading Positions from LocalStorage
  useEffect(() => {
    const syncPositions = () => {
      try {
        const saved = localStorage.getItem('openchart_paper_account_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.positions)) {
            setPaperPositions(parsed.positions);
          }
        }
      } catch (_) {}
    };
    syncPositions();
    window.addEventListener('openchart_paper_update', syncPositions);
    const interval = setInterval(syncPositions, 2000);
    return () => {
      window.removeEventListener('openchart_paper_update', syncPositions);
      clearInterval(interval);
    };
  }, []);

  // 2. Auto-save state on changes
  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      storageService.saveState(appState);
    }, 600);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [appState, isLoaded]);

  // Active Pane Config Helper
  const activePane = appState.panes.find(p => p.id === appState.activePaneId) || appState.panes[0];

  // 3. Update an individual pane
  const updatePane = useCallback((paneId: string, updated: Partial<ChartPaneConfig>) => {
    setAppState(prev => ({
      ...prev,
      panes: prev.panes.map(p => p.id === paneId ? { ...p, ...updated } : p),
    }));
  }, []);

  // Drawing History Manager (Undo / Redo)
  const handleUpdatePaneWithHistory = useCallback((paneId: string, updated: Partial<ChartPaneConfig>) => {
    if (updated.drawings !== undefined) {
      const currentPane = appState.panes.find(p => p.id === paneId);
      if (currentPane) {
        const stack = drawingsUndoStackRef.current.get(paneId) || [];
        stack.push([...currentPane.drawings]);
        drawingsUndoStackRef.current.set(paneId, stack);
        drawingsRedoStackRef.current.set(paneId, []);
      }
    }
    updatePane(paneId, updated);
  }, [appState.panes, updatePane]);

  const handleUndo = useCallback(() => {
    if (!activePane) return;
    const undoStack = drawingsUndoStackRef.current.get(activePane.id);
    if (undoStack && undoStack.length > 0) {
      const prevDrawings = undoStack.pop()!;
      const redoStack = drawingsRedoStackRef.current.get(activePane.id) || [];
      redoStack.push([...activePane.drawings]);
      drawingsRedoStackRef.current.set(activePane.id, redoStack);
      updatePane(activePane.id, { drawings: prevDrawings });
      soundService.playClickSound();
    }
  }, [activePane, updatePane]);

  const handleRedo = useCallback(() => {
    if (!activePane) return;
    const redoStack = drawingsRedoStackRef.current.get(activePane.id);
    if (redoStack && redoStack.length > 0) {
      const nextDrawings = redoStack.pop()!;
      const undoStack = drawingsUndoStackRef.current.get(activePane.id) || [];
      undoStack.push([...activePane.drawings]);
      drawingsUndoStackRef.current.set(activePane.id, undoStack);
      updatePane(activePane.id, { drawings: nextDrawings });
      soundService.playClickSound();
    }
  }, [activePane, updatePane]);

  

  // Update Active Pane
  const updateActivePane = useCallback((updated: Partial<ChartPaneConfig>) => {
    if (!activePane) return;
    updatePane(activePane.id, updated);
  }, [activePane, updatePane]);

  // 4. Multi-chart Layout Changes
  const handleLayoutChange = (newLayout: LayoutType) => {
    let requiredCount = 1;
    if (newLayout === '1x2' || newLayout === '2x1') requiredCount = 2;
    if (newLayout === '1x3' || newLayout === '3x1' || newLayout === '1left-2right' || newLayout === '1top-2bottom') requiredCount = 3;
    if (newLayout === '2x2') requiredCount = 4;
    if (newLayout === '3x2') requiredCount = 6;

    const currentPanes = [...appState.panes];
    const defaultSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'];

    // Expand panes if needed
    while (currentPanes.length < requiredCount) {
      const idx = currentPanes.length;
      const newSymbol = defaultSymbols[idx % defaultSymbols.length];
      currentPanes.push(getDefaultPane(`pane_${Date.now()}_${idx}`, newSymbol));
    }

    // Shrink if switching to single chart or fewer
    const newPanes = currentPanes.slice(0, requiredCount);

    setAppState(prev => ({
      ...prev,
      layout: newLayout,
      panes: newPanes,
      activePaneId: newPanes[0].id,
    }));
  };

  // Indicator Templates Handlers
  const handleApplyIndicatorTemplate = (tmpl: IndicatorTemplate) => {
    if (!activePane) return;
    updateActivePane({
      indicators: tmpl.indicators.map(ind => ({
        ...ind,
        id: `ind_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      }))
    });
    soundService.playClickSound();
  };

  const handleSaveCurrentAsTemplate = () => {
    if (!activePane) return;
    const name = prompt(t.app.promptTemplateName, `${activePane.symbol} Strategy`);
    if (name && name.trim()) {
      storageService.saveIndicatorTemplate(name.trim(), activePane.indicators);
      setTemplates(storageService.getIndicatorTemplates());
      soundService.playClickSound();
      alert(`"${name.trim()}" ${t.app.templateSavedNotice}`);
    }
  };

  // 5. Watchlist Realtime Ticker Polling
  useEffect(() => {
    if (!isLoaded) return;

    const updateTickers = async () => {
      const symbols = appState.watchlist.map(w => w.symbol);
      const tickerMap = await marketDataService.fetch24hTickers(symbols);

      if (tickerMap.size > 0) {
        // Automatic Take Profit and Stop Loss evaluation across open paper positions
        const priceMap = new Map<string, number>();
        tickerMap.forEach((live, sym) => priceMap.set(sym, live.price));
        const triggeredTrades = paperTradingService.evaluateTpSl(priceMap);
        if (triggeredTrades.length > 0) {
          soundService.playAlertSound();
          const first = triggeredTrades[0];
          const reasonLabel = first.exitReason === 'take_profit' ? 'Kâr Al (TP)' : 'Zarar Durdur (SL)';
          setTradeExecutionNotification(
            `${first.symbol} ${first.side.toUpperCase()} pozisyonu ${reasonLabel} seviyesine ($${first.exitPrice.toLocaleString()}) ulaştı ve kapatıldı! Net: ${first.pnl >= 0 ? '+' : ''}$${first.pnl.toFixed(2)}`
          );
          setTimeout(() => setTradeExecutionNotification(null), 6000);
        }

        setAppState(prev => {
          let hasAnyChanges = false;
          const newWatchlist = prev.watchlist.map(item => {
            const live = tickerMap.get(item.symbol);
            if (live) {
              if (item.price !== live.price || item.change24h !== live.change24h || item.volume24h !== live.volume) {
                hasAnyChanges = true;
                return {
                  ...item,
                  price: live.price,
                  change24h: live.change24h,
                  high24h: live.high,
                  low24h: live.low,
                  volume24h: live.volume,
                };
              }
            }
            return item;
          });

          // Pure bail-out: If no tickers changed, preserve object reference and avoid re-rendering entire app!
          if (!hasAnyChanges) {
            return prev;
          }
          return {
            ...prev,
            watchlist: newWatchlist,
          };
        });
      }
    };

    updateTickers();
    const interval = setInterval(updateTickers, 4000);
    return () => clearInterval(interval);
  }, [isLoaded, appState.watchlist.length]);

  // 6. Price Alert Evaluator
  useEffect(() => {
    if (!activePane || appState.alerts.length === 0) return;

    const activeWatchItem = appState.watchlist.find(w => w.symbol === activePane.symbol);
    if (!activeWatchItem) return;

    const price = activeWatchItem.price;

    appState.alerts.forEach(alert => {
      if (alert.symbol !== activePane.symbol) return;
      if (alert.triggered && !alert.recurring) return;

      // Debounce check for recurring alerts (minimum 30 seconds between triggers)
      if (alert.recurring && alert.triggeredAt && (Date.now() - alert.triggeredAt < 30000)) {
        return;
      }

      let triggered = false;
      if (alert.condition === 'cross_up' && price >= alert.targetPrice) triggered = true;
      if (alert.condition === 'cross_down' && price <= alert.targetPrice) triggered = true;
      if (alert.condition === 'crossing' && Math.abs(price - alert.targetPrice) / (alert.targetPrice > 0 ? alert.targetPrice : 1) < 0.0005) triggered = true;

      if (triggered) {
        soundService.playAlertSound(alert.sound || 'bell');
        setActiveAlertNotification(alert);

        // Webhook Dispatcher
        if (alert.webhookUrl) {
          try {
            fetch(alert.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'PRICE_ALERT',
                alertId: alert.id,
                symbol: alert.symbol,
                condition: alert.condition,
                targetPrice: alert.targetPrice,
                triggerPrice: price,
                note: alert.note || null,
                timestamp: Date.now(),
                isoTime: new Date().toISOString(),
              }),
            }).catch(err => {
              console.warn('[Price Alert Webhook Failed]:', err);
            });
          } catch (err) {
            console.warn('[Price Alert Webhook Exception]:', err);
          }
        }

        // Update state
        setAppState(prev => ({
          ...prev,
          alerts: prev.alerts.map(a => a.id === alert.id ? { 
            ...a, 
            triggered: !alert.recurring, 
            triggeredAt: Date.now() 
          } : a)
        }));
      }
    });
  }, [appState.watchlist, appState.alerts, activePane]);

  

  // 8. Bar Replay Simulation Loop
  useEffect(() => {
    if (!isReplayActive || !isReplayPlaying || activeCandlesData.length === 0) return;

    const intervalMs = Math.max(200, 1000 / replaySpeed);
    const timer = setInterval(() => {
      setReplayIdx(prev => {
        if (prev >= activeCandlesData.length - 1) {
          setIsReplayPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isReplayActive, isReplayPlaying, replaySpeed, activeCandlesData.length]);

  const handleToggleReplay = () => {
    if (!isReplayActive) {
      setIsReplayActive(true);
      // Start replay from 50 bars ago
      setReplayIdx(Math.max(10, activeCandlesData.length - 50));
      setIsReplayPlaying(false);
    } else {
      setIsReplayActive(false);
      setIsReplayPlaying(false);
    }
  };

  // Indicators Management
  const handleAddIndicator = (type: IndicatorType) => {
    const newInd = createDefaultIndicator(type);
    updateActivePane({
      indicators: [...activePane.indicators, newInd],
    });
  };

  const appStateRef = useRef(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const activeCandlesDataRef = useRef(activeCandlesData);
  useEffect(() => {
    activeCandlesDataRef.current = activeCandlesData;
  }, [activeCandlesData]);

  // High-performance candles state synchronizer with referential stability check
  const handleCandlesUpdateForActive = useCallback((candles: CandleData[]) => {
    setActiveCandlesData(prev => {
      if (prev === candles) return prev;
      if (
        prev.length > 0 &&
        candles.length > 0 &&
        prev.length === candles.length &&
        prev[prev.length - 1].time === candles[candles.length - 1].time &&
        prev[prev.length - 1].close === candles[candles.length - 1].close
      ) {
        return prev;
      }
      return candles;
    });
  }, []);

  const handleDrawingComplete = useCallback(() => {
    if (!stayInDrawingMode) {
      setActiveDrawingTool('crosshair');
    }
  }, [stayInDrawingMode]);

  const handleActivatePane = useCallback((paneId: string) => {
    setAppState(prev => prev.activePaneId === paneId ? prev : ({ ...prev, activePaneId: paneId }));
  }, []);

  const handleOpenIndicatorSettings = useCallback((ind: IndicatorConfig) => {
    setEditingIndicator(ind);
  }, []);

  const handleOpenChartSettings = useCallback(() => {
    setIsChartSettingsOpen(true);
  }, []);

  const handleOpenCreateAlertAtPrice = useCallback((p: number) => {
    setAlertInitialPrice(p);
    setIsAlertModalOpen(true);
  }, []);

  const handleDeleteAlert = useCallback((id: string) => {
    setAppState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(a => a.id !== id)
    }));
  }, []);

  const handleUpdateAlert = useCallback((updatedAlert: PriceAlert) => {
    setAppState(prev => ({
      ...prev,
      alerts: prev.alerts.map(a => a.id === updatedAlert.id ? updatedAlert : a)
    }));
  }, []);

  const handleSelectDrawingTool = useCallback((tool: DrawingToolType) => {
    setActiveDrawingTool(tool);
  }, []);

  const lastCrosshairTimeRef = useRef<number>(0);
  const handleCrosshairMove = useCallback((paneId: string, t: number | null) => {
    if (!t) return;
    const now = performance.now();
    if (now - lastCrosshairTimeRef.current < 16) return; // 60 FPS cap
    lastCrosshairTimeRef.current = now;

    if (appStateRef.current.syncCrosshair) {
      setSyncedCrosshair({ time: t, sourcePaneId: paneId });
    }
    if (paneId === appStateRef.current.activePaneId && activeCandlesDataRef.current.length > 0) {
      setActiveHoverCandle(prev => {
        if (prev && prev.time === t) return prev;
        const matched = findCandleByTime(activeCandlesDataRef.current, t);
        return matched || null;
      });
    }
  }, []);

  const handleReplayJumpToTime = useCallback((t: number) => {
    if (activeCandlesDataRef.current.length > 0) {
      const targetIdx = activeCandlesDataRef.current.findIndex(c => c.time >= t);
      if (targetIdx !== -1) {
        setReplayIdx(targetIdx);
        setIsReplayPlaying(false);
        setIsReplayJumpMode(false);
      }
    }
  }, []);

  const handleTriggerScreenshot = useCallback(() => {
    setScreenshotTrigger(prev => prev + 1);
  }, []);

  const handleToggleLockDrawings = useCallback(() => {
    setLockDrawings(prev => !prev);
  }, []);

  const handleToggleStayInDrawingMode = useCallback(() => {
    setStayInDrawingMode(prev => !prev);
  }, []);

  const handleToggleFavoritesBar = useCallback(() => {
    setShowFavoritesBar(prev => {
      const next = !prev;
      try { localStorage.setItem('tv_show_fav_bar', String(next)); } catch (_) {}
      return next;
    });
  }, []);

  const handleToggleBottomDock = useCallback(() => {
    setIsBottomDockOpen(prev => !prev);
  }, []);

  const handleOpenBacktestModal = useCallback(() => {
    setIsBacktestOpen(true);
  }, []);

  const handleToggleWatchlistSymbol = useCallback((symbol: string, itemData?: Partial<WatchlistItem>) => {
    soundService.playClickSound();
    setAppState(prev => {
      const exists = prev.watchlist.some(w => w.symbol === symbol);
      if (exists) {
        return {
          ...prev,
          watchlist: prev.watchlist.filter(w => w.symbol !== symbol),
        };
      } else {
        const newItem: WatchlistItem = {
          symbol,
          name: itemData?.name || symbol,
          price: itemData?.price || 0,
          change24h: itemData?.change24h || 0,
          high24h: itemData?.high24h || 0,
          low24h: itemData?.low24h || 0,
          volume24h: itemData?.volume24h || 0,
          category: itemData?.category,
          exchange: itemData?.exchange,
        };
        // Fetch real-time ticker stats in background
        marketDataService.fetch24hTickers([symbol]).then(tickers => {
          const t = tickers.get(symbol);
          if (t) {
            setAppState(p => ({
              ...p,
              watchlist: p.watchlist.map(w => w.symbol === symbol ? {
                ...w,
                price: t.price,
                change24h: t.change24h,
                high24h: t.high,
                low24h: t.low,
                volume24h: t.volume,
              } : w)
            }));
          }
        });
        return {
          ...prev,
          watchlist: [...prev.watchlist, newItem],
        };
      }
    });
  }, []);

  const handleAddParsedIndicators = (indicators: IndicatorConfig[]) => {
    if (!activePane || indicators.length === 0) return;
    const hasCustom = indicators.some(i => i.type === 'CustomPython' || i.type === 'CustomPine');
    let nextIndicators: IndicatorConfig[];
    if (hasCustom) {
      // Clean previous custom indicator to avoid duplicate accumulation and update immediately!
      const withoutCustom = activePane.indicators.filter(i => i.type !== 'CustomPython' && i.type !== 'CustomPine');
      nextIndicators = [...withoutCustom, ...indicators];
    } else {
      nextIndicators = [...activePane.indicators, ...indicators];
    }
    updateActivePane({
      indicators: nextIndicators,
    });
    soundService.playClickSound();
  };

  const handleSaveIndicatorSettings = (updated: IndicatorConfig) => {
    let finalUpdated = updated;
    if (updated.type === 'CustomPython' && updated.pythonCode && activeCandlesData.length > 0) {
      try {
        const executed = executePythonScript(updated.pythonCode, activeCandlesData, updated.params);
        if (executed.success) {
          finalUpdated = {
            ...updated,
            customPlots: executed.plots,
            customHlines: executed.hlines,
            name: executed.title || updated.name,
            pane: executed.isOverlay ? 'overlay' : 'subpane',
          };
        }
      } catch (_) {}
    } else if (updated.type === 'CustomPine' && updated.pineCode && activeCandlesData.length > 0) {
      try {
        const executed = executePineScript(updated.pineCode, activeCandlesData, updated.params);
        if (executed.success) {
          finalUpdated = {
            ...updated,
            customPlots: executed.plots,
            customHlines: executed.hlines,
            name: executed.title || updated.name,
            pane: executed.isOverlay ? 'overlay' : 'subpane',
          };
        }
      } catch (_) {}
    }
    updateActivePane({
      indicators: activePane.indicators.map(ind => ind.id === updated.id ? finalUpdated : ind),
    });
    soundService.playClickSound();
  };

  // Paper Trading Position Actions
  const handleOpenOrderModalAtPrice = (price: number, side: 'long' | 'short' = 'long') => {
    setOrderModalInitialPrice(price);
    setOrderModalInitialSide(side);
    setIsOrderModalOpen(true);
  };

  const handleClosePaperPosition = (id: string) => {
    if (!activePane) return;
    const curPrice = activeWatchItem?.price || 100;
    const res = paperTradingService.closePosition(id, curPrice, 'manual');
    if (res.success) {
      soundService.playClickSound();
      setTradeExecutionNotification(res.message);
      setTimeout(() => setTradeExecutionNotification(null), 5000);
    }
  };

  const handleUpdatePaperPosition = (id: string, updates: { takeProfit?: number; stopLoss?: number }) => {
    paperTradingService.updatePositionTpSl(id, updates);
  };

  // Drawing Tools
  const handleClearDrawings = () => {
    if (confirm(t.app.clearDrawingsConfirm)) {
      updateActivePane({ drawings: [] });
    }
  };

  const handleToggleHideDrawings = () => {
    const nextHidden = !areDrawingsHidden;
    setAreDrawingsHidden(nextHidden);
    updateActivePane({
      drawings: activePane.drawings.map(d => ({ ...d, visible: !nextHidden })),
    });
  };

  // Symbol Selection
  const handleSelectSymbol = (symbol: string) => {
    if (appState.syncSymbol) {
      setAppState(prev => ({
        ...prev,
        panes: prev.panes.map(p => ({ ...p, symbol })),
        watchlist: prev.watchlist.some(w => w.symbol === symbol)
          ? prev.watchlist
          : [...prev.watchlist, { symbol, name: symbol, price: 0, change24h: 0, high24h: 0, low24h: 0, volume24h: 0 }]
      }));
    } else {
      updateActivePane({ symbol });
      if (!appState.watchlist.some(w => w.symbol === symbol)) {
        setAppState(prev => ({
          ...prev,
          watchlist: [
            ...prev.watchlist,
            { symbol, name: symbol, price: 0, change24h: 0, high24h: 0, low24h: 0, volume24h: 0 }
          ]
        }));
      }
    }
  };

  // Timeframe Selection
  const handleTimeframeChange = (timeframe: Timeframe) => {
    if (appState.syncTimeframe) {
      setAppState(prev => ({
        ...prev,
        panes: prev.panes.map(p => ({ ...p, timeframe }))
      }));
    } else {
      updateActivePane({ timeframe });
    }
  };

  // Export Candle Data to CSV
  const handleExportData = () => {
    if (!activeCandlesData || activeCandlesData.length === 0) {
      alert(t.app.noDataToExport);
      return;
    }
    const headers = ['Zaman (ISO)', 'Unix Timestamp', 'Acilis', 'Yuksek', 'Dusuk', 'Kapanis', 'Hacim'];
    const rows = activeCandlesData.map(c => [
      new Date(c.time * 1000).toISOString(),
      c.time,
      c.open,
      c.high,
      c.low,
      c.close,
      c.volume
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activePane?.symbol || 'symbol'}_${activePane?.timeframe || 'tf'}_ohlcv.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Timeframe / Interval Applier (Direct Keyboard Input)
  const applyQuickInterval = useCallback((raw: string) => {
    const clean = raw.trim().toLowerCase();
    const map: Record<string, Timeframe> = {
      '1': '1m', '1m': '1m',
      '2': '2m', '2m': '2m',
      '3': '3m', '3m': '3m',
      '5': '5m', '5m': '5m',
      '10': '10m', '10m': '10m',
      '15': '15m', '15m': '15m',
      '30': '30m', '30m': '30m',
      '45': '45m', '45m': '45m',
      '60': '1h', '1h': '1h', '60m': '1h',
      '120': '2h', '2h': '2h',
      '180': '3h', '3h': '3h',
      '240': '4h', '4h': '4h',
      '360': '6h', '6h': '6h',
      '480': '8h', '8h': '8h',
      '720': '12h', '12h': '12h',
      '1d': '1d', 'd': '1d',
      '2d': '2d',
      '3d': '3d',
      '1w': '1w', 'w': '1w',
      '1m_month': '1M',
      '1s': '1s', 's': '1s',
      '5s': '5s', '10s': '10s', '15s': '15s', '30s': '30s', '45s': '45s',
    };

    if (map[clean]) {
      handleTimeframeChange(map[clean]);
      soundService.playClickSound();
    } else if (/^[0-9]+$/.test(clean)) {
      // Pure numbers default to minutes
      handleTimeframeChange(`${clean}m` as Timeframe);
      soundService.playClickSound();
    } else if (/^[0-9]+[smhdwM]$/i.test(clean)) {
      // Number + unit
      handleTimeframeChange(clean as Timeframe);
      soundService.playClickSound();
    }

    setQuickIntervalInput(null);
  }, [handleTimeframeChange]);

  // 7. Keyboard Shortcuts (Hotkeys) Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If quick interval dialog is active
      if (quickIntervalInput !== null) {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyQuickInterval(quickIntervalInput);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setQuickIntervalInput(null);
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          setQuickIntervalInput(prev => (prev && prev.length > 1 ? prev.slice(0, -1) : null));
          return;
        }
        if (/^[0-9dwmhsM]$/i.test(e.key)) {
          e.preventDefault();
          setQuickIntervalInput(prev => (prev || '') + e.key);
          return;
        }
      }

      // Ignore if user is currently typing in an input/textarea/select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Ctrl / Cmd Shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setIsCommandPaletteOpen(prev => !prev);
          return;
        }
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;
        }
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
          return;
        }
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          storageService.saveState(appState);
          soundService.playClickSound();
          return;
        }
      }

      // Alt Shortcuts
      if (e.altKey) {
        if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          setActiveDrawingTool('trendLine');
        } else if (e.key.toLowerCase() === 'h') {
          e.preventDefault();
          setActiveDrawingTool('horizontalLine');
        } else if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          setActiveDrawingTool('verticalLine');
        } else if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          setActiveDrawingTool('fibonacci');
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          setActiveDrawingTool('measure');
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          setAppState(prev => ({ ...prev, magnetMode: !prev.magnetMode }));
        } else if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          setIsAlertModalOpen(true);
        } else if (e.key.toLowerCase() === 'w') {
          e.preventDefault();
          setIsWatchlistOpen(prev => !prev);
        } else if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          setIsBottomDockOpen(prev => !prev);
        } else if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          handleToggleReplay();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          setScreenshotTrigger(prev => prev + 1);
        } else if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          if (activePane) {
            handleUpdatePaneWithHistory(activePane.id, { drawings: [] });
          }
        }
        return;
      }

      // Space / Shift+Space: Next/Prev Symbol in Watchlist
      if (e.key === ' ' && !e.altKey && !e.ctrlKey) {
        e.preventDefault();
        const currentIdx = appState.watchlist.findIndex(w => w.symbol === activePane?.symbol);
        if (currentIdx !== -1) {
          const nextIdx = e.shiftKey
            ? (currentIdx - 1 + appState.watchlist.length) % appState.watchlist.length
            : (currentIdx + 1) % appState.watchlist.length;
          handleSelectSymbol(appState.watchlist[nextIdx].symbol);
        }
        return;
      }

      // Single Key: '/' opens Indicators
      if (e.key === '/') {
        e.preventDefault();
        setIsIndicatorsOpen(true);
        return;
      }

      // Single Key: '?' opens Hotkeys
      if (e.key === '?') {
        e.preventDefault();
        setIsHotkeysOpen(true);
        return;
      }

      // Escape: Crosshair
      if (e.key === 'Escape') {
        setActiveDrawingTool('crosshair');
        setQuickIntervalInput(null);
        return;
      }

      // Single Digit 1-9: Open Quick Interval
      if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setQuickIntervalInput(e.key);
        return;
      }

      // Single Letter A-Z: Open Symbol Search with that letter
      if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setSymbolSearchInitial(e.key.toUpperCase());
        setSymbolSearchMode('select');
        setIsSymbolSearchOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    appState.watchlist, 
    activePane, 
    quickIntervalInput, 
    applyQuickInterval, 
    handleUndo, 
    handleRedo, 
    handleSelectSymbol, 
    handleToggleReplay, 
    handleUpdatePaneWithHistory
  ]);

  // Layout Grid CSS Classes
  const getGridClass = () => {
    switch (appState.layout) {
      case '1x2': return 'grid grid-cols-1 md:grid-cols-2';
      case '2x1': return 'grid grid-rows-2';
      case '2x2': return 'grid grid-cols-2 grid-rows-2';
      case '1x3': return 'grid grid-cols-3';
      case '3x1': return 'grid grid-rows-3';
      case '1left-2right': return 'grid grid-cols-2 grid-rows-2';
      case '3x2': return 'grid grid-cols-3 grid-rows-2';
      default: return 'grid grid-cols-1';
    }
  };

  const activeWatchItem = appState.watchlist.find(w => w.symbol === activePane?.symbol);

  // Compute sliced candles when in Replay mode
  const replayCandles = isReplayActive && activeCandlesData.length > 0
    ? activeCandlesData.slice(0, replayIdx + 1)
    : undefined;

  return (
    <div className="flex flex-col h-screen w-screen bg-tv-bg text-tv-text overflow-hidden select-none">
      {/* Alert Notification Toast */}
      {activeAlertNotification && (
        <div className="absolute top-14 right-4 z-50 bg-tv-surface border-2 border-tv-blue rounded-lg shadow-2xl p-4 flex items-center space-x-3 text-white animate-bounce">
          <BellRing className="w-6 h-6 text-tv-yellow" />
          <div>
            <div className="font-bold text-sm">Fiyat Alarmı Çaldı!</div>
            <div className="text-xs text-tv-muted">
              {activeAlertNotification.symbol} hedef fiyata ulaştı: ${activeAlertNotification.targetPrice.toLocaleString()}
            </div>
            {activeAlertNotification.note && (
              <div className="text-[11px] text-tv-blue mt-0.5">{activeAlertNotification.note}</div>
            )}
          </div>
          <button 
            onClick={() => setActiveAlertNotification(null)}
            className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Trade Execution Notification Toast (TP / SL / Market fill) */}
      {tradeExecutionNotification && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-tv-surface border-2 border-tv-green rounded-lg shadow-2xl p-3.5 flex items-center space-x-3 text-white animate-in slide-in-from-top-3">
          <div className="w-2.5 h-2.5 rounded-full bg-tv-green animate-ping" />
          <div className="text-xs font-semibold">{tradeExecutionNotification}</div>
          <button
            onClick={() => setTradeExecutionNotification(null)}
            className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Bar Replay Controls */}
      <ReplayToolbar
        isActive={isReplayActive}
        isPlaying={isReplayPlaying}
        currentIdx={replayIdx}
        totalCandles={activeCandlesData.length}
        speed={replaySpeed}
        onTogglePlay={() => setIsReplayPlaying(!isReplayPlaying)}
        onStepForward={() => setReplayIdx(prev => Math.min(prev + 1, activeCandlesData.length - 1))}
        onReset={() => {
          setReplayIdx(Math.max(10, activeCandlesData.length - 50));
          setIsReplayPlaying(false);
          setIsReplayJumpMode(false);
        }}
        onSpeedChange={(s) => setReplaySpeed(s)}
        isJumpMode={isReplayJumpMode}
        onToggleJumpMode={() => setIsReplayJumpMode(!isReplayJumpMode)}
        onJumpToRealtime={() => {
          setReplayIdx(activeCandlesData.length - 1);
          setIsReplayPlaying(false);
          setIsReplayJumpMode(false);
        }}
        onClose={() => {
          setIsReplayActive(false);
          setIsReplayPlaying(false);
          setIsReplayJumpMode(false);
        }}
      />

      {/* Header Toolbar */}
      <Header
        symbol={activePane?.symbol || 'BTCUSDT'}
        timeframe={activePane?.timeframe || '15m'}
        chartType={activePane?.chartType || 'candlestick'}
        layout={appState.layout}
        indicatorCount={activePane?.indicators.filter(i => i.visible).length || 0}
        syncSymbol={appState.syncSymbol}
        syncTimeframe={appState.syncTimeframe}
        syncCrosshair={appState.syncCrosshair}
        syncTime={appState.syncTime !== false}
        onToggleSyncSymbol={() => setAppState(prev => ({ ...prev, syncSymbol: !prev.syncSymbol }))}
        onToggleSyncTimeframe={() => setAppState(prev => ({ ...prev, syncTimeframe: !prev.syncTimeframe }))}
        onToggleSyncCrosshair={() => setAppState(prev => ({ ...prev, syncCrosshair: !prev.syncCrosshair }))}
        onToggleSyncTime={() => setAppState(prev => ({ ...prev, syncTime: !prev.syncTime }))}
        templates={templates}
        onApplyIndicatorTemplate={handleApplyIndicatorTemplate}
        onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
        onSymbolClick={() => {
          setSymbolSearchMode('select');
          setIsSymbolSearchOpen(true);
        }}
        onTimeframeChange={handleTimeframeChange}
        onChartTypeChange={(ct: ChartType) => updateActivePane({ chartType: ct })}
        onLayoutChange={handleLayoutChange}
        onOpenIndicators={() => setIsIndicatorsOpen(true)}
        onOpenAlerts={() => setIsAlertModalOpen(true)}
        onOpenLayouts={() => setIsLayoutsModalOpen(true)}
        onOpenBacktest={() => setIsBacktestOpen(true)}
        onOpenCompare={() => setIsCompareOpen(true)}
        overlaySymbol={activePane?.overlaySymbol}
        onToggleReplay={handleToggleReplay}
        isReplayActive={isReplayActive}
        onOpenHotkeys={() => setIsHotkeysOpen(true)}
        onQuickSave={() => storageService.saveState(appState)}
        onTakeScreenshot={() => setScreenshotTrigger(prev => prev + 1)}
        onExportData={handleExportData}
        onOpenChartSettings={() => setIsChartSettingsOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleWatchlist={() => setIsWatchlistOpen(!isWatchlistOpen)}
        isWatchlistOpen={isWatchlistOpen}
        currentPrice={activeWatchItem?.price}
        change24h={activeWatchItem?.change24h}
      />

      {/* Main Workspace (Left Toolbar + Charts Grid + Right Sidebar) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar for Drawings */}
        <LeftToolbar
          activeTool={activeDrawingTool}
          magnetMode={appState.magnetMode}
          onSelectTool={handleSelectDrawingTool}
          onSelectMagnetMode={(mode) => setAppState(prev => ({ ...prev, magnetMode: mode }))}
          onToggleMagnet={() => setAppState(prev => ({ ...prev, magnetMode: prev.magnetMode === 'off' || !prev.magnetMode ? 'weak' : 'off' }))}
          onClearDrawings={handleClearDrawings}
          onToggleHideDrawings={handleToggleHideDrawings}
          areDrawingsHidden={areDrawingsHidden}
          lockDrawings={lockDrawings}
          onToggleLockDrawings={handleToggleLockDrawings}
          stayInDrawingMode={stayInDrawingMode}
          onToggleStayInDrawingMode={handleToggleStayInDrawingMode}
          showFavoritesBar={showFavoritesBar}
          onToggleFavoritesBar={handleToggleFavoritesBar}
        />

        {/* Floating Favorites Drawing Toolbar */}
        {showFavoritesBar && (
          <FloatingFavoritesBar
            activeTool={activeDrawingTool}
            onSelectTool={handleSelectDrawingTool}
            onClose={() => {
              setShowFavoritesBar(false);
              try { localStorage.setItem('tv_show_fav_bar', 'false'); } catch (_) {}
            }}
          />
        )}

        {/* Center: Charts Grid + Bottom Dock */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className={`flex-1 ${getGridClass()} gap-[1px] bg-tv-border relative h-full w-full`}>
            {appState.panes.map((pane, idx) => {
              let spanClass = '';
              if (appState.layout === '1left-2right') {
                spanClass = idx === 0 ? 'row-span-2 col-span-1' : 'col-span-1 row-span-1';
              }
              const isPaneActive = pane.id === appState.activePaneId;
              return (
                <div key={pane.id} className={`w-full h-full relative ${spanClass}`}>
                  <ChartPane
                    config={pane}
                    isActive={isPaneActive}
                    activeDrawingTool={activeDrawingTool}
                    magnetMode={appState.magnetMode}
                    lockDrawings={lockDrawings}
                    onDrawingComplete={handleDrawingComplete}
                    onActivate={() => handleActivatePane(pane.id)}
                    onUpdatePaneConfig={(upd) => handleUpdatePaneWithHistory(pane.id, upd)}
                    onOpenIndicatorSettings={handleOpenIndicatorSettings}
                    onCandlesUpdate={isPaneActive ? handleCandlesUpdateForActive : undefined}
                    overrideCandles={isPaneActive ? replayCandles : undefined}
                    screenshotTrigger={isPaneActive ? screenshotTrigger : undefined}
                    onOpenChartSettings={handleOpenChartSettings}
                    onOpenCreateAlertAtPrice={handleOpenCreateAlertAtPrice}
                    onSelectDrawingTool={handleSelectDrawingTool}
                    syncedCrosshair={appState.syncCrosshair ? syncedCrosshair : null}
                    onCrosshairMove={(t) => handleCrosshairMove(pane.id, t)}
                    isReplayJumpMode={isReplayJumpMode}
                    onReplayJumpToTime={handleReplayJumpToTime}
                    paperPositions={paperPositions}
                    onClosePaperPosition={handleClosePaperPosition}
                    onUpdatePaperPosition={handleUpdatePaperPosition}
                    onOpenOrderModalAtPrice={handleOpenOrderModalAtPrice}
                    onTriggerScreenshot={handleTriggerScreenshot}
                    alerts={appState.alerts}
                    onDeleteAlert={handleDeleteAlert}
                    onUpdateAlert={handleUpdateAlert}
                  />
                </div>
              );
            })}
          </div>

          {/* Bottom Dock Panel (Screener, Paper Trading, Pine Editor, Strategy Tester) */}
          <BottomDock
            isOpen={isBottomDockOpen}
            activeTab={bottomDockTab}
            onTabChange={setBottomDockTab}
            onToggleOpen={handleToggleBottomDock}
            activeSymbol={activePane?.symbol || 'BTCUSDT'}
            currentPrice={activeWatchItem?.price || 100}
            onSelectSymbol={handleSelectSymbol}
            watchlist={appState.watchlist}
            candles={activeCandlesData}
            onAddIndicator={handleAddIndicator}
            onAddParsedIndicators={handleAddParsedIndicators}
            onOpenBacktestModal={handleOpenBacktestModal}
          />
        </div>

        {/* Right Sidebar: Watchlist, Alerts, Data Window, Object Tree & Market Depth */}
        {isWatchlistOpen && (
          <RightSidebar
            watchlist={appState.watchlist}
            alerts={appState.alerts}
            drawings={activePane?.drawings || []}
            indicators={activePane?.indicators || []}
            currentSymbol={activePane?.symbol || 'BTCUSDT'}
            candles={activeCandlesData}
            hoverCandle={activeHoverCandle}
            timeframe={activePane?.timeframe}
            onSelectSymbol={handleSelectSymbol}
            onOpenAddSymbolModal={() => {
              setSymbolSearchMode('watchlist');
              setSymbolSearchInitial('');
              setIsSymbolSearchOpen(true);
            }}
            onUpdateWatchlist={(updated) => {
              setAppState(prev => ({ ...prev, watchlist: updated }));
            }}
            onAddWatchlistSymbol={handleToggleWatchlistSymbol}
            onRemoveWatchlistSymbol={(sym) => {
              setAppState(prev => ({
                ...prev,
                watchlist: prev.watchlist.filter(w => w.symbol !== sym)
              }));
            }}
            onDeleteAlert={handleDeleteAlert}
            onOpenCreateAlert={() => setIsAlertModalOpen(true)}
            onDeleteDrawing={(id) => {
              updateActivePane({
                drawings: activePane.drawings.filter(d => d.id !== id)
              });
            }}
            onToggleDrawingVisibility={(id) => {
              updateActivePane({
                drawings: activePane.drawings.map(d => d.id === id ? { ...d, visible: !d.visible } : d)
              });
            }}
            onDeleteIndicator={(id) => {
              updateActivePane({
                indicators: activePane.indicators.filter(i => i.id !== id)
              });
            }}
            onToggleIndicatorVisibility={(id) => {
              updateActivePane({
                indicators: activePane.indicators.map(i => i.id === id ? { ...i, visible: !i.visible } : i)
              });
            }}
            onClose={() => setIsWatchlistOpen(false)}
          />
        )}
      </div>

      {/* Bottom Status Bar */}
      <BottomBar
        connectionStatus={connectionStatus}
        onTimeRangeSelect={(range) => {
          if (range === '1G') handleTimeframeChange('5m');
          else if (range === '5G') handleTimeframeChange('15m');
          else if (range === '1A') handleTimeframeChange('1h');
          else if (range === '3A' || range === '6A') handleTimeframeChange('4h');
          else if (range === '1Y' || range === 'TÜMÜ') handleTimeframeChange('1d');
        }}
        isDockOpen={isBottomDockOpen}
        activeDockTab={bottomDockTab}
        onSelectDockTab={(tab) => {
          setBottomDockTab(tab);
          setIsBottomDockOpen(true);
        }}
        onToggleDock={() => setIsBottomDockOpen(!isBottomDockOpen)}
      />

      {/* Modals */}
      <IndicatorsModal
        isOpen={isIndicatorsOpen}
        onClose={() => setIsIndicatorsOpen(false)}
        onAddIndicator={handleAddIndicator}
      />

      <IndicatorSettingsModal
        indicator={editingIndicator}
        isOpen={Boolean(editingIndicator)}
        onClose={() => setEditingIndicator(null)}
        onSave={handleSaveIndicatorSettings}
      />

      <SymbolSearchModal
        isOpen={isSymbolSearchOpen}
        initialSearch={symbolSearchInitial}
        mode={symbolSearchMode}
        watchlistSymbols={appState.watchlist.map(w => w.symbol)}
        onToggleWatchlistSymbol={handleToggleWatchlistSymbol}
        onClose={() => { setIsSymbolSearchOpen(false); setSymbolSearchInitial(''); }}
        onSelectSymbol={handleSelectSymbol}
      />

      <AlertModal
        isOpen={isAlertModalOpen}
        symbol={activePane?.symbol || 'BTCUSDT'}
        currentPrice={activeWatchItem?.price || 100}
        initialTargetPrice={alertInitialPrice}
        onClose={() => {
          setIsAlertModalOpen(false);
          setAlertInitialPrice(undefined);
        }}
        onCreateAlert={(alert) => {
          setAppState(prev => ({
            ...prev,
            alerts: [...prev.alerts, alert]
          }));
        }}
      />

      <OrderModal
        isOpen={isOrderModalOpen}
        symbol={activePane?.symbol || 'BTCUSDT'}
        currentPrice={activeWatchItem?.price || 100}
        initialPrice={orderModalInitialPrice}
        initialSide={orderModalInitialSide}
        onClose={() => {
          setIsOrderModalOpen(false);
          setOrderModalInitialPrice(undefined);
        }}
        onOrderPlaced={() => {
          setIsOrderModalOpen(false);
        }}
      />

      <ChartSettingsModal
        isOpen={isChartSettingsOpen}
        onClose={() => setIsChartSettingsOpen(false)}
        currentSettings={activePane?.visualSettings || DEFAULT_VISUAL_SETTINGS}
        onSave={(newSettings) => {
          updateActivePane({ visualSettings: newSettings });
          setIsChartSettingsOpen(false);
        }}
      />

      <LayoutsModal
        isOpen={isLayoutsModalOpen}
        currentState={appState}
        onClose={() => setIsLayoutsModalOpen(false)}
        onLoadLayout={(loadedState) => setAppState(loadedState)}
      />

      <StrategyBacktestModal
        isOpen={isBacktestOpen}
        symbol={activePane?.symbol || 'BTCUSDT'}
        timeframe={activePane?.timeframe || '15m'}
        candles={activeCandlesData}
        onClose={() => setIsBacktestOpen(false)}
      />

      <HotkeysModal
        isOpen={isHotkeysOpen}
        onClose={() => setIsHotkeysOpen(false)}
      />

      {/* Floating Quick Interval Change HUD */}
      {quickIntervalInput !== null && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#1e222d] border-2 border-tv-blue rounded-2xl p-6 shadow-2xl flex flex-col items-center space-y-3 text-white min-w-[280px] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
          <div className="text-[11px] text-tv-muted font-bold uppercase tracking-wider">{t.app.changeInterval}</div>
          <div className="text-4xl font-mono font-bold text-tv-blue tracking-tight">
            {quickIntervalInput.toUpperCase()}
          </div>
          <div className="text-[11px] text-tv-muted text-center">
            {t.app.quickIntervalNotice}
          </div>
        </div>
      )}

      {/* Spotlight Command Palette (Ctrl + K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectSymbol={handleSelectSymbol}
        onSelectTimeframe={handleTimeframeChange}
        onSelectChartType={(ct) => updateActivePane({ chartType: ct })}
        onSelectLayout={handleLayoutChange}
        onSelectDrawingTool={(tool) => setActiveDrawingTool(tool)}
        onOpenIndicators={() => setIsIndicatorsOpen(true)}
        onOpenAlerts={() => setIsAlertModalOpen(true)}
        onOpenChartSettings={() => setIsChartSettingsOpen(true)}
        onOpenBacktest={() => setIsBacktestOpen(true)}
        onOpenHotkeys={() => setIsHotkeysOpen(true)}
        onToggleReplay={handleToggleReplay}
        onClearDrawings={() => {
          if (activePane) {
            handleUpdatePaneWithHistory(activePane.id, { drawings: [] });
          }
        }}
        onTakeScreenshot={() => setScreenshotTrigger(prev => prev + 1)}
        onExportData={handleExportData}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <CompareModal
        isOpen={isCompareOpen}
        currentSymbol={activePane?.symbol || 'BTCUSDT'}
        activeOverlay={activePane?.overlaySymbol}
        onClose={() => setIsCompareOpen(false)}
        onSelectOverlay={(sym) => {
          updateActivePane({ overlaySymbol: sym || undefined });
        }}
      />
    </div>
  );
};
