import { CandleData, Timeframe } from '../types';

/**
 * Universal resolution in seconds for standard and custom timeframes.
 * Supports: 1s-45s, 1m-45m, 1h-12h, 1d-3d, 1w, 1M-12M, and arbitrary custom tokens (e.g. '7m', '10h').
 */
export function timeframeToSeconds(tf: Timeframe | string): number {
  if (!tf) return 900;
  
  switch (tf) {
    case '1s': return 1;
    case '5s': return 5;
    case '10s': return 10;
    case '15s': return 15;
    case '30s': return 30;
    case '45s': return 45;
    case '1m': return 60;
    case '2m': return 120;
    case '3m': return 180;
    case '5m': return 300;
    case '10m': return 600;
    case '15m': return 900;
    case '30m': return 1800;
    case '45m': return 2700;
    case '1h': return 3600;
    case '2h': return 7200;
    case '3h': return 10800;
    case '4h': return 14400;
    case '6h': return 21600;
    case '8h': return 28800;
    case '12h': return 43200;
    case '1d': return 86400;
    case '2d': return 172800;
    case '3d': return 259200;
    case '1w': return 604800;
    case '1M': return 2592000;
    case '3M': return 7776000;
    case '6M': return 15552000;
    case '12M': return 31104000;
  }

  const match = String(tf).trim().match(/^([0-9]+)\s*([smhdwMyY]?)$/);
  if (match) {
    const num = parseInt(match[1], 10) || 1;
    const unit = match[2];
    switch (unit) {
      case 's': return num * 1;
      case 'm': return num * 60;
      case 'h': return num * 3600;
      case 'd':
      case 'D': return num * 86400;
      case 'w':
      case 'W': return num * 604800;
      case 'M': return num * 2592000;
      case 'y':
      case 'Y': return num * 31536000;
      default: return num * 60;
    }
  }

  return 900;
}

/**
 * Resamples lower-timeframe candle data into any higher timeframe.
 * Strictly maintains zero look-ahead bias and mathematical precision.
 */
export function resampleCandles(candles: CandleData[], targetTf: Timeframe | string): CandleData[] {
  if (!candles || candles.length === 0) return [];
  const targetSec = timeframeToSeconds(targetTf);
  if (targetSec <= 0) return candles;

  const resampled: CandleData[] = [];
  let currentBucketTime = -1;
  let bOpen = 0;
  let bHigh = -Infinity;
  let bLow = Infinity;
  let bClose = 0;
  let bVol = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (!c || isNaN(c.time) || isNaN(c.close)) continue;

    const bTime = Math.floor(c.time / targetSec) * targetSec;

    if (bTime !== currentBucketTime) {
      if (currentBucketTime !== -1 && isFinite(bHigh) && isFinite(bLow) && isFinite(bOpen) && isFinite(bClose)) {
        resampled.push({
          time: currentBucketTime,
          open: bOpen,
          high: bHigh,
          low: bLow,
          close: bClose,
          volume: Math.max(0, bVol),
        });
      }
      currentBucketTime = bTime;
      bOpen = c.open;
      bHigh = c.high;
      bLow = c.low;
      bClose = c.close;
      bVol = isNaN(c.volume) ? 0 : c.volume;
    } else {
      if (c.high > bHigh) bHigh = c.high;
      if (c.low < bLow) bLow = c.low;
      bClose = c.close;
      bVol += isNaN(c.volume) ? 0 : c.volume;
    }
  }

  if (currentBucketTime !== -1 && isFinite(bHigh) && isFinite(bLow) && isFinite(bOpen) && isFinite(bClose)) {
    resampled.push({
      time: currentBucketTime,
      open: bOpen,
      high: bHigh,
      low: bLow,
      close: bClose,
      volume: Math.max(0, bVol),
    });
  }

  (resampled as any).__isSanitized = true;
  return resampled;
}

/**
 * Projects a higher timeframe indicator series back onto lower timeframe chart candles.
 * 
 * Quant Precision & Non-Repainting:
 * If waitForClose is true: A higher timeframe bar covering [T, T + targetSec] is only considered
 * finalized once time reaches T + targetSec. Prior to that, the indicator displays the previously
 * finalized bar value, eliminating look-ahead bias and repainting.
 * 
 * Time Complexity: O(N + M) using linear scan.
 */
export function projectMtfSeries<T extends { time: number }>(
  mtfResult: T[],
  chartCandles: CandleData[],
  targetTf: Timeframe | string,
  waitForClose = true
): T[] {
  if (!mtfResult || mtfResult.length === 0 || !chartCandles || chartCandles.length === 0) {
    return [];
  }

  const targetSec = timeframeToSeconds(targetTf);
  const projected: T[] = [];

  let mtfIdx = 0;
  let lastValidMtfItem: T | null = null;

  for (let i = 0; i < chartCandles.length; i++) {
    const cTime = chartCandles[i].time;

    while (mtfIdx < mtfResult.length) {
      const item = mtfResult[mtfIdx];
      const isAvailable = waitForClose 
        ? (item.time + targetSec <= cTime)
        : (item.time <= cTime);

      if (isAvailable) {
        lastValidMtfItem = item;
        mtfIdx++;
      } else {
        break;
      }
    }

    const sourceItem = lastValidMtfItem || (waitForClose ? null : mtfResult[0]);
    if (sourceItem) {
      const mapped = {
        ...sourceItem,
        time: cTime,
      };
      projected.push(mapped);
    }
  }

  return projected;
}

/**
 * Wrapper to run any indicator calculation with Multi-Timeframe resolution.
 * If indTf is 'chart' or not higher than chartTf, runs directly on candles.
 * If higher, resamples candles, executes calculation, and projects back onto chart candles.
 */
export function computeWithMtf<T extends { time: number }>(
  candles: CandleData[],
  chartTf: Timeframe | string,
  indTf: Timeframe | string | 'chart' | undefined,
  calcFn: (c: CandleData[]) => T[],
  waitForClose = true
): T[] {
  if (!candles || candles.length === 0) return [];
  if (!indTf || indTf === 'chart') {
    return calcFn(candles);
  }

  const chartSec = timeframeToSeconds(chartTf);
  const indSec = timeframeToSeconds(indTf);

  if (indSec <= chartSec) {
    return calcFn(candles);
  }

  const resampledBars = resampleCandles(candles, indTf);
  if (resampledBars.length === 0) {
    return calcFn(candles);
  }

  const htfResult = calcFn(resampledBars);
  if (htfResult.length === 0) return [];

  return projectMtfSeries(htfResult, candles, indTf, waitForClose);
}
