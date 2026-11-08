import { CandleData, DrawingPoint } from '../types';
import { ViewportConverter } from './drawingRenderer';

export type MagnetSensitivity = 'off' | 'weak' | 'strong';

export function snapToNearestCandlePoint(
  mouseX: number,
  mouseY: number,
  candles: CandleData[],
  converter: ViewportConverter,
  sensitivity: MagnetSensitivity | boolean = 'weak'
): DrawingPoint | null {
  if (!candles || candles.length === 0) return null;
  if (sensitivity === 'off' || sensitivity === false) return null;

  const thresholdPx = sensitivity === 'strong' ? 75 : 20;

  const mouseTime = converter.xToTime(mouseX);
  const mousePrice = converter.yToPrice(mouseY);
  if (mouseTime === null || mousePrice === null) return null;

  // Find nearest candle by time
  let closestCandle: CandleData | null = null;
  let minTimeDist = Infinity;

  for (const c of candles) {
    const dist = Math.abs(c.time - mouseTime);
    if (dist < minTimeDist) {
      minTimeDist = dist;
      closestCandle = c;
    }
  }

  if (!closestCandle) return { time: mouseTime, price: mousePrice };

  const candleX = converter.timeToX(closestCandle.time);
  if (candleX === null || Math.abs(candleX - mouseX) > thresholdPx) {
    return { time: mouseTime, price: mousePrice };
  }

  // Find which of O, H, L, C is closest to mouseY
  const candidates = [
    closestCandle.open,
    closestCandle.high,
    closestCandle.low,
    closestCandle.close,
  ];

  let bestPrice = closestCandle.close;
  let minPixelDist = Infinity;

  for (const price of candidates) {
    const y = converter.priceToY(price);
    if (y !== null) {
      const dist = Math.abs(y - mouseY);
      if (dist < minPixelDist) {
        minPixelDist = dist;
        bestPrice = price;
      }
    }
  }

  return {
    time: closestCandle.time,
    price: bestPrice,
  };
}
