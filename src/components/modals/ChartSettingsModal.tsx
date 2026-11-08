import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Check, Palette, Grid, Sliders, Stamp, Clock } from 'lucide-react';
import { ChartVisualSettings } from '../../types';
import { useTranslation } from '../../i18n';

export const DEFAULT_VISUAL_SETTINGS: ChartVisualSettings = {
  upColor: '#089981',
  downColor: '#f23645',
  wickUpColor: '#089981',
  wickDownColor: '#f23645',
  borderUpColor: '#089981',
  borderDownColor: '#f23645',
  backgroundColor: '#131722',
  gridColor: 'rgba(42, 46, 57, 0.4)',
  showGrid: true,
  showWatermark: true,
  watermarkOpacity: 0.07,
  showCountdown: true,
};

interface ChartSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings?: ChartVisualSettings;
  onSave: (settings: ChartVisualSettings) => void;
}

export const ChartSettingsModal: React.FC<ChartSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'candles' | 'canvas' | 'watermark'>('candles');
  const [settings, setSettings] = useState<ChartVisualSettings>(
    currentSettings || DEFAULT_VISUAL_SETTINGS
  );

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  if (!isOpen) return null;

  const handleReset = () => {
    setSettings(DEFAULT_VISUAL_SETTINGS);
  };

  const handleApply = () => {
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-tv-surface border border-tv-border rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-tv-text">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-tv-border bg-tv-bg">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-tv-blue" />
            <h3 className="text-sm font-bold text-white">{t.modals.chartSettingsTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-tv-border bg-tv-card px-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('candles')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'candles'
                ? 'border-tv-blue text-tv-blue font-bold'
                : 'border-transparent text-tv-muted hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{t.modals.candlesSymbolTab}</span>
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'canvas'
                ? 'border-tv-blue text-tv-blue font-bold'
                : 'border-transparent text-tv-muted hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>{t.modals.canvasGridTab}</span>
          </button>
          <button
            onClick={() => setActiveTab('watermark')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'watermark'
                ? 'border-tv-blue text-tv-blue font-bold'
                : 'border-transparent text-tv-muted hover:text-white'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>{t.modals.watermarkScaleTab}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeTab === 'candles' && (
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-tv-muted uppercase tracking-wider">
                {t.modals.candleColorsGroup}
              </div>

              {/* Up Candle */}
              <div className="bg-tv-card p-3 rounded border border-tv-border space-y-3">
                <span className="font-semibold text-tv-green flex items-center space-x-1">
                  <span>{t.modals.bullishCandle}</span>
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-tv-muted mb-1">{t.modals.bodyColor}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={settings.upColor}
                        onChange={(e) => setSettings({ ...settings, upColor: e.target.value })}
                        className="w-7 h-7 rounded border border-tv-border cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px]">{settings.upColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-tv-muted mb-1">{t.modals.borderLabel}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={settings.borderUpColor}
                        onChange={(e) => setSettings({ ...settings, borderUpColor: e.target.value })}
                        className="w-7 h-7 rounded border border-tv-border cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px]">{settings.borderUpColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-tv-muted mb-1">{t.modals.wickLabel}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={settings.wickUpColor}
                        onChange={(e) => setSettings({ ...settings, wickUpColor: e.target.value })}
                        className="w-7 h-7 rounded border border-tv-border cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px]">{settings.wickUpColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Down Candle */}
              <div className="bg-tv-card p-3 rounded border border-tv-border space-y-3">
                <span className="font-semibold text-tv-red flex items-center space-x-1">
                  <span>{t.modals.bearishCandle}</span>
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-tv-muted mb-1">{t.modals.bodyColor}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={settings.downColor}
                        onChange={(e) => setSettings({ ...settings, downColor: e.target.value })}
                        className="w-7 h-7 rounded border border-tv-border cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px]">{settings.downColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-tv-muted mb-1">{t.modals.borderLabel}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={settings.borderDownColor}
                        onChange={(e) => setSettings({ ...settings, borderDownColor: e.target.value })}
                        className="w-7 h-7 rounded border border-tv-border cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px]">{settings.borderDownColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-tv-muted mb-1">{t.modals.wickLabel}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={settings.wickDownColor}
                        onChange={(e) => setSettings({ ...settings, wickDownColor: e.target.value })}
                        className="w-7 h-7 rounded border border-tv-border cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px]">{settings.wickDownColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'canvas' && (
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-tv-muted uppercase tracking-wider">
                {t.modals.canvasGridTab}
              </div>

              {/* Background Color */}
              <div className="bg-tv-card p-3 rounded border border-tv-border space-y-2">
                <label className="block font-semibold text-white">{t.modals.backgroundColor}</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                    className="w-8 h-8 rounded border border-tv-border cursor-pointer bg-transparent"
                  />
                  <span className="font-mono text-xs">{settings.backgroundColor}</span>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <span className="text-[11px] text-tv-muted">Preset:</span>
                  {[
                    { name: 'Dark Blue', color: '#131722' },
                    { name: 'Black', color: '#0b0e14' },
                    { name: 'Grey', color: '#1e222d' },
                    { name: 'Light', color: '#ffffff' },
                  ].map((preset) => (
                    <button
                      key={preset.color}
                      onClick={() => setSettings({ ...settings, backgroundColor: preset.color })}
                      className="px-2 py-0.5 rounded text-[10px] border border-tv-border hover:border-tv-blue"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Lines */}
              <div className="bg-tv-card p-3 rounded border border-tv-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{t.modals.showGrid}</span>
                  <input
                    type="checkbox"
                    checked={settings.showGrid}
                    onChange={(e) => setSettings({ ...settings, showGrid: e.target.checked })}
                    className="accent-tv-blue cursor-pointer w-4 h-4"
                  />
                </div>
                {settings.showGrid && (
                  <div className="pt-2 border-t border-tv-border/50">
                    <label className="block text-[11px] text-tv-muted mb-1">{t.modals.gridColor}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={settings.gridColor.startsWith('#') ? settings.gridColor : '#2a2e39'}
                        onChange={(e) => setSettings({ ...settings, gridColor: e.target.value })}
                        className="w-7 h-7 rounded border border-tv-border cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px] text-tv-muted">{settings.gridColor}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'watermark' && (
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-tv-muted uppercase tracking-wider">
                {t.modals.watermarkScaleTab}
              </div>

              {/* Watermark Toggle */}
              <div className="bg-tv-card p-3 rounded border border-tv-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{t.modals.showWatermark}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showWatermark !== false}
                    onChange={(e) => setSettings({ ...settings, showWatermark: e.target.checked })}
                    className="accent-tv-blue cursor-pointer w-4 h-4"
                  />
                </div>

                {settings.showWatermark !== false && (
                  <div className="pt-2 border-t border-tv-border/50 space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-tv-muted">{t.modals.watermarkOpacity}</span>
                      <span className="font-mono font-bold text-white">
                        {Math.round((settings.watermarkOpacity ?? 0.07) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="0.25"
                      step="0.01"
                      value={settings.watermarkOpacity ?? 0.07}
                      onChange={(e) => setSettings({ ...settings, watermarkOpacity: parseFloat(e.target.value) })}
                      className="w-full accent-tv-blue cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Countdown to Bar Close Toggle */}
              <div className="bg-tv-card p-3 rounded border border-tv-border flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-tv-yellow" />
                    <span>{t.modals.showCountdown}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showCountdown !== false}
                  onChange={(e) => setSettings({ ...settings, showCountdown: e.target.checked })}
                  className="accent-tv-blue cursor-pointer w-4 h-4"
                />
              </div>

              {/* Invert Scale Toggle */}
              <div className="bg-tv-card p-3 rounded border border-tv-border flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{t.chart.invertScale}</div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.invertScale)}
                  onChange={(e) => setSettings({ ...settings, invertScale: e.target.checked })}
                  className="accent-tv-blue cursor-pointer w-4 h-4"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-tv-border bg-tv-bg">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-tv-muted hover:text-white hover:bg-tv-hover transition-colors text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.modals.resetToDefaults}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded hover:bg-tv-hover text-tv-muted hover:text-white text-xs"
            >
              {t.modals.cancelBtn}
            </button>
            <button
              onClick={handleApply}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-tv-blue text-white rounded font-medium hover:bg-tv-blue-hover text-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t.modals.applyChangesBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

