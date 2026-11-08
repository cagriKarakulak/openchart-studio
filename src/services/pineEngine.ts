import { CandleData } from '../types';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateWMA, 
  calculateRSI, 
  calculateMACD, 
  calculateBollingerBands, 
  calculateSupertrend, 
  calculateATR,
  calculateVWAP,
  calculateHMA,
  calculateDEMA,
  calculateTEMA,
  calculateVWMA,
  calculateSMMA,
  calculateStandardDeviation,
  sanitizeCandles
} from '../indicators/math';
import { extractPineInputs, PineInputDef } from './pineInputs';

export interface PinePlotOutput {
  id: string;
  title: string;
  color: string;
  lineWidth: number;
  values: { time: number; value: number }[];
  style?: string; // line, circles, linebr, shape
  isShape?: boolean;
}

export interface PineHlineOutput {
  id: string;
  price: number;
  title: string;
  color: string;
  lineWidth: number;
  lineStyle?: number; // 0: solid, 1: dotted, 2: dashed
}

export interface PineFillOutput {
  id: string;
  plot1Id: string;
  plot2Id: string;
  color: string;
  title?: string;
}

export interface PineExecutionResult {
  success: boolean;
  title: string;
  isOverlay: boolean;
  plots: PinePlotOutput[];
  hlines: PineHlineOutput[];
  fills?: PineFillOutput[];
  inputs: PineInputDef[];
  logs: string[];
  error?: string;
  errorLine?: number;
}

const COLOR_MAP: Record<string, string> = {
  'color.blue': '#2962ff',
  'color.green': '#089981',
  'color.red': '#f23645',
  'color.orange': '#ff9800',
  'color.purple': '#ab47bc',
  'color.yellow': '#ffd600',
  'color.white': '#ffffff',
  'color.teal': '#00b0ff',
  'color.maroon': '#880e4f',
  'color.gray': '#787b86',
  'color.silver': '#b2b5be',
  'color.lime': '#00e676',
  'color.aqua': '#00e5ff',
  'color.fuchsia': '#e040fb',
  'color.black': '#131722',
};

/**
 * Extracts and normalizes color expressions e.g. color.new(color.orange, 0), color.lime, #ff9800
 */
export function resolveColorToken(token?: string, fallback: string = '#2962ff'): string {
  if (!token) return fallback;
  const trimmed = token.trim();

  // Handle color.new(color.orange, 0) or color.new(#ff9800, 50)
  const newMatch = trimmed.match(/color\.new\s*\(\s*([^,)]+)/i);
  if (newMatch) {
    return resolveColorToken(newMatch[1], fallback);
  }

  if (COLOR_MAP[trimmed]) return COLOR_MAP[trimmed];
  if (COLOR_MAP[trimmed.toLowerCase()]) return COLOR_MAP[trimmed.toLowerCase()];
  if (trimmed.startsWith('#') || trimmed.startsWith('rgb')) return trimmed;

  // Handle conditional ternary colors: cond ? color.green : color.red
  const ternaryCol = trimmed.match(/^(.+?)\s*\?\s*([a-zA-Z0-9_#.]+)\s*:\s*([a-zA-Z0-9_#.]+)/);
  if (ternaryCol) {
    return resolveColorToken(ternaryCol[2], fallback);
  }

  return fallback;
}

/**
 * Robust Pine Script v5 / v4 Bar-by-Bar Quantitative Execution Engine
 * - Evaluates scripts across the candle series
 * - Supports inputs, multi-MA dispatchers, rolling statistics (stdev, highest, lowest), ATR, strategy orders, cooldowns
 * - Handles custom user inputs with live override capability
 */
export function executePineScript(
  code: string, 
  rawCandles: CandleData[],
  inputOverrides?: Record<string, any>
): PineExecutionResult {
  const candles = sanitizeCandles(rawCandles);
  const logs: string[] = [];
  const parsedInputs = extractPineInputs(code);

  if (!candles || candles.length === 0) {
    return {
      success: false,
      title: 'Pine Script',
      isOverlay: true,
      plots: [],
      hlines: [],
      inputs: parsedInputs,
      logs: ['Veri yok: Grafik mum verisi boş.'],
      error: 'Hesaplanacak mum verisi bulunamadı.',
    };
  }

  if (!code || !code.trim()) {
    return {
      success: false,
      title: 'Boş Script',
      isOverlay: true,
      plots: [],
      hlines: [],
      inputs: parsedInputs,
      logs: ['Kod boş.'],
      error: 'Pine Script kodu boş.',
    };
  }

  const N = candles.length;
  let title = 'Pine Script';
  let isOverlay = true;

  // Primary Series Store (variableName -> array of numbers length N)
  const seriesMap = new Map<string, number[]>();
  const setSeries = (k: string, arr: number[]) => {
    seriesMap.set(k, arr);
    seriesMap.set(k.toLowerCase(), arr);
  };
  const getSeries = (k: string): number[] | undefined => {
    return seriesMap.get(k) || seriesMap.get(k.toLowerCase());
  };

  // Scalar Store (variableName -> single number / boolean / string)
  const scalarMap = new Map<string, any>();
  const setScalar = (k: string, v: any) => {
    scalarMap.set(k, v);
    scalarMap.set(k.toLowerCase(), v);
  };
  const getScalar = (k: string): any => {
    return scalarMap.get(k) ?? scalarMap.get(k.toLowerCase());
  };

  // Apply parsed inputs and input overrides
  parsedInputs.forEach(inp => {
    const val = (inputOverrides && inputOverrides[inp.id] !== undefined)
      ? inputOverrides[inp.id]
      : inp.defval;
    setScalar(inp.id, val);
  });

  // Initialize built-in price series
  const openArr = candles.map(c => c.open);
  const highArr = candles.map(c => c.high);
  const lowArr = candles.map(c => c.low);
  const closeArr = candles.map(c => c.close);
  const volumeArr = candles.map(c => c.volume);
  const timeArr = candles.map(c => c.time);
  const hl2Arr = candles.map(c => (c.high + c.low) / 2);
  const hlc3Arr = candles.map(c => (c.high + c.low + c.close) / 3);
  const ohlc4Arr = candles.map(c => (c.open + c.high + c.low + c.close) / 4);
  const barIndexArr = candles.map((_, i) => i);

  // True Range built-in series
  const trArr = new Array(N);
  trArr[0] = highArr[0] - lowArr[0];
  for (let i = 1; i < N; i++) {
    const hl = highArr[i] - lowArr[i];
    const hc = Math.abs(highArr[i] - closeArr[i - 1]);
    const lc = Math.abs(lowArr[i] - closeArr[i - 1]);
    trArr[i] = Math.max(hl, hc, lc);
  }

  setSeries('open', openArr);
  setSeries('high', highArr);
  setSeries('low', lowArr);
  setSeries('close', closeArr);
  setSeries('volume', volumeArr);
  setSeries('time', timeArr);
  setSeries('hl2', hl2Arr);
  setSeries('hlc3', hlc3Arr);
  setSeries('ohlc4', ohlc4Arr);
  setSeries('tr', trArr);
  setSeries('bar_index', barIndexArr);

  // Constants & built-in variables
  setScalar('true', true);
  setScalar('false', false);
  setScalar('na', NaN);
  setScalar('syminfo.pointvalue', 1.0);

  const plots: PinePlotOutput[] = [];
  const hlines: PineHlineOutput[] = [];
  const plotVarIds = new Map<string, string>(); // plot variable name e.g. "p1" -> plot.id

  const lines = code.split('\n');

  // Strategy simulation state across bars
  let positionSize = 0;
  let activeSL = NaN;
  let lastSlBar = -9999;
  let lastShortTPBar = -9999;
  let lastLongTPBar = -9999;
  let closedTrades = 0;
  let equity = 10000;

  const resolveNumber = (expr: string, fallback: number = 0): number => {
    const trimmed = expr.trim();
    const sc = getScalar(trimmed);
    if (typeof sc === 'number') return sc;
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? fallback : parsed;
  };

  try {
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      let rawLine = lines[lineIdx].trim();
      if (!rawLine || rawLine.startsWith('//')) continue;

      // Strip inline comments: plot(close) // comment
      const commentIdx = rawLine.indexOf('//');
      if (commentIdx !== -1) {
        rawLine = rawLine.substring(0, commentIdx).trim();
      }

      // 1. Script declaration: indicator(...) or strategy(...)
      const indMatch = rawLine.match(/(?:indicator|strategy)\s*\(\s*(?:(?:title|shorttitle)\s*=\s*)?["']([^"']+)["']/i);
      if (indMatch) {
        title = indMatch[1];
        const overlayM = rawLine.match(/overlay\s*=\s*(true|false)/i);
        if (overlayM) {
          isOverlay = overlayM[1].toLowerCase() === 'true';
        }
        logs.push(`Başlık: "${title}" (Overlay: ${isOverlay ? 'Açık / Grafik Üzeri' : 'Kapalı / Alt Panel'})`);
        continue;
      }

      // 2. hline(level, title, color, linestyle)
      const hlineMatch = rawLine.match(/^hline\s*\(\s*([0-9.-]+)(?:,\s*(.*))?\)/i);
      if (hlineMatch) {
        const price = parseFloat(hlineMatch[1]);
        const rest = hlineMatch[2] || '';
        const titleMatch = rest.match(/["']([^"']+)["']/);
        const colMatch = rest.match(/color\s*=\s*([a-zA-Z0-9_#.]+)/i);

        hlines.push({
          id: `hline_${lineIdx}_${Date.now()}`,
          price,
          title: titleMatch ? titleMatch[1] : `${price}`,
          color: resolveColorToken(colMatch ? colMatch[1] : undefined, '#787b86'),
          lineWidth: 1,
          lineStyle: 2, // dashed
        });
        continue;
      }

      // 3. plot(...) or p1 = plot(...) or plotshape(...) call:
      const plotMatch = rawLine.match(/^(?:([a-zA-Z0-9_]+)\s*=\s*)?plot(shape|char)?\s*\(\s*(.+)\s*\)$/i);
      if (plotMatch) {
        const plotVarName = plotMatch[1]?.trim();
        const isShape = !!plotMatch[2];
        const inside = plotMatch[3];
        const plotConfig = parsePlotArguments(inside);

        let series = getSeries(plotConfig.expr);
        if (!series) {
          // If expression was directly embedded or is a technical function call, evaluate it!
          series = evaluateExpressionOrFunction(plotConfig.expr, seriesMap, scalarMap, candles);
        }

        if (series) {
          // Monotonically ordered, unique timestamps with zero division / NaN / Inf protection
          const cleanValues: { time: number; value: number }[] = [];
          let lastTime = -Infinity;

          for (let i = 0; i < N; i++) {
            const t = candles[i].time;
            const v = series[i];
            if (t > lastTime && !isNaN(v) && isFinite(v)) {
              if (isShape) {
                // If plotshape, only include points where condition is true (> 0)
                if (v > 0) {
                  cleanValues.push({ time: t, value: closeArr[i] });
                  lastTime = t;
                }
              } else {
                cleanValues.push({ time: t, value: v });
                lastTime = t;
              }
            }
          }

          if (cleanValues.length > 0) {
            const plotId = `plot_${plots.length}_${Date.now()}`;
            plots.push({
              id: plotId,
              title: plotConfig.title || (plotConfig.expr.length < 24 ? plotConfig.expr : `Plot ${plots.length + 1}`),
              color: resolveColorToken(plotConfig.color, plots.length % 2 === 0 ? '#2962ff' : '#ff9800'),
              lineWidth: plotConfig.lineWidth || 2,
              values: cleanValues,
              isShape,
            });
            if (plotVarName) {
              plotVarIds.set(plotVarName, plotId);
              setSeries(plotVarName, series);
            }
            logs.push(`✓ Çizim Eklendi: "${plots[plots.length - 1].title}" (${plots[plots.length - 1].color})`);
          }
        }
        continue;
      }

      // Clean line from variable qualifiers:
      let cleaned = rawLine.replace(/^(?:var(?:ip)?\s+)?(?:float|int|bool|color|string)\s+/i, '');
      cleaned = cleaned.replace(/([a-zA-Z0-9_]+)\s*:=/, '$1 =');

      // 4. Input variable declaration: len = input.int(20, ...)
      const inputDeclMatch = cleaned.match(/^([a-zA-Z0-9_]+)\s*=\s*input(?:\.[a-zA-Z]+)?\s*\(/);
      if (inputDeclMatch) {
        const varName = inputDeclMatch[1];
        // If not already set by inputOverrides, resolve default value
        if (inputOverrides && inputOverrides[varName] !== undefined) {
          setScalar(varName, inputOverrides[varName]);
        } else {
          const inp = parsedInputs.find(i => i.id === varName);
          if (inp) setScalar(varName, inp.defval);
        }
        continue;
      }

      // 5. Simple scalar assignment: len = 14 or ratio = 1.618 or flag = true
      const scalarMatch = cleaned.match(/^([a-zA-Z0-9_]+)\s*=\s*([0-9.-]+|true|false)\s*$/i);
      if (scalarMatch) {
        const varName = scalarMatch[1];
        const rawVal = scalarMatch[2].toLowerCase();
        const val = rawVal === 'true' ? true : rawVal === 'false' ? false : parseFloat(rawVal);
        setScalar(varName, val);
        continue;
      }

      // 6. User-defined function call or multi-MA dispatcher: middle = f_ma(bbSource, bbLength, maType)
      const fmaMatch = cleaned.match(/^([a-zA-Z0-9_]+)\s*=\s*f_ma\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/i);
      if (fmaMatch) {
        const varName = fmaMatch[1];
        const srcKey = fmaMatch[2].trim().toLowerCase();
        const len = resolveNumber(fmaMatch[3], 20);
        const type = String(getScalar(fmaMatch[4].trim()) || 'SMA').toUpperCase();

        const sourceData = getSeries(srcKey) || closeArr;
        const synthCandles = candles.map((c, i) => ({ ...c, close: sourceData[i] ?? c.close }));

        let pts: { time: number; value: number }[];
        if (type.includes('EMA')) pts = calculateEMA(synthCandles, len);
        else if (type.includes('WMA')) pts = calculateWMA(synthCandles, len);
        else if (type.includes('HMA')) pts = calculateHMA(synthCandles, len);
        else if (type.includes('VWMA')) pts = calculateVWMA(synthCandles, len);
        else if (type.includes('RMA') || type.includes('SMMA')) pts = calculateSMMA(synthCandles, len);
        else pts = calculateSMA(synthCandles, len);

        const aligned = alignPointsToSeries(pts, candles);
        setSeries(varName, aligned);
        logs.push(`Hesaplandı: ${varName} = f_ma(${srcKey}, ${len}, "${type}")`);
        continue;
      }

      // 7. Multi-output technical function: [middle, upper, lower] = ta.bb(...)
      const multiMatch = cleaned.match(/^\[([a-zA-Z0-9_,\s]+)\]\s*=\s*(.+)$/);
      if (multiMatch) {
        const varNames = multiMatch[1].split(',').map(s => s.trim());
        const funcCall = multiMatch[2].trim();

        // Bollinger Bands: [middle, upper, lower] = ta.bb(close, 20, 2)
        const bbM = funcCall.match(/^(?:ta\.)?bb\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/i);
        if (bbM) {
          const period = resolveNumber(bbM[2], 20);
          const mult = resolveNumber(bbM[3], 2);
          const bbPts = calculateBollingerBands(candles, period, mult);
          const midSeries = new Array(N).fill(0);
          const upSeries = new Array(N).fill(0);
          const lowSeries = new Array(N).fill(0);
          const timeIdx = new Map(candles.map((c, i) => [c.time, i]));
          bbPts.forEach(p => {
            const idx = timeIdx.get(p.time);
            if (idx !== undefined) {
              midSeries[idx] = p.middle;
              upSeries[idx] = p.upper;
              lowSeries[idx] = p.lower;
            }
          });
          if (varNames[0]) setSeries(varNames[0], midSeries);
          if (varNames[1]) setSeries(varNames[1], upSeries);
          if (varNames[2]) setSeries(varNames[2], lowSeries);
          logs.push(`Hesaplandı: Bollinger Bantları (${period}, ${mult})`);
          continue;
        }

        // MACD: [macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)
        const macdM = funcCall.match(/^(?:ta\.)?macd\s*\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/i);
        if (macdM) {
          const fast = resolveNumber(macdM[2], 12);
          const slow = resolveNumber(macdM[3], 26);
          const signal = resolveNumber(macdM[4], 9);
          const macdPts = calculateMACD(candles, fast, slow, signal);
          const macdSeries = new Array(N).fill(0);
          const sigSeries = new Array(N).fill(0);
          const histSeries = new Array(N).fill(0);
          const timeIdx = new Map(candles.map((c, i) => [c.time, i]));
          macdPts.forEach(p => {
            const idx = timeIdx.get(p.time);
            if (idx !== undefined) {
              macdSeries[idx] = p.macd ?? 0;
              sigSeries[idx] = p.signal ?? 0;
              histSeries[idx] = p.histogram ?? 0;
            }
          });
          if (varNames[0]) setSeries(varNames[0], macdSeries);
          if (varNames[1]) setSeries(varNames[1], sigSeries);
          if (varNames[2]) setSeries(varNames[2], histSeries);
          logs.push(`Hesaplandı: MACD (${fast}, ${slow}, ${signal})`);
          continue;
        }
      }

      // 8. Single variable assignment: varName = expression
      const assignMatch = cleaned.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
      if (assignMatch) {
        const varName = assignMatch[1].trim();
        const expr = assignMatch[2].trim();

        // Check if expr is a technical function call
        const funcRes = evaluateTechnicalFunction(expr, seriesMap, scalarMap, candles);
        if (funcRes) {
          setSeries(varName, funcRes.series);
          logs.push(`Hesaplandı: ${varName} = ${funcRes.description}`);
          continue;
        }

        // Check generic arithmetic / ternary / logical expression
        const exprRes = evaluateSeriesExpression(expr, seriesMap, scalarMap, candles);
        if (exprRes) {
          setSeries(varName, exprRes);
          continue;
        }
      }
    }

    // Execute bar-by-bar strategy state machine (entry, exit, stop, limit, cooldown)
    const longCondSeries = getSeries('longCondition') || getSeries('longEntryCondition');
    const shortCondSeries = getSeries('shortCondition') || getSeries('shortEntryCondition');
    const middleSeries = getSeries('middle') || getSeries('center');
    const activeSlSeries = new Array(N).fill(NaN);

    if (longCondSeries || shortCondSeries) {
      for (let i = 0; i < N; i++) {
        const curClose = closeArr[i];
        const curLow = lowArr[i];
        const curHigh = highArr[i];

        // Check active long exit
        if (positionSize > 0) {
          if (!isNaN(activeSL) && curLow <= activeSL) {
            // Stop loss hit
            positionSize = 0;
            activeSL = NaN;
            lastSlBar = i;
            closedTrades++;
          } else if (middleSeries && curHigh >= middleSeries[i]) {
            // Target / middle band reached
            positionSize = 0;
            activeSL = NaN;
            closedTrades++;
          }
        }
        // Check active short exit
        else if (positionSize < 0) {
          if (!isNaN(activeSL) && curHigh >= activeSL) {
            // Stop loss hit
            positionSize = 0;
            activeSL = NaN;
            lastSlBar = i;
            closedTrades++;
          } else if (middleSeries && curLow <= middleSeries[i]) {
            // Target / middle band reached
            positionSize = 0;
            activeSL = NaN;
            closedTrades++;
          }
        }

        // Check entries
        if (positionSize === 0) {
          if (longCondSeries && longCondSeries[i] > 0) {
            positionSize = 1;
            activeSL = curLow;
          } else if (shortCondSeries && shortCondSeries[i] > 0) {
            positionSize = -1;
            activeSL = curHigh;
          }
        }

        activeSlSeries[i] = positionSize !== 0 ? activeSL : NaN;
      }
      setSeries('activeSL', activeSlSeries);
    }

    // Fallback: If no explicit plot() was declared, plot the last computed user indicator
    if (plots.length === 0) {
      const builtIns = new Set(['open', 'high', 'low', 'close', 'volume', 'time', 'hl2', 'hlc3', 'ohlc4', 'tr', 'bar_index', 'activesl']);
      const customKeys = Array.from(seriesMap.keys()).filter(k => !builtIns.has(k.toLowerCase()) && !k.endsWith('_lower'));
      
      if (customKeys.length > 0) {
        const lastKey = customKeys[customKeys.length - 1];
        const series = getSeries(lastKey)!;
        const cleanValues = candles.map((c, i) => ({
          time: c.time,
          value: series[i],
        })).filter(p => !isNaN(p.value) && isFinite(p.value));

        plots.push({
          id: `plot_auto_${Date.now()}`,
          title: lastKey,
          color: '#2962ff',
          lineWidth: 2,
          values: cleanValues,
        });
        logs.push(`✓ Otomatik Çizim: "${lastKey}" serisi grafiğe eklendi.`);
      } else {
        // Fallback: Plot close price
        plots.push({
          id: `plot_close_${Date.now()}`,
          title: `${title} (Kapanış)`,
          color: '#2962ff',
          lineWidth: 2,
          values: candles.map(c => ({ time: c.time, value: c.close })),
        });
        logs.push(`✓ Çizim: Kapanış fiyat serisi uygulandı.`);
      }
    }

    return {
      success: true,
      title,
      isOverlay,
      plots,
      hlines,
      inputs: parsedInputs,
      logs,
    };
  } catch (err: any) {
    return {
      success: false,
      title,
      isOverlay,
      plots: [],
      hlines: [],
      inputs: parsedInputs,
      logs,
      error: err?.message || 'Bilinmeyen derleme hatası',
    };
  }
}

/**
 * Align indicator points with time timestamps to candle indices [0..N-1]
 */
function alignPointsToSeries(points: { time: number; value: number }[], candles: CandleData[]): number[] {
  const result: number[] = new Array(candles.length).fill(0);
  const timeIdx = new Map(candles.map((c, i) => [c.time, i]));

  for (const p of points) {
    const idx = timeIdx.get(p.time);
    if (idx !== undefined && !isNaN(p.value) && isFinite(p.value)) {
      result[idx] = p.value;
    }
  }

  // Backfill initial warmup
  let firstValid = 0;
  for (let i = 0; i < result.length; i++) {
    if (result[i] !== 0) {
      firstValid = result[i];
      break;
    }
  }
  if (firstValid !== 0) {
    for (let i = 0; i < result.length; i++) {
      if (result[i] === 0) result[i] = firstValid;
      else break;
    }
  }

  // Forward fill any gaps
  let lastValid = firstValid;
  for (let i = 0; i < result.length; i++) {
    if (result[i] !== 0) lastValid = result[i];
    else if (lastValid !== 0) result[i] = lastValid;
  }

  return result;
}

/**
 * Evaluates Pine technical functions:
 * ta.sma, ta.ema, ta.wma, ta.rsi, ta.atr, ta.vwap, ta.highest, ta.lowest, ta.stdev, ta.pivothigh, ta.pivotlow, etc.
 */
function evaluateTechnicalFunction(
  expr: string,
  seriesMap: Map<string, number[]>,
  scalarMap: Map<string, any>,
  candles: CandleData[]
): { series: number[]; description: string } | null {
  const trimmed = expr.trim();
  const N = candles.length;
  const closeArr = candles.map(c => c.close);
  const highArr = candles.map(c => c.high);
  const lowArr = candles.map(c => c.low);

  const resolveNum = (token: string, fallback: number = 14): number => {
    const t = token.trim();
    if (scalarMap.has(t)) {
      const v = scalarMap.get(t);
      if (typeof v === 'number') return v;
    }
    const p = parseFloat(t);
    return isNaN(p) ? fallback : p;
  };

  const getSer = (token: string): number[] => {
    const t = token.trim().toLowerCase();
    return seriesMap.get(t) || closeArr;
  };

  // Standard Deviation: ta.stdev(source, length)
  const stdevM = trimmed.match(/^(?:ta\.)?stdev\s*\(\s*([^,]+),\s*([^)]+)\)/i);
  if (stdevM) {
    const srcKey = stdevM[1].trim();
    const period = resolveNum(stdevM[2], 20);
    const sourceData = getSer(srcKey);
    const synthCandles = candles.map((c, i) => ({ ...c, close: sourceData[i] ?? c.close }));
    const pts = calculateStandardDeviation(synthCandles, period);
    return { series: alignPointsToSeries(pts, candles), description: `Stdev(${srcKey}, ${period})` };
  }

  // Highest: ta.highest(source, length) or ta.highest(length)
  const highM = trimmed.match(/^(?:ta\.)?highest\s*\(\s*(?:([a-zA-Z0-9_.]+)\s*,\s*)?([0-9a-zA-Z_]+)\s*\)/i);
  if (highM) {
    const srcKey = highM[1] ? highM[1] : 'high';
    const len = resolveNum(highM[2], 14);
    const source = getSer(srcKey);
    const res = new Array(N);
    for (let i = 0; i < N; i++) {
      let maxVal = -Infinity;
      const start = Math.max(0, i - len + 1);
      for (let k = start; k <= i; k++) {
        if (source[k] > maxVal) maxVal = source[k];
      }
      res[i] = maxVal === -Infinity ? source[i] : maxVal;
    }
    return { series: res, description: `Highest(${srcKey}, ${len})` };
  }

  // Lowest: ta.lowest(source, length) or ta.lowest(length)
  const lowM = trimmed.match(/^(?:ta\.)?lowest\s*\(\s*(?:([a-zA-Z0-9_.]+)\s*,\s*)?([0-9a-zA-Z_]+)\s*\)/i);
  if (lowM) {
    const srcKey = lowM[1] ? lowM[1] : 'low';
    const len = resolveNum(lowM[2], 14);
    const source = getSer(srcKey);
    const res = new Array(N);
    for (let i = 0; i < N; i++) {
      let minVal = Infinity;
      const start = Math.max(0, i - len + 1);
      for (let k = start; k <= i; k++) {
        if (source[k] < minVal) minVal = source[k];
      }
      res[i] = minVal === Infinity ? source[i] : minVal;
    }
    return { series: res, description: `Lowest(${srcKey}, ${len})` };
  }

  // ATR: ta.atr(14)
  const atrM = trimmed.match(/^(?:ta\.)?atr\s*\(\s*([^)]+)\)/i);
  if (atrM) {
    const period = resolveNum(atrM[1], 14);
    const pts = calculateATR(candles, period);
    return { series: alignPointsToSeries(pts, candles), description: `ATR(${period})` };
  }

  // EMA: ta.ema(close, 20)
  const emaM = trimmed.match(/^(?:ta\.)?ema\s*\(\s*([a-zA-Z0-9_.]+)\s*,\s*([^)]+)\)/i);
  if (emaM) {
    const srcKey = emaM[1];
    const period = resolveNum(emaM[2], 20);
    const sourceData = getSer(srcKey);
    const synthCandles = candles.map((c, i) => ({ ...c, close: sourceData[i] ?? c.close }));
    const pts = calculateEMA(synthCandles, period);
    return { series: alignPointsToSeries(pts, candles), description: `EMA(${srcKey}, ${period})` };
  }

  // SMA: ta.sma(close, 20)
  const smaM = trimmed.match(/^(?:ta\.)?sma\s*\(\s*([a-zA-Z0-9_.]+)\s*,\s*([^)]+)\)/i);
  if (smaM) {
    const srcKey = smaM[1];
    const period = resolveNum(smaM[2], 20);
    const sourceData = getSer(srcKey);
    const synthCandles = candles.map((c, i) => ({ ...c, close: sourceData[i] ?? c.close }));
    const pts = calculateSMA(synthCandles, period);
    return { series: alignPointsToSeries(pts, candles), description: `SMA(${srcKey}, ${period})` };
  }

  // WMA: ta.wma(close, 20)
  const wmaM = trimmed.match(/^(?:ta\.)?wma\s*\(\s*([a-zA-Z0-9_.]+)\s*,\s*([^)]+)\)/i);
  if (wmaM) {
    const srcKey = wmaM[1];
    const period = resolveNum(wmaM[2], 20);
    const sourceData = getSer(srcKey);
    const synthCandles = candles.map((c, i) => ({ ...c, close: sourceData[i] ?? c.close }));
    const pts = calculateWMA(synthCandles, period);
    return { series: alignPointsToSeries(pts, candles), description: `WMA(${srcKey}, ${period})` };
  }

  // RSI: ta.rsi(close, 14)
  const rsiM = trimmed.match(/^(?:ta\.)?rsi\s*\(\s*([^,]+)\s*(?:,\s*([^)]+))?\)/i);
  if (rsiM) {
    const period = rsiM[2] ? resolveNum(rsiM[2], 14) : resolveNum(rsiM[1], 14);
    const pts = calculateRSI(candles, period);
    return { series: alignPointsToSeries(pts, candles), description: `RSI(${period})` };
  }

  // Pivot High: ta.pivothigh(high, left, right)
  const phM = trimmed.match(/^(?:ta\.)?pivothigh\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/i);
  if (phM) {
    const src = getSer(phM[1]);
    const left = resolveNum(phM[2], 3);
    const right = resolveNum(phM[3], 3);
    const res = new Array(N).fill(NaN);
    for (let i = left + right; i < N; i++) {
      const targetIdx = i - right;
      const targetVal = src[targetIdx];
      let isPivot = true;
      for (let k = targetIdx - left; k <= targetIdx + right; k++) {
        if (k !== targetIdx && src[k] >= targetVal) {
          isPivot = false;
          break;
        }
      }
      if (isPivot) res[targetIdx] = targetVal;
    }
    return { series: res, description: `PivotHigh(${left}, ${right})` };
  }

  // Pivot Low: ta.pivotlow(low, left, right)
  const plM = trimmed.match(/^(?:ta\.)?pivotlow\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/i);
  if (plM) {
    const src = getSer(plM[1]);
    const left = resolveNum(plM[2], 3);
    const right = resolveNum(plM[3], 3);
    const res = new Array(N).fill(NaN);
    for (let i = left + right; i < N; i++) {
      const targetIdx = i - right;
      const targetVal = src[targetIdx];
      let isPivot = true;
      for (let k = targetIdx - left; k <= targetIdx + right; k++) {
        if (k !== targetIdx && src[k] <= targetVal) {
          isPivot = false;
          break;
        }
      }
      if (isPivot) res[targetIdx] = targetVal;
    }
    return { series: res, description: `PivotLow(${left}, ${right})` };
  }

  // Crossover: ta.crossover(A, B)
  const crossOverM = trimmed.match(/^(?:ta\.)?crossover\s*\(\s*([^,]+)\s*,\s*([^)]+)\)/i);
  if (crossOverM) {
    const a = evaluateExpressionOrFunction(crossOverM[1], seriesMap, scalarMap, candles);
    const b = evaluateExpressionOrFunction(crossOverM[2], seriesMap, scalarMap, candles);
    if (a && b) {
      const res = new Array(N).fill(0);
      for (let i = 1; i < N; i++) {
        res[i] = (a[i] > b[i] && a[i - 1] <= b[i - 1]) ? 1 : 0;
      }
      return { series: res, description: `Crossover(${crossOverM[1].trim()}, ${crossOverM[2].trim()})` };
    }
  }

  // Crossunder: ta.crossunder(A, B)
  const crossUnderM = trimmed.match(/^(?:ta\.)?crossunder\s*\(\s*([^,]+)\s*,\s*([^)]+)\)/i);
  if (crossUnderM) {
    const a = evaluateExpressionOrFunction(crossUnderM[1], seriesMap, scalarMap, candles);
    const b = evaluateExpressionOrFunction(crossUnderM[2], seriesMap, scalarMap, candles);
    if (a && b) {
      const res = new Array(N).fill(0);
      for (let i = 1; i < N; i++) {
        res[i] = (a[i] < b[i] && a[i - 1] >= b[i - 1]) ? 1 : 0;
      }
      return { series: res, description: `Crossunder(${crossUnderM[1].trim()}, ${crossUnderM[2].trim()})` };
    }
  }

  return null;
}

/**
 * Evaluates an expression or technical function call
 */
function evaluateExpressionOrFunction(
  expr: string,
  seriesMap: Map<string, number[]>,
  scalarMap: Map<string, any>,
  candles: CandleData[]
): number[] | null {
  const trimmed = expr.trim();
  // Check technical function first
  const func = evaluateTechnicalFunction(trimmed, seriesMap, scalarMap, candles);
  if (func) return func.series;

  // Otherwise evaluate series expression
  return evaluateSeriesExpression(trimmed, seriesMap, scalarMap, candles);
}

/**
 * Evaluate arithmetic, logical, ternary, parentheses and math expressions
 */
function evaluateSeriesExpression(
  expr: string, 
  seriesMap: Map<string, number[]>, 
  scalarMap: Map<string, any>, 
  candles: CandleData[]
): number[] | null {
  let trimmed = expr.trim();
  const N = candles.length;

  // Strip wrapping outer parentheses if balanced: ((h + l) / 2)
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    let depth = 0;
    let balanced = true;
    for (let i = 0; i < trimmed.length - 1; i++) {
      if (trimmed[i] === '(') depth++;
      else if (trimmed[i] === ')') depth--;
      if (depth === 0) {
        balanced = false;
        break;
      }
    }
    if (balanced) {
      trimmed = trimmed.slice(1, -1).trim();
    }
  }

  // Direct series lookup (case-insensitive)
  if (seriesMap.has(trimmed)) {
    return [...seriesMap.get(trimmed)!];
  }
  if (seriesMap.has(trimmed.toLowerCase())) {
    return [...seriesMap.get(trimmed.toLowerCase())!];
  }

  // math.max(A, B) or math.min(A, B)
  const mathMinMaxM = trimmed.match(/^(?:math\.)?(max|min)\s*\(\s*([^,]+),\s*([^)]+)\)/i);
  if (mathMinMaxM) {
    const isMax = mathMinMaxM[1].toLowerCase() === 'max';
    const a = evaluateExpressionOrFunction(mathMinMaxM[2], seriesMap, scalarMap, candles) || resolveScalarArray(mathMinMaxM[2], scalarMap, N);
    const b = evaluateExpressionOrFunction(mathMinMaxM[3], seriesMap, scalarMap, candles) || resolveScalarArray(mathMinMaxM[3], scalarMap, N);
    if (a && b) {
      const res = new Array(N);
      for (let i = 0; i < N; i++) {
        const valA = isNaN(a[i]) ? 0 : a[i];
        const valB = isNaN(b[i]) ? 0 : b[i];
        res[i] = isMax ? Math.max(valA, valB) : Math.min(valA, valB);
      }
      return res;
    }
  }

  // nz(x, fallback)
  const nzM = trimmed.match(/^nz\s*\(\s*([^,)]+)(?:,\s*([^)]+))?\)/i);
  if (nzM) {
    const valSeries = evaluateExpressionOrFunction(nzM[1], seriesMap, scalarMap, candles) || resolveScalarArray(nzM[1], scalarMap, N);
    const fallbackVal = nzM[2] ? parseFloat(nzM[2]) || 0 : 0;
    if (valSeries) {
      return valSeries.map(v => isNaN(v) || !isFinite(v) ? fallbackVal : v);
    }
  }

  // Historical index: close[1] or high[2]
  const histMatch = trimmed.match(/^([a-zA-Z0-9_]+)\[([0-9]+)\]$/);
  if (histMatch) {
    const srcKey = histMatch[1];
    const shift = parseInt(histMatch[2], 10);
    const base = seriesMap.get(srcKey) || seriesMap.get(srcKey.toLowerCase());
    if (base) {
      const shifted = new Array(N).fill(0);
      for (let i = 0; i < N; i++) {
        shifted[i] = i >= shift ? base[i - shift] : base[0];
      }
      return shifted;
    }
  }

  // Ternary condition: cond ? exprA : exprB
  // Search for ? outside of nested parentheses
  const questionIdx = findOperatorIndex(trimmed, '?');
  if (questionIdx !== -1) {
    const condExpr = trimmed.substring(0, questionIdx).trim();
    const rest = trimmed.substring(questionIdx + 1).trim();
    const colonIdx = findOperatorIndex(rest, ':');

    if (colonIdx !== -1) {
      const trueExpr = rest.substring(0, colonIdx).trim();
      const falseExpr = rest.substring(colonIdx + 1).trim();

      const trueSeries = evaluateExpressionOrFunction(trueExpr, seriesMap, scalarMap, candles) || resolveScalarArray(trueExpr, scalarMap, N);
      const falseSeries = evaluateExpressionOrFunction(falseExpr, seriesMap, scalarMap, candles) || resolveScalarArray(falseExpr, scalarMap, N);

      // Evaluate condition (can be boolean series or comparison)
      const condSeries = evaluateConditionSeries(condExpr, seriesMap, scalarMap, candles);

      if (condSeries && trueSeries && falseSeries) {
        const res = new Array(N);
        for (let i = 0; i < N; i++) {
          res[i] = condSeries[i] > 0 ? trueSeries[i] : falseSeries[i];
        }
        return res;
      }
    }
  }

  // Logical / Comparison conditions: A and B, A or B, A > B, A < B, etc.
  const condRes = evaluateConditionSeries(trimmed, seriesMap, scalarMap, candles);
  if (condRes) return condRes;

  // Binary arithmetic operations: +, -, *, /, % (evaluated outside parentheses)
  for (const op of ['+', '-', '*', '/', '%']) {
    const opIdx = findLastOperatorIndex(trimmed, op);
    if (opIdx > 0 && opIdx < trimmed.length - 1) {
      const leftExpr = trimmed.substring(0, opIdx).trim();
      const rightExpr = trimmed.substring(opIdx + 1).trim();

      const left = evaluateExpressionOrFunction(leftExpr, seriesMap, scalarMap, candles) || resolveScalarArray(leftExpr, scalarMap, N);
      const right = evaluateExpressionOrFunction(rightExpr, seriesMap, scalarMap, candles) || resolveScalarArray(rightExpr, scalarMap, N);

      if (left && right) {
        const res = new Array(N);
        for (let i = 0; i < N; i++) {
          const l = isNaN(left[i]) ? 0 : left[i];
          const r = isNaN(right[i]) ? 0 : right[i];
          if (op === '+') res[i] = l + r;
          else if (op === '-') res[i] = l - r;
          else if (op === '*') res[i] = l * r;
          else if (op === '/') res[i] = r !== 0 ? l / r : 0;
          else if (op === '%') res[i] = r !== 0 ? l % r : 0;
          else res[i] = 0;
        }
        return res;
      }
    }
  }

  return null;
}

/**
 * Finds index of an operator character outside of parentheses and quotes
 */
function findOperatorIndex(str: string, target: string): number {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (depth === 0 && ch === target) return i;
  }
  return -1;
}

function findLastOperatorIndex(str: string, target: string): number {
  let depth = 0;
  let last = -1;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (depth === 0 && ch === target) last = i;
  }
  return last;
}

/**
 * Evaluates conditions containing 'and', 'or', 'not', '>', '<', '>=', '<=', '==', '!='
 */
function evaluateConditionSeries(
  expr: string,
  seriesMap: Map<string, number[]>,
  scalarMap: Map<string, any>,
  candles: CandleData[]
): number[] | null {
  const trimmed = expr.trim();
  const N = candles.length;

  // Compound 'and' e.g. low < lower[1] and close > lower[1]
  const andM = trimmed.match(/^(.+?)\s+(?:and|&&)\s+(.+)$/i);
  if (andM) {
    const left = evaluateConditionSeries(andM[1], seriesMap, scalarMap, candles);
    const right = evaluateConditionSeries(andM[2], seriesMap, scalarMap, candles);
    if (left && right) {
      return left.map((l, i) => (l > 0 && right[i] > 0 ? 1 : 0));
    }
  }

  // Compound 'or'
  const orM = trimmed.match(/^(.+?)\s+(?:or|\|\|)\s+(.+)$/i);
  if (orM) {
    const left = evaluateConditionSeries(orM[1], seriesMap, scalarMap, candles);
    const right = evaluateConditionSeries(orM[2], seriesMap, scalarMap, candles);
    if (left && right) {
      return left.map((l, i) => (l > 0 || right[i] > 0 ? 1 : 0));
    }
  }

  // 'not' e.g. not inCooldown
  const notM = trimmed.match(/^(?:not|!)\s*(.+)$/i);
  if (notM) {
    const sub = evaluateConditionSeries(notM[1], seriesMap, scalarMap, candles) || resolveScalarArray(notM[1], scalarMap, N);
    if (sub) {
      return sub.map(v => (v > 0 ? 0 : 1));
    }
  }

  // Comparison: A > B, A < B, A >= B, A <= B, A == B, A != B
  const cmpMatch = trimmed.match(/^(.+?)\s*(>|<|>=|<=|==|!=)\s*(.+)$/);
  if (cmpMatch) {
    const left = evaluateExpressionOrFunction(cmpMatch[1].trim(), seriesMap, scalarMap, candles) || resolveScalarArray(cmpMatch[1].trim(), scalarMap, N);
    const right = evaluateExpressionOrFunction(cmpMatch[3].trim(), seriesMap, scalarMap, candles) || resolveScalarArray(cmpMatch[3].trim(), scalarMap, N);
    const cmpOp = cmpMatch[2];

    if (left && right) {
      const res = new Array(N);
      for (let i = 0; i < N; i++) {
        let cond = false;
        if (cmpOp === '>') cond = left[i] > right[i];
        else if (cmpOp === '<') cond = left[i] < right[i];
        else if (cmpOp === '>=') cond = left[i] >= right[i];
        else if (cmpOp === '<=') cond = left[i] <= right[i];
        else if (cmpOp === '==') cond = left[i] === right[i];
        else if (cmpOp === '!=') cond = left[i] !== right[i];
        res[i] = cond ? 1 : 0;
      }
      return res;
    }
  }

  // Check if token itself is a boolean variable
  if (scalarMap.has(trimmed)) {
    const val = scalarMap.get(trimmed);
    if (typeof val === 'boolean') return new Array(N).fill(val ? 1 : 0);
  }

  return null;
}

/**
 * Helper: turn scalar into array of length N
 */
function resolveScalarArray(token: string, scalarMap: Map<string, any>, N: number): number[] | null {
  const trimmed = token.trim();
  if (scalarMap.has(trimmed)) {
    const val = scalarMap.get(trimmed);
    if (typeof val === 'number') return new Array(N).fill(val);
    if (typeof val === 'boolean') return new Array(N).fill(val ? 1 : 0);
  }
  if (scalarMap.has(trimmed.toLowerCase())) {
    const val = scalarMap.get(trimmed.toLowerCase());
    if (typeof val === 'number') return new Array(N).fill(val);
    if (typeof val === 'boolean') return new Array(N).fill(val ? 1 : 0);
  }
  const parsed = parseFloat(trimmed);
  if (!isNaN(parsed)) {
    return new Array(N).fill(parsed);
  }
  return null;
}

/**
 * Parser for plot(series, title="...", color=..., linewidth=...)
 */
function parsePlotArguments(inside: string): { expr: string; title?: string; color?: string; lineWidth?: number } {
  const parts: string[] = [];
  let depth = 0;
  let curr = '';

  for (let i = 0; i < inside.length; i++) {
    const ch = inside[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;

    if (ch === ',' && depth === 0) {
      parts.push(curr.trim());
      curr = '';
    } else {
      curr += ch;
    }
  }
  if (curr.trim()) parts.push(curr.trim());

  let expr = parts[0] || 'close';
  const seriesParamM = expr.match(/^series\s*=\s*(.+)$/i);
  if (seriesParamM) {
    expr = seriesParamM[1].trim();
  }

  let title: string | undefined;
  let color: string | undefined;
  let lineWidth: number = 2;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const colMatch = part.match(/color\s*=\s*(.+)/i);
    const titleMatch = part.match(/title\s*=\s*["']([^"']+)["']/i);
    const lwMatch = part.match(/linewidth\s*=\s*([0-9]+)/i);

    if (colMatch) {
      color = colMatch[1].trim();
    } else if (titleMatch) {
      title = titleMatch[1];
    } else if (lwMatch) {
      lineWidth = parseInt(lwMatch[1], 10);
    } else if (part.startsWith('"') || part.startsWith("'")) {
      title = part.slice(1, -1);
    }
  }

  return { expr, title, color, lineWidth };
}
