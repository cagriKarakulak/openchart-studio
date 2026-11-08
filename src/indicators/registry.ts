import { IndicatorConfig, IndicatorType, IndicatorStyleItem } from '../types';

export interface IndicatorDefinition {
  type: IndicatorType;
  name: string;
  shortName: string;
  category: 'Trend' | 'Oscillator' | 'Volatility' | 'Volume';
  pane: 'overlay' | 'subpane';
  description: string;
  defaultParams: Record<string, number | string | boolean>;
  defaultStyles: Record<string, IndicatorStyleItem>;
  paramSchema: {
    key: string;
    label: string;
    type: 'number' | 'select' | 'boolean';
    min?: number;
    max?: number;
    step?: number;
  }[];
}

export const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  // ==========================================
  // TREND (OVERLAY & SUBPANE)
  // ==========================================
  {
    type: 'SMA',
    name: 'Simple Moving Average (SMA)',
    shortName: 'SMA',
    category: 'Trend',
    pane: 'overlay',
    description: 'Belirtilen periyottaki kapanis fiyatlarinin aritmetik ortalamasini gosterir.',
    defaultParams: { period: 20 },
    defaultStyles: {
      line: { color: '#2962ff', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 1, max: 500, step: 1 }
    ]
  },
  {
    type: 'EMA',
    name: 'Exponential Moving Average (EMA)',
    shortName: 'EMA',
    category: 'Trend',
    pane: 'overlay',
    description: 'Son fiyatlara daha fazla agirlik veren ustel hareketli ortalama.',
    defaultParams: { period: 50 },
    defaultStyles: {
      line: { color: '#ff9800', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 1, max: 500, step: 1 }
    ]
  },
  {
    type: 'WMA',
    name: 'Weighted Moving Average (WMA)',
    shortName: 'WMA',
    category: 'Trend',
    pane: 'overlay',
    description: 'Agirlikli hareketli ortalama, son barlara lineer agirlik atar.',
    defaultParams: { period: 20 },
    defaultStyles: {
      line: { color: '#e040fb', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 1, max: 500, step: 1 }
    ]
  },
  {
    type: 'DEMA',
    name: 'Double Exponential Moving Average (DEMA)',
    shortName: 'DEMA',
    category: 'Trend',
    pane: 'overlay',
    description: 'Gecikmesi azaltilmis cift ustel hareketli ortalama.',
    defaultParams: { period: 20 },
    defaultStyles: {
      line: { color: '#ab47bc', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 200, step: 1 }
    ]
  },
  {
    type: 'TEMA',
    name: 'Triple Exponential Moving Average (TEMA)',
    shortName: 'TEMA',
    category: 'Trend',
    pane: 'overlay',
    description: 'Uc kat duzeltilmis ve gecikmesi minimuma indirilmis ustel ortalama.',
    defaultParams: { period: 20 },
    defaultStyles: {
      line: { color: '#00e676', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 200, step: 1 }
    ]
  },
  {
    type: 'HMA',
    name: 'Hull Moving Average (HMA)',
    shortName: 'HMA',
    category: 'Trend',
    pane: 'overlay',
    description: 'Gecikmesi en aza indirilmis, son derece akici ve hizli hareketli ortalama.',
    defaultParams: { period: 20 },
    defaultStyles: {
      line: { color: '#00e5ff', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 200, step: 1 }
    ]
  },
  {
    type: 'SMMA',
    name: 'Smoothed Moving Average (SMMA / Wilder RMA)',
    shortName: 'SMMA',
    category: 'Trend',
    pane: 'overlay',
    description: 'Wilder tarafindan gelistirilen duzlestirilmis hareketli ortalama.',
    defaultParams: { period: 14 },
    defaultStyles: {
      line: { color: '#ffd600', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 200, step: 1 }
    ]
  },
  {
    type: 'ALMA',
    name: 'Arnaud Legoux Moving Average (ALMA)',
    shortName: 'ALMA',
    category: 'Trend',
    pane: 'overlay',
    description: 'Gaussian dagilimli filtre ile minimum gecikme ve yumusak trend egilimi.',
    defaultParams: { period: 9, offset: 0.85, sigma: 6 },
    defaultStyles: {
      line: { color: '#ff4081', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'offset', label: 'Offset', type: 'number', min: 0.1, max: 1, step: 0.05 },
      { key: 'sigma', label: 'Sigma', type: 'number', min: 1, max: 10, step: 1 },
    ]
  },
  {
    type: 'LSMA',
    name: 'Least Squares Moving Average (LSMA / LinReg)',
    shortName: 'LSMA',
    category: 'Trend',
    pane: 'overlay',
    description: 'Lineer regresyon egri tahmini uzerine kurulu en kucuk kareler ortalamasi.',
    defaultParams: { period: 25 },
    defaultStyles: {
      line: { color: '#26c6da', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 200, step: 1 }
    ]
  },
  {
    type: 'Supertrend',
    name: 'Supertrend',
    shortName: 'ST',
    category: 'Trend',
    pane: 'overlay',
    description: 'ATR tabanli guclu dinamik trend ve takip eden zarar durdurma gostergesi.',
    defaultParams: { period: 10, multiplier: 3 },
    defaultStyles: {
      bullish: { color: '#089981', lineWidth: 2 },
      bearish: { color: '#f23645', lineWidth: 2 },
    },
    paramSchema: [
      { key: 'period', label: 'ATR Periyodu', type: 'number', min: 1, max: 100, step: 1 },
      { key: 'multiplier', label: 'Carpan', type: 'number', min: 0.5, max: 10, step: 0.1 }
    ]
  },
  {
    type: 'ParabolicSAR',
    name: 'Parabolic SAR',
    shortName: 'SAR',
    category: 'Trend',
    pane: 'overlay',
    description: 'Trend donuslerini ve dinamik trailing stop seviyelerini gosteren noktasal gosterge.',
    defaultParams: { startAF: 0.02, maxAF: 0.2 },
    defaultStyles: {
      dot: { color: '#ab47bc', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'startAF', label: 'Baslangic AF', type: 'number', min: 0.01, max: 0.1, step: 0.01 },
      { key: 'maxAF', label: 'Maksimum AF', type: 'number', min: 0.1, max: 0.5, step: 0.05 },
    ]
  },
  {
    type: 'Ichimoku',
    name: 'Ichimoku Kinko Hyo (Bulut)',
    shortName: 'ICHIMOKU',
    category: 'Trend',
    pane: 'overlay',
    description: 'Tenkan, Kijun, Senkou Span A ve B hatlari ile gelecege yonelik dinamik destek ve direnc bulutu.',
    defaultParams: { tenkan: 9, kijun: 26, spanB: 52 },
    defaultStyles: {
      tenkan: { color: '#2962ff', lineWidth: 1 },
      kijun: { color: '#f23645', lineWidth: 1 },
      spanA: { color: '#089981', lineWidth: 1 },
      spanB: { color: '#ff9800', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'tenkan', label: 'Tenkan Periyodu', type: 'number', min: 1, max: 50, step: 1 },
      { key: 'kijun', label: 'Kijun Periyodu', type: 'number', min: 1, max: 100, step: 1 },
      { key: 'spanB', label: 'Span B Periyodu', type: 'number', min: 1, max: 200, step: 1 },
    ]
  },
  {
    type: 'ZigZag',
    name: 'Zig Zag (Tepe ve Dip Dalgalari)',
    shortName: 'ZIGZAG',
    category: 'Trend',
    pane: 'overlay',
    description: 'Belirli yuzde sapmanin uzerindeki fiyat salinimlarini ve dalgalari gosterir.',
    defaultParams: { deviation: 5 },
    defaultStyles: {
      line: { color: '#ffeb3b', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'deviation', label: 'Sapma Yuzdesi (%)', type: 'number', min: 1, max: 20, step: 0.5 }
    ]
  },
  {
    type: 'PivotPoints',
    name: 'Pivot Points Standard',
    shortName: 'PIVOT',
    category: 'Trend',
    pane: 'overlay',
    description: 'Destek (S1) ve direnc (R1) pivot seviyelerini hesaplar.',
    defaultParams: {},
    defaultStyles: {
      p: { color: '#fbc02d', lineWidth: 1 },
      r: { color: '#f23645', lineWidth: 1 },
      s: { color: '#089981', lineWidth: 1 },
    },
    paramSchema: []
  },
  {
    type: 'ADX',
    name: 'Average Directional Index (ADX/DMI)',
    shortName: 'ADX',
    category: 'Trend',
    pane: 'subpane',
    description: 'Trendin gucunu (ADX) ve yonunu (+DI, -DI) olcen temel gosterge.',
    defaultParams: { period: 14 },
    defaultStyles: {
      adx: { color: '#ff9800', lineWidth: 2 },
      plusDI: { color: '#089981', lineWidth: 1 },
      minusDI: { color: '#f23645', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'Aroon',
    name: 'Aroon',
    shortName: 'AROON',
    category: 'Trend',
    pane: 'subpane',
    description: 'Yeni zirveler ve dipler arasindaki sureyi olcerek trend baslangiclarini tespit eder.',
    defaultParams: { period: 14 },
    defaultStyles: {
      up: { color: '#089981', lineWidth: 2 },
      down: { color: '#f23645', lineWidth: 2 },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'Vortex',
    name: 'Vortex Indicator (VI)',
    shortName: 'VI',
    category: 'Trend',
    pane: 'subpane',
    description: 'Pozitif (VI+) ve negatif (VI-) girdap akislari ile trend baslangiclarini yakalar.',
    defaultParams: { period: 14 },
    defaultStyles: {
      plusVI: { color: '#089981', lineWidth: 2 },
      minusVI: { color: '#f23645', lineWidth: 2 },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'MassIndex',
    name: 'Mass Index',
    shortName: 'MASS',
    category: 'Trend',
    pane: 'subpane',
    description: 'Yuksek ve dusuk bant araligindaki genislemeleri izleyerek trend donuslerini ongorur.',
    defaultParams: { period: 25 },
    defaultStyles: {
      line: { color: '#ab47bc', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 5, max: 100, step: 1 }
    ]
  },

  // ==========================================
  // OSCILLATORS & MOMENTUM (SUBPANE)
  // ==========================================
  {
    type: 'RSI',
    name: 'Relative Strength Index (RSI)',
    shortName: 'RSI',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Fiyat hareketlerinin hizini ve degisimini olcen momentum osilatoru (0-100).',
    defaultParams: { period: 14, overbought: 70, middle: 50, oversold: 30 },
    defaultStyles: {
      line: { color: '#b388ff', lineWidth: 2, lineStyle: 0, visible: true },
      upperBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: 70, visible: true },
      middleBand: { color: '#787b86', lineWidth: 1, lineStyle: 1, value: 50, visible: true },
      lowerBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: 30, visible: true },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'overbought', label: 'Aşırı Alım Seviyesi (Upper)', type: 'number', min: 50, max: 95, step: 1 },
      { key: 'middle', label: 'Orta Seviye (Middle)', type: 'number', min: 35, max: 65, step: 1 },
      { key: 'oversold', label: 'Aşırı Satım Seviyesi (Lower)', type: 'number', min: 5, max: 50, step: 1 }
    ]
  },
  {
    type: 'MACD',
    name: 'MACD (Moving Average Convergence Divergence)',
    shortName: 'MACD',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Iki hareketli ortalamanin iliskisini gosteren trend takip eden momentum gostergesi.',
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    defaultStyles: {
      macd: { color: '#2962ff', lineWidth: 2, lineStyle: 0, visible: true },
      signal: { color: '#ff9800', lineWidth: 2, lineStyle: 0, visible: true },
      histUp: { color: '#26a69a', lineWidth: 1, lineStyle: 0, visible: true },
      histDown: { color: '#ef5350', lineWidth: 1, lineStyle: 0, visible: true }
    },
    paramSchema: [
      { key: 'fast', label: 'Hizli EMA', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'slow', label: 'Yavas EMA', type: 'number', min: 5, max: 200, step: 1 },
      { key: 'signal', label: 'Sinyal Periyodu', type: 'number', min: 1, max: 50, step: 1 }
    ]
  },
  {
    type: 'Stochastic',
    name: 'Stochastic Oscillator',
    shortName: 'STOCH',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Kapanis fiyatini belirli bir zaman araligindaki en yuksek ve en dusuk fiyatla karsilastirir.',
    defaultParams: { periodK: 14, smoothK: 3, smoothD: 3, overbought: 80, oversold: 20 },
    defaultStyles: {
      k: { color: '#2962ff', lineWidth: 2, lineStyle: 0, visible: true },
      d: { color: '#ff9800', lineWidth: 2, lineStyle: 0, visible: true },
      upperBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: 80, visible: true },
      middleBand: { color: '#787b86', lineWidth: 1, lineStyle: 1, value: 50, visible: true },
      lowerBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: 20, visible: true },
    },
    paramSchema: [
      { key: 'periodK', label: '%K Periyodu', type: 'number', min: 1, max: 100, step: 1 },
      { key: 'smoothK', label: '%K Duzeltme', type: 'number', min: 1, max: 50, step: 1 },
      { key: 'smoothD', label: '%D Duzeltme', type: 'number', min: 1, max: 50, step: 1 }
    ]
  },
  {
    type: 'StochRSI',
    name: 'Stochastic RSI (Stoch RSI)',
    shortName: 'STOCHRSI',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'RSI gostergesinin stokastik osilatoru, en hassas asiri alim/satim gostergelerindendir.',
    defaultParams: { rsiPeriod: 14, stochPeriod: 14, smoothK: 3, smoothD: 3, overbought: 80, oversold: 20 },
    defaultStyles: {
      k: { color: '#2962ff', lineWidth: 2, lineStyle: 0, visible: true },
      d: { color: '#ff9800', lineWidth: 1, lineStyle: 0, visible: true },
      upperBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: 80, visible: true },
      middleBand: { color: '#787b86', lineWidth: 1, lineStyle: 1, value: 50, visible: true },
      lowerBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: 20, visible: true },
    },
    paramSchema: [
      { key: 'rsiPeriod', label: 'RSI Periyodu', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'stochPeriod', label: 'Stoch Periyodu', type: 'number', min: 2, max: 100, step: 1 },
    ]
  },
  {
    type: 'CCI',
    name: 'Commodity Channel Index (CCI)',
    shortName: 'CCI',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Fiyatin istatistiksel ortalamasindan dongusel sapmasini olcer (+100/-100 asiri bolgeler).',
    defaultParams: { period: 20 },
    defaultStyles: {
      line: { color: '#e040fb', lineWidth: 2, lineStyle: 0, visible: true },
      upperBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: 100, visible: true },
      zeroLine: { color: '#787b86', lineWidth: 1, lineStyle: 1, value: 0, visible: true },
      lowerBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: -100, visible: true },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'WilliamsR',
    name: 'Williams %R',
    shortName: '%R',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Asiri alim (-20) ve asiri satim (-80) seviyelerini gosteren momentum gostergesi.',
    defaultParams: { period: 14 },
    defaultStyles: {
      line: { color: '#00e676', lineWidth: 2, lineStyle: 0, visible: true },
      upperBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: -20, visible: true },
      middleBand: { color: '#787b86', lineWidth: 1, lineStyle: 1, value: -50, visible: true },
      lowerBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: -80, visible: true },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'AwesomeOscillator',
    name: 'Awesome Oscillator (AO)',
    shortName: 'AO',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Piyasa momentumunu 5 ve 34 SMA medyan farki olarak gosteren renkli histogram.',
    defaultParams: {},
    defaultStyles: {
      hist: { color: '#089981', lineWidth: 1 }
    },
    paramSchema: []
  },
  {
    type: 'AcceleratorOscillator',
    name: 'Accelerator Oscillator (AC)',
    shortName: 'AC',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'AO ivmesini ve piyasa hareketinin hizlanma/yavaslama gucunu gosterir.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#00e5ff', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'ROC',
    name: 'Rate of Change (ROC)',
    shortName: 'ROC',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Fiyatin belirli bir sure icindeki yuzde degisim ivmesini olcer.',
    defaultParams: { period: 12 },
    defaultStyles: {
      line: { color: '#ffeb3b', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 1, max: 100, step: 1 }
    ]
  },
  {
    type: 'MOM',
    name: 'Momentum (MOM)',
    shortName: 'MOM',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Kapanis fiyatinin n periyot onceki fiyata gore saf fark momentumu.',
    defaultParams: { period: 10 },
    defaultStyles: {
      line: { color: '#00e5ff', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 1, max: 100, step: 1 }
    ]
  },
  {
    type: 'TSI',
    name: 'True Strength Index (TSI)',
    shortName: 'TSI',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Cift duzeltilmis momentum osilatoru, piyasadaki asiri alim/satim durumlarini gosterir.',
    defaultParams: { r: 25, s: 13 },
    defaultStyles: {
      line: { color: '#2962ff', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'r', label: 'Birinci Duzeltme (r)', type: 'number', min: 2, max: 100, step: 1 },
      { key: 's', label: 'Ikinci Duzeltme (s)', type: 'number', min: 2, max: 50, step: 1 },
    ]
  },
  {
    type: 'UltimateOscillator',
    name: 'Ultimate Oscillator (UO)',
    shortName: 'UO',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Uc farkli zaman dilimini (7, 14, 28) birlestiren kapsamli momentum osilatoru.',
    defaultParams: { p1: 7, p2: 14, p3: 28 },
    defaultStyles: {
      line: { color: '#00e5ff', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'ChandeMO',
    name: 'Chande Momentum Oscillator (CMO)',
    shortName: 'CMO',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Dogrudan momentum hesaplayan -100 ile +100 arasindaki saf momentum gostergesi.',
    defaultParams: { period: 14 },
    defaultStyles: {
      line: { color: '#e040fb', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'DPO',
    name: 'Detrended Price Oscillator (DPO)',
    shortName: 'DPO',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Uzun vadeli trendi ortadan kaldirarak kisa vadeli fiyat dongulerini ortaya cikarir.',
    defaultParams: { period: 20 },
    defaultStyles: {
      line: { color: '#ffeb3b', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'BOP',
    name: 'Balance of Power (BOP)',
    shortName: 'BOP',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Alicilar ve saticilar arasindaki anlik guc dengesini olcer (-1 ile +1).',
    defaultParams: { smooth: 14 },
    defaultStyles: {
      line: { color: '#26a69a', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'smooth', label: 'Duzeltme Periyodu', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'FisherTransform',
    name: 'Fisher Transform',
    shortName: 'FISHER',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Fiyat donuslerini son derece erken ve net sinyallerle Gaussian dagilimina donusturur.',
    defaultParams: { period: 9 },
    defaultStyles: {
      fisher: { color: '#2962ff', lineWidth: 2 },
      trigger: { color: '#ff9800', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 50, step: 1 }
    ]
  },
  {
    type: 'PPO',
    name: 'Percentage Price Oscillator (PPO)',
    shortName: 'PPO',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Iki hareketli ortalamanin yuzde farkini gosteren normalize MACD osilatoru.',
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    defaultStyles: {
      ppo: { color: '#2962ff', lineWidth: 2 },
      signal: { color: '#ff9800', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'fast', label: 'Hizli EMA', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'slow', label: 'Yavas EMA', type: 'number', min: 2, max: 200, step: 1 },
    ]
  },
  {
    type: 'CoppockCurve',
    name: 'Coppock Curve',
    shortName: 'COPPOCK',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Uzun vadeli dip donuslerini yakalayan WMA agirlikli cift ROC egrisi.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#2962ff', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'KST',
    name: 'Know Sure Thing (KST)',
    shortName: 'KST',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Martin Pring tarafindan gelistirilen dort farkli zaman dilimli guclu osilator.',
    defaultParams: {},
    defaultStyles: {
      kst: { color: '#2962ff', lineWidth: 2 },
      signal: { color: '#ff9800', lineWidth: 1 },
    },
    paramSchema: []
  },
  {
    type: 'RVI',
    name: 'Relative Vigor Index (RVI)',
    shortName: 'RVI',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Fiyatin kapanis enerjisini yuksek-dusuk genisligine gore normalize eden vigor gostergesi.',
    defaultParams: { period: 10 },
    defaultStyles: {
      rvi: { color: '#089981', lineWidth: 2 },
      signal: { color: '#f23645', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 50, step: 1 }
    ]
  },
  {
    type: 'ConnorsRSI',
    name: 'Connors RSI (CRSI)',
    shortName: 'CRSI',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'RSI(3), Streak RSI(2) ve Yuzde Rank kombinasyonundan olusan ileri duzey quant osilatoru.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#7e57c2', lineWidth: 2 }
    },
    paramSchema: []
  },

  // ==========================================
  // VOLATILITY (OVERLAY & SUBPANE)
  // ==========================================
  {
    type: 'BollingerBands',
    name: 'Bollinger Bands (BB)',
    shortName: 'BB',
    category: 'Volatility',
    pane: 'overlay',
    description: 'Fiyatin oynakligini (volatilite) ve olasi asiri alim/satim sinirlarini belirler.',
    defaultParams: { period: 20, multiplier: 2 },
    defaultStyles: {
      upper: { color: '#26a69a', lineWidth: 1 },
      middle: { color: '#ff9800', lineWidth: 1 },
      lower: { color: '#ef5350', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 200, step: 1 },
      { key: 'multiplier', label: 'Standart Sapma Carpani', type: 'number', min: 0.5, max: 5, step: 0.1 }
    ]
  },
  {
    type: 'BBWidth',
    name: 'Bollinger Bands Width (BBW)',
    shortName: 'BBW',
    category: 'Volatility',
    pane: 'subpane',
    description: 'Bollinger bantlarinin genisligini yuzde olarak olcerek volatilite sikismalarini tespit eder.',
    defaultParams: { period: 20, multiplier: 2 },
    defaultStyles: {
      line: { color: '#ab47bc', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'BBBPct',
    name: 'Bollinger %B',
    shortName: '%B',
    category: 'Volatility',
    pane: 'subpane',
    description: 'Kapanis fiyatinin Bollinger bantlari arasindaki goreceli konumunu olcer (0 ile 1 arasi).',
    defaultParams: { period: 20, multiplier: 2 },
    defaultStyles: {
      line: { color: '#26a69a', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'KeltnerChannels',
    name: 'Keltner Channels (KC)',
    shortName: 'KC',
    category: 'Volatility',
    pane: 'overlay',
    description: 'EMA ve ATR volatilite bantlari tabanli trend ve kanal gostergesi.',
    defaultParams: { emaPeriod: 20, atrPeriod: 10, multiplier: 2 },
    defaultStyles: {
      upper: { color: '#00bcd4', lineWidth: 1 },
      middle: { color: '#ff9800', lineWidth: 1 },
      lower: { color: '#00bcd4', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'emaPeriod', label: 'EMA Periyodu', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'atrPeriod', label: 'ATR Periyodu', type: 'number', min: 2, max: 50, step: 1 },
      { key: 'multiplier', label: 'Carpan', type: 'number', min: 0.5, max: 5, step: 0.1 },
    ]
  },
  {
    type: 'Donchian',
    name: 'Donchian Channels',
    shortName: 'DC',
    category: 'Volatility',
    pane: 'overlay',
    description: 'En yuksek tepe ve en dusuk dip bantlari ile kanal kirilimlarini gosterir.',
    defaultParams: { period: 20 },
    defaultStyles: {
      upper: { color: '#2962ff', lineWidth: 1 },
      middle: { color: '#ff9800', lineWidth: 1 },
      lower: { color: '#2962ff', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'PriceChannel',
    name: 'Price Channel',
    shortName: 'PC',
    category: 'Volatility',
    pane: 'overlay',
    description: 'Fiyatin periyot icindeki en yuksek ve en dusuk seviye kanali.',
    defaultParams: { period: 20 },
    defaultStyles: {
      upper: { color: '#26c6da', lineWidth: 1 },
      middle: { color: '#ff9800', lineWidth: 1 },
      lower: { color: '#26c6da', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'Envelopes',
    name: 'Moving Average Envelopes',
    shortName: 'ENV',
    category: 'Volatility',
    pane: 'overlay',
    description: 'SMA etrafina belirli bir yuzde mesafede cizilen ust ve alt volatilite zarflari.',
    defaultParams: { period: 20, percent: 5 },
    defaultStyles: {
      upper: { color: '#2962ff', lineWidth: 1 },
      middle: { color: '#ff9800', lineWidth: 1 },
      lower: { color: '#2962ff', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'percent', label: 'Yuzde (%)', type: 'number', min: 0.5, max: 20, step: 0.5 },
    ]
  },
  {
    type: 'ATR',
    name: 'Average True Range (ATR)',
    shortName: 'ATR',
    category: 'Volatility',
    pane: 'subpane',
    description: 'Piyasadaki volatiliteyi gercek aralik ortalamasi olarak olcer.',
    defaultParams: { period: 14 },
    defaultStyles: {
      line: { color: '#ab47bc', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 1, max: 100, step: 1 }
    ]
  },
  {
    type: 'NATR',
    name: 'Normalized Average True Range (NATR)',
    shortName: 'NATR',
    category: 'Volatility',
    pane: 'subpane',
    description: 'ATR degerini fiyata gore normalize ederek yuzdesel volatilite verir.',
    defaultParams: { period: 14 },
    defaultStyles: {
      line: { color: '#ab47bc', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 1, max: 100, step: 1 }
    ]
  },
  {
    type: 'StandardDeviation',
    name: 'Standard Deviation (Standart Sapma)',
    shortName: 'STDEV',
    category: 'Volatility',
    pane: 'subpane',
    description: 'Fiyatin ortalamasindan ne kadar saptigini olcen temel istatistiksel oynaklik gostergesi.',
    defaultParams: { period: 20 },
    defaultStyles: {
      line: { color: '#ab47bc', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'HistoricalVolatility',
    name: 'Historical Volatility (HV)',
    shortName: 'HV',
    category: 'Volatility',
    pane: 'subpane',
    description: 'Yilliklandirilmis tarihsel logaritmik getiri oynakligi yuzdesi.',
    defaultParams: { period: 20 },
    defaultStyles: {
      line: { color: '#ff5722', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'ChaikinVolatility',
    name: 'Chaikin Volatility (CHV)',
    shortName: 'CHV',
    category: 'Volatility',
    pane: 'subpane',
    description: 'Gunici en yuksek ve en dusuk araliginin EMA degisim hizi ile volatilite genislemesini olcer.',
    defaultParams: { period: 10, rocPeriod: 10 },
    defaultStyles: {
      line: { color: '#ff7043', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 50, step: 1 }
    ]
  },

  // ==========================================
  // VOLUME (OVERLAY & SUBPANE)
  // ==========================================
  {
    type: 'Volume',
    name: 'Volume (Hacim ve Hacim MA)',
    shortName: 'VOL',
    category: 'Volume',
    pane: 'overlay',
    description: 'Barlarin islem hacmini ve 20-gunluk hacim ortalamasini gosterir.',
    defaultParams: { maPeriod: 20 },
    defaultStyles: {
      ma: { color: '#2962ff', lineWidth: 1 }
    },
    paramSchema: [
      { key: 'maPeriod', label: 'MA Periyodu', type: 'number', min: 1, max: 100, step: 1 }
    ]
  },
  {
    type: 'VWAP',
    name: 'Volume Weighted Average Price (VWAP)',
    shortName: 'VWAP',
    category: 'Volume',
    pane: 'overlay',
    description: 'Hacim agirlikli ortalama fiyat seviyesi.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#fbc02d', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'VWMA',
    name: 'Volume Weighted Moving Average (VWMA)',
    shortName: 'VWMA',
    category: 'Volume',
    pane: 'overlay',
    description: 'Hacim agirlikli hareketli ortalama, yogun hacimli barlara daha fazla agirlik verir.',
    defaultParams: { period: 20 },
    defaultStyles: {
      line: { color: '#fbc02d', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 200, step: 1 }
    ]
  },
  {
    type: 'VolumeProfile',
    name: 'Volume Profile (Piyasa Hacim Profili - VPVR)',
    shortName: 'VPVR',
    category: 'Volume',
    pane: 'overlay',
    description: 'Gorunur fiyat seviyelerindeki hacim yogunlugunu ve POC (Point of Control) seviyesini gosterir.',
    defaultParams: { bins: 24, valueAreaPct: 70 },
    defaultStyles: {
      poc: { color: '#f23645', lineWidth: 2 },
      val: { color: '#2962ff', lineWidth: 1 },
      vah: { color: '#089981', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'bins', label: 'Dilim Sayisi', type: 'number', min: 10, max: 50, step: 1 },
      { key: 'valueAreaPct', label: 'Value Area (%)', type: 'number', min: 50, max: 90, step: 5 }
    ]
  },
  {
    type: 'SessionVolumeProfile',
    name: 'Session Volume Profile (Oturum Hacim Profili - SVP)',
    shortName: 'SVP',
    category: 'Volume',
    pane: 'overlay',
    description: 'Her seansi veya gunu ayri ayri gruplayarak seans POC, VAH ve VAL seviyelerini cizer.',
    defaultParams: { bins: 24, valueAreaPct: 70 },
    defaultStyles: {
      poc: { color: '#ff2d55', lineWidth: 2 },
      val: { color: '#2962ff', lineWidth: 1 },
      vah: { color: '#089981', lineWidth: 1 },
      upVolume: { color: 'rgba(38, 166, 154, 0.45)', lineWidth: 1 },
      downVolume: { color: 'rgba(239, 83, 80, 0.45)', lineWidth: 1 },
    },
    paramSchema: [
      { key: 'bins', label: 'Dilim Sayisi', type: 'number', min: 10, max: 50, step: 1 },
      { key: 'valueAreaPct', label: 'Value Area (%)', type: 'number', min: 50, max: 90, step: 5 }
    ]
  },
  {
    type: 'CustomPython',
    name: 'Python Quant Script',
    shortName: 'PY',
    category: 'Trend',
    pane: 'overlay',
    description: 'Python Quant Editoru tarafindan olusturulan ozel gosterge ve cizim serileri.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#00e676', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'CustomPine',
    name: 'Quant Script',
    shortName: 'QUANT',
    category: 'Trend',
    pane: 'overlay',
    description: 'Quant script editoru tarafindan olusturulan ozel gosterge ve cizim serileri.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#2962ff', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'OBV',
    name: 'On Balance Volume (OBV)',
    shortName: 'OBV',
    category: 'Volume',
    pane: 'subpane',
    description: 'Hacim akisini kumulatif olarak toplayarak kurumsal birikim veya dagitimi gosterir.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#00e5ff', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'MFI',
    name: 'Money Flow Index (MFI)',
    shortName: 'MFI',
    category: 'Volume',
    pane: 'subpane',
    description: 'Hacim agirlikli RSI, paranin varliga giris ve cikis siddetini olcer.',
    defaultParams: { period: 14, overbought: 80, oversold: 20 },
    defaultStyles: {
      line: { color: '#00bcd4', lineWidth: 2, lineStyle: 0, visible: true },
      upperBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: 80, visible: true },
      middleBand: { color: '#787b86', lineWidth: 1, lineStyle: 1, value: 50, visible: true },
      lowerBand: { color: '#787b86', lineWidth: 1, lineStyle: 2, value: 20, visible: true },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'CMF',
    name: 'Chaikin Money Flow (CMF)',
    shortName: 'CMF',
    category: 'Volume',
    pane: 'subpane',
    description: 'Alim ve satim baskisini hacim agirlikli kumulatif akis olarak olcer.',
    defaultParams: { period: 20 },
    defaultStyles: {
      line: { color: '#26a69a', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'EaseOfMovement',
    name: 'Ease of Movement (EOM)',
    shortName: 'EOM',
    category: 'Volume',
    pane: 'subpane',
    description: 'Fiyatin hacme gore ne kadar kolay veya zor hareket ettigini gosterir.',
    defaultParams: { period: 14 },
    defaultStyles: {
      line: { color: '#00bcd4', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'VolumeOscillator',
    name: 'Volume Oscillator (VO)',
    shortName: 'VO',
    category: 'Volume',
    pane: 'subpane',
    description: 'Iki hacim hareketli ortalamasinin farki ile hacim patlamalarini gosterir.',
    defaultParams: { shortPeriod: 5, longPeriod: 10 },
    defaultStyles: {
      line: { color: '#00e5ff', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'shortPeriod', label: 'Kisa Periyot', type: 'number', min: 2, max: 50, step: 1 },
      { key: 'longPeriod', label: 'Uzun Periyot', type: 'number', min: 2, max: 100, step: 1 },
    ]
  },
  {
    type: 'ADL',
    name: 'Accumulation / Distribution Line (A/D)',
    shortName: 'ADL',
    category: 'Volume',
    pane: 'subpane',
    description: 'Piyasa nakit akisini fiyatin bar icindeki kapanis yerine gore toplayan kumulatif gosterge.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#ffd600', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'PVT',
    name: 'Price Volume Trend (PVT)',
    shortName: 'PVT',
    category: 'Volume',
    pane: 'subpane',
    description: 'Fiyat yuzde degisimiyle agirliklandirilmis kumulatif hacim akis trendi.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#26c6da', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'EFI',
    name: "Elder's Force Index (EFI)",
    shortName: 'EFI',
    category: 'Volume',
    pane: 'subpane',
    description: 'Fiyat hareketinin ardindaki gercek gucu hacim carpimi ile olcen osilator.',
    defaultParams: { period: 13 },
    defaultStyles: {
      line: { color: '#00e676', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'EMA Periyodu', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'ChoppinessIndex',
    name: 'Choppiness Index (CHOP)',
    shortName: 'CHOP',
    category: 'Volatility',
    pane: 'subpane',
    description: 'Piyasanin trend halinde mi yoksa yatay/dalgalı (choppy) mi oldugunu 0-100 araliginda olcer.',
    defaultParams: { period: 14, upperBand: 61.8, lowerBand: 38.2 },
    defaultStyles: {
      line: { color: '#ab47bc', lineWidth: 2, lineStyle: 0, visible: true },
      upperBand: { color: '#ef5350', lineWidth: 1, lineStyle: 2, value: 61.8, visible: true },
      lowerBand: { color: '#26a69a', lineWidth: 1, lineStyle: 2, value: 38.2, visible: true },
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'KlingerOscillator',
    name: 'Klinger Oscillator (KVO)',
    shortName: 'KVO',
    category: 'Volume',
    pane: 'subpane',
    description: 'Hacim akisini fiyat trendi ile birlestirerek uzun vadeli para giris/cikisini olcer.',
    defaultParams: { fast: 34, slow: 55, signal: 13 },
    defaultStyles: {
      kvo: { color: '#2962ff', lineWidth: 2 },
      signal: { color: '#ff5252', lineWidth: 1.5 }
    },
    paramSchema: [
      { key: 'fast', label: 'Hizli EMA', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'slow', label: 'Yavas EMA', type: 'number', min: 5, max: 200, step: 1 },
      { key: 'signal', label: 'Sinyal', type: 'number', min: 1, max: 50, step: 1 }
    ]
  },
  {
    type: 'ChaikinOscillator',
    name: 'Chaikin Oscillator',
    shortName: 'Chaikin Osc',
    category: 'Volume',
    pane: 'subpane',
    description: 'Birikim/Dagitim (A/D) cizgisinin 3 ve 10 gunluk EMA farkini hesaplayan momentum osilatoru.',
    defaultParams: { fast: 3, slow: 10 },
    defaultStyles: {
      line: { color: '#00e676', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'fast', label: 'Hizli Periyot', type: 'number', min: 1, max: 50, step: 1 },
      { key: 'slow', label: 'Yavas Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'TRIX',
    name: 'Triple Exponential Average (TRIX)',
    shortName: 'TRIX',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Uc kez filtrelenmis EMA degisim hizi ile onemsiz piyasa gurultulerini eleyen osilator.',
    defaultParams: { period: 18 },
    defaultStyles: {
      line: { color: '#00bcd4', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 100, step: 1 }
    ]
  },
  {
    type: 'McGinleyDynamic',
    name: 'McGinley Dynamic',
    shortName: 'McGinley',
    category: 'Trend',
    pane: 'overlay',
    description: 'Piyasa hizina ve volatilitesine gore carpanini dinamik ayarlayan gelismis ortalama.',
    defaultParams: { period: 14 },
    defaultStyles: {
      line: { color: '#ff4081', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 200, step: 1 }
    ]
  },
  {
    type: 'LinearRegressionCurve',
    name: 'Linear Regression Curve',
    shortName: 'LinReg',
    category: 'Trend',
    pane: 'overlay',
    description: 'En kucuk kareler regresyon dogrusunun her bar icin bitis noktasini gosteren egrisi.',
    defaultParams: { period: 14 },
    defaultStyles: {
      line: { color: '#7c4dff', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 200, step: 1 }
    ]
  },
  {
    type: 'LinearRegressionSlope',
    name: 'Linear Regression Slope',
    shortName: 'LinReg Slope',
    category: 'Trend',
    pane: 'subpane',
    description: 'Lineer regresyon egrisinin anlik egimini gostererek trend yonu ve gucunu olcer.',
    defaultParams: { period: 14 },
    defaultStyles: {
      line: { color: '#536dfe', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 200, step: 1 }
    ]
  },
  {
    type: 'StandardError',
    name: 'Standard Error (StdErr)',
    shortName: 'StdErr',
    category: 'Volatility',
    pane: 'subpane',
    description: 'Lineer regresyon kestiriminin fiyat sapmalarindan dogan standart hata olcusu.',
    defaultParams: { period: 14 },
    defaultStyles: {
      line: { color: '#ff6e40', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 2, max: 200, step: 1 }
    ]
  },
  {
    type: 'StandardErrorBands',
    name: 'Standard Error Bands',
    shortName: 'StdErr Bands',
    category: 'Volatility',
    pane: 'overlay',
    description: 'Lineer regresyon egrisi etrafinda standart hata bantlari olusturarak dinamik kanallar cizer.',
    defaultParams: { period: 20, mult: 2 },
    defaultStyles: {
      middle: { color: '#7c4dff', lineWidth: 2 },
      upper: { color: '#ff6e40', lineWidth: 1.5 },
      lower: { color: '#ff6e40', lineWidth: 1.5 }
    },
    paramSchema: [
      { key: 'period', label: 'Periyot', type: 'number', min: 3, max: 200, step: 1 },
      { key: 'mult', label: 'Carpan', type: 'number', min: 0.5, max: 5, step: 0.1 }
    ]
  },
  {
    type: 'ChandeKrollStop',
    name: 'Chande Kroll Stop',
    shortName: 'CK Stop',
    category: 'Trend',
    pane: 'overlay',
    description: 'ATR volatilitesine dayali dinamik stop-loss ve trend takip cizgileri sistemi.',
    defaultParams: { p: 10, x: 1, q: 9 },
    defaultStyles: {
      stopLong: { color: '#00e676', lineWidth: 2 },
      stopShort: { color: '#ff5252', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'p', label: 'ATR Periyodu', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'x', label: 'ATR Carpani', type: 'number', min: 0.5, max: 10, step: 0.5 },
      { key: 'q', label: 'Stop Periyodu', type: 'number', min: 2, max: 50, step: 1 }
    ]
  },
  {
    type: 'SMIErgodic',
    name: 'SMI Ergodic Oscillator',
    shortName: 'SMI Ergodic',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Cift yumusatilmis fiyat farklariyla gercek momentum donuslerini tespit eden osilator.',
    defaultParams: { longLen: 20, shortLen: 5, signalLen: 5 },
    defaultStyles: {
      smi: { color: '#2962ff', lineWidth: 2 },
      signal: { color: '#ff9100', lineWidth: 1.5 }
    },
    paramSchema: [
      { key: 'longLen', label: 'Uzun EMA', type: 'number', min: 5, max: 100, step: 1 },
      { key: 'shortLen', label: 'Kisa EMA', type: 'number', min: 2, max: 50, step: 1 },
      { key: 'signalLen', label: 'Sinyal EMA', type: 'number', min: 1, max: 30, step: 1 }
    ]
  },
  {
    type: 'RelativeVolatilityIndex',
    name: 'Relative Volatility Index (RVI Vol)',
    shortName: 'RVI Vol',
    category: 'Volatility',
    pane: 'subpane',
    description: 'Fiyat degisimi yerine standart sapma degerlerini RSI algoritmasiyla hesaplayan volatilite endeksi.',
    defaultParams: { length: 14, stdDevLen: 10 },
    defaultStyles: {
      line: { color: '#e040fb', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'length', label: 'Yumusatma Periyodu', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'stdDevLen', label: 'Std Dev Periyodu', type: 'number', min: 2, max: 50, step: 1 }
    ]
  },
  {
    type: 'NetVolume',
    name: 'Net Volume',
    shortName: 'Net Vol',
    category: 'Volume',
    pane: 'subpane',
    description: 'Yukselis barlarinin hacmini pozitif, dusus barlarinin hacmini negatif gosteren akis cubugu.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#00e5ff', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'AveragePrice',
    name: 'Average Price (OHLC/4)',
    shortName: 'AvgPrice',
    category: 'Trend',
    pane: 'overlay',
    description: 'Barin Acilis, Yuksek, Dusuk ve Kapanis fiyatlarinin aritmetik ortalama cizgisi.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#ffd700', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'TypicalPrice',
    name: 'Typical Price (HLC/3)',
    shortName: 'TypPrice',
    category: 'Trend',
    pane: 'overlay',
    description: 'Piyasa analizlerinde sikca kullanilan Yuksek, Dusuk ve Kapanis ortalama fiyat cizgisi.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#69f0ae', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'MedianPrice',
    name: 'Median Price (HL/2)',
    shortName: 'MedPrice',
    category: 'Trend',
    pane: 'overlay',
    description: 'Barin en yuksek ve en dusuk fiyatlarinin orta noktasini gosteren medyan fiyat cizgisi.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#40c4ff', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'PriceOscillator',
    name: 'Absolute Price Oscillator (APO)',
    shortName: 'APO',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Iki farkli hareketli ortalamanin mutlak fiyat farkini gosteren momentum gostergesi.',
    defaultParams: { fast: 12, slow: 26 },
    defaultStyles: {
      line: { color: '#ffab00', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'fast', label: 'Hizli EMA', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'slow', label: 'Yavas EMA', type: 'number', min: 5, max: 200, step: 1 }
    ]
  },
  {
    type: 'GuppyMMA',
    name: 'Guppy Multiple Moving Average (GMMA)',
    shortName: 'GMMA',
    category: 'Trend',
    pane: 'overlay',
    description: 'Kisa vadeli trade grubu (3,5,8,10,12,15) ve uzun vadeli yatirim grubu (30,35,40,45,50,60) EMA demeti.',
    defaultParams: {},
    defaultStyles: {
      trader: { color: '#00e5ff', lineWidth: 1.5 },
      investor: { color: '#ff3d00', lineWidth: 1.5 }
    },
    paramSchema: []
  },
  {
    type: 'AccumulativeSwingIndex',
    name: 'Accumulative Swing Index (ASI)',
    shortName: 'ASI',
    category: 'Trend',
    pane: 'subpane',
    description: 'Welles Wilder tarafindan gelistirilen gercek piyasa kirilmalarini dogrulayan kumulatif salinim endeksi.',
    defaultParams: { limit: 50 },
    defaultStyles: {
      line: { color: '#76ff03', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'limit', label: 'Limit Fiyat Adimi', type: 'number', min: 1, max: 500, step: 1 }
    ]
  },
  {
    type: 'EMACross',
    name: 'EMA Cross (9 / 21)',
    shortName: 'EMA Cross',
    category: 'Trend',
    pane: 'overlay',
    description: 'Hizli ve yavas EMA kesisimlerini izleyerek trend baslangiclarini tespit eder.',
    defaultParams: { fast: 9, slow: 21 },
    defaultStyles: {
      fast: { color: '#00e676', lineWidth: 2 },
      slow: { color: '#ff1744', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'fast', label: 'Hizli EMA', type: 'number', min: 2, max: 100, step: 1 },
      { key: 'slow', label: 'Yavas EMA', type: 'number', min: 5, max: 200, step: 1 }
    ]
  },
  {
    type: 'MACross',
    name: 'MA Cross (Golden / Death Cross)',
    shortName: 'MA Cross',
    category: 'Trend',
    pane: 'overlay',
    description: '50 ve 200 gunluk ortalamalarin efsanevi Altin Kesisim (Golden Cross) ve Olum Kesisimi (Death Cross) analizi.',
    defaultParams: { fast: 50, slow: 200 },
    defaultStyles: {
      fast: { color: '#ffd600', lineWidth: 2 },
      slow: { color: '#d500f9', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'fast', label: 'Hizli SMA', type: 'number', min: 5, max: 100, step: 1 },
      { key: 'slow', label: 'Yavas SMA', type: 'number', min: 20, max: 500, step: 1 }
    ]
  },
  {
    type: 'MovingAverageChannel',
    name: 'Moving Average Channel (MAC)',
    shortName: 'MA Channel',
    category: 'Trend',
    pane: 'overlay',
    description: 'En yuksek ve en dusuk fiyatlarin hareketli ortalamalarindan olusan dinamik trend kanali.',
    defaultParams: { length: 20 },
    defaultStyles: {
      upper: { color: '#00e676', lineWidth: 1.5 },
      lower: { color: '#ff1744', lineWidth: 1.5 }
    },
    paramSchema: [
      { key: 'length', label: 'Kanal Periyodu', type: 'number', min: 2, max: 200, step: 1 }
    ]
  },
  {
    type: 'TrueRange',
    name: 'True Range (TR)',
    shortName: 'TR',
    category: 'Volatility',
    pane: 'subpane',
    description: 'Onceki kapanis bosluklarini da hesaba katan gercek fiyat araligi olcusu.',
    defaultParams: {},
    defaultStyles: {
      line: { color: '#ff9100', lineWidth: 2 }
    },
    paramSchema: []
  },
  {
    type: 'VolatilityCloseToClose',
    name: 'Volatility Close-to-Close',
    shortName: 'Hist Vol C-C',
    category: 'Volatility',
    pane: 'subpane',
    description: 'Logaritmik kapanis getirilerinin yilliklandirilmis standart sapmasina dayali gerceklesmis volatilite.',
    defaultParams: { length: 20 },
    defaultStyles: {
      line: { color: '#e040fb', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'length', label: 'Periyot', type: 'number', min: 3, max: 200, step: 1 }
    ]
  },
  {
    type: 'RankCorrelationIndex',
    name: 'Rank Correlation Index (RCI)',
    shortName: 'RCI',
    category: 'Oscillator',
    pane: 'subpane',
    description: 'Spearman sira korelasyonu ile zaman ve fiyat siralamasi arasindaki iliskiyi -100 ile +100 arasinda olcer.',
    defaultParams: { length: 9 },
    defaultStyles: {
      line: { color: '#00e5ff', lineWidth: 2 }
    },
    paramSchema: [
      { key: 'length', label: 'Periyot', type: 'number', min: 3, max: 50, step: 1 }
    ]
  },
];

export function createDefaultIndicator(type: IndicatorType): IndicatorConfig {
  const def = INDICATOR_DEFINITIONS.find(d => d.type === type);
  if (!def) {
    throw new Error(`Indicator type ${type} not found in registry`);
  }

  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type: def.type,
    name: def.name,
    pane: def.pane,
    visible: true,
    params: { ...def.defaultParams },
    styles: { ...def.defaultStyles },
  };
}
