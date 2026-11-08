import React, { useState } from 'react';
import { X, Bell, Check, Volume2, Globe, Repeat } from 'lucide-react';
import { PriceAlert } from '../../types';
import { soundService, AlertSoundType } from '../../services/sound';

interface AlertModalProps {
  isOpen: boolean;
  symbol: string;
  currentPrice: number;
  initialTargetPrice?: number;
  onClose: () => void;
  onCreateAlert: (alert: PriceAlert) => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  symbol,
  currentPrice,
  initialTargetPrice,
  onClose,
  onCreateAlert,
}) => {
  const [targetPrice, setTargetPrice] = useState<number>(initialTargetPrice ?? (currentPrice || 100));
  const [condition, setCondition] = useState<'cross_up' | 'cross_down' | 'crossing'>('cross_up');
  const [note, setNote] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [sound, setSound] = useState<AlertSoundType>('bell');
  const [recurring, setRecurring] = useState<boolean>(false);

  React.useEffect(() => {
    if (initialTargetPrice !== undefined) {
      setTargetPrice(initialTargetPrice);
    } else if (currentPrice) {
      setTargetPrice(currentPrice);
    }
  }, [initialTargetPrice, currentPrice, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}`,
      symbol,
      targetPrice: Number(targetPrice),
      condition,
      note: note.trim() || undefined,
      webhookUrl: webhookUrl.trim() || undefined,
      sound,
      recurring,
      triggered: false,
      createdAt: Date.now(),
    };
    onCreateAlert(newAlert);
    onClose();
  };

  const handleTestSound = () => {
    soundService.playAlertSound(sound);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-tv-surface border border-tv-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-tv-text text-xs"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-11 border-b border-tv-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-bold text-white text-sm">
            <Bell className="w-4 h-4 text-tv-blue" />
            <span>Fiyat Alarmı Kur ({symbol})</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
          <div>
            <label className="text-tv-muted block mb-1">Mevcut Fiyat</label>
            <div className="font-mono text-base font-bold text-white">
              ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <label className="text-tv-muted block mb-1">Koşul</label>
            <select
              value={condition}
              onChange={(e: any) => setCondition(e.target.value)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-tv-blue"
            >
              <option value="cross_up">Fiyat Hedefi Yukarı Kestiğinde (Cross Up)</option>
              <option value="cross_down">Fiyat Hedefi Aşağı Kestiğinde (Cross Down)</option>
              <option value="crossing">Fiyata Ulaştığında (Exact Hit)</option>
            </select>
          </div>

          <div>
            <label className="text-tv-muted block mb-1">Hedef Fiyat ($)</label>
            <input
              type="number"
              step="any"
              value={targetPrice}
              onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-tv-blue"
              required
            />
          </div>

          <div>
            <label className="text-tv-muted block mb-1">Alarm Notu / Mesajı</label>
            <input
              type="text"
              placeholder="Örn: Direnç kırıldı, alım fırsatı!"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-tv-blue"
            />
          </div>

          {/* Alert Sound Selector & Tester */}
          <div className="bg-tv-card/60 p-2.5 rounded border border-tv-border space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-white font-semibold flex items-center space-x-1.5">
                <Volume2 className="w-3.5 h-3.5 text-tv-blue" />
                <span>Bildirim Sesi</span>
              </label>
              <button
                type="button"
                onClick={handleTestSound}
                className="text-[10px] text-tv-blue hover:text-white px-2 py-0.5 rounded bg-tv-bg border border-tv-border hover:border-tv-blue transition-colors flex items-center space-x-1"
                title="Sesi Dinle"
              >
                <span>Test Et ▷</span>
              </button>
            </div>
            <select
              value={sound}
              onChange={(e: any) => setSound(e.target.value)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-tv-blue"
            >
              <option value="bell">Kristal Çan (Crystal Bell)</option>
              <option value="chime">İkili Melodi (Harmonic Chime)</option>
              <option value="siren">Acil Durum Sireni (Warning Siren)</option>
              <option value="pop">Hafif Pop (Soft Bubble Pop)</option>
            </select>
          </div>

          {/* Webhook Dispatcher */}
          <div className="bg-tv-card/60 p-2.5 rounded border border-tv-border space-y-1.5">
            <label className="text-white font-semibold flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-tv-blue" />
              <span>Webhook Bildirimi (Opsiyonel)</span>
            </label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/... veya bot URL'i"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-tv-blue"
            />
            <p className="text-[10px] text-tv-muted">
              Alarm tetiklendiğinde hedef URL'e JSON formatında otomatik HTTP POST isteği gönderilir.
            </p>
          </div>

          {/* Trigger Frequency */}
          <div className="flex items-center justify-between p-2.5 bg-tv-card/60 rounded border border-tv-border">
            <div className="flex items-center space-x-1.5">
              <Repeat className="w-3.5 h-3.5 text-tv-blue" />
              <div>
                <div className="text-white font-semibold">Yinelenen Alarm (Recurring)</div>
                <div className="text-[10px] text-tv-muted">
                  {recurring ? 'Koşul her sağlandığında tekrar tetiklenir' : 'Sadece ilk tetiklemede çalışır'}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-tv-border text-tv-blue focus:ring-0 cursor-pointer accent-tv-blue"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-tv-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded hover:bg-tv-hover text-tv-muted hover:text-white"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-tv-blue text-white font-medium hover:bg-tv-blue/90 flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Alarmı Kur</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
