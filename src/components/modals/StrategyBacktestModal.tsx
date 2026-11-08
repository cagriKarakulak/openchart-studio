import React, { useState, useEffect } from 'react';
import { X, Play, TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { CandleData } from '../../types';
import { runBacktest, BacktestReport, StrategyConfig, StrategyType } from '../../services/backtestEngine';

interface StrategyBacktestModalProps {
  isOpen: boolean;
  symbol: string;
  timeframe: string;
  candles: CandleData[];
  onClose: () => void;
}

export const StrategyBacktestModal: React.FC<StrategyBacktestModalProps> = ({
  isOpen,
  symbol,
  timeframe,
  candles,
  onClose,
}) => {
  const [strategyType, setStrategyType] = useState<StrategyType>('EMA_CROSS');
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [report, setReport] = useState<BacktestReport | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (isOpen && candles.length > 0) {
      handleRun();
    }
  }, [isOpen, strategyType, symbol, timeframe]);

  const handleRun = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const config: StrategyConfig = {
        type: strategyType,
        params: strategyType === 'EMA_CROSS' 
          ? { fast: 9, slow: 21 } 
          : strategyType === 'RSI_REVERSAL' 
          ? { period: 14, oversold: 30, overbought: 70 } 
          : strategyType === 'SUPERTREND_FOLLOW'
          ? { period: 10, multiplier: 3 }
          : strategyType === 'MACD_CROSS'
          ? { fast: 12, slow: 26, signal: 9 }
          : { period: 20, multiplier: 2 },
        makerFee: 0.0002, // 0.02%
        takerFee: 0.0005, // 0.05%
        slippage: 0.0003, // 0.03%
        allowShort: true,
      };

      const res = runBacktest(candles, config, initialCapital);
      setReport(res);
      setIsCalculating(false);
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-tv-surface border border-tv-border rounded-lg shadow-2xl w-full max-w-3xl flex flex-col h-[560px] overflow-hidden text-tv-text text-xs"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 border-b border-tv-border px-4 flex items-center justify-between bg-tv-surface">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white text-sm">Strateji & Backtest Simülatörü</span>
            <span className="text-[10px] bg-tv-blue/20 text-tv-blue px-2 py-0.5 rounded font-mono font-bold">
              {symbol} ({timeframe})
            </span>
            <span className="text-[10px] bg-tv-green/20 text-tv-green px-2 py-0.5 rounded font-mono">
              Sıfır Veri Sızıntısı & Komisyon Dahil
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Strategy Controls Bar */}
        <div className="p-3 border-b border-tv-border bg-tv-bg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div>
              <label className="text-[10px] text-tv-muted block mb-0.5">Strateji Modeli</label>
              <select
                value={strategyType}
                onChange={(e: any) => setStrategyType(e.target.value)}
                className="bg-tv-surface border border-tv-border rounded px-2.5 py-1 text-white text-xs focus:outline-none focus:border-tv-blue"
              >
                <option value="EMA_CROSS">EMA Kesişimi (Golden / Death Cross 9-21)</option>
                <option value="RSI_REVERSAL">RSI Aşırı Satım Dönüşü (Oversold 30-70)</option>
                <option value="SUPERTREND_FOLLOW">Supertrend Trend Takip Stratejisi</option>
                <option value="MACD_CROSS">MACD Sinyal Kesişimi (12, 26, 9)</option>
                <option value="BOLLINGER_REVERSAL">Bollinger Bantları Ortalama Dönüş</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-tv-muted block mb-0.5">Başlangıç Bakiyesi ($)</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 1000)}
                className="w-24 bg-tv-surface border border-tv-border rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-tv-blue"
              />
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={isCalculating}
            className="px-3 py-1.5 bg-tv-blue hover:bg-tv-blue/90 text-white font-medium rounded flex items-center space-x-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isCalculating ? 'Hesaplanıyor...' : 'Yeniden Simüle Et'}</span>
          </button>
        </div>

        {/* Performance Metrics Cards */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 border-b border-tv-border bg-tv-surface/40">
            <div className="p-2 rounded bg-tv-card border border-tv-border">
              <div className="text-[10px] text-tv-muted">Net Getiri</div>
              <div className={`text-base font-bold font-mono ${report.netProfitPercent >= 0 ? 'text-tv-green' : 'text-tv-red'}`}>
                {report.netProfitPercent >= 0 ? '+' : ''}{report.netProfitPercent}%
              </div>
            </div>

            <div className="p-2 rounded bg-tv-card border border-tv-border">
              <div className="text-[10px] text-tv-muted">Kazanma Oranı (Win Rate)</div>
              <div className="text-base font-bold font-mono text-white">
                %{report.winRate}
              </div>
            </div>

            <div className="p-2 rounded bg-tv-card border border-tv-border">
              <div className="text-[10px] text-tv-muted">Kar Faktörü (Profit Factor)</div>
              <div className="text-base font-bold font-mono text-tv-blue">
                {report.profitFactor}
              </div>
            </div>

            <div className="p-2 rounded bg-tv-card border border-tv-border">
              <div className="text-[10px] text-tv-muted">Maks. Düşüş (Max DD)</div>
              <div className="text-base font-bold font-mono text-tv-red">
                %{report.maxDrawdown}
              </div>
            </div>

            <div className="p-2 rounded bg-tv-card border border-tv-border">
              <div className="text-[10px] text-tv-muted">Toplam İşlem</div>
              <div className="text-base font-bold font-mono text-white">
                {report.totalTrades}
              </div>
            </div>
          </div>
        )}

        {/* Trade Logs Table */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-[11px] font-bold text-tv-muted uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Geçmiş İşlem Kayıtları ({report?.trades.length || 0})</span>
            <span className="text-[10px] font-normal normal-case text-tv-muted">
              Giriş/Çıkışlar komisyon ve likidite kayması (slippage) düşülerek hesaplanmıştır.
            </span>
          </div>

          {report && report.trades.length === 0 ? (
            <div className="text-center py-12 text-tv-muted">
              Seçilen periyotta sinyal üreten işlem gerçekleşmedi.
            </div>
          ) : (
            <div className="border border-tv-border rounded overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-tv-card border-b border-tv-border text-tv-muted font-mono text-[10px]">
                    <th className="p-2">Giriş Zamanı</th>
                    <th className="p-2">Yön</th>
                    <th className="p-2">Giriş Fiyatı</th>
                    <th className="p-2">Çıkış Fiyatı</th>
                    <th className="p-2">Net Kar (%)</th>
                    <th className="p-2 text-right">Net Getiri ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tv-border/40 font-mono">
                  {report?.trades.map((trade, idx) => {
                    const isWin = trade.pnlPercent > 0;
                    return (
                      <tr key={idx} className="hover:bg-tv-hover/40 transition-colors">
                        <td className="p-2 text-tv-text">
                          {new Date(trade.entryTime * 1000).toLocaleString('tr-TR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-tv-green/20 text-tv-green">
                            LONG
                          </span>
                        </td>
                        <td className="p-2 text-white">${trade.entryPrice.toLocaleString()}</td>
                        <td className="p-2 text-white">${trade.exitPrice.toLocaleString()}</td>
                        <td className={`p-2 font-bold ${isWin ? 'text-tv-green' : 'text-tv-red'}`}>
                          {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent}%
                        </td>
                        <td className={`p-2 text-right font-bold ${isWin ? 'text-tv-green' : 'text-tv-red'}`}>
                          {trade.pnlNet >= 0 ? '+' : ''}${trade.pnlNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

