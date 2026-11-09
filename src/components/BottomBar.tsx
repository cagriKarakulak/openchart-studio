import React, { useState, useEffect } from 'react';
import { Clock, BarChart2, Terminal, Play, Wallet, ChevronUp, ChevronDown } from 'lucide-react';
import { BottomTabType } from './BottomDock';
import { useTranslation } from '../i18n';

interface BottomBarProps {
  connectionStatus: 'connected' | 'reconnecting' | 'simulated';
  onTimeRangeSelect: (range: string) => void;
  isDockOpen?: boolean;
  activeDockTab?: BottomTabType;
  onSelectDockTab?: (tab: BottomTabType) => void;
  onToggleDock?: () => void;
}

const TIMEZONES = [
  { label: 'UTC (UTC+0)', offset: 0 },
  { label: 'Istanbul (UTC+3)', offset: 3 },
  { label: 'New York (UTC-4)', offset: -4 },
  { label: 'London (UTC+1)', offset: 1 },
  { label: 'Frankfurt (UTC+2)', offset: 2 },
  { label: 'Tokyo (UTC+9)', offset: 9 },
  { label: 'Singapore (UTC+8)', offset: 8 },
];

export const BottomBar: React.FC<BottomBarProps> = ({
  connectionStatus,
  onTimeRangeSelect,
  isDockOpen = false,
  activeDockTab = 'paperTrading',
  onSelectDockTab,
  onToggleDock,
}) => {
  const { t } = useTranslation();
  const [selectedTz, setSelectedTz] = useState(TIMEZONES[1]);
  const [showTzMenu, setShowTzMenu] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const tzDate = new Date(utc + (3600000 * selectedTz.offset));
      const hours = tzDate.getHours().toString().padStart(2, '0');
      const mins = tzDate.getMinutes().toString().padStart(2, '0');
      const secs = tzDate.getSeconds().toString().padStart(2, '0');
      setCurrentTimeStr(`${hours}:${mins}:${secs}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [selectedTz]);

  const ranges = [
    { key: '1D', label: t.bottomBar.range1D },
    { key: '5D', label: t.bottomBar.range5D },
    { key: '1M', label: t.bottomBar.range1M },
    { key: '3M', label: t.bottomBar.range3M },
    { key: '6M', label: t.bottomBar.range6M },
    { key: '1Y', label: t.bottomBar.range1Y },
    { key: 'ALL', label: t.bottomBar.rangeAll },
  ];

  return (
    <footer className="h-7 bg-tv-surface border-t border-tv-border flex items-center justify-between px-3 text-[11px] text-tv-muted select-none z-20">
      {/* Left: Quick Time Ranges */}
      <div className="flex items-center space-x-1">
        {ranges.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTimeRangeSelect(key)}
            className="px-1.5 py-0.5 rounded hover:text-white hover:bg-tv-hover transition-colors font-medium text-[10px]"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Middle: OpenChart Bottom Dock Tabs */}
      <div className="flex items-center space-x-1 md:space-x-2">
        <button
          onClick={() => {
            if (onSelectDockTab) {
              if (isDockOpen && activeDockTab === 'screener') {
                onToggleDock?.();
              } else {
                onSelectDockTab('screener');
              }
            }
          }}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
            isDockOpen && activeDockTab === 'screener'
              ? 'text-tv-blue bg-tv-hover font-bold border border-tv-border'
              : 'hover:text-white hover:bg-tv-hover'
          }`}
          title={t.bottomDock.screener}
        >
          <BarChart2 className="w-3 h-3" />
          <span>{t.bottomBar.screenerTab}</span>
        </button>

        <button
          onClick={() => {
            if (onSelectDockTab) {
              if (isDockOpen && activeDockTab === 'pythonEditor') {
                onToggleDock?.();
              } else {
                onSelectDockTab('pythonEditor');
              }
            }
          }}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
            isDockOpen && activeDockTab === 'pythonEditor'
              ? 'text-tv-blue bg-tv-hover font-bold border border-tv-border'
              : 'hover:text-white hover:bg-tv-hover'
          }`}
          title={t.bottomDock.pythonEditor}
        >
          <Terminal className="w-3 h-3" />
          <span>{t.bottomBar.pythonEditorTab}</span>
        </button>

        <button
          onClick={() => {
            if (onSelectDockTab) {
              if (isDockOpen && activeDockTab === 'strategyTester') {
                onToggleDock?.();
              } else {
                onSelectDockTab('strategyTester');
              }
            }
          }}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
            isDockOpen && activeDockTab === 'strategyTester'
              ? 'text-tv-blue bg-tv-hover font-bold border border-tv-border'
              : 'hover:text-white hover:bg-tv-hover'
          }`}
          title={t.bottomDock.strategyTester}
        >
          <Play className="w-3 h-3" />
          <span>{t.bottomBar.strategyTesterTab}</span>
        </button>

        <button
          onClick={() => {
            if (onSelectDockTab) {
              if (isDockOpen && activeDockTab === 'paperTrading') {
                onToggleDock?.();
              } else {
                onSelectDockTab('paperTrading');
              }
            }
          }}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
            isDockOpen && activeDockTab === 'paperTrading'
              ? 'text-tv-blue bg-tv-hover font-bold border border-tv-border'
              : 'hover:text-white hover:bg-tv-hover'
          }`}
          title={t.bottomDock.paperTrading}
        >
          <Wallet className="w-3 h-3" />
          <span>{t.bottomBar.paperTradingTab}</span>
        </button>

        {onToggleDock && (
          <button
            onClick={onToggleDock}
            className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white transition-colors"
            title={isDockOpen ? t.common.close : t.common.edit}
          >
            {isDockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Right: Timezone & Live Connection Status */}
      <div className="flex items-center space-x-3">
        {/* Interactive Timezone Picker */}
        <div className="relative">
          <button
            onClick={() => setShowTzMenu(!showTzMenu)}
            className="flex items-center space-x-1 text-tv-text font-mono hover:bg-tv-hover px-1.5 py-0.5 rounded transition-colors"
            title={t.bottomBar.timezone}
          >
            <Clock className="w-3 h-3 text-tv-muted" />
            <span>{currentTimeStr || '12:00:00'}</span>
            <span className="text-tv-blue text-[10px] ml-1">({selectedTz.label.split('(')[1]?.replace(')', '') || 'UTC+3'})</span>
          </button>

          {showTzMenu && (
            <div 
              className="absolute bottom-6 right-0 w-48 bg-tv-surface border border-tv-border rounded-lg shadow-2xl py-1 z-50 text-xs text-tv-text backdrop-blur-md"
              onMouseLeave={() => setShowTzMenu(false)}
            >
              <div className="px-3 py-1 text-[10px] font-bold text-tv-muted uppercase tracking-wider border-b border-tv-border/50">
                {t.bottomBar.timezone}
              </div>
              {TIMEZONES.map(tz => (
                <button
                  key={tz.label}
                  onClick={() => {
                    setSelectedTz(tz);
                    setShowTzMenu(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-tv-hover ${
                    selectedTz.label === tz.label ? 'text-tv-blue font-bold' : ''
                  }`}
                >
                  <span>{tz.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-3 w-[1px] bg-tv-border" />

        <div className="flex items-center space-x-1.5">
          <span 
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-tv-green animate-pulse'
                : connectionStatus === 'reconnecting'
                ? 'bg-tv-yellow animate-ping'
                : 'bg-tv-purple'
            }`} 
          />
          <span className="font-medium text-tv-text">
            {connectionStatus === 'connected' && t.bottomBar.live}
            {connectionStatus === 'reconnecting' && `${t.common.loading}`}
            {connectionStatus === 'simulated' && t.common.active}
          </span>
        </div>
      </div>
    </footer>
  );
};
