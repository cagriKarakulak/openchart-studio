import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  TrendingUp, 
  Check, 
  Plus, 
  ExternalLink, 
  BookmarkCheck, 
  Layers, 
  Globe, 
  Coins, 
  BarChart2, 
  Briefcase, 
  Flame 
} from 'lucide-react';
import { soundService } from '../../services/sound';
import { WatchlistItem } from '../../types';
import { useTranslation } from '../../i18n';

export interface SymbolOption {
  symbol: string;
  name: string;
  category: 'Kripto' | 'BIST' | 'Hisse' | 'Forex' | 'Emtia' | 'Endeksler';
  exchange: string;
  description?: string;
}

export interface SymbolSearchModalProps {
  isOpen: boolean;
  initialSearch?: string;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
  watchlistSymbols?: string[];
  onToggleWatchlistSymbol?: (symbol: string, itemData?: Partial<WatchlistItem>) => void;
  mode?: 'select' | 'watchlist';
}

export const ALL_TRADING_SYMBOLS: SymbolOption[] = [
  // ==========================================
  // 1. KRİPTO PARALAR (Binance Spot & Futures)
  // ==========================================
  { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'Kripto', exchange: 'Binance', description: 'Bitcoin / TetherUS' },
  { symbol: 'ETHUSDT', name: 'Ethereum', category: 'Kripto', exchange: 'Binance', description: 'Ethereum / TetherUS' },
  { symbol: 'SOLUSDT', name: 'Solana', category: 'Kripto', exchange: 'Binance', description: 'Solana / TetherUS' },
  { symbol: 'BNBUSDT', name: 'BNB', category: 'Kripto', exchange: 'Binance', description: 'Build and Build / TetherUS' },
  { symbol: 'XRPUSDT', name: 'Ripple', category: 'Kripto', exchange: 'Binance', description: 'XRP / TetherUS' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', category: 'Kripto', exchange: 'Binance', description: 'Dogecoin / TetherUS' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', category: 'Kripto', exchange: 'Binance', description: 'Avalanche / TetherUS' },
  { symbol: 'SUIUSDT', name: 'Sui Network', category: 'Kripto', exchange: 'Binance', description: 'Sui / TetherUS' },
  { symbol: 'LINKUSDT', name: 'Chainlink', category: 'Kripto', exchange: 'Binance', description: 'Chainlink / TetherUS' },
  { symbol: 'ADAUSDT', name: 'Cardano', category: 'Kripto', exchange: 'Binance', description: 'Cardano / TetherUS' },
  { symbol: 'NEARUSDT', name: 'NEAR Protocol', category: 'Kripto', exchange: 'Binance', description: 'NEAR / TetherUS' },
  { symbol: 'APTUSDT', name: 'Aptos', category: 'Kripto', exchange: 'Binance', description: 'Aptos / TetherUS' },
  { symbol: 'DOTUSDT', name: 'Polkadot', category: 'Kripto', exchange: 'Binance', description: 'Polkadot / TetherUS' },
  { symbol: 'PEPEUSDT', name: 'Pepe', category: 'Kripto', exchange: 'Binance', description: 'Pepe Meme Token / TetherUS' },
  { symbol: 'RENDERUSDT', name: 'Render Token', category: 'Kripto', exchange: 'Binance', description: 'Render / TetherUS' },
  { symbol: 'INJUSDT', name: 'Injective', category: 'Kripto', exchange: 'Binance', description: 'Injective / TetherUS' },
  { symbol: 'TIAUSDT', name: 'Celestia', category: 'Kripto', exchange: 'Binance', description: 'Celestia / TetherUS' },
  { symbol: 'FETUSDT', name: 'Artificial Superintelligence', category: 'Kripto', exchange: 'Binance', description: 'FET AI Alliance / TetherUS' },
  { symbol: 'ARBUSDT', name: 'Arbitrum One', category: 'Kripto', exchange: 'Binance', description: 'Arbitrum / TetherUS' },
  { symbol: 'OPUSDT', name: 'Optimism', category: 'Kripto', exchange: 'Binance', description: 'Optimism / TetherUS' },
  { symbol: 'SHIBUSDT', name: 'Shiba Inu', category: 'Kripto', exchange: 'Binance', description: 'Shiba Inu / TetherUS' },
  { symbol: 'ATOMUSDT', name: 'Cosmos Hub', category: 'Kripto', exchange: 'Binance', description: 'Cosmos / TetherUS' },
  { symbol: 'POLUSDT', name: 'Polygon Ecosystem', category: 'Kripto', exchange: 'Binance', description: 'Polygon (MATIC) / TetherUS' },
  { symbol: 'LTCUSDT', name: 'Litecoin', category: 'Kripto', exchange: 'Binance', description: 'Litecoin / TetherUS' },
  { symbol: 'BCHUSDT', name: 'Bitcoin Cash', category: 'Kripto', exchange: 'Binance', description: 'Bitcoin Cash / TetherUS' },
  { symbol: 'KASUSDT', name: 'Kaspa', category: 'Kripto', exchange: 'Binance', description: 'Kaspa BlockDAG / TetherUS' },
  { symbol: 'UNIUSDT', name: 'Uniswap', category: 'Kripto', exchange: 'Binance', description: 'Uniswap DEX / TetherUS' },
  { symbol: 'AAVEUSDT', name: 'Aave', category: 'Kripto', exchange: 'Binance', description: 'Aave Protocol / TetherUS' },
  { symbol: 'TAOUSDT', name: 'Bittensor', category: 'Kripto', exchange: 'Binance', description: 'Bittensor AI / TetherUS' },
  { symbol: 'WIFUSDT', name: 'dogwifhat', category: 'Kripto', exchange: 'Binance', description: 'dogwifhat Solana / TetherUS' },
  { symbol: 'FLOKIUSDT', name: 'Floki', category: 'Kripto', exchange: 'Binance', description: 'Floki Inu / TetherUS' },
  { symbol: 'BONKUSDT', name: 'Bonk', category: 'Kripto', exchange: 'Binance', description: 'Bonk Solana / TetherUS' },

  // ==========================================
  // 2. BORSA İSTANBUL (BIST)
  // ==========================================
  { symbol: 'THYAO', name: 'Türk Hava Yolları', category: 'BIST', exchange: 'BIST', description: 'Türk Hava Yolları A.O.' },
  { symbol: 'GARAN', name: 'Garanti BBVA', category: 'BIST', exchange: 'BIST', description: 'Türkiye Garanti Bankası A.Ş.' },
  { symbol: 'EREGL', name: 'Erdemir', category: 'BIST', exchange: 'BIST', description: 'Ereğli Demir ve Çelik Fabrikaları' },
  { symbol: 'ASELS', name: 'Aselsan', category: 'BIST', exchange: 'BIST', description: 'Aselsan Elektronik Sanayi' },
  { symbol: 'SISE', name: 'Şişecam', category: 'BIST', exchange: 'BIST', description: 'Türkiye Şişe ve Cam Fabrikaları' },
  { symbol: 'TUPRS', name: 'Tüpraş', category: 'BIST', exchange: 'BIST', description: 'Tüpraş Türkiye Petrol Rafinerileri' },
  { symbol: 'KCHOL', name: 'Koç Holding', category: 'BIST', exchange: 'BIST', description: 'Koç Holding A.Ş.' },
  { symbol: 'BIMAS', name: 'BİM Mağazalar', category: 'BIST', exchange: 'BIST', description: 'BİM Birleşik Mağazalar A.Ş.' },
  { symbol: 'AKBNK', name: 'Akbank', category: 'BIST', exchange: 'BIST', description: 'Akbank T.A.Ş.' },
  { symbol: 'ISCTR', name: 'İş Bankası (C)', category: 'BIST', exchange: 'BIST', description: 'Türkiye İş Bankası C Grubu' },
  { symbol: 'SAHOL', name: 'Sabancı Holding', category: 'BIST', exchange: 'BIST', description: 'Hacı Ömer Sabancı Holding' },
  { symbol: 'FROTO', name: 'Ford Otosan', category: 'BIST', exchange: 'BIST', description: 'Ford Otomotiv Sanayi A.Ş.' },
  { symbol: 'PGSUS', name: 'Pegasus', category: 'BIST', exchange: 'BIST', description: 'Pegasus Hava Taşımacılığı A.Ş.' },
  { symbol: 'EKGYO', name: 'Emlak Konut', category: 'BIST', exchange: 'BIST', description: 'Emlak Konut GYO A.Ş.' },
  { symbol: 'ENKAI', name: 'Enka İnşaat', category: 'BIST', exchange: 'BIST', description: 'Enka İnşaat ve Sanayi A.Ş.' },

  // ==========================================
  // 3. ABD HİSSELERİ VE ETF'LER (Stocks)
  // ==========================================
  { symbol: 'SPY', name: 'S&P 500 ETF Trust', category: 'Hisse', exchange: 'NYSE', description: 'SPDR S&P 500 ETF Trust' },
  { symbol: 'QQQ', name: 'Invesco QQQ (Nasdaq 100)', category: 'Hisse', exchange: 'NASDAQ', description: 'Invesco QQQ Trust Series 1' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'Hisse', exchange: 'NASDAQ', description: 'NVIDIA GPU & AI Computing' },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'Hisse', exchange: 'NASDAQ', description: 'Apple Technology & Devices' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', category: 'Hisse', exchange: 'NASDAQ', description: 'Tesla EV & Clean Energy' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'Hisse', exchange: 'NASDAQ', description: 'Microsoft Software & Cloud' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', category: 'Hisse', exchange: 'NASDAQ', description: 'Amazon E-Commerce & AWS' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', category: 'Hisse', exchange: 'NASDAQ', description: 'Alphabet Class A Shares' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', category: 'Hisse', exchange: 'NASDAQ', description: 'Meta Facebook & AI' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', category: 'Hisse', exchange: 'NASDAQ', description: 'AMD Semiconductor & AI Chips' },
  { symbol: 'NFLX', name: 'Netflix, Inc.', category: 'Hisse', exchange: 'NASDAQ', description: 'Netflix Streaming Entertainment' },
  { symbol: 'COIN', name: 'Coinbase Global, Inc.', category: 'Hisse', exchange: 'NASDAQ', description: 'Coinbase Crypto Exchange' },
  { symbol: 'MSTR', name: 'MicroStrategy Inc.', category: 'Hisse', exchange: 'NASDAQ', description: 'MicroStrategy Bitcoin Treasury' },
  { symbol: 'PLTR', name: 'Palantir Technologies', category: 'Hisse', exchange: 'NYSE', description: 'Palantir Enterprise AI' },
  { symbol: 'BABA', name: 'Alibaba Group Holding', category: 'Hisse', exchange: 'NYSE', description: 'Alibaba Group ADR' },

  // ==========================================
  // 4. FOREX DÖVİZ PARİTELERİ
  // ==========================================
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'Forex', exchange: 'FX', description: 'Euro vs United States Dollar' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', category: 'Forex', exchange: 'FX', description: 'Great British Pound vs USD' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', category: 'Forex', exchange: 'FX', description: 'USD vs Japanese Yen' },
  { symbol: 'USDTRY', name: 'US Dollar / Turkish Lira', category: 'Forex', exchange: 'FX', description: 'Amerikan Doları / Türk Lirası' },
  { symbol: 'EURTRY', name: 'Euro / Turkish Lira', category: 'Forex', exchange: 'FX', description: 'Euro / Türk Lirası' },
  { symbol: 'GBPTRY', name: 'British Pound / Turkish Lira', category: 'Forex', exchange: 'FX', description: 'İngiliz Sterlini / Türk Lirası' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', category: 'Forex', exchange: 'FX', description: 'USD vs Swiss Franc' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / USD', category: 'Forex', exchange: 'FX', description: 'AUD vs US Dollar' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', category: 'Forex', exchange: 'FX', description: 'USD vs Canadian Dollar' },

  // ==========================================
  // 5. EMTİA VE METALLER (Commodities)
  // ==========================================
  { symbol: 'XAUUSD', name: 'Spot Altın / USD', category: 'Emtia', exchange: 'Spot', description: 'Gold Ounce vs US Dollar' },
  { symbol: 'XAGUSD', name: 'Spot Gümüş / USD', category: 'Emtia', exchange: 'Spot', description: 'Silver Ounce vs US Dollar' },
  { symbol: 'BRENT', name: 'Brent Ham Petrol', category: 'Emtia', exchange: 'NYMEX', description: 'Brent Crude Oil Barrel' },
  { symbol: 'WTI', name: 'WTI Ham Petrol', category: 'Emtia', exchange: 'NYMEX', description: 'Crude Oil Light Sweet' },
  { symbol: 'COPPER', name: 'Bakır Vadeli', category: 'Emtia', exchange: 'COMEX', description: 'High Grade Copper Futures' },
  { symbol: 'PLATINUM', name: 'Spot Platin / USD', category: 'Emtia', exchange: 'Spot', description: 'Platinum Spot Ounce' },

  // ==========================================
  // 6. KÜRESEL ENDEKSLER (Indices)
  // ==========================================
  { symbol: 'SPX', name: 'S&P 500 Index', category: 'Endeksler', exchange: 'S&P', description: 'Standard & Poor\'s 500 Index' },
  { symbol: 'NDX', name: 'Nasdaq 100 Index', category: 'Endeksler', exchange: 'NASDAQ', description: 'Nasdaq-100 Large-Cap Index' },
  { symbol: 'DJI', name: 'Dow Jones Industrial', category: 'Endeksler', exchange: 'DJ', description: 'Dow Jones Industrial Average' },
  { symbol: 'XU100', name: 'BIST 100 Endeksi', category: 'Endeksler', exchange: 'BIST', description: 'Borsa İstanbul 100 Endeksi' },
  { symbol: 'DAX', name: 'Almanya DAX 40', category: 'Endeksler', exchange: 'XETRA', description: 'DAX Performance Index' },
  { symbol: 'FTSE', name: 'İngiltere FTSE 100', category: 'Endeksler', exchange: 'LSE', description: 'FTSE 100 Index' }
];

export const SymbolSearchModal: React.FC<SymbolSearchModalProps> = ({
  isOpen,
  initialSearch = '',
  onClose,
  onSelectSymbol,
  watchlistSymbols = [],
  onToggleWatchlistSymbol,
  mode = 'select',
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch(initialSearch || '');
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialSearch]);

  const categories = useMemo(() => [
    { id: 'all', label: t.modals.allMarkets },
    { id: 'Kripto', label: t.modals.crypto },
    { id: 'BIST', label: t.modals.bist },
    { id: 'Hisse', label: t.modals.stocks },
    { id: 'Forex', label: t.modals.forex },
    { id: 'Emtia', label: t.modals.commodities },
    { id: 'Endeksler', label: t.modals.indices },
  ], [t]);

  const filtered = useMemo(() => {
    const q = search.toUpperCase().trim();
    const inCurrentCategory = ALL_TRADING_SYMBOLS.filter(s => {
      const matchQuery = !q || s.symbol.includes(q) || s.name.toUpperCase().includes(q) || (s.description && s.description.toUpperCase().includes(q));
      const matchCat = category === 'all' || s.category === category;
      return matchQuery && matchCat;
    });

    // If query was typed and current tab has 0 matches, fallback to searching all categories
    if (inCurrentCategory.length === 0 && category !== 'all' && q) {
      return ALL_TRADING_SYMBOLS.filter(s => {
        return s.symbol.includes(q) || s.name.toUpperCase().includes(q) || (s.description && s.description.toUpperCase().includes(q));
      });
    }

    return inCurrentCategory;
  }, [search, category]);

  if (!isOpen) return null;

  const handleOpenOnChart = (sym: string) => {
    onSelectSymbol(sym);
    onClose();
  };

  const handleToggle = (sym: string, option?: SymbolOption) => {
    soundService.playClickSound();
    if (onToggleWatchlistSymbol) {
      onToggleWatchlistSymbol(sym, {
        name: option?.name || sym,
        category: option?.category,
        exchange: option?.exchange,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        if (mode === 'watchlist') {
          handleToggle(filtered[selectedIndex].symbol, filtered[selectedIndex]);
        } else {
          handleOpenOnChart(filtered[selectedIndex].symbol);
        }
      } else if (search.trim()) {
        const cleanSym = search.trim().toUpperCase();
        if (mode === 'watchlist') {
          handleToggle(cleanSym);
        } else {
          handleOpenOnChart(cleanSym);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const exactMatchExists = search.trim() && ALL_TRADING_SYMBOLS.some(s => s.symbol === search.trim().toUpperCase());

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-tv-surface border border-tv-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[560px] overflow-hidden text-tv-text text-xs"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="h-11 px-4 border-b border-tv-border flex items-center justify-between bg-tv-bg select-none">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white text-sm">
              {mode === 'watchlist' ? t.rightSidebar.addSymbol : t.modals.symbolSearchTitle}
            </span>
            <span className="text-[10px] bg-tv-blue/20 text-tv-blue font-mono font-bold px-1.5 py-0.5 rounded">
              {mode === 'watchlist' ? `${watchlistSymbols.length} ${t.header.watchlist}` : 'OpenChart Studio'}
            </span>
          </div>

          <button 
            onClick={onClose} 
            className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white transition-colors"
            title={`${t.common.close} (ESC)`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-3 border-b border-tv-border flex items-center space-x-2.5 bg-tv-surface">
          <Search className="w-4 h-4 text-tv-blue" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t.modals.symbolSearchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-tv-muted uppercase font-semibold"
            autoFocus
          />
          {search && (
            <button 
              onClick={() => { setSearch(''); setSelectedIndex(0); }} 
              className="p-1 text-tv-muted hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 rounded bg-tv-card border border-tv-border text-[10px] text-tv-muted font-mono font-medium">
            ESC
          </kbd>
        </div>

        {/* Categories Tab Pill Bar */}
        <div className="px-3 py-2 border-b border-tv-border flex items-center space-x-1.5 bg-tv-card/50 select-none overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setCategory(cat.id);
                setSelectedIndex(0);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors flex items-center space-x-1 ${
                category === cat.id 
                  ? 'bg-tv-blue text-white shadow-sm' 
                  : 'bg-tv-surface text-tv-muted hover:text-white hover:bg-tv-hover'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Custom Unlisted Ticker Prompt */}
        {search.trim().length > 0 && !exactMatchExists && (
          <div className="px-4 py-2 bg-tv-blue/10 border-b border-tv-blue/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-tv-blue animate-ping" />
              <span className="text-white text-xs font-semibold">
                "{search.trim().toUpperCase()}"
              </span>
            </div>
            <button
              onClick={() => handleToggle(search.trim().toUpperCase())}
              className="px-3 py-1 rounded bg-tv-blue hover:bg-blue-600 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.rightSidebar.addSymbol}</span>
            </button>
          </div>
        )}

        {/* Symbols List */}
        <div className="flex-1 overflow-y-auto divide-y divide-tv-border/20 p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-tv-muted flex flex-col items-center space-y-3">
              <span className="text-sm">{t.common.none}</span>
              {search.trim() && (
                <button 
                  onClick={() => handleToggle(search.trim().toUpperCase())}
                  className="px-4 py-2 bg-tv-blue hover:bg-blue-600 text-white rounded-lg font-bold text-xs shadow-md transition-colors flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>"{search.trim().toUpperCase()}" {t.rightSidebar.addSymbol}</span>
                </button>
              )}
            </div>
          ) : (
            filtered.map((s, idx) => {
              const isSelected = idx === selectedIndex;
              const isInWatchlist = watchlistSymbols.includes(s.symbol);

              // Distinct exchange badge colors
              const getBadgeColor = (ex: string) => {
                switch (ex) {
                  case 'Binance': return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
                  case 'BIST': return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
                  case 'NASDAQ':
                  case 'NYSE': return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
                  case 'FX': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
                  case 'Spot':
                  case 'NYMEX':
                  case 'COMEX': return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
                  default: return 'bg-tv-card text-tv-muted border border-tv-border';
                }
              };

              return (
                <div
                  key={s.symbol}
                  onClick={() => {
                    if (mode === 'watchlist') {
                      handleToggle(s.symbol, s);
                    } else {
                      handleOpenOnChart(s.symbol);
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-tv-hover/80 text-white' : 'hover:bg-tv-card/60 text-tv-text'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex flex-col min-w-0">
                      <div className="font-bold text-sm text-white flex items-center space-x-2">
                        <span className="font-mono tracking-wide">{s.symbol}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${getBadgeColor(s.exchange)}`}>
                          {s.exchange}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-tv-bg text-tv-muted font-normal">
                          {s.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-tv-muted truncate mt-0.5">
                        {s.name} {s.description && s.description !== s.name ? `• ${s.description}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center space-x-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Watchlist Add / Remove Button */}
                    {onToggleWatchlistSymbol && (
                      <button
                        onClick={() => handleToggle(s.symbol, s)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                          isInWatchlist
                            ? 'bg-tv-green/15 text-tv-green hover:bg-tv-red/20 hover:text-tv-red border border-tv-green/30 hover:border-tv-red/40'
                            : 'bg-tv-blue text-white hover:bg-blue-600 shadow-sm'
                        }`}
                        title={isInWatchlist ? t.common.delete : t.rightSidebar.addSymbol}
                      >
                        {isInWatchlist ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{t.modals.addedBadge}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>+</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Open on Chart Button */}
                    <button
                      onClick={() => handleOpenOnChart(s.symbol)}
                      className="px-2 py-1 rounded bg-tv-surface hover:bg-tv-hover border border-tv-border text-tv-muted hover:text-white text-xs flex items-center space-x-1 transition-colors"
                      title={t.header.chartTypes}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Tips */}
        <div className="h-9 border-t border-tv-border px-4 bg-tv-bg flex items-center justify-between text-[11px] text-tv-muted select-none">
          <div className="flex items-center space-x-3">
            <span><strong className="text-white">↑↓</strong> Navigate</span>
            <span><strong className="text-white">Enter</strong> {mode === 'watchlist' ? '+/-' : 'Open'}</span>
            <span><strong className="text-white">ESC</strong> {t.common.close}</span>
          </div>
          <span>OpenChart Studio</span>
        </div>
      </div>
    </div>
  );
};
