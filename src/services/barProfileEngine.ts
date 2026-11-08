import { CandleData } from '../types';
import { ViewportConverter } from './drawingRenderer';

export interface FootprintTier {
  price: number;
  bidVol: number;
  askVol: number;
  delta: number;
  totalVol: number;
  isPoc: boolean;
  imbalance: 'buy' | 'sell' | 'none';
}

export interface BarFootprintData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  totalVolume: number;
  totalDelta: number;
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
  tiers: FootprintTier[];
}

/**
 * Formats a volume quantity gracefully for orderflow footprint display
 */
export function formatVolumeForFootprint(vol: number): string {
  const abs = Math.abs(vol);
  if (abs >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(vol / 1_000).toFixed(1)}k`;
  if (abs >= 100) return `${Math.round(vol)}`;
  if (abs >= 10) return `${vol.toFixed(1)}`;
  if (abs >= 1) return `${vol.toFixed(2)}`;
  if (abs > 0) return `${vol.toFixed(3)}`;
  return '0';
}

/**
 * Calculates Order Flow Volume Footprint profile for a single candle
 * Zero look-ahead bias and protected against division by zero
 */
export function calculateSingleBarFootprint(
  c: CandleData,
  tiersCount = 10
): BarFootprintData {
  const range = c.high - c.low;
  const isBullish = c.close >= c.open;

  // Edge case: flat bar or zero volume
  if (range <= 0 || c.volume <= 0) {
    const singleTier: FootprintTier = {
      price: c.close,
      bidVol: c.volume * 0.5,
      askVol: c.volume * 0.5,
      delta: 0,
      totalVol: c.volume,
      isPoc: true,
      imbalance: 'none',
    };
    return {
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      totalVolume: c.volume,
      totalDelta: 0,
      pocPrice: c.close,
      vahPrice: c.close,
      valPrice: c.close,
      tiers: [singleTier],
    };
  }

  const step = range / tiersCount;
  const tiers: FootprintTier[] = [];

  let maxVol = -1;
  let pocIdx = 0;
  let runningDelta = 0;

  // Generate price tiers from low to high
  for (let i = 0; i < tiersCount; i++) {
    const tierPrice = c.low + (i + 0.5) * step;
    
    // Intra-bar probability weights based on price action
    const pos = (tierPrice - c.low) / (range > 0 ? range : 1);
    
    // Buyers concentrate more on the upper half, sellers on the lower half
    let askRatio = isBullish ? 0.35 + 0.35 * pos : 0.20 + 0.30 * pos;
    askRatio = Math.max(0.1, Math.min(0.9, askRatio));
    const bidRatio = 1 - askRatio;

    // Distribute total volume bell-curved around the close / body center
    const bodyCenter = (c.open + c.close) / 2;
    const distFromCenter = Math.abs(tierPrice - bodyCenter) / (range > 0 ? range : 1);
    const weight = Math.exp(-4 * distFromCenter * distFromCenter);

    const tierTotalVol = (c.volume / tiersCount) * (0.6 + 0.8 * weight);
    const askVol = tierTotalVol * askRatio;
    const bidVol = Math.max(0, tierTotalVol - askVol);
    const delta = askVol - bidVol;
    runningDelta += delta;

    if (tierTotalVol > maxVol) {
      maxVol = tierTotalVol;
      pocIdx = i;
    }

    let imbalance: 'buy' | 'sell' | 'none' = 'none';
    const minImbalanceThreshold = (c.volume / tiersCount) * 0.3;
    if (askVol > bidVol * 2.2 && (askVol + bidVol) > minImbalanceThreshold) {
      imbalance = 'buy';
    } else if (bidVol > askVol * 2.2 && (askVol + bidVol) > minImbalanceThreshold) {
      imbalance = 'sell';
    }

    tiers.push({
      price: Number(tierPrice.toFixed(4)),
      bidVol,
      askVol,
      delta,
      totalVol: tierTotalVol,
      isPoc: false,
      imbalance,
    });
  }

  // Mark Point of Control (POC)
  if (tiers[pocIdx]) {
    tiers[pocIdx].isPoc = true;
  }
  const pocPrice = tiers[pocIdx] ? tiers[pocIdx].price : c.close;

  // Value Area calculation (70% of bar volume)
  const targetAreaVol = c.volume * 0.7;
  let currentAreaVol = tiers[pocIdx]?.totalVol || 0;
  let up = pocIdx;
  let down = pocIdx;

  while (currentAreaVol < targetAreaVol && (up < tiers.length - 1 || down > 0)) {
    const nextUpVol = up < tiers.length - 1 ? tiers[up + 1].totalVol : 0;
    const nextDownVol = down > 0 ? tiers[down - 1].totalVol : 0;
    if (nextUpVol >= nextDownVol && up < tiers.length - 1) {
      up++;
      currentAreaVol += tiers[up].totalVol;
    } else if (down > 0) {
      down--;
      currentAreaVol += tiers[down].totalVol;
    } else if (up < tiers.length - 1) {
      up++;
      currentAreaVol += tiers[up].totalVol;
    } else {
      break;
    }
  }

  const vahPrice = tiers[up]?.price || c.high;
  const valPrice = tiers[down]?.price || c.low;

  return {
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    totalVolume: c.volume,
    totalDelta: runningDelta,
    pocPrice,
    vahPrice,
    valPrice,
    tiers,
  };
}

/**
 * Calculates Volume Candles: dynamic width ratios based on rolling 20-bar volume
 */
export function calculateVolumeCandleWeights(
  candles: CandleData[]
): Map<number, { widthRatio: number; volumeRatio: number }> {
  const result = new Map<number, { widthRatio: number; volumeRatio: number }>();
  if (candles.length === 0) return result;

  const windowSize = 20;
  for (let i = 0; i < candles.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    let sumVol = 0;
    let count = 0;
    for (let j = start; j <= i; j++) {
      sumVol += candles[j].volume;
      count++;
    }
    const avgVol = count > 0 ? sumVol / count : 1;
    const ratio = avgVol > 0 ? candles[i].volume / avgVol : 1;
    // Constrain width ratio between 0.35x and 2.6x normal candle width
    const widthRatio = Math.max(0.35, Math.min(2.6, ratio));

    result.set(candles[i].time, {
      widthRatio,
      volumeRatio: ratio,
    });
  }

  return result;
}

/**
 * Calculates Renko Bricks
 */
export function calculateRenko(
  candles: CandleData[],
  customBrickSize?: number
): CandleData[] {
  if (candles.length === 0) return [];

  // Determine brick size: either custom or 0.4% of initial price
  let brickSize = customBrickSize;
  if (!brickSize || brickSize <= 0) {
    brickSize = candles[0].close * 0.004;
  }
  if (brickSize <= 0) brickSize = 1;

  const renko: CandleData[] = [];
  let currentTop = Math.floor(candles[0].close / brickSize) * brickSize;
  let currentBottom = currentTop - brickSize;
  let trend: 1 | -1 = 1;

  for (let i = 0; i < candles.length; i++) {
    const p = candles[i].close;
    const t = candles[i].time;
    const v = candles[i].volume;

    while (p >= currentTop + brickSize) {
      // Up brick
      currentBottom = currentTop;
      currentTop += brickSize;
      trend = 1;
      renko.push({
        time: t,
        open: currentBottom,
        high: currentTop,
        low: currentBottom,
        close: currentTop,
        volume: v,
      });
    }

    while (p <= currentBottom - brickSize) {
      // Down brick
      currentTop = currentBottom;
      currentBottom -= brickSize;
      trend = -1;
      renko.push({
        time: t,
        open: currentTop,
        high: currentTop,
        low: currentBottom,
        close: currentBottom,
        volume: v,
      });
    }
  }

  return renko.length > 0 ? renko : candles;
}

/**
 * Calculates Three Line Break blocks
 */
export function calculateThreeLineBreak(
  candles: CandleData[]
): CandleData[] {
  if (candles.length < 4) return candles;

  const blocks: CandleData[] = [candles[0]];

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const last = blocks[blocks.length - 1];
    const isLastUp = last.close >= last.open;

    if (isLastUp) {
      if (c.close > last.close) {
        // Continue up
        blocks.push({
          time: c.time,
          open: last.close,
          high: c.close,
          low: last.close,
          close: c.close,
          volume: c.volume,
        });
      } else {
        // Check for 3-line reversal down
        const count = Math.min(3, blocks.length);
        let minLow = Infinity;
        for (let k = blocks.length - count; k < blocks.length; k++) {
          if (blocks[k].low < minLow) minLow = blocks[k].low;
        }
        if (c.close < minLow) {
          blocks.push({
            time: c.time,
            open: last.open,
            high: last.open,
            low: c.close,
            close: c.close,
            volume: c.volume,
          });
        }
      }
    } else {
      if (c.close < last.close) {
        // Continue down
        blocks.push({
          time: c.time,
          open: last.close,
          high: last.close,
          low: c.close,
          close: c.close,
          volume: c.volume,
        });
      } else {
        // Check for 3-line reversal up
        const count = Math.min(3, blocks.length);
        let maxHigh = -Infinity;
        for (let k = blocks.length - count; k < blocks.length; k++) {
          if (blocks[k].high > maxHigh) maxHigh = blocks[k].high;
        }
        if (c.close > maxHigh) {
          blocks.push({
            time: c.time,
            open: last.open,
            high: c.close,
            low: last.open,
            close: c.close,
            volume: c.volume,
          });
        }
      }
    }
  }

  return blocks;
}

/**
 * High-performance rendering engine for Volume Footprint and specialized bar profiles
 */
export function renderBarProfilesOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  candles: CandleData[],
  chartType: string,
  conv: ViewportConverter
) {
  if (!candles || candles.length === 0) return;
  if (chartType !== 'volume-footprint' && chartType !== 'volume-candle' && chartType !== 'high-low') {
    return;
  }

  // 1. O(visibleBars) lookup using TimeScale visible logical range
  const timeScale = conv.chart?.timeScale();
  const visibleRange = timeScale?.getVisibleLogicalRange();

  let startIndex = 0;
  let endIndex = candles.length - 1;

  if (visibleRange) {
    startIndex = Math.max(0, Math.floor(visibleRange.from) - 2);
    endIndex = Math.min(candles.length - 1, Math.ceil(visibleRange.to) + 2);
  }

  // 2. Mathematically exact bar spacing directly from timeScale logical coordinates
  let barSpacing = 16;
  if (conv.logicalToX && visibleRange) {
    const mid = Math.round((visibleRange.from + visibleRange.to) / 2);
    const x0 = conv.logicalToX(mid);
    const x1 = conv.logicalToX(mid + 1);
    if (x0 !== null && x1 !== null && Math.abs(x1 - x0) > 0.05) {
      barSpacing = Math.abs(x1 - x0);
    } else if (conv.logicalToX(0) !== null && conv.logicalToX(1) !== null) {
      barSpacing = Math.abs((conv.logicalToX(1) as number) - (conv.logicalToX(0) as number));
    }
  } else if (visibleRange && timeScale) {
    const count = visibleRange.to - visibleRange.from;
    if (count > 0) {
      barSpacing = Math.max(1, (width - 55) / count);
    }
  }

  const visibleIndices: number[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const x = conv.timeToX(candles[i].time) ?? (conv.logicalToX ? conv.logicalToX(i) : null);
    if (x !== null && x >= -80 && x <= width + 80) {
      visibleIndices.push(i);
    }
  }

  if (visibleIndices.length === 0) return;

  const visibleCandles = visibleIndices.map(i => candles[i]);
  const avgSpacing = barSpacing;

  // ========================================================
  // 1. VOLUME FOOTPRINT (Sipariş Akışı / Ayak İzi Grafiği)
  // ========================================================
  if (chartType === 'volume-footprint') {
    ctx.save();

    const barWidth = Math.max(1, barSpacing * 0.92);

    for (const idx of visibleIndices) {
      const c = candles[idx];
      const cx = conv.timeToX(c.time) ?? (conv.logicalToX ? conv.logicalToX(idx) : null);
      const topY = conv.priceToY(c.high);
      const bottomY = conv.priceToY(c.low);
      const openY = conv.priceToY(c.open);
      const closeY = conv.priceToY(c.close);

      if (cx === null || topY === null || bottomY === null || openY === null || closeY === null) continue;

      const leftX = cx - barWidth / 2;
      const rightX = cx + barWidth / 2;
      const isUp = c.close >= c.open;

      // Draw subtle candle wick
      const wickColor = isUp ? '#089981' : '#f23645';
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = Math.max(1, Math.min(2.5, barSpacing * 0.08));
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.lineTo(cx, bottomY);
      ctx.stroke();

      const spanY = Math.abs(bottomY - topY);
      const desiredTiers = Math.max(4, Math.min(18, Math.floor(spanY / 10)));
      const footprint = calculateSingleBarFootprint(c, desiredTiers);
      const maxTierVol = Math.max(...footprint.tiers.map(t => t.totalVol), 0.0001);

      const actualTiers = footprint.tiers.length;
      const tierHeight = actualTiers > 0 ? spanY / actualTiers : 8;

      // Level 1: Extreme Zoom Out (barWidth < 12) -> sharp delta body + POC highlight
      if (barWidth < 12) {
        const bodyTop = Math.min(openY, closeY);
        const bodyH = Math.max(2, Math.abs(closeY - openY));
        const isPos = footprint.totalDelta >= 0;
        ctx.fillStyle = isPos ? 'rgba(8, 153, 129, 0.85)' : 'rgba(242, 54, 69, 0.85)';
        ctx.fillRect(leftX, bodyTop, barWidth, bodyH);
        ctx.strokeStyle = isPos ? '#066e5c' : '#b91c1c';
        ctx.lineWidth = 1;
        ctx.strokeRect(leftX, bodyTop, barWidth, bodyH);

        // POC highlight line
        const pocY = conv.priceToY(footprint.pocPrice);
        if (pocY !== null) {
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(leftX, pocY - 1, barWidth, 2);
        }
      } else {
        // Level 2 & 3: Render bid/ask horizontal volume tiers
        for (let tIdx = 0; tIdx < footprint.tiers.length; tIdx++) {
          const tier = footprint.tiers[tIdx];
          const tierY = conv.priceToY(tier.price);
          if (tierY === null) continue;

          const tierTop = tierY - tierHeight / 2;
          const bidRatio = tier.bidVol / maxTierVol;
          const askRatio = tier.askVol / maxTierVol;

          const midX = cx;
          const halfW = barWidth * 0.48;
          const bidWidth = Math.max(1, halfW * bidRatio);
          const askWidth = Math.max(1, halfW * askRatio);

          // Bid volume bar (left - red)
          ctx.fillStyle = tier.imbalance === 'sell' ? 'rgba(242, 54, 69, 0.90)' : 'rgba(242, 54, 69, 0.45)';
          ctx.fillRect(midX - bidWidth, tierTop, bidWidth, Math.max(1, tierHeight - 0.5));

          // Ask volume bar (right - green)
          ctx.fillStyle = tier.imbalance === 'buy' ? 'rgba(8, 153, 129, 0.90)' : 'rgba(8, 153, 129, 0.45)';
          ctx.fillRect(midX, tierTop, askWidth, Math.max(1, tierHeight - 0.5));

          // Point of Control (POC) Golden Box
          if (tier.isPoc) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(leftX, tierTop, barWidth, Math.max(1, tierHeight - 0.5));
          }

          // Order flow bid x ask numbers if wide and tall enough
          if (barWidth >= 28 && tierHeight >= 6.5) {
            ctx.font = 'bold 8.5px monospace';
            ctx.textBaseline = 'middle';

            // Bid volume text
            ctx.fillStyle = tier.imbalance === 'sell' ? '#ffffff' : '#fca5a5';
            ctx.textAlign = 'right';
            ctx.fillText(formatVolumeForFootprint(tier.bidVol), midX - 3, tierY);

            // Ask volume text
            ctx.fillStyle = tier.imbalance === 'buy' ? '#ffffff' : '#86efac';
            ctx.textAlign = 'left';
            ctx.fillText(formatVolumeForFootprint(tier.askVol), midX + 3, tierY);
          }
        }

        // Center divider line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, topY);
        ctx.lineTo(cx, bottomY);
        ctx.stroke();

        // Candle open/close tick markers
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(leftX, openY);
        ctx.lineTo(leftX + 3.5, openY);
        ctx.moveTo(rightX - 3.5, closeY);
        ctx.lineTo(rightX, closeY);
        ctx.stroke();
      }

      // Delta Badge under bar
      if (barWidth >= 16) {
        const isPositiveDelta = footprint.totalDelta >= 0;
        const deltaColor = isPositiveDelta ? '#089981' : '#f23645';
        const badgeY = bottomY + 14;

        ctx.fillStyle = isPositiveDelta ? 'rgba(8, 153, 129, 0.22)' : 'rgba(242, 54, 69, 0.22)';
        ctx.fillRect(cx - 20, badgeY - 7, 40, 14);
        ctx.strokeStyle = deltaColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 20, badgeY - 7, 40, 14);

        ctx.font = 'bold 8.5px monospace';
        ctx.fillStyle = deltaColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Δ${isPositiveDelta ? '+' : ''}${formatVolumeForFootprint(footprint.totalDelta)}`, cx, badgeY);
      }
    }

    ctx.restore();
    return;
  }

  // ========================================================
  // 2. VOLUME CANDLES (Hacim Ağırlıklı Genişlikli Mumlar)
  // ========================================================
  if (chartType === 'volume-candle') {
    ctx.save();
    const weights = calculateVolumeCandleWeights(candles);

    for (const idx of visibleIndices) {
      const c = candles[idx];
      const cx = conv.timeToX(c.time) ?? (conv.logicalToX ? conv.logicalToX(idx) : null);
      const topY = conv.priceToY(c.high);
      const bottomY = conv.priceToY(c.low);
      const openY = conv.priceToY(c.open);
      const closeY = conv.priceToY(c.close);

      if (cx === null || topY === null || bottomY === null || openY === null || closeY === null) continue;

      const wInfo = weights.get(c.time) || { widthRatio: 1, volumeRatio: 1 };
      
      // Dynamic width scaling based on square root of relative volume
      const baseWidth = Math.max(1.5, barSpacing * 0.72);
      let candleWidth = baseWidth * Math.sqrt(wInfo.widthRatio);
      candleWidth = Math.max(1.5, Math.min(barSpacing * 1.45, candleWidth));

      const isUp = c.close >= c.open;
      const bodyColor = isUp ? '#089981' : '#f23645';
      const borderColor = isUp ? '#056353' : '#b91c1c';

      // 1. Draw center wick from high to low
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = Math.max(1, Math.min(2.5, barSpacing * 0.08));
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.lineTo(cx, bottomY);
      ctx.stroke();

      // 2. Draw volume-scaled body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));

      // Fill body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(cx - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Border around body for sharp edge
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Golden glow frame for high volume breakout bars (>1.8x average)
      if (wInfo.volumeRatio >= 1.8 && candleWidth >= 8) {
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      }
    }

    ctx.restore();
    return;
  }

  // ========================================================
  // 3. HIGH-LOW BARS (Yüksek-Düşük Barları)
  // ========================================================
  if (chartType === 'high-low') {
    ctx.save();

    for (const idx of visibleIndices) {
      const c = candles[idx];
      const cx = conv.logicalToX ? conv.logicalToX(idx) : conv.timeToX(c.time);
      const topY = conv.priceToY(c.high);
      const bottomY = conv.priceToY(c.low);
      const closeY = conv.priceToY(c.close);

      if (cx === null || topY === null || bottomY === null || closeY === null) continue;

      const isUp = c.close >= c.open;
      const color = isUp ? '#089981' : '#f23645';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.lineTo(cx, bottomY);
      ctx.stroke();

      // Right tick for Close
      ctx.beginPath();
      ctx.moveTo(cx, closeY);
      ctx.lineTo(cx + 4, closeY);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  // ========================================================
  // 4. STEP LINE (Adım Çizgisi)
  // ========================================================
  if (chartType === 'step-line') {
    ctx.save();
    ctx.strokeStyle = '#2962ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    for (let i = 0; i < visibleCandles.length; i++) {
      const cx = conv.timeToX(visibleCandles[i].time);
      const cy = conv.priceToY(visibleCandles[i].close);
      if (cx === null || cy === null) continue;

      if (!started) {
        ctx.moveTo(cx, cy);
        started = true;
      } else {
        const prevC = visibleCandles[i - 1];
        const prevY = conv.priceToY(prevC.close);
        if (prevY !== null) {
          ctx.lineTo(cx, prevY); // Horizontal step
          ctx.lineTo(cx, cy);    // Vertical step
        }
      }
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  // ========================================================
  // 5. LINE WITH MARKERS (Noktalı Çizgi)
  // ========================================================
  if (chartType === 'line-with-markers') {
    ctx.save();
    ctx.strokeStyle = '#2962ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    for (const c of visibleCandles) {
      const cx = conv.timeToX(c.time);
      const cy = conv.priceToY(c.close);
      if (cx === null || cy === null) continue;

      if (!started) {
        ctx.moveTo(cx, cy);
        started = true;
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();

    // Draw circular dots
    for (const c of visibleCandles) {
      const cx = conv.timeToX(c.time);
      const cy = conv.priceToY(c.close);
      if (cx === null || cy === null) continue;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  // ========================================================
  // 6. COLUMNS (Fiyat Sütunları)
  // ========================================================
  if (chartType === 'columns') {
    ctx.save();
    const colWidth = Math.max(3, Math.min(avgSpacing * 0.7, 18));

    for (const c of visibleCandles) {
      const cx = conv.timeToX(c.time);
      const closeY = conv.priceToY(c.close);
      if (cx === null || closeY === null) continue;

      const isUp = c.close >= c.open;
      ctx.fillStyle = isUp ? 'rgba(8, 153, 129, 0.7)' : 'rgba(242, 54, 69, 0.7)';
      ctx.fillRect(cx - colWidth / 2, closeY, colWidth, height - closeY);
      ctx.strokeStyle = isUp ? '#089981' : '#f23645';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - colWidth / 2, closeY, colWidth, height - closeY);
    }

    ctx.restore();
    return;
  }
}

// ========================================================
// 7. VOLUME PROFILE (VPVR - Visible Range & FRVP - Fixed Range)
// Professional Quant Volume Profile Engine with Value Area (70%)
// and Point of Control (POC)
// ========================================================

export interface VolumeProfileRenderOptions {
  binsCount?: number;
  valueAreaPct?: number;
  widthPct?: number;
  side?: 'right' | 'left';
  pocColor?: string;
  vaUpColor?: string;
  vaDownColor?: string;
  nonVaUpColor?: string;
  nonVaDownColor?: string;
  showLabels?: boolean;
}

export function renderVisibleRangeVolumeProfile(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  candles: CandleData[],
  conv: ViewportConverter,
  options?: VolumeProfileRenderOptions
) {
  if (!candles || candles.length < 2) return;

  // 1. Filter visible candles within screen boundaries
  const visibleCandles: CandleData[] = [];
  for (let i = 0; i < candles.length; i++) {
    const x = conv.timeToX(candles[i].time);
    if (x !== null && x >= -20 && x <= width + 20) {
      visibleCandles.push(candles[i]);
    }
  }

  if (visibleCandles.length < 2) return;

  renderCoreVolumeProfile(
    ctx,
    width,
    height,
    visibleCandles,
    conv,
    'visible',
    undefined,
    options
  );
}

export function renderFixedRangeVolumeProfile(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  candles: CandleData[],
  p1: { time: number; price: number },
  p2: { time: number; price: number },
  conv: ViewportConverter,
  options?: VolumeProfileRenderOptions
) {
  if (!candles || candles.length === 0) return;

  const minTime = Math.min(p1.time, p2.time);
  const maxTime = Math.max(p1.time, p2.time);

  const rangeCandles = candles.filter(c => c.time >= minTime && c.time <= maxTime);
  if (rangeCandles.length === 0) return;

  renderCoreVolumeProfile(
    ctx,
    width,
    height,
    rangeCandles,
    conv,
    'fixed',
    { p1, p2 },
    options
  );
}

/**
 * Session Volume Profile (SVP):
 * Partitions candles into discrete daily/calendar sessions, computing
 * and rendering individual volume profiles, developing POC, VAH, and VAL
 * for each session across the visible chart.
 */
export function renderSessionVolumeProfile(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  candles: CandleData[],
  conv: ViewportConverter,
  options?: VolumeProfileRenderOptions
) {
  if (!candles || candles.length < 2) return;

  // 1. Partition candles by daily session
  const sessions: CandleData[][] = [];
  let currentSession: CandleData[] = [];
  let currentKey = '';

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (!c || isNaN(c.time) || isNaN(c.close)) continue;
    const dateKey = new Date(c.time * 1000).toISOString().slice(0, 10);
    if (dateKey !== currentKey) {
      if (currentSession.length > 0) {
        sessions.push(currentSession);
      }
      currentSession = [c];
      currentKey = dateKey;
    } else {
      currentSession.push(c);
    }
  }
  if (currentSession.length > 0) {
    sessions.push(currentSession);
  }

  // 2. Render each visible session
  for (const sessionCandles of sessions) {
    if (sessionCandles.length < 2) continue;

    const tFirst = sessionCandles[0].time;
    const tLast = sessionCandles[sessionCandles.length - 1].time;
    const x1 = conv.timeToX(tFirst);
    const x2 = conv.timeToX(tLast);

    if (x1 === null && x2 === null) continue;
    const startX = x1 ?? 0;
    const endX = x2 ?? (startX + 100);

    // Viewport cull check
    if (endX < -60 || startX > width + 60) continue;

    renderSingleSessionProfile(
      ctx,
      width,
      height,
      sessionCandles,
      startX,
      endX,
      conv,
      options
    );
  }
}

function renderSingleSessionProfile(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  candles: CandleData[],
  startX: number,
  endX: number,
  conv: ViewportConverter,
  options?: VolumeProfileRenderOptions
) {
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let totalVolume = 0;

  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
    totalVolume += isNaN(c.volume) ? 0 : c.volume;
  }

  const range = maxPrice - minPrice;
  if (range <= 0 || !isFinite(range) || totalVolume <= 0) return;

  const binsCount = Math.max(12, Math.min(50, options?.binsCount || 24));
  const binStep = range / binsCount;

  interface ProfileBin {
    price: number;
    upVol: number;
    downVol: number;
    totalVol: number;
  }

  const bins: ProfileBin[] = [];
  for (let i = 0; i < binsCount; i++) {
    bins.push({
      price: minPrice + (i + 0.5) * binStep,
      upVol: 0,
      downVol: 0,
      totalVol: 0,
    });
  }

  for (const c of candles) {
    if (c.volume <= 0) continue;
    const cRange = c.high - c.low;
    const cBody = c.close - c.open;
    const buyRatio = cRange > 0 
      ? Math.max(0.1, Math.min(0.9, 0.5 + 0.45 * (cBody / cRange))) 
      : (c.close >= c.open ? 0.6 : 0.4);
    const sellRatio = 1 - buyRatio;

    if (cRange <= 0) {
      const bIdx = Math.min(binsCount - 1, Math.max(0, Math.floor((c.close - minPrice) / binStep)));
      bins[bIdx].upVol += c.volume * buyRatio;
      bins[bIdx].downVol += c.volume * sellRatio;
      bins[bIdx].totalVol += c.volume;
    } else {
      const startBin = Math.max(0, Math.floor((c.low - minPrice) / binStep));
      const endBin = Math.min(binsCount - 1, Math.floor((c.high - minPrice) / binStep));
      for (let b = startBin; b <= endBin; b++) {
        const binLow = minPrice + b * binStep;
        const binHigh = binLow + binStep;
        const overlap = Math.max(0, Math.min(c.high, binHigh) - Math.max(c.low, binLow));
        const fraction = overlap / cRange;
        const vol = c.volume * fraction;
        bins[b].upVol += vol * buyRatio;
        bins[b].downVol += vol * sellRatio;
        bins[b].totalVol += vol;
      }
    }
  }

  let maxBinVol = 0;
  let pocIdx = 0;
  for (let i = 0; i < binsCount; i++) {
    if (bins[i].totalVol > maxBinVol) {
      maxBinVol = bins[i].totalVol;
      pocIdx = i;
    }
  }

  if (maxBinVol <= 0) return;

  const pocPrice = bins[pocIdx].price;
  const targetVaVol = totalVolume * (options?.valueAreaPct || 0.70);
  let vaVol = bins[pocIdx].totalVol;
  let upIdx = pocIdx;
  let downIdx = pocIdx;

  while (vaVol < targetVaVol && (upIdx < binsCount - 1 || downIdx > 0)) {
    const nextUpVol = upIdx < binsCount - 1 ? bins[upIdx + 1].totalVol : 0;
    const nextDownVol = downIdx > 0 ? bins[downIdx - 1].totalVol : 0;
    if (nextUpVol >= nextDownVol && upIdx < binsCount - 1) {
      upIdx++;
      vaVol += nextUpVol;
    } else if (downIdx > 0) {
      downIdx--;
      vaVol += nextDownVol;
    } else if (upIdx < binsCount - 1) {
      upIdx++;
      vaVol += nextUpVol;
    } else {
      break;
    }
  }

  const vahPrice = minPrice + (upIdx + 1) * binStep;
  const valPrice = minPrice + downIdx * binStep;

  const sessionWidth = Math.max(25, endX - startX);
  const profileMaxW = Math.max(20, Math.min(width * 0.20, sessionWidth * 0.45));

  ctx.save();

  // Subtle session vertical boundary line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(startX, 0);
  ctx.lineTo(startX, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Render Volume Profile Bins
  for (let i = 0; i < binsCount; i++) {
    const b = bins[i];
    const yTop = conv.priceToY(b.price + binStep / 2);
    const yBottom = conv.priceToY(b.price - binStep / 2);
    if (yTop === null || yBottom === null) continue;

    const y = Math.min(yTop, yBottom);
    const barH = Math.max(1.2, Math.abs(yBottom - yTop) - 0.5);
    const isInsideVA = (i >= downIdx && i <= upIdx);

    const upW = (b.upVol / maxBinVol) * profileMaxW;
    const downW = (b.downVol / maxBinVol) * profileMaxW;

    // Green (Up volume)
    ctx.fillStyle = isInsideVA ? 'rgba(8, 153, 129, 0.60)' : 'rgba(8, 153, 129, 0.22)';
    ctx.fillRect(startX, y, upW, barH);

    // Red (Down volume)
    ctx.fillStyle = isInsideVA ? 'rgba(242, 54, 69, 0.60)' : 'rgba(242, 54, 69, 0.22)';
    ctx.fillRect(startX + upW, y, downW, barH);
  }

  // Draw Session POC Line
  const pocY = conv.priceToY(pocPrice);
  if (pocY !== null) {
    ctx.strokeStyle = options?.pocColor || '#ff2d55';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(startX, pocY);
    ctx.lineTo(endX, pocY);
    ctx.stroke();
    ctx.setLineDash([]);
    drawPillBadge(ctx, Math.min(endX - 35, startX + profileMaxW + 35), pocY, `sPOC ${pocPrice.toFixed(2)}`, '#ff2d55');
  }

  // Draw Session VAH Line
  const vahY = conv.priceToY(vahPrice);
  if (vahY !== null) {
    ctx.strokeStyle = '#2962ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(startX, vahY);
    ctx.lineTo(endX, vahY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw Session VAL Line
  const valY = conv.priceToY(valPrice);
  if (valY !== null) {
    ctx.strokeStyle = '#2962ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(startX, valY);
    ctx.lineTo(endX, valY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function renderCoreVolumeProfile(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  candles: CandleData[],
  conv: ViewportConverter,
  mode: 'visible' | 'fixed',
  bounds?: { p1: { time: number; price: number }; p2: { time: number; price: number } },
  options?: VolumeProfileRenderOptions
) {
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let totalVolume = 0;

  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
    totalVolume += c.volume;
  }

  const range = maxPrice - minPrice;
  if (range <= 0 || !isFinite(range) || totalVolume <= 0) return;

  const binsCount = Math.max(12, Math.min(60, options?.binsCount || 30));
  const binStep = range / binsCount;

  interface ProfileBin {
    price: number;
    upVol: number;
    downVol: number;
    totalVol: number;
  }

  const bins: ProfileBin[] = [];
  for (let i = 0; i < binsCount; i++) {
    bins.push({
      price: minPrice + (i + 0.5) * binStep,
      upVol: 0,
      downVol: 0,
      totalVol: 0,
    });
  }

  // Allocate volume across bins
  for (const c of candles) {
    if (c.volume <= 0) continue;
    const cRange = c.high - c.low;
    const cBody = c.close - c.open;
    const buyRatio = cRange > 0 
      ? Math.max(0.1, Math.min(0.9, 0.5 + 0.45 * (cBody / cRange))) 
      : (c.close >= c.open ? 0.6 : 0.4);
    const sellRatio = 1 - buyRatio;

    if (cRange <= 0) {
      const bIdx = Math.min(binsCount - 1, Math.max(0, Math.floor((c.close - minPrice) / binStep)));
      bins[bIdx].upVol += c.volume * buyRatio;
      bins[bIdx].downVol += c.volume * sellRatio;
      bins[bIdx].totalVol += c.volume;
    } else {
      const startBin = Math.max(0, Math.floor((c.low - minPrice) / binStep));
      const endBin = Math.min(binsCount - 1, Math.floor((c.high - minPrice) / binStep));
      for (let b = startBin; b <= endBin; b++) {
        const binLow = minPrice + b * binStep;
        const binHigh = binLow + binStep;
        const overlap = Math.max(0, Math.min(c.high, binHigh) - Math.max(c.low, binLow));
        const fraction = overlap / cRange;
        const vol = c.volume * fraction;
        bins[b].upVol += vol * buyRatio;
        bins[b].downVol += vol * sellRatio;
        bins[b].totalVol += vol;
      }
    }
  }

  // Find POC (Point of Control)
  let maxBinVol = 0;
  let pocIdx = 0;
  for (let i = 0; i < binsCount; i++) {
    if (bins[i].totalVol > maxBinVol) {
      maxBinVol = bins[i].totalVol;
      pocIdx = i;
    }
  }

  if (maxBinVol <= 0) return;

  const pocPrice = bins[pocIdx].price;

  // Calculate Value Area (70% standard)
  const targetVaVol = totalVolume * (options?.valueAreaPct || 0.70);
  let vaVol = bins[pocIdx].totalVol;
  let upIdx = pocIdx;
  let downIdx = pocIdx;

  while (vaVol < targetVaVol && (upIdx < binsCount - 1 || downIdx > 0)) {
    const nextUpVol = upIdx < binsCount - 1 ? bins[upIdx + 1].totalVol : 0;
    const nextDownVol = downIdx > 0 ? bins[downIdx - 1].totalVol : 0;
    if (nextUpVol >= nextDownVol && upIdx < binsCount - 1) {
      upIdx++;
      vaVol += nextUpVol;
    } else if (downIdx > 0) {
      downIdx--;
      vaVol += nextDownVol;
    } else if (upIdx < binsCount - 1) {
      upIdx++;
      vaVol += nextUpVol;
    } else {
      break;
    }
  }

  const vahPrice = minPrice + (upIdx + 1) * binStep;
  const valPrice = minPrice + downIdx * binStep;

  ctx.save();

  if (mode === 'visible') {
    const profileMaxW = width * (options?.widthPct || 0.22);
    const side = options?.side || 'right';
    const startX = side === 'right' ? width - 58 : 50;

    for (let i = 0; i < binsCount; i++) {
      const b = bins[i];
      const yTop = conv.priceToY(b.price + binStep / 2);
      const yBottom = conv.priceToY(b.price - binStep / 2);
      if (yTop === null || yBottom === null) continue;

      const y = Math.min(yTop, yBottom);
      const barH = Math.max(1.5, Math.abs(yBottom - yTop) - 0.5);
      const isInsideVA = (i >= downIdx && i <= upIdx);

      const upW = (b.upVol / maxBinVol) * profileMaxW;
      const downW = (b.downVol / maxBinVol) * profileMaxW;

      if (side === 'right') {
        // Red (Down volume)
        ctx.fillStyle = isInsideVA ? 'rgba(242, 54, 69, 0.65)' : 'rgba(242, 54, 69, 0.22)';
        ctx.fillRect(startX - downW, y, downW, barH);

        // Green (Up volume)
        ctx.fillStyle = isInsideVA ? 'rgba(8, 153, 129, 0.65)' : 'rgba(8, 153, 129, 0.22)';
        ctx.fillRect(startX - downW - upW, y, upW, barH);
      } else {
        ctx.fillStyle = isInsideVA ? 'rgba(8, 153, 129, 0.65)' : 'rgba(8, 153, 129, 0.22)';
        ctx.fillRect(startX, y, upW, barH);
        ctx.fillStyle = isInsideVA ? 'rgba(242, 54, 69, 0.65)' : 'rgba(242, 54, 69, 0.22)';
        ctx.fillRect(startX + upW, y, downW, barH);
      }
    }

    // Render POC Line across
    const pocY = conv.priceToY(pocPrice);
    if (pocY !== null) {
      ctx.strokeStyle = options?.pocColor || '#ff2d55';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(side === 'right' ? startX - profileMaxW - 20 : startX, pocY);
      ctx.lineTo(side === 'right' ? width : startX + profileMaxW + 20, pocY);
      ctx.stroke();
      ctx.setLineDash([]);

      // POC Label
      drawPillBadge(ctx, side === 'right' ? startX - 45 : startX + 45, pocY, `POC ${pocPrice.toFixed(2)}`, '#ff2d55');
    }

    // Render VAH & VAL lines
    const vahY = conv.priceToY(vahPrice);
    if (vahY !== null) {
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(side === 'right' ? startX - profileMaxW : startX, vahY);
      ctx.lineTo(side === 'right' ? width : startX + profileMaxW, vahY);
      ctx.stroke();
      ctx.setLineDash([]);
      drawPillBadge(ctx, side === 'right' ? startX - 25 : startX + 25, vahY, `VAH ${vahPrice.toFixed(2)}`, '#2962ff');
    }

    const valY = conv.priceToY(valPrice);
    if (valY !== null) {
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(side === 'right' ? startX - profileMaxW : startX, valY);
      ctx.lineTo(side === 'right' ? width : startX + profileMaxW, valY);
      ctx.stroke();
      ctx.setLineDash([]);
      drawPillBadge(ctx, side === 'right' ? startX - 25 : startX + 25, valY, `VAL ${valPrice.toFixed(2)}`, '#2962ff');
    }
  } else if (mode === 'fixed' && bounds) {
    const x1 = conv.timeToX(Math.min(bounds.p1.time, bounds.p2.time));
    const x2 = conv.timeToX(Math.max(bounds.p1.time, bounds.p2.time));

    if (x1 !== null && x2 !== null) {
      const leftX = Math.min(x1, x2);
      const rightX = Math.max(x1, x2);
      const spanW = Math.max(20, rightX - leftX);

      // Range Boundary Highlight
      const topY = conv.priceToY(maxPrice);
      const bottomY = conv.priceToY(minPrice);
      if (topY !== null && bottomY !== null) {
        ctx.fillStyle = 'rgba(41, 98, 255, 0.04)';
        ctx.fillRect(leftX, topY, spanW, bottomY - topY);

        ctx.strokeStyle = 'rgba(41, 98, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(leftX, topY, spanW, bottomY - topY);
        ctx.setLineDash([]);
      }

      // Draw horizontal profile within the fixed range
      const profileW = Math.min(spanW * 0.85, 180);
      for (let i = 0; i < binsCount; i++) {
        const b = bins[i];
        const yTop = conv.priceToY(b.price + binStep / 2);
        const yBottom = conv.priceToY(b.price - binStep / 2);
        if (yTop === null || yBottom === null) continue;

        const y = Math.min(yTop, yBottom);
        const barH = Math.max(1.5, Math.abs(yBottom - yTop) - 0.5);
        const isInsideVA = (i >= downIdx && i <= upIdx);

        const upW = (b.upVol / maxBinVol) * profileW;
        const downW = (b.downVol / maxBinVol) * profileW;

        ctx.fillStyle = isInsideVA ? 'rgba(8, 153, 129, 0.65)' : 'rgba(8, 153, 129, 0.25)';
        ctx.fillRect(leftX, y, upW, barH);

        ctx.fillStyle = isInsideVA ? 'rgba(242, 54, 69, 0.65)' : 'rgba(242, 54, 69, 0.25)';
        ctx.fillRect(leftX + upW, y, downW, barH);
      }

      // POC Line across fixed range
      const pocY = conv.priceToY(pocPrice);
      if (pocY !== null) {
        ctx.strokeStyle = '#ff2d55';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(leftX, pocY);
        ctx.lineTo(rightX, pocY);
        ctx.stroke();
        drawPillBadge(ctx, leftX + 45, pocY, `POC ${pocPrice.toFixed(2)}`, '#ff2d55');
      }

      // VAH & VAL lines
      const vahY = conv.priceToY(vahPrice);
      if (vahY !== null) {
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(leftX, vahY);
        ctx.lineTo(rightX, vahY);
        ctx.stroke();
        ctx.setLineDash([]);
        drawPillBadge(ctx, leftX + 30, vahY, `VAH ${vahPrice.toFixed(2)}`, '#2962ff');
      }

      const valY = conv.priceToY(valPrice);
      if (valY !== null) {
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(leftX, valY);
        ctx.lineTo(rightX, valY);
        ctx.stroke();
        ctx.setLineDash([]);
        drawPillBadge(ctx, leftX + 30, valY, `VAL ${valPrice.toFixed(2)}`, '#2962ff');
      }

      // Summary Header Pill
      if (topY !== null) {
        const summaryText = `FRVP | Hacim: ${formatCompactNumber(totalVolume)}`;
        drawPillBadge(ctx, leftX + spanW / 2, Math.max(15, topY - 12), summaryText, '#d1d4dc');
      }
    }
  }

  ctx.restore();
}

function drawPillBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, color: string) {
  ctx.save();
  ctx.font = 'bold 9px monospace';
  const tw = ctx.measureText(text).width;
  const pw = tw + 10;
  const ph = 16;
  const px = cx - pw / 2;
  const py = cy - ph / 2;

  ctx.fillStyle = 'rgba(19, 23, 34, 0.88)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toFixed(0);
}

