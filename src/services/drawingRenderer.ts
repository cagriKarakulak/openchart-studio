import { DrawingElement, DrawingPoint, CandleData } from '../types';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { renderFixedRangeVolumeProfile } from './barProfileEngine';

export interface ViewportConverter {
  timeToX: (time: number) => number | null;
  xToTime: (x: number) => number | null;
  priceToY: (price: number) => number | null;
  yToPrice: (y: number) => number | null;
  logicalToX?: (logical: number) => number | null;
  chart?: IChartApi;
  series?: ISeriesApi<any>;
}

export function createViewportConverter(
  chart: IChartApi,
  series: ISeriesApi<any>,
  candles: CandleData[] = []
): ViewportConverter {
  const timeScale = chart.timeScale();

  let timeStep = 900; // default 15m
  if (candles.length >= 2) {
    timeStep = Math.max(1, candles[candles.length - 1].time - candles[candles.length - 2].time);
  }

  return {
    timeToX: (time: number) => {
      try {
        const x = timeScale.timeToCoordinate(time as any);
        if (x !== null) return Number(x);

        if (candles.length > 0) {
          const lastCandle = candles[candles.length - 1];
          if (time > lastCandle.time) {
            const extraBars = (time - lastCandle.time) / timeStep;
            const logical = (candles.length - 1) + extraBars;
            const coord = timeScale.logicalToCoordinate(logical as any);
            if (coord !== null) return Number(coord);
          }
        }
        return null;
      } catch (_) {
        return null;
      }
    },
    xToTime: (x: number) => {
      try {
        const t = timeScale.coordinateToTime(x);
        if (t !== null) return Number(t);

        const logical = timeScale.coordinateToLogical(x);
        if (logical !== null && candles.length > 0) {
          const idx = Math.round(Number(logical));
          if (idx >= 0 && idx < candles.length) {
            return candles[idx].time;
          } else if (idx >= candles.length) {
            const lastCandle = candles[candles.length - 1];
            return lastCandle.time + (idx - (candles.length - 1)) * timeStep;
          } else if (idx < 0) {
            return candles[0].time + idx * timeStep;
          }
        }
        return null;
      } catch (_) {
        return null;
      }
    },
    priceToY: (price: number) => {
      try {
        const y = series.priceToCoordinate(price);
        return y === null ? null : Number(y);
      } catch (_) {
        return null;
      }
    },
    yToPrice: (y: number) => {
      try {
        const p = series.coordinateToPrice(y);
        return p === null ? null : Number(p);
      } catch (_) {
        return null;
      }
    },
    logicalToX: (logical: number) => {
      try {
        const x = timeScale.logicalToCoordinate(logical as any);
        return x !== null ? Number(x) : null;
      } catch (_) {
        return null;
      }
    },
    chart,
    series,
  };
}

export function renderDrawingsOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  drawings: DrawingElement[],
  converter: ViewportConverter,
  selectedDrawingId?: string | null,
  activePreview?: DrawingElement | null,
  candles?: CandleData[]
) {
  const allDrawings = [...drawings];
  if (activePreview) {
    allDrawings.push(activePreview);
  }

  for (const el of allDrawings) {
    if (el.visible === false) continue;
    const isSelected = el.id === selectedDrawingId;
    drawSingleElement(ctx, width, height, el, converter, isSelected, candles);
  }
}

function drawSingleElement(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  el: DrawingElement,
  conv: ViewportConverter,
  isSelected: boolean,
  candles?: CandleData[]
) {
  ctx.save();
  ctx.strokeStyle = el.color;
  ctx.lineWidth = el.lineWidth;
  ctx.fillStyle = el.fillColor || el.color;

  if (el.lineStyle === 'dashed') {
    ctx.setLineDash([6, 4]);
  } else if (el.lineStyle === 'dotted') {
    ctx.setLineDash([2, 2]);
  } else {
    ctx.setLineDash([]);
  }

  const points = el.points;
  if (!points || points.length === 0) {
    ctx.restore();
    return;
  }

  const screenPoints: { x: number; y: number }[] = [];
  for (const p of points) {
    const x = conv.timeToX(p.time);
    const y = conv.priceToY(p.price);
    if (x !== null && y !== null) {
      screenPoints.push({ x, y });
    }
  }

  switch (el.type) {
    case 'dot': {
      if (screenPoints.length < 1) break;
      const p = screenPoints[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = el.color;
      ctx.fill();
      break;
    }

    case 'trendLine': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
      }
      break;
    }

    case 'ray': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      let targetX = p2.x;
      let targetY = p2.y;
      if (dx !== 0 || dy !== 0) {
        const factor = Math.max(width, height) / (Math.hypot(dx, dy) || 1);
        targetX = p1.x + dx * factor;
        targetY = p1.y + dy * factor;
      }

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
      }
      break;
    }

    case 'infoLine': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = (Math.atan2(-dy, dx) * 180 / Math.PI).toFixed(1);
      const priceDiff = points[1].price - points[0].price;
      const pct = points[0].price !== 0 ? ((priceDiff / points[0].price) * 100).toFixed(2) : '0';

      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      drawPill(ctx, mx, my - 15, `${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)} (${pct}%)  ${angle}°`, el.color);

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
      }
      break;
    }

    case 'extendedLine': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      if (Math.abs(dx) < 0.001) {
        ctx.beginPath();
        ctx.moveTo(p1.x, 0);
        ctx.lineTo(p1.x, height);
        ctx.stroke();
      } else {
        const slope = dy / dx;
        const yAt0 = p1.y - slope * p1.x;
        const yAtW = p1.y + slope * (width - p1.x);
        ctx.beginPath();
        ctx.moveTo(0, yAt0);
        ctx.lineTo(width, yAtW);
        ctx.stroke();
      }

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
      }
      break;
    }

    case 'trendAngle': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];

      // Trend Line
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Dotted horizontal baseline
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p1.x + 80, p1.y);
      ctx.stroke();
      ctx.restore();

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angleRad = Math.atan2(-dy, dx);
      const angleDeg = (angleRad * 180 / Math.PI).toFixed(1);

      // Arc
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 35, 0, -angleRad, angleRad < 0);
      ctx.stroke();

      drawPill(ctx, p1.x + 50, p1.y - 12, `${angleDeg}°`, el.color);

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
      }
      break;
    }

    case 'horizontalLine': {
      const y = conv.priceToY(points[0].price);
      if (y !== null) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        drawBadge(ctx, width - 60, y - 10, points[0].price.toFixed(2), el.color);

        if (isSelected) {
          drawHandle(ctx, width / 2, y);
        }
      }
      break;
    }

    case 'horizontalRay': {
      if (screenPoints.length < 1) break;
      const p1 = screenPoints[0];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(width, p1.y);
      ctx.stroke();

      drawBadge(ctx, width - 60, p1.y - 10, points[0].price.toFixed(2), el.color);

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
      }
      break;
    }

    case 'verticalLine': {
      const x = conv.timeToX(points[0].time);
      if (x !== null) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        if (isSelected) {
          drawHandle(ctx, x, height / 2);
        }
      }
      break;
    }

    case 'crossLine': {
      if (screenPoints.length < 1) break;
      const p = screenPoints[0];
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(width, p.y);
      ctx.stroke();
      // Vertical
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, height);
      ctx.stroke();

      drawBadge(ctx, width - 60, p.y - 10, points[0].price.toFixed(2), el.color);
      if (isSelected) {
        drawHandle(ctx, p.x, p.y);
      }
      break;
    }

    case 'arrow': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      drawArrowHead(ctx, p1.x, p1.y, p2.x, p2.y, 12, el.color);

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
      }
      break;
    }

    case 'rectangle': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];

      const rx = Math.min(p1.x, p2.x);
      const ry = Math.min(p1.y, p2.y);
      const rw = Math.abs(p2.x - p1.x);
      const rh = Math.abs(p2.y - p1.y);

      ctx.fillStyle = el.fillColor || `${el.color}22`;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
        drawHandle(ctx, p1.x, p2.y);
        drawHandle(ctx, p2.x, p1.y);
      }
      break;
    }

    case 'circle': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const radius = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      ctx.fillStyle = el.fillColor || `${el.color}18`;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
      }
      break;
    }

    case 'ellipse': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const rx = Math.max(Math.abs(p2.x - p1.x) / 2, 5);
      const ry = Math.max(Math.abs(p2.y - p1.y) / 2, 5);

      ctx.fillStyle = el.fillColor || `${el.color}18`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
      }
      break;
    }

    case 'triangle': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const p3 = screenPoints.length >= 3 ? screenPoints[2] : { x: p1.x, y: p2.y };

      ctx.fillStyle = el.fillColor || `${el.color}18`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
        drawHandle(ctx, p3.x, p3.y);
      }
      break;
    }

    case 'fibonacci': {
      if (points.length < 2) break;
      const p1 = points[0];
      const p2 = points[1];
      const x1 = conv.timeToX(p1.time);
      const x2 = conv.timeToX(p2.time);
      if (x1 === null && x2 === null) break;

      const leftX = Math.min(x1 || 0, x2 || width);
      const rightX = Math.max(x1 || 0, x2 || width);
      const drawWidth = Math.max(rightX - leftX, 150);

      const priceDiff = p2.price - p1.price;
      const fibLevels = [
        { ratio: 0.0, color: '#787b86' },
        { ratio: 0.236, color: '#f23645' },
        { ratio: 0.382, color: '#ff9800' },
        { ratio: 0.5, color: '#089981' },
        { ratio: 0.618, color: '#2962ff' },
        { ratio: 0.786, color: '#ab47bc' },
        { ratio: 1.0, color: '#787b86' },
        { ratio: 1.618, color: '#00e5ff' },
      ];

      for (let i = 0; i < fibLevels.length; i++) {
        const lvl = fibLevels[i];
        const lvlPrice = p1.price + priceDiff * lvl.ratio;
        const y = conv.priceToY(lvlPrice);
        if (y === null) continue;

        ctx.strokeStyle = lvl.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(leftX + drawWidth, y);
        ctx.stroke();

        ctx.fillStyle = lvl.color;
        ctx.font = '11px sans-serif';
        ctx.fillText(`${lvl.ratio} (${lvlPrice.toFixed(2)})`, leftX + 5, y - 4);
      }

      if (isSelected && screenPoints.length >= 2) {
        drawHandle(ctx, screenPoints[0].x, screenPoints[0].y);
        drawHandle(ctx, screenPoints[1].x, screenPoints[1].y);
      }
      break;
    }

    case 'fibExtension': {
      if (points.length < 2) break;
      const p1 = points[0];
      const p2 = points[1];
      const p3 = points.length >= 3 ? points[2] : p2;
      const x1 = conv.timeToX(p1.time) || 0;
      const x2 = conv.timeToX(p2.time) || width;
      const drawWidth = Math.max(Math.abs(x2 - x1), 160);

      const wave = p2.price - p1.price;
      const extLevels = [0.618, 1.0, 1.618, 2.618];
      const colors = ['#ff9800', '#089981', '#2962ff', '#e040fb'];

      for (let i = 0; i < extLevels.length; i++) {
        const lvlPrice = p3.price + wave * extLevels[i];
        const y = conv.priceToY(lvlPrice);
        if (y === null) continue;

        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.min(x1, x2), y);
        ctx.lineTo(Math.min(x1, x2) + drawWidth, y);
        ctx.stroke();

        ctx.fillStyle = colors[i];
        ctx.font = '11px sans-serif';
        ctx.fillText(`Ext ${extLevels[i]} (${lvlPrice.toFixed(2)})`, Math.min(x1, x2) + 5, y - 4);
      }
      break;
    }

    case 'fibTimeZones': {
      if (points.length < 1) break;
      const x0 = conv.timeToX(points[0].time);
      if (x0 === null) break;

      const fibNums = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
      const step = 28; // bar pixel width approx

      for (let i = 0; i < fibNums.length; i++) {
        const fx = x0 + fibNums[i] * step;
        if (fx > width) break;

        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(fx, 0);
        ctx.lineTo(fx, height);
        ctx.stroke();
        ctx.restore();

        drawPill(ctx, fx, 20, `${fibNums[i]}`, '#2962ff');
      }
      break;
    }

    case 'fibCircles': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const baseR = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      const ratios = [0.382, 0.618, 1.0, 1.618];
      const colors = ['#f23645', '#ff9800', '#089981', '#2962ff'];

      for (let i = 0; i < ratios.length; i++) {
        const r = baseR * ratios[i];
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'gannBox': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const rx = Math.min(p1.x, p2.x);
      const ry = Math.min(p1.y, p2.y);
      const rw = Math.abs(p2.x - p1.x);
      const rh = Math.abs(p2.y - p1.y);

      ctx.fillStyle = `${el.color}12`;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);

      // Diagonal cross
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + rw, ry + rh);
      ctx.moveTo(rx, ry + rh);
      ctx.lineTo(rx + rw, ry);
      ctx.stroke();
      ctx.restore();

      // Gann 0.5 mid lines
      ctx.strokeStyle = `${el.color}88`;
      ctx.beginPath();
      ctx.moveTo(rx + rw / 2, ry);
      ctx.lineTo(rx + rw / 2, ry + rh);
      ctx.moveTo(rx, ry + rh / 2);
      ctx.lineTo(rx + rw, ry + rh / 2);
      ctx.stroke();
      break;
    }

    case 'gannFan': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      const angles = [1/8, 1/4, 1/3, 1/2, 1, 2, 3, 4, 8];
      const labels = ['1x8', '1x4', '1x3', '1x2', '1x1', '2x1', '3x1', '4x1', '8x1'];

      for (let i = 0; i < angles.length; i++) {
        const factor = angles[i];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x + dx * 2, p1.y + dy * factor * 2);
        ctx.stroke();

        ctx.font = '10px sans-serif';
        ctx.fillStyle = el.color;
        ctx.fillText(labels[i], p1.x + dx * 1.5, p1.y + dy * factor * 1.5 - 4);
      }
      break;
    }

    case 'parallelChannel': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const p3 = screenPoints.length >= 3 ? screenPoints[2] : { x: p2.x, y: p2.y + 40 };

      const channelOffsetY = p3.y - p2.y;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y + channelOffsetY);
      ctx.lineTo(p2.x, p2.y + channelOffsetY);
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y + channelOffsetY / 2);
      ctx.lineTo(p2.x, p2.y + channelOffsetY / 2);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = el.fillColor || `${el.color}15`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p2.x, p2.y + channelOffsetY);
      ctx.lineTo(p1.x, p1.y + channelOffsetY);
      ctx.closePath();
      ctx.fill();

      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
        drawHandle(ctx, p2.x, p2.y + channelOffsetY);
      }
      break;
    }

    case 'longPosition': {
      if (points.length < 2) break;
      const entryPt = points[0];
      const targetPt = points[1];
      const x1 = conv.timeToX(entryPt.time);
      const x2 = conv.timeToX(targetPt.time) ?? (x1 !== null ? x1 + 140 : null);
      const yEntry = conv.priceToY(entryPt.price);
      const yTarget = conv.priceToY(targetPt.price);
      if (x1 === null || x2 === null || yEntry === null || yTarget === null) break;

      const stopPrice = points.length >= 3 ? points[2].price : entryPt.price - (targetPt.price - entryPt.price) / 2;
      const yStop = conv.priceToY(stopPrice) ?? (yEntry + (yEntry - yTarget) / 2);

      const leftX = Math.min(x1, x2);
      const rightX = Math.max(x1, x2);
      const widthBox = Math.max(rightX - leftX, 100);

      const topY = Math.min(yEntry, yTarget);
      const profitHeight = Math.abs(yEntry - yTarget);
      ctx.fillStyle = 'rgba(8, 153, 129, 0.2)';
      ctx.fillRect(leftX, topY, widthBox, profitHeight);
      ctx.strokeStyle = '#089981';
      ctx.strokeRect(leftX, topY, widthBox, profitHeight);

      const lossTopY = Math.min(yEntry, yStop);
      const lossHeight = Math.abs(yStop - yEntry);
      ctx.fillStyle = 'rgba(242, 54, 69, 0.2)';
      ctx.fillRect(leftX, lossTopY, widthBox, lossHeight);
      ctx.strokeStyle = '#f23645';
      ctx.strokeRect(leftX, lossTopY, widthBox, lossHeight);

      const profitDist = Math.abs(targetPt.price - entryPt.price);
      const lossDist = Math.max(Math.abs(entryPt.price - stopPrice), 0.0001);
      const rr = (profitDist / lossDist).toFixed(2);

      drawPill(ctx, leftX + widthBox / 2, yEntry, `Long R/R: ${rr}`, '#2962ff');
      break;
    }

    case 'shortPosition': {
      if (points.length < 2) break;
      const entryPt = points[0];
      const targetPt = points[1];
      const x1 = conv.timeToX(entryPt.time);
      const x2 = conv.timeToX(targetPt.time) ?? (x1 !== null ? x1 + 140 : null);
      const yEntry = conv.priceToY(entryPt.price);
      const yTarget = conv.priceToY(targetPt.price);
      if (x1 === null || x2 === null || yEntry === null || yTarget === null) break;

      const stopPrice = points.length >= 3 ? points[2].price : entryPt.price + (entryPt.price - targetPt.price) / 2;
      const yStop = conv.priceToY(stopPrice) ?? (yEntry - (yTarget - yEntry) / 2);

      const leftX = Math.min(x1, x2);
      const rightX = Math.max(x1, x2);
      const widthBox = Math.max(rightX - leftX, 100);

      const profitTopY = Math.min(yEntry, yTarget);
      const profitHeight = Math.abs(yTarget - yEntry);
      ctx.fillStyle = 'rgba(8, 153, 129, 0.2)';
      ctx.fillRect(leftX, profitTopY, widthBox, profitHeight);
      ctx.strokeStyle = '#089981';
      ctx.strokeRect(leftX, profitTopY, widthBox, profitHeight);

      const lossTopY = Math.min(yEntry, yStop);
      const lossHeight = Math.abs(yEntry - yStop);
      ctx.fillStyle = 'rgba(242, 54, 69, 0.2)';
      ctx.fillRect(leftX, lossTopY, widthBox, lossHeight);
      ctx.strokeStyle = '#f23645';
      ctx.strokeRect(leftX, lossTopY, widthBox, lossHeight);

      const profitDist = Math.abs(entryPt.price - targetPt.price);
      const lossDist = Math.max(Math.abs(stopPrice - entryPt.price), 0.0001);
      const rr = (profitDist / lossDist).toFixed(2);

      drawPill(ctx, leftX + widthBox / 2, yEntry, `Short R/R: ${rr}`, '#2962ff');
      break;
    }

    case 'forecast': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];

      // Prediction arrow
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();

      // Cone
      const coneHeight = Math.abs(p2.y - p1.y) * 0.75 + 30;
      ctx.fillStyle = 'rgba(41, 98, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y - coneHeight);
      ctx.lineTo(p2.x, p2.y + coneHeight);
      ctx.closePath();
      ctx.fill();

      drawPill(ctx, p2.x, p2.y, `Hedef: ${points[1].price.toFixed(2)}`, '#2962ff');
      break;
    }

    case 'dateRange': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const lx = Math.min(p1.x, p2.x);
      const rx = Math.max(p1.x, p2.x);
      const w = rx - lx;

      ctx.fillStyle = 'rgba(41, 98, 255, 0.15)';
      ctx.fillRect(lx, 0, w, height);
      ctx.strokeRect(lx, 0, w, height);

      const bars = Math.round(w / 8);
      drawPill(ctx, lx + w / 2, height / 2, `~${bars} Bar Aralığı`, '#2962ff');
      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
      }
      break;
    }

    case 'priceRange': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const ty = Math.min(p1.y, p2.y);
      const by = Math.max(p1.y, p2.y);
      const h = by - ty;

      ctx.fillStyle = 'rgba(41, 98, 255, 0.15)';
      ctx.fillRect(0, ty, width, h);
      ctx.strokeRect(0, ty, width, h);

      const diff = Math.abs(points[1].price - points[0].price);
      drawPill(ctx, width / 2, ty + h / 2, `Fiyat Farkı: ${diff.toFixed(2)}`, '#2962ff');
      if (isSelected) {
        drawHandle(ctx, p1.x, p1.y);
        drawHandle(ctx, p2.x, p2.y);
      }
      break;
    }

    case 'measure': {
      if (points.length < 2) break;
      const p1 = points[0];
      const p2 = points[1];
      const x1 = conv.timeToX(p1.time);
      const x2 = conv.timeToX(p2.time);
      const y1 = conv.priceToY(p1.price);
      const y2 = conv.priceToY(p2.price);
      if (x1 === null || x2 === null || y1 === null || y2 === null) break;

      const priceChange = p2.price - p1.price;
      const pctChange = p1.price !== 0 ? (priceChange / p1.price) * 100 : 0;
      const isUp = priceChange >= 0;
      const color = isUp ? '#089981' : '#f23645';

      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1);
      const rh = Math.abs(y2 - y1);

      ctx.fillStyle = isUp ? 'rgba(8, 153, 129, 0.15)' : 'rgba(242, 54, 69, 0.15)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);

      const centerX = rx + rw / 2;
      const centerY = ry + rh / 2;
      const label = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%)`;

      drawPill(ctx, centerX, centerY, label, color);

      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
        drawHandle(ctx, x1, y2);
        drawHandle(ctx, x2, y1);
        drawHandle(ctx, centerX, centerY);
        ctx.save();
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4);
        ctx.restore();
      }
      break;
    }

    case 'fixedRangeVolumeProfile': {
      if (points.length < 2 || !candles || candles.length === 0) break;
      renderFixedRangeVolumeProfile(ctx, width, height, candles, points[0], points[1], conv);
      if (isSelected && screenPoints.length >= 2) {
        drawHandle(ctx, screenPoints[0].x, screenPoints[0].y);
        drawHandle(ctx, screenPoints[1].x, screenPoints[1].y);
      }
      break;
    }

    case 'brush': {
      if (screenPoints.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
      }
      ctx.stroke();
      break;
    }

    case 'highlighter': {
      if (screenPoints.length < 2) break;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.strokeStyle = el.color || '#ffeb3b';
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'polyline': {
      if (screenPoints.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
        drawHandle(ctx, screenPoints[i].x, screenPoints[i].y);
      }
      ctx.stroke();
      break;
    }

    case 'text':
    case 'anchoredText': {
      if (screenPoints.length < 1) break;
      const p = screenPoints[0];
      ctx.font = 'bold 12px sans-serif';
      const text = el.text || 'Not';
      const tw = ctx.measureText(text).width;

      ctx.fillStyle = 'rgba(19, 23, 34, 0.85)';
      ctx.strokeStyle = el.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(p.x - 4, p.y - 16, tw + 12, 22, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = el.color;
      ctx.fillText(text, p.x + 2, p.y);
      if (isSelected) {
        drawHandle(ctx, p.x, p.y);
      }
      break;
    }

    case 'callout': {
      if (screenPoints.length < 1) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints.length >= 2 ? screenPoints[1] : { x: p1.x + 60, y: p1.y - 40 };

      // Pointer line
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Bubble
      const text = el.text || 'Baloncuk Notu';
      drawPill(ctx, p2.x, p2.y, text, el.color);
      break;
    }

    case 'priceLabel': {
      if (screenPoints.length < 1) break;
      const p = screenPoints[0];
      drawBadge(ctx, p.x + 8, p.y - 8, points[0].price.toFixed(2), el.color);

      // Dot pointer
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = el.color;
      ctx.fill();
      break;
    }

    case 'arrowUp': {
      if (screenPoints.length < 1) break;
      const p = screenPoints[0];
      ctx.fillStyle = '#089981';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 15);
      ctx.lineTo(p.x - 8, p.y);
      ctx.lineTo(p.x - 3, p.y);
      ctx.lineTo(p.x - 3, p.y + 12);
      ctx.lineTo(p.x + 3, p.y + 12);
      ctx.lineTo(p.x + 3, p.y);
      ctx.lineTo(p.x + 8, p.y);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'arrowDown': {
      if (screenPoints.length < 1) break;
      const p = screenPoints[0];
      ctx.fillStyle = '#f23645';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 15);
      ctx.lineTo(p.x - 8, p.y);
      ctx.lineTo(p.x - 3, p.y);
      ctx.lineTo(p.x - 3, p.y - 12);
      ctx.lineTo(p.x + 3, p.y - 12);
      ctx.lineTo(p.x + 3, p.y);
      ctx.lineTo(p.x + 8, p.y);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'headAndShoulders': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const dx = (p2.x - p1.x) / 4;
      const dy = p2.y - p1.y;

      const pts = [
        { x: p1.x, y: p1.y, label: '' },
        { x: p1.x + dx, y: p1.y + dy * 0.6, label: 'LS' },
        { x: p1.x + dx * 2, y: p1.y, label: 'N1' },
        { x: p1.x + dx * 2.5, y: p1.y + dy, label: 'Head' },
        { x: p1.x + dx * 3, y: p1.y, label: 'N2' },
        { x: p1.x + dx * 3.5, y: p1.y + dy * 0.6, label: 'RS' },
        { x: p2.x, y: p1.y, label: '' },
      ];

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      pts.forEach(pt => {
        if (pt.label) drawPill(ctx, pt.x, pt.y - 10, pt.label, '#ff9800');
      });
      break;
    }

    case 'xabcdPattern': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const dx = (p2.x - p1.x) / 4;
      const dy = p2.y - p1.y;

      const pts = [
        { x: p1.x, y: p1.y, label: 'X' },
        { x: p1.x + dx, y: p1.y + dy, label: 'A' },
        { x: p1.x + dx * 2, y: p1.y + dy * 0.382, label: 'B' },
        { x: p1.x + dx * 3, y: p1.y + dy * 0.886, label: 'C' },
        { x: p2.x, y: p1.y, label: 'D' },
      ];

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      pts.forEach(pt => {
        drawPill(ctx, pt.x, pt.y - 10, pt.label, '#2962ff');
      });
      break;
    }

    case 'trianglePattern': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const w = Math.abs(p2.x - p1.x);

      // Converging upper and lower lines
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y - 50);
      ctx.lineTo(p1.x + w, p1.y);
      ctx.moveTo(p1.x, p1.y + 50);
      ctx.lineTo(p1.x + w, p1.y);
      ctx.stroke();

      drawPill(ctx, p1.x + w / 2, p1.y, 'Üçgen', '#ff9800');
      break;
    }

    case 'elliottImpulse': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const dx = (p2.x - p1.x) / 5;
      const dy = (p2.y - p1.y) / 5;

      const pts = [
        { x: p1.x, y: p1.y, label: '(0)' },
        { x: p1.x + dx, y: p1.y + dy * 2, label: '(1)' },
        { x: p1.x + dx * 2, y: p1.y + dy * 1, label: '(2)' },
        { x: p1.x + dx * 3.5, y: p1.y + dy * 4.5, label: '(3)' },
        { x: p1.x + dx * 4, y: p1.y + dy * 3.5, label: '(4)' },
        { x: p2.x, y: p2.y, label: '(5)' },
      ];

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      pts.forEach(pt => {
        drawPill(ctx, pt.x, pt.y - 12, pt.label, '#00e676');
      });
      break;
    }

    case 'elliottCorrection': {
      if (screenPoints.length < 2) break;
      const p1 = screenPoints[0];
      const p2 = screenPoints[1];
      const dx = (p2.x - p1.x) / 3;
      const dy = (p2.y - p1.y);

      const pts = [
        { x: p1.x, y: p1.y, label: '(0)' },
        { x: p1.x + dx, y: p1.y + dy * 0.8, label: '(A)' },
        { x: p1.x + dx * 2, y: p1.y + dy * 0.3, label: '(B)' },
        { x: p2.x, y: p2.y, label: '(C)' },
      ];

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      pts.forEach(pt => {
        drawPill(ctx, pt.x, pt.y - 12, pt.label, '#f23645');
      });
      break;
    }
  }

  ctx.restore();
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2962ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.save();
  ctx.font = '10px sans-serif';
  const width = ctx.measureText(text).width + 8;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + 4, y + 12);
  ctx.restore();
}

function drawPill(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, color: string) {
  ctx.save();
  ctx.font = 'bold 11px sans-serif';
  const textWidth = ctx.measureText(text).width;
  const pw = textWidth + 14;
  const ph = 22;
  const px = cx - pw / 2;
  const py = cy - ph / 2;

  ctx.fillStyle = 'rgba(19, 23, 34, 0.9)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.fillText(text, px + 7, py + 15);
  ctx.restore();
}

function drawArrowHead(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, headLen: number, color: string) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function findHitDrawing(
  drawings: DrawingElement[],
  clickX: number,
  clickY: number,
  conv: ViewportConverter
): DrawingElement | null {
  for (let i = drawings.length - 1; i >= 0; i--) {
    const el = drawings[i];
    if (el.visible === false) continue;
    const pts = el.points.map(p => ({
      x: conv.timeToX(p.time),
      y: conv.priceToY(p.price),
    })).filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null);

    if (pts.length === 0) continue;

    // 1. Point / Handle proximity test (16px radius)
    for (const pt of pts) {
      if (Math.hypot(pt.x - clickX, pt.y - clickY) < 16) {
        return el;
      }
    }

    // 2. Line segment proximity test (12px tolerance)
    for (let j = 0; j < pts.length - 1; j++) {
      const p1 = pts[j];
      const p2 = pts[j + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq > 0) {
        const t = Math.max(0, Math.min(1, ((clickX - p1.x) * dx + (clickY - p1.y) * dy) / lenSq));
        const px = p1.x + t * dx;
        const py = p1.y + t * dy;
        if (Math.hypot(clickX - px, clickY - py) < 12) {
          return el;
        }
      }
    }

    // 3. Horizontal Lines & Rays
    if (el.type === 'horizontalLine') {
      const y = conv.priceToY(el.points[0].price);
      if (y !== null && Math.abs(clickY - y) < 10) return el;
    }
    if (el.type === 'horizontalRay' && pts.length >= 1) {
      const y = conv.priceToY(el.points[0].price);
      if (y !== null && Math.abs(clickY - y) < 10 && clickX >= pts[0].x - 6) return el;
    }

    // 4. Vertical Lines & Cross Lines
    if (el.type === 'verticalLine') {
      const x = conv.timeToX(el.points[0].time);
      if (x !== null && Math.abs(clickX - x) < 10) return el;
    }
    if (el.type === 'crossLine') {
      const y = conv.priceToY(el.points[0].price);
      const x = conv.timeToX(el.points[0].time);
      if (y !== null && Math.abs(clickY - y) < 10) return el;
      if (x !== null && Math.abs(clickX - x) < 10) return el;
    }

    // 5. Rays and Extended Lines
    if (el.type === 'ray' && pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq > 0) {
        const t = ((clickX - p1.x) * dx + (clickY - p1.y) * dy) / lenSq;
        if (t >= 0) {
          const px = p1.x + t * dx;
          const py = p1.y + t * dy;
          if (Math.hypot(clickX - px, clickY - py) < 12) return el;
        }
      }
    }
    if (el.type === 'extendedLine' && pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq > 0) {
        const t = ((clickX - p1.x) * dx + (clickY - p1.y) * dy) / lenSq;
        const px = p1.x + t * dx;
        const py = p1.y + t * dy;
        if (Math.hypot(clickX - px, clickY - py) < 12) return el;
      }
    }

    // 6. Box & Range & Measure Tools (Rectangle, Measure Ruler, Date/Price Range, Long/Short Position, Gann Box, Forecast)
    const boxTypes = [
      'rectangle', 
      'measure', 
      'dateRange', 
      'priceRange', 
      'longPosition', 
      'shortPosition', 
      'forecast', 
      'gannBox'
    ];
    if (boxTypes.includes(el.type) && pts.length >= 2) {
      const minX = Math.min(pts[0].x, pts[1].x) - 8;
      const maxX = Math.max(pts[0].x, pts[1].x) + 8;
      const minY = Math.min(pts[0].y, pts[1].y) - 8;
      const maxY = Math.max(pts[0].y, pts[1].y) + 8;
      if (clickX >= minX && clickX <= maxX && clickY >= minY && clickY <= maxY) {
        return el;
      }
    }

    // 7. Parallel Channel
    if (el.type === 'parallelChannel' && pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[1];
      const minX = Math.min(p1.x, p2.x) - 10;
      const maxX = Math.max(p1.x, p2.x) + 10;
      const minY = Math.min(p1.y, p2.y) - 50;
      const maxY = Math.max(p1.y, p2.y) + 50;
      if (clickX >= minX && clickX <= maxX && clickY >= minY && clickY <= maxY) {
        return el;
      }
    }

    // 8. Fibonacci Retracement & Extension
    if ((el.type === 'fibonacci' || el.type === 'fibExtension') && pts.length >= 2) {
      const minY = Math.min(pts[0].y, pts[1].y) - 10;
      const maxY = Math.max(pts[0].y, pts[1].y) + 10;
      const minX = Math.min(pts[0].x, pts[1].x) - 10;
      if (clickY >= minY && clickY <= maxY && clickX >= minX) {
        return el;
      }
    }

    // 9. Circle & Ellipse
    if (el.type === 'circle' && pts.length >= 2) {
      const radius = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const dist = Math.hypot(clickX - pts[0].x, clickY - pts[0].y);
      if (dist <= radius + 10) return el;
    }
    if (el.type === 'ellipse' && pts.length >= 2) {
      const rx = Math.abs(pts[1].x - pts[0].x);
      const ry = Math.abs(pts[1].y - pts[0].y);
      if (rx > 0 && ry > 0) {
        const norm = Math.pow((clickX - pts[0].x) / rx, 2) + Math.pow((clickY - pts[0].y) / ry, 2);
        if (norm <= 1.25) return el;
      }
    }

    // 10. Text, Callout, Price Label, Arrows
    const textOrLabelTypes = ['text', 'anchoredText', 'callout', 'priceLabel', 'arrowUp', 'arrowDown'];
    if (textOrLabelTypes.includes(el.type) && pts.length >= 1) {
      if (Math.hypot(clickX - pts[0].x, clickY - pts[0].y) < 28) {
        return el;
      }
    }
  }
  return null;
}
