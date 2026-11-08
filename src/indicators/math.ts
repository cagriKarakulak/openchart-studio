import { CandleData } from '../types';

/**
 * Quant Mathematical Indicators Engine
 * - Zero look-ahead bias: bar i only accesses [0..i]
 * - Guarded against ZeroDivisionError and NaN/Inf
 * - O(N) optimized time and space complexity
 */

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface MultiValuePoint {
  time: number;
  [key: string]: number | undefined;
}

// Data sanity filter: cleans invalid bars, handles NaN, Inf, and ensures high >= low
export function sanitizeCandles(candles: CandleData[]): CandleData[] {
  if (!candles || candles.length === 0) return [];
  if ((candles as any).__isSanitized) return candles;
  
  const sanitized: CandleData[] = [];
  let prevTime = -1;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (
      typeof c.time !== 'number' || 
      isNaN(c.time) || 
      c.time <= prevTime
    ) {
      // Keep strictly monotonic time
      if (c.time <= prevTime) continue;
    }

    const open = isNaN(c.open) || !isFinite(c.open) || c.open <= 0 ? 1 : c.open;
    const high = isNaN(c.high) || !isFinite(c.high) || c.high <= 0 ? open : c.high;
    const low = isNaN(c.low) || !isFinite(c.low) || c.low <= 0 ? open : c.low;
    const close = isNaN(c.close) || !isFinite(c.close) || c.close <= 0 ? open : c.close;
    const volume = isNaN(c.volume) || !isFinite(c.volume) || c.volume < 0 ? 0 : c.volume;

    const actualHigh = Math.max(open, high, low, close);
    const actualLow = Math.min(open, high, low, close);

    sanitized.push({
      time: c.time,
      open,
      high: actualHigh,
      low: actualLow,
      close,
      volume,
    });

    prevTime = c.time;
  }

  (sanitized as any).__isSanitized = true;
  return sanitized;
}

/**
 * O(log N) binary search to find exact candle matching targetTime.
 * Optimized with bitwise shift for zero arithmetic overhead.
 */
export function findCandleByTime(candles: CandleData[], targetTime: number): CandleData | null {
  const len = candles.length;
  if (len === 0) return null;

  if (candles[0].time === targetTime) return candles[0];
  if (candles[len - 1].time === targetTime) return candles[len - 1];
  if (targetTime < candles[0].time || targetTime > candles[len - 1].time) return null;

  let low = 0;
  let high = len - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const midTime = candles[mid].time;

    if (midTime === targetTime) {
      return candles[mid];
    } else if (midTime < targetTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return null;
}

/**
 * O(log N) binary search to find latest candle with time <= targetTime (floor candle).
 */
export function findFloorCandleByTime(candles: CandleData[], targetTime: number): CandleData | null {
  const len = candles.length;
  if (len === 0) return null;
  if (targetTime < candles[0].time) return null;
  if (targetTime >= candles[len - 1].time) return candles[len - 1];

  let low = 0;
  let high = len - 1;
  let ans = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (candles[mid].time <= targetTime) {
      ans = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return candles[ans];
}

// Convert Candles to Heikin-Ashi
export function calculateHeikinAshi(candles: CandleData[]): CandleData[] {
  const clean = sanitizeCandles(candles);
  if (clean.length === 0) return [];

  const result: CandleData[] = new Array(clean.length);

  // First candle
  const first = clean[0];
  const firstHaClose = (first.open + first.high + first.low + first.close) / 4;
  const firstHaOpen = (first.open + first.close) / 2;
  const firstHaHigh = Math.max(first.high, firstHaOpen, firstHaClose);
  const firstHaLow = Math.min(first.low, firstHaOpen, firstHaClose);

  result[0] = {
    time: first.time,
    open: firstHaOpen,
    high: firstHaHigh,
    low: firstHaLow,
    close: firstHaClose,
    volume: first.volume,
  };

  for (let i = 1; i < clean.length; i++) {
    const curr = clean[i];
    const prev = result[i - 1];

    const haClose = (curr.open + curr.high + curr.low + curr.close) / 4;
    const haOpen = (prev.open + prev.close) / 2;
    const haHigh = Math.max(curr.high, haOpen, haClose);
    const haLow = Math.min(curr.low, haOpen, haClose);

    result[i] = {
      time: curr.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: curr.volume,
    };
  }

  return result;
}

// SMA - Simple Moving Average (O(N) rolling sum)
export function calculateSMA(candles: CandleData[], period: number = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period || period <= 0) return [];

  const result: IndicatorPoint[] = [];
  let sum = 0;

  for (let i = 0; i < clean.length; i++) {
    sum += clean[i].close;
    if (i >= period) {
      sum -= clean[i - period].close;
    }

    if (i >= period - 1) {
      result.push({
        time: clean[i].time,
        value: Number((sum / period).toFixed(6)),
      });
    }
  }

  return result;
}



// EMA - Exponential Moving Average
export function calculateEMA(candles: CandleData[], period: number = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period || period <= 0) return [];

  const result: IndicatorPoint[] = [];
  const k = 2 / (period + 1);

  // Initial SMA as starting point
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += clean[i].close;
  }
  let prevEma = sum / period;

  result.push({
    time: clean[period - 1].time,
    value: Number(prevEma.toFixed(6)),
  });

  for (let i = period; i < clean.length; i++) {
    const currentClose = clean[i].close;
    const currentEma = currentClose * k + prevEma * (1 - k);
    result.push({
      time: clean[i].time,
      value: Number(currentEma.toFixed(6)),
    });
    prevEma = currentEma;
  }

  return result;
}

// WMA - Weighted Moving Average
export function calculateWMA(candles: CandleData[], period: number = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period || period <= 0) return [];

  const result: IndicatorPoint[] = [];
  const denominator = (period * (period + 1)) / 2;

  for (let i = period - 1; i < clean.length; i++) {
    let weightedSum = 0;
    for (let j = 0; j < period; j++) {
      const weight = j + 1;
      weightedSum += clean[i - period + 1 + j].close * weight;
    }
    result.push({
      time: clean[i].time,
      value: Number((weightedSum / denominator).toFixed(6)),
    });
  }

  return result;
}

// RSI - Relative Strength Index (Wilder's Smoothing)
export function calculateRSI(candles: CandleData[], period: number = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period || period <= 0) return [];

  const result: IndicatorPoint[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = clean[i].close - clean[i - 1].close;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  const initialRs = avgLoss === 0 ? 100 : avgGain / Math.max(avgLoss, 1e-12);
  const initialRsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + initialRs));

  result.push({
    time: clean[period].time,
    value: Number(initialRsi.toFixed(2)),
  });

  for (let i = period + 1; i < clean.length; i++) {
    const change = clean[i].close - clean[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    let rsi = 100;
    if (avgLoss > 0) {
      const rs = avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
    } else if (avgGain === 0) {
      rsi = 50;
    }

    result.push({
      time: clean[i].time,
      value: Number(Math.min(100, Math.max(0, rsi)).toFixed(2)),
    });
  }

  return result;
}

// Bollinger Bands
export interface BollingerResult {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export function calculateBollingerBands(
  candles: CandleData[], 
  period: number = 20, 
  stdDevMultiplier: number = 2
): BollingerResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period || period <= 0) return [];

  const result: BollingerResult[] = [];
  let sum = 0;

  for (let i = 0; i < clean.length; i++) {
    sum += clean[i].close;
    if (i >= period) {
      sum -= clean[i - period].close;
    }

    if (i >= period - 1) {
      const mean = sum / period;
      let varianceSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const diff = clean[j].close - mean;
        varianceSum += diff * diff;
      }
      const stdDev = Math.sqrt(varianceSum / period);

      result.push({
        time: clean[i].time,
        middle: Number(mean.toFixed(4)),
        upper: Number((mean + stdDevMultiplier * stdDev).toFixed(4)),
        lower: Number((mean - stdDevMultiplier * stdDev).toFixed(4)),
      });
    }
  }

  return result;
}



// MACD (Moving Average Convergence Divergence)
export interface MACDResult {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export function calculateMACD(
  candles: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < slowPeriod + signalPeriod) return [];

  const fastEma = calculateEMA(clean, fastPeriod);
  const slowEma = calculateEMA(clean, slowPeriod);

  // Fast and Slow EMA alignment by timestamp
  const slowMap = new Map<number, number>();
  for (const p of slowEma) {
    slowMap.set(p.time, p.value);
  }

  const macdLinePoints: { time: number; close: number }[] = [];
  for (const p of fastEma) {
    const slowVal = slowMap.get(p.time);
    if (slowVal !== undefined) {
      macdLinePoints.push({
        time: p.time,
        close: p.value - slowVal,
      });
    }
  }

  // Construct candle dummy to use calculateEMA for Signal line
  const dummyCandles: CandleData[] = macdLinePoints.map(m => ({
    time: m.time,
    open: m.close,
    high: m.close,
    low: m.close,
    close: m.close,
    volume: 0,
  }));

  const signalLine = calculateEMA(dummyCandles, signalPeriod);
  const signalMap = new Map<number, number>();
  for (const s of signalLine) {
    signalMap.set(s.time, s.value);
  }

  const result: MACDResult[] = [];
  for (const m of macdLinePoints) {
    const sigVal = signalMap.get(m.time);
    if (sigVal !== undefined) {
      const hist = m.close - sigVal;
      result.push({
        time: m.time,
        macd: Number(m.close.toFixed(4)),
        signal: Number(sigVal.toFixed(4)),
        histogram: Number(hist.toFixed(4)),
      });
    }
  }

  return result;
}



// ATR - Average True Range
export function calculateATR(candles: CandleData[], period: number = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period || period <= 0) return [];

  const trueRanges: { time: number; tr: number }[] = [];

  for (let i = 1; i < clean.length; i++) {
    const curr = clean[i];
    const prev = clean[i - 1];
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    trueRanges.push({ time: curr.time, tr });
  }

  // First ATR is simple average of first 'period' TRs
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += trueRanges[i].tr;
  }
  let prevAtr = sum / period;

  const result: IndicatorPoint[] = [
    { time: trueRanges[period - 1].time, value: Number(prevAtr.toFixed(4)) }
  ];

  for (let i = period; i < trueRanges.length; i++) {
    const currentAtr = (prevAtr * (period - 1) + trueRanges[i].tr) / period;
    result.push({
      time: trueRanges[i].time,
      value: Number(currentAtr.toFixed(4)),
    });
    prevAtr = currentAtr;
  }

  return result;
}

// Supertrend
export interface SupertrendResult {
  time: number;
  value: number;
  direction: 1 | -1; // 1 = Bullish (Green), -1 = Bearish (Red)
}

export function calculateSupertrend(
  candles: CandleData[],
  period: number = 10,
  multiplier: number = 3
): SupertrendResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period) return [];

  const atrPoints = calculateATR(clean, period);
  const atrMap = new Map<number, number>();
  for (const a of atrPoints) {
    atrMap.set(a.time, a.value);
  }

  const result: SupertrendResult[] = [];
  let prevUpper = 0;
  let prevLower = 0;
  let prevTrend: 1 | -1 = 1;
  let initialized = false;

  for (let i = 1; i < clean.length; i++) {
    const curr = clean[i];
    const prev = clean[i - 1];
    const atr = atrMap.get(curr.time);
    if (atr === undefined) continue;

    const hl2 = (curr.high + curr.low) / 2;
    let basicUpper = hl2 + multiplier * atr;
    let basicLower = hl2 - multiplier * atr;

    if (!initialized) {
      prevUpper = basicUpper;
      prevLower = basicLower;
      prevTrend = curr.close >= basicUpper ? 1 : -1;
      initialized = true;
      result.push({
        time: curr.time,
        value: prevTrend === 1 ? prevLower : prevUpper,
        direction: prevTrend,
      });
      continue;
    }

    // Final Upper Band
    const finalUpper = (basicUpper < prevUpper || prev.close > prevUpper) ? basicUpper : prevUpper;
    // Final Lower Band
    const finalLower = (basicLower > prevLower || prev.close < prevLower) ? basicLower : prevLower;

    let currentTrend: 1 | -1 = prevTrend;
    if (prevTrend === 1 && curr.close < finalLower) {
      currentTrend = -1;
    } else if (prevTrend === -1 && curr.close > finalUpper) {
      currentTrend = 1;
    }

    result.push({
      time: curr.time,
      value: Number((currentTrend === 1 ? finalLower : finalUpper).toFixed(4)),
      direction: currentTrend,
    });

    prevUpper = finalUpper;
    prevLower = finalLower;
    prevTrend = currentTrend;
  }

  return result;
}

// Stochastic Oscillator (%K, %D)
export interface StochasticResult {
  time: number;
  k: number;
  d: number;
}

export function calculateStochastic(
  candles: CandleData[],
  periodK: number = 14,
  smoothK: number = 3,
  smoothD: number = 3
): StochasticResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < periodK + smoothK + smoothD) return [];

  const rawK: { time: number; val: number }[] = [];

  for (let i = periodK - 1; i < clean.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - periodK + 1; j <= i; j++) {
      if (clean[j].high > highest) highest = clean[j].high;
      if (clean[j].low < lowest) lowest = clean[j].low;
    }

    const range = highest - lowest;
    const k = range <= 0 ? 50 : ((clean[i].close - lowest) / Math.max(range, 1e-12)) * 100;
    rawK.push({ time: clean[i].time, val: k });
  }

  // Smooth K with SMA
  const smoothedK: { time: number; val: number }[] = [];
  let kSum = 0;
  for (let i = 0; i < rawK.length; i++) {
    kSum += rawK[i].val;
    if (i >= smoothK) kSum -= rawK[i - smoothK].val;
    if (i >= smoothK - 1) {
      smoothedK.push({
        time: rawK[i].time,
        val: kSum / smoothK,
      });
    }
  }

  // Calculate D (SMA of smoothed K)
  const result: StochasticResult[] = [];
  let dSum = 0;
  for (let i = 0; i < smoothedK.length; i++) {
    dSum += smoothedK[i].val;
    if (i >= smoothD) dSum -= smoothedK[i - smoothD].val;
    if (i >= smoothD - 1) {
      result.push({
        time: smoothedK[i].time,
        k: Number(smoothedK[i].val.toFixed(2)),
        d: Number((dSum / smoothD).toFixed(2)),
      });
    }
  }

  return result;
}



// VWAP - Volume Weighted Average Price
export function calculateVWAP(candles: CandleData[]): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length === 0) return [];

  const result: IndicatorPoint[] = [];
  let cumulativeTPV = 0;
  let cumulativeVol = 0;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativeTPV += typicalPrice * c.volume;
    cumulativeVol += c.volume;

    const vwap = cumulativeVol > 0 ? cumulativeTPV / cumulativeVol : typicalPrice;
    result.push({
      time: c.time,
      value: Number(vwap.toFixed(4)),
    });
  }

  return result;
}

// Volume MA (Bullish/Bearish Volume with MA line)
export interface VolumePoint {
  time: number;
  value: number;
  color: string;
}

export function calculateVolumeSeries(candles: CandleData[]): {
  volumes: VolumePoint[];
  volumeMA: IndicatorPoint[];
} {
  const clean = sanitizeCandles(candles);
  const volumes: VolumePoint[] = [];
  const maPeriod = 20;
  let sum = 0;
  const volumeMA: IndicatorPoint[] = [];

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    const isUp = c.close >= c.open;
    // Standard palette: Up = rgba(8, 153, 129, 0.4), Down = rgba(242, 54, 69, 0.4)
    volumes.push({
      time: c.time,
      value: c.volume,
      color: isUp ? 'rgba(8, 153, 129, 0.45)' : 'rgba(242, 54, 69, 0.45)',
    });

    sum += c.volume;
    if (i >= maPeriod) {
      sum -= clean[i - maPeriod].volume;
    }
    if (i >= maPeriod - 1) {
      volumeMA.push({
        time: c.time,
        value: Number((sum / maPeriod).toFixed(2)),
      });
    }
  }

  return { volumes, volumeMA };
}


// Ichimoku Kinko Hyo
export interface IchimokuResult {
  time: number;
  tenkan: number;
  kijun: number;
  spanA: number;
  spanB: number;
}

export function calculateIchimoku(
  candles: CandleData[],
  tenkanPeriod = 9,
  kijunPeriod = 26,
  spanBPeriod = 52
): IchimokuResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < spanBPeriod) return [];

  const getHighLowMid = (endIdx: number, period: number) => {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let i = endIdx - period + 1; i <= endIdx; i++) {
      if (clean[i].high > highest) highest = clean[i].high;
      if (clean[i].low < lowest) lowest = clean[i].low;
    }
    return (highest + lowest) / 2;
  };

  const result: IchimokuResult[] = [];

  for (let i = spanBPeriod - 1; i < clean.length; i++) {
    const tenkan = getHighLowMid(i, tenkanPeriod);
    const kijun = getHighLowMid(i, kijunPeriod);
    const spanA = (tenkan + kijun) / 2;
    const spanB = getHighLowMid(i, spanBPeriod);

    result.push({
      time: clean[i].time,
      tenkan: Number(tenkan.toFixed(2)),
      kijun: Number(kijun.toFixed(2)),
      spanA: Number(spanA.toFixed(2)),
      spanB: Number(spanB.toFixed(2)),
    });
  }

  return result;
}

// Parabolic SAR (Stop and Reverse)
export function calculateParabolicSAR(
  candles: CandleData[],
  startAF = 0.02,
  increment = 0.02,
  maxAF = 0.20
): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < 3) return [];

  const result: IndicatorPoint[] = [];
  let isLong = clean[1].close >= clean[0].close;
  let af = startAF;
  let ep = isLong ? clean[1].high : clean[1].low;
  let sar = isLong ? clean[0].low : clean[0].high;

  for (let i = 2; i < clean.length; i++) {
    const prev = clean[i - 1];
    const curr = clean[i];

    sar = sar + af * (ep - sar);

    if (isLong) {
      if (prev.low < sar) sar = prev.low;
      if (clean[i - 2].low < sar) sar = clean[i - 2].low;

      if (curr.low < sar) {
        isLong = false;
        sar = ep;
        af = startAF;
        ep = curr.low;
      } else {
        if (curr.high > ep) {
          ep = curr.high;
          af = Math.min(af + increment, maxAF);
        }
      }
    } else {
      if (prev.high > sar) sar = prev.high;
      if (clean[i - 2].high > sar) sar = clean[i - 2].high;

      if (curr.high > sar) {
        isLong = true;
        sar = ep;
        af = startAF;
        ep = curr.high;
      } else {
        if (curr.low < ep) {
          ep = curr.low;
          af = Math.min(af + increment, maxAF);
        }
      }
    }

    result.push({
      time: curr.time,
      value: Number(sar.toFixed(2)),
    });
  }

  return result;
}

// Keltner Channels
export interface KeltnerResult {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export function calculateKeltnerChannels(
  candles: CandleData[],
  emaPeriod = 20,
  atrPeriod = 10,
  multiplier = 2
): KeltnerResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < Math.max(emaPeriod, atrPeriod)) return [];

  const ema = calculateEMA(clean, emaPeriod);
  const atr = calculateATR(clean, atrPeriod);

  const atrMap = new Map<number, number>();
  atr.forEach(a => atrMap.set(a.time, a.value));

  const result: KeltnerResult[] = [];
  for (const e of ema) {
    const a = atrMap.get(e.time);
    if (a !== undefined) {
      result.push({
        time: e.time,
        middle: e.value,
        upper: Number((e.value + multiplier * a).toFixed(2)),
        lower: Number((e.value - multiplier * a).toFixed(2)),
      });
    }
  }

  return result;
}



// Volume Profile (Market Profile)
export interface VolumeProfileBin {
  priceLevel: number;
  volume: number;
  isPoc: boolean; // Point of Control
}

export function calculateVolumeProfile(candles: CandleData[], binsCount = 24): {
  bins: VolumeProfileBin[];
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
} {
  const clean = sanitizeCandles(candles);
  if (clean.length === 0) {
    return { bins: [], pocPrice: 0, vahPrice: 0, valPrice: 0 };
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let totalVolume = 0;

  for (const c of clean) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
    totalVolume += c.volume;
  }

  const range = maxPrice - minPrice;
  if (range <= 0) return { bins: [], pocPrice: minPrice, vahPrice: maxPrice, valPrice: minPrice };

  const binStep = range / binsCount;
  const volumes: number[] = new Array(binsCount).fill(0);

  for (const c of clean) {
    const binIdx = Math.min(
      Math.floor((c.close - minPrice) / binStep),
      binsCount - 1
    );
    volumes[binIdx] += c.volume;
  }

  let maxVol = -1;
  let pocIdx = 0;
  for (let i = 0; i < binsCount; i++) {
    if (volumes[i] > maxVol) {
      maxVol = volumes[i];
      pocIdx = i;
    }
  }

  const pocPrice = minPrice + (pocIdx + 0.5) * binStep;
  // Value Area = 70% of volume
  const targetAreaVolume = totalVolume * 0.70;
  let currentAreaVolume = volumes[pocIdx];
  let up = pocIdx;
  let down = pocIdx;

  while (currentAreaVolume < targetAreaVolume && (up < binsCount - 1 || down > 0)) {
    const upVol = up < binsCount - 1 ? volumes[up + 1] : 0;
    const downVol = down > 0 ? volumes[down - 1] : 0;
    if (upVol >= downVol && up < binsCount - 1) {
      up++;
      currentAreaVolume += upVol;
    } else if (down > 0) {
      down--;
      currentAreaVolume += downVol;
    } else if (up < binsCount - 1) {
      up++;
      currentAreaVolume += upVol;
    } else {
      break;
    }
  }

  const vahPrice = minPrice + (up + 1) * binStep;
  const valPrice = minPrice + down * binStep;

  const bins: VolumeProfileBin[] = volumes.map((v, i) => ({
    priceLevel: Number((minPrice + (i + 0.5) * binStep).toFixed(2)),
    volume: v,
    isPoc: i === pocIdx,
  }));

  return {
    bins,
    pocPrice: Number(pocPrice.toFixed(2)),
    vahPrice: Number(vahPrice.toFixed(2)),
    valPrice: Number(valPrice.toFixed(2)),
  };
}

// 1. CCI - Commodity Channel Index
export function calculateCCI(candles: CandleData[], period = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const result: IndicatorPoint[] = [];
  const tpList: number[] = clean.map(c => (c.high + c.low + c.close) / 3);

  for (let i = period - 1; i < clean.length; i++) {
    // Mean of TP
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += tpList[j];
    }
    const mean = sum / period;

    // Mean absolute deviation
    let devSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      devSum += Math.abs(tpList[j] - mean);
    }
    const meanDev = devSum / period;

    const currentTp = tpList[i];
    const cci = meanDev === 0 ? 0 : (currentTp - mean) / (0.015 * meanDev);

    result.push({
      time: clean[i].time,
      value: Number(cci.toFixed(2)),
    });
  }

  return result;
}

// 2. Williams %R (-100 to 0)
export function calculateWilliamsR(candles: CandleData[], period = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const result: IndicatorPoint[] = [];

  for (let i = period - 1; i < clean.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (clean[j].high > highest) highest = clean[j].high;
      if (clean[j].low < lowest) lowest = clean[j].low;
    }

    const range = highest - lowest;
    const wr = range <= 0 ? -50 : ((highest - clean[i].close) / Math.max(range, 1e-12)) * -100;

    result.push({
      time: clean[i].time,
      value: Number(wr.toFixed(2)),
    });
  }

  return result;
}

// 3. Awesome Oscillator (AO: SMA(Median Price, 5) - SMA(Median Price, 34))
export interface AOResult {
  time: number;
  value: number;
  color: string;
}

export function calculateAwesomeOscillator(candles: CandleData[]): AOResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < 34) return [];

  const medians = clean.map(c => (c.high + c.low) / 2);
  const result: AOResult[] = [];

  let sum5 = 0;
  let sum34 = 0;

  for (let i = 0; i < clean.length; i++) {
    sum5 += medians[i];
    sum34 += medians[i];

    if (i >= 5) sum5 -= medians[i - 5];
    if (i >= 34) sum34 -= medians[i - 34];

    if (i >= 33) {
      const sma5 = sum5 / 5;
      const sma34 = sum34 / 34;
      const ao = sma5 - sma34;

      const prevAo = result.length > 0 ? result[result.length - 1].value : ao;
      const isUp = ao >= prevAo;

      result.push({
        time: clean[i].time,
        value: Number(ao.toFixed(4)),
        color: isUp ? '#089981' : '#f23645',
      });
    }
  }

  return result;
}



// 4. Money Flow Index (MFI - 0 to 100)
export function calculateMFI(candles: CandleData[], period = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period) return [];

  const typicalPrices = clean.map(c => (c.high + c.low + c.close) / 3);
  const rawMoneyFlow = clean.map((c, i) => typicalPrices[i] * c.volume);

  const result: IndicatorPoint[] = [];

  for (let i = period; i < clean.length; i++) {
    let posFlow = 0;
    let negFlow = 0;

    for (let j = i - period + 1; j <= i; j++) {
      if (typicalPrices[j] > typicalPrices[j - 1]) {
        posFlow += rawMoneyFlow[j];
      } else if (typicalPrices[j] < typicalPrices[j - 1]) {
        negFlow += rawMoneyFlow[j];
      }
    }

    const mr = negFlow === 0 ? 100 : posFlow / Math.max(negFlow, 1e-12);
    const mfi = 100 - (100 / (1 + mr));

    result.push({
      time: clean[i].time,
      value: Number(Math.min(100, Math.max(0, mfi)).toFixed(2)),
    });
  }

  return result;
}

// 5. Rate of Change (ROC % momentum)
export function calculateROC(candles: CandleData[], period = 12): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period) return [];

  const result: IndicatorPoint[] = [];

  for (let i = period; i < clean.length; i++) {
    const prevClose = clean[i - period].close;
    const currClose = clean[i].close;
    const roc = prevClose !== 0 ? ((currClose - prevClose) / prevClose) * 100 : 0;

    result.push({
      time: clean[i].time,
      value: Number(roc.toFixed(2)),
    });
  }

  return result;
}

// 6. Chaikin Money Flow (CMF)
export function calculateCMF(candles: CandleData[], period = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const mfvList: number[] = [];
  for (const c of clean) {
    const range = c.high - c.low;
    const clv = range === 0 ? 0 : ((c.close - c.low) - (c.high - c.close)) / range;
    mfvList.push(clv * c.volume);
  }

  const result: IndicatorPoint[] = [];
  let mfvSum = 0;
  let volSum = 0;

  for (let i = 0; i < clean.length; i++) {
    mfvSum += mfvList[i];
    volSum += clean[i].volume;

    if (i >= period) {
      mfvSum -= mfvList[i - period];
      volSum -= clean[i - period].volume;
    }

    if (i >= period - 1) {
      const cmf = volSum === 0 ? 0 : mfvSum / volSum;
      result.push({
        time: clean[i].time,
        value: Number(cmf.toFixed(4)),
      });
    }
  }

  return result;
}



// 7. Donchian Channels (20-period High/Low)
export interface DonchianResult {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export function calculateDonchianChannels(candles: CandleData[], period = 20): DonchianResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const result: DonchianResult[] = [];

  for (let i = period - 1; i < clean.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (clean[j].high > highest) highest = clean[j].high;
      if (clean[j].low < lowest) lowest = clean[j].low;
    }

    result.push({
      time: clean[i].time,
      upper: Number(highest.toFixed(2)),
      middle: Number(((highest + lowest) / 2).toFixed(2)),
      lower: Number(lowest.toFixed(2)),
    });
  }

  return result;
}

// 8. Hull Moving Average (HMA: WMA(2*WMA(n/2) - WMA(n)), sqrt(n))
export function calculateHMA(candles: CandleData[], period = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));

  const wmaHalf = calculateWMA(clean, halfPeriod);
  const wmaFull = calculateWMA(clean, period);

  const fullMap = new Map<number, number>();
  wmaFull.forEach(p => fullMap.set(p.time, p.value));

  const diffCandles: CandleData[] = [];
  for (const h of wmaHalf) {
    const f = fullMap.get(h.time);
    if (f !== undefined) {
      const diff = 2 * h.value - f;
      diffCandles.push({
        time: h.time,
        open: diff,
        high: diff,
        low: diff,
        close: diff,
        volume: 0,
      });
    }
  }

  return calculateWMA(diffCandles, sqrtPeriod);
}

// 9. Pivot Points Standard (P, R1, R2, R3, S1, S2, S3)
export interface PivotResult {
  time: number;
  p: number;
  r1: number;
  s1: number;
  r2: number;
  s2: number;
}

export function calculatePivotPoints(candles: CandleData[]): PivotResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length === 0) return [];

  // Use rolling 24-bar window to estimate recent session high/low/close
  const windowSize = Math.min(24, clean.length);
  const result: PivotResult[] = [];

  for (let i = windowSize - 1; i < clean.length; i++) {
    let high = -Infinity;
    let low = Infinity;
    for (let j = i - windowSize + 1; j <= i; j++) {
      if (clean[j].high > high) high = clean[j].high;
      if (clean[j].low < low) low = clean[j].low;
    }
    const close = clean[i].close;

    const p = (high + low + close) / 3;
    const r1 = 2 * p - low;
    const s1 = 2 * p - high;
    const r2 = p + (high - low);
    const s2 = p - (high - low);

    result.push({
      time: clean[i].time,
      p: Number(p.toFixed(2)),
      r1: Number(r1.toFixed(2)),
      s1: Number(s1.toFixed(2)),
      r2: Number(r2.toFixed(2)),
      s2: Number(s2.toFixed(2)),
    });
  }

  return result;
}

// 10. ADX & DMI (Average Directional Index: +DI, -DI, ADX)
export interface ADXResult {
  time: number;
  adx: number;
  plusDI: number;
  minusDI: number;
}

export function calculateADX(candles: CandleData[], period = 14): ADXResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period * 2) return [];

  const trList: number[] = [];
  const plusDMList: number[] = [];
  const minusDMList: number[] = [];

  for (let i = 1; i < clean.length; i++) {
    const curr = clean[i];
    const prev = clean[i - 1];

    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    trList.push(tr);

    const upMove = curr.high - prev.high;
    const downMove = prev.low - curr.low;

    if (upMove > downMove && upMove > 0) plusDMList.push(upMove);
    else plusDMList.push(0);

    if (downMove > upMove && downMove > 0) minusDMList.push(downMove);
    else minusDMList.push(0);
  }

  // Initial Wilder's sum
  let trSmooth = 0;
  let plusDMSmooth = 0;
  let minusDMSmooth = 0;

  for (let i = 0; i < period; i++) {
    trSmooth += trList[i];
    plusDMSmooth += plusDMList[i];
    minusDMSmooth += minusDMList[i];
  }

  const dxList: { time: number; dx: number; plusDI: number; minusDI: number }[] = [];

  const calcDX = (time: number, trS: number, pS: number, mS: number) => {
    const pDI = trS === 0 ? 0 : (pS / trS) * 100;
    const mDI = trS === 0 ? 0 : (mS / trS) * 100;
    const diDiff = Math.abs(pDI - mDI);
    const diSum = pDI + mDI;
    const dx = diSum === 0 ? 0 : (diDiff / diSum) * 100;
    return { time, dx, plusDI: Number(pDI.toFixed(2)), minusDI: Number(mDI.toFixed(2)) };
  };

  dxList.push(calcDX(clean[period].time, trSmooth, plusDMSmooth, minusDMSmooth));

  for (let i = period; i < trList.length; i++) {
    trSmooth = trSmooth - (trSmooth / period) + trList[i];
    plusDMSmooth = plusDMSmooth - (plusDMSmooth / period) + plusDMList[i];
    minusDMSmooth = minusDMSmooth - (minusDMSmooth / period) + minusDMList[i];

    dxList.push(calcDX(clean[i + 1].time, trSmooth, plusDMSmooth, minusDMSmooth));
  }

  if (dxList.length < period) return [];

  // Smooth DX to get ADX
  let adxSum = 0;
  for (let i = 0; i < period; i++) {
    adxSum += dxList[i].dx;
  }
  let prevADX = adxSum / period;

  const result: ADXResult[] = [{
    time: dxList[period - 1].time,
    adx: Number(prevADX.toFixed(2)),
    plusDI: dxList[period - 1].plusDI,
    minusDI: dxList[period - 1].minusDI,
  }];

  for (let i = period; i < dxList.length; i++) {
    prevADX = (prevADX * (period - 1) + dxList[i].dx) / period;
    result.push({
      time: dxList[i].time,
      adx: Number(prevADX.toFixed(2)),
      plusDI: dxList[i].plusDI,
      minusDI: dxList[i].minusDI,
    });
  }

  return result;
}

// 11. Stochastic RSI (%K, %D of RSI)
export interface StochRSIResult {
  time: number;
  k: number;
  d: number;
}

export function calculateStochRSI(
  candles: CandleData[],
  rsiPeriod = 14,
  stochPeriod = 14,
  smoothK = 3,
  smoothD = 3
): StochRSIResult[] {
  const rsiPoints = calculateRSI(candles, rsiPeriod);
  if (rsiPoints.length < stochPeriod + smoothK + smoothD) return [];

  const rawStoch: { time: number; val: number }[] = [];

  for (let i = stochPeriod - 1; i < rsiPoints.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - stochPeriod + 1; j <= i; j++) {
      if (rsiPoints[j].value > highest) highest = rsiPoints[j].value;
      if (rsiPoints[j].value < lowest) lowest = rsiPoints[j].value;
    }

    const range = highest - lowest;
    const val = range <= 0 ? 50 : ((rsiPoints[i].value - lowest) / Math.max(range, 1e-12)) * 100;
    rawStoch.push({ time: rsiPoints[i].time, val });
  }

  // Smooth K
  const smoothedK: { time: number; val: number }[] = [];
  let kSum = 0;
  for (let i = 0; i < rawStoch.length; i++) {
    kSum += rawStoch[i].val;
    if (i >= smoothK) kSum -= rawStoch[i - smoothK].val;
    if (i >= smoothK - 1) {
      smoothedK.push({ time: rawStoch[i].time, val: kSum / smoothK });
    }
  }

  // Smooth D
  const result: StochRSIResult[] = [];
  let dSum = 0;
  for (let i = 0; i < smoothedK.length; i++) {
    dSum += smoothedK[i].val;
    if (i >= smoothD) dSum -= smoothedK[i - smoothD].val;
    if (i >= smoothD - 1) {
      result.push({
        time: smoothedK[i].time,
        k: Number(smoothedK[i].val.toFixed(2)),
        d: Number((dSum / smoothD).toFixed(2)),
      });
    }
  }

  return result;
}



// 12. OBV - On Balance Volume
export function calculateOBV(candles: CandleData[]): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length === 0) return [];

  const result: IndicatorPoint[] = [{ time: clean[0].time, value: clean[0].volume }];
  let obv = clean[0].volume;

  for (let i = 1; i < clean.length; i++) {
    const curr = clean[i];
    const prev = clean[i - 1];

    if (curr.close > prev.close) {
      obv += curr.volume;
    } else if (curr.close < prev.close) {
      obv -= curr.volume;
    }

    result.push({ time: curr.time, value: Math.round(obv) });
  }

  return result;
}

// 13. DEMA - Double Exponential Moving Average
export function calculateDEMA(candles: CandleData[], period = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period * 2) return [];

  const ema1 = calculateEMA(clean, period);
  const ema1Candles: CandleData[] = ema1.map(e => ({
    time: e.time,
    open: e.value,
    high: e.value,
    low: e.value,
    close: e.value,
    volume: 0,
  }));
  const ema2 = calculateEMA(ema1Candles, period);

  const ema1Map = new Map<number, number>();
  ema1.forEach(e => ema1Map.set(e.time, e.value));

  const result: IndicatorPoint[] = [];
  for (const e2 of ema2) {
    const e1Val = ema1Map.get(e2.time);
    if (e1Val !== undefined) {
      const dema = 2 * e1Val - e2.value;
      result.push({ time: e2.time, value: Number(dema.toFixed(2)) });
    }
  }

  return result;
}



// 14. TEMA - Triple Exponential Moving Average
export function calculateTEMA(candles: CandleData[], period = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period * 3) return [];

  const ema1 = calculateEMA(clean, period);
  const toCandles = (arr: IndicatorPoint[]): CandleData[] => arr.map(e => ({
    time: e.time, open: e.value, high: e.value, low: e.value, close: e.value, volume: 0,
  }));

  const ema2 = calculateEMA(toCandles(ema1), period);
  const ema3 = calculateEMA(toCandles(ema2), period);

  const ema1Map = new Map<number, number>();
  ema1.forEach(e => ema1Map.set(e.time, e.value));
  const ema2Map = new Map<number, number>();
  ema2.forEach(e => ema2Map.set(e.time, e.value));

  const result: IndicatorPoint[] = [];
  for (const e3 of ema3) {
    const e1Val = ema1Map.get(e3.time);
    const e2Val = ema2Map.get(e3.time);
    if (e1Val !== undefined && e2Val !== undefined) {
      const tema = 3 * e1Val - 3 * e2Val + e3.value;
      result.push({ time: e3.time, value: Number(tema.toFixed(2)) });
    }
  }

  return result;
}



// 15. VWMA - Volume Weighted Moving Average
export function calculateVWMA(candles: CandleData[], period = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const result: IndicatorPoint[] = [];
  let pvSum = 0;
  let vSum = 0;

  for (let i = 0; i < clean.length; i++) {
    pvSum += clean[i].close * clean[i].volume;
    vSum += clean[i].volume;

    if (i >= period) {
      pvSum -= clean[i - period].close * clean[i - period].volume;
      vSum -= clean[i - period].volume;
    }

    if (i >= period - 1) {
      const vwma = vSum === 0 ? clean[i].close : pvSum / vSum;
      result.push({ time: clean[i].time, value: Number(vwma.toFixed(2)) });
    }
  }

  return result;
}



// 16. Aroon (Aroon Up, Aroon Down, Oscillator)
export interface AroonResult {
  time: number;
  up: number;
  down: number;
  oscillator: number;
}

export function calculateAroon(candles: CandleData[], period = 14): AroonResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period) return [];

  const result: AroonResult[] = [];

  for (let i = period; i < clean.length; i++) {
    let highestIdx = i;
    let lowestIdx = i;
    let highest = -Infinity;
    let lowest = Infinity;

    for (let j = i - period; j <= i; j++) {
      if (clean[j].high >= highest) {
        highest = clean[j].high;
        highestIdx = j;
      }
      if (clean[j].low <= lowest) {
        lowest = clean[j].low;
        lowestIdx = j;
      }
    }

    const up = ((period - (i - highestIdx)) / period) * 100;
    const down = ((period - (i - lowestIdx)) / period) * 100;

    result.push({
      time: clean[i].time,
      up: Number(up.toFixed(2)),
      down: Number(down.toFixed(2)),
      oscillator: Number((up - down).toFixed(2)),
    });
  }

  return result;
}

// 17. Envelopes (SMA ± % Percentage Band)
export interface EnvelopesResult {
  time: number;
  middle: number;
  upper: number;
  lower: number;
}

export function calculateEnvelopes(candles: CandleData[], period = 20, percent = 5): EnvelopesResult[] {
  const sma = calculateSMA(candles, period);
  const factor = percent / 100;

  return sma.map(s => ({
    time: s.time,
    middle: s.value,
    upper: Number((s.value * (1 + factor)).toFixed(2)),
    lower: Number((s.value * (1 - factor)).toFixed(2)),
  }));
}

// 18. Standard Deviation
export function calculateStandardDeviation(candles: CandleData[], period = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const result: IndicatorPoint[] = [];
  let sum = 0;

  for (let i = 0; i < clean.length; i++) {
    sum += clean[i].close;
    if (i >= period) sum -= clean[i - period].close;

    if (i >= period - 1) {
      const mean = sum / period;
      let varSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const d = clean[j].close - mean;
        varSum += d * d;
      }
      result.push({ time: clean[i].time, value: Number(Math.sqrt(varSum / period).toFixed(2)) });
    }
  }

  return result;
}



// 19. Historical Volatility (HV %)
export function calculateHistoricalVolatility(candles: CandleData[], period = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period) return [];

  const logReturns: number[] = [];
  for (let i = 1; i < clean.length; i++) {
    logReturns.push(Math.log(clean[i].close / clean[i - 1].close));
  }

  const result: IndicatorPoint[] = [];
  for (let i = period - 1; i < logReturns.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += logReturns[j];
    const mean = sum / period;

    let varSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = logReturns[j] - mean;
      varSum += diff * diff;
    }
    const stdDev = Math.sqrt(varSum / (period - 1));
    const annualized = stdDev * Math.sqrt(365) * 100;

    result.push({ time: clean[i + 1].time, value: Number(annualized.toFixed(2)) });
  }

  return result;
}

// 20. TSI - True Strength Index
export function calculateTSI(candles: CandleData[], r = 25, s = 13): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < r + s + 5) return [];

  const diffCandles: CandleData[] = [];
  const absDiffCandles: CandleData[] = [];

  for (let i = 1; i < clean.length; i++) {
    const diff = clean[i].close - clean[i - 1].close;
    const time = clean[i].time;
    diffCandles.push({ time, open: diff, high: diff, low: diff, close: diff, volume: 0 });
    absDiffCandles.push({ time, open: Math.abs(diff), high: Math.abs(diff), low: Math.abs(diff), close: Math.abs(diff), volume: 0 });
  }

  const toCandles = (arr: IndicatorPoint[]): CandleData[] => arr.map(e => ({
    time: e.time, open: e.value, high: e.value, low: e.value, close: e.value, volume: 0,
  }));

  const smooth1 = calculateEMA(diffCandles, r);
  const smooth2 = calculateEMA(toCandles(smooth1), s);

  const absSmooth1 = calculateEMA(absDiffCandles, r);
  const absSmooth2 = calculateEMA(toCandles(absSmooth1), s);

  const absMap = new Map<number, number>();
  absSmooth2.forEach(a => absMap.set(a.time, a.value));

  const result: IndicatorPoint[] = [];
  for (const s2 of smooth2) {
    const absVal = absMap.get(s2.time);
    if (absVal !== undefined) {
      const tsi = absVal === 0 ? 0 : 100 * (s2.value / absVal);
      result.push({ time: s2.time, value: Number(tsi.toFixed(2)) });
    }
  }

  return result;
}



// 21. Ultimate Oscillator (7, 14, 28)
export function calculateUltimateOscillator(candles: CandleData[], p1 = 7, p2 = 14, p3 = 28): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= p3) return [];

  const bpList: number[] = [];
  const trList: number[] = [];

  for (let i = 1; i < clean.length; i++) {
    const curr = clean[i];
    const prev = clean[i - 1];

    const trueLow = Math.min(curr.low, prev.close);
    const bp = curr.close - trueLow;
    const tr = Math.max(curr.high, prev.close) - trueLow;

    bpList.push(bp);
    trList.push(tr);
  }

  const result: IndicatorPoint[] = [];

  const getSum = (arr: number[], end: number, len: number) => {
    let s = 0;
    for (let k = end - len + 1; k <= end; k++) s += arr[k];
    return s;
  };

  for (let i = p3 - 1; i < bpList.length; i++) {
    const bp7 = getSum(bpList, i, p1);
    const tr7 = getSum(trList, i, p1);
    const avg7 = tr7 === 0 ? 0 : bp7 / tr7;

    const bp14 = getSum(bpList, i, p2);
    const tr14 = getSum(trList, i, p2);
    const avg14 = tr14 === 0 ? 0 : bp14 / tr14;

    const bp28 = getSum(bpList, i, p3);
    const tr28 = getSum(trList, i, p3);
    const avg28 = tr28 === 0 ? 0 : bp28 / tr28;

    const uo = 100 * (4 * avg7 + 2 * avg14 + avg28) / 7;
    result.push({ time: clean[i + 1].time, value: Number(uo.toFixed(2)) });
  }

  return result;
}

// 22. Vortex Indicator (VI+, VI-)
export interface VortexResult {
  time: number;
  plusVI: number;
  minusVI: number;
}

export function calculateVortex(candles: CandleData[], period = 14): VortexResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period) return [];

  const vmPlus: number[] = [];
  const vmMinus: number[] = [];
  const trList: number[] = [];

  for (let i = 1; i < clean.length; i++) {
    const curr = clean[i];
    const prev = clean[i - 1];

    vmPlus.push(Math.abs(curr.high - prev.low));
    vmMinus.push(Math.abs(curr.low - prev.high));

    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    trList.push(tr);
  }

  const result: VortexResult[] = [];
  let sumPlus = 0;
  let sumMinus = 0;
  let sumTR = 0;

  for (let i = 0; i < vmPlus.length; i++) {
    sumPlus += vmPlus[i];
    sumMinus += vmMinus[i];
    sumTR += trList[i];

    if (i >= period) {
      sumPlus -= vmPlus[i - period];
      sumMinus -= vmMinus[i - period];
      sumTR -= trList[i - period];
    }

    if (i >= period - 1) {
      const pVI = sumTR === 0 ? 1 : sumPlus / sumTR;
      const mVI = sumTR === 0 ? 1 : sumMinus / sumTR;
      result.push({
        time: clean[i + 1].time,
        plusVI: Number(pVI.toFixed(4)),
        minusVI: Number(mVI.toFixed(4)),
      });
    }
  }

  return result;
}



// 23. Chande Momentum Oscillator (CMO)
export function calculateChandeMO(candles: CandleData[], period = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period) return [];

  const result: IndicatorPoint[] = [];

  for (let i = period; i < clean.length; i++) {
    let sumGain = 0;
    let sumLoss = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const diff = clean[j].close - clean[j - 1].close;
      if (diff > 0) sumGain += diff;
      else sumLoss += Math.abs(diff);
    }

    const denom = sumGain + sumLoss;
    const cmo = denom === 0 ? 0 : 100 * ((sumGain - sumLoss) / denom);
    result.push({ time: clean[i].time, value: Number(cmo.toFixed(2)) });
  }

  return result;
}

// 24. DPO - Detrended Price Oscillator
export function calculateDPO(candles: CandleData[], period = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const sma = calculateSMA(clean, period);
  const smaMap = new Map<number, number>();
  sma.forEach(s => smaMap.set(s.time, s.value));

  const shift = Math.floor(period / 2) + 1;
  const result: IndicatorPoint[] = [];

  for (let i = shift; i < clean.length; i++) {
    const shiftTime = clean[i - shift].time;
    const smaVal = smaMap.get(shiftTime);
    if (smaVal !== undefined) {
      const dpo = clean[i].close - smaVal;
      result.push({ time: clean[i].time, value: Number(dpo.toFixed(2)) });
    }
  }

  return result;
}



// 25. Ease of Movement (EOM)
export function calculateEaseOfMovement(candles: CandleData[], period = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period + 1) return [];

  const emvPoints: { time: number; val: number }[] = [];

  for (let i = 1; i < clean.length; i++) {
    const curr = clean[i];
    const prev = clean[i - 1];

    const dist = ((curr.high + curr.low) / 2) - ((prev.high + prev.low) / 2);
    const range = curr.high - curr.low;
    const boxRatio = (curr.volume / 10000) / Math.max(range, 0.0001);
    const emv = boxRatio === 0 ? 0 : dist / boxRatio;

    emvPoints.push({ time: curr.time, val: emv });
  }

  const result: IndicatorPoint[] = [];
  let sum = 0;
  for (let i = 0; i < emvPoints.length; i++) {
    sum += emvPoints[i].val;
    if (i >= period) sum -= emvPoints[i - period].val;
    if (i >= period - 1) {
      result.push({ time: emvPoints[i].time, value: Number((sum / period).toFixed(4)) });
    }
  }

  return result;
}



// 26. Balance of Power (BOP)
export function calculateBOP(candles: CandleData[], smooth = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < smooth) return [];

  const rawBop: { time: number; val: number }[] = [];
  for (const c of clean) {
    const range = c.high - c.low;
    const bop = range === 0 ? 0 : (c.close - c.open) / range;
    rawBop.push({ time: c.time, val: bop });
  }

  const result: IndicatorPoint[] = [];
  let sum = 0;
  for (let i = 0; i < rawBop.length; i++) {
    sum += rawBop[i].val;
    if (i >= smooth) sum -= rawBop[i - smooth].val;
    if (i >= smooth - 1) {
      result.push({ time: rawBop[i].time, value: Number((sum / smooth).toFixed(2)) });
    }
  }

  return result;
}



// 27. Fisher Transform
export function calculateFisherTransform(candles: CandleData[], period = 9): { time: number; fisher: number; trigger: number }[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period + 2) return [];

  const result: { time: number; fisher: number; trigger: number }[] = [];
  let prevVal = 0;
  let prevFish = 0;

  for (let i = period - 1; i < clean.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      const hl2 = (clean[j].high + clean[j].low) / 2;
      if (hl2 > highest) highest = hl2;
      if (hl2 < lowest) lowest = hl2;
    }

    const hl2Curr = (clean[i].high + clean[i].low) / 2;
    const range = highest - lowest;
    let val = range === 0 ? 0 : 0.66 * ((hl2Curr - lowest) / range - 0.5) + 0.67 * prevVal;
    if (val > 0.99) val = 0.999;
    if (val < -0.99) val = -0.999;

    const fish = 0.5 * Math.log((1 + val) / (1 - val)) + 0.5 * prevFish;
    result.push({
      time: clean[i].time,
      fisher: Number(fish.toFixed(2)),
      trigger: Number(prevFish.toFixed(2)),
    });

    prevVal = val;
    prevFish = fish;
  }

  return result;
}

// 28. PPO - Percentage Price Oscillator
export interface PPOResult {
  time: number;
  ppo: number;
  signal: number;
  hist: number;
}

export function calculatePPO(candles: CandleData[], fast = 12, slow = 26, signal = 9): PPOResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < slow + signal) return [];

  const fastEma = calculateEMA(clean, fast);
  const slowEma = calculateEMA(clean, slow);

  const slowMap = new Map<number, number>();
  slowEma.forEach(s => slowMap.set(s.time, s.value));

  const ppoLineCandles: CandleData[] = [];
  for (const f of fastEma) {
    const sVal = slowMap.get(f.time);
    if (sVal !== undefined && sVal !== 0) {
      const ppo = ((f.value - sVal) / sVal) * 100;
      ppoLineCandles.push({ time: f.time, open: ppo, high: ppo, low: ppo, close: ppo, volume: 0 });
    }
  }

  const sigEma = calculateEMA(ppoLineCandles, signal);
  const sigMap = new Map<number, number>();
  sigEma.forEach(s => sigMap.set(s.time, s.value));

  const result: PPOResult[] = [];
  for (const p of ppoLineCandles) {
    const sigVal = sigMap.get(p.time);
    if (sigVal !== undefined) {
      result.push({
        time: p.time,
        ppo: Number(p.close.toFixed(2)),
        signal: Number(sigVal.toFixed(2)),
        hist: Number((p.close - sigVal).toFixed(2)),
      });
    }
  }

  return result;
}



// 29. Volume Oscillator
export function calculateVolumeOscillator(candles: CandleData[], shortPeriod = 5, longPeriod = 10): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < longPeriod) return [];

  const result: IndicatorPoint[] = [];
  let shortSum = 0;
  let longSum = 0;

  for (let i = 0; i < clean.length; i++) {
    shortSum += clean[i].volume;
    longSum += clean[i].volume;

    if (i >= shortPeriod) shortSum -= clean[i - shortPeriod].volume;
    if (i >= longPeriod) longSum -= clean[i - longPeriod].volume;

    if (i >= longPeriod - 1) {
      const shortMA = shortSum / shortPeriod;
      const longMA = longSum / longPeriod;
      const vo = longMA === 0 ? 0 : ((shortMA - longMA) / longMA) * 100;
      result.push({ time: clean[i].time, value: Number(vo.toFixed(2)) });
    }
  }

  return result;
}



// 30. Zig Zag (Peak and Valley swing line)
export function calculateZigZag(candles: CandleData[], deviationPercent = 5): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < 5) return [];

  const result: IndicatorPoint[] = [{ time: clean[0].time, value: clean[0].close }];
  let lastPivotPrice = clean[0].close;
  let lastPivotType: 'high' | 'low' = 'low';

  const dev = deviationPercent / 100;

  for (let i = 1; i < clean.length; i++) {
    const c = clean[i];

    if (lastPivotType === 'low') {
      if (c.high >= lastPivotPrice * (1 + dev)) {
        result.push({ time: c.time, value: c.high });
        lastPivotPrice = c.high;
        lastPivotType = 'high';
      } else if (c.low < lastPivotPrice) {
        // lower low
        lastPivotPrice = c.low;
        result[result.length - 1] = { time: c.time, value: c.low };
      }
    } else {
      if (c.low <= lastPivotPrice * (1 - dev)) {
        result.push({ time: c.time, value: c.low });
        lastPivotPrice = c.low;
        lastPivotType = 'low';
      } else if (c.high > lastPivotPrice) {
        // higher high
        lastPivotPrice = c.high;
        result[result.length - 1] = { time: c.time, value: c.high };
      }
    }
  }

  return result;
}

// 10. ADX & DMI (Average Directional Index: +DI, -DI, ADX)
export interface ADXResult {
  time: number;
  adx: number;
  plusDI: number;
  minusDI: number;
}

// 31. Smoothed Moving Average (SMMA / Wilder's RMA)
export function calculateSMMA(candles: CandleData[], period = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period || period <= 0) return [];

  const result: IndicatorPoint[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += clean[i].close;
  }
  let prevSmma = sum / period;
  result.push({ time: clean[period - 1].time, value: Number(prevSmma.toFixed(2)) });

  for (let i = period; i < clean.length; i++) {
    const smma = (prevSmma * (period - 1) + clean[i].close) / period;
    result.push({ time: clean[i].time, value: Number(smma.toFixed(2)) });
    prevSmma = smma;
  }
  return result;
}

// 32. Arnaud Legoux Moving Average (ALMA)
export function calculateALMA(candles: CandleData[], period = 9, offset = 0.85, sigma = 6): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period || period <= 0) return [];

  const m = Math.floor(offset * (period - 1));
  const s = period / sigma;
  const weights: number[] = new Array(period);
  let norm = 0;
  for (let i = 0; i < period; i++) {
    const diff = i - m;
    const w = Math.exp(-(diff * diff) / (2 * s * s));
    weights[i] = w;
    norm += w;
  }

  const result: IndicatorPoint[] = [];
  for (let i = period - 1; i < clean.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += clean[i - period + 1 + j].close * weights[j];
    }
    const val = norm > 0 ? sum / norm : clean[i].close;
    result.push({ time: clean[i].time, value: Number(val.toFixed(2)) });
  }
  return result;
}

// 33. Least Squares Moving Average (LSMA / Linear Regression)
export function calculateLSMA(candles: CandleData[], period = 25): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period || period <= 1) return [];

  const result: IndicatorPoint[] = [];
  const xMean = (period - 1) / 2;
  let denom = 0;
  for (let j = 0; j < period; j++) {
    denom += (j - xMean) * (j - xMean);
  }

  for (let i = period - 1; i < clean.length; i++) {
    let sumY = 0;
    let sumXY = 0;
    for (let j = 0; j < period; j++) {
      const y = clean[i - period + 1 + j].close;
      sumY += y;
      sumXY += (j - xMean) * y;
    }
    const yMean = sumY / period;
    const slope = denom > 0 ? sumXY / denom : 0;
    const lsma = yMean + slope * xMean;
    result.push({ time: clean[i].time, value: Number(lsma.toFixed(2)) });
  }
  return result;
}

// 34. Price Channel
export interface PriceChannelResult {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}
export function calculatePriceChannel(candles: CandleData[], period = 20): PriceChannelResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period || period <= 0) return [];

  const result: PriceChannelResult[] = [];
  for (let i = period - 1; i < clean.length; i++) {
    let high = -Infinity;
    let low = Infinity;
    for (let j = 0; j < period; j++) {
      const c = clean[i - j];
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
    }
    const mid = (high + low) / 2;
    result.push({
      time: clean[i].time,
      upper: Number(high.toFixed(2)),
      middle: Number(mid.toFixed(2)),
      lower: Number(low.toFixed(2))
    });
  }
  return result;
}

// 35. Bollinger Bands Width (BBW)
export function calculateBBWidth(candles: CandleData[], period = 20, multiplier = 2): IndicatorPoint[] {
  const bb = calculateBollingerBands(candles, period, multiplier);
  const result: IndicatorPoint[] = [];
  for (let i = 0; i < bb.length; i++) {
    const b = bb[i];
    const width = b.middle > 0 ? ((b.upper - b.lower) / b.middle) * 100 : 0;
    result.push({ time: b.time, value: Number(width.toFixed(2)) });
  }
  return result;
}

// 36. Bollinger Bands %B
export function calculateBBBPct(candles: CandleData[], period = 20, multiplier = 2): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  const bb = calculateBollingerBands(candles, period, multiplier);
  const bbMap = new Map<number, { upper: number; lower: number }>();
  bb.forEach(b => bbMap.set(b.time, { upper: b.upper, lower: b.lower }));

  const result: IndicatorPoint[] = [];
  for (const c of clean) {
    const b = bbMap.get(c.time);
    if (!b) continue;
    const range = b.upper - b.lower;
    const pct = range > 0 ? (c.close - b.lower) / range : 0.5;
    result.push({ time: c.time, value: Number(pct.toFixed(4)) });
  }
  return result;
}

// 37. Normalized ATR (NATR)
export function calculateNATR(candles: CandleData[], period = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  const atr = calculateATR(candles, period);
  const cMap = new Map<number, number>();
  clean.forEach(c => cMap.set(c.time, c.close));

  const result: IndicatorPoint[] = [];
  for (const a of atr) {
    const close = cMap.get(a.time);
    if (!close || close <= 0) continue;
    const natr = (a.value / close) * 100;
    result.push({ time: a.time, value: Number(natr.toFixed(2)) });
  }
  return result;
}

// 38. Momentum (MOM)
export function calculateMOM(candles: CandleData[], period = 10): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period || period <= 0) return [];

  const result: IndicatorPoint[] = [];
  for (let i = period; i < clean.length; i++) {
    const mom = clean[i].close - clean[i - period].close;
    result.push({ time: clean[i].time, value: Number(mom.toFixed(2)) });
  }
  return result;
}

// 39. Accelerator Oscillator (AC)
export function calculateAcceleratorOscillator(candles: CandleData[]): IndicatorPoint[] {
  const ao = calculateAwesomeOscillator(candles);
  if (ao.length < 5) return [];

  const result: IndicatorPoint[] = [];
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    sum += ao[i].value;
  }
  result.push({ time: ao[4].time, value: Number((ao[4].value - sum / 5).toFixed(4)) });

  for (let i = 5; i < ao.length; i++) {
    sum += ao[i].value - ao[i - 5].value;
    const sma = sum / 5;
    const ac = ao[i].value - sma;
    result.push({ time: ao[i].time, value: Number(ac.toFixed(4)) });
  }
  return result;
}

// 40. Know Sure Thing (KST)
export function calculateKST(candles: CandleData[]): { time: number; kst: number; signal: number }[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < 50) return [];

  const calcROC = (p: number) => {
    const res: number[] = new Array(clean.length).fill(0);
    for (let i = p; i < clean.length; i++) {
      const prev = clean[i - p].close;
      res[i] = prev > 0 ? ((clean[i].close - prev) / prev) * 100 : 0;
    }
    return res;
  };

  const calcSMAArray = (arr: number[], p: number) => {
    const res: number[] = new Array(arr.length).fill(0);
    let s = 0;
    for (let i = 0; i < arr.length; i++) {
      s += arr[i];
      if (i >= p) s -= arr[i - p];
      if (i >= p - 1) res[i] = s / p;
    }
    return res;
  };

  const rcma1 = calcSMAArray(calcROC(10), 10);
  const rcma2 = calcSMAArray(calcROC(15), 10);
  const rcma3 = calcSMAArray(calcROC(20), 10);
  const rcma4 = calcSMAArray(calcROC(30), 15);

  const kstRaw: { time: number; val: number }[] = [];
  for (let i = 45; i < clean.length; i++) {
    const kst = rcma1[i] * 1 + rcma2[i] * 2 + rcma3[i] * 3 + rcma4[i] * 4;
    kstRaw.push({ time: clean[i].time, val: kst });
  }

  const result: { time: number; kst: number; signal: number }[] = [];
  let sigSum = 0;
  for (let i = 0; i < kstRaw.length; i++) {
    sigSum += kstRaw[i].val;
    if (i >= 9) sigSum -= kstRaw[i - 9].val;
    if (i >= 8) {
      result.push({
        time: kstRaw[i].time,
        kst: Number(kstRaw[i].val.toFixed(2)),
        signal: Number((sigSum / 9).toFixed(2)),
      });
    }
  }
  return result;
}

// 41. Relative Vigor Index (RVI)
export function calculateRVI(candles: CandleData[], period = 10): { time: number; rvi: number; signal: number }[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period + 4) return [];

  const valNum: number[] = new Array(clean.length).fill(0);
  const valDen: number[] = new Array(clean.length).fill(0);

  for (let i = 3; i < clean.length; i++) {
    const c0 = clean[i], c1 = clean[i - 1], c2 = clean[i - 2], c3 = clean[i - 3];
    valNum[i] = ((c0.close - c0.open) + 2 * (c1.close - c1.open) + 2 * (c2.close - c2.open) + (c3.close - c3.open)) / 6;
    valDen[i] = ((c0.high - c0.low) + 2 * (c1.high - c1.low) + 2 * (c2.high - c2.low) + (c3.high - c3.low)) / 6;
  }

  const rviList: { time: number; rvi: number }[] = [];
  let sumN = 0;
  let sumD = 0;

  for (let i = 3; i < clean.length; i++) {
    sumN += valNum[i];
    sumD += valDen[i];
    if (i >= 3 + period) {
      sumN -= valNum[i - period];
      sumD -= valDen[i - period];
    }
    if (i >= 3 + period - 1) {
      const rvi = sumD > 0 ? sumN / sumD : 0;
      rviList.push({ time: clean[i].time, rvi });
    }
  }

  const result: { time: number; rvi: number; signal: number }[] = [];
  for (let i = 3; i < rviList.length; i++) {
    const sig = (rviList[i].rvi + 2 * rviList[i - 1].rvi + 2 * rviList[i - 2].rvi + rviList[i - 3].rvi) / 6;
    result.push({
      time: rviList[i].time,
      rvi: Number(rviList[i].rvi.toFixed(4)),
      signal: Number(sig.toFixed(4)),
    });
  }
  return result;
}

// 42. Coppock Curve
export function calculateCoppockCurve(candles: CandleData[]): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < 30) return [];

  const rocSum: { time: number; val: number }[] = [];
  for (let i = 14; i < clean.length; i++) {
    const p14 = clean[i - 14].close;
    const p11 = clean[i - 11].close;
    const r14 = p14 > 0 ? ((clean[i].close - p14) / p14) * 100 : 0;
    const r11 = p11 > 0 ? ((clean[i].close - p11) / p11) * 100 : 0;
    rocSum.push({ time: clean[i].time, val: r14 + r11 });
  }

  const result: IndicatorPoint[] = [];
  const denom = (10 * 11) / 2;
  for (let i = 9; i < rocSum.length; i++) {
    let sum = 0;
    for (let j = 0; j < 10; j++) {
      sum += rocSum[i - 9 + j].val * (j + 1);
    }
    result.push({ time: rocSum[i].time, value: Number((sum / denom).toFixed(2)) });
  }
  return result;
}

// 43. Mass Index
export function calculateMassIndex(candles: CandleData[], period = 25): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period + 20) return [];

  const hl = clean.map(c => ({ time: c.time, close: c.high - c.low, open: c.high - c.low, high: c.high - c.low, low: c.high - c.low, volume: 0 }));
  const ema1 = calculateEMA(hl, 9);
  const ema1Candles = ema1.map(e => ({ time: e.time, close: e.value, open: e.value, high: e.value, low: e.value, volume: 0 }));
  const ema2 = calculateEMA(ema1Candles, 9);

  const ema2Map = new Map<number, number>();
  ema2.forEach(e => ema2Map.set(e.time, e.value));

  const ratios: { time: number; val: number }[] = [];
  for (const e1 of ema1) {
    const e2Val = ema2Map.get(e1.time);
    if (e2Val && e2Val > 0) {
      ratios.push({ time: e1.time, val: e1.value / e2Val });
    }
  }

  const result: IndicatorPoint[] = [];
  let s = 0;
  for (let i = 0; i < ratios.length; i++) {
    s += ratios[i].val;
    if (i >= period) s -= ratios[i - period].val;
    if (i >= period - 1) {
      result.push({ time: ratios[i].time, value: Number(s.toFixed(2)) });
    }
  }
  return result;
}

// 44. Chaikin Volatility (CHV)
export function calculateChaikinVolatility(candles: CandleData[], period = 10, rocPeriod = 10): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period + rocPeriod + 5) return [];

  const hlCandles = clean.map(c => ({ time: c.time, close: c.high - c.low, open: c.high - c.low, high: c.high - c.low, low: c.high - c.low, volume: 0 }));
  const emaHL = calculateEMA(hlCandles, period);

  const result: IndicatorPoint[] = [];
  for (let i = rocPeriod; i < emaHL.length; i++) {
    const prev = emaHL[i - rocPeriod].value;
    const curr = emaHL[i].value;
    const chv = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    result.push({ time: emaHL[i].time, value: Number(chv.toFixed(2)) });
  }
  return result;
}

// 45. Connors RSI (CRSI)
export function calculateConnorsRSI(candles: CandleData[]): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < 105) return [];

  const rsi3 = calculateRSI(candles, 3);
  const rsi3Map = new Map<number, number>();
  rsi3.forEach(r => rsi3Map.set(r.time, r.value));

  const streakCandles: CandleData[] = new Array(clean.length);
  let streak = 0;
  for (let i = 0; i < clean.length; i++) {
    if (i > 0) {
      if (clean[i].close > clean[i - 1].close) {
        streak = streak > 0 ? streak + 1 : 1;
      } else if (clean[i].close < clean[i - 1].close) {
        streak = streak < 0 ? streak - 1 : -1;
      } else {
        streak = 0;
      }
    }
    streakCandles[i] = {
      time: clean[i].time,
      close: streak,
      open: streak,
      high: streak,
      low: streak,
      volume: 0,
    };
  }
  const rsiStreak = calculateRSI(streakCandles, 2);
  const streakMap = new Map<number, number>();
  rsiStreak.forEach(r => streakMap.set(r.time, r.value));

  const ret1: number[] = new Array(clean.length).fill(0);
  for (let i = 1; i < clean.length; i++) {
    const prev = clean[i - 1].close;
    ret1[i] = prev > 0 ? (clean[i].close - prev) / prev : 0;
  }

  const result: IndicatorPoint[] = [];
  for (let i = 100; i < clean.length; i++) {
    const t = clean[i].time;
    const r3 = rsi3Map.get(t);
    const rs = streakMap.get(t);
    if (r3 === undefined || rs === undefined) continue;

    const currRet = ret1[i];
    let count = 0;
    for (let j = 0; j < 100; j++) {
      if (ret1[i - 1 - j] < currRet) count++;
    }
    const rank = count;

    const crsi = (r3 + rs + rank) / 3;
    result.push({ time: t, value: Number(crsi.toFixed(2)) });
  }
  return result;
}

// 46. Accumulation / Distribution Line (ADL)
export function calculateADL(candles: CandleData[]): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length === 0) return [];

  const result: IndicatorPoint[] = [];
  let cumADL = 0;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    const range = c.high - c.low;
    const mfm = range > 0 ? ((c.close - c.low) - (c.high - c.close)) / range : 0;
    const mfv = mfm * c.volume;
    cumADL += mfv;
    result.push({ time: c.time, value: Number(cumADL.toFixed(2)) });
  }
  return result;
}

// 47. Price Volume Trend (PVT)
export function calculatePVT(candles: CandleData[]): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length === 0) return [];

  const result: IndicatorPoint[] = [{ time: clean[0].time, value: 0 }];
  let pvt = 0;

  for (let i = 1; i < clean.length; i++) {
    const prevClose = clean[i - 1].close;
    const rate = prevClose > 0 ? (clean[i].close - prevClose) / prevClose : 0;
    pvt += clean[i].volume * rate;
    result.push({ time: clean[i].time, value: Number(pvt.toFixed(2)) });
  }
  return result;
}

// 48. Elder's Force Index (EFI)
export function calculateEFI(candles: CandleData[], period = 13): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period) return [];

  const fiCandles: CandleData[] = [];
  for (let i = 1; i < clean.length; i++) {
    const fi = clean[i].volume * (clean[i].close - clean[i - 1].close);
    fiCandles.push({
      time: clean[i].time,
      close: fi,
      open: fi,
      high: fi,
      low: fi,
      volume: 0,
    });
  }

  return calculateEMA(fiCandles, period);
}


// 49. Choppiness Index (CHOP)
export function calculateChoppinessIndex(candles: CandleData[], period = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period) return [];

  const trs: number[] = [clean[0].high - clean[0].low];
  for (let i = 1; i < clean.length; i++) {
    const tr = Math.max(
      clean[i].high - clean[i].low,
      Math.abs(clean[i].high - clean[i - 1].close),
      Math.abs(clean[i].low - clean[i - 1].close)
    );
    trs.push(tr);
  }

  const result: IndicatorPoint[] = [];
  const logPeriod = Math.log10(period);

  for (let i = period - 1; i < clean.length; i++) {
    let sumTR = 0;
    let maxHigh = clean[i].high;
    let minLow = clean[i].low;

    for (let j = 0; j < period; j++) {
      const idx = i - j;
      sumTR += trs[idx];
      if (clean[idx].high > maxHigh) maxHigh = clean[idx].high;
      if (clean[idx].low < minLow) minLow = clean[idx].low;
    }

    const range = maxHigh - minLow;
    let chop = 50;
    if (range > 0 && sumTR > 0 && logPeriod > 0) {
      chop = (100 * Math.log10(sumTR / range)) / logPeriod;
    }
    chop = Math.min(100, Math.max(0, chop));
    result.push({ time: clean[i].time, value: Number(chop.toFixed(2)) });
  }

  return result;
}

// 50. Klinger Oscillator (KVO)
export interface KlingerResult {
  time: number;
  kvo: number;
  signal: number;
}

export function calculateKlingerOscillator(
  candles: CandleData[],
  fast = 34,
  slow = 55,
  signalPeriod = 13
): KlingerResult[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= Math.max(slow, signalPeriod)) return [];

  const trend: number[] = [];
  const dm: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    trend.push((clean[i].high + clean[i].low + clean[i].close) / 3);
    dm.push(clean[i].high - clean[i].low);
  }

  const vfList: CandleData[] = [];
  let cm = 0;

  for (let i = 1; i < clean.length; i++) {
    const trendDir = trend[i] > trend[i - 1] ? 1 : -1;
    cm += dm[i];
    const ratio = cm > 0 ? dm[i] / cm : 0;
    const vf = clean[i].volume * Math.abs(2 * ratio - 1) * trendDir * 100;
    vfList.push({
      time: clean[i].time,
      close: vf,
      open: vf,
      high: vf,
      low: vf,
      volume: 0,
    });
  }

  const fastEMA = calculateEMA(vfList, fast);
  const slowEMA = calculateEMA(vfList, slow);

  const kvoMap = new Map<number, number>();
  for (const s of slowEMA) {
    const f = fastEMA.find(x => x.time === s.time);
    if (f) {
      kvoMap.set(s.time, f.value - s.value);
    }
  }

  const kvoCandles: CandleData[] = [];
  for (const [time, val] of kvoMap.entries()) {
    kvoCandles.push({
      time,
      close: val,
      open: val,
      high: val,
      low: val,
      volume: 0,
    });
  }

  const sigEMA = calculateEMA(kvoCandles, signalPeriod);
  const sigMap = new Map<number, number>(sigEMA.map(s => [s.time, s.value]));

  const result: KlingerResult[] = [];
  for (const kc of kvoCandles) {
    const sigVal = sigMap.get(kc.time);
    if (sigVal !== undefined) {
      result.push({
        time: kc.time,
        kvo: Number(kc.close.toFixed(2)),
        signal: Number(sigVal.toFixed(2)),
      });
    }
  }
  return result;
}

// 51. Chaikin Oscillator
export function calculateChaikinOscillator(candles: CandleData[], fast = 3, slow = 10): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= slow) return [];

  const adlList: CandleData[] = [];
  let cumADL = 0;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    const range = c.high - c.low;
    const mfm = range > 0 ? ((c.close - c.low) - (c.high - c.close)) / range : 0;
    cumADL += mfm * c.volume;
    adlList.push({
      time: c.time,
      close: cumADL,
      open: cumADL,
      high: cumADL,
      low: cumADL,
      volume: 0,
    });
  }

  const fastEMA = calculateEMA(adlList, fast);
  const slowEMA = calculateEMA(adlList, slow);
  const slowMap = new Map(slowEMA.map(s => [s.time, s.value]));

  const result: IndicatorPoint[] = [];
  for (const f of fastEMA) {
    const s = slowMap.get(f.time);
    if (s !== undefined) {
      result.push({ time: f.time, value: Number((f.value - s).toFixed(2)) });
    }
  }
  return result;
}

// 52. TRIX (Triple Exponential Average)
export function calculateTRIX(candles: CandleData[], period = 18): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= period * 3) return [];

  const ema1 = calculateEMA(clean, period);
  const ema1Candles: CandleData[] = ema1.map(p => ({
    time: p.time, close: p.value, open: p.value, high: p.value, low: p.value, volume: 0
  }));

  const ema2 = calculateEMA(ema1Candles, period);
  const ema2Candles: CandleData[] = ema2.map(p => ({
    time: p.time, close: p.value, open: p.value, high: p.value, low: p.value, volume: 0
  }));

  const ema3 = calculateEMA(ema2Candles, period);
  const result: IndicatorPoint[] = [];

  for (let i = 1; i < ema3.length; i++) {
    const prev = ema3[i - 1].value;
    const curr = ema3[i].value;
    const trix = prev !== 0 ? (10000 * (curr - prev)) / prev : 0;
    result.push({ time: ema3[i].time, value: Number(trix.toFixed(4)) });
  }
  return result;
}

// 53. McGinley Dynamic
export function calculateMcGinleyDynamic(candles: CandleData[], period = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length === 0) return [];

  const result: IndicatorPoint[] = [{ time: clean[0].time, value: clean[0].close }];
  let prevMD = clean[0].close;

  for (let i = 1; i < clean.length; i++) {
    const close = clean[i].close;
    const ratio = prevMD > 0 ? close / prevMD : 1;
    const denom = period * Math.pow(ratio, 4);
    const md = prevMD + (close - prevMD) / (denom || 1);
    result.push({ time: clean[i].time, value: Number(md.toFixed(2)) });
    prevMD = md;
  }
  return result;
}

// 54. Linear Regression Curve (Endpoint)
export function calculateLinearRegressionCurve(candles: CandleData[], period = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const result: IndicatorPoint[] = [];
  const n = period;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;

  for (let i = period - 1; i < clean.length; i++) {
    let sumY = 0;
    let sumXY = 0;
    for (let j = 0; j < period; j++) {
      const y = clean[i - period + 1 + j].close;
      sumY += y;
      sumXY += j * y;
    }
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;
    const endpoint = intercept + slope * (n - 1);
    result.push({ time: clean[i].time, value: Number(endpoint.toFixed(2)) });
  }
  return result;
}

// 55. Linear Regression Slope
export function calculateLinearRegressionSlope(candles: CandleData[], period = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const result: IndicatorPoint[] = [];
  const n = period;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;

  for (let i = period - 1; i < clean.length; i++) {
    let sumY = 0;
    let sumXY = 0;
    for (let j = 0; j < period; j++) {
      const y = clean[i - period + 1 + j].close;
      sumY += y;
      sumXY += j * y;
    }
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    result.push({ time: clean[i].time, value: Number(slope.toFixed(4)) });
  }
  return result;
}

// 56. Standard Error
export function calculateStandardError(candles: CandleData[], period = 14): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const result: IndicatorPoint[] = [];
  const n = period;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;

  for (let i = period - 1; i < clean.length; i++) {
    let sumY = 0;
    let sumXY = 0;
    for (let j = 0; j < period; j++) {
      const y = clean[i - period + 1 + j].close;
      sumY += y;
      sumXY += j * y;
    }
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;

    let sse = 0;
    for (let j = 0; j < period; j++) {
      const y = clean[i - period + 1 + j].close;
      const yEst = intercept + slope * j;
      sse += Math.pow(y - yEst, 2);
    }
    const se = Math.sqrt(sse / Math.max(1, n - 2));
    result.push({ time: clean[i].time, value: Number(se.toFixed(2)) });
  }
  return result;
}

// 57. Standard Error Bands
export function calculateStandardErrorBands(
  candles: CandleData[],
  period = 20,
  mult = 2
): { time: number; middle: number; upper: number; lower: number }[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < period) return [];

  const linreg = calculateLinearRegressionCurve(clean, period);
  const stderr = calculateStandardError(clean, period);
  const errMap = new Map(stderr.map(e => [e.time, e.value]));

  const result: { time: number; middle: number; upper: number; lower: number }[] = [];
  for (const lr of linreg) {
    const se = errMap.get(lr.time) || 0;
    result.push({
      time: lr.time,
      middle: lr.value,
      upper: Number((lr.value + mult * se).toFixed(2)),
      lower: Number((lr.value - mult * se).toFixed(2)),
    });
  }
  return result;
}

// 58. Chande Kroll Stop
export function calculateChandeKrollStop(
  candles: CandleData[],
  p = 10,
  x = 1,
  q = 9
): { time: number; stopLong: number; stopShort: number }[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= p + q) return [];

  const atr = calculateATR(clean, p);
  const atrMap = new Map(atr.map(a => [a.time, a.value]));

  const highStops: { time: number; val: number }[] = [];
  const lowStops: { time: number; val: number }[] = [];

  for (let i = p - 1; i < clean.length; i++) {
    const time = clean[i].time;
    const atrVal = atrMap.get(time) || 0;
    let highestHigh = clean[i].high;
    let lowestLow = clean[i].low;

    for (let j = 0; j < p; j++) {
      if (clean[i - j].high > highestHigh) highestHigh = clean[i - j].high;
      if (clean[i - j].low < lowestLow) lowestLow = clean[i - j].low;
    }

    highStops.push({ time, val: highestHigh - x * atrVal });
    lowStops.push({ time, val: lowestLow + x * atrVal });
  }

  const result: { time: number; stopLong: number; stopShort: number }[] = [];
  for (let i = q - 1; i < highStops.length; i++) {
    let maxHighStop = highStops[i].val;
    let minLowStop = lowStops[i].val;
    for (let j = 0; j < q; j++) {
      if (highStops[i - j].val > maxHighStop) maxHighStop = highStops[i - j].val;
      if (lowStops[i - j].val < minLowStop) minLowStop = lowStops[i - j].val;
    }
    result.push({
      time: highStops[i].time,
      stopLong: Number(maxHighStop.toFixed(2)),
      stopShort: Number(minLowStop.toFixed(2)),
    });
  }
  return result;
}

// 59. SMI Ergodic Indicator
export function calculateSMIErgodic(
  candles: CandleData[],
  longLen = 20,
  shortLen = 5,
  signalLen = 5
): { time: number; smi: number; signal: number }[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= longLen + shortLen + signalLen) return [];

  const diffCandles: CandleData[] = [];
  const absDiffCandles: CandleData[] = [];

  for (let i = 1; i < clean.length; i++) {
    const diff = clean[i].close - clean[i - 1].close;
    const absDiff = Math.abs(diff);
    diffCandles.push({ time: clean[i].time, close: diff, open: diff, high: diff, low: diff, volume: 0 });
    absDiffCandles.push({ time: clean[i].time, close: absDiff, open: absDiff, high: absDiff, low: absDiff, volume: 0 });
  }

  const emaDiff1 = calculateEMA(diffCandles, longLen);
  const emaDiff1C: CandleData[] = emaDiff1.map(p => ({ time: p.time, close: p.value, open: p.value, high: p.value, low: p.value, volume: 0 }));
  const emaDiff2 = calculateEMA(emaDiff1C, shortLen);

  const emaAbs1 = calculateEMA(absDiffCandles, longLen);
  const emaAbs1C: CandleData[] = emaAbs1.map(p => ({ time: p.time, close: p.value, open: p.value, high: p.value, low: p.value, volume: 0 }));
  const emaAbs2 = calculateEMA(emaAbs1C, shortLen);
  const absMap = new Map(emaAbs2.map(p => [p.time, p.value]));

  const smiCandles: CandleData[] = [];
  for (const d of emaDiff2) {
    const a = absMap.get(d.time);
    const smiVal = a && a !== 0 ? (100 * d.value) / a : 0;
    smiCandles.push({ time: d.time, close: smiVal, open: smiVal, high: smiVal, low: smiVal, volume: 0 });
  }

  const sigEMA = calculateEMA(smiCandles, signalLen);
  const sigMap = new Map(sigEMA.map(s => [s.time, s.value]));

  const result: { time: number; smi: number; signal: number }[] = [];
  for (const s of smiCandles) {
    const sigVal = sigMap.get(s.time);
    if (sigVal !== undefined) {
      result.push({
        time: s.time,
        smi: Number(s.close.toFixed(2)),
        signal: Number(sigVal.toFixed(2)),
      });
    }
  }
  return result;
}

// 60. Relative Volatility Index (RVI_Vol)
export function calculateRelativeVolatilityIndex(
  candles: CandleData[],
  length = 14,
  stdDevLen = 10
): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= length + stdDevLen) return [];

  const stdev = calculateStandardDeviation(clean, stdDevLen);
  const devMap = new Map(stdev.map(d => [d.time, d.value]));

  const upList: CandleData[] = [];
  const downList: CandleData[] = [];

  for (let i = 1; i < clean.length; i++) {
    const time = clean[i].time;
    const sd = devMap.get(time) || 0;
    const change = clean[i].close - clean[i - 1].close;
    const upVal = change > 0 ? sd : 0;
    const downVal = change < 0 ? sd : 0;

    upList.push({ time, close: upVal, open: upVal, high: upVal, low: upVal, volume: 0 });
    downList.push({ time, close: downVal, open: downVal, high: downVal, low: downVal, volume: 0 });
  }

  const smoothUp = calculateEMA(upList, length);
  const smoothDown = calculateEMA(downList, length);
  const downMap = new Map(smoothDown.map(d => [d.time, d.value]));

  const result: IndicatorPoint[] = [];
  for (const u of smoothUp) {
    const d = downMap.get(u.time) || 0;
    const total = u.value + d;
    const rvi = total > 0 ? (100 * u.value) / total : 50;
    result.push({ time: u.time, value: Number(rvi.toFixed(2)) });
  }
  return result;
}

// 61. Net Volume
export function calculateNetVolume(candles: CandleData[]): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  return clean.map(c => ({
    time: c.time,
    value: Number((c.close >= c.open ? c.volume : -c.volume).toFixed(2)),
  }));
}

// 62. Average Price (OHLC/4)
export function calculateAveragePrice(candles: CandleData[]): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  return clean.map(c => ({
    time: c.time,
    value: Number(((c.open + c.high + c.low + c.close) / 4).toFixed(2)),
  }));
}

// 63. Typical Price (HLC/3)
export function calculateTypicalPrice(candles: CandleData[]): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  return clean.map(c => ({
    time: c.time,
    value: Number(((c.high + c.low + c.close) / 3).toFixed(2)),
  }));
}

// 64. Median Price (HL/2)
export function calculateMedianPrice(candles: CandleData[]): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  return clean.map(c => ({
    time: c.time,
    value: Number(((c.high + c.low) / 2).toFixed(2)),
  }));
}

// 65. Price Oscillator (APO)
export function calculatePriceOscillator(candles: CandleData[], fast = 12, slow = 26): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= slow) return [];

  const fastEMA = calculateEMA(clean, fast);
  const slowEMA = calculateEMA(clean, slow);
  const slowMap = new Map(slowEMA.map(s => [s.time, s.value]));

  const result: IndicatorPoint[] = [];
  for (const f of fastEMA) {
    const s = slowMap.get(f.time);
    if (s !== undefined) {
      result.push({ time: f.time, value: Number((f.value - s).toFixed(2)) });
    }
  }
  return result;
}

// 66. Guppy Multiple Moving Average (GMMA)
export function calculateGuppyMMA(candles: CandleData[]): { time: number; shortMAs: number[]; longMAs: number[] }[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < 60) return [];

  const shortPeriods = [3, 5, 8, 10, 12, 15];
  const longPeriods = [30, 35, 40, 45, 50, 60];

  const shortEMAs = shortPeriods.map(p => calculateEMA(clean, p));
  const longEMAs = longPeriods.map(p => calculateEMA(clean, p));

  const result: { time: number; shortMAs: number[]; longMAs: number[] }[] = [];
  const minLen = Math.min(...shortEMAs.map(a => a.length), ...longEMAs.map(a => a.length));

  for (let i = 0; i < minLen; i++) {
    const time = longEMAs[5][longEMAs[5].length - minLen + i].time;
    const shortVals = shortEMAs.map(arr => arr.find(x => x.time === time)?.value || 0);
    const longVals = longEMAs.map(arr => arr.find(x => x.time === time)?.value || 0);

    result.push({
      time,
      shortMAs: shortVals.map(v => Number(v.toFixed(2))),
      longMAs: longVals.map(v => Number(v.toFixed(2))),
    });
  }
  return result;
}

// 67. Accumulative Swing Index (ASI)
export function calculateAccumulativeSwingIndex(candles: CandleData[], limit = 50): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < 2) return [];

  const result: IndicatorPoint[] = [{ time: clean[0].time, value: 0 }];
  let asi = 0;

  for (let i = 1; i < clean.length; i++) {
    const c0 = clean[i - 1];
    const c1 = clean[i];

    const hy = c0.high;
    const cy = c0.close;
    const ly = c0.low;
    const oy = c0.open;

    const h = c1.high;
    const c = c1.close;
    const l = c1.low;
    const o = c1.open;

    const k = Math.max(hy - c, ly - c);

    const hc = Math.abs(h - cy);
    const lc = Math.abs(l - cy);
    const hl = h - l;

    let r = 0;
    if (hc >= lc && hc >= hl) {
      r = hc - 0.5 * lc + 0.25 * Math.abs(cy - oy);
    } else if (lc >= hc && lc >= hl) {
      r = lc - 0.5 * hc + 0.25 * Math.abs(cy - oy);
    } else {
      r = hl + 0.25 * Math.abs(cy - oy);
    }

    let si = 0;
    if (r > 0 && limit > 0) {
      const num = (c - cy + 0.5 * (c - o) + 0.25 * (cy - oy)) * 50 * (k / limit);
      si = num / r;
    }

    asi += si;
    result.push({ time: c1.time, value: Number(asi.toFixed(2)) });
  }
  return result;
}

// 68. EMA Cross
export function calculateEMACross(
  candles: CandleData[],
  fast = 9,
  slow = 21
): { time: number; fast: number; slow: number }[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= slow) return [];

  const fastEMA = calculateEMA(clean, fast);
  const slowEMA = calculateEMA(clean, slow);
  const slowMap = new Map(slowEMA.map(s => [s.time, s.value]));

  const result: { time: number; fast: number; slow: number }[] = [];
  for (const f of fastEMA) {
    const s = slowMap.get(f.time);
    if (s !== undefined) {
      result.push({
        time: f.time,
        fast: Number(f.value.toFixed(2)),
        slow: Number(s.toFixed(2)),
      });
    }
  }
  return result;
}

// 69. MA Cross
export function calculateMACross(
  candles: CandleData[],
  fast = 50,
  slow = 200
): { time: number; fast: number; slow: number }[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= slow) return [];

  const fastSMA = calculateSMA(clean, fast);
  const slowSMA = calculateSMA(clean, slow);
  const slowMap = new Map(slowSMA.map(s => [s.time, s.value]));

  const result: { time: number; fast: number; slow: number }[] = [];
  for (const f of fastSMA) {
    const s = slowMap.get(f.time);
    if (s !== undefined) {
      result.push({
        time: f.time,
        fast: Number(f.value.toFixed(2)),
        slow: Number(s.toFixed(2)),
      });
    }
  }
  return result;
}

// 70. Moving Average Channel
export function calculateMovingAverageChannel(
  candles: CandleData[],
  length = 20
): { time: number; upper: number; lower: number }[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < length) return [];

  const highCandles: CandleData[] = clean.map(c => ({ ...c, close: c.high }));
  const lowCandles: CandleData[] = clean.map(c => ({ ...c, close: c.low }));

  const upperSMA = calculateSMA(highCandles, length);
  const lowerSMA = calculateSMA(lowCandles, length);
  const lowMap = new Map(lowerSMA.map(l => [l.time, l.value]));

  const result: { time: number; upper: number; lower: number }[] = [];
  for (const u of upperSMA) {
    const l = lowMap.get(u.time);
    if (l !== undefined) {
      result.push({
        time: u.time,
        upper: Number(u.value.toFixed(2)),
        lower: Number(l.toFixed(2)),
      });
    }
  }
  return result;
}

// 71. True Range (TR)
export function calculateTrueRange(candles: CandleData[]): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length === 0) return [];

  const result: IndicatorPoint[] = [{ time: clean[0].time, value: clean[0].high - clean[0].low }];
  for (let i = 1; i < clean.length; i++) {
    const tr = Math.max(
      clean[i].high - clean[i].low,
      Math.abs(clean[i].high - clean[i - 1].close),
      Math.abs(clean[i].low - clean[i - 1].close)
    );
    result.push({ time: clean[i].time, value: Number(tr.toFixed(2)) });
  }
  return result;
}

// 72. Volatility Close-to-Close
export function calculateVolatilityCloseToClose(candles: CandleData[], length = 20): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length <= length) return [];

  const logReturns: { time: number; ret: number }[] = [];
  for (let i = 1; i < clean.length; i++) {
    const prev = clean[i - 1].close;
    const curr = clean[i].close;
    const ret = prev > 0 ? Math.log(curr / prev) : 0;
    logReturns.push({ time: clean[i].time, ret });
  }

  const result: IndicatorPoint[] = [];
  const annualFactor = Math.sqrt(365) * 100;

  for (let i = length - 1; i < logReturns.length; i++) {
    let sum = 0;
    for (let j = 0; j < length; j++) {
      sum += logReturns[i - j].ret;
    }
    const mean = sum / length;
    let varSum = 0;
    for (let j = 0; j < length; j++) {
      varSum += Math.pow(logReturns[i - j].ret - mean, 2);
    }
    const stdev = Math.sqrt(varSum / Math.max(1, length - 1));
    const annualVol = stdev * annualFactor;
    result.push({ time: logReturns[i].time, value: Number(annualVol.toFixed(2)) });
  }
  return result;
}

// 73. Rank Correlation Index (RCI)
export function calculateRankCorrelationIndex(candles: CandleData[], length = 9): IndicatorPoint[] {
  const clean = sanitizeCandles(candles);
  if (clean.length < length) return [];

  const result: IndicatorPoint[] = [];
  const n = length;
  const denom = n * (n * n - 1);

  for (let i = length - 1; i < clean.length; i++) {
    const window = clean.slice(i - length + 1, i + 1);
    const sorted = window.map((c, idx) => ({ close: c.close, originalIdx: idx }))
      .sort((a, b) => b.close - a.close);

    let d2 = 0;
    for (let rank = 1; rank <= n; rank++) {
      const item = sorted[rank - 1];
      const timeRank = item.originalIdx + 1;
      const diff = rank - timeRank;
      d2 += diff * diff;
    }

    const rci = denom > 0 ? (1 - (6 * d2) / denom) * 100 : 0;
    result.push({ time: clean[i].time, value: Number(rci.toFixed(2)) });
  }
  return result;
}
