import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, ShieldCheck, Target, DollarSign, Percent } from 'lucide-react';
import { paperTradingService } from '../../services/paperTradingService';
import { soundService } from '../../services/sound';
import { useTranslation } from '../../i18n';

interface OrderModalProps {
  isOpen: boolean;
  symbol: string;
  currentPrice: number;
  initialPrice?: number;
  initialSide?: 'long' | 'short';
  onClose: () => void;
  onOrderPlaced?: () => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  symbol,
  currentPrice,
  initialPrice,
  initialSide = 'long',
  onClose,
  onOrderPlaced,
}) => {
  const { t } = useTranslation();
  const [side, setSide] = useState<'long' | 'short'>(initialSide);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [limitPrice, setLimitPrice] = useState<number>(initialPrice ?? currentPrice);
  const [qty, setQty] = useState<number>(0.1);
  const [enableTp, setEnableTp] = useState(true);
  const [enableSl, setEnableSl] = useState(true);
  const [tpPrice, setTpPrice] = useState<number>(0);
  const [slPrice, setSlPrice] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialSide) setSide(initialSide);
  }, [initialSide]);

  useEffect(() => {
    const basePrice = initialPrice ?? currentPrice;
    setLimitPrice(basePrice);
    if (basePrice > 0) {
      if (side === 'long') {
        setTpPrice(Number((basePrice * 1.03).toFixed(2))); // +3% default TP
        setSlPrice(Number((basePrice * 0.985).toFixed(2))); // -1.5% default SL (2:1 R:R)
      } else {
        setTpPrice(Number((basePrice * 0.97).toFixed(2))); // -3% default TP for short
        setSlPrice(Number((basePrice * 1.015).toFixed(2))); // +1.5% default SL for short
      }
    }
  }, [initialPrice, currentPrice, side, isOpen]);

  if (!isOpen) return null;

  const activeExecutionPrice = orderType === 'market' ? currentPrice : limitPrice;
  const orderValue = qty * activeExecutionPrice;

  // Quant calculation of TP / SL estimated PnL and Risk:Reward ratio
  let estimatedTpPnl = 0;
  let estimatedSlLoss = 0;
  let riskRewardRatio = '1 : 2.0';

  if (activeExecutionPrice > 0 && qty > 0) {
    if (side === 'long') {
      if (enableTp && tpPrice > activeExecutionPrice) {
        estimatedTpPnl = (tpPrice - activeExecutionPrice) * qty;
      }
      if (enableSl && slPrice < activeExecutionPrice && slPrice > 0) {
        estimatedSlLoss = (activeExecutionPrice - slPrice) * qty;
      }
    } else {
      if (enableTp && tpPrice < activeExecutionPrice && tpPrice > 0) {
        estimatedTpPnl = (activeExecutionPrice - tpPrice) * qty;
      }
      if (enableSl && slPrice > activeExecutionPrice) {
        estimatedSlLoss = (slPrice - activeExecutionPrice) * qty;
      }
    }

    if (estimatedSlLoss > 0 && estimatedTpPnl > 0) {
      const rr = estimatedTpPnl / estimatedSlLoss;
      riskRewardRatio = `1 : ${rr.toFixed(2)}`;
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (qty <= 0) {
      setErrorMsg(t.common.error);
      return;
    }
    if (activeExecutionPrice <= 0) {
      setErrorMsg(t.common.error);
      return;
    }

    const finalTp = enableTp && tpPrice > 0 ? tpPrice : undefined;
    const finalSl = enableSl && slPrice > 0 ? slPrice : undefined;

    const res = paperTradingService.openPosition(
      symbol,
      side,
      qty,
      activeExecutionPrice,
      finalTp,
      finalSl
    );

    if (res.success) {
      soundService.playAlertSound();
      onOrderPlaced?.();
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div 
        className="bg-tv-surface border border-tv-border rounded-lg shadow-2xl w-full max-w-sm overflow-hidden text-tv-text text-xs animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-11 border-b border-tv-border px-4 flex items-center justify-between bg-tv-bg">
          <div className="flex items-center space-x-2 font-bold text-white text-sm">
            <span>{symbol}</span>
            <span className="font-mono text-tv-blue text-xs">${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Long / Short Selector */}
        <div className="grid grid-cols-2 p-3 gap-2 border-b border-tv-border">
          <button
            type="button"
            onClick={() => setSide('long')}
            className={`py-2 rounded font-bold flex items-center justify-center space-x-1.5 transition-colors ${
              side === 'long' ? 'bg-tv-green text-white shadow-lg shadow-tv-green/30' : 'bg-tv-card text-tv-muted hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{t.bottomDock.buyLong}</span>
          </button>
          <button
            type="button"
            onClick={() => setSide('short')}
            className={`py-2 rounded font-bold flex items-center justify-center space-x-1.5 transition-colors ${
              side === 'short' ? 'bg-tv-red text-white shadow-lg shadow-tv-red/30' : 'bg-tv-card text-tv-muted hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>{t.bottomDock.sellShort}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Order Type Tabs */}
          <div className="flex rounded bg-tv-bg p-0.5 border border-tv-border">
            <button
              type="button"
              onClick={() => setOrderType('limit')}
              className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                orderType === 'limit' ? 'bg-tv-card text-white font-bold' : 'text-tv-muted hover:text-white'
              }`}
            >
              {t.modals.orderTypeLimit}
            </button>
            <button
              type="button"
              onClick={() => setOrderType('market')}
              className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                orderType === 'market' ? 'bg-tv-card text-white font-bold' : 'text-tv-muted hover:text-white'
              }`}
            >
              {t.modals.orderTypeMarket}
            </button>
          </div>

          {/* Limit Price Input */}
          {orderType === 'limit' && (
            <div>
              <label className="text-tv-muted block mb-1">{t.modals.limitPrice}</label>
              <input
                type="number"
                step="any"
                value={limitPrice}
                onChange={e => setLimitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-tv-bg border border-tv-border rounded px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-tv-blue"
                required
              />
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-tv-muted">{t.modals.orderQtyLabel}</label>
              <span className="text-[10px] text-tv-muted font-mono">
                {t.modals.estimatedValue} ~${orderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <input
              type="number"
              step="any"
              value={qty}
              onChange={e => setQty(parseFloat(e.target.value) || 0)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-tv-blue"
              required
            />
          </div>

          {/* Take Profit Toggle & Input */}
          <div className="border border-tv-border/70 rounded p-2.5 bg-tv-bg/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTp}
                  onChange={e => setEnableTp(e.target.checked)}
                  className="rounded border-tv-border text-tv-green focus:ring-0"
                />
                <span className="font-semibold text-tv-green flex items-center space-x-1">
                  <Target className="w-3.5 h-3.5" />
                  <span>{t.modals.takeProfit}</span>
                </span>
              </label>
              {enableTp && estimatedTpPnl > 0 && (
                <span className="text-[11px] font-mono font-bold text-tv-green">
                  +${estimatedTpPnl.toFixed(2)}
                </span>
              )}
            </div>

            {enableTp && (
              <input
                type="number"
                step="any"
                value={tpPrice}
                onChange={e => setTpPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-tv-bg border border-tv-green/40 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-tv-green"
                placeholder={t.modals.targetPriceLabel}
              />
            )}
          </div>

          {/* Stop Loss Toggle & Input */}
          <div className="border border-tv-border/70 rounded p-2.5 bg-tv-bg/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSl}
                  onChange={e => setEnableSl(e.target.checked)}
                  className="rounded border-tv-border text-tv-red focus:ring-0"
                />
                <span className="font-semibold text-tv-red flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.modals.stopLoss}</span>
                </span>
              </label>
              {enableSl && estimatedSlLoss > 0 && (
                <span className="text-[11px] font-mono font-bold text-tv-red">
                  -${estimatedSlLoss.toFixed(2)}
                </span>
              )}
            </div>

            {enableSl && (
              <input
                type="number"
                step="any"
                value={slPrice}
                onChange={e => setSlPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-tv-bg border border-tv-red/40 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-tv-red"
                placeholder={t.modals.stopLoss}
              />
            )}
          </div>

          {/* Risk / Reward badge */}
          {enableTp && enableSl && estimatedSlLoss > 0 && estimatedTpPnl > 0 && (
            <div className="flex items-center justify-between px-2 py-1 bg-tv-card rounded text-[11px]">
              <span className="text-tv-muted">{t.modals.riskRewardLabel}</span>
              <span className="font-mono font-bold text-tv-blue">{riskRewardRatio}</span>
            </div>
          )}

          {errorMsg && (
            <div className="text-[11px] text-tv-red bg-tv-red/10 border border-tv-red/30 p-2 rounded">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-2.5 rounded font-bold text-white transition-opacity shadow-lg ${
              side === 'long' ? 'bg-tv-green hover:opacity-90' : 'bg-tv-red hover:opacity-90'
            }`}
          >
            {side === 'long' ? t.modals.openLongBtn : t.modals.openShortBtn}
          </button>
        </form>
      </div>
    </div>
  );
};

