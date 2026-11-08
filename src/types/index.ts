export type Timeframe = 
  // Seconds
  | '1s' 
  | '5s' 
  | '10s' 
  | '15s' 
  | '30s' 
  | '45s'
  // Minutes
  | '1m' 
  | '2m' 
  | '3m' 
  | '5m' 
  | '10m' 
  | '15m' 
  | '30m' 
  | '45m'
  // Hours
  | '1h' 
  | '2h' 
  | '3h' 
  | '4h' 
  | '6h' 
  | '8h' 
  | '12h'
  // Days, Weeks, Months, Years
  | '1d' 
  | '2d' 
  | '3d' 
  | '1w' 
  | '1M' 
  | '3M' 
  | '6M' 
  | '12M'
  // Custom Timeframe support (e.g. '7m', '2h', etc.)
  | (string & {});

export type ChartType = 
  | 'candlestick' 
  | 'bar' 
  | 'hollow-candlestick'
  | 'volume-footprint'
  | 'volume-candle'
  | 'heikin-ashi'
  | 'line' 
  | 'area' 
  | 'baseline'
  | 'columns'
  | 'high-low'
  | 'step-line'
  | 'line-with-markers'
  | 'renko'
  | 'line-break';

export interface CandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type IndicatorType = 
  | 'SMA' 
  | 'EMA' 
  | 'WMA' 
  | 'RSI' 
  | 'MACD' 
  | 'BollingerBands' 
  | 'ATR' 
  | 'Supertrend' 
  | 'Stochastic' 
  | 'VWAP' 
  | 'Ichimoku' 
  | 'Volume'
  | 'ParabolicSAR'
  | 'KeltnerChannels'
  | 'WilliamsR'
  | 'VolumeProfile'
  | 'CCI'
  | 'AwesomeOscillator'
  | 'MFI'
  | 'ROC'
  | 'CMF'
  | 'Donchian'
  | 'HMA'
  | 'PivotPoints'
  | 'ADX'
  | 'StochRSI'
  | 'OBV'
  | 'DEMA'
  | 'TEMA'
  | 'VWMA'
  | 'Aroon'
  | 'Envelopes'
  | 'StandardDeviation'
  | 'HistoricalVolatility'
  | 'TSI'
  | 'UltimateOscillator'
  | 'Vortex'
  | 'ChandeMO'
  | 'DPO'
  | 'EaseOfMovement'
  | 'MassIndex'
  | 'CoppockCurve'
  | 'BOP'
  | 'FisherTransform'
  | 'ChaikinVolatility'
  | 'PPO'
  | 'VolumeOscillator'
  | 'ZigZag'
  | 'SMMA'
  | 'ALMA'
  | 'LSMA'
  | 'PriceChannel'
  | 'BBWidth'
  | 'BBBPct'
  | 'NATR'
  | 'MOM'
  | 'AcceleratorOscillator'
  | 'KST'
  | 'RVI'
  | 'ConnorsRSI'
  | 'ADL'
  | 'PVT'
  | 'EFI'
  | 'ChoppinessIndex'
  | 'KlingerOscillator'
  | 'ChaikinOscillator'
  | 'TRIX'
  | 'McGinleyDynamic'
  | 'LinearRegressionCurve'
  | 'LinearRegressionSlope'
  | 'StandardError'
  | 'StandardErrorBands'
  | 'ChandeKrollStop'
  | 'SMIErgodic'
  | 'RelativeVolatilityIndex'
  | 'NetVolume'
  | 'AveragePrice'
  | 'TypicalPrice'
  | 'MedianPrice'
  | 'PriceOscillator'
  | 'GuppyMMA'
  | 'AccumulativeSwingIndex'
  | 'EMACross'
  | 'MACross'
  | 'MovingAverageChannel'
  | 'TrueRange'
  | 'VolatilityCloseToClose'
  | 'RankCorrelationIndex'
  | 'SessionVolumeProfile'
  | 'CustomPine'
  | 'CustomPython';

export interface IndicatorStyleItem {
  color: string;
  lineWidth?: number;
  lineStyle?: number; // 0: solid, 1: dotted, 2: dashed
  value?: number;
  visible?: boolean;
}

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  pane: 'overlay' | 'subpane';
  visible: boolean;
  params: Record<string, number | string | boolean>;
  styles: Record<string, IndicatorStyleItem>;
  timeframe?: Timeframe | 'current' | string;
  pineCode?: string;
  pythonCode?: string;
  customPlots?: any[];
  customHlines?: any[];
}

export type DrawingToolType = 
  // Cursor
  | 'cursor' 
  | 'crosshair' 
  | 'dot'
  | 'eraser'
  // Lines
  | 'trendLine' 
  | 'ray' 
  | 'infoLine'
  | 'extendedLine' 
  | 'trendAngle'
  | 'horizontalLine' 
  | 'horizontalRay' 
  | 'verticalLine' 
  | 'crossLine'
  | 'parallelChannel'
  // Gann & Fib
  | 'fibonacci' 
  | 'fibExtension'
  | 'fibChannel'
  | 'fibTimeZones'
  | 'fibCircles'
  | 'gannBox'
  | 'gannFan'
  // Shapes
  | 'brush' 
  | 'highlighter'
  | 'arrow'
  | 'rectangle' 
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'polyline'
  // Text & Annotation
  | 'text'
  | 'anchoredText'
  | 'callout'
  | 'priceLabel'
  | 'arrowUp'
  | 'arrowDown'
  // Patterns
  | 'xabcdPattern'
  | 'headAndShoulders'
  | 'trianglePattern'
  | 'elliottImpulse'
  | 'elliottCorrection'
  // Prediction & Measurement
  | 'longPosition'
  | 'shortPosition'
  | 'forecast'
  | 'dateRange'
  | 'priceRange'
  | 'measure'
  | 'fixedRangeVolumeProfile';

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface DrawingElement {
  id: string;
  type: DrawingToolType;
  points: DrawingPoint[];
  color: string;
  lineWidth: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  fillColor?: string;
  filled?: boolean;
  text?: string;
  locked?: boolean;
  visible?: boolean;
}

export type LayoutType = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1' | '1left-2right' | '1top-2bottom' | '3x2';

export interface ChartVisualSettings {
  upColor: string;
  downColor: string;
  wickUpColor: string;
  wickDownColor: string;
  borderUpColor: string;
  borderDownColor: string;
  backgroundColor: string;
  gridColor: string;
  showGrid: boolean;
  showWatermark?: boolean;
  watermarkOpacity?: number;
  showCountdown?: boolean;
  invertScale?: boolean;
}

export interface ChartPaneConfig {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  indicators: IndicatorConfig[];
  drawings: DrawingElement[];
  overlaySymbol?: string;
  priceScaleMode?: 'normal' | 'log' | 'percentage';
  visualSettings?: ChartVisualSettings;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'crossing' | 'cross_up' | 'cross_down';
  note?: string;
  triggered: boolean;
  triggeredAt?: number;
  createdAt: number;
  recurring?: boolean;
  sound?: 'bell' | 'chime' | 'siren' | 'pop';
  webhookUrl?: string;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  category?: string;
  exchange?: string;
  flagColor?: string; // 'red' | 'blue' | 'green' | 'orange' | 'purple'
  isSectionHeader?: boolean;
  sectionTitle?: string;
}

export interface IndicatorTemplate {
  id: string;
  name: string;
  description?: string;
  indicators: IndicatorConfig[];
  isBuiltin?: boolean;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  qty: number;
  timestamp: number;
  takeProfit?: number;
  stopLoss?: number;
}

export interface AppState {
  activePaneId: string;
  layout: LayoutType;
  panes: ChartPaneConfig[];
  watchlist: WatchlistItem[];
  alerts: PriceAlert[];
  syncCrosshair: boolean;
  syncSymbol: boolean;
  syncTimeframe: boolean;
  syncTime?: boolean;
  magnetMode: boolean | 'weak' | 'strong' | 'off';
  theme: 'dark' | 'light';
  timezone?: string;
}

