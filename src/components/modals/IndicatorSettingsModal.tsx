import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Clock, Sliders, Palette, HelpCircle } from 'lucide-react';
import { IndicatorConfig, Timeframe } from '../../types';
import { INDICATOR_DEFINITIONS } from '../../indicators/registry';
import { extractPythonInputs, PythonInputDef } from '../../services/pythonEngine';
import { useTranslation } from '../../i18n';

interface IndicatorSettingsModalProps {
  indicator: IndicatorConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: IndicatorConfig) => void;
}

const TIMEFRAME_OPTIONS: { value: Timeframe | 'chart'; label: string }[] = [
  { value: 'chart', label: 'Chart' },
  { value: '1s', label: '1s' },
  { value: '5s', label: '5s' },
  { value: '15s', label: '15s' },
  { value: '30s', label: '30s' },
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '45m', label: '45m' },
  { value: '1h', label: '1h' },
  { value: '2h', label: '2h' },
  { value: '3h', label: '3h' },
  { value: '4h', label: '4h' },
  { value: '6h', label: '6h' },
  { value: '8h', label: '8h' },
  { value: '12h', label: '12h' },
  { value: '1d', label: '1D' },
  { value: '2d', label: '2D' },
  { value: '3d', label: '3D' },
  { value: '1w', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '12M', label: '12M' },
];

const SOURCE_OPTIONS = ['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4', 'volume'];

interface IndicatorSettingsModalContentProps {
  indicator: IndicatorConfig;
  onClose: () => void;
  onSave: (updated: IndicatorConfig) => void;
}

const IndicatorSettingsModalContent: React.FC<IndicatorSettingsModalContentProps> = ({
  indicator,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const def = INDICATOR_DEFINITIONS.find(d => d.type === indicator.type);
  const [activeTab, setActiveTab] = useState<'inputs' | 'style'>('inputs');
  const [params, setParams] = useState<Record<string, any>>({ ...indicator.params });
  const [styles, setStyles] = useState<Record<string, any>>({ ...indicator.styles });
  const [timeframe, setTimeframe] = useState<Timeframe | 'chart'>(indicator.timeframe || 'chart');

  // Extract script inputs if CustomPython
  const scriptInputs = useMemo(() => {
    if (indicator.type === 'CustomPython' && indicator.pythonCode) {
      return extractPythonInputs(indicator.pythonCode);
    }
    return [];
  }, [indicator.type, indicator.pythonCode]);

  // Group script inputs by category
  const groupedScriptInputs = useMemo(() => {
    const groups: Record<string, PythonInputDef[]> = {};
    for (const inp of scriptInputs) {
      const g = inp.group || t.modals.chartSettingsTitle || 'Settings';
      if (!groups[g]) groups[g] = [];
      groups[g].push(inp);
    }
    return groups;
  }, [scriptInputs, t]);

  useEffect(() => {
    if (indicator) {
      // Initialize params with defaults from scriptInputs if not set
      const initial = { ...indicator.params };
      if (indicator.type === 'CustomPython') {
        scriptInputs.forEach(inp => {
          if (initial[inp.id] === undefined) {
            initial[inp.id] = inp.defval;
          }
        });
      }
      setParams(initial);
      const mergedStyles: Record<string, any> = {
        ...(def?.defaultStyles || {}),
        ...(indicator.styles || {})
      };
      setStyles(mergedStyles);
      setTimeframe(indicator.timeframe || 'chart');
    }
  }, [indicator, scriptInputs]);

  const handleParamChange = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));

    // Sync to styles band value if applicable
    if (key === 'overbought') {
      setStyles(prev => ({
        ...prev,
        upperBand: { ...(prev.upperBand || {}), value: parseFloat(value) || 0 }
      }));
    } else if (key === 'oversold') {
      setStyles(prev => ({
        ...prev,
        lowerBand: { ...(prev.lowerBand || {}), value: parseFloat(value) || 0 }
      }));
    } else if (key === 'middle') {
      setStyles(prev => ({
        ...prev,
        middleBand: { ...(prev.middleBand || {}), value: parseFloat(value) || 0 }
      }));
    }
  };

  const handleStyleChange = (styleKey: string, field: string, value: any) => {
    setStyles(prev => {
      const current = prev[styleKey] || {};
      return {
        ...prev,
        [styleKey]: { ...current, [field]: value }
      };
    });

    // If changing band level (value), sync to params if relevant
    if (field === 'value') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        if (styleKey === 'upperBand' && params.overbought !== undefined) {
          setParams(p => ({ ...p, overbought: num }));
        } else if (styleKey === 'lowerBand' && params.oversold !== undefined) {
          setParams(p => ({ ...p, oversold: num }));
        } else if (styleKey === 'middleBand' && params.middle !== undefined) {
          setParams(p => ({ ...p, middle: num }));
        }
      }
    }
  };

  const getStyleLabel = (key: string): string => {
    const map: Record<string, string> = {
      line: t.header.line,
      upperBand: t.modals.upperBand,
      lowerBand: t.modals.lowerBand,
      middleBand: t.modals.middleBand,
      zeroLine: 'Zero Line',
      upper: t.modals.upperBand,
      lower: t.modals.lowerBand,
      middle: t.modals.middleBand,
      k: '%K',
      d: '%D',
      macd: 'MACD',
      signal: 'Signal',
      histUp: 'Histogram (+)',
      histDown: 'Histogram (-)',
      hist: 'Histogram',
    };
    return map[key] || (key.charAt(0).toUpperCase() + key.slice(1));
  };

  const isBandOrLevel = (key: string, styleObj: any): boolean => {
    if (styleObj?.value !== undefined) return true;
    const k = key.toLowerCase();
    return k.includes('band') || k === 'zeroline';
  };

  const handleSave = () => {
    onSave({
      ...indicator,
      timeframe,
      params,
      styles,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-tv-surface border border-tv-border rounded-lg shadow-2xl w-full max-w-lg overflow-hidden text-tv-text text-xs flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-11 border-b border-tv-border px-4 flex items-center justify-between bg-tv-bg select-none">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white text-sm">{indicator.name}</span>
            <span className="text-[10px] bg-tv-blue/20 text-tv-blue font-mono font-bold px-1.5 py-0.5 rounded">
              {indicator.type === 'CustomPython' ? 'Python Quant' : indicator.type}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="h-9 border-b border-tv-border px-4 flex items-center space-x-4 bg-tv-surface text-xs font-semibold select-none">
          <button
            onClick={() => setActiveTab('inputs')}
            className={`h-full flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'inputs' ? 'border-tv-blue text-tv-blue font-bold' : 'border-transparent text-tv-muted hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{t.modals.inputsTab}</span>
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`h-full flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'style' ? 'border-tv-blue text-tv-blue font-bold' : 'border-transparent text-tv-muted hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{t.modals.styleTab}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'inputs' && (
            <div className="space-y-4">
              {/* Multi-Timeframe (MTF) Resolution */}
              <div className="bg-tv-bg p-3 rounded border border-tv-border space-y-1.5">
                <div className="flex items-center space-x-1.5 text-tv-blue font-bold text-[11px] uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t.modals.timeframeMtf}</span>
                </div>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as Timeframe | 'chart')}
                  className="w-full bg-tv-surface border border-tv-border rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-tv-blue font-medium"
                >
                  <option value="chart">{t.modals.timeframeMtfSame}</option>
                  {TIMEFRAME_OPTIONS.filter(o => o.value !== 'chart').map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-tv-muted">
                  {timeframe === 'chart' 
                    ? t.modals.timeframeMtfSame
                    : `${indicator.name} (${timeframe.toUpperCase()})`}
                </p>
              </div>

              {/* Standard Indicator Inputs */}
              {def && def.paramSchema.length > 0 && (
                <div className="bg-tv-bg p-3 rounded border border-tv-border space-y-3">
                  <div className="font-bold text-white uppercase text-[10px] tracking-wider border-b border-tv-border pb-1.5">
                    {t.modals.parametersHeader}
                  </div>
                  <div className="space-y-2.5">
                    {def.paramSchema.map(schema => (
                      <div key={schema.key} className="flex items-center justify-between">
                        <label className="text-tv-text font-medium">{schema.label}</label>
                        <input
                          type="number"
                          value={params[schema.key] ?? ''}
                          min={schema.min}
                          max={schema.max}
                          step={schema.step || 1}
                          onChange={(e) => handleParamChange(schema.key, parseFloat(e.target.value) || 0)}
                          className="w-24 bg-tv-surface border border-tv-border rounded px-2.5 py-1 text-white font-mono text-right focus:outline-none focus:border-tv-blue"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Script (Python) Inputs */}
              {indicator.type === 'CustomPython' && scriptInputs.length > 0 && (
                <div className="space-y-3">
                  {Object.entries(groupedScriptInputs).map(([groupName, inps]) => (
                    <div key={groupName} className="bg-tv-bg p-3 rounded border border-tv-border space-y-2.5">
                      <div className="font-bold text-white text-[11px] uppercase tracking-wider border-b border-tv-border pb-1.5 flex items-center justify-between">
                        <span>{groupName}</span>
                        <span className="text-[10px] text-tv-muted font-normal font-mono">{inps.length} Ayar</span>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        {inps.map(inp => {
                          const val = params[inp.id] !== undefined ? params[inp.id] : inp.defval;

                          return (
                            <div key={inp.id} className="flex items-center justify-between space-x-3 text-xs">
                              <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                <label className="text-tv-text font-medium truncate" title={inp.title}>
                                  {inp.title}
                                </label>
                                {inp.tooltip && (
                                  <span className="text-tv-muted hover:text-tv-blue cursor-help flex-shrink-0" title={inp.tooltip}>
                                    <HelpCircle className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>

                              {/* Boolean Toggle */}
                              {inp.type === 'bool' && (
                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(val)}
                                    onChange={(e) => handleParamChange(inp.id, e.target.checked)}
                                    className="w-4 h-4 rounded border-tv-border text-tv-blue accent-tv-blue cursor-pointer"
                                  />
                                </label>
                              )}

                              {/* String Dropdown Options */}
                              {inp.type === 'string' && inp.options && (
                                <select
                                  value={String(val)}
                                  onChange={(e) => handleParamChange(inp.id, e.target.value)}
                                  className="bg-tv-surface border border-tv-border rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-tv-blue font-medium max-w-[180px]"
                                >
                                  {inp.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}

                              {/* Source Dropdown */}
                              {inp.type === 'source' && (
                                <select
                                  value={String(val)}
                                  onChange={(e) => handleParamChange(inp.id, e.target.value)}
                                  className="bg-tv-surface border border-tv-border rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-tv-blue font-mono"
                                >
                                  {SOURCE_OPTIONS.map(src => (
                                    <option key={src} value={src}>{src}</option>
                                  ))}
                                </select>
                              )}

                              {/* Integer / Float Numeric Input */}
                              {(inp.type === 'int' || inp.type === 'float') && (
                                <input
                                  type="number"
                                  value={val ?? ''}
                                  min={inp.min}
                                  max={inp.max}
                                  step={inp.step || (inp.type === 'float' ? 0.1 : 1)}
                                  onChange={(e) => handleParamChange(inp.id, parseFloat(e.target.value) || 0)}
                                  className="w-24 bg-tv-surface border border-tv-border rounded px-2 py-1 text-white font-mono text-right focus:outline-none focus:border-tv-blue"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'style' && (
            <div className="space-y-4">
              <div className="bg-tv-bg p-3 rounded border border-tv-border space-y-3">
                <div className="font-bold text-white uppercase text-[10px] tracking-wider border-b border-tv-border pb-1.5 flex items-center justify-between">
                  <span>{t.modals.visualStyleBands}</span>
                </div>
                <div className="space-y-2.5">
                  {Object.keys(styles).length > 0 ? (
                    Object.keys(styles).map(styleKey => {
                      const styleObj = styles[styleKey] || {};
                      const isBand = isBandOrLevel(styleKey, styleObj);

                      return (
                        <div key={styleKey} className="bg-tv-surface/60 border border-tv-border/70 rounded-md p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={styleObj.visible !== false}
                                onChange={(e) => handleStyleChange(styleKey, 'visible', e.target.checked)}
                                className="w-4 h-4 rounded border-tv-border text-tv-blue accent-tv-blue cursor-pointer"
                                title="Visible"
                              />
                              <label className="text-white font-medium text-xs">
                                {getStyleLabel(styleKey)}
                              </label>
                            </div>

                            {/* Numeric Level value for bands (e.g. 70, 30, 50, 80, 20, 100, etc.) */}
                            {isBand && (
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] text-tv-muted font-medium">{t.modals.levelLabel}</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={styleObj.value ?? ''}
                                  onChange={(e) => handleStyleChange(styleKey, 'value', parseFloat(e.target.value) || 0)}
                                  className="w-16 bg-tv-bg border border-tv-border rounded px-2.5 py-0.5 text-white font-mono text-right text-xs focus:outline-none focus:border-tv-blue"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-tv-border/40 text-[11px]">
                            {/* Color picker */}
                            <div className="flex items-center space-x-2">
                              <input
                                type="color"
                                value={styleObj.color || '#2962ff'}
                                onChange={(e) => handleStyleChange(styleKey, 'color', e.target.value)}
                                className="w-6 h-6 rounded border border-tv-border cursor-pointer bg-transparent"
                              />
                              <span className="font-mono text-[10px] text-tv-muted uppercase">
                                {styleObj.color || '#2962ff'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {/* Line Width */}
                              <div className="flex items-center space-x-1">
                                <span className="text-[10px] text-tv-muted">{t.modals.widthLabel}</span>
                                <select
                                  value={styleObj.lineWidth ?? 1}
                                  onChange={(e) => handleStyleChange(styleKey, 'lineWidth', parseInt(e.target.value, 10))}
                                  className="bg-tv-bg border border-tv-border rounded px-1.5 py-0.5 text-white text-xs focus:outline-none focus:border-tv-blue"
                                >
                                  <option value={1}>1px</option>
                                  <option value={2}>2px</option>
                                  <option value={3}>3px</option>
                                  <option value={4}>4px</option>
                                </select>
                              </div>

                              {/* Line Style (Solid, Dashed, Dotted) */}
                              <div className="flex items-center space-x-1">
                                <span className="text-[10px] text-tv-muted">{t.modals.styleLabel}</span>
                                <select
                                  value={styleObj.lineStyle ?? (isBand ? 2 : 0)}
                                  onChange={(e) => handleStyleChange(styleKey, 'lineStyle', parseInt(e.target.value, 10))}
                                  className="bg-tv-bg border border-tv-border rounded px-1.5 py-0.5 text-white text-xs focus:outline-none focus:border-tv-blue font-mono"
                                >
                                  <option value={0}>{t.modals.solid}</option>
                                  <option value={2}>{t.modals.dashed}</option>
                                  <option value={1}>{t.modals.dotted}</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-tv-muted text-xs py-2">
                      Auto
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-tv-border px-4 bg-tv-bg flex items-center justify-between select-none">
          <button
            onClick={() => {
              if (indicator.type === 'CustomPython') {
                const defaults: Record<string, any> = {};
                scriptInputs.forEach(i => defaults[i.id] = i.defval);
                setParams(defaults);
              } else if (def) {
                setParams({ ...def.defaultParams });
              }
            }}
            className="text-xs text-tv-muted hover:text-white transition-colors"
          >
            {t.modals.resetToDefaults}
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded hover:bg-tv-hover text-tv-muted hover:text-white transition-colors"
            >
              {t.modals.cancelBtn}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded bg-tv-blue text-white font-bold hover:bg-blue-600 shadow-sm transition-colors flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t.common.save}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const IndicatorSettingsModal: React.FC<IndicatorSettingsModalProps> = ({
  indicator,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !indicator) return null;

  return (
    <IndicatorSettingsModalContent
      key={indicator.id}
      indicator={indicator}
      onClose={onClose}
      onSave={onSave}
    />
  );
};
