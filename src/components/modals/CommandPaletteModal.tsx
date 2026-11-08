import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  TrendingUp, 
  Clock, 
  Sliders, 
  LayoutGrid, 
  PenTool, 
  Bell, 
  Camera, 
  Play, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Maximize, 
  Keyboard, 
  Download, 
  Check,
  Compass,
  FileCode,
  Layers
} from 'lucide-react';
import { ChartType, DrawingToolType, LayoutType, Timeframe } from '../../types';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Eylemler' | 'Semboller' | 'Zaman Dilimleri' | 'Grafik Tipleri' | 'Çizim Araçları' | 'Düzenler';
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
  onSelectTimeframe: (tf: Timeframe) => void;
  onSelectChartType: (ct: ChartType) => void;
  onSelectLayout: (l: LayoutType) => void;
  onSelectDrawingTool: (tool: DrawingToolType) => void;
  onOpenIndicators: () => void;
  onOpenAlerts: () => void;
  onOpenChartSettings: () => void;
  onOpenBacktest: () => void;
  onOpenHotkeys: () => void;
  onToggleReplay: () => void;
  onClearDrawings: () => void;
  onTakeScreenshot: () => void;
  onExportData: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  onSelectTimeframe,
  onSelectChartType,
  onSelectLayout,
  onSelectDrawingTool,
  onOpenIndicators,
  onOpenAlerts,
  onOpenChartSettings,
  onOpenBacktest,
  onOpenHotkeys,
  onToggleReplay,
  onClearDrawings,
  onTakeScreenshot,
  onExportData,
  onUndo,
  onRedo,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands: CommandItem[] = [
    // --- Eylemler ---
    {
      id: 'act_alert',
      title: 'Fiyat Alarmı Ekle',
      subtitle: 'Hedef seviyeye ulaşıldığında sesli uyarı kur',
      category: 'Eylemler',
      icon: <Bell className="w-4 h-4 text-tv-yellow" />,
      shortcut: 'Alt + A',
      action: () => { onOpenAlerts(); onClose(); },
    },
    {
      id: 'act_indicators',
      title: 'İndikatörler & Teknik Stratejiler',
      subtitle: '91+ gelişmiş indikatör kütüphanesini aç',
      category: 'Eylemler',
      icon: <Sliders className="w-4 h-4 text-tv-blue" />,
      shortcut: '/',
      action: () => { onOpenIndicators(); onClose(); },
    },
    {
      id: 'act_chart_settings',
      title: 'Grafik Görsel Ayarları',
      subtitle: 'Mum gövdesi, fitil renkleri, arka plan ve ızgara ayarları',
      category: 'Eylemler',
      icon: <Sliders className="w-4 h-4 text-[#787b86]" />,
      action: () => { onOpenChartSettings(); onClose(); },
    },
    {
      id: 'act_replay',
      title: 'Bar Yeniden Oynatma (Replay Mode)',
      subtitle: 'Geçmiş mumları adım adım simüle et',
      category: 'Eylemler',
      icon: <Play className="w-4 h-4 text-tv-green" />,
      shortcut: 'Alt + G',
      action: () => { onToggleReplay(); onClose(); },
    },
    {
      id: 'act_undo',
      title: 'Çizimi Geri Al (Undo)',
      subtitle: 'Son çizilen nesneyi kaldır',
      category: 'Eylemler',
      icon: <RotateCcw className="w-4 h-4 text-tv-muted" />,
      shortcut: 'Ctrl + Z',
      action: () => { onUndo?.(); onClose(); },
    },
    {
      id: 'act_redo',
      title: 'Çizimi İleri Al (Redo)',
      subtitle: 'Geri alınan çizimi geri yükle',
      category: 'Eylemler',
      icon: <RotateCw className="w-4 h-4 text-tv-muted" />,
      shortcut: 'Ctrl + Y',
      action: () => { onRedo?.(); onClose(); },
    },
    {
      id: 'act_screenshot',
      title: 'Grafik Ekran Görüntüsü Al (Screenshot)',
      subtitle: 'Grafiği anında PNG olarak kaydet',
      category: 'Eylemler',
      icon: <Camera className="w-4 h-4 text-tv-blue" />,
      shortcut: 'Alt + S',
      action: () => { onTakeScreenshot(); onClose(); },
    },
    {
      id: 'act_export',
      title: 'Verileri CSV Olarak Dışa Aktar',
      subtitle: 'Tüm OHLCV bar verilerini Excel/CSV indir',
      category: 'Eylemler',
      icon: <Download className="w-4 h-4 text-tv-green" />,
      action: () => { onExportData(); onClose(); },
    },
    {
      id: 'act_clear_drawings',
      title: 'Tüm Çizimleri Kaldır',
      subtitle: 'Grafikteki tüm çizimleri temizle',
      category: 'Eylemler',
      icon: <Trash2 className="w-4 h-4 text-tv-red" />,
      shortcut: 'Alt + C',
      action: () => { onClearDrawings(); onClose(); },
    },
    {
      id: 'act_hotkeys',
      title: 'Klavye Kısayolları Kılavuzu',
      subtitle: 'Tüm hızlı kullanım tuşlarını görüntüle',
      category: 'Eylemler',
      icon: <Keyboard className="w-4 h-4 text-[#ffd600]" />,
      shortcut: '?',
      action: () => { onOpenHotkeys(); onClose(); },
    },
    {
      id: 'act_backtest',
      title: 'Strateji Testi & Quant Backtest',
      subtitle: 'Gelişmiş strateji performansını simüle et',
      category: 'Eylemler',
      icon: <FileCode className="w-4 h-4 text-tv-blue" />,
      action: () => { onOpenBacktest(); onClose(); },
    },

    // --- Semboller ---
    {
      id: 'sym_btc',
      title: 'BTCUSDT',
      subtitle: 'Bitcoin / TetherUS (Binance Spot)',
      category: 'Semboller',
      icon: <TrendingUp className="w-4 h-4 text-[#f7931a]" />,
      action: () => { onSelectSymbol('BTCUSDT'); onClose(); },
    },
    {
      id: 'sym_eth',
      title: 'ETHUSDT',
      subtitle: 'Ethereum / TetherUS (Binance Spot)',
      category: 'Semboller',
      icon: <TrendingUp className="w-4 h-4 text-[#627eea]" />,
      action: () => { onSelectSymbol('ETHUSDT'); onClose(); },
    },
    {
      id: 'sym_sol',
      title: 'SOLUSDT',
      subtitle: 'Solana / TetherUS (Binance Spot)',
      category: 'Semboller',
      icon: <TrendingUp className="w-4 h-4 text-[#14f195]" />,
      action: () => { onSelectSymbol('SOLUSDT'); onClose(); },
    },
    {
      id: 'sym_bnb',
      title: 'BNBUSDT',
      subtitle: 'BNB / TetherUS (Binance Spot)',
      category: 'Semboller',
      icon: <TrendingUp className="w-4 h-4 text-[#f3ba2f]" />,
      action: () => { onSelectSymbol('BNBUSDT'); onClose(); },
    },
    {
      id: 'sym_xrp',
      title: 'XRPUSDT',
      subtitle: 'Ripple / TetherUS (Binance Spot)',
      category: 'Semboller',
      icon: <TrendingUp className="w-4 h-4 text-[#23292f]" />,
      action: () => { onSelectSymbol('XRPUSDT'); onClose(); },
    },
    {
      id: 'sym_gold',
      title: 'XAUUSD',
      subtitle: 'Gold / US Dollar (Spot Altın)',
      category: 'Semboller',
      icon: <TrendingUp className="w-4 h-4 text-[#ffd700]" />,
      action: () => { onSelectSymbol('XAUUSD'); onClose(); },
    },
    {
      id: 'sym_eur',
      title: 'EURUSD',
      subtitle: 'Euro / US Dollar (Forex)',
      category: 'Semboller',
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectSymbol('EURUSD'); onClose(); },
    },

    // --- Zaman Dilimleri ---
    {
      id: 'tf_1m',
      title: '1m (1 Dakika)',
      subtitle: 'Scalping ve mikroyapı analizi',
      category: 'Zaman Dilimleri',
      icon: <Clock className="w-4 h-4 text-tv-muted" />,
      action: () => { onSelectTimeframe('1m'); onClose(); },
    },
    {
      id: 'tf_5m',
      title: '5m (5 Dakika)',
      subtitle: 'Kısa vadeli gün içi alım satım',
      category: 'Zaman Dilimleri',
      icon: <Clock className="w-4 h-4 text-tv-muted" />,
      action: () => { onSelectTimeframe('5m'); onClose(); },
    },
    {
      id: 'tf_15m',
      title: '15m (15 Dakika)',
      subtitle: 'Klasik gün içi trend takibi',
      category: 'Zaman Dilimleri',
      icon: <Clock className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectTimeframe('15m'); onClose(); },
    },
    {
      id: 'tf_1h',
      title: '1h (1 Saat)',
      subtitle: 'Orta vadeli yapı ve destek/direnç',
      category: 'Zaman Dilimleri',
      icon: <Clock className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectTimeframe('1h'); onClose(); },
    },
    {
      id: 'tf_4h',
      title: '4h (4 Saat)',
      subtitle: 'Swing trading ana trend analizleri',
      category: 'Zaman Dilimleri',
      icon: <Clock className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectTimeframe('4h'); onClose(); },
    },
    {
      id: 'tf_1d',
      title: '1D (Günlük)',
      subtitle: 'Makro trend ve kurumsal seviyeler',
      category: 'Zaman Dilimleri',
      icon: <Clock className="w-4 h-4 text-tv-yellow" />,
      action: () => { onSelectTimeframe('1d'); onClose(); },
    },

    // --- Grafik Tipleri & Bar Profilleri ---
    {
      id: 'ct_volume_footprint',
      title: 'Hacim Ayak İzi (Volume Footprint / Orderflow)',
      subtitle: 'Bar içi Alış x Satış hacmi, Delta ve POC (Point of Control) profili',
      category: 'Grafik Tipleri',
      icon: <Layers className="w-4 h-4 text-[#ff9800]" />,
      action: () => { onSelectChartType('volume-footprint'); onClose(); },
    },
    {
      id: 'ct_volume_candle',
      title: 'Hacimli Mumlar (Volume Candles)',
      subtitle: 'Hacim büyüklüğüne göre dinamik gövde kalınlığına sahip mumlar',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-green" />,
      action: () => { onSelectChartType('volume-candle'); onClose(); },
    },
    {
      id: 'ct_candlestick',
      title: 'Japon Mum Grafiği (Candlestick)',
      subtitle: 'Geleneksel yeşil / kırmızı fiyat barları',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-green" />,
      action: () => { onSelectChartType('candlestick'); onClose(); },
    },
    {
      id: 'ct_hollow',
      title: 'İçi Boş Mumlar (Hollow Candles)',
      subtitle: 'Önceki kapanışa göre şeffaf/dolu gövdeler',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('hollow-candlestick'); onClose(); },
    },
    {
      id: 'ct_bar',
      title: 'Çubuk Grafik (OHLC Bars)',
      subtitle: 'Açılış, yüksek, düşük ve kapanış çubukları',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('bar'); onClose(); },
    },
    {
      id: 'ct_baseline',
      title: 'Taban Çizgisi (Baseline)',
      subtitle: 'Referans seviyenin üstü yeşil altı kırmızı dolgulu',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-yellow" />,
      action: () => { onSelectChartType('baseline'); onClose(); },
    },
    {
      id: 'ct_heikin',
      title: 'Heikin-Ashi',
      subtitle: 'Gürültüden arındırılmış trend ortalaması mumları',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-purple" />,
      action: () => { onSelectChartType('heikin-ashi'); onClose(); },
    },
    {
      id: 'ct_renko',
      title: 'Renko Barları (Renko Bricks)',
      subtitle: 'Zamana bakılmaksızın sabit fiyat adımına göre tuğlalar',
      category: 'Grafik Tipleri',
      icon: <LayoutGrid className="w-4 h-4 text-tv-purple" />,
      action: () => { onSelectChartType('renko'); onClose(); },
    },
    {
      id: 'ct_line_break',
      title: 'Çizgi Sonu (Three Line Break)',
      subtitle: 'Önceki 3 bloğun aşılmasıyla oluşan trend blokları',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-yellow" />,
      action: () => { onSelectChartType('line-break'); onClose(); },
    },
    {
      id: 'ct_line',
      title: 'Çizgi Grafik (Line)',
      subtitle: 'Sadece kapanış fiyatlarını bağlayan çizgi',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('line'); onClose(); },
    },
    {
      id: 'ct_area',
      title: 'Alan Grafiği (Area)',
      subtitle: 'Alt tarafı yarı saydam gradyan dolgulu çizgi',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('area'); onClose(); },
    },
    {
      id: 'ct_step_line',
      title: 'Adım Çizgisi (Step Line)',
      subtitle: 'Fiyat basamaklarını gösteren yatay-dikey basamak çizgisi',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('step-line'); onClose(); },
    },
    {
      id: 'ct_line_markers',
      title: 'Noktalı Çizgi (Line with Markers)',
      subtitle: 'Kapanış noktalarında dairesel işaretçiler',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-green" />,
      action: () => { onSelectChartType('line-with-markers'); onClose(); },
    },
    {
      id: 'ct_columns',
      title: 'Sütunlar (Columns)',
      subtitle: 'Kapanış seviyelerine kadar uzanan dikey renkli sütunlar',
      category: 'Grafik Tipleri',
      icon: <LayoutGrid className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('columns'); onClose(); },
    },
    {
      id: 'ct_high_low',
      title: 'Yüksek - Düşük (High-Low)',
      subtitle: 'Gövdesiz, sadece yüksek-düşük aralığını ve kapanış çentiğini gösteren barlar',
      category: 'Grafik Tipleri',
      icon: <TrendingUp className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectChartType('high-low'); onClose(); },
    },

    // --- Çizim Araçları ---
    {
      id: 'dt_trendline',
      title: 'Trend Çizgisi (Trend Line)',
      subtitle: 'İki nokta arasında serbest yön çizgisi',
      category: 'Çizim Araçları',
      icon: <PenTool className="w-4 h-4 text-tv-green" />,
      shortcut: 'Alt + T',
      action: () => { onSelectDrawingTool('trendLine'); onClose(); },
    },
    {
      id: 'dt_horz',
      title: 'Yatay Çizgi (Horizontal Line)',
      subtitle: 'Tek tıkla sonsuz uzayan destek/direnç çizgisi',
      category: 'Çizim Araçları',
      icon: <PenTool className="w-4 h-4 text-tv-blue" />,
      shortcut: 'Alt + H',
      action: () => { onSelectDrawingTool('horizontalLine'); onClose(); },
    },
    {
      id: 'dt_vert',
      title: 'Dikey Çizgi (Vertical Line)',
      subtitle: 'Belirli bir zaman dilimi veya olayı işaretle',
      category: 'Çizim Araçları',
      icon: <PenTool className="w-4 h-4 text-tv-blue" />,
      shortcut: 'Alt + V',
      action: () => { onSelectDrawingTool('verticalLine'); onClose(); },
    },
    {
      id: 'dt_fib',
      title: 'Fibonacci Düzeltmesi (Fib Retracement)',
      subtitle: '0.236, 0.382, 0.5, 0.618, 0.786 altın oran seviyeleri',
      category: 'Çizim Araçları',
      icon: <PenTool className="w-4 h-4 text-[#ffd600]" />,
      shortcut: 'Alt + F',
      action: () => { onSelectDrawingTool('fibonacci'); onClose(); },
    },
    {
      id: 'dt_measure',
      title: 'Ölçüm / Cetvel (Measure Tool)',
      subtitle: 'Bar sayısı, zaman, fiyat ve yüzde getiri hesabı',
      category: 'Çizim Araçları',
      icon: <Compass className="w-4 h-4 text-tv-blue" />,
      shortcut: 'Alt + R (veya Shift+Tık)',
      action: () => { onSelectDrawingTool('measure'); onClose(); },
    },
    {
      id: 'dt_long',
      title: 'Uzun Pozisyon (Long Position)',
      subtitle: 'Giriş, Zarar Durdur ve Kâr Al risk/kazanç oranı kutusu',
      category: 'Çizim Araçları',
      icon: <PenTool className="w-4 h-4 text-tv-green" />,
      action: () => { onSelectDrawingTool('longPosition'); onClose(); },
    },
    {
      id: 'dt_short',
      title: 'Kısa Pozisyon (Short Position)',
      subtitle: 'Short risk/kazanç oranı ve hedef seviye kutusu',
      category: 'Çizim Araçları',
      icon: <PenTool className="w-4 h-4 text-tv-red" />,
      action: () => { onSelectDrawingTool('shortPosition'); onClose(); },
    },

    // --- Düzenler ---
    {
      id: 'lay_1',
      title: '1 Grafik (Tek Panel Tam Ekran)',
      subtitle: 'Varsayılan tam ekran grafik',
      category: 'Düzenler',
      icon: <LayoutGrid className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectLayout('1x1'); onClose(); },
    },
    {
      id: 'lay_2v',
      title: '2 Grafik (Dikey İkili Split)',
      subtitle: 'Yan yana 2 bağımsız grafik',
      category: 'Düzenler',
      icon: <LayoutGrid className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectLayout('1x2'); onClose(); },
    },
    {
      id: 'lay_2h',
      title: '2 Grafik (Yatay İkili Split)',
      subtitle: 'Alt alta 2 bağımsız grafik',
      category: 'Düzenler',
      icon: <LayoutGrid className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectLayout('2x1'); onClose(); },
    },
    {
      id: 'lay_4',
      title: '4 Grafik (2x2 Grid Bölünmüş Ekran)',
      subtitle: 'Aynı anda 4 farklı sembol veya zaman dilimi izleme',
      category: 'Düzenler',
      icon: <LayoutGrid className="w-4 h-4 text-tv-blue" />,
      action: () => { onSelectLayout('2x2'); onClose(); },
    },
  ];

  const filtered = commands.filter(c => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
      c.category.toLowerCase().includes(q)
    );
  });

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
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-tv-surface border border-tv-border rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden text-tv-text text-xs"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-3.5 border-b border-tv-border flex items-center space-x-2.5 bg-tv-bg">
          <Search className="w-4 h-4 text-tv-blue" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Sembol, indikatör, çizim aracı, zaman dilimi veya komut ara..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-tv-muted"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-tv-surface border border-tv-border/80 text-[10px] text-tv-muted font-mono font-medium">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="max-h-[420px] overflow-y-auto divide-y divide-tv-border/20 p-1.5"
        >
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-tv-muted">
              Eşleşen komut veya sembol bulunamadı.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-tv-blue text-white shadow-md' 
                      : 'hover:bg-tv-hover text-tv-text'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-tv-card text-tv-text'}`}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-sm flex items-center space-x-2">
                        <span>{item.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-tv-border/40 text-tv-muted'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <div className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-tv-muted'}`}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.shortcut && (
                    <kbd className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      isSelected 
                        ? 'bg-white/20 text-white border border-white/30' 
                        : 'bg-tv-card border border-tv-border text-tv-blue'
                    }`}>
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Tips */}
        <div className="h-9 border-t border-tv-border px-4 bg-tv-bg flex items-center justify-between text-[11px] text-tv-muted">
          <div className="flex items-center space-x-3">
            <span><strong className="text-white">↑↓</strong> Gezin</span>
            <span><strong className="text-white">Enter</strong> Seç</span>
            <span><strong className="text-white">Esc</strong> Kapat</span>
          </div>
          <span>OpenChart Spotlight</span>
        </div>
      </div>
    </div>
  );
};
