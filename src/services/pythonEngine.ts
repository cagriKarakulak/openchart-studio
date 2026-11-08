/**
 * pythonEngine.ts
 * High-Performance Vectorized Python Quant Script Engine
 * Replaces proprietary script formats with 100% open, Python-standard vectorized quantitative algorithmic execution.
 * 
 * Supports:
 * - Pandas-like DataFrame (df['close'], df['open'], df['high'], df['low'], df['volume'])
 * - Vectorized Series operations (.shift(), .diff(), .rolling(), .ewm(), .gt(), .lt(), .and(), .or())
 * - Technical Analysis (ta.sma, ta.ema, ta.wma, ta.rsi, ta.macd, ta.bollinger, ta.supertrend, ta.atr, ta.vwap)
 * - NumPy vectorized logic (np.where, np.maximum, np.minimum, np.abs)
 * - Sinyal & Çizim fonksiyonları (plot, hline, plot_shape, crossover, crossunder)
 * - Parametre girdi sistemi (param, input)
 */

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
  calculateVWAP 
} from '../indicators/math';

export interface PythonPlotOutput {
  id: string;
  title: string;
  color: string;
  lineWidth: number;
  values: { time: number; value: number }[];
  style?: string; // line, circles, shape
  isShape?: boolean;
}

export interface PythonHlineOutput {
  id: string;
  price: number;
  title: string;
  color: string;
  lineWidth: number;
  lineStyle?: number; // 0: solid, 1: dotted, 2: dashed
}

export interface PythonInputDef {
  id: string;
  title: string;
  type: 'int' | 'float' | 'bool' | 'string' | 'source';
  defval: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  group?: string;
  tooltip?: string;
}

export interface PythonExecutionResult {
  success: boolean;
  title: string;
  isOverlay: boolean;
  plots: PythonPlotOutput[];
  hlines: PythonHlineOutput[];
  inputs: PythonInputDef[];
  logs: string[];
  executionTimeMs: number;
  error?: string;
  errorLine?: number;
}

/**
 * High-Performance Vectorized Series (NumPy / Pandas Float64Array equivalent)
 */
export class PythonSeries {
  public values: Float64Array;

  constructor(vals: Float64Array | number[]) {
    if (vals instanceof Float64Array) {
      this.values = vals;
    } else {
      this.values = new Float64Array(vals);
    }
  }

  get length(): number {
    return this.values.length;
  }

  get(index: number): number {
    if (index < 0) index = this.values.length + index;
    return this.values[index] ?? NaN;
  }

  shift(periods = 1): PythonSeries {
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      res[i] = i >= periods ? this.values[i - periods] : NaN;
    }
    return new PythonSeries(res);
  }

  diff(periods = 1): PythonSeries {
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      res[i] = i >= periods ? this.values[i] - this.values[i - periods] : NaN;
    }
    return new PythonSeries(res);
  }

  rolling(window: number) {
    const vals = this.values;
    const len = vals.length;
    return {
      mean: (): PythonSeries => {
        const res = new Float64Array(len);
        let sum = 0;
        for (let i = 0; i < len; i++) {
          sum += vals[i];
          if (i >= window) sum -= vals[i - window];
          res[i] = i >= window - 1 ? sum / window : NaN;
        }
        return new PythonSeries(res);
      },
      std: (): PythonSeries => {
        const res = new Float64Array(len);
        for (let i = 0; i < len; i++) {
          if (i < window - 1) {
            res[i] = NaN;
            continue;
          }
          let m = 0;
          for (let j = i - window + 1; j <= i; j++) m += vals[j];
          m /= window;
          let variance = 0;
          for (let j = i - window + 1; j <= i; j++) variance += (vals[j] - m) ** 2;
          res[i] = Math.sqrt(variance / window);
        }
        return new PythonSeries(res);
      },
      max: (): PythonSeries => {
        const res = new Float64Array(len);
        for (let i = 0; i < len; i++) {
          if (i < window - 1) {
            res[i] = NaN;
            continue;
          }
          let maxVal = -Infinity;
          for (let j = i - window + 1; j <= i; j++) {
            if (vals[j] > maxVal) maxVal = vals[j];
          }
          res[i] = maxVal;
        }
        return new PythonSeries(res);
      },
      min: (): PythonSeries => {
        const res = new Float64Array(len);
        for (let i = 0; i < len; i++) {
          if (i < window - 1) {
            res[i] = NaN;
            continue;
          }
          let minVal = Infinity;
          for (let j = i - window + 1; j <= i; j++) {
            if (vals[j] < minVal) minVal = vals[j];
          }
          res[i] = minVal;
        }
        return new PythonSeries(res);
      },
      sum: (): PythonSeries => {
        const res = new Float64Array(len);
        let sum = 0;
        for (let i = 0; i < len; i++) {
          sum += vals[i];
          if (i >= window) sum -= vals[i - window];
          res[i] = i >= window - 1 ? sum : NaN;
        }
        return new PythonSeries(res);
      }
    };
  }

  ewm(opts: { span?: number } = { span: 14 }) {
    const span = opts.span || 14;
    const vals = this.values;
    const len = vals.length;
    const alpha = 2 / (span + 1);
    const res = new Float64Array(len);
    let prev = vals[0] || 0;
    res[0] = prev;
    for (let i = 1; i < len; i++) {
      const v = vals[i];
      prev = isNaN(v) ? prev : alpha * v + (1 - alpha) * prev;
      res[i] = prev;
    }
    return {
      mean: () => new PythonSeries(res)
    };
  }

  add(other: PythonSeries | number): PythonSeries {
    const isNum = typeof other === 'number';
    const oVals = isNum ? null : (other as PythonSeries).values;
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      res[i] = isNum ? this.values[i] + (other as number) : this.values[i] + (oVals ? oVals[i] : 0);
    }
    return new PythonSeries(res);
  }

  sub(other: PythonSeries | number): PythonSeries {
    const isNum = typeof other === 'number';
    const oVals = isNum ? null : (other as PythonSeries).values;
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      res[i] = isNum ? this.values[i] - (other as number) : this.values[i] - (oVals ? oVals[i] : 0);
    }
    return new PythonSeries(res);
  }

  mul(other: PythonSeries | number): PythonSeries {
    const isNum = typeof other === 'number';
    const oVals = isNum ? null : (other as PythonSeries).values;
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      res[i] = isNum ? this.values[i] * (other as number) : this.values[i] * (oVals ? oVals[i] : 1);
    }
    return new PythonSeries(res);
  }

  div(other: PythonSeries | number): PythonSeries {
    const isNum = typeof other === 'number';
    const oVals = isNum ? null : (other as PythonSeries).values;
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const denom = isNum ? (other as number) : (oVals ? oVals[i] : 1);
      res[i] = denom !== 0 && !isNaN(denom) ? this.values[i] / denom : NaN;
    }
    return new PythonSeries(res);
  }

  gt(other: PythonSeries | number): PythonSeries {
    const isNum = typeof other === 'number';
    const oVals = isNum ? null : (other as PythonSeries).values;
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const b = isNum ? (other as number) : (oVals ? oVals[i] : 0);
      res[i] = this.values[i] > b ? 1 : 0;
    }
    return new PythonSeries(res);
  }

  lt(other: PythonSeries | number): PythonSeries {
    const isNum = typeof other === 'number';
    const oVals = isNum ? null : (other as PythonSeries).values;
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const b = isNum ? (other as number) : (oVals ? oVals[i] : 0);
      res[i] = this.values[i] < b ? 1 : 0;
    }
    return new PythonSeries(res);
  }

  ge(other: PythonSeries | number): PythonSeries {
    const isNum = typeof other === 'number';
    const oVals = isNum ? null : (other as PythonSeries).values;
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const b = isNum ? (other as number) : (oVals ? oVals[i] : 0);
      res[i] = this.values[i] >= b ? 1 : 0;
    }
    return new PythonSeries(res);
  }

  le(other: PythonSeries | number): PythonSeries {
    const isNum = typeof other === 'number';
    const oVals = isNum ? null : (other as PythonSeries).values;
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const b = isNum ? (other as number) : (oVals ? oVals[i] : 0);
      res[i] = this.values[i] <= b ? 1 : 0;
    }
    return new PythonSeries(res);
  }

  and(other: PythonSeries): PythonSeries {
    const oVals = other.values;
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      res[i] = (this.values[i] && oVals[i]) ? 1 : 0;
    }
    return new PythonSeries(res);
  }

  or(other: PythonSeries): PythonSeries {
    const oVals = other.values;
    const len = this.values.length;
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      res[i] = (this.values[i] || oVals[i]) ? 1 : 0;
    }
    return new PythonSeries(res);
  }
}

/**
 * Vectorized crossover condition
 */
export function crossover(a: PythonSeries | number[], b: PythonSeries | number[]): PythonSeries {
  const aVals = a instanceof PythonSeries ? a.values : a;
  const bVals = b instanceof PythonSeries ? b.values : b;
  const len = aVals.length;
  const res = new Float64Array(len);
  res[0] = 0;
  for (let i = 1; i < len; i++) {
    res[i] = (aVals[i - 1] <= bVals[i - 1] && aVals[i] > bVals[i]) ? 1 : 0;
  }
  return new PythonSeries(res);
}

/**
 * Vectorized crossunder condition
 */
export function crossunder(a: PythonSeries | number[], b: PythonSeries | number[]): PythonSeries {
  const aVals = a instanceof PythonSeries ? a.values : a;
  const bVals = b instanceof PythonSeries ? b.values : b;
  const len = aVals.length;
  const res = new Float64Array(len);
  res[0] = 0;
  for (let i = 1; i < len; i++) {
    res[i] = (aVals[i - 1] >= bVals[i - 1] && aVals[i] < bVals[i]) ? 1 : 0;
  }
  return new PythonSeries(res);
}

/**
 * Extracts inputs declared via `param(...)` or `input(...)` in Python script
 */
export function extractPythonInputs(code: string): PythonInputDef[] {
  const inputs: PythonInputDef[] = [];
  const lines = code.split('\n');

  // Regex patterns for:
  // var = param("id", default=14, min=1, max=100, label="RSI")
  // var = param("id", 14, "RSI")
  // var = input(14, "RSI")
  const paramRegex = /(?:(\w+)\s*=\s*)?(?:param|input)\s*\(\s*(['"][^'"]+['"]|[^,)]+)(?:,\s*([^,)]+))?(?:,\s*(?:min\s*=\s*([0-9.-]+)|max\s*=\s*([0-9.-]+)|label\s*=\s*['"]([^'"]+)['"]|['"]([^'"]+)['"]))*/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    const matches = trimmed.matchAll(paramRegex);
    for (const match of matches) {
      const varName = match[1] || '';
      let rawArg1 = match[2]?.trim() || '';
      let rawArg2 = match[3]?.trim() || '';

      let id = varName;
      let defval: any = 14;
      let title = varName;

      if (rawArg1.startsWith('"') || rawArg1.startsWith("'")) {
        id = rawArg1.replace(/['"]/g, '');
        title = id;
        if (rawArg2) {
          defval = !isNaN(Number(rawArg2)) ? Number(rawArg2) : rawArg2 === 'True' ? true : rawArg2 === 'False' ? false : rawArg2.replace(/['"]/g, '');
        }
      } else {
        defval = !isNaN(Number(rawArg1)) ? Number(rawArg1) : rawArg1 === 'True' ? true : rawArg1 === 'False' ? false : rawArg1;
        if (rawArg2 && (rawArg2.startsWith('"') || rawArg2.startsWith("'"))) {
          title = rawArg2.replace(/['"]/g, '');
        }
      }

      if (!id) id = `param_${inputs.length + 1}`;
      if (!title) title = id;

      const type: 'int' | 'float' | 'bool' | 'string' = 
        typeof defval === 'boolean' ? 'bool' :
        typeof defval === 'number' ? (Number.isInteger(defval) ? 'int' : 'float') : 'string';

      if (!inputs.some(inp => inp.id === id)) {
        inputs.push({
          id,
          title,
          type,
          defval,
          min: typeof defval === 'number' ? (defval > 0 ? 1 : 0) : undefined,
          max: typeof defval === 'number' ? (defval * 10) : undefined,
        });
      }
    }
  }

  return inputs;
}

/**
 * Transpiles Python syntax to sandboxed JavaScript
 */
function transpilePythonToJs(pythonCode: string): string {
  const rawLines = pythonCode.split('\n');
  const jsLines: string[] = [];
  const indentStack: number[] = [0];

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];
    const trimmed = line.trim();

    // Skip empty lines or pure comment lines
    if (!trimmed) {
      jsLines.push('');
      continue;
    }
    if (trimmed.startsWith('#')) {
      jsLines.push('// ' + trimmed.slice(1));
      continue;
    }

    // Strip inline comments (# not inside quotes)
    const commentIdx = line.indexOf('#');
    if (commentIdx !== -1) {
      const before = line.slice(0, commentIdx);
      const quotesCount = (before.match(/['"]/g) || []).length;
      if (quotesCount % 2 === 0) {
        line = before;
      }
    }

    // Calculate indentation
    const indentMatch = line.match(/^(\s*)/);
    const indentSpaces = indentMatch ? indentMatch[1].replace(/\t/g, '    ').length : 0;

    // Close blocks if indent decreased
    while (indentSpaces < indentStack[indentStack.length - 1]) {
      indentStack.pop();
      jsLines.push(' '.repeat(indentStack[indentStack.length - 1] || 0) + '}');
    }

    let processed = line.trim();

    // Python keyword replacements
    processed = processed
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null')
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\s+/g, '!');

    // elif -> else if
    if (processed.startsWith('elif ')) {
      processed = processed.replace(/^elif\s+/, 'else if (').replace(/:\s*$/, ')');
    }
    // if condition: -> if (condition)
    else if (processed.startsWith('if ')) {
      processed = processed.replace(/^if\s+/, 'if (').replace(/:\s*$/, ')');
    }
    // else: -> else
    else if (processed === 'else:' || processed.startsWith('else:')) {
      processed = processed.replace(/^else:\s*/, 'else');
    }
    // for var in iterable:
    else if (processed.startsWith('for ')) {
      processed = processed.replace(/^for\s+(\w+)\s+in\s+([^:]+):/, 'for (const $1 of $2)');
    }
    // while condition:
    else if (processed.startsWith('while ')) {
      processed = processed.replace(/^while\s+([^:]+):/, 'while ($1)');
    }
    // def func(args): -> function func(args)
    else if (processed.startsWith('def ')) {
      processed = processed.replace(/^def\s+/, 'function ').replace(/:\s*$/, '');
    }

    const isBlockHeader = rawLines[i].trim().endsWith(':');
    if (isBlockHeader) {
      processed = processed.replace(/:\s*$/, '') + ' {';
      indentStack.push(indentSpaces + 4);
    } else {
      // Add semicolon if not present and not block statement
      if (!processed.endsWith(';') && !processed.endsWith('{') && !processed.endsWith('}')) {
        processed += ';';
      }
    }

    jsLines.push(' '.repeat(indentSpaces) + processed);
  }

  // Close any unclosed braces
  while (indentStack.length > 1) {
    indentStack.pop();
    jsLines.push('}');
  }

  return jsLines.join('\n');
}

/**
 * Main execution function for Python Quant Scripts
 */
export function executePythonScript(
  code: string,
  candles: CandleData[],
  paramOverrides: Record<string, any> = {}
): PythonExecutionResult {
  const startTime = performance.now();

  if (!code || !code.trim()) {
    return {
      success: false,
      title: 'Python Quant Script',
      isOverlay: true,
      plots: [],
      hlines: [],
      inputs: [],
      logs: [],
      executionTimeMs: 0,
      error: 'Python betik kodu boş.'
    };
  }

  if (!candles || candles.length === 0) {
    return {
      success: false,
      title: 'Python Quant Script',
      isOverlay: true,
      plots: [],
      hlines: [],
      inputs: [],
      logs: [],
      executionTimeMs: 0,
      error: 'Mum verisi bulunamadı.'
    };
  }

  const inputs = extractPythonInputs(code);
  const plots: PythonPlotOutput[] = [];
  const hlines: PythonHlineOutput[] = [];
  const logs: string[] = [];
  let isOverlay = true;
  let title = 'Python Quant Stratejisi';

  // 1. Build DataFrame columns with PythonSeries
  const times = candles.map(c => c.time);
  const dfColumns: Record<string, PythonSeries> = {
    time: new PythonSeries(times),
    open: new PythonSeries(candles.map(c => c.open)),
    high: new PythonSeries(candles.map(c => c.high)),
    low: new PythonSeries(candles.map(c => c.low)),
    close: new PythonSeries(candles.map(c => c.close)),
    volume: new PythonSeries(candles.map(c => c.volume || 0))
  };

  // DataFrame proxy to allow df['close'] or df.close
  const df = new Proxy(dfColumns, {
    get(target, prop: string) {
      const lower = prop.toLowerCase();
      if (lower in target) return target[lower];
      return target[prop] || new PythonSeries(new Float64Array(candles.length).fill(NaN));
    },
    set(target, prop: string, value) {
      const lower = prop.toLowerCase();
      if (value instanceof PythonSeries) {
        target[lower] = value;
      } else if (Array.isArray(value) || value instanceof Float64Array) {
        target[lower] = new PythonSeries(value);
      } else if (typeof value === 'number') {
        target[lower] = new PythonSeries(new Float64Array(candles.length).fill(value));
      }
      return true;
    }
  });

  // 2. Technical analysis functions
  const ta = {
    sma: (src: PythonSeries | number[], period = 20): PythonSeries => {
      const vals = src instanceof PythonSeries ? src.values : src;
      const cDummy = candles.map((c, i) => ({ ...c, close: vals[i] ?? c.close }));
      const pts = calculateSMA(cDummy, Number(period));
      return new PythonSeries(pts.map(p => p.value));
    },
    ema: (src: PythonSeries | number[], period = 14): PythonSeries => {
      const vals = src instanceof PythonSeries ? src.values : src;
      const cDummy = candles.map((c, i) => ({ ...c, close: vals[i] ?? c.close }));
      const pts = calculateEMA(cDummy, Number(period));
      return new PythonSeries(pts.map(p => p.value));
    },
    wma: (src: PythonSeries | number[], period = 14): PythonSeries => {
      const vals = src instanceof PythonSeries ? src.values : src;
      const cDummy = candles.map((c, i) => ({ ...c, close: vals[i] ?? c.close }));
      const pts = calculateWMA(cDummy, Number(period));
      return new PythonSeries(pts.map(p => p.value));
    },
    rsi: (src: PythonSeries | number[], period = 14): PythonSeries => {
      const vals = src instanceof PythonSeries ? src.values : src;
      const cDummy = candles.map((c, i) => ({ ...c, close: vals[i] ?? c.close }));
      const pts = calculateRSI(cDummy, Number(period));
      return new PythonSeries(pts.map(p => p.value));
    },
    macd: (src: PythonSeries | number[], fast = 12, slow = 26, signalPeriod = 9) => {
      const vals = src instanceof PythonSeries ? src.values : src;
      const cDummy = candles.map((c, i) => ({ ...c, close: vals[i] ?? c.close }));
      const pts = calculateMACD(cDummy, Number(fast), Number(slow), Number(signalPeriod));
      return [
        new PythonSeries(pts.map(p => p.macd)),
        new PythonSeries(pts.map(p => p.signal)),
        new PythonSeries(pts.map(p => p.histogram))
      ];
    },
    bollinger: (src: PythonSeries | number[], period = 20, mult = 2) => {
      const vals = src instanceof PythonSeries ? src.values : src;
      const cDummy = candles.map((c, i) => ({ ...c, close: vals[i] ?? c.close }));
      const pts = calculateBollingerBands(cDummy, Number(period), Number(mult));
      return [
        new PythonSeries(pts.map(p => p.upper)),
        new PythonSeries(pts.map(p => p.middle)),
        new PythonSeries(pts.map(p => p.lower))
      ];
    },
    supertrend: (_srcOrDf?: any, factor = 3, atrPeriod = 10) => {
      const pts = calculateSupertrend(candles, Number(atrPeriod), Number(factor));
      return [
        new PythonSeries(pts.map(p => p.value)),
        new PythonSeries(pts.map(p => p.direction))
      ];
    },
    atr: (_srcOrDf?: any, period = 14) => {
      const pts = calculateATR(candles, Number(period));
      return new PythonSeries(pts.map(p => p.value));
    },
    vwap: (_srcOrDf?: any) => {
      const pts = calculateVWAP(candles);
      return new PythonSeries(pts.map(p => p.value));
    }
  };

  // 3. NumPy functions
  const np = {
    where: (cond: PythonSeries | boolean[], trueVal: any, falseVal: any): PythonSeries => {
      const cVals = cond instanceof PythonSeries ? cond.values : cond;
      const len = cVals.length;
      const isTrueSeries = trueVal instanceof PythonSeries;
      const isFalseSeries = falseVal instanceof PythonSeries;
      const res = new Float64Array(len);
      for (let i = 0; i < len; i++) {
        const c = Boolean(cVals[i]);
        if (c) {
          res[i] = isTrueSeries ? trueVal.values[i] : (trueVal || 0);
        } else {
          res[i] = isFalseSeries ? falseVal.values[i] : (falseVal || 0);
        }
      }
      return new PythonSeries(res);
    },
    maximum: (a: PythonSeries | number, b: PythonSeries | number): PythonSeries => {
      const aIsSeries = a instanceof PythonSeries;
      const bIsSeries = b instanceof PythonSeries;
      const len = candles.length;
      const res = new Float64Array(len);
      for (let i = 0; i < len; i++) {
        const valA = aIsSeries ? a.values[i] : (a as number);
        const valB = bIsSeries ? b.values[i] : (b as number);
        res[i] = Math.max(valA, valB);
      }
      return new PythonSeries(res);
    },
    minimum: (a: PythonSeries | number, b: PythonSeries | number): PythonSeries => {
      const aIsSeries = a instanceof PythonSeries;
      const bIsSeries = b instanceof PythonSeries;
      const len = candles.length;
      const res = new Float64Array(len);
      for (let i = 0; i < len; i++) {
        const valA = aIsSeries ? a.values[i] : (a as number);
        const valB = bIsSeries ? b.values[i] : (b as number);
        res[i] = Math.min(valA, valB);
      }
      return new PythonSeries(res);
    },
    abs: (a: PythonSeries): PythonSeries => {
      const len = a.values.length;
      const res = new Float64Array(len);
      for (let i = 0; i < len; i++) res[i] = Math.abs(a.values[i]);
      return new PythonSeries(res);
    }
  };

  // 4. Plot & Indicator declaration functions
  const plot = (
    series: PythonSeries | number[], 
    optsOrTitle: any = 'Plot', 
    color = '#2962ff', 
    lineWidth = 2, 
    overlay = true
  ) => {
    let plotTitle = 'Plot';
    let plotColor = color;
    let plotWidth = lineWidth;
    let plotOverlay = overlay;

    if (typeof optsOrTitle === 'string') {
      plotTitle = optsOrTitle;
    } else if (typeof optsOrTitle === 'object' && optsOrTitle !== null) {
      if (optsOrTitle.title) plotTitle = optsOrTitle.title;
      if (optsOrTitle.color) plotColor = optsOrTitle.color;
      if (optsOrTitle.linewidth || optsOrTitle.lineWidth) plotWidth = optsOrTitle.linewidth || optsOrTitle.lineWidth;
      if (optsOrTitle.overlay !== undefined) plotOverlay = optsOrTitle.overlay;
    }

    const vals = series instanceof PythonSeries ? series.values : series;
    const cleanPoints: { time: number; value: number }[] = [];
    for (let i = 0; i < candles.length; i++) {
      const v = vals[i];
      if (v !== undefined && !isNaN(v) && isFinite(v)) {
        cleanPoints.push({ time: candles[i].time, value: v });
      }
    }

    plots.push({
      id: `py_plot_${plots.length + 1}`,
      title: plotTitle,
      color: plotColor,
      lineWidth: plotWidth,
      values: cleanPoints,
      style: 'line'
    });

    if (plotOverlay === false) {
      isOverlay = false;
    }
  };

  const hline = (
    price: number, 
    optsOrTitle: any = '', 
    color = '#787b86', 
    lineStyle = 2
  ) => {
    let hlTitle = `${price}`;
    let hlColor = color;
    let hlStyle = lineStyle;

    if (typeof optsOrTitle === 'string') {
      hlTitle = optsOrTitle || `${price}`;
    } else if (typeof optsOrTitle === 'object' && optsOrTitle !== null) {
      if (optsOrTitle.title) hlTitle = optsOrTitle.title;
      if (optsOrTitle.color) hlColor = optsOrTitle.color;
      if (optsOrTitle.lineStyle !== undefined) hlStyle = optsOrTitle.lineStyle;
    }

    hlines.push({
      id: `py_hline_${hlines.length + 1}`,
      price,
      title: hlTitle,
      color: hlColor,
      lineWidth: 1,
      lineStyle: hlStyle
    });
  };

  const plot_shape = (
    condition: PythonSeries | number[], 
    optsOrTitle: any = 'Sinyal', 
    shape = 'triangle_up', 
    color = '#089981'
  ) => {
    let shapeTitle = 'Sinyal';
    let shapeType = shape;
    let shapeColor = color;

    if (typeof optsOrTitle === 'string') {
      shapeTitle = optsOrTitle;
    } else if (typeof optsOrTitle === 'object' && optsOrTitle !== null) {
      if (optsOrTitle.title) shapeTitle = optsOrTitle.title;
      if (optsOrTitle.shape) shapeType = optsOrTitle.shape;
      if (optsOrTitle.color) shapeColor = optsOrTitle.color;
    }

    const cVals = condition instanceof PythonSeries ? condition.values : condition;
    const points: { time: number; value: number }[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (cVals[i]) {
        const yVal = shapeType === 'triangle_up' 
          ? candles[i].low * 0.998 
          : candles[i].high * 1.002;
        points.push({ time: candles[i].time, value: yVal });
      }
    }

    if (points.length > 0) {
      plots.push({
        id: `py_shape_${plots.length + 1}`,
        title: shapeTitle,
        color: shapeColor,
        lineWidth: 3,
        values: points,
        style: 'circles',
        isShape: true
      });
    }
  };

  const param = (name: string, defaultVal: any, ..._rest: any[]) => {
    if (paramOverrides && paramOverrides[name] !== undefined) {
      return paramOverrides[name];
    }
    return defaultVal;
  };

  const print = (...args: any[]) => {
    logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  };

  // 5. Transpile & Execute
  try {
    const transpiledJs = transpilePythonToJs(code);

    // Build Execution Context
    const sandboxScope = {
      df,
      ta,
      np,
      plot,
      hline,
      plot_shape,
      crossover,
      crossunder,
      param,
      input: param,
      print,
      console: { log: print, warn: print, error: print },
      Math
    };

    // Construct runner with isolated function wrapper
    const runner = new Function(
      ...Object.keys(sandboxScope),
      `
      "use strict";
      ${transpiledJs}

      // If user defined main(df) or calculate(df), invoke it
      if (typeof main === 'function') {
        main(df);
      } else if (typeof calculate === 'function') {
        calculate(df);
      }
      `
    );

    runner(...Object.values(sandboxScope));

    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
    logs.push(`Python betiği başarıyla çalıştırıldı. ${candles.length} mum işlendi (${executionTimeMs} ms).`);

    return {
      success: true,
      title,
      isOverlay,
      plots,
      hlines,
      inputs,
      logs,
      executionTimeMs
    };
  } catch (err: any) {
    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
    const errMsg = err?.message || 'Bilinmeyen Python çalışma zamanı hatası';
    logs.push(`[HATA] ${errMsg}`);

    return {
      success: false,
      title,
      isOverlay,
      plots: [],
      hlines: [],
      inputs,
      logs,
      executionTimeMs,
      error: errMsg
    };
  }
}
