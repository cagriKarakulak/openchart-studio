import React, { useState } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface CompareModalProps {
  isOpen: boolean;
  currentSymbol: string;
  activeOverlay?: string;
  onClose: () => void;
  onSelectOverlay: (symbol: string | null) => void;
}

const POPULAR_COMPARE_SYMBOLS = [
  { symbol: 'ETHUSDT', name: 'Ethereum / TetherUS' },
  { symbol: 'BTCUSDT', name: 'Bitcoin / TetherUS' },
  { symbol: 'SOLUSDT', name: 'Solana / TetherUS' },
  { symbol: 'BNBUSDT', name: 'BNB / TetherUS' },
  { symbol: 'XRPUSDT', name: 'Ripple / TetherUS' },
  { symbol: 'AVAXUSDT', name: 'Avalanche / TetherUS' },
  { symbol: 'EURUSD', name: 'Euro / US Dollar' },
  { symbol: 'XAUUSD', name: 'Gold / US Dollar' },
];

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  currentSymbol,
  activeOverlay,
  onClose,
  onSelectOverlay,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = POPULAR_COMPARE_SYMBOLS.filter(s => 
    s.symbol !== currentSymbol &&
    (s.symbol.toLowerCase().includes(search.toLowerCase()) || 
     s.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-tv-surface border border-tv-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-tv-text text-xs"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-11 border-b border-tv-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-bold text-white text-sm">
            <Plus className="w-4 h-4 text-tv-blue" />
            <span>{t.modals.compareTitle} ({currentSymbol} {t.modals.compareWith})</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-tv-border bg-tv-bg flex items-center space-x-2">
          <Search className="w-4 h-4 text-tv-muted" />
          <input
            type="text"
            placeholder={t.modals.compareSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white focus:outline-none placeholder-tv-muted uppercase"
            autoFocus
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto divide-y divide-tv-border/30 p-2">
          {activeOverlay && (
            <div className="p-2 mb-2 bg-tv-card rounded border border-tv-border flex items-center justify-between">
              <span className="text-white font-medium">{t.modals.activeCompare} <strong className="text-tv-blue">{activeOverlay}</strong></span>
              <button
                onClick={() => {
                  onSelectOverlay(null);
                  onClose();
                }}
                className="px-2 py-0.5 rounded bg-tv-red/20 text-tv-red hover:bg-tv-red hover:text-white text-[11px]"
              >
                {t.modals.removeCompareBtn}
              </button>
            </div>
          )}

          {filtered.map(s => {
            const isSelected = s.symbol === activeOverlay;
            return (
              <div
                key={s.symbol}
                onClick={() => {
                  onSelectOverlay(s.symbol);
                  onClose();
                }}
                className={`p-2.5 hover:bg-tv-hover rounded flex items-center justify-between cursor-pointer group ${
                  isSelected ? 'bg-tv-blue/15 text-tv-blue font-bold' : ''
                }`}
              >
                <div>
                  <div className="font-bold text-white text-xs">{s.symbol}</div>
                  <div className="text-[10px] text-tv-muted">{s.name}</div>
                </div>
                {isSelected ? (
                  <Check className="w-4 h-4 text-tv-blue" />
                ) : (
                  <span className="text-tv-blue text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.modals.addToChartCompare}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

