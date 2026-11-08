import React, { useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface HotkeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HotkeysModal: React.FC<HotkeysModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: t.modals.allCategory },
    { id: 'drawing', label: t.modals.drawingToolsCat },
    { id: 'nav', label: t.modals.navigationSymbolCat },
    { id: 'chart', label: t.modals.chartPanelsCat },
    { id: 'system', label: t.modals.editingSystemCat },
  ];

  const shortcuts = [
    // Drawing Tools
    { key: 'Alt + T', desc: t.leftToolbar.trendLine, categoryId: 'drawing', category: t.modals.drawingToolsCat },
    { key: 'Alt + H', desc: t.leftToolbar.horizontalLine, categoryId: 'drawing', category: t.modals.drawingToolsCat },
    { key: 'Alt + V', desc: t.leftToolbar.verticalLine, categoryId: 'drawing', category: t.modals.drawingToolsCat },
    { key: 'Alt + F', desc: t.leftToolbar.fibRetracement, categoryId: 'drawing', category: t.modals.drawingToolsCat },
    { key: 'Alt + R', desc: t.leftToolbar.measureTool, categoryId: 'drawing', category: t.modals.drawingToolsCat },
    { key: 'Shift + Click', desc: `${t.leftToolbar.measureTool} (Shift + Drag)`, categoryId: 'drawing', category: t.modals.drawingToolsCat },
    { key: 'Alt + M', desc: t.leftToolbar.magnetMode, categoryId: 'drawing', category: t.modals.drawingToolsCat },

    // Navigation & Symbol
    { key: 'Ctrl + K', desc: t.header.commandPalette, categoryId: 'nav', category: t.modals.navigationSymbolCat },
    { key: 'A - Z', desc: t.header.symbolSearchPlaceholder, categoryId: 'nav', category: t.modals.navigationSymbolCat },
    { key: '1 - 9', desc: t.header.timeframes, categoryId: 'nav', category: t.modals.navigationSymbolCat },
    { key: 'Space', desc: `${t.header.watchlist} (Next)`, categoryId: 'nav', category: t.modals.navigationSymbolCat },
    { key: 'Shift + Space', desc: `${t.header.watchlist} (Prev)`, categoryId: 'nav', category: t.modals.navigationSymbolCat },

    // Chart & Panels
    { key: 'Alt + A', desc: t.chart.addAlertAtPrice, categoryId: 'chart', category: t.modals.chartPanelsCat },
    { key: '/', desc: t.header.indicators, categoryId: 'chart', category: t.modals.chartPanelsCat },
    { key: 'Alt + W', desc: t.header.watchlist, categoryId: 'chart', category: t.modals.chartPanelsCat },
    { key: 'Alt + B', desc: `${t.bottomBar.screenerTab} / ${t.bottomBar.paperTradingTab}`, categoryId: 'chart', category: t.modals.chartPanelsCat },
    { key: 'Alt + G', desc: t.header.barReplay, categoryId: 'chart', category: t.modals.chartPanelsCat },
    { key: 'Alt + S', desc: t.header.screenshot, categoryId: 'chart', category: t.modals.chartPanelsCat },
    { key: 'Alt + C', desc: t.chart.removeAllDrawings, categoryId: 'chart', category: t.modals.chartPanelsCat },

    // Editing & System
    { key: 'Ctrl + Z', desc: 'Undo', categoryId: 'system', category: t.modals.editingSystemCat },
    { key: 'Ctrl + Y', desc: 'Redo', categoryId: 'system', category: t.modals.editingSystemCat },
    { key: 'Ctrl + S', desc: t.header.saveLayout, categoryId: 'system', category: t.modals.editingSystemCat },
    { key: 'Delete / Backspace', desc: t.chart.deleteDrawing, categoryId: 'system', category: t.modals.editingSystemCat },
    { key: 'Esc', desc: t.chart.closeSelection, categoryId: 'system', category: t.modals.editingSystemCat },
    { key: '?', desc: t.modals.hotkeysTitle, categoryId: 'system', category: t.modals.editingSystemCat },
  ];

  const filtered = selectedCategory === 'all'
    ? shortcuts
    : shortcuts.filter(s => s.categoryId === selectedCategory);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-tv-surface border border-tv-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden text-tv-text text-xs"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-12 border-b border-tv-border px-4 flex items-center justify-between bg-tv-bg">
          <div className="flex items-center space-x-2.5 font-bold text-white text-sm">
            <Keyboard className="w-4 h-4 text-tv-blue" />
            <span>{t.modals.hotkeysTitle}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-4 py-2 border-b border-tv-border flex items-center space-x-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors ${
                selectedCategory === cat.id 
                  ? 'bg-tv-blue text-white font-semibold' 
                  : 'bg-tv-card text-tv-muted hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="p-4 max-h-[420px] overflow-y-auto divide-y divide-tv-border/30">
          {filtered.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between hover:bg-tv-hover/50 px-2 rounded">
              <div className="flex flex-col">
                <span className="text-white font-medium text-xs">{item.desc}</span>
                <span className="text-[10px] text-tv-muted">{item.category}</span>
              </div>
              <kbd className="px-2.5 py-1 rounded bg-tv-card border border-tv-border font-mono text-[11px] text-tv-blue font-bold shadow-sm whitespace-nowrap">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="h-10 border-t border-tv-border px-4 bg-tv-bg flex items-center justify-between text-[11px] text-tv-muted">
          <span>{t.modals.hotkeysGuideNotice}</span>
          <button onClick={onClose} className="text-tv-blue font-bold hover:underline">
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
