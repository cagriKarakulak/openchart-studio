import React, { useState } from 'react';
import { Search, X, Check, TrendingUp, Activity, BarChart2, Zap } from 'lucide-react';
import { INDICATOR_DEFINITIONS, IndicatorDefinition } from '../../indicators/registry';
import { IndicatorType } from '../../types';

interface IndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIndicator: (type: IndicatorType) => void;
}

export const IndicatorsModal: React.FC<IndicatorsModalProps> = ({
  isOpen,
  onClose,
  onAddIndicator,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const categories = ['Tümü', 'Trend', 'Oscillator', 'Volatility', 'Volume'];

  const filtered = INDICATOR_DEFINITIONS.filter(ind => {
    const matchesSearch = ind.name.toLowerCase().includes(search.toLowerCase()) || 
                          ind.shortName.toLowerCase().includes(search.toLowerCase()) ||
                          ind.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'Tümü' || ind.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSelect = (def: IndicatorDefinition) => {
    onAddIndicator(def.type);
    setAddedIds(prev => new Set(prev).add(def.type));
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev);
        next.delete(def.type);
        return next;
      });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-tv-surface border border-tv-border rounded-lg shadow-2xl w-full max-w-2xl flex flex-col h-[520px] overflow-hidden text-tv-text"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 border-b border-tv-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-serif italic font-bold text-tv-blue text-lg">fx</span>
            <span className="font-bold text-white text-sm">Göstergeler, Metrikler ve Stratejiler</span>
            <span className="text-[10px] bg-tv-green/20 text-tv-green px-2 py-0.5 rounded font-mono font-bold">
              SINIRSIZ ({INDICATOR_DEFINITIONS.length} İndikatör)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-tv-hover text-tv-muted hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-tv-border bg-tv-bg flex items-center space-x-2">
          <Search className="w-4 h-4 text-tv-muted" />
          <input
            type="text"
            placeholder="Gösterge adı veya kısaltma ara (RSI, EMA, Bollinger, MACD, Supertrend...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-tv-muted"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-tv-muted hover:text-white text-xs">
              Temizle
            </button>
          )}
        </div>

        {/* Categories Pills */}
        <div className="px-4 py-2 border-b border-tv-border/50 flex items-center space-x-2 overflow-x-auto text-xs">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-tv-blue text-white font-medium'
                  : 'bg-tv-card text-tv-muted hover:text-tv-text hover:bg-tv-hover'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Indicators List */}
        <div className="flex-1 overflow-y-auto divide-y divide-tv-border/30 p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-tv-muted">
              Arama kriterlerine uygun gösterge bulunamadı.
            </div>
          ) : (
            filtered.map((def) => {
              const isJustAdded = addedIds.has(def.type);

              return (
                <div
                  key={def.type}
                  className="p-3 hover:bg-tv-hover/60 rounded flex items-center justify-between group transition-colors cursor-pointer"
                  onClick={() => handleSelect(def)}
                >
                  <div className="space-y-0.5 max-w-[420px]">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{def.name}</span>
                      <span className="text-[10px] bg-tv-card border border-tv-border px-1.5 py-0.2 rounded text-tv-muted font-mono">
                        {def.pane === 'overlay' ? 'Grafik Üstü' : 'Alt Pencere'}
                      </span>
                    </div>
                    <p className="text-xs text-tv-muted leading-relaxed line-clamp-2">
                      {def.description}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(def);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                      isJustAdded
                        ? 'bg-tv-green text-white'
                        : 'bg-tv-blue/15 text-tv-blue hover:bg-tv-blue hover:text-white'
                    }`}
                  >
                    {isJustAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Eklendi</span>
                      </>
                    ) : (
                      <span>+ Grafiğe Ekle</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

