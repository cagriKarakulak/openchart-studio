import React, { useState } from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface HotkeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  desc: string;
  category: 'Çizim Araçları' | 'Gezinme & Sembol' | 'Grafik & Paneller' | 'Düzenleme & Sistem';
}

const SHORTCUTS: ShortcutItem[] = [
  // Çizim Araçları
  { key: 'Alt + T', desc: 'Trend Çizgisi Çizim Aracını Seç', category: 'Çizim Araçları' },
  { key: 'Alt + H', desc: 'Yatay Çizgi Aracını Seç (Destek/Direnç)', category: 'Çizim Araçları' },
  { key: 'Alt + V', desc: 'Dikey Çizgi Aracını Seç (Zaman Belirteci)', category: 'Çizim Araçları' },
  { key: 'Alt + F', desc: 'Fibonacci Düzeltmesi Aracını Seç', category: 'Çizim Araçları' },
  { key: 'Alt + R', desc: 'Ölçüm / Cetvel Aracını Seç (Bar & Yüzde Getiri)', category: 'Çizim Araçları' },
  { key: 'Shift + Tık', desc: 'Hızlı Ölçüm Cetveli (Shift basılıyken tıkla/sürükle)', category: 'Çizim Araçları' },
  { key: 'Alt + M', desc: 'Mıknatıs Modunu Aç / Kapat (Snap to Candle OHLC)', category: 'Çizim Araçları' },

  // Gezinme & Sembol
  { key: 'Ctrl + K', desc: 'Evrensel Komut Paleti & Hızlı Arama (Spotlight)', category: 'Gezinme & Sembol' },
  { key: 'Harf Tuşları (A-Z)', desc: 'Doğrudan Sembol Aramasını Aç (Örn: BTC, ETH yazın)', category: 'Gezinme & Sembol' },
  { key: 'Sayı Tuşları (1-9)', desc: 'Hızlı Zaman Dilimi Değiştirme (Örn: 15 yazıp Enter)', category: 'Gezinme & Sembol' },
  { key: 'Space', desc: 'İzleme Listesindeki Sonraki Sembole Geç', category: 'Gezinme & Sembol' },
  { key: 'Shift + Space', desc: 'İzleme Listesindeki Önceki Sembole Geç', category: 'Gezinme & Sembol' },

  // Grafik & Paneller
  { key: 'Alt + A', desc: 'Fiyat Seviyesine Alarm Ekle', category: 'Grafik & Paneller' },
  { key: '/', desc: 'İndikatörler & Stratejiler Modalını Aç', category: 'Grafik & Paneller' },
  { key: 'Alt + W', desc: 'İzleme Listesi / Sağ Yan Paneli Aç/Kapa', category: 'Grafik & Paneller' },
  { key: 'Alt + B', desc: 'Alt Paneli Aç/Kapa (Screener, Paper Trading, Python Quant)', category: 'Grafik & Paneller' },
  { key: 'Alt + G', desc: 'Bar Yeniden Oynatma (Replay Mode) Aç/Kapa', category: 'Grafik & Paneller' },
  { key: 'Alt + S', desc: 'Grafik Ekran Görüntüsü Al (PNG İndir)', category: 'Grafik & Paneller' },
  { key: 'Alt + C', desc: 'Aktif Grafikteki Tüm Çizimleri Temizle', category: 'Grafik & Paneller' },

  // Düzenleme & Sistem
  { key: 'Ctrl + Z', desc: 'Son Yapılan Çizimi Geri Al (Undo)', category: 'Düzenleme & Sistem' },
  { key: 'Ctrl + Y', desc: 'Geri Alınan Çizimi İleri Al (Redo)', category: 'Düzenleme & Sistem' },
  { key: 'Ctrl + S', desc: 'Grafik Düzenini ve Çizimleri Manuel Kaydet', category: 'Düzenleme & Sistem' },
  { key: 'Delete / Backspace', desc: 'Seçili Çizimi Grafikten Sil', category: 'Düzenleme & Sistem' },
  { key: 'Esc', desc: 'Aktif Çizimden Çık ve Artı Göstergeye (Crosshair) Dön', category: 'Düzenleme & Sistem' },
  { key: '?', desc: 'Bu Klavye Kısayolları Kılavuzunu Aç', category: 'Düzenleme & Sistem' },
];

export const HotkeysModal: React.FC<HotkeysModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');

  if (!isOpen) return null;

  const categories = ['Tümü', 'Çizim Araçları', 'Gezinme & Sembol', 'Grafik & Paneller', 'Düzenleme & Sistem'];
  const filtered = selectedCategory === 'Tümü' 
    ? SHORTCUTS 
    : SHORTCUTS.filter(s => s.category === selectedCategory);

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
            <span>OpenChart Klavye Kısayolları (Hotkeys)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-4 py-2 border-b border-tv-border flex items-center space-x-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? 'bg-tv-blue text-white font-semibold' 
                  : 'bg-tv-card text-tv-muted hover:text-white'
              }`}
            >
              {cat}
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
          <span>Hızlı analiz ve grafik kontrolü için klavye kısayollarını kullanabilirsiniz.</span>
          <button onClick={onClose} className="text-tv-blue font-bold hover:underline">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
