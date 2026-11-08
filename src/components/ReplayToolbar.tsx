import React from 'react';
import { Play, Pause, SkipForward, RotateCcw, X, Scissors, FastForward } from 'lucide-react';

interface ReplayToolbarProps {
  isActive: boolean;
  isPlaying: boolean;
  currentIdx: number;
  totalCandles: number;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onClose: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  isJumpMode?: boolean;
  onToggleJumpMode?: () => void;
  onJumpToRealtime?: () => void;
}

export const ReplayToolbar: React.FC<ReplayToolbarProps> = ({
  isActive,
  isPlaying,
  currentIdx,
  totalCandles,
  onTogglePlay,
  onStepForward,
  onReset,
  onClose,
  speed,
  onSpeedChange,
  isJumpMode = false,
  onToggleJumpMode,
  onJumpToRealtime,
}) => {
  if (!isActive) return null;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-tv-surface/95 backdrop-blur-md border border-tv-blue rounded-lg shadow-2xl px-4 py-2 flex items-center space-x-3 text-xs select-none animate-fadeIn">
      <div className="flex items-center space-x-1.5 font-bold text-white border-r border-tv-border pr-3">
        <RotateCcw className="w-4 h-4 text-tv-blue animate-spin-reverse" />
        <span>Bar Replay</span>
      </div>

      {/* Jump to Bar (Cut mode) */}
      <button
        onClick={onToggleJumpMode}
        className={`px-2.5 py-1 rounded flex items-center space-x-1.5 transition-colors font-semibold ${
          isJumpMode ? 'bg-tv-yellow text-black font-bold animate-pulse' : 'bg-tv-card hover:bg-tv-hover text-tv-text border border-tv-border'
        }`}
        title="Bara Git: Grafikte herhangi bir muma tıklayarak simülasyonu o noktaya kesin"
      >
        <Scissors className="w-3.5 h-3.5" />
        <span>{isJumpMode ? 'Bir Muma Tıklayın' : 'Bara Git (Kes)'}</span>
      </button>

      {/* Play / Pause */}
      <button
        onClick={onTogglePlay}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          isPlaying ? 'bg-tv-red text-white' : 'bg-tv-blue text-white'
        }`}
        title={isPlaying ? 'Durdur' : 'Oynat'}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>

      {/* Step Forward */}
      <button
        onClick={onStepForward}
        disabled={isPlaying || currentIdx >= totalCandles - 1}
        className="p-1.5 rounded hover:bg-tv-hover text-tv-text disabled:opacity-40"
        title="1 Bar İleri Al"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Speed Selector */}
      <div className="flex items-center space-x-1 border-l border-r border-tv-border px-2">
        {[0.2, 0.5, 1, 2, 5, 10].map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              speed === s ? 'bg-tv-blue text-white font-bold' : 'text-tv-muted hover:text-white'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Progress Counter */}
      <div className="font-mono text-[11px] text-tv-muted">
        Bar: <strong className="text-white">{currentIdx + 1}</strong> / {totalCandles}
      </div>

      {/* Jump to Realtime */}
      {onJumpToRealtime && (
        <button
          onClick={onJumpToRealtime}
          className="p-1.5 rounded hover:bg-tv-hover text-tv-muted hover:text-tv-green flex items-center space-x-1"
          title="Canlı Zamana Atla"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span className="text-[10px]">Canlı</span>
        </button>
      )}

      {/* Reset */}
      <button
        onClick={onReset}
        className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white"
        title="Başa Sar"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Exit Replay */}
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-tv-red"
        title="Replay Modundan Çık"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

