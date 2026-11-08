import { IndicatorConfig, IndicatorType } from '../types';
import { StrategyConfig } from './backtestEngine';

export interface ParsedPineResult {
  indicators: IndicatorConfig[];
  strategy?: StrategyConfig;
  title: string;
  isOverlay: boolean;
  logs: string[];
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
};

/**
 * Robust Pine Script v5 / v4 Parser and Quantitative Compiler
 * Extracts indicator declarations, inputs, mathematical formulas, plot calls, and strategies.
 */
export function parsePineScript(code: string): ParsedPineResult {
  if (!code || typeof code !== 'string') {
    return {
      indicators: [],
      title: 'Boş Komut',
      isOverlay: true,
      logs: ['Kod boş.'],
    };
  }

  const lines = code.split('\n');
  const variables = new Map<string, number>();
  const varAssignments = new Map<string, string>(); // varName -> rhs expression
  const plotCalls = new Map<string, { color?: string; title?: string; lineWidth?: number }>();
  const logs: string[] = [];
  const indicators: IndicatorConfig[] = [];

  let title = 'Özel Pine Script';
  let isOverlay = true;
  let strategyType: StrategyConfig['type'] | null = null;
  const strategyParams: Record<string, number> = {};

  // 1. Pass: Extract title, overlay mode, variable inputs, and plot configurations
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;

    // indicator("Title", overlay=true)
    const indMatch = line.match(/(?:indicator|study)\s*\(\s*["']([^"']+)["']\s*(?:,\s*(?:overlay\s*=\s*)?(true|false))?/i);
    if (indMatch) {
      title = indMatch[1];
      if (indMatch[2]) {
        isOverlay = indMatch[2].toLowerCase() === 'true';
      }
      logs.push(`Gösterge başlığı: "${title}" (Overlay: ${isOverlay})`);
      continue;
    }

    // strategy("Title", overlay=true)
    const stratMatch = line.match(/strategy\s*\(\s*["']([^"']+)["']\s*(?:,\s*(?:overlay\s*=\s*)?(true|false))?/i);
    if (stratMatch) {
      title = stratMatch[1];
      if (stratMatch[2]) {
        isOverlay = stratMatch[2].toLowerCase() === 'true';
      }
      strategyType = 'EMA_CROSS';
      logs.push(`Strateji başlığı: "${title}" (Overlay: ${isOverlay})`);
      continue;
    }

    // Variable inputs:
    // len = input(14, "Length") or len = input.int(14, "Length") or input.int(defval=14)
    const inputMatch = line.match(/([a-zA-Z0-9_]+)\s*=\s*input(?:\.[a-zA-Z]+)?\s*\(\s*(?:defval\s*=\s*)?([0-9.]+)/i);
    if (inputMatch) {
      const varName = inputMatch[1];
      const val = parseFloat(inputMatch[2]);
      if (!isNaN(val)) {
        variables.set(varName, val);
      }
      continue;
    }

    // Direct variable assignment: fastLength = 9
    const simpleVarMatch = line.match(/^([a-zA-Z0-9_]+)\s*=\s*([0-9.]+)\s*$/);
    if (simpleVarMatch) {
      const varName = simpleVarMatch[1];
      const val = parseFloat(simpleVarMatch[2]);
      if (!isNaN(val)) {
        variables.set(varName, val);
      }
      continue;
    }

    // Generic variable assignment: myEma = ta.ema(close, 20)
    const assignMatch = line.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
    if (assignMatch) {
      varAssignments.set(assignMatch[1].trim(), assignMatch[2].trim());
    }

    // plot(series, title="Name", color=color.blue, linewidth=2)
    const plotMatch = line.match(/plot\s*\(\s*([a-zA-Z0-9_.]+)(?:,\s*(.*))?\)/i);
    if (plotMatch) {
      const targetVar = plotMatch[1].trim();
      const rest = plotMatch[2] || '';

      const colMatch = rest.match(/color\s*=\s*([a-zA-Z0-9_#]+)/i);
      const titleMatch = rest.match(/title\s*=\s*["']([^"']+)["']/i);
      const lwMatch = rest.match(/linewidth\s*=\s*([0-9]+)/i);

      let color: string | undefined = undefined;
      if (colMatch) {
        const c = colMatch[1];
        color = COLOR_MAP[c] || (c.startsWith('#') ? c : undefined);
      }

      plotCalls.set(targetVar, {
        color,
        title: titleMatch ? titleMatch[1] : undefined,
        lineWidth: lwMatch ? parseInt(lwMatch[1], 10) : 2,
      });
    }
  }

  // Helper to resolve numeric token or variable name
  const resolveNum = (token: string, fallback: number): number => {
    if (!token) return fallback;
    const trimmed = token.trim();
    if (variables.has(trimmed)) {
      return variables.get(trimmed)!;
    }
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? fallback : parsed;
  };

  // Helper to resolve plot styling for a variable or expression
  const resolveStyle = (varName: string, defaultColor: string) => {
    const p = plotCalls.get(varName);
    return {
      color: p?.color || defaultColor,
      lineWidth: p?.lineWidth || 2,
      customTitle: p?.title,
    };
  };

  // 2. Pass: Extract technical indicator calculations
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//')) continue;

    const assignMatch = line.match(/^([a-zA-Z0-9_]+)\s*=/);
    const assignedVar = assignMatch ? assignMatch[1].trim() : '';

    // 1. EMA (ta.ema or ema)
    const emaMatch = line.match(/(?:ta\.)?ema\s*\(\s*[^,]+,\s*([^)]+)\)/i);
    if (emaMatch) {
      const period = resolveNum(emaMatch[1], 20);
      const style = resolveStyle(assignedVar, indicators.length % 2 === 0 ? '#2962ff' : '#ff9800');
      const indName = style.customTitle || `EMA ${period}`;

      indicators.push({
        id: `pine_ema_${Date.now()}_${indicators.length}`,
        type: 'EMA',
        name: indName,
        pane: 'overlay',
        visible: true,
        params: { period },
        styles: { line: { color: style.color, lineWidth: style.lineWidth } },
      });
      logs.push(`✓ EMA(${period}) -> ${indName}`);

      if (!strategyParams.fast) {
        strategyParams.fast = period;
      } else if (!strategyParams.slow) {
        strategyParams.slow = period;
      }
    }

    // 2. SMA (ta.sma or sma)
    const smaMatch = line.match(/(?:ta\.)?sma\s*\(\s*[^,]+,\s*([^)]+)\)/i);
    if (smaMatch && !line.includes('ta.ema')) {
      const period = resolveNum(smaMatch[1], 20);
      const style = resolveStyle(assignedVar, '#00e5ff');
      const indName = style.customTitle || `SMA ${period}`;

      indicators.push({
        id: `pine_sma_${Date.now()}_${indicators.length}`,
        type: 'SMA',
        name: indName,
        pane: 'overlay',
        visible: true,
        params: { period },
        styles: { line: { color: style.color, lineWidth: style.lineWidth } },
      });
      logs.push(`✓ SMA(${period}) -> ${indName}`);
    }

    // 3. WMA (ta.wma or wma)
    const wmaMatch = line.match(/(?:ta\.)?wma\s*\(\s*[^,]+,\s*([^)]+)\)/i);
    if (wmaMatch && !line.includes('ta.vwma')) {
      const period = resolveNum(wmaMatch[1], 20);
      const style = resolveStyle(assignedVar, '#e040fb');
      indicators.push({
        id: `pine_wma_${Date.now()}_${indicators.length}`,
        type: 'WMA',
        name: style.customTitle || `WMA ${period}`,
        pane: 'overlay',
        visible: true,
        params: { period },
        styles: { line: { color: style.color, lineWidth: style.lineWidth } },
      });
      logs.push(`✓ WMA(${period}) derlendi.`);
    }

    // 4. RSI (ta.rsi or rsi)
    const rsiMatch = line.match(/(?:ta\.)?rsi\s*\(\s*[^,]+,\s*([^)]+)\)/i);
    if (rsiMatch) {
      const period = resolveNum(rsiMatch[1], 14);
      const style = resolveStyle(assignedVar, '#ab47bc');
      indicators.push({
        id: `pine_rsi_${Date.now()}_${indicators.length}`,
        type: 'RSI',
        name: style.customTitle || `RSI ${period}`,
        pane: 'subpane',
        visible: true,
        params: { period },
        styles: { line: { color: style.color, lineWidth: style.lineWidth } },
      });
      logs.push(`✓ RSI(${period}) alt paneline eklendi.`);
      if (line.includes('strategy') || code.includes('strategy.entry')) {
        strategyType = 'RSI_REVERSAL';
        strategyParams.period = period;
      }
    }

    // 5. MACD (ta.macd or macd)
    const macdMatch = line.match(/(?:ta\.)?macd\s*\(\s*[^,]+,\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/i);
    if (macdMatch) {
      const fast = resolveNum(macdMatch[1], 12);
      const slow = resolveNum(macdMatch[2], 26);
      const signal = resolveNum(macdMatch[3], 9);
      indicators.push({
        id: `pine_macd_${Date.now()}_${indicators.length}`,
        type: 'MACD',
        name: `MACD (${fast}, ${slow}, ${signal})`,
        pane: 'subpane',
        visible: true,
        params: { fastPeriod: fast, slowPeriod: slow, signalPeriod: signal },
        styles: {
          macd: { color: '#2962ff', lineWidth: 2 },
          signal: { color: '#ff9800', lineWidth: 1 },
          hist: { color: '#26a69a', lineWidth: 1 },
        },
      });
      logs.push(`✓ MACD(${fast}, ${slow}, ${signal}) alt paneline eklendi.`);
      if (line.includes('strategy') || code.includes('strategy.entry')) {
        strategyType = 'MACD_CROSS';
        strategyParams.fast = fast;
        strategyParams.slow = slow;
        strategyParams.signal = signal;
      }
    }

    // 6. Bollinger Bands (ta.bb or bb)
    const bbMatch = line.match(/(?:ta\.)?bb\s*\(\s*[^,]+,\s*([^,]+),\s*([^)]+)\)/i);
    if (bbMatch) {
      const period = resolveNum(bbMatch[1], 20);
      const mult = resolveNum(bbMatch[2], 2);
      indicators.push({
        id: `pine_bb_${Date.now()}_${indicators.length}`,
        type: 'BollingerBands',
        name: `Bollinger Bantları (${period}, ${mult})`,
        pane: 'overlay',
        visible: true,
        params: { period, multiplier: mult },
        styles: {
          upper: { color: '#26a69a', lineWidth: 1 },
          middle: { color: '#ff9800', lineWidth: 1 },
          lower: { color: '#ef5350', lineWidth: 1 },
        },
      });
      logs.push(`✓ Bollinger Bantları(${period}, ${mult}) eklendi.`);
      if (line.includes('strategy') || code.includes('strategy.entry')) {
        strategyType = 'BOLLINGER_REVERSAL';
        strategyParams.period = period;
        strategyParams.multiplier = mult;
      }
    }

    // 7. Supertrend (ta.supertrend or supertrend)
    const stMatch = line.match(/(?:ta\.)?supertrend\s*\(\s*([^,]+),\s*([^)]+)\)/i);
    if (stMatch) {
      const factor = resolveNum(stMatch[1], 3);
      const period = resolveNum(stMatch[2], 10);
      indicators.push({
        id: `pine_st_${Date.now()}_${indicators.length}`,
        type: 'Supertrend',
        name: `Supertrend (${period}, ${factor})`,
        pane: 'overlay',
        visible: true,
        params: { period, multiplier: factor },
        styles: {
          up: { color: '#089981', lineWidth: 2 },
          down: { color: '#f23645', lineWidth: 2 },
        },
      });
      logs.push(`✓ Supertrend(${period}, ${factor}) eklendi.`);
      strategyType = 'SUPERTREND_FOLLOW';
      strategyParams.period = period;
      strategyParams.multiplier = factor;
    }

    // 8. ATR (ta.atr or atr)
    const atrMatch = line.match(/(?:ta\.)?atr\s*\(\s*([^)]+)\)/i);
    if (atrMatch && !line.includes('ta.supertrend')) {
      const period = resolveNum(atrMatch[1], 14);
      indicators.push({
        id: `pine_atr_${Date.now()}_${indicators.length}`,
        type: 'ATR',
        name: `ATR ${period}`,
        pane: 'subpane',
        visible: true,
        params: { period },
        styles: { line: { color: '#ab47bc', lineWidth: 2 } },
      });
      logs.push(`✓ ATR(${period}) alt paneline eklendi.`);
    }

    // 9. VWAP (ta.vwap or vwap)
    if (line.includes('ta.vwap') || line.match(/\bvwap\b/i)) {
      indicators.push({
        id: `pine_vwap_${Date.now()}_${indicators.length}`,
        type: 'VWAP',
        name: 'VWAP',
        pane: 'overlay',
        visible: true,
        params: {},
        styles: { line: { color: '#fbc02d', lineWidth: 2 } },
      });
      logs.push(`✓ VWAP göstergesi eklendi.`);
    }
  }

  // Detect Crossover / Strategy rules
  if (!strategyType && (code.includes('strategy(') || code.includes('strategy.entry'))) {
    if (code.includes('ta.macd') || code.includes('macd')) {
      strategyType = 'MACD_CROSS';
    } else if (code.includes('ta.bb') || code.includes('bollinger')) {
      strategyType = 'BOLLINGER_REVERSAL';
    } else if (code.includes('ta.rsi') || code.includes('rsi')) {
      strategyType = 'RSI_REVERSAL';
    } else if (code.includes('ta.supertrend') || code.includes('supertrend')) {
      strategyType = 'SUPERTREND_FOLLOW';
    } else {
      strategyType = 'EMA_CROSS';
    }
  }

  // If no specific indicators were identified, fallback to user's title with default EMA(20)
  if (indicators.length === 0) {
    indicators.push({
      id: `pine_def_${Date.now()}`,
      type: 'EMA',
      name: title !== 'Özel Pine Script' ? `${title} (EMA)` : 'EMA 20',
      pane: isOverlay ? 'overlay' : 'subpane',
      visible: true,
      params: { period: 20 },
      styles: { line: { color: '#2962ff', lineWidth: 2 } },
    });
    logs.push(`Varsayılan EMA(20) göstergesi uygulandı.`);
  }

  let strategy: StrategyConfig | undefined;
  if (strategyType) {
    strategy = {
      type: strategyType,
      params: {
        fast: strategyParams.fast || 9,
        slow: strategyParams.slow || 21,
        period: strategyParams.period || 14,
        multiplier: strategyParams.multiplier || 3,
        oversold: 30,
        overbought: 70,
      },
      makerFee: 0.0002,
      takerFee: 0.0005,
      slippage: 0.0003,
      allowShort: true,
    };
    logs.push(`Strateji algılandı: ${strategyType}`);
  }

  return {
    indicators,
    strategy,
    title,
    isOverlay,
    logs,
  };
}
