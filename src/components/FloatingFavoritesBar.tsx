import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  GripVertical, 
  Crosshair, 
  Minus, 
  ArrowUpRight, 
  Square, 
  BarChart2, 
  Eraser, 
  X, 
  Compass, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';
import { DrawingToolType } from '../types';
import { useTranslation } from '../i18n';

interface FloatingFavoritesBarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  onClose: () => void;
}

export const FloatingFavoritesBar: React.FC<FloatingFavoritesBarProps> = ({
  activeTool,
  onSelectTool,
  onClose,
}) => {
  const { t } = useTranslation();

  const favoriteTools = useMemo(() => [
    { tool: 'crosshair' as DrawingToolType, label: t.leftToolbar.crosshair, icon: <Crosshair className="w-3.5 h-3.5" /> },
    { tool: 'trendLine' as DrawingToolType, label: t.leftToolbar.trendLine, icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
    { tool: 'horizontalRay' as DrawingToolType, label: t.leftToolbar.horizontalRay, icon: <Minus className="w-3.5 h-3.5" /> },
    { tool: 'fibonacci' as DrawingToolType, label: t.leftToolbar.fibRetracement, icon: <Compass className="w-3.5 h-3.5" /> },
    { tool: 'rectangle' as DrawingToolType, label: t.leftToolbar.rectangle, icon: <Square className="w-3.5 h-3.5" /> },
    { tool: 'longPosition' as DrawingToolType, label: t.leftToolbar.longPosition, icon: <TrendingUp className="w-3.5 h-3.5 text-tv-green" /> },
    { tool: 'shortPosition' as DrawingToolType, label: t.leftToolbar.shortPosition, icon: <TrendingDown className="w-3.5 h-3.5 text-tv-red" /> },
    { tool: 'fixedRangeVolumeProfile' as DrawingToolType, label: t.leftToolbar.fixedRangeVolumeProfile, icon: <BarChart2 className="w-3.5 h-3.5 text-tv-blue" /> },
    { tool: 'eraser' as DrawingToolType, label: t.leftToolbar.eraser, icon: <Eraser className="w-3.5 h-3.5" /> },
  ], [t]);

  // Draggable position state
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('tv_fav_bar_pos');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return { x: 120, y: 70 };
  });

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 350, e.clientX - dragOffsetRef.current.x));
      const newY = Math.max(50, Math.min(window.innerHeight - 60, e.clientY - dragOffsetRef.current.y));
      setPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        try {
          localStorage.setItem('tv_fav_bar_pos', JSON.stringify(pos));
        } catch (_) {}
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pos]);

  return (
    <div
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      className="fixed z-40 flex items-center bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded-lg shadow-2xl p-1 space-x-0.5 text-tv-text select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Drag handle */}
      <div 
        onMouseDown={handleMouseDown}
        className="cursor-move p-1 text-tv-muted hover:text-white flex items-center justify-center rounded hover:bg-tv-hover"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <div className="w-[1px] h-4 bg-tv-border mx-0.5" />

      {/* Favorite Tools */}
      {favoriteTools.map(fav => {
        const isActive = activeTool === fav.tool;
        return (
          <button
            key={fav.tool}
            onClick={() => onSelectTool(fav.tool)}
            className={`p-1.5 rounded transition-colors flex items-center justify-center ${
              isActive 
                ? 'bg-tv-blue text-white shadow-sm' 
                : 'hover:bg-tv-hover text-tv-text hover:text-white'
            }`}
            title={fav.label}
          >
            {fav.icon}
          </button>
        );
      })}

      <div className="w-[1px] h-4 bg-tv-border mx-0.5" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="p-1 rounded text-tv-muted hover:text-white hover:bg-tv-hover transition-colors"
        title={t.common.close}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
