import { CandleData, Timeframe, WatchlistItem } from '../types';
import { sanitizeCandles } from '../indicators/math';
import { timeframeToSeconds, resampleCandles } from './multiTimeframeService';

export { timeframeToSeconds };

export type KlineCallback = (candle: CandleData, isClosed: boolean) => void;
export type TickerCallback = (items: WatchlistItem[]) => void;

export const BINANCE_NATIVE_INTERVALS = new Set([
  '1s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'
]);

// Binance interval mapper: maps native or finds optimal underlying base interval
export function toBinanceInterval(tf: Timeframe | string): string {
  if (BINANCE_NATIVE_INTERVALS.has(tf)) {
    return tf;
  }
  const sec = timeframeToSeconds(tf);
  if (sec < 60) return '1s';
  if (sec < 180) return '1m';
  if (sec < 900) return '3m';
  if (sec < 3600) return '5m';
  if (sec < 14400) return '1h';
  if (sec < 86400) return '4h';
  if (sec < 2592000) return '1d';
  return '1M';
}

class MarketDataService {
  private activeWsMap: Map<string, WebSocket> = new Map();
  private reconnectTimers: Map<string, any> = new Map();
  private simulationTimers: Map<string, any> = new Map();
  private lastKnownCandles: Map<string, CandleData> = new Map();
  private requestQueue: (() => Promise<void>)[] = [];
  private isProcessingQueue: boolean = false;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 250; // Leaky bucket: 4 requests/sec limit
  private cached24hTickers: any[] | null = null;
  private last24hFetchTime: number = 0;

  // Rate-limited fetch wrapper with exponential backoff retry
  private async safeFetch(url: string, retries = 3): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        let attempt = 0;
        let lastError: any = null;

        while (attempt < retries) {
          try {
            const now = Date.now();
            const elapsed = now - this.lastRequestTime;
            if (elapsed < this.minRequestInterval) {
              await new Promise(r => setTimeout(r, this.minRequestInterval - elapsed));
            }
            this.lastRequestTime = Date.now();

            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            resolve(data);
            return;
          } catch (err) {
            lastError = err;
            attempt++;
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(r => setTimeout(r, backoffMs));
          }
        }
        reject(lastError);
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const task = this.requestQueue.shift();
      if (task) {
        try {
          await task();
        } catch (e) {
          console.warn('Queue task failed', e);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  // Fetch historical klines with multi-batch pagination (loads 2000 bars by default)
  public async fetchHistoricalCandles(
    symbol: string, 
    timeframe: Timeframe | string, 
    targetCount: number = 2000
  ): Promise<CandleData[]> {
    const isNative = BINANCE_NATIVE_INTERVALS.has(timeframe);
    const interval = toBinanceInterval(timeframe);
    const cleanSymbol = symbol.toUpperCase().replace('/', '');

    try {
      let accumulatedRaw: CandleData[] = [];
      let currentEndTimeMs: number | undefined = undefined;
      const batchSize = 1000;
      const neededCount = isNative 
        ? targetCount 
        : Math.min(3000, targetCount * Math.max(1, Math.round(timeframeToSeconds(timeframe) / timeframeToSeconds(interval))));
      const batchesNeeded = Math.min(5, Math.ceil(neededCount / batchSize));

      for (let b = 0; b < batchesNeeded; b++) {
        const fetchLimit = Math.min(batchSize, neededCount - accumulatedRaw.length);
        if (fetchLimit <= 0) break;

        let url = `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${fetchLimit}`;
        if (currentEndTimeMs !== undefined) {
          url += `&endTime=${currentEndTimeMs}`;
        }

        const data = await this.safeFetch(url);
        if (!Array.isArray(data) || data.length === 0) {
          break;
        }

        const batchCandles: CandleData[] = data.map((item: any[]) => ({
          time: Math.floor(item[0] / 1000), // convert ms to seconds
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5]),
        }));

        // Batch candles are in chronological order: [oldest ... newest]
        accumulatedRaw = [...batchCandles, ...accumulatedRaw];

        // Prepare endTime for next earlier batch
        currentEndTimeMs = (batchCandles[0].time * 1000) - 1;

        if (data.length < fetchLimit) {
          break;
        }
      }

      let clean = sanitizeCandles(accumulatedRaw);
      if (!isNative && clean.length > 0) {
        clean = resampleCandles(clean, timeframe);
      }

      if (clean.length > 0) {
        this.lastKnownCandles.set(`${cleanSymbol}_${timeframe}`, clean[clean.length - 1]);
        return clean;
      }
    } catch (err) {
      console.warn(`Binance REST failed for ${cleanSymbol}, activating synthetic fallback data.`, err);
    }

    // Fallback: Generate realistic GBM historical candles
    return this.generateSyntheticCandles(cleanSymbol, timeframe as any, targetCount);
  }

  // Fetch earlier historical candles for infinite scroll backwards
  public async fetchEarlierCandles(
    symbol: string,
    timeframe: Timeframe | string,
    beforeTimeSec: number,
    limit: number = 1000
  ): Promise<CandleData[]> {
    const isNative = BINANCE_NATIVE_INTERVALS.has(timeframe);
    const interval = toBinanceInterval(timeframe);
    const cleanSymbol = symbol.toUpperCase().replace('/', '');

    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}&endTime=${beforeTimeSec * 1000 - 1}`;
      const data = await this.safeFetch(url);
      if (Array.isArray(data)) {
        const raw = data.map((item: any[]) => ({
          time: Math.floor(item[0] / 1000),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5]),
        }));
        let clean = sanitizeCandles(raw);
        if (!isNative && clean.length > 0) {
          clean = resampleCandles(clean, timeframe);
        }
        return clean;
      }
    } catch (err) {
      console.error(`Failed to fetch earlier candles for ${cleanSymbol}`, err);
    }
    return [];
  }

  // Subscribe to live klines via WebSocket
  public subscribeKline(
    symbol: string, 
    timeframe: Timeframe, 
    onUpdate: KlineCallback,
    onStatusChange?: (status: 'connected' | 'reconnecting' | 'simulated') => void
  ): () => void {
    const cleanSymbol = symbol.toUpperCase().replace('/', '');
    const interval = toBinanceInterval(timeframe);
    const channelKey = `${cleanSymbol}_${timeframe}`;

    // Clean up existing subscription
    this.unsubscribeKline(channelKey);

    const wsUrl = `wss://stream.binance.com:9443/ws/${cleanSymbol.toLowerCase()}@kline_${interval}`;
    let ws: WebSocket | null = null;
    let isTerminated = false;
    let reconnectAttempts = 0;
    let heartbeatTimer: any = null;

    const connect = () => {
      if (isTerminated) return;

      try {
        ws = new WebSocket(wsUrl);
        this.activeWsMap.set(channelKey, ws);

        ws.onopen = () => {
          reconnectAttempts = 0;
          if (onStatusChange) onStatusChange('connected');

          // Heartbeat check every 30s
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          heartbeatTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              // WebSocket ping
              try { ws.send(JSON.stringify({ ping: Date.now() })); } catch (_) {}
            }
          }, 30000);
        };

        const isNativeTf = BINANCE_NATIVE_INTERVALS.has(timeframe);
        const targetSec = timeframeToSeconds(timeframe);
        let currentBucketTime = -1;
        let bucketOpen = 0;
        let bucketHigh = -Infinity;
        let bucketLow = Infinity;
        let bucketVol = 0;

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.e === 'kline') {
              const k = msg.k;
              const rawTime = Math.floor(k.t / 1000);
              const o = parseFloat(k.o);
              const h = parseFloat(k.h);
              const l = parseFloat(k.l);
              const c = parseFloat(k.c);
              const v = parseFloat(k.v);

              if (isNativeTf) {
                const candle: CandleData = {
                  time: rawTime,
                  open: o,
                  high: h,
                  low: l,
                  close: c,
                  volume: v,
                };
                this.lastKnownCandles.set(channelKey, candle);
                onUpdate(candle, k.x);
              } else {
                // Real-time dynamic candle aggregator for custom or non-native timeframes
                const bTime = Math.floor(rawTime / targetSec) * targetSec;
                if (bTime !== currentBucketTime) {
                  currentBucketTime = bTime;
                  bucketOpen = o;
                  bucketHigh = h;
                  bucketLow = l;
                  bucketVol = v;
                } else {
                  if (h > bucketHigh) bucketHigh = h;
                  if (l < bucketLow) bucketLow = l;
                  bucketVol += (k.x ? v : 0);
                }

                const resampledCandle: CandleData = {
                  time: bTime,
                  open: bucketOpen,
                  high: Math.max(bucketHigh, h),
                  low: Math.min(bucketLow, l),
                  close: c,
                  volume: bucketVol,
                };
                const isBarClosed = rawTime + (k.x ? timeframeToSeconds(interval) : 0) >= bTime + targetSec;
                this.lastKnownCandles.set(channelKey, resampledCandle);
                onUpdate(resampledCandle, isBarClosed);
              }
            }
          } catch (e) {
            console.error('Error parsing WS message', e);
          }
        };

        ws.onerror = (e) => {
          console.warn(`WebSocket error for ${channelKey}, falling back to synthetic generator`, e);
          ws?.close();
        };

        ws.onclose = () => {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          if (isTerminated) return;

          reconnectAttempts++;
          if (onStatusChange) onStatusChange('reconnecting');

          if (reconnectAttempts > 3) {
            // Activate simulation if repeated disconnects
            if (onStatusChange) onStatusChange('simulated');
            this.startSimulation(cleanSymbol, timeframe, onUpdate);
            return;
          }

          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
          const timer = setTimeout(connect, delay);
          this.reconnectTimers.set(channelKey, timer);
        };
      } catch (err) {
        console.warn('WebSocket init exception, starting simulation', err);
        if (onStatusChange) onStatusChange('simulated');
        this.startSimulation(cleanSymbol, timeframe, onUpdate);
      }
    };

    connect();

    // Return unsubscribe function
    return () => {
      isTerminated = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      this.unsubscribeKline(channelKey);
    };
  }

  public unsubscribeKline(channelKey: string) {
    const ws = this.activeWsMap.get(channelKey);
    if (ws) {
      try { ws.close(); } catch (_) {}
      this.activeWsMap.delete(channelKey);
    }

    const timer = this.reconnectTimers.get(channelKey);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(channelKey);
    }

    const simTimer = this.simulationTimers.get(channelKey);
    if (simTimer) {
      clearInterval(simTimer);
      this.simulationTimers.delete(channelKey);
    }
  }

  // Live 24hr Ticker update for Watchlist (High-performance targeted batch query + 3s memory cache)
  public async fetch24hTickers(symbols: string[]): Promise<Map<string, { price: number; change24h: number; high: number; low: number; volume: number }>> {
    const map = new Map<string, { price: number; change24h: number; high: number; low: number; volume: number }>();
    if (!symbols || symbols.length === 0) return map;

    try {
      const now = Date.now();
      const cleanSymbols = Array.from(new Set(
        symbols
          .map(s => s.toUpperCase().replace('/', ''))
          .filter(s => !s.startsWith('SECTION_') && (s.endsWith('USDT') || s.endsWith('BTC') || s.endsWith('ETH') || s.endsWith('BUSD') || s.endsWith('USDC')))
      ));

      let data: any = this.cached24hTickers;
      if (!data || now - this.last24hFetchTime > 3000) {
        let url = 'https://api.binance.com/api/v3/ticker/24hr';
        // If we have a specific list of 1-50 pairs, request only those to save ~500KB per call
        if (cleanSymbols.length > 0 && cleanSymbols.length <= 50) {
          url += `?symbols=${encodeURIComponent(JSON.stringify(cleanSymbols))}`;
        }

        const res = await this.safeFetch(url);
        if (Array.isArray(res)) {
          data = res;
          this.cached24hTickers = res;
          this.last24hFetchTime = now;
        } else if (res && !Array.isArray(res) && url.includes('?symbols=')) {
          // If targeted query had an issue, fallback to full list
          const fullRes = await this.safeFetch('https://api.binance.com/api/v3/ticker/24hr');
          if (Array.isArray(fullRes)) {
            data = fullRes;
            this.cached24hTickers = fullRes;
            this.last24hFetchTime = now;
          }
        }
      }

      if (Array.isArray(data)) {
        const symbolSet = new Set(cleanSymbols);
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          if (symbolSet.has(item.symbol)) {
            map.set(item.symbol, {
              price: parseFloat(item.lastPrice),
              change24h: parseFloat(item.priceChangePercent),
              high: parseFloat(item.highPrice),
              low: parseFloat(item.lowPrice),
              volume: parseFloat(item.volume),
            });
          }
        }
      }
    } catch (e) {
      console.warn('Ticker fetch failed, keeping local/cached prices', e);
    }
    return map;
  }

  // Realistic Geometric Brownian Motion Candle Generator for offline/fallback
  private generateSyntheticCandles(symbol: string, timeframe: Timeframe, count: number = 300): CandleData[] {
    const basePrices: Record<string, number> = {
      BTCUSDT: 92500,
      ETHUSDT: 3420,
      SOLUSDT: 215,
      BNBUSDT: 635,
      XRPUSDT: 1.85,
      DOGEUSDT: 0.28,
      AVAXUSDT: 36.5,
      LINKUSDT: 18.9,
    };

    let price = basePrices[symbol] || 100;
    const tfSeconds = timeframeToSeconds(timeframe);
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - (count * tfSeconds);

    const candles: CandleData[] = [];
    const volatility = 0.002;

    for (let i = 0; i < count; i++) {
      const time = startTime + (i * tfSeconds);
      const changePercent = (Math.random() - 0.49) * volatility;
      const open = price;
      const close = open * (1 + changePercent);
      const high = Math.max(open, close) * (1 + Math.random() * 0.0015);
      const low = Math.min(open, close) * (1 - Math.random() * 0.0015);
      const volume = Math.floor(50 + Math.random() * 1000);

      price = close;

      candles.push({
        time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume,
      });
    }

    this.lastKnownCandles.set(`${symbol}_${timeframe}`, candles[candles.length - 1]);
    return candles;
  }

  // Simulation loop when WebSocket is unreachable
  private startSimulation(symbol: string, timeframe: Timeframe, onUpdate: KlineCallback) {
    const channelKey = `${symbol}_${timeframe}`;
    const tfSeconds = timeframeToSeconds(timeframe);

    let lastCandle = this.lastKnownCandles.get(channelKey) || {
      time: Math.floor(Date.now() / 1000),
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 100,
    };

    const intervalMs = Math.min(Math.max(tfSeconds * 100, 1000), 2000);

    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const candleStartTime = Math.floor(now / tfSeconds) * tfSeconds;

      const delta = (Math.random() - 0.495) * (lastCandle.close * 0.001);
      const newClose = Number((lastCandle.close + delta).toFixed(2));

      if (candleStartTime > lastCandle.time) {
        // New candle opened
        lastCandle = {
          time: candleStartTime,
          open: lastCandle.close,
          high: Math.max(lastCandle.close, newClose),
          low: Math.min(lastCandle.close, newClose),
          close: newClose,
          volume: Math.floor(10 + Math.random() * 50),
        };
        onUpdate(lastCandle, false);
      } else {
        // Update current candle
        lastCandle = {
          ...lastCandle,
          high: Math.max(lastCandle.high, newClose),
          low: Math.min(lastCandle.low, newClose),
          close: newClose,
          volume: lastCandle.volume + Math.floor(Math.random() * 5),
        };
        onUpdate(lastCandle, false);
      }

      this.lastKnownCandles.set(channelKey, lastCandle);
    }, intervalMs);

    this.simulationTimers.set(channelKey, timer);
  }
}

export const marketDataService = new MarketDataService();
