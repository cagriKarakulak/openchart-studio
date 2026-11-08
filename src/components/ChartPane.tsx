import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  ColorType, 
  CrosshairMode,
  CandlestickData,
  LineData,
  Time,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
  PriceScaleMode
} from 'lightweight-charts';
import { 
  CandleData, 
  ChartPaneConfig, 
  ChartType, 
  DrawingElement, 
  DrawingPoint, 
  DrawingToolType, 
  IndicatorConfig,
  PriceAlert
} from '../types';
import { marketDataService } from '../services/marketData';
import { 
  sanitizeCandles,
  calculateSMA, 
  calculateEMA, 
  calculateWMA, 
  calculateBollingerBands, 
  calculateSupertrend, 
  calculateVWAP, 
  calculateHeikinAshi,
  calculateIchimoku,
  calculateParabolicSAR,
  calculateKeltnerChannels,
  calculateDonchianChannels,
  calculateHMA,
  calculatePivotPoints,
  calculateDEMA,
  calculateTEMA,
  calculateVWMA,
  calculateEnvelopes,
  calculateZigZag,
  calculateSMMA,
  calculateALMA,
  calculateLSMA,
  calculatePriceChannel,
  calculateMcGinleyDynamic,
  calculateLinearRegressionCurve,
  calculateStandardErrorBands,
  calculateChandeKrollStop,
  calculateAveragePrice,
  calculateTypicalPrice,
  calculateMedianPrice,
  calculateGuppyMMA,
  calculateEMACross,
  calculateMACross,
  calculateMovingAverageChannel,
  findCandleByTime
} from '../indicators/math';
import { 
  createViewportConverter, 
  renderDrawingsOnCanvas,
  findHitDrawing
} from '../services/drawingRenderer';
import {
  calculateRenko,
  calculateThreeLineBreak,
  renderBarProfilesOnCanvas,
  renderVisibleRangeVolumeProfile,
  renderSessionVolumeProfile
} from '../services/barProfileEngine';
import { computeWithMtf } from '../services/multiTimeframeService';
import { executePineScript } from '../services/pineEngine';
import { executePythonScript } from '../services/pythonEngine';
import { snapToNearestCandlePoint, MagnetSensitivity } from '../services/magnet';
import { soundService } from '../services/sound';
import { timeframeToSeconds } from '../services/marketData';
import { SubPane } from './SubPane';
import { 
  Eye, 
  EyeOff, 
  Settings, 
  X, 
  Copy, 
  Trash2, 
  Bell, 
  Minus, 
  TrendingUp, 
  RotateCcw, 
  Compass, 
  Activity, 
  Maximize2,
  Clock,
  Lock,
  Unlock,
  Scissors,
  Plus,
  BarChart2,
  Download,
  ShoppingCart,
  ShieldCheck,
  Target
} from 'lucide-react';

interface ChartPaneProps {
  config: ChartPaneConfig;
  isActive: boolean;
  activeDrawingTool: DrawingToolType;
  magnetMode: boolean | 'off' | 'weak' | 'strong';
  lockDrawings?: boolean;
  onDrawingComplete?: () => void;
  onActivate: () => void;
  onUpdatePaneConfig: (updated: Partial<ChartPaneConfig>) => void;
  onOpenIndicatorSettings: (indicator: IndicatorConfig) => void;
  onCandlesUpdate?: (candles: CandleData[]) => void;
  overrideCandles?: CandleData[];
  screenshotTrigger?: number;
  onOpenChartSettings?: () => void;
  onOpenCreateAlertAtPrice?: (price: number) => void;
  onSelectDrawingTool?: (tool: DrawingToolType) => void;
  syncedCrosshair?: { time: number; sourcePaneId: string } | null;
  onCrosshairMove?: (time: number | null) => void;
  isReplayJumpMode?: boolean;
  onReplayJumpToTime?: (time: number) => void;
  paperPositions?: { id: string; symbol: string; side: 'long' | 'short'; entryPrice: number; qty: number; takeProfit?: number; stopLoss?: number }[];
  onClosePaperPosition?: (id: string) => void;
  onUpdatePaperPosition?: (id: string, updates: { takeProfit?: number; stopLoss?: number }) => void;
  onOpenOrderModalAtPrice?: (price: number, side?: 'long' | 'short') => void;
  onTriggerScreenshot?: () => void;
  alerts?: PriceAlert[];
  onDeleteAlert?: (id: string) => void;
  onUpdateAlert?: (alert: PriceAlert) => void;
}

export const ChartPane: React.FC<ChartPaneProps> = React.memo(({
  config,
  isActive,
  activeDrawingTool,
  magnetMode,
  lockDrawings = false,
  onDrawingComplete,
  onActivate,
  onUpdatePaneConfig,
  onOpenIndicatorSettings,
  onCandlesUpdate,
  overrideCandles,
  screenshotTrigger,
  onOpenChartSettings,
  onOpenCreateAlertAtPrice,
  onSelectDrawingTool,
  syncedCrosshair,
  onCrosshairMove,
  isReplayJumpMode,
  onReplayJumpToTime,
  paperPositions,
  onClosePaperPosition,
  onUpdatePaperPosition,
  onOpenOrderModalAtPrice,
  onTriggerScreenshot,
  alerts,
  onDeleteAlert,
  onUpdateAlert,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<any> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>[]>>(new Map());
  const savedLogicalRangeRef = useRef<{ from: number; to: number } | null>(null);

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [dataVersion, setDataVersion] = useState<number>(0);
  const lastStateUpdateRef = useRef<number>(0);
  const [currentHoverCandle, setCurrentHoverCandle] = useState<CandleData | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);
  const [drawingPreview, setDrawingPreview] = useState<DrawingElement | null>(null);
  const [priceScaleMode, setPriceScaleMode] = useState<'normal' | 'log' | 'percent'>('normal');
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const currentDrawingTypeRef = useRef<DrawingToolType | null>(null);
  const dragStartScreenRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleShiftKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(true);
    };
    const handleShiftKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(false);
    };
    window.addEventListener('keydown', handleShiftKeyDown);
    window.addEventListener('keyup', handleShiftKeyUp);
    return () => {
      window.removeEventListener('keydown', handleShiftKeyDown);
      window.removeEventListener('keyup', handleShiftKeyUp);
    };
  }, []);

  // Real-time Countdown to Bar Close
  const [countdownText, setCountdownText] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const active = overrideCandles && overrideCandles.length > 0 ? overrideCandles : candles;
      if (!active || active.length === 0) {
        setCountdownText('');
        return;
      }
      const lastCandle = active[active.length - 1];
      const duration = timeframeToSeconds(config.timeframe);
      const nowSec = Math.floor(Date.now() / 1000);
      const barEnd = lastCandle.time + duration;
      const diff = barEnd - nowSec;
      if (diff <= 0) {
        setCountdownText('00:00');
        return;
      }
      if (diff >= 3600) {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setCountdownText(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      } else {
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        setCountdownText(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [candles, overrideCandles, config.timeframe]);

  const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    price: number;
    time: number;
  } | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
      setPlusMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Paper Trading Interactive Draggable TP/SL Lines & Badges
  const [draggingPaperLine, setDraggingPaperLine] = useState<{
    posId: string;
    type: 'tp' | 'sl';
    price: number;
  } | null>(null);

  const paperLineHitsRef = useRef<{
    closeButtons: { posId: string; x: number; y: number; w: number; h: number }[];
    tpLines: { posId: string; y: number; price: number }[];
    slLines: { posId: string; y: number; price: number }[];
    addTpHits: { posId: string; x: number; y: number; w: number; h: number }[];
    addSlHits: { posId: string; x: number; y: number; w: number; h: number }[];
  }>({ closeButtons: [], tpLines: [], slLines: [], addTpHits: [], addSlHits: [] });

  const [hoveredPaperHit, setHoveredPaperHit] = useState<{
    type: 'close' | 'tp' | 'sl' | 'add_tp' | 'add_sl';
    posId: string;
  } | null>(null);

  // Price Alerts Interactive Draggable Lines & Badges
  const [draggingAlertLine, setDraggingAlertLine] = useState<{
    alertId: string;
    price: number;
  } | null>(null);

  const alertLineHitsRef = useRef<{
    closeButtons: { alertId: string; x: number; y: number; w: number; h: number }[];
    lines: { alertId: string; y: number; price: number }[];
  }>({ closeButtons: [], lines: [] });

  const [hoveredAlertHit, setHoveredAlertHit] = useState<{
    type: 'close' | 'line';
    alertId: string;
  } | null>(null);

  // Price Scale Hover Plus Button
  const [hoverPriceScale, setHoverPriceScale] = useState<{ y: number; price: number } | null>(null);
  const [plusMenu, setPlusMenu] = useState<{ x: number; y: number; price: number } | null>(null);

  const isDrawingRef = useRef(false);
  const drawingStartPointRef = useRef<DrawingPoint | null>(null);
  const brushPointsRef = useRef<DrawingPoint[]>([]);
  const isLoadingEarlierRef = useRef(false);
  const candlesRef = useRef<CandleData[]>([]);
  candlesRef.current = candles;

  // Map to store overlay indicator values by time for instant crosshair tracking
  const overlayValueMapsRef = useRef<Map<string, Map<number, string>>>(new Map());

  // Split Indicators: Overlay (drawn on main chart) vs Subpane (separate lower panes)
  const overlayIndicators = config.indicators.filter(i => i.pane === 'overlay');
  const subpaneIndicators = config.indicators.filter(i => i.pane === 'subpane');

  const activeCandles = overrideCandles && overrideCandles.length > 0 ? overrideCandles : candles;
  const activeCandlesRef = useRef<CandleData[]>([]);
  activeCandlesRef.current = activeCandles;

  // Visual Settings Real-time Reactivity
  useEffect(() => {
    if (!chartRef.current || !config.visualSettings) return;
    const vs = config.visualSettings;
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: vs.backgroundColor },
      },
      grid: {
        vertLines: { color: vs.showGrid ? vs.gridColor : 'transparent' },
        horzLines: { color: vs.showGrid ? vs.gridColor : 'transparent' },
      },
    });

    if (mainSeriesRef.current) {
      if (config.chartType === 'candlestick' || config.chartType === 'hollow-candlestick') {
        mainSeriesRef.current.applyOptions({
          upColor: config.chartType === 'hollow-candlestick' ? '#131722' : vs.upColor,
          downColor: vs.downColor,
          wickUpColor: vs.wickUpColor,
          wickDownColor: vs.wickDownColor,
          borderUpColor: vs.borderUpColor,
          borderDownColor: vs.borderDownColor,
        });
      }
    }

    try {
      chartRef.current.priceScale('right').applyOptions({
        invertScale: !!vs.invertScale,
      });
    } catch (_) {}
  }, [config.visualSettings, config.chartType]);

  // Scale mode handler
  useEffect(() => {
    if (!chartRef.current) return;
    try {
      const scale = chartRef.current.priceScale('right');
      if (priceScaleMode === 'log') {
        scale.applyOptions({ mode: PriceScaleMode.Logarithmic });
      } else if (priceScaleMode === 'percent') {
        scale.applyOptions({ mode: PriceScaleMode.Percentage });
      } else {
        scale.applyOptions({ mode: PriceScaleMode.Normal, autoScale: true });
      }
    } catch (_) {}
  }, [priceScaleMode]);

  // 1. Initialize Main Chart
  useEffect(() => {
    if (!containerRef.current) return;

    const vs = config.visualSettings;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: vs?.backgroundColor || '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: vs?.showGrid !== false ? (vs?.gridColor || 'rgba(42, 46, 57, 0.4)') : 'transparent' },
        horzLines: { color: vs?.showGrid !== false ? (vs?.gridColor || 'rgba(42, 46, 57, 0.4)') : 'transparent' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#787b86',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2a2e39',
        },
        horzLine: {
          color: '#787b86',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2a2e39',
        },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: config.timeframe === '1s',
        minBarSpacing: 0.5,
      },
      handleScale: {
        mouseWheel: false, // Managed by our unified high-performance cursor-anchored zoom engine
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true },
      },
      handleScroll: {
        mouseWheel: false, // Prevent vertical wheel from triggering horizontal scrolling
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        autoScale: true,
      },
    });

    chartRef.current = chart;
    setChartInstance(chart);

    // Create Main Series
    const createMainSeries = () => {
      if (config.chartType === 'line' || config.chartType === 'step-line' || config.chartType === 'line-with-markers') {
        return chart.addSeries(LineSeries, { 
          color: '#2962ff', 
          lineWidth: 2,
          lineType: config.chartType === 'step-line' ? 1 : 0
        });
      } else if (config.chartType === 'area') {
        return chart.addSeries(AreaSeries, {
          topColor: 'rgba(41, 98, 255, 0.4)',
          bottomColor: 'rgba(41, 98, 255, 0.0)',
          lineColor: '#2962ff',
          lineWidth: 2,
        });
      } else if (config.chartType === 'bar' || config.chartType === 'high-low') {
        return chart.addSeries(BarSeries, { 
          upColor: '#089981', 
          downColor: '#f23645',
          thinBars: config.chartType === 'high-low'
        });
      } else if (config.chartType === 'baseline') {
        return chart.addSeries(BaselineSeries, {
          baseValue: { type: 'price', price: activeCandles[0]?.close || 100 },
          topLineColor: '#089981',
          topFillColor1: 'rgba(8, 153, 129, 0.28)',
          topFillColor2: 'rgba(8, 153, 129, 0.05)',
          bottomLineColor: '#f23645',
          bottomFillColor1: 'rgba(242, 54, 69, 0.05)',
          bottomFillColor2: 'rgba(242, 54, 69, 0.28)',
        });
      } else if (config.chartType === 'hollow-candlestick') {
        return chart.addSeries(CandlestickSeries, {
          upColor: '#131722',
          downColor: '#f23645',
          borderVisible: true,
          borderUpColor: '#089981',
          borderDownColor: '#f23645',
          wickUpColor: '#089981',
          wickDownColor: '#f23645',
        });
      } else if (config.chartType === 'volume-footprint' || config.chartType === 'volume-candle') {
        return chart.addSeries(CandlestickSeries, {
          upColor: 'rgba(8, 153, 129, 0.001)',
          downColor: 'rgba(242, 54, 69, 0.001)',
          borderVisible: false,
          wickUpColor: 'rgba(8, 153, 129, 0.001)',
          wickDownColor: 'rgba(242, 54, 69, 0.001)',
        });
      } else if (config.chartType === 'columns') {
        return chart.addSeries(BarSeries, {
          upColor: '#089981',
          downColor: '#f23645',
        });
      } else {
        return chart.addSeries(CandlestickSeries, {
          upColor: '#089981',
          downColor: '#f23645',
          borderVisible: false,
          wickUpColor: '#089981',
          wickDownColor: '#f23645',
        });
      }
    };

    const mainSeries = createMainSeries();
    mainSeriesRef.current = mainSeries;

    // Immediately populate series with existing in-memory candles
    const curCandles = (overrideCandles && overrideCandles.length > 0)
      ? overrideCandles
      : (candlesRef.current.length > 0 ? candlesRef.current : candles);

    if (curCandles.length > 0) {
      let displayList = curCandles;
      if (config.chartType === 'heikin-ashi') {
        displayList = calculateHeikinAshi(curCandles);
      } else if (config.chartType === 'renko') {
        displayList = calculateRenko(curCandles);
      } else if (config.chartType === 'line-break') {
        displayList = calculateThreeLineBreak(curCandles);
      }

      if (config.chartType === 'line' || config.chartType === 'area' || config.chartType === 'baseline' || config.chartType === 'step-line' || config.chartType === 'line-with-markers') {
        const lineData: LineData[] = displayList.map(c => ({ time: c.time as Time, value: c.close }));
        mainSeries.setData(lineData);
      } else {
        const barData: CandlestickData[] = displayList.map(c => ({
          time: c.time as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        mainSeries.setData(barData);
      }

      const totalBars = displayList.length;
      const isOrderFlow = config.chartType === 'volume-footprint' || config.chartType === 'volume-candle';
      const prevRange = savedLogicalRangeRef.current;
      const prevSpan = prevRange ? (prevRange.to - prevRange.from) : Infinity;

      if (prevRange && (!isOrderFlow || prevSpan <= 80)) {
        chart.timeScale().setVisibleLogicalRange(prevRange);
      } else if (isOrderFlow) {
        const targetRange = {
          from: Math.max(0, totalBars - 32),
          to: totalBars + 2,
        };
        savedLogicalRangeRef.current = targetRange;
        chart.timeScale().setVisibleLogicalRange(targetRange);
      } else {
        chart.timeScale().fitContent();
      }
      requestRedraw();
    }

    // Subscribe to visible range and time changes so canvas layers stay in sync
    const handleRangeChange = (logicalRange?: any) => {
      if (logicalRange && logicalRange.from !== logicalRange.to) {
        savedLogicalRangeRef.current = logicalRange;
      }
      requestRedraw();
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange);

    // Crosshair Hover with bar-level debounce
    let lastHoverTime = -1;
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.get(mainSeries)) {
        if (lastHoverTime !== -1) {
          lastHoverTime = -1;
          const latest = activeCandlesRef.current;
          if (latest.length > 0) {
            setCurrentHoverCandle(latest[latest.length - 1]);
          }
        }
        return;
      }
      const t = Number(param.time);
      if (t === lastHoverTime) {
        return; // Fast skip: within identical bar, saves up to 90% of redundant React renders
      }
      lastHoverTime = t;
      const data: any = param.seriesData.get(mainSeries);
      if (data) {
        onCrosshairMove?.(t);
        const matched = findCandleByTime(activeCandlesRef.current, t);
        setCurrentHoverCandle({
          time: t,
          open: data.open ?? data.value,
          high: data.high ?? data.value,
          low: data.low ?? data.value,
          close: data.close ?? data.value,
          volume: matched?.volume ?? 0,
        });
      }
    });

    // Container level mouse drag and wheel sync for price scale & panning
    const container = containerRef.current;
    const handlePointerMove = (e: PointerEvent) => {
      if (e.buttons > 0) {
        requestRedraw();
      }
    };

    // Unified cursor-anchored responsive zoom engine
    const handleWheel = (e: WheelEvent) => {
      const delta = e.deltaY;
      if (delta === 0) return;
      if (e.cancelable) {
        e.preventDefault();
      }

      const ts = chart.timeScale();
      const curRange = ts.getVisibleLogicalRange();
      if (!curRange) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const chartW = Math.max(1, rect.width - 55);
      const ratio = Math.max(0, Math.min(1, mouseX / chartW));

      const isZoomIn = delta < 0;
      const zoomFactor = isZoomIn ? 0.82 : 1.22;

      const curSpan = curRange.to - curRange.from;
      const targetSpan = curSpan * zoomFactor;

      if (targetSpan >= 3 && targetSpan <= 3500) {
        const anchor = curRange.from + curSpan * ratio;
        const newFrom = anchor - targetSpan * ratio;
        const newTo = anchor + targetSpan * (1 - ratio);
        ts.setVisibleLogicalRange({ from: newFrom, to: newTo });
        savedLogicalRangeRef.current = { from: newFrom, to: newTo };
        requestRedraw();
      }
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Resize Observer for dynamic canvas and chart width/height
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });

      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        requestRedraw();
      }
    });

    resizeObserver.observe(container);

    return () => {
      try {
        const curR = chart.timeScale().getVisibleLogicalRange();
        if (curR && curR.from !== curR.to) {
          savedLogicalRangeRef.current = curR;
        }
      } catch (_) {}
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('wheel', handleWheel);
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
        chart.timeScale().unsubscribeVisibleTimeRangeChange(handleRangeChange);
      } catch (_) {}
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      setChartInstance(null);
      mainSeriesRef.current = null;
      indicatorSeriesRef.current.clear();
    };
  }, [config.chartType]);

  // Redraw Drawings on Canvas
  const redrawDrawings = useCallback(() => {
    if (!canvasRef.current || !chartRef.current || !mainSeriesRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Ensure canvas dimensions match client rect
    if (containerRef.current) {
      if (canvasRef.current.width !== containerRef.current.clientWidth ||
          canvasRef.current.height !== containerRef.current.clientHeight) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    }

    // Clear entire canvas before drawing all layers
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    const conv = createViewportConverter(chartRef.current, mainSeriesRef.current, activeCandles);

    // 0. Render Chart Background Watermark (Watermark Overlay)
    if (config.visualSettings?.showWatermark !== false) {
      ctx.save();
      const watermarkOpacity = config.visualSettings?.watermarkOpacity ?? 0.07;
      ctx.fillStyle = `rgba(255, 255, 255, ${watermarkOpacity})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = canvasRef.current.width / 2;
      const cy = canvasRef.current.height / 2;
      ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
      ctx.fillText(config.symbol, cx, cy - 20);
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
      ctx.fillText(config.timeframe, cx, cy + 35);
      ctx.restore();
    }

    // 1. Render Bar Profiles & Footprint if specialized chart type is active
    renderBarProfilesOnCanvas(
      ctx,
      canvasRef.current.width,
      canvasRef.current.height,
      activeCandles,
      config.chartType,
      conv
    );

    // 2. Render Visible Range Volume Profile (VPVR) if enabled
    const vpInd = config.indicators.find(i => i.type === 'VolumeProfile' && i.visible);
    if (vpInd) {
      renderVisibleRangeVolumeProfile(
        ctx,
        canvasRef.current.width,
        canvasRef.current.height,
        activeCandles,
        conv,
        {
          binsCount: Number(vpInd.params.bins || vpInd.params.binsCount || 30),
          valueAreaPct: Number(vpInd.params.valueAreaPct || 70) / 100,
          widthPct: 0.22,
          side: (vpInd.params.side as any) || 'right',
          pocColor: (vpInd.styles.poc as any)?.color || '#ff2d55',
        }
      );
    }

    // 2b. Render Session Volume Profile (SVP) if enabled
    const svpInd = config.indicators.find(i => i.type === 'SessionVolumeProfile' && i.visible);
    if (svpInd) {
      renderSessionVolumeProfile(
        ctx,
        canvasRef.current.width,
        canvasRef.current.height,
        activeCandles,
        conv,
        {
          binsCount: Number(svpInd.params.bins || 24),
          valueAreaPct: Number(svpInd.params.valueAreaPct || 70) / 100,
          pocColor: (svpInd.styles.poc as any)?.color || '#ff2d55',
        }
      );
    }

    // 3. Render user drawings on top (includes Fixed Range Volume Profile FRVP)
    renderDrawingsOnCanvas(
      ctx,
      canvasRef.current.width,
      canvasRef.current.height,
      config.drawings,
      conv,
      selectedDrawingId,
      drawingPreview,
      activeCandles
    );

    // 4. Render Paper Trading Active Positions with Draggable TP/SL and Close [X]
    paperLineHitsRef.current = { closeButtons: [], tpLines: [], slLines: [], addTpHits: [], addSlHits: [] };
    if (paperPositions && paperPositions.length > 0) {
      for (const pos of paperPositions) {
        if (pos.symbol !== config.symbol) continue;
        const entryY = conv.priceToY(pos.entryPrice);
        if (entryY === null) continue;

        const isLong = pos.side === 'long';
        const color = isLong ? '#089981' : '#f23645';
        const latestPrice = activeCandles[activeCandles.length - 1]?.close || pos.entryPrice;
        const pnl = isLong 
          ? (latestPrice - pos.entryPrice) * pos.qty 
          : (pos.entryPrice - latestPrice) * pos.qty;
        const pnlPct = pos.entryPrice > 0 ? (pnl / (pos.entryPrice * pos.qty)) * 100 : 0;
        const isProfitable = pnl >= 0;

        ctx.save();

        // 4.1 Entry Price Line
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(0, entryY);
        ctx.lineTo(canvasRef.current.width - 55, entryY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 4.2 Left Entry Badge: SIDE QTY @ ENTRY [X] [+TP] [+SL]
        const sideText = `${pos.side.toUpperCase()} ${pos.qty} @ $${pos.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        ctx.font = 'bold 10px sans-serif';
        const sideTw = ctx.measureText(sideText).width;
        const badgeW = sideTw + (pos.takeProfit ? 0 : 32) + (pos.stopLoss ? 0 : 32) + 38;
        
        ctx.fillStyle = color;
        ctx.fillRect(8, entryY - 10, badgeW, 20);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(sideText, 14, entryY + 4);

        // Close [X] button
        let curBtnX = 14 + sideTw + 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(curBtnX, entryY - 7, 14, 14);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('✕', curBtnX + 3.5, entryY + 3.5);
        paperLineHitsRef.current.closeButtons.push({
          posId: pos.id,
          x: curBtnX,
          y: entryY - 7,
          w: 14,
          h: 14,
        });
        curBtnX += 18;

        // +TP button if TP not yet set
        if (!pos.takeProfit) {
          ctx.fillStyle = 'rgba(8, 153, 129, 0.85)';
          ctx.fillRect(curBtnX, entryY - 7, 28, 14);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('+TP', curBtnX + 5, entryY + 3.5);
          paperLineHitsRef.current.addTpHits.push({
            posId: pos.id,
            x: curBtnX,
            y: entryY - 7,
            w: 28,
            h: 14,
          });
          curBtnX += 32;
        }

        // +SL button if SL not yet set
        if (!pos.stopLoss) {
          ctx.fillStyle = 'rgba(242, 54, 69, 0.85)';
          ctx.fillRect(curBtnX, entryY - 7, 28, 14);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('+SL', curBtnX + 5, entryY + 3.5);
          paperLineHitsRef.current.addSlHits.push({
            posId: pos.id,
            x: curBtnX,
            y: entryY - 7,
            w: 28,
            h: 14,
          });
        }

        // 4.3 Right PnL Badge
        const pnlStr = `${isProfitable ? '+' : ''}$${pnl.toFixed(2)} (${isProfitable ? '+' : ''}${pnlPct.toFixed(2)}%)`;
        ctx.font = 'bold 10px sans-serif';
        const pnlTw = ctx.measureText(pnlStr).width;
        const pnlX = canvasRef.current.width - 65 - pnlTw - 14;
        ctx.fillStyle = isProfitable ? '#089981' : '#f23645';
        ctx.fillRect(pnlX, entryY - 10, pnlTw + 12, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(pnlStr, pnlX + 6, entryY + 4);

        // 4.4 Take Profit Line & Badge (Green)
        const effectiveTp = (draggingPaperLine && draggingPaperLine.posId === pos.id && draggingPaperLine.type === 'tp')
          ? draggingPaperLine.price
          : pos.takeProfit;

        if (effectiveTp && effectiveTp > 0) {
          const tpY = conv.priceToY(effectiveTp);
          if (tpY !== null) {
            const tpPnl = isLong 
              ? (effectiveTp - pos.entryPrice) * pos.qty 
              : (pos.entryPrice - effectiveTp) * pos.qty;
            ctx.strokeStyle = '#089981';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(0, tpY);
            ctx.lineTo(canvasRef.current.width - 55, tpY);
            ctx.stroke();
            ctx.setLineDash([]);

            const tpText = `TP: $${effectiveTp.toLocaleString('en-US', { minimumFractionDigits: 2 })} (+$${tpPnl.toFixed(2)}) ↕`;
            ctx.font = 'bold 10px sans-serif';
            const tpTw = ctx.measureText(tpText).width;
            ctx.fillStyle = '#089981';
            ctx.fillRect(8, tpY - 9, tpTw + 12, 18);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(tpText, 14, tpY + 3.5);

            paperLineHitsRef.current.tpLines.push({
              posId: pos.id,
              y: tpY,
              price: effectiveTp,
            });
          }
        }

        // 4.5 Stop Loss Line & Badge (Red)
        const effectiveSl = (draggingPaperLine && draggingPaperLine.posId === pos.id && draggingPaperLine.type === 'sl')
          ? draggingPaperLine.price
          : pos.stopLoss;

        if (effectiveSl && effectiveSl > 0) {
          const slY = conv.priceToY(effectiveSl);
          if (slY !== null) {
            const slLoss = isLong 
              ? (pos.entryPrice - effectiveSl) * pos.qty 
              : (effectiveSl - pos.entryPrice) * pos.qty;
            ctx.strokeStyle = '#f23645';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(0, slY);
            ctx.lineTo(canvasRef.current.width - 55, slY);
            ctx.stroke();
            ctx.setLineDash([]);

            const slText = `SL: $${effectiveSl.toLocaleString('en-US', { minimumFractionDigits: 2 })} (-$${slLoss.toFixed(2)}) ↕`;
            ctx.font = 'bold 10px sans-serif';
            const slTw = ctx.measureText(slText).width;
            ctx.fillStyle = '#f23645';
            ctx.fillRect(8, slY - 9, slTw + 12, 18);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(slText, 14, slY + 3.5);

            paperLineHitsRef.current.slLines.push({
              posId: pos.id,
              y: slY,
              price: effectiveSl,
            });
          }
        }

        ctx.restore();
      }
    }

    // 4b. Render Price Alerts on Chart with Draggable Level and Delete [✕] Button
    alertLineHitsRef.current = { closeButtons: [], lines: [] };
    if (alerts && alerts.length > 0) {
      for (const alert of alerts) {
        if (alert.symbol !== config.symbol) continue;

        const effectivePrice = (draggingAlertLine && draggingAlertLine.alertId === alert.id)
          ? draggingAlertLine.price
          : alert.targetPrice;

        const alertY = conv.priceToY(effectivePrice);
        if (alertY === null) continue;

        const isTriggered = alert.triggered;
        const lineColor = isTriggered ? 'rgba(245, 158, 11, 0.45)' : '#f59e0b';
        const badgeBg = isTriggered ? 'rgba(120, 123, 134, 0.85)' : '#f59e0b';

        ctx.save();

        // Horizontal Alert Line
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = isTriggered ? 1 : 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(0, alertY);
        ctx.lineTo(canvasRef.current.width - 55, alertY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Left Badge Text: 🔔 COND PRICE [NOTE] [Tetiklendi]
        const condSymbol = alert.condition === 'cross_up' ? '▲' : alert.condition === 'cross_down' ? '▼' : '↕';
        const priceStr = `$${effectivePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
        const noteStr = alert.note ? ` • ${alert.note.length > 18 ? alert.note.slice(0, 18) + '…' : alert.note}` : '';
        const statusStr = isTriggered ? ' [Tetiklendi]' : '';
        const labelText = `🔔 ${condSymbol} ${priceStr}${noteStr}${statusStr}`;

        ctx.font = 'bold 10px sans-serif';
        const textTw = ctx.measureText(labelText).width;
        const badgeW = textTw + 28;

        // Badge Background
        ctx.fillStyle = badgeBg;
        if (typeof (ctx as any).roundRect === 'function') {
          ctx.beginPath();
          (ctx as any).roundRect(8, alertY - 10, badgeW, 20, 3);
          ctx.fill();
        } else {
          ctx.fillRect(8, alertY - 10, badgeW, 20);
        }

        // Badge Text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, 14, alertY + 3.5);

        // Delete [✕] Button
        const btnX = 14 + textTw + 4;
        const btnY = alertY - 7;
        const btnSize = 14;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        if (typeof (ctx as any).roundRect === 'function') {
          ctx.beginPath();
          (ctx as any).roundRect(btnX, btnY, btnSize, btnSize, 2);
          ctx.fill();
        } else {
          ctx.fillRect(btnX, btnY, btnSize, btnSize);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('✕', btnX + 3.5, alertY + 3.5);

        alertLineHitsRef.current.closeButtons.push({
          alertId: alert.id,
          x: btnX,
          y: btnY,
          w: btnSize,
          h: btnSize
        });

        alertLineHitsRef.current.lines.push({
          alertId: alert.id,
          y: alertY,
          price: effectivePrice
        });

        // Right Price Scale Badge
        const axisW = 54;
        const axisX = canvasRef.current.width - 55;
        ctx.fillStyle = badgeBg;
        ctx.fillRect(axisX, alertY - 9, axisW, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(`🔔${effectivePrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`, axisX + 3, alertY + 3.5);

        ctx.restore();
      }
    }

    // 5. Render Synced Crosshair from other pane
    if (syncedCrosshair && syncedCrosshair.sourcePaneId !== config.id) {
      const syncX = conv.timeToX(syncedCrosshair.time);
      if (syncX !== null && syncX >= 0 && syncX <= canvasRef.current.width) {
        ctx.save();
        ctx.strokeStyle = '#787b86';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(syncX, 0);
        ctx.lineTo(syncX, canvasRef.current.height);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [
    config.drawings, 
    selectedDrawingId, 
    drawingPreview, 
    activeCandles, 
    config.chartType, 
    config.symbol, 
    config.timeframe, 
    config.visualSettings, 
    config.indicators, 
    paperPositions, 
    draggingPaperLine,
    alerts,
    draggingAlertLine,
    syncedCrosshair, 
    config.id
  ]);

  // Immediate High-Performance Redraw
  const requestRedraw = useCallback(() => {
    redrawDrawings();
  }, [redrawDrawings]);


  // Redraw whenever drawings, preview, logical range, or alerts change
  useEffect(() => {
    requestRedraw();
  }, [requestRedraw, drawingPreview, config.drawings, selectedDrawingId, alerts, draggingAlertLine]);

  useEffect(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const handleRangeChange = async (logicalRange: any) => {
      requestRedraw();
      if (!logicalRange) return;

      // Infinite historical scroll: when user pans left towards earliest bars
      if (
        logicalRange.from < 30 &&
        !isLoadingEarlierRef.current &&
        candlesRef.current.length > 0 &&
        (!overrideCandles || overrideCandles.length === 0)
      ) {
        isLoadingEarlierRef.current = true;
        setIsLoadingEarlier(true);
        const earliestTime = candlesRef.current[0].time;
        try {
          const olderCandles = await marketDataService.fetchEarlierCandles(
            config.symbol,
            config.timeframe,
            earliestTime,
            1000
          );
          if (olderCandles.length > 0) {
            setCandles(prev => {
              const combined = sanitizeCandles([...olderCandles, ...prev]);
              candlesRef.current = combined;
              applyCandleDataToSeries(combined, false /* preserve user zoom/scroll */);
              setDataVersion(v => v + 1);
              return combined;
            });
          }
        } catch (e) {
          console.warn('Failed loading older bars', e);
        } finally {
          setTimeout(() => {
            isLoadingEarlierRef.current = false;
            setIsLoadingEarlier(false);
          }, 800);
        }
      }
    };
    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);
    return () => {
      try {
        timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      } catch (_) {}
    };
  }, [chartInstance, redrawDrawings, config.symbol, config.timeframe, overrideCandles]);

  // Load historical data & WebSocket live updates
  useEffect(() => {
    let isSubscribed = true;

    const loadData = async () => {
      const historical = await marketDataService.fetchHistoricalCandles(config.symbol, config.timeframe, 2000);
      if (!isSubscribed) return;

      setCandles(historical);
      candlesRef.current = historical;
      if (historical.length > 0) {
        setCurrentHoverCandle(historical[historical.length - 1]);
      }
      applyCandleDataToSeries(historical, true);
      setDataVersion(v => v + 1);
    };

    loadData();

    const unsubscribe = marketDataService.subscribeKline(
      config.symbol,
      config.timeframe,
      (newCandle, isClosed) => {
        if (!isSubscribed) return;

        // 1. Immediately update Lightweight Charts series in WebGL (0ms React overhead)
        if (mainSeriesRef.current && (!overrideCandles || overrideCandles.length === 0)) {
          const formatted = formatSingleCandle(newCandle, config.chartType);
          mainSeriesRef.current.update(formatted);
          if (config.chartType === 'volume-footprint' || config.chartType === 'volume-candle') {
            requestRedraw();
          }
        }

        // 2. Synchronously update in-memory candles array without allocating a new array on every micro tick
        const arr = candlesRef.current;
        let isNewBar = false;
        if (arr.length === 0) {
          candlesRef.current = [newCandle];
          isNewBar = true;
        } else {
          const lastIdx = arr.length - 1;
          if (arr[lastIdx].time === newCandle.time) {
            arr[lastIdx] = newCandle;
          } else if (newCandle.time > arr[lastIdx].time) {
            arr.push(newCandle);
            isNewBar = true;
          }
        }

        // 3. High-performance throttling: React state only updates on bar close or throttled to max 1x/sec
        const now = Date.now();
        if (isNewBar || isClosed || now - lastStateUpdateRef.current > 1000) {
          lastStateUpdateRef.current = now;
          setCandles([...candlesRef.current]);
          if (isNewBar || isClosed) {
            setDataVersion(v => v + 1);
          }
        }
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [config.symbol, config.timeframe]);

  const onCandlesUpdateRef = useRef(onCandlesUpdate);
  useEffect(() => {
    onCandlesUpdateRef.current = onCandlesUpdate;
  });

  // Safely inform parent component of candle updates on dataVersion change, NOT on every intra-bar microsecond tick
  useEffect(() => {
    if (candles.length > 0) {
      onCandlesUpdateRef.current?.(candles);
    }
  }, [dataVersion]);

  // Handle Replay / overrideCandles
  useEffect(() => {
    if (overrideCandles && overrideCandles.length > 0) {
      applyCandleDataToSeries(overrideCandles);
      setCurrentHoverCandle(overrideCandles[overrideCandles.length - 1]);
      setDataVersion(v => v + 1);
    }
  }, [overrideCandles]);

  const applyCandleDataToSeries = (candleList: CandleData[], fitContent: boolean = false) => {
    if (!mainSeriesRef.current || candleList.length === 0) return;

    let displayList = candleList;
    if (config.chartType === 'heikin-ashi') {
      displayList = calculateHeikinAshi(candleList);
    } else if (config.chartType === 'renko') {
      displayList = calculateRenko(candleList);
    } else if (config.chartType === 'line-break') {
      displayList = calculateThreeLineBreak(candleList);
    }

    if (config.chartType === 'line' || config.chartType === 'area' || config.chartType === 'baseline' || config.chartType === 'step-line' || config.chartType === 'line-with-markers') {
      const lineData: LineData[] = displayList.map(c => ({ time: c.time as Time, value: c.close }));
      mainSeriesRef.current.setData(lineData);
    } else {
      const barData: CandlestickData[] = displayList.map(c => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      mainSeriesRef.current.setData(barData);
    }

    if (fitContent) {
      const totalBars = displayList.length;
      const isOrderFlow = config.chartType === 'volume-footprint' || config.chartType === 'volume-candle';
      const prevRange = savedLogicalRangeRef.current;
      const prevSpan = prevRange ? (prevRange.to - prevRange.from) : Infinity;

      if (prevRange && (!isOrderFlow || prevSpan <= 80)) {
        chartRef.current?.timeScale().setVisibleLogicalRange(prevRange);
      } else if (isOrderFlow) {
        const targetRange = {
          from: Math.max(0, totalBars - 32),
          to: totalBars + 2,
        };
        savedLogicalRangeRef.current = targetRange;
        chartRef.current?.timeScale().setVisibleLogicalRange(targetRange);
      } else {
        chartRef.current?.timeScale().fitContent();
      }
    }
    redrawDrawings();
  };

  const formatSingleCandle = (c: CandleData, type: ChartType) => {
    if (type === 'line' || type === 'area' || type === 'baseline' || type === 'step-line' || type === 'line-with-markers') {
      return { time: c.time as Time, value: c.close };
    }
    return {
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    };
  };

  // Render Overlay Indicators only on Main Chart
  useEffect(() => {
    if (!chartRef.current || activeCandles.length === 0) return;

    // Clean old overlay indicators
    indicatorSeriesRef.current.forEach((seriesList) => {
      seriesList.forEach((s) => {
        try { chartRef.current?.removeSeries(s); } catch (_) {}
      });
    });
    indicatorSeriesRef.current.clear();
    overlayValueMapsRef.current.clear();

    for (const ind of overlayIndicators) {
      if (!ind.visible) continue;
      const seriesList: ISeriesApi<any>[] = [];
      const vMap = new Map<number, string>();

      const tfSuffix = (ind.timeframe && ind.timeframe !== 'chart' && ind.timeframe !== config.timeframe)
        ? ` (${ind.timeframe.toUpperCase()})`
        : '';
      const calcMtf = <T extends { time: number }>(fn: (c: CandleData[]) => T[]) => {
        return computeWithMtf(activeCandles, config.timeframe, ind.timeframe, fn);
      };

      switch (ind.type) {
        case 'CustomPython':
        case 'CustomPine': {
          let plots = ind.customPlots;
          if (ind.pythonCode) {
            try {
              const executed = executePythonScript(ind.pythonCode, activeCandles, ind.params);
              if (executed.success && executed.plots.length > 0) {
                plots = executed.plots;
              }
            } catch (_) {}
          } else if (ind.pineCode) {
            try {
              const executed = executePineScript(ind.pineCode, activeCandles, ind.params);
              if (executed.success && executed.plots.length > 0) {
                plots = executed.plots;
              }
            } catch (_) {}
          }
          if (plots) {
            for (const p of plots) {
              const cleanData: { time: Time; value: number }[] = [];
              let lastT = -Infinity;
              for (const pt of p.values) {
                if (pt.time > lastT && !isNaN(pt.value) && isFinite(pt.value)) {
                  cleanData.push({ time: pt.time as Time, value: pt.value });
                  lastT = pt.time;
                }
              }

              const s = chartRef.current.addSeries(LineSeries, {
                color: p.color || '#2962ff',
                lineWidth: (p.lineWidth as any) || 2,
                title: `${p.title}${tfSuffix}`,
              });
              s.setData(cleanData);
              seriesList.push(s);
              cleanData.forEach(d => vMap.set(d.time as number, d.value.toFixed(2)));
            }
          }
          break;
        }

        case 'SMA': {
          const period = Number(ind.params.period || 20);
          const data = calcMtf(c => calculateSMA(c, period));
          data.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, {
            color: ind.styles.line?.color || '#2962ff',
            lineWidth: (ind.styles.line?.lineWidth as any) || 2,
            title: `SMA ${period}${tfSuffix}`,
          });
          s.setData(data.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'EMA': {
          const period = Number(ind.params.period || 50);
          const data = calcMtf(c => calculateEMA(c, period));
          data.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, {
            color: ind.styles.line?.color || '#ff9800',
            lineWidth: (ind.styles.line?.lineWidth as any) || 2,
            title: `EMA ${period}${tfSuffix}`,
          });
          s.setData(data.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'WMA': {
          const period = Number(ind.params.period || 20);
          const data = calcMtf(c => calculateWMA(c, period));
          data.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, {
            color: ind.styles.line?.color || '#e040fb',
            lineWidth: (ind.styles.line?.lineWidth as any) || 2,
            title: `WMA ${period}${tfSuffix}`,
          });
          s.setData(data.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'BollingerBands': {
          const period = Number(ind.params.period || 20);
          const mult = Number(ind.params.multiplier || 2);
          const bb = calcMtf(c => calculateBollingerBands(c, period, mult));
          bb.forEach(d => vMap.set(d.time, `Mid: ${d.middle.toFixed(2)} Up: ${d.upper.toFixed(2)} Low: ${d.lower.toFixed(2)}`));

          if (ind.styles.upper?.visible !== false) {
            const upper = chartRef.current.addSeries(LineSeries, {
              color: ind.styles.upper?.color || '#26a69a',
              lineWidth: (ind.styles.upper?.lineWidth ?? 1) as any,
              lineStyle: (ind.styles.upper?.lineStyle ?? 0) as any,
              title: `BB Upper${tfSuffix}`,
            });
            upper.setData(bb.map(d => ({ time: d.time as Time, value: d.upper })));
            seriesList.push(upper);
          }

          if (ind.styles.middle?.visible !== false) {
            const mid = chartRef.current.addSeries(LineSeries, {
              color: ind.styles.middle?.color || '#ff9800',
              lineWidth: (ind.styles.middle?.lineWidth ?? 1) as any,
              lineStyle: (ind.styles.middle?.lineStyle ?? 0) as any,
              title: `BB Mid${tfSuffix}`,
            });
            mid.setData(bb.map(d => ({ time: d.time as Time, value: d.middle })));
            seriesList.push(mid);
          }

          if (ind.styles.lower?.visible !== false) {
            const lower = chartRef.current.addSeries(LineSeries, {
              color: ind.styles.lower?.color || '#ef5350',
              lineWidth: (ind.styles.lower?.lineWidth ?? 1) as any,
              lineStyle: (ind.styles.lower?.lineStyle ?? 0) as any,
              title: `BB Lower${tfSuffix}`,
            });
            lower.setData(bb.map(d => ({ time: d.time as Time, value: d.lower })));
            seriesList.push(lower);
          }
          break;
        }

        case 'Supertrend': {
          const period = Number(ind.params.period || 10);
          const mult = Number(ind.params.multiplier || 3);
          const st = calcMtf(c => calculateSupertrend(c, period, mult));
          st.forEach(d => vMap.set(d.time, d.value.toFixed(2)));

          const s = chartRef.current.addSeries(LineSeries, {
            color: ind.styles.bullish?.color || '#089981',
            lineWidth: 2,
            title: `ST (${period},${mult})${tfSuffix}`,
          });
          s.setData(st.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'VWAP': {
          const vwap = calcMtf(c => calculateVWAP(c));
          vwap.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, {
            color: ind.styles.line?.color || '#fbc02d',
            lineWidth: 2,
            title: `VWAP${tfSuffix}`,
          });
          s.setData(vwap.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'Ichimoku': {
          const ichi = calcMtf(c => calculateIchimoku(c, Number(ind.params.tenkan || 9), Number(ind.params.kijun || 26), Number(ind.params.spanB || 52)));
          ichi.forEach(d => vMap.set(d.time, `Tenkan: ${d.tenkan?.toFixed(2) ?? '-'} Kijun: ${d.kijun?.toFixed(2) ?? '-'}`));
          const tenkanS = chartRef.current.addSeries(LineSeries, { color: ind.styles.tenkan?.color || '#2962ff', lineWidth: 1, title: `Tenkan${tfSuffix}` });
          const kijunS = chartRef.current.addSeries(LineSeries, { color: ind.styles.kijun?.color || '#f23645', lineWidth: 1, title: `Kijun${tfSuffix}` });
          const spanAS = chartRef.current.addSeries(LineSeries, { color: ind.styles.spanA?.color || '#089981', lineWidth: 1, title: `Span A${tfSuffix}` });
          const spanBS = chartRef.current.addSeries(LineSeries, { color: ind.styles.spanB?.color || '#ff9800', lineWidth: 1, title: `Span B${tfSuffix}` });

          tenkanS.setData(ichi.map(d => ({ time: d.time as Time, value: d.tenkan })));
          kijunS.setData(ichi.map(d => ({ time: d.time as Time, value: d.kijun })));
          spanAS.setData(ichi.map(d => ({ time: d.time as Time, value: d.spanA })));
          spanBS.setData(ichi.map(d => ({ time: d.time as Time, value: d.spanB })));

          seriesList.push(tenkanS, kijunS, spanAS, spanBS);
          break;
        }

        case 'ParabolicSAR': {
          const sar = calcMtf(c => calculateParabolicSAR(c, Number(ind.params.startAF || 0.02), 0.02, Number(ind.params.maxAF || 0.2)));
          sar.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const sarSeries = chartRef.current.addSeries(LineSeries, {
            color: ind.styles.dot?.color || '#ab47bc',
            lineWidth: 1,
            title: `SAR${tfSuffix}`,
          });
          sarSeries.setData(sar.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(sarSeries);
          break;
        }

        case 'KeltnerChannels': {
          const kc = calcMtf(c => calculateKeltnerChannels(c, Number(ind.params.emaPeriod || 20), Number(ind.params.atrPeriod || 10), Number(ind.params.multiplier || 2)));
          kc.forEach(d => vMap.set(d.time, `Mid: ${d.middle.toFixed(2)} Up: ${d.upper.toFixed(2)} Low: ${d.lower.toFixed(2)}`));
          const up = chartRef.current.addSeries(LineSeries, { color: ind.styles.upper?.color || '#00bcd4', lineWidth: 1, title: `KC Upper${tfSuffix}` });
          const mid = chartRef.current.addSeries(LineSeries, { color: ind.styles.middle?.color || '#ff9800', lineWidth: 1, title: `KC Mid${tfSuffix}` });
          const low = chartRef.current.addSeries(LineSeries, { color: ind.styles.lower?.color || '#00bcd4', lineWidth: 1, title: `KC Lower${tfSuffix}` });

          up.setData(kc.map(d => ({ time: d.time as Time, value: d.upper })));
          mid.setData(kc.map(d => ({ time: d.time as Time, value: d.middle })));
          low.setData(kc.map(d => ({ time: d.time as Time, value: d.lower })));

          seriesList.push(up, mid, low);
          break;
        }

        case 'Donchian': {
          const dc = calculateDonchianChannels(activeCandles, Number(ind.params.period || 20));
          dc.forEach(d => vMap.set(d.time, `Mid: ${d.middle.toFixed(2)} Up: ${d.upper.toFixed(2)} Low: ${d.lower.toFixed(2)}`));
          const up = chartRef.current.addSeries(LineSeries, { color: ind.styles.upper?.color || '#2962ff', lineWidth: 1, title: 'DC Upper' });
          const mid = chartRef.current.addSeries(LineSeries, { color: ind.styles.middle?.color || '#ff9800', lineWidth: 1, title: 'DC Mid' });
          const low = chartRef.current.addSeries(LineSeries, { color: ind.styles.lower?.color || '#2962ff', lineWidth: 1, title: 'DC Lower' });

          up.setData(dc.map(d => ({ time: d.time as Time, value: d.upper })));
          mid.setData(dc.map(d => ({ time: d.time as Time, value: d.middle })));
          low.setData(dc.map(d => ({ time: d.time as Time, value: d.lower })));

          seriesList.push(up, mid, low);
          break;
        }

        case 'HMA': {
          const period = Number(ind.params.period || 20);
          const hma = calculateHMA(activeCandles, period);
          hma.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#00e5ff', lineWidth: 2, title: `HMA ${period}` });
          s.setData(hma.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'PivotPoints': {
          const piv = calculatePivotPoints(activeCandles);
          piv.forEach(d => vMap.set(d.time, `P: ${d.p.toFixed(2)} R1: ${d.r1.toFixed(2)} S1: ${d.s1.toFixed(2)}`));
          const pLine = chartRef.current.addSeries(LineSeries, { color: '#fbc02d', lineWidth: 1, title: 'P' });
          const r1Line = chartRef.current.addSeries(LineSeries, { color: '#f23645', lineWidth: 1, title: 'R1' });
          const s1Line = chartRef.current.addSeries(LineSeries, { color: '#089981', lineWidth: 1, title: 'S1' });

          pLine.setData(piv.map(d => ({ time: d.time as Time, value: d.p })));
          r1Line.setData(piv.map(d => ({ time: d.time as Time, value: d.r1 })));
          s1Line.setData(piv.map(d => ({ time: d.time as Time, value: d.s1 })));

          seriesList.push(pLine, r1Line, s1Line);
          break;
        }

        case 'DEMA': {
          const period = Number(ind.params.period || 20);
          const dema = calculateDEMA(activeCandles, period);
          dema.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#ab47bc', lineWidth: 2, title: `DEMA ${period}` });
          s.setData(dema.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'TEMA': {
          const period = Number(ind.params.period || 20);
          const tema = calculateTEMA(activeCandles, period);
          tema.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#00e676', lineWidth: 2, title: `TEMA ${period}` });
          s.setData(tema.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'VWMA': {
          const period = Number(ind.params.period || 20);
          const vwma = calculateVWMA(activeCandles, period);
          vwma.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#fbc02d', lineWidth: 2, title: `VWMA ${period}` });
          s.setData(vwma.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'Envelopes': {
          const period = Number(ind.params.period || 20);
          const pct = Number(ind.params.percent || 5);
          const env = calculateEnvelopes(activeCandles, period, pct);
          env.forEach(d => vMap.set(d.time, `Mid: ${d.middle.toFixed(2)} Up: ${d.upper.toFixed(2)} Low: ${d.lower.toFixed(2)}`));
          const up = chartRef.current.addSeries(LineSeries, { color: ind.styles.upper?.color || '#2962ff', lineWidth: 1, title: 'ENV Upper' });
          const mid = chartRef.current.addSeries(LineSeries, { color: ind.styles.middle?.color || '#ff9800', lineWidth: 1, title: 'ENV Mid' });
          const low = chartRef.current.addSeries(LineSeries, { color: ind.styles.lower?.color || '#2962ff', lineWidth: 1, title: 'ENV Lower' });
          up.setData(env.map(d => ({ time: d.time as Time, value: d.upper })));
          mid.setData(env.map(d => ({ time: d.time as Time, value: d.middle })));
          low.setData(env.map(d => ({ time: d.time as Time, value: d.lower })));
          seriesList.push(up, mid, low);
          break;
        }

        case 'ZigZag': {
          const dev = Number(ind.params.deviation || 5);
          const zz = calculateZigZag(activeCandles, dev);
          zz.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#ffeb3b', lineWidth: 2, title: `ZigZag ${dev}%` });
          s.setData(zz.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'SMMA': {
          const period = Number(ind.params.period || 14);
          const smma = calculateSMMA(activeCandles, period);
          smma.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#ffd600', lineWidth: 2, title: `SMMA ${period}` });
          s.setData(smma.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'ALMA': {
          const period = Number(ind.params.period || 9);
          const offset = Number(ind.params.offset || 0.85);
          const sigma = Number(ind.params.sigma || 6);
          const alma = calculateALMA(activeCandles, period, offset, sigma);
          alma.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#ff4081', lineWidth: 2, title: `ALMA ${period}` });
          s.setData(alma.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'LSMA': {
          const period = Number(ind.params.period || 25);
          const lsma = calculateLSMA(activeCandles, period);
          lsma.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#26c6da', lineWidth: 2, title: `LSMA ${period}` });
          s.setData(lsma.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'McGinleyDynamic': {
          const period = Number(ind.params.period || 14);
          const md = calculateMcGinleyDynamic(activeCandles, period);
          md.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#ff4081', lineWidth: 2, title: `MD ${period}` });
          s.setData(md.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'LinearRegressionCurve': {
          const period = Number(ind.params.period || 14);
          const lr = calculateLinearRegressionCurve(activeCandles, period);
          lr.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#7c4dff', lineWidth: 2, title: `LinReg ${period}` });
          s.setData(lr.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'StandardErrorBands': {
          const period = Number(ind.params.period || 20);
          const mult = Number(ind.params.mult || 2);
          const bands = calculateStandardErrorBands(activeCandles, period, mult);
          bands.forEach(d => vMap.set(d.time, `Mid: ${d.middle.toFixed(2)} Up: ${d.upper.toFixed(2)} Low: ${d.lower.toFixed(2)}`));
          const up = chartRef.current.addSeries(LineSeries, { color: ind.styles.upper?.color || '#ff6e40', lineWidth: 1, title: 'SE Upper' });
          const mid = chartRef.current.addSeries(LineSeries, { color: ind.styles.middle?.color || '#7c4dff', lineWidth: 2, title: 'SE Mid' });
          const low = chartRef.current.addSeries(LineSeries, { color: ind.styles.lower?.color || '#ff6e40', lineWidth: 1, title: 'SE Lower' });
          up.setData(bands.map(d => ({ time: d.time as Time, value: d.upper })));
          mid.setData(bands.map(d => ({ time: d.time as Time, value: d.middle })));
          low.setData(bands.map(d => ({ time: d.time as Time, value: d.lower })));
          seriesList.push(up, mid, low);
          break;
        }

        case 'ChandeKrollStop': {
          const p = Number(ind.params.p || 10);
          const x = Number(ind.params.x || 1);
          const q = Number(ind.params.q || 9);
          const cks = calculateChandeKrollStop(activeCandles, p, x, q);
          cks.forEach(d => vMap.set(d.time, `Long: ${d.stopLong.toFixed(2)} Short: ${d.stopShort.toFixed(2)}`));
          const longStop = chartRef.current.addSeries(LineSeries, { color: ind.styles.stopLong?.color || '#00e676', lineWidth: 2, title: 'CK Long' });
          const shortStop = chartRef.current.addSeries(LineSeries, { color: ind.styles.stopShort?.color || '#ff5252', lineWidth: 2, title: 'CK Short' });
          longStop.setData(cks.map(d => ({ time: d.time as Time, value: d.stopLong })));
          shortStop.setData(cks.map(d => ({ time: d.time as Time, value: d.stopShort })));
          seriesList.push(longStop, shortStop);
          break;
        }

        case 'AveragePrice': {
          const avg = calculateAveragePrice(activeCandles);
          avg.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#ffd700', lineWidth: 2, title: 'Avg Price' });
          s.setData(avg.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'TypicalPrice': {
          const typ = calculateTypicalPrice(activeCandles);
          typ.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#69f0ae', lineWidth: 2, title: 'Typ Price' });
          s.setData(typ.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'MedianPrice': {
          const med = calculateMedianPrice(activeCandles);
          med.forEach(d => vMap.set(d.time, d.value.toFixed(2)));
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.line?.color || '#40c4ff', lineWidth: 2, title: 'Med Price' });
          s.setData(med.map(d => ({ time: d.time as Time, value: d.value })));
          seriesList.push(s);
          break;
        }

        case 'GuppyMMA': {
          const gmma = calculateGuppyMMA(activeCandles);
          if (gmma.length > 0) {
            gmma.forEach(d => vMap.set(d.time, `Fast: ${d.shortMAs[0].toFixed(2)} Slow: ${d.longMAs[0].toFixed(2)}`));
            // Trader group
            gmma[0].shortMAs.forEach((_, idx) => {
              const s = chartRef.current!.addSeries(LineSeries, { color: 'rgba(0, 229, 255, 0.7)', lineWidth: 1, title: `GMMA T${idx + 1}` });
              s.setData(gmma.map(d => ({ time: d.time as Time, value: d.shortMAs[idx] })));
              seriesList.push(s);
            });
            // Investor group
            gmma[0].longMAs.forEach((_, idx) => {
              const s = chartRef.current!.addSeries(LineSeries, { color: 'rgba(255, 61, 0, 0.7)', lineWidth: 1, title: `GMMA I${idx + 1}` });
              s.setData(gmma.map(d => ({ time: d.time as Time, value: d.longMAs[idx] })));
              seriesList.push(s);
            });
          }
          break;
        }

        case 'EMACross': {
          const fast = Number(ind.params.fast || 9);
          const slow = Number(ind.params.slow || 21);
          const cross = calculateEMACross(activeCandles, fast, slow);
          cross.forEach(d => vMap.set(d.time, `Fast: ${d.fast.toFixed(2)} Slow: ${d.slow.toFixed(2)}`));
          const f = chartRef.current.addSeries(LineSeries, { color: ind.styles.fast?.color || '#00e676', lineWidth: 2, title: `Fast EMA ${fast}` });
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.slow?.color || '#ff1744', lineWidth: 2, title: `Slow EMA ${slow}` });
          f.setData(cross.map(d => ({ time: d.time as Time, value: d.fast })));
          s.setData(cross.map(d => ({ time: d.time as Time, value: d.slow })));
          seriesList.push(f, s);
          break;
        }

        case 'MACross': {
          const fast = Number(ind.params.fast || 50);
          const slow = Number(ind.params.slow || 200);
          const cross = calculateMACross(activeCandles, fast, slow);
          cross.forEach(d => vMap.set(d.time, `Fast: ${d.fast.toFixed(2)} Slow: ${d.slow.toFixed(2)}`));
          const f = chartRef.current.addSeries(LineSeries, { color: ind.styles.fast?.color || '#ffd600', lineWidth: 2, title: `SMA ${fast}` });
          const s = chartRef.current.addSeries(LineSeries, { color: ind.styles.slow?.color || '#d500f9', lineWidth: 2, title: `SMA ${slow}` });
          f.setData(cross.map(d => ({ time: d.time as Time, value: d.fast })));
          s.setData(cross.map(d => ({ time: d.time as Time, value: d.slow })));
          seriesList.push(f, s);
          break;
        }

        case 'MovingAverageChannel': {
          const length = Number(ind.params.length || 20);
          const mac = calculateMovingAverageChannel(activeCandles, length);
          mac.forEach(d => vMap.set(d.time, `Up: ${d.upper.toFixed(2)} Low: ${d.lower.toFixed(2)}`));
          const up = chartRef.current.addSeries(LineSeries, { color: ind.styles.upper?.color || '#00e676', lineWidth: 1, title: 'MAC High' });
          const low = chartRef.current.addSeries(LineSeries, { color: ind.styles.lower?.color || '#ff1744', lineWidth: 1, title: 'MAC Low' });
          up.setData(mac.map(d => ({ time: d.time as Time, value: d.upper })));
          low.setData(mac.map(d => ({ time: d.time as Time, value: d.lower })));
          seriesList.push(up, low);
          break;
        }

        case 'PriceChannel': {
          const period = Number(ind.params.period || 20);
          const pc = calculatePriceChannel(activeCandles, period);
          pc.forEach(d => vMap.set(d.time, `Mid: ${d.middle.toFixed(2)} Up: ${d.upper.toFixed(2)} Low: ${d.lower.toFixed(2)}`));
          const up = chartRef.current.addSeries(LineSeries, { color: ind.styles.upper?.color || '#26c6da', lineWidth: 1, title: 'PC Upper' });
          const mid = chartRef.current.addSeries(LineSeries, { color: ind.styles.middle?.color || '#ff9800', lineWidth: 1, title: 'PC Mid' });
          const low = chartRef.current.addSeries(LineSeries, { color: ind.styles.lower?.color || '#26c6da', lineWidth: 1, title: 'PC Lower' });
          up.setData(pc.map(d => ({ time: d.time as Time, value: d.upper })));
          mid.setData(pc.map(d => ({ time: d.time as Time, value: d.middle })));
          low.setData(pc.map(d => ({ time: d.time as Time, value: d.lower })));
          seriesList.push(up, mid, low);
          break;
        }
      }

      if (seriesList.length > 0) {
        indicatorSeriesRef.current.set(ind.id, seriesList);
        overlayValueMapsRef.current.set(ind.id, vMap);
      }
    }
  }, [overlayIndicators, dataVersion, config.symbol, config.timeframe]);

  // Handle Overlay Comparison Symbol
  useEffect(() => {
    if (!chartRef.current) return;

    if (overlaySeriesRef.current) {
      try { chartRef.current.removeSeries(overlaySeriesRef.current); } catch (_) {}
      overlaySeriesRef.current = null;
    }

    if (!config.overlaySymbol) return;

    let isMounted = true;
    const fetchOverlay = async () => {
      const data = await marketDataService.fetchHistoricalCandles(config.overlaySymbol!, config.timeframe, 500);
      if (!isMounted || !chartRef.current) return;

      const series = chartRef.current.addSeries(LineSeries, {
        color: '#ff9800',
        lineWidth: 2,
        priceScaleId: 'overlay_scale',
        title: config.overlaySymbol,
      });

      chartRef.current.priceScale('overlay_scale').applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.1 },
      });

      series.setData(data.map(d => ({ time: d.time as Time, value: d.close })));
      overlaySeriesRef.current = series;
    };

    fetchOverlay();

    return () => {
      isMounted = false;
      if (overlaySeriesRef.current && chartRef.current) {
        try { chartRef.current.removeSeries(overlaySeriesRef.current); } catch (_) {}
        overlaySeriesRef.current = null;
      }
    };
  }, [config.overlaySymbol, config.timeframe]);

  // Handle Screenshot
  useEffect(() => {
    if (!screenshotTrigger || !chartRef.current) return;
    try {
      const canvas = chartRef.current.takeScreenshot();
      const link = document.createElement('a');
      link.download = `${config.symbol}_${config.timeframe}_chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Screenshot failed', e);
    }
  }, [screenshotTrigger, config.symbol, config.timeframe]);

  // Robust Drawing Coordinate Calculation
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getSnappedPoint = (x: number, y: number): DrawingPoint | null => {
    if (!chartRef.current || !mainSeriesRef.current) return null;
    const conv = createViewportConverter(chartRef.current, mainSeriesRef.current, activeCandles);

    if (magnetMode) {
      const snapped = snapToNearestCandlePoint(x, y, activeCandles, conv);
      if (snapped) return snapped;
    }

    const time = conv.xToTime(x);
    const price = conv.yToPrice(y);
    if (time === null || price === null) return null;
    return { time, price };
  };

  // Hit-testing drawing at screen coordinate
  const checkDrawingHitAt = useCallback((clientX: number, clientY: number): DrawingElement | null => {
    if (!chartRef.current || !mainSeriesRef.current || !canvasRef.current) return null;
    if (!config.drawings || config.drawings.length === 0) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const conv = createViewportConverter(chartRef.current, mainSeriesRef.current, activeCandlesRef.current);
    return findHitDrawing(config.drawings, x, y, conv);
  }, [config.drawings]);

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check right price scale hover for Quick (+) button
    if (x >= rect.width - 65 && x <= rect.width && y >= 30 && y <= rect.height - 30) {
      if (chartRef.current && mainSeriesRef.current) {
        const conv = createViewportConverter(chartRef.current, mainSeriesRef.current, activeCandlesRef.current);
        const p = conv.yToPrice(y);
        if (p !== null && p > 0) {
          setHoverPriceScale({ y, price: Number(p.toFixed(2)) });
        }
      }
    } else {
      if (hoverPriceScale !== null && !plusMenu) {
        setHoverPriceScale(null);
      }
    }

    if (isDrawingRef.current || draggingPaperLine || draggingAlertLine) return;

    // Check paper position hits (close button, tp line, sl line, add tp/sl)
    const hits = paperLineHitsRef.current;
    let foundPaperHit: { type: 'close' | 'tp' | 'sl' | 'add_tp' | 'add_sl'; posId: string } | null = null;

    for (const b of hits.closeButtons) {
      if (x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y - 3 && y <= b.y + b.h + 3) {
        foundPaperHit = { type: 'close', posId: b.posId };
        break;
      }
    }
    if (!foundPaperHit) {
      for (const b of hits.addTpHits) {
        if (x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2) {
          foundPaperHit = { type: 'add_tp', posId: b.posId };
          break;
        }
      }
    }
    if (!foundPaperHit) {
      for (const b of hits.addSlHits) {
        if (x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2) {
          foundPaperHit = { type: 'add_sl', posId: b.posId };
          break;
        }
      }
    }
    if (!foundPaperHit) {
      for (const t of hits.tpLines) {
        if (Math.abs(y - t.y) <= 8 && x <= rect.width - 55) {
          foundPaperHit = { type: 'tp', posId: t.posId };
          break;
        }
      }
    }
    if (!foundPaperHit) {
      for (const s of hits.slLines) {
        if (Math.abs(y - s.y) <= 8 && x <= rect.width - 55) {
          foundPaperHit = { type: 'sl', posId: s.posId };
          break;
        }
      }
    }

    setHoveredPaperHit(foundPaperHit);

    // Check alert line & close button hits
    const alertHits = alertLineHitsRef.current;
    let foundAlertHit: { type: 'close' | 'line'; alertId: string } | null = null;
    for (const b of alertHits.closeButtons) {
      if (x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y - 3 && y <= b.y + b.h + 3) {
        foundAlertHit = { type: 'close', alertId: b.alertId };
        break;
      }
    }
    if (!foundAlertHit) {
      for (const l of alertHits.lines) {
        if (Math.abs(y - l.y) <= 8 && x <= rect.width - 55) {
          foundAlertHit = { type: 'line', alertId: l.alertId };
          break;
        }
      }
    }
    setHoveredAlertHit(foundAlertHit);

    if (['cursor', 'crosshair', 'dot'].includes(activeDrawingTool)) {
      const hit = checkDrawingHitAt(e.clientX, e.clientY);
      if (hit) {
        if (hoveredDrawingId !== hit.id) {
          setHoveredDrawingId(hit.id);
        }
      } else {
        if (hoveredDrawingId !== null) {
          setHoveredDrawingId(null);
        }
      }
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (isDrawingRef.current || draggingPaperLine || draggingAlertLine) return;
    const hit = checkDrawingHitAt(e.clientX, e.clientY);
    if (hit) {
      soundService.playClickSound();
      setSelectedDrawingId(hit.id);
      redrawDrawings();
    } else if (selectedDrawingId) {
      setSelectedDrawingId(null);
      setHoveredDrawingId(null);
      redrawDrawings();
    }
  };

  // Drawing & Paper Trading Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    onActivate();
    const { x, y } = getCanvasCoords(e);
    dragStartScreenRef.current = { x, y };

    // Handle Price Alert interactions (delete, drag line)
    if (hoveredAlertHit) {
      const alert = alerts?.find(a => a.id === hoveredAlertHit.alertId);
      if (alert) {
        if (hoveredAlertHit.type === 'close') {
          soundService.playClickSound();
          onDeleteAlert?.(alert.id);
          setHoveredAlertHit(null);
          return;
        }
        if (hoveredAlertHit.type === 'line') {
          soundService.playClickSound();
          setDraggingAlertLine({ alertId: alert.id, price: alert.targetPrice });
          return;
        }
      }
    }

    // Handle Paper Trading interactions (close, add TP/SL, drag TP/SL)
    if (hoveredPaperHit) {
      const pos = paperPositions?.find(p => p.id === hoveredPaperHit.posId);
      if (pos) {
        if (hoveredPaperHit.type === 'close') {
          soundService.playClickSound();
          onClosePaperPosition?.(pos.id);
          setHoveredPaperHit(null);
          return;
        }
        if (hoveredPaperHit.type === 'add_tp') {
          soundService.playClickSound();
          const targetTp = pos.side === 'long' 
            ? Number((pos.entryPrice * 1.03).toFixed(2)) 
            : Number((pos.entryPrice * 0.97).toFixed(2));
          onUpdatePaperPosition?.(pos.id, { takeProfit: targetTp });
          setDraggingPaperLine({ posId: pos.id, type: 'tp', price: targetTp });
          return;
        }
        if (hoveredPaperHit.type === 'add_sl') {
          soundService.playClickSound();
          const targetSl = pos.side === 'long' 
            ? Number((pos.entryPrice * 0.985).toFixed(2)) 
            : Number((pos.entryPrice * 1.015).toFixed(2));
          onUpdatePaperPosition?.(pos.id, { stopLoss: targetSl });
          setDraggingPaperLine({ posId: pos.id, type: 'sl', price: targetSl });
          return;
        }
        if (hoveredPaperHit.type === 'tp') {
          soundService.playClickSound();
          setDraggingPaperLine({ posId: pos.id, type: 'tp', price: pos.takeProfit || pos.entryPrice });
          return;
        }
        if (hoveredPaperHit.type === 'sl') {
          soundService.playClickSound();
          setDraggingPaperLine({ posId: pos.id, type: 'sl', price: pos.stopLoss || pos.entryPrice });
          return;
        }
      }
    }

    // Replay Jump / Cut to clicked bar
    if (isReplayJumpMode && chartRef.current && mainSeriesRef.current) {
      const conv = createViewportConverter(chartRef.current, mainSeriesRef.current, activeCandles);
      const clickedTime = conv.xToTime(x);
      if (clickedTime) {
        soundService.playClickSound();
        onReplayJumpToTime?.(clickedTime);
        return;
      }
    }

    // Shift + Click / Drag: Instant Measure Ruler
    if (e.shiftKey || isShiftDown) {
      const snapPt = getSnappedPoint(x, y);
      if (snapPt) {
        soundService.playClickSound();
        onSelectDrawingTool?.('measure');
        currentDrawingTypeRef.current = 'measure';
        isDrawingRef.current = true;
        drawingStartPointRef.current = snapPt;
        setDrawingPreview({
          id: 'preview_measure',
          type: 'measure',
          points: [snapPt, snapPt],
          color: '#2962ff',
          lineWidth: 2,
        });
        return;
      }
    }

    if (activeDrawingTool === 'cursor' || activeDrawingTool === 'crosshair' || activeDrawingTool === 'dot') {
      if (chartRef.current && mainSeriesRef.current) {
        const conv = createViewportConverter(chartRef.current, mainSeriesRef.current, activeCandles);
        const hit = findHitDrawing(config.drawings, x, y, conv);
        if (hit) {
          soundService.playClickSound();
          setSelectedDrawingId(hit.id);
          redrawDrawings();
          return;
        }
      }
      setSelectedDrawingId(null);
      setHoveredDrawingId(null);
      redrawDrawings();
      return;
    }

    if (lockDrawings) {
      return;
    }

    // Eraser Tool
    if (activeDrawingTool === 'eraser') {
      if (!chartRef.current || !mainSeriesRef.current) return;
      const conv = createViewportConverter(chartRef.current, mainSeriesRef.current, activeCandles);
      const hit = findHitDrawing(config.drawings, x, y, conv);
      if (hit) {
        soundService.playClickSound();
        onUpdatePaneConfig({
          drawings: config.drawings.filter(d => d.id !== hit.id)
        });
        if (selectedDrawingId === hit.id) {
          setSelectedDrawingId(null);
        }
        setHoveredDrawingId(null);
      }
      return;
    }

    const point = getSnappedPoint(x, y);
    if (!point) return;

    soundService.playClickSound();
    currentDrawingTypeRef.current = activeDrawingTool;

    // 1-Point immediate drawings
    const isOnePointTool = [
      'horizontalLine', 'horizontalRay', 'verticalLine', 'crossLine', 'priceLabel', 'arrowUp', 'arrowDown', 'fibTimeZones'
    ].includes(activeDrawingTool);

    if (isOnePointTool) {
      const colorMap: Record<string, string> = {
        arrowUp: '#089981',
        arrowDown: '#f23645',
        priceLabel: '#2962ff',
        dot: '#ff9800',
        crossLine: '#787b86',
        horizontalRay: '#2962ff',
      };
      const newElement: DrawingElement = {
        id: `draw_${Date.now()}`,
        type: activeDrawingTool,
        points: [point],
        color: colorMap[activeDrawingTool] || '#2962ff',
        lineWidth: 2,
      };
      onUpdatePaneConfig({ drawings: [...config.drawings, newElement] });
      onDrawingComplete?.();
      return;
    }

    if (activeDrawingTool === 'text' || activeDrawingTool === 'anchoredText' || activeDrawingTool === 'callout') {
      const promptText = activeDrawingTool === 'callout' ? 'Baloncuk notu girin:' : 'Not metnini girin:';
      const text = prompt(promptText, 'Önemli Seviye');
      if (text) {
        const newElement: DrawingElement = {
          id: `draw_${Date.now()}`,
          type: activeDrawingTool,
          points: [point, { time: point.time + 3600, price: point.price * 1.01 }],
          color: '#ffffff',
          lineWidth: 1,
          text,
        };
        onUpdatePaneConfig({ drawings: [...config.drawings, newElement] });
        onDrawingComplete?.();
      }
      return;
    }

    if (activeDrawingTool === 'brush' || activeDrawingTool === 'highlighter') {
      isDrawingRef.current = true;
      brushPointsRef.current = [point];
      return;
    }

    // 2-Point drawings (trendLine, ray, extendedLine, infoLine, trendAngle, rectangle, circle, ellipse, triangle, measure, etc.)
    if (!isDrawingRef.current) {
      isDrawingRef.current = true;
      drawingStartPointRef.current = point;
      const toolToDraw = currentDrawingTypeRef.current || activeDrawingTool;
      setDrawingPreview({
        id: 'preview',
        type: toolToDraw,
        points: [point, point],
        color: toolToDraw === 'longPosition' ? '#089981' : toolToDraw === 'shortPosition' ? '#f23645' : '#2962ff',
        lineWidth: 2,
      });
    } else {
      // Second click: finish drawing
      if (drawingStartPointRef.current) {
        const toolToDraw: DrawingToolType = currentDrawingTypeRef.current || (activeDrawingTool as DrawingToolType) || 'measure';
        const newElement: DrawingElement = {
          id: `draw_${Date.now()}`,
          type: toolToDraw,
          points: [drawingStartPointRef.current, point],
          color: toolToDraw === 'longPosition' ? '#089981' : toolToDraw === 'shortPosition' ? '#f23645' : '#2962ff',
          lineWidth: 2,
        };
        onUpdatePaneConfig({ drawings: [...config.drawings, newElement] });
        soundService.playClickSound();
        onDrawingComplete?.();
      }
      isDrawingRef.current = false;
      drawingStartPointRef.current = null;
      currentDrawingTypeRef.current = null;
      dragStartScreenRef.current = null;
      setDrawingPreview(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 0. Draggable Alert Line update
    if (draggingAlertLine && chartRef.current && mainSeriesRef.current) {
      const { y } = getCanvasCoords(e);
      const conv = createViewportConverter(chartRef.current, mainSeriesRef.current, activeCandles);
      const newPrice = conv.yToPrice(y);
      if (newPrice !== null && newPrice > 0) {
        setDraggingAlertLine(prev => prev ? { ...prev, price: Number(newPrice.toFixed(2)) } : null);
      }
      return;
    }

    // 1. Draggable Paper TP/SL Line update
    if (draggingPaperLine && chartRef.current && mainSeriesRef.current) {
      const { y } = getCanvasCoords(e);
      const conv = createViewportConverter(chartRef.current, mainSeriesRef.current, activeCandles);
      const newPrice = conv.yToPrice(y);
      if (newPrice !== null && newPrice > 0) {
        setDraggingPaperLine(prev => prev ? { ...prev, price: Number(newPrice.toFixed(2)) } : null);
      }
      return;
    }

    if (!isDrawingRef.current) {
      if (['cursor', 'crosshair', 'dot'].includes(activeDrawingTool)) {
        const hit = checkDrawingHitAt(e.clientX, e.clientY);
        if (hit) {
          if (hoveredDrawingId !== hit.id) setHoveredDrawingId(hit.id);
        } else {
          if (hoveredDrawingId !== null) setHoveredDrawingId(null);
        }
      }
      return;
    }
    const { x, y } = getCanvasCoords(e);
    const point = getSnappedPoint(x, y);
    if (!point) return;

    if (activeDrawingTool === 'brush' || activeDrawingTool === 'highlighter') {
      brushPointsRef.current.push(point);
      setDrawingPreview({
        id: 'preview_brush',
        type: activeDrawingTool,
        points: [...brushPointsRef.current],
        color: activeDrawingTool === 'highlighter' ? '#ffd600' : '#ff9800',
        lineWidth: activeDrawingTool === 'highlighter' ? 12 : 2,
      });
      return;
    }

    if (drawingStartPointRef.current) {
      const toolToDraw: DrawingToolType = currentDrawingTypeRef.current || (activeDrawingTool as DrawingToolType) || 'measure';
      setDrawingPreview({
        id: 'preview',
        type: toolToDraw,
        points: [drawingStartPointRef.current, point],
        color: toolToDraw === 'longPosition' ? '#089981' : toolToDraw === 'shortPosition' ? '#f23645' : '#2962ff',
        lineWidth: 2,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 0. Finish dragging Alert line
    if (draggingAlertLine) {
      const alert = alerts?.find(a => a.id === draggingAlertLine.alertId);
      if (alert && draggingAlertLine.price !== alert.targetPrice) {
        soundService.playClickSound();
        onUpdateAlert?.({
          ...alert,
          targetPrice: draggingAlertLine.price,
          triggered: false
        });
      }
      setDraggingAlertLine(null);
      return;
    }

    // 1. Finish dragging TP/SL line
    if (draggingPaperLine) {
      soundService.playClickSound();
      onUpdatePaperPosition?.(
        draggingPaperLine.posId,
        draggingPaperLine.type === 'tp'
          ? { takeProfit: draggingPaperLine.price }
          : { stopLoss: draggingPaperLine.price }
      );
      setDraggingPaperLine(null);
      return;
    }

    const { x, y } = getCanvasCoords(e);

    // If brush or highlighter
    if ((activeDrawingTool === 'brush' || activeDrawingTool === 'highlighter') && isDrawingRef.current) {
      if (brushPointsRef.current.length > 1) {
        const newElement: DrawingElement = {
          id: `draw_${Date.now()}`,
          type: activeDrawingTool,
          points: [...brushPointsRef.current],
          color: activeDrawingTool === 'highlighter' ? '#ffd600' : '#ff9800',
          lineWidth: activeDrawingTool === 'highlighter' ? 12 : 2,
        };
        onUpdatePaneConfig({ drawings: [...config.drawings, newElement] });
        onDrawingComplete?.();
      }
      isDrawingRef.current = false;
      brushPointsRef.current = [];
      setDrawingPreview(null);
      return;
    }

    // Check if user did a Drag-and-Release (Shift+Drag or Click-Drag)
    if (isDrawingRef.current && drawingStartPointRef.current && dragStartScreenRef.current) {
      const dist = Math.hypot(x - dragStartScreenRef.current.x, y - dragStartScreenRef.current.y);
      if (dist > 15) {
        // Dragged across chart: complete drawing immediately!
        const point = getSnappedPoint(x, y);
        if (point) {
          const toolToDraw: DrawingToolType = currentDrawingTypeRef.current || (activeDrawingTool as DrawingToolType) || 'measure';
          const newElement: DrawingElement = {
            id: `draw_${Date.now()}`,
            type: toolToDraw,
            points: [drawingStartPointRef.current, point],
            color: toolToDraw === 'longPosition' ? '#089981' : toolToDraw === 'shortPosition' ? '#f23645' : '#2962ff',
            lineWidth: 2,
          };
          onUpdatePaneConfig({ drawings: [...config.drawings, newElement] });
          soundService.playClickSound();
          onDrawingComplete?.();
        }
        isDrawingRef.current = false;
        drawingStartPointRef.current = null;
        currentDrawingTypeRef.current = null;
        dragStartScreenRef.current = null;
        setDrawingPreview(null);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!chartRef.current || !mainSeriesRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const price = (mainSeriesRef.current as any).coordinateToPrice?.(y) ?? 0;
    const time = (chartRef.current.timeScale() as any).coordinateToTime?.(x);

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      price: Number(price.toFixed(2)),
      time: typeof time === 'number' ? time : Math.floor(Date.now() / 1000),
    });
  };

  // Keyboard Delete / Backspace / Escape Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      if (target && target.isContentEditable) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId) {
        e.preventDefault();
        e.stopPropagation();
        soundService.playClickSound();
        onUpdatePaneConfig({
          drawings: config.drawings.filter(d => d.id !== selectedDrawingId)
        });
        setSelectedDrawingId(null);
        setHoveredDrawingId(null);
      }

      if (e.key === 'Escape' && selectedDrawingId) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedDrawingId(null);
        setHoveredDrawingId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId, config.drawings, onUpdatePaneConfig]);

  // Indicator controls
  const toggleIndicatorVis = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdatePaneConfig({
      indicators: config.indicators.map(ind => 
        ind.id === id ? { ...ind, visible: !ind.visible } : ind
      )
    });
  };

  const removeIndicator = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdatePaneConfig({
      indicators: config.indicators.filter(ind => ind.id !== id)
    });
  };

  // Unified cursor-anchored responsive zoom engine
  const handleChartWheelZoom = useCallback((e: React.WheelEvent) => {
    if (!chartRef.current) return;
    const delta = e.deltaY;
    if (delta === 0) return;

    const ts = chartRef.current.timeScale();
    const curRange = ts.getVisibleLogicalRange();
    if (!curRange) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartW = Math.max(1, rect.width - 55);
    const ratio = Math.max(0, Math.min(1, mouseX / chartW));

    // Responsive 20% zoom steps with smooth bounds
    const isZoomIn = delta < 0;
    const zoomFactor = isZoomIn ? 0.80 : 1.25;

    const curSpan = curRange.to - curRange.from;
    const targetSpan = curSpan * zoomFactor;

    if (targetSpan >= 3 && targetSpan <= 3500) {
      const anchor = curRange.from + curSpan * ratio;
      const newFrom = anchor - targetSpan * ratio;
      const newTo = anchor + targetSpan * (1 - ratio);
      ts.setVisibleLogicalRange({ from: newFrom, to: newTo });
      savedLogicalRangeRef.current = { from: newFrom, to: newTo };
      requestRedraw();
    }
  }, [requestRedraw]);

  return (
    <div 
      className={`relative w-full h-full bg-tv-bg overflow-hidden flex flex-col border ${
        isActive ? 'border-tv-blue ring-1 ring-tv-blue/30' : 'border-tv-border/50'
      }`}
      onClick={onActivate}
    >
      {/* Upper Main Chart Container */}
      <div 
        className="relative flex-1 w-full min-h-[220px]"
        onMouseMove={handleContainerMouseMove}
        onClick={handleContainerClick}
        onWheel={handleChartWheelZoom}
        onMouseLeave={() => setHoveredDrawingId(null)}
      >
        {/* Main Chart Legend / Header */}
        <div className="absolute top-2 left-3 z-20 flex flex-col space-y-1 pointer-events-none select-none">
          <div className="flex items-center space-x-2 text-xs font-mono bg-tv-surface/85 backdrop-blur-sm px-2.5 py-1 rounded border border-tv-border/60 pointer-events-auto">
            <span className="font-bold text-white font-sans">{config.symbol}</span>
            <span className="text-tv-muted font-sans font-medium text-[11px]">{config.timeframe}</span>

            {currentHoverCandle && (() => {
              const diff = currentHoverCandle.close - currentHoverCandle.open;
              const pct = currentHoverCandle.open > 0 ? (diff / currentHoverCandle.open) * 100 : 0;
              const isUp = diff >= 0;
              const colorClass = isUp ? 'text-tv-green' : 'text-tv-red';
              const sign = isUp ? '+' : '';
              return (
                <div className="flex items-center space-x-2 text-[11px] font-mono">
                  <span>O <strong className="text-white">{currentHoverCandle.open.toFixed(2)}</strong></span>
                  <span>H <strong className="text-white">{currentHoverCandle.high.toFixed(2)}</strong></span>
                  <span>L <strong className="text-white">{currentHoverCandle.low.toFixed(2)}</strong></span>
                  <span>C <strong className={colorClass}>{currentHoverCandle.close.toFixed(2)}</strong></span>
                  <span className={`${colorClass} font-semibold`}>
                    {sign}{diff.toFixed(2)} ({sign}{pct.toFixed(2)}%)
                  </span>
                  {currentHoverCandle.volume > 0 && (
                    <span className="text-tv-muted ml-1">
                      Vol <strong className="text-white">{currentHoverCandle.volume.toLocaleString()}</strong>
                    </span>
                  )}
                </div>
              );
            })()}

            {config.visualSettings?.showCountdown !== false && countdownText && (
              <div 
                className="flex items-center space-x-1.5 text-[11px] font-mono text-tv-yellow bg-tv-card/90 px-2 py-0.5 rounded border border-tv-border/80 pointer-events-auto ml-1"
                title="Bar kapanışına kalan süre"
              >
                <Clock className="w-3 h-3 text-tv-yellow animate-pulse" />
                <span>{countdownText}</span>
              </div>
            )}
          </div>

          {/* Active Overlay Indicators Legend */}
          <div className="flex flex-col space-y-0.5">
            {config.overlaySymbol && (
              <div className="flex items-center space-x-1.5 text-[11px] bg-tv-surface/85 backdrop-blur-sm px-2 py-0.5 rounded border border-orange-500/50 pointer-events-auto w-fit">
                <div className="w-2 h-2 rounded-full bg-[#ff9800]" />
                <span className="font-bold text-[#ff9800]">{config.overlaySymbol} (Karşılaştırma)</span>
                <button
                  onClick={() => onUpdatePaneConfig({ overlaySymbol: undefined })}
                  className="p-0.5 hover:text-tv-red text-tv-muted ml-1"
                  title="Karşılaştırmayı Kaldır"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            {overlayIndicators.map(ind => {
              const vMap = overlayValueMapsRef.current.get(ind.id);
              const hoverTime = currentHoverCandle?.time;
              let valStr: string | undefined = undefined;
              if (hoverTime !== undefined && hoverTime !== null) {
                if (vMap?.has(hoverTime)) {
                  valStr = vMap.get(hoverTime);
                } else {
                  valStr = 'Ø';
                }
              } else if (vMap && vMap.size > 0) {
                const arr = Array.from(vMap.values());
                valStr = arr[arr.length - 1];
              }

              return (
                <div 
                  key={ind.id}
                  className="flex items-center space-x-1.5 text-[11px] bg-tv-surface/75 backdrop-blur-sm px-2 py-0.5 rounded border border-tv-border/40 pointer-events-auto w-fit group"
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: Object.values(ind.styles)[0]?.color || ind.customPlots?.[0]?.color || '#2962ff' }} 
                  />
                  <span className={`font-medium ${ind.visible ? 'text-tv-text' : 'text-tv-muted line-through'}`}>
                    {ind.name}
                  </span>
                  {ind.timeframe && ind.timeframe !== 'chart' && ind.timeframe !== config.timeframe && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-tv-blue/25 text-tv-blue font-mono font-bold">
                      {ind.timeframe.toUpperCase()}
                    </span>
                  )}
                  {valStr !== undefined && (
                    <span className="font-mono text-tv-blue font-bold text-[11px] ml-1">
                      {valStr}
                    </span>
                  )}

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button onClick={(e) => toggleIndicatorVis(ind.id, e)} className="p-0.5 hover:text-white text-tv-muted">
                      {ind.visible ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onOpenIndicatorSettings(ind); }} className="p-0.5 hover:text-white text-tv-muted">
                      <Settings className="w-2.5 h-2.5" />
                    </button>
                    <button onClick={(e) => removeIndicator(ind.id, e)} className="p-0.5 hover:text-tv-red text-tv-muted">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loading earlier bars indicator */}
        {isLoadingEarlier && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-tv-surface/90 border border-tv-border text-tv-blue px-3 py-1 rounded shadow-lg text-[11px] flex items-center space-x-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-tv-blue animate-ping" />
            <span>Geçmiş barlar yükleniyor...</span>
          </div>
        )}

        {/* Lightweight Charts Main Canvas */}
        <div ref={containerRef} className="w-full h-full relative" />

        {/* Floating Drawing Properties Action Bar */}
        {selectedDrawingId && (() => {
          const selectedElement = config.drawings.find(d => d.id === selectedDrawingId);
          if (!selectedElement) return null;

          return (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-tv-surface/95 backdrop-blur-md border border-tv-border rounded-lg shadow-2xl px-3 py-1.5 flex items-center space-x-2 text-xs text-tv-text animate-in fade-in select-none">
              {/* Color Swatches */}
              <div className="flex items-center space-x-1">
                {['#2962ff', '#089981', '#f23645', '#ff9800', '#ffd600', '#ab47bc', '#ffffff'].map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      onUpdatePaneConfig({
                        drawings: config.drawings.map(d => d.id === selectedElement.id ? { ...d, color: c } : d)
                      });
                    }}
                    className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${
                      selectedElement.color === c ? 'ring-2 ring-white border-transparent scale-110' : 'border-tv-border/70'
                    }`}
                    style={{ backgroundColor: c }}
                    title={`Renk: ${c}`}
                  />
                ))}
              </div>

              <div className="w-[1px] h-4 bg-tv-border/80" />

              {/* Line Thickness */}
              <div className="flex items-center space-x-0.5">
                {[1, 2, 3, 4].map(w => (
                  <button
                    key={w}
                    onClick={() => {
                      onUpdatePaneConfig({
                        drawings: config.drawings.map(d => d.id === selectedElement.id ? { ...d, lineWidth: w } : d)
                      });
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      selectedElement.lineWidth === w ? 'bg-tv-blue text-white font-bold' : 'hover:bg-tv-hover text-tv-muted'
                    }`}
                    title={`${w}px Kalınlık`}
                  >
                    {w}px
                  </button>
                ))}
              </div>

              <div className="w-[1px] h-4 bg-tv-border/80" />

              {/* Line Style (Solid, Dashed, Dotted) */}
              <div className="flex items-center space-x-0.5">
                {(['solid', 'dashed', 'dotted'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => {
                      onUpdatePaneConfig({
                        drawings: config.drawings.map(d => d.id === selectedElement.id ? { ...d, lineStyle: st } : d)
                      });
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      (selectedElement.lineStyle || 'solid') === st ? 'bg-tv-blue text-white font-bold' : 'hover:bg-tv-hover text-tv-muted'
                    }`}
                    title={`Stil: ${st}`}
                  >
                    {st === 'solid' ? '—' : st === 'dashed' ? '- -' : '···'}
                  </button>
                ))}
              </div>

              <div className="w-[1px] h-4 bg-tv-border/80" />

              {/* Lock / Unlock */}
              <button
                onClick={() => {
                  onUpdatePaneConfig({
                    drawings: config.drawings.map(d => d.id === selectedElement.id ? { ...d, locked: !d.locked } : d)
                  });
                }}
                className={`p-1 rounded hover:bg-tv-hover ${selectedElement.locked ? 'text-tv-yellow' : 'text-tv-muted hover:text-white'}`}
                title={selectedElement.locked ? 'Kilidi Aç' : 'Çizimi Kilitle'}
              >
                {selectedElement.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>

              <div className="w-[1px] h-4 bg-tv-border/80" />

              {/* Clone / Duplicate */}
              <button
                onClick={() => {
                  const cloned: DrawingElement = {
                    ...selectedElement,
                    id: `draw_${Date.now()}`,
                    points: selectedElement.points.map(p => ({ time: p.time + 3600, price: p.price * 1.005 })),
                  };
                  onUpdatePaneConfig({ drawings: [...config.drawings, cloned] });
                  setSelectedDrawingId(cloned.id);
                }}
                className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white"
                title="Çizimi Kopyala / Çoğalt"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {/* Delete */}
              <button
                onClick={() => {
                  soundService.playClickSound();
                  onUpdatePaneConfig({
                    drawings: config.drawings.filter(d => d.id !== selectedElement.id)
                  });
                  setSelectedDrawingId(null);
                  setHoveredDrawingId(null);
                }}
                className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-tv-red"
                title="Çizimi Sil (Delete / Backspace)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-tv-border/80" />

              {/* Close */}
              <button
                onClick={() => {
                  setSelectedDrawingId(null);
                  setHoveredDrawingId(null);
                }}
                className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white"
                title="Seçimi Bırak (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })()}

        {/* Right Scale Mode Controls (auto, log, %) */}
        <div className="absolute bottom-1 right-1 z-30 flex items-center space-x-1 text-[10px] font-mono font-bold bg-tv-surface/85 backdrop-blur-sm px-1.5 py-0.5 rounded border border-tv-border/60">
          <button 
            onClick={() => setPriceScaleMode('normal')}
            className={`px-1.5 py-0.5 rounded transition-colors ${priceScaleMode === 'normal' ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-white'}`}
            title="Otomatik Fiyat Skalası (Auto Scale)"
          >
            auto
          </button>
          <button 
            onClick={() => setPriceScaleMode(priceScaleMode === 'log' ? 'normal' : 'log')}
            className={`px-1.5 py-0.5 rounded transition-colors ${priceScaleMode === 'log' ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-white'}`}
            title="Logaritmik Fiyat Skalası (Log Scale)"
          >
            log
          </button>
          <button 
            onClick={() => setPriceScaleMode(priceScaleMode === 'percent' ? 'normal' : 'percent')}
            className={`px-1.5 py-0.5 rounded transition-colors ${priceScaleMode === 'percent' ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-white'}`}
            title="Yüzdesel Getiri Skalası (% Percentage Scale)"
          >
            %
          </button>
        </div>

        {/* Transparent Interactive Drawing Layer */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleChartWheelZoom}
          className={`absolute inset-0 z-20 ${
            (isReplayJumpMode || isShiftDown || draggingPaperLine !== null || hoveredPaperHit !== null || draggingAlertLine !== null || hoveredAlertHit !== null || !['crosshair', 'cursor', 'dot'].includes(activeDrawingTool) || selectedDrawingId !== null || hoveredDrawingId !== null || isDrawingRef.current)
              ? (hoveredAlertHit?.type === 'close' ? 'cursor-pointer pointer-events-auto' : (hoveredAlertHit?.type === 'line' || draggingAlertLine) ? 'cursor-ns-resize pointer-events-auto' : hoveredPaperHit?.type === 'tp' || hoveredPaperHit?.type === 'sl' || draggingPaperLine ? 'cursor-ns-resize pointer-events-auto' : hoveredPaperHit ? 'cursor-pointer pointer-events-auto' : isReplayJumpMode ? 'cursor-crosshair pointer-events-auto' : hoveredDrawingId !== null ? 'cursor-pointer pointer-events-auto' : activeDrawingTool === 'eraser' ? 'cursor-pointer pointer-events-auto' : 'cursor-crosshair pointer-events-auto')
              : 'cursor-default pointer-events-none'
          }`}
        />

        {/* Quick (+) Order / Alert Button on Right Price Scale */}
        {hoverPriceScale && (
          <div
            style={{ top: hoverPriceScale.y - 10, right: 46 }}
            className="absolute z-30 flex items-center group cursor-pointer"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPlusMenu({
                  x: e.clientX,
                  y: e.clientY,
                  price: hoverPriceScale.price,
                });
              }}
              className="w-5 h-5 rounded-full bg-tv-blue hover:bg-blue-600 text-white flex items-center justify-center shadow-lg font-bold text-xs transition-transform hover:scale-110"
              title={`Hızlı İşlem / Alarm ($${hoverPriceScale.price.toFixed(2)})`}
            >
              +
            </button>
          </div>
        )}

        {/* Plus Action Menu */}
        {plusMenu && (
          <div
            style={{ top: plusMenu.y, left: Math.max(10, plusMenu.x - 170) }}
            className="fixed z-50 bg-[#1e222d] border border-[#2a2e39] rounded shadow-2xl py-1 text-xs text-[#d1d4dc] min-w-[170px] select-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-3 py-1 font-semibold text-white border-b border-[#2a2e39]/60 flex items-center justify-between">
              <span>Hızlı İşlem</span>
              <span className="font-mono text-tv-blue">${plusMenu.price.toLocaleString()}</span>
            </div>
            <button
              onClick={() => {
                onOpenCreateAlertAtPrice?.(plusMenu.price);
                setPlusMenu(null);
                setHoverPriceScale(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
            >
              <Bell className="w-3.5 h-3.5 text-tv-yellow" />
              <span>Alarm Ekle</span>
            </button>
            <button
              onClick={() => {
                onOpenOrderModalAtPrice?.(plusMenu.price, 'long');
                setPlusMenu(null);
                setHoverPriceScale(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2 text-tv-green"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Limit Alış (Buy) Emri</span>
            </button>
            <button
              onClick={() => {
                onOpenOrderModalAtPrice?.(plusMenu.price, 'short');
                setPlusMenu(null);
                setHoverPriceScale(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2 text-tv-red"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Limit Satış (Sell) Emri</span>
            </button>
          </div>
        )}
      </div>

      {/* Lower SubPanes (RSI, MACD, Stochastic, ATR, etc. in separate split panes!) */}
      {subpaneIndicators.map(subInd => (
        <SubPane
          key={subInd.id}
          indicator={subInd}
          candles={activeCandles}
          timeframe={config.timeframe}
          mainChart={chartInstance}
          hoverTime={currentHoverCandle?.time ?? null}
          onHoverTimeChange={(time) => {
            if (time === null) {
              const latest = activeCandlesRef.current;
              if (latest.length > 0) {
                setCurrentHoverCandle(latest[latest.length - 1]);
              }
            } else {
              const matched = findCandleByTime(activeCandlesRef.current, time);
              if (matched) {
                setCurrentHoverCandle(matched);
              }
            }
          }}
          onToggleVisibility={(id) => {
            onUpdatePaneConfig({
              indicators: config.indicators.map(i => i.id === id ? { ...i, visible: !i.visible } : i)
            });
          }}
          onOpenSettings={(ind) => onOpenIndicatorSettings(ind)}
          onRemove={(id) => {
            onUpdatePaneConfig({
              indicators: config.indicators.filter(i => i.id !== id)
            });
          }}
        />
      ))}

      {/* Interactive Context Menu */}
      {contextMenu?.visible && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-[#1e222d] border border-[#2a2e39] rounded shadow-2xl py-1.5 min-w-[240px] text-xs text-[#d1d4dc] select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 font-semibold text-white border-b border-[#2a2e39]/60 flex items-center justify-between">
            <span>{config.symbol}</span>
            <span className="font-mono text-tv-blue">${contextMenu.price.toLocaleString()}</span>
          </div>

          <button
            onClick={() => {
              onOpenOrderModalAtPrice?.(contextMenu.price, 'long');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2 text-tv-green font-medium"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>${contextMenu.price.toLocaleString()} Seviyesinden Emir Ver...</span>
          </button>

          <button
            onClick={() => {
              onOpenCreateAlertAtPrice?.(contextMenu.price);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
          >
            <Bell className="w-3.5 h-3.5 text-tv-yellow" />
            <span>${contextMenu.price.toLocaleString()} Seviyesine Alarm Ekle</span>
          </button>

          <div className="h-[1px] bg-[#2a2e39]/60 my-1" />

          <button
            onClick={() => {
              const newDrawing: DrawingElement = {
                id: `h_${Date.now()}`,
                type: 'horizontalLine',
                points: [{ time: contextMenu.time, price: contextMenu.price }],
                color: '#2962ff',
                lineWidth: 2,
              };
              onUpdatePaneConfig({ drawings: [...config.drawings, newDrawing] });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
          >
            <Minus className="w-3.5 h-3.5 text-tv-blue" />
            <span>Yatay Çizgi Ekle</span>
          </button>

          <button
            onClick={() => {
              onSelectDrawingTool?.('trendLine');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
          >
            <TrendingUp className="w-3.5 h-3.5 text-tv-green" />
            <span>Trend Çizgisi Çiz</span>
          </button>

          <button
            onClick={() => {
              onSelectDrawingTool?.('fibonacci');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
          >
            <Activity className="w-3.5 h-3.5 text-[#ffd600]" />
            <span>Fibonacci Düzeltmesi Ekle</span>
          </button>

          <button
            onClick={() => {
              onSelectDrawingTool?.('fixedRangeVolumeProfile');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
          >
            <BarChart2 className="w-3.5 h-3.5 text-tv-yellow" />
            <span>Sabit Aralık Hacim Profili (FRVP)</span>
          </button>

          <div className="h-[1px] bg-[#2a2e39]/60 my-1" />

          <button
            onClick={() => {
              chartRef.current?.timeScale().resetTimeScale();
              chartRef.current?.timeScale().fitContent();
              chartRef.current?.priceScale('right').applyOptions({ autoScale: true });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#787b86]" />
            <span>Ölçeği Sıfırla (Alt+R)</span>
          </button>

          <button
            onClick={() => {
              const currentInv = !!config.visualSettings?.invertScale;
              onUpdatePaneConfig({
                visualSettings: {
                  upColor: config.visualSettings?.upColor || '#089981',
                  downColor: config.visualSettings?.downColor || '#f23645',
                  wickUpColor: config.visualSettings?.wickUpColor || '#089981',
                  wickDownColor: config.visualSettings?.wickDownColor || '#f23645',
                  borderUpColor: config.visualSettings?.borderUpColor || '#089981',
                  borderDownColor: config.visualSettings?.borderDownColor || '#f23645',
                  backgroundColor: config.visualSettings?.backgroundColor || '#131722',
                  gridColor: config.visualSettings?.gridColor || 'rgba(42, 46, 57, 0.4)',
                  showGrid: config.visualSettings?.showGrid !== false,
                  showWatermark: config.visualSettings?.showWatermark !== false,
                  watermarkOpacity: config.visualSettings?.watermarkOpacity ?? 0.07,
                  showCountdown: config.visualSettings?.showCountdown !== false,
                  invertScale: !currentInv,
                }
              });
              setContextMenu(null);
            }}
            className={`w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] flex items-center space-x-2 ${
              config.visualSettings?.invertScale ? 'text-tv-blue font-bold' : 'hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ölçeği Ters Çevir (Alt+I)</span>
          </button>

          <button
            onClick={() => {
              chartRef.current?.timeScale().fitContent();
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#787b86]" />
            <span>Grafiği Ekrana Sığdır (Fit)</span>
          </button>

          <button
            onClick={() => {
              onTriggerScreenshot?.();
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
          >
            <Download className="w-3.5 h-3.5 text-[#787b86]" />
            <span>Grafik Resmini İndir (PNG)</span>
          </button>

          <button
            onClick={() => {
              onOpenChartSettings?.();
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
          >
            <Settings className="w-3.5 h-3.5 text-[#787b86]" />
            <span>Grafik Görsel Ayarları...</span>
          </button>

          {(config.drawings.length > 0 || config.indicators.length > 0) && (
            <div className="h-[1px] bg-[#2a2e39]/60 my-1" />
          )}

          {config.drawings.length > 0 && (
            <button
              onClick={() => {
                onUpdatePaneConfig({ drawings: [] });
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-tv-red/20 text-tv-red flex items-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tüm Çizimleri Kaldır ({config.drawings.length})</span>
            </button>
          )}

          {config.indicators.length > 0 && (
            <button
              onClick={() => {
                onUpdatePaneConfig({ indicators: [] });
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-tv-red/20 text-tv-red flex items-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tüm Göstergeleri Kaldır ({config.indicators.length})</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});
