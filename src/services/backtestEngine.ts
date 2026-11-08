import { CandleData } from '../types';
import { 
  calculateEMA, 
  calculateRSI, 
  calculateSupertrend, 
  calculateMACD, 
  calculateBollingerBands 
} from '../indicators/math';

export interface BacktestTrade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  type: 'LONG' | 'SHORT';
  pnlPercent: number;
  pnlNet: number;
  reason: string;
}

export interface EquityPoint {
  time: number;
  equity: number;
  drawdown: number;
}

export interface BacktestReport {
  strategyName: string;
  totalTrades: number;
  winRate: number; // in percent
  netProfitPercent: number; // in percent
  netProfitCash: number;
  profitFactor: number;
  maxDrawdown: number; // in percent
  sharpeRatio: number;
  sortinoRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  buyAndHoldPercent: number;
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];
}

export type StrategyType = 
  | 'EMA_CROSS' 
  | 'RSI_REVERSAL' 
  | 'SUPERTREND_FOLLOW'
  | 'MACD_CROSS'
  | 'BOLLINGER_REVERSAL';

export interface StrategyConfig {
  type: StrategyType;
  params: Record<string, number>;
  makerFee: number; // e.g. 0.0002 (0.02%)
  takerFee: number; // e.g. 0.0005 (0.05%)
  slippage: number; // e.g. 0.0003 (0.03%)
  allowShort?: boolean;
}

/**
 * Professional Quant Backtest Engine
 * - Zero look-ahead bias: Signal generated at bar i close, executed at bar i+1 open.
 * - Realistic exchange fees (maker/taker) and liquidity slippage included.
 * - Strict risk management: max drawdown tracking, Sortino, Sharpe, and equity curve.
 */
export function runBacktest(
  candles: CandleData[],
  config: StrategyConfig,
  initialCapital: number = 10000
): BacktestReport {
  if (!candles || candles.length < 50) {
    return {
      strategyName: config.type,
      totalTrades: 0,
      winRate: 0,
      netProfitPercent: 0,
      netProfitCash: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      buyAndHoldPercent: 0,
      equityCurve: [],
      trades: [],
    };
  }

  const n = candles.length;
  // signals[i]: 1 = BUY/LONG, -1 = SELL/SHORT, 0 = HOLD
  const signals: number[] = new Array(n).fill(0);

  // 1. Signal Generation (Strict zero look-ahead bias)
  if (config.type === 'EMA_CROSS') {
    const fastPeriod = config.params.fast || 9;
    const slowPeriod = config.params.slow || 21;
    const fastEma = calculateEMA(candles, fastPeriod);
    const slowEma = calculateEMA(candles, slowPeriod);

    const fastMap = new Map<number, number>();
    fastEma.forEach(p => fastMap.set(p.time, p.value));
    const slowMap = new Map<number, number>();
    slowEma.forEach(p => slowMap.set(p.time, p.value));

    for (let i = 1; i < n; i++) {
      const currTime = candles[i].time;
      const prevTime = candles[i - 1].time;

      const fastCurr = fastMap.get(currTime);
      const slowCurr = slowMap.get(currTime);
      const fastPrev = fastMap.get(prevTime);
      const slowPrev = slowMap.get(prevTime);

      if (fastCurr !== undefined && slowCurr !== undefined && fastPrev !== undefined && slowPrev !== undefined) {
        if (fastPrev <= slowPrev && fastCurr > slowCurr) {
          signals[i] = 1; // Golden Cross
        } else if (fastPrev >= slowPrev && fastCurr < slowCurr) {
          signals[i] = -1; // Death Cross
        }
      }
    }
  } else if (config.type === 'RSI_REVERSAL') {
    const period = config.params.period || 14;
    const oversold = config.params.oversold || 30;
    const overbought = config.params.overbought || 70;
    const rsiPoints = calculateRSI(candles, period);

    const rsiMap = new Map<number, number>();
    rsiPoints.forEach(p => rsiMap.set(p.time, p.value));

    for (let i = 1; i < n; i++) {
      const currRsi = rsiMap.get(candles[i].time);
      const prevRsi = rsiMap.get(candles[i - 1].time);

      if (currRsi !== undefined && prevRsi !== undefined) {
        if (prevRsi <= oversold && currRsi > oversold) {
          signals[i] = 1; // Long reversal from oversold
        } else if (prevRsi >= overbought && currRsi < overbought) {
          signals[i] = -1; // Short reversal from overbought
        }
      }
    }
  } else if (config.type === 'SUPERTREND_FOLLOW') {
    const stPoints = calculateSupertrend(candles, config.params.period || 10, config.params.multiplier || 3);
    const stMap = new Map<number, 1 | -1>();
    stPoints.forEach(p => stMap.set(p.time, p.direction));

    for (let i = 1; i < n; i++) {
      const currDir = stMap.get(candles[i].time);
      const prevDir = stMap.get(candles[i - 1].time);

      if (currDir !== undefined && prevDir !== undefined && currDir !== prevDir) {
        if (currDir === 1) signals[i] = 1;
        else if (currDir === -1) signals[i] = -1;
      }
    }
  } else if (config.type === 'MACD_CROSS') {
    const fast = config.params.fast || 12;
    const slow = config.params.slow || 26;
    const signalPeriod = config.params.signal || 9;
    const macdPoints = calculateMACD(candles, fast, slow, signalPeriod);

    const macdMap = new Map<number, { macd: number; signal: number }>();
    macdPoints.forEach(p => macdMap.set(p.time, { macd: p.macd, signal: p.signal }));

    for (let i = 1; i < n; i++) {
      const curr = macdMap.get(candles[i].time);
      const prev = macdMap.get(candles[i - 1].time);

      if (curr && prev) {
        if (prev.macd <= prev.signal && curr.macd > curr.signal) {
          signals[i] = 1; // Bullish crossover
        } else if (prev.macd >= prev.signal && curr.macd < curr.signal) {
          signals[i] = -1; // Bearish crossover
        }
      }
    }
  } else if (config.type === 'BOLLINGER_REVERSAL') {
    const period = config.params.period || 20;
    const mult = config.params.multiplier || 2;
    const bb = calculateBollingerBands(candles, period, mult);

    const bbMap = new Map<number, { lower: number; upper: number; middle: number }>();
    bb.forEach(p => bbMap.set(p.time, { lower: p.lower, upper: p.upper, middle: p.middle }));

    for (let i = 1; i < n; i++) {
      const b = bbMap.get(candles[i].time);
      if (!b) continue;
      const c = candles[i];
      const prevC = candles[i - 1];

      // Bullish mean-reversion: pierced lower band and closed back above
      if (prevC.low < b.lower && c.close > b.lower) {
        signals[i] = 1;
      }
      // Bearish mean-reversion: pierced upper band and closed back below
      else if (prevC.high > b.upper && c.close < b.upper) {
        signals[i] = -1;
      }
    }
  }

  // 2. Simulation Execution Loop
  let inPosition: 'LONG' | 'SHORT' | null = null;
  let entryPrice: number = 0;
  let entryTime: number = 0;
  let capital = initialCapital;
  let peakCapital = initialCapital;
  let maxDrawdown = 0;

  const trades: BacktestTrade[] = [];
  const returns: number[] = [];
  const equityCurve: EquityPoint[] = [];

  const executionFee = config.takerFee + config.slippage;
  const allowShort = !!config.allowShort;

  for (let i = 0; i < n - 1; i++) {
    const signal = signals[i];
    const nextBar = candles[i + 1];

    // Record equity point at bar i
    const currentDd = peakCapital > 0 ? ((peakCapital - capital) / peakCapital) * 100 : 0;
    equityCurve.push({
      time: candles[i].time,
      equity: Number(capital.toFixed(2)),
      drawdown: Number(Math.max(0, currentDd).toFixed(2)),
    });

    if (inPosition === null) {
      if (signal === 1) {
        // Enter LONG
        inPosition = 'LONG';
        entryPrice = nextBar.open * (1 + executionFee);
        entryTime = nextBar.time;
      } else if (signal === -1 && allowShort) {
        // Enter SHORT
        inPosition = 'SHORT';
        entryPrice = nextBar.open * (1 - executionFee);
        entryTime = nextBar.time;
      }
    } else if (inPosition === 'LONG' && signal === -1) {
      // Exit LONG
      const exitPrice = nextBar.open * (1 - executionFee);
      const pnlPct = entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0;
      const pnlCash = capital * (pnlPct / 100);

      capital += pnlCash;
      returns.push(pnlPct / 100);

      if (capital > peakCapital) peakCapital = capital;
      const dd = peakCapital > 0 ? ((peakCapital - capital) / peakCapital) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;

      trades.push({
        entryTime,
        entryPrice: Number(entryPrice.toFixed(2)),
        exitTime: nextBar.time,
        exitPrice: Number(exitPrice.toFixed(2)),
        type: 'LONG',
        pnlPercent: Number(pnlPct.toFixed(2)),
        pnlNet: Number(pnlCash.toFixed(2)),
        reason: 'Sinyal Çıkışı (Satış)',
      });

      if (allowShort) {
        inPosition = 'SHORT';
        entryPrice = nextBar.open * (1 - executionFee);
        entryTime = nextBar.time;
      } else {
        inPosition = null;
      }
    } else if (inPosition === 'SHORT' && signal === 1) {
      // Exit SHORT
      const exitPrice = nextBar.open * (1 + executionFee);
      const pnlPct = entryPrice > 0 ? ((entryPrice - exitPrice) / entryPrice) * 100 : 0;
      const pnlCash = capital * (pnlPct / 100);

      capital += pnlCash;
      returns.push(pnlPct / 100);

      if (capital > peakCapital) peakCapital = capital;
      const dd = peakCapital > 0 ? ((peakCapital - capital) / peakCapital) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;

      trades.push({
        entryTime,
        entryPrice: Number(entryPrice.toFixed(2)),
        exitTime: nextBar.time,
        exitPrice: Number(exitPrice.toFixed(2)),
        type: 'SHORT',
        pnlPercent: Number(pnlPct.toFixed(2)),
        pnlNet: Number(pnlCash.toFixed(2)),
        reason: 'Sinyal Çıkışı (Alış)',
      });

      inPosition = 'LONG';
      entryPrice = nextBar.open * (1 + executionFee);
      entryTime = nextBar.time;
    }
  }

  // Record final equity point
  equityCurve.push({
    time: candles[n - 1].time,
    equity: Number(capital.toFixed(2)),
    drawdown: Number(Math.max(0, ((peakCapital - capital) / (peakCapital || 1)) * 100).toFixed(2)),
  });

  // 3. Quantitative Performance Statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnlPercent > 0);
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

  const grossProfit = trades.filter(t => t.pnlNet > 0).reduce((acc, t) => acc + t.pnlNet, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnlNet < 0).reduce((acc, t) => acc + t.pnlNet, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 1.0;

  const netProfitCash = capital - initialCapital;
  const netProfitPercent = initialCapital > 0 ? (netProfitCash / initialCapital) * 100 : 0;

  // Buy & Hold Benchmark
  const firstPrice = candles[0].open;
  const lastPrice = candles[candles.length - 1].close;
  const buyAndHoldPercent = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  // Consecutive Wins & Losses
  let curWins = 0;
  let curLoss = 0;
  let maxWins = 0;
  let maxLoss = 0;

  for (const t of trades) {
    if (t.pnlPercent > 0) {
      curWins++;
      curLoss = 0;
      if (curWins > maxWins) maxWins = curWins;
    } else if (t.pnlPercent < 0) {
      curLoss++;
      curWins = 0;
      if (curLoss > maxLoss) maxLoss = curLoss;
    }
  }

  // Sharpe & Sortino Ratios
  let sharpe = 0;
  let sortino = 0;

  if (returns.length > 1) {
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      sharpe = Number(((avgReturn / stdDev) * Math.sqrt(252)).toFixed(2));
    }

    // Downside deviation for Sortino
    const downsideReturns = returns.filter(r => r < 0);
    if (downsideReturns.length > 0) {
      const downsideVariance = downsideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / downsideReturns.length;
      const downsideDev = Math.sqrt(downsideVariance);
      if (downsideDev > 0) {
        sortino = Number(((avgReturn / downsideDev) * Math.sqrt(252)).toFixed(2));
      }
    }
  }

  return {
    strategyName: config.type,
    totalTrades,
    winRate: Number(winRate.toFixed(1)),
    netProfitPercent: Number(netProfitPercent.toFixed(2)),
    netProfitCash: Number(netProfitCash.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    sharpeRatio: sharpe,
    sortinoRatio: sortino,
    maxConsecutiveWins: maxWins,
    maxConsecutiveLosses: maxLoss,
    buyAndHoldPercent: Number(buyAndHoldPercent.toFixed(2)),
    equityCurve,
    trades: trades.reverse(), // latest trades first
  };
}
