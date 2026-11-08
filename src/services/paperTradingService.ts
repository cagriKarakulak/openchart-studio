import { PaperPosition } from '../types';

export interface TradeHistory {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  pnlPercent: number;
  exitReason?: 'manual' | 'take_profit' | 'stop_loss';
  timestamp: number;
}

export interface PaperAccount {
  balance: number;
  positions: PaperPosition[];
  history: TradeHistory[];
}

const STORAGE_KEY = 'openchart_paper_account_v1';
const DEFAULT_BALANCE = 100000;
const TAKER_FEE_RATE = 0.0005; // 0.05%
const SLIPPAGE_RATE = 0.0002;  // 0.02%

export class PaperTradingService {
  private static instance: PaperTradingService;

  private constructor() {}

  public static getInstance(): PaperTradingService {
    if (!PaperTradingService.instance) {
      PaperTradingService.instance = new PaperTradingService();
    }
    return PaperTradingService.instance;
  }

  public getAccount(): PaperAccount {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          balance: typeof parsed.balance === 'number' ? parsed.balance : DEFAULT_BALANCE,
          positions: Array.isArray(parsed.positions) ? parsed.positions : [],
          history: Array.isArray(parsed.history) ? parsed.history : [],
        };
      }
    } catch (_) {}

    return {
      balance: DEFAULT_BALANCE,
      positions: [],
      history: [],
    };
  }

  public saveAccount(account: PaperAccount): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
      window.dispatchEvent(new Event('openchart_paper_update'));
    } catch (_) {}
  }

  public openPosition(
    symbol: string,
    side: 'long' | 'short',
    qty: number,
    price: number,
    takeProfit?: number,
    stopLoss?: number
  ): { success: boolean; message: string; position?: PaperPosition } {
    if (qty <= 0 || price <= 0) {
      return { success: false, message: 'Geçersiz miktar veya fiyat.' };
    }

    const account = this.getAccount();
    const fillPrice = side === 'long' 
      ? price * (1 + SLIPPAGE_RATE) 
      : price * (1 - SLIPPAGE_RATE);
    
    const notional = qty * fillPrice;
    const fee = notional * TAKER_FEE_RATE;
    const totalCost = notional + fee;

    if (totalCost > account.balance) {
      return { success: false, message: 'Yetersiz bakiye! İşlem açılamadı.' };
    }

    const newPosition: PaperPosition = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      symbol,
      side,
      entryPrice: Number(fillPrice.toFixed(2)),
      qty,
      timestamp: Date.now(),
      takeProfit: takeProfit !== undefined && takeProfit > 0 ? Number(takeProfit.toFixed(2)) : undefined,
      stopLoss: stopLoss !== undefined && stopLoss > 0 ? Number(stopLoss.toFixed(2)) : undefined,
    };

    account.balance -= fee;
    account.positions = [newPosition, ...account.positions];
    this.saveAccount(account);

    return {
      success: true,
      message: `${symbol} için ${side.toUpperCase()} ${qty} adet pozisyon açıldı. (Giriş: $${fillPrice.toFixed(2)})`,
      position: newPosition,
    };
  }

  public closePosition(
    id: string,
    currentPrice: number,
    exitReason: 'manual' | 'take_profit' | 'stop_loss' = 'manual'
  ): { success: boolean; closedTrade?: TradeHistory; message: string } {
    const account = this.getAccount();
    const posIndex = account.positions.findIndex(p => p.id === id);
    if (posIndex === -1) {
      return { success: false, message: 'Pozisyon bulunamadı.' };
    }

    const pos = account.positions[posIndex];
    if (currentPrice <= 0 || pos.entryPrice <= 0 || pos.qty <= 0) {
      return { success: false, message: 'Geçersiz fiyat veya pozisyon verisi.' };
    }

    const fillPrice = pos.side === 'long'
      ? currentPrice * (1 - SLIPPAGE_RATE)
      : currentPrice * (1 + SLIPPAGE_RATE);

    const grossPnl = pos.side === 'long'
      ? (fillPrice - pos.entryPrice) * pos.qty
      : (pos.entryPrice - fillPrice) * pos.qty;

    const exitFee = (fillPrice * pos.qty) * TAKER_FEE_RATE;
    const netPnl = grossPnl - exitFee;
    const pnlPercent = pos.entryPrice > 0 ? (grossPnl / (pos.entryPrice * pos.qty)) * 100 : 0;

    const trade: TradeHistory = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice: Number(fillPrice.toFixed(2)),
      qty: pos.qty,
      pnl: Number(netPnl.toFixed(2)),
      pnlPercent: Number(pnlPercent.toFixed(2)),
      exitReason,
      timestamp: Date.now(),
    };

    account.balance += netPnl;
    account.positions.splice(posIndex, 1);
    account.history = [trade, ...account.history];
    this.saveAccount(account);

    const reasonLabel = exitReason === 'take_profit' ? 'Kâr Al (TP)' : exitReason === 'stop_loss' ? 'Zarar Durdur (SL)' : 'Manuel';
    return {
      success: true,
      closedTrade: trade,
      message: `${pos.symbol} pozisyonu ${reasonLabel} ile kapatıldı. Net K/Z: ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}`,
    };
  }

  public updatePositionTpSl(
    id: string,
    updates: { takeProfit?: number; stopLoss?: number }
  ): boolean {
    const account = this.getAccount();
    const pos = account.positions.find(p => p.id === id);
    if (!pos) return false;

    if (updates.takeProfit !== undefined) {
      pos.takeProfit = updates.takeProfit > 0 ? Number(updates.takeProfit.toFixed(2)) : undefined;
    }
    if (updates.stopLoss !== undefined) {
      pos.stopLoss = updates.stopLoss > 0 ? Number(updates.stopLoss.toFixed(2)) : undefined;
    }

    this.saveAccount(account);
    return true;
  }

  public evaluateTpSl(priceMap: Map<string, number>): TradeHistory[] {
    const account = this.getAccount();
    if (account.positions.length === 0) return [];

    const triggeredTrades: TradeHistory[] = [];
    const remainingPositions: PaperPosition[] = [];

    for (const pos of account.positions) {
      const curPrice = priceMap.get(pos.symbol);
      if (!curPrice) {
        remainingPositions.push(pos);
        continue;
      }

      let triggeredReason: 'take_profit' | 'stop_loss' | null = null;
      let targetExitPrice = curPrice;

      if (pos.side === 'long') {
        if (pos.takeProfit && curPrice >= pos.takeProfit) {
          triggeredReason = 'take_profit';
          targetExitPrice = pos.takeProfit;
        } else if (pos.stopLoss && curPrice <= pos.stopLoss) {
          triggeredReason = 'stop_loss';
          targetExitPrice = pos.stopLoss;
        }
      } else {
        if (pos.takeProfit && curPrice <= pos.takeProfit) {
          triggeredReason = 'take_profit';
          targetExitPrice = pos.takeProfit;
        } else if (pos.stopLoss && curPrice >= pos.stopLoss) {
          triggeredReason = 'stop_loss';
          targetExitPrice = pos.stopLoss;
        }
      }

      if (triggeredReason) {
        const grossPnl = pos.side === 'long'
          ? (targetExitPrice - pos.entryPrice) * pos.qty
          : (pos.entryPrice - targetExitPrice) * pos.qty;
        const exitFee = (targetExitPrice * pos.qty) * TAKER_FEE_RATE;
        const netPnl = grossPnl - exitFee;
        const pnlPct = pos.entryPrice > 0 ? (grossPnl / (pos.entryPrice * pos.qty)) * 100 : 0;

        const trade: TradeHistory = {
          id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          symbol: pos.symbol,
          side: pos.side,
          entryPrice: pos.entryPrice,
          exitPrice: Number(targetExitPrice.toFixed(2)),
          qty: pos.qty,
          pnl: Number(netPnl.toFixed(2)),
          pnlPercent: Number(pnlPct.toFixed(2)),
          exitReason: triggeredReason,
          timestamp: Date.now(),
        };

        account.balance += netPnl;
        account.history = [trade, ...account.history];
        triggeredTrades.push(trade);
      } else {
        remainingPositions.push(pos);
      }
    }

    if (triggeredTrades.length > 0) {
      account.positions = remainingPositions;
      this.saveAccount(account);
    }

    return triggeredTrades;
  }

  public resetAccount(): void {
    const account: PaperAccount = {
      balance: DEFAULT_BALANCE,
      positions: [],
      history: [],
    };
    this.saveAccount(account);
  }
}

export const paperTradingService = PaperTradingService.getInstance();

