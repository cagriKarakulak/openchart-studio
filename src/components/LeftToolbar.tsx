import React, { useState } from 'react';
import { 
  Crosshair, 
  MousePointer, 
  CircleDot,
  Eraser, 
  Minus, 
  ArrowUpRight, 
  Square, 
  Circle,
  Layers, 
  Ruler, 
  Type, 
  Paintbrush, 
  Magnet, 
  Eye, 
  EyeOff, 
  Trash2, 
  ChevronRight,
  Target,
  Compass,
  Lock,
  Unlock,
  PenTool,
  Tag,
  ArrowUp,
  ArrowDown,
  BarChart2
} from 'lucide-react';
import { DrawingToolType } from '../types';
import { useTranslation } from '../i18n';

interface LeftToolbarProps {
  activeTool: DrawingToolType;
  magnetMode: boolean | 'weak' | 'strong' | 'off';
  onSelectTool: (tool: DrawingToolType) => void;
  onSelectMagnetMode?: (mode: any) => void;
  onToggleMagnet: () => void;
  onClearDrawings: () => void;
  onToggleHideDrawings: () => void;
  areDrawingsHidden: boolean;
  lockDrawings?: boolean;
  onToggleLockDrawings?: () => void;
  stayInDrawingMode?: boolean;
  onToggleStayInDrawingMode?: () => void;
  showFavoritesBar?: boolean;
  onToggleFavoritesBar?: () => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = React.memo(({
  activeTool,
  magnetMode,
  onSelectTool,
  onToggleMagnet,
  onClearDrawings,
  onToggleHideDrawings,
  areDrawingsHidden,
  lockDrawings = false,
  onToggleLockDrawings,
  stayInDrawingMode = false,
  onToggleStayInDrawingMode,
  showFavoritesBar = false,
  onToggleFavoritesBar,
}) => {
  const { t } = useTranslation();
  const [openFlyout, setOpenFlyout] = useState<string | null>(null);

  // Group membership checks
  const isCursorGroup = ['cursor', 'crosshair', 'dot', 'eraser'].includes(activeTool);
  const isLineGroup = [
    'trendLine', 'ray', 'infoLine', 'extendedLine', 'trendAngle', 
    'horizontalLine', 'horizontalRay', 'verticalLine', 'crossLine', 'parallelChannel'
  ].includes(activeTool);
  const isFibGroup = [
    'fibonacci', 'fibExtension', 'fibChannel', 'fibTimeZones', 'fibCircles', 'gannBox', 'gannFan'
  ].includes(activeTool);
  const isShapeGroup = [
    'brush', 'highlighter', 'arrow', 'rectangle', 'circle', 'ellipse', 'triangle', 'polyline'
  ].includes(activeTool);
  const isTextGroup = [
    'text', 'anchoredText', 'callout', 'priceLabel', 'arrowUp', 'arrowDown'
  ].includes(activeTool);
  const isPatternGroup = [
    'xabcdPattern', 'headAndShoulders', 'trianglePattern', 'elliottImpulse', 'elliottCorrection'
  ].includes(activeTool);
  const isPositionGroup = [
    'longPosition', 'shortPosition', 'forecast', 'dateRange', 'priceRange', 'measure', 'fixedRangeVolumeProfile'
  ].includes(activeTool);

  const toggleFlyout = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenFlyout(prev => prev === name ? null : name);
  };

  return (
    <aside 
      className="w-11 bg-tv-surface border-r border-tv-border flex flex-col items-center py-2 space-y-1 select-none z-30 relative"
      onMouseLeave={() => setOpenFlyout(null)}
    >
      {/* ======================================================== */}
      {/* 1. CURSOR / CROSSHAIR GROUP                              */}
      {/* ======================================================== */}
      <div className="relative">
        <button
          onClick={() => onSelectTool(isCursorGroup ? activeTool : 'crosshair')}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors relative ${
            isCursorGroup ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
          }`}
          title={t.leftToolbar.cursorTools}
        >
          {activeTool === 'dot' ? (
            <CircleDot className="w-4 h-4" />
          ) : activeTool === 'cursor' ? (
            <MousePointer className="w-4 h-4" />
          ) : activeTool === 'eraser' ? (
            <Eraser className="w-4 h-4" />
          ) : (
            <Crosshair className="w-4 h-4" />
          )}
          <span 
            className="absolute bottom-0 right-0.5 text-[7px] opacity-70"
            onClick={(e) => toggleFlyout('cursor', e)}
          >
            ▸
          </span>
        </button>

        {openFlyout === 'cursor' && (
          <div className="absolute top-0 left-10 w-48 bg-tv-surface border border-tv-border rounded shadow-2xl py-1 z-50 text-xs text-tv-text backdrop-blur-md">
            <button
              onClick={() => { onSelectTool('crosshair'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'crosshair' ? 'text-tv-blue font-bold' : ''}`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.crosshair}</span>
            </button>
            <button
              onClick={() => { onSelectTool('dot'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'dot' ? 'text-tv-blue font-bold' : ''}`}
            >
              <CircleDot className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.dot}</span>
            </button>
            <button
              onClick={() => { onSelectTool('cursor'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'cursor' ? 'text-tv-blue font-bold' : ''}`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.arrow}</span>
            </button>
            <div className="border-t border-tv-border/50 my-1" />
            <button
              onClick={() => { onSelectTool('eraser'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'eraser' ? 'text-tv-red font-bold' : ''}`}
            >
              <Eraser className="w-3.5 h-3.5 text-tv-red" />
              <span>{t.leftToolbar.eraser}</span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. TREND LINES GROUP                                    */}
      {/* ======================================================== */}
      <div className="relative">
        <button
          onClick={() => onSelectTool(isLineGroup ? activeTool : 'trendLine')}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors relative ${
            isLineGroup ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
          }`}
          title={t.leftToolbar.trendTools}
        >
          {activeTool === 'horizontalLine' ? (
            <Minus className="w-4 h-4" />
          ) : (
            <ArrowUpRight className="w-4 h-4" />
          )}
          <span 
            className="absolute bottom-0 right-0.5 text-[7px] opacity-70"
            onClick={(e) => toggleFlyout('line', e)}
          >
            ▸
          </span>
        </button>

        {openFlyout === 'line' && (
          <div className="absolute top-0 left-10 w-52 bg-tv-surface border border-tv-border rounded shadow-2xl py-1 z-50 text-xs text-tv-text backdrop-blur-md">
            <button
              onClick={() => { onSelectTool('trendLine'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'trendLine' ? 'text-tv-blue font-bold' : ''}`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.trendLine}</span>
            </button>
            <button
              onClick={() => { onSelectTool('ray'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'ray' ? 'text-tv-blue font-bold' : ''}`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.ray}</span>
            </button>
            <button
              onClick={() => { onSelectTool('extendedLine'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'extendedLine' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">←―→</span>
              <span>{t.leftToolbar.extendedLine}</span>
            </button>
            <div className="border-t border-tv-border/50 my-1" />
            <button
              onClick={() => { onSelectTool('horizontalLine'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'horizontalLine' ? 'text-tv-blue font-bold' : ''}`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.horizontalLine}</span>
            </button>
            <button
              onClick={() => { onSelectTool('horizontalRay'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'horizontalRay' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">--→</span>
              <span>{t.leftToolbar.horizontalRay}</span>
            </button>
            <button
              onClick={() => { onSelectTool('verticalLine'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'verticalLine' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">|</span>
              <span>{t.leftToolbar.verticalLine}</span>
            </button>
            <button
              onClick={() => { onSelectTool('crossLine'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'crossLine' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">+</span>
              <span>{t.leftToolbar.crossLine}</span>
            </button>
            <div className="border-t border-tv-border/50 my-1" />
            <button
              onClick={() => { onSelectTool('parallelChannel'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'parallelChannel' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">||</span>
              <span>{t.leftToolbar.parallelChannel}</span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. GANN & FIBONACCI GROUP                                */}
      {/* ======================================================== */}
      <div className="relative">
        <button
          onClick={() => onSelectTool(isFibGroup ? activeTool : 'fibonacci')}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors relative ${
            isFibGroup ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
          }`}
          title={t.leftToolbar.fibonacciTools}
        >
          <Layers className="w-4 h-4" />
          <span 
            className="absolute bottom-0 right-0.5 text-[7px] opacity-70"
            onClick={(e) => toggleFlyout('fib', e)}
          >
            ▸
          </span>
        </button>

        {openFlyout === 'fib' && (
          <div className="absolute top-0 left-10 w-56 bg-tv-surface border border-tv-border rounded shadow-2xl py-1 z-50 text-xs text-tv-text backdrop-blur-md">
            <button
              onClick={() => { onSelectTool('fibonacci'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'fibonacci' ? 'text-tv-blue font-bold' : ''}`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.fibRetracement}</span>
            </button>
            <button
              onClick={() => { onSelectTool('fibExtension'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'fibExtension' ? 'text-tv-blue font-bold' : ''}`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.trendBasedFibExtension}</span>
            </button>
            <button
              onClick={() => { onSelectTool('fibChannel'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'fibChannel' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">///</span>
              <span>{t.leftToolbar.fibChannel}</span>
            </button>
            <button
              onClick={() => { onSelectTool('fibTimeZones'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'fibTimeZones' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">|||</span>
              <span>{t.leftToolbar.fibTimeZones}</span>
            </button>
            <div className="border-t border-tv-border/50 my-1" />
            <button
              onClick={() => { onSelectTool('gannBox'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'gannBox' ? 'text-tv-blue font-bold' : ''}`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.gannBox}</span>
            </button>
            <button
              onClick={() => { onSelectTool('gannFan'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'gannFan' ? 'text-tv-blue font-bold' : ''}`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.gannFan}</span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. GEOMETRIC SHAPES GROUP                               */}
      {/* ======================================================== */}
      <div className="relative">
        <button
          onClick={() => onSelectTool(isShapeGroup ? activeTool : 'rectangle')}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors relative ${
            isShapeGroup ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
          }`}
          title={t.leftToolbar.geometricShapes}
        >
          {activeTool === 'brush' ? (
            <Paintbrush className="w-4 h-4" />
          ) : activeTool === 'circle' ? (
            <Circle className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          <span 
            className="absolute bottom-0 right-0.5 text-[7px] opacity-70"
            onClick={(e) => toggleFlyout('shape', e)}
          >
            ▸
          </span>
        </button>

        {openFlyout === 'shape' && (
          <div className="absolute top-0 left-10 w-48 bg-tv-surface border border-tv-border rounded shadow-2xl py-1 z-50 text-xs text-tv-text backdrop-blur-md">
            <button
              onClick={() => { onSelectTool('brush'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'brush' ? 'text-tv-blue font-bold' : ''}`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.brush}</span>
            </button>
            <button
              onClick={() => { onSelectTool('highlighter'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'highlighter' ? 'text-tv-blue font-bold' : ''}`}
            >
              <PenTool className="w-3.5 h-3.5 text-yellow-400" />
              <span>{t.leftToolbar.highlighter}</span>
            </button>
            <div className="border-t border-tv-border/50 my-1" />
            <button
              onClick={() => { onSelectTool('rectangle'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'rectangle' ? 'text-tv-blue font-bold' : ''}`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.rectangle}</span>
            </button>
            <button
              onClick={() => { onSelectTool('circle'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'circle' ? 'text-tv-blue font-bold' : ''}`}
            >
              <Circle className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.circle}</span>
            </button>
            <button
              onClick={() => { onSelectTool('ellipse'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'ellipse' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">⬭</span>
              <span>{t.leftToolbar.ellipse}</span>
            </button>
            <button
              onClick={() => { onSelectTool('triangle'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'triangle' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">△</span>
              <span>{t.leftToolbar.triangle}</span>
            </button>
            <button
              onClick={() => { onSelectTool('polyline'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'polyline' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">⎎</span>
              <span>{t.leftToolbar.polyline}</span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. ANNOTATION & TEXT GROUP                               */}
      {/* ======================================================== */}
      <div className="relative">
        <button
          onClick={() => onSelectTool(isTextGroup ? activeTool : 'text')}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors relative ${
            isTextGroup ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
          }`}
          title={t.leftToolbar.annotationTools}
        >
          <Type className="w-4 h-4" />
          <span 
            className="absolute bottom-0 right-0.5 text-[7px] opacity-70"
            onClick={(e) => toggleFlyout('text', e)}
          >
            ▸
          </span>
        </button>

        {openFlyout === 'text' && (
          <div className="absolute top-0 left-10 w-48 bg-tv-surface border border-tv-border rounded shadow-2xl py-1 z-50 text-xs text-tv-text backdrop-blur-md">
            <button
              onClick={() => { onSelectTool('text'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'text' ? 'text-tv-blue font-bold' : ''}`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.text}</span>
            </button>
            <button
              onClick={() => { onSelectTool('anchoredText'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'anchoredText' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs font-bold">[T]</span>
              <span>{t.leftToolbar.anchoredText}</span>
            </button>
            <button
              onClick={() => { onSelectTool('callout'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'callout' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">💬</span>
              <span>{t.leftToolbar.callout}</span>
            </button>
            <button
              onClick={() => { onSelectTool('priceLabel'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'priceLabel' ? 'text-tv-blue font-bold' : ''}`}
            >
              <Tag className="w-3.5 h-3.5 text-tv-blue" />
              <span>{t.leftToolbar.priceLabel}</span>
            </button>
            <div className="border-t border-tv-border/50 my-1" />
            <button
              onClick={() => { onSelectTool('arrowUp'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'arrowUp' ? 'text-tv-green font-bold' : ''}`}
            >
              <ArrowUp className="w-3.5 h-3.5 text-tv-green" />
              <span>{t.common.buy} ↑</span>
            </button>
            <button
              onClick={() => { onSelectTool('arrowDown'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'arrowDown' ? 'text-tv-red font-bold' : ''}`}
            >
              <ArrowDown className="w-3.5 h-3.5 text-tv-red" />
              <span>{t.common.sell} ↓</span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 6. PATTERNS & ELLIOTT WAVES GROUP                        */}
      {/* ======================================================== */}
      <div className="relative">
        <button
          onClick={() => onSelectTool(isPatternGroup ? activeTool : 'headAndShoulders')}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors relative ${
            isPatternGroup ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
          }`}
          title={t.leftToolbar.patterns}
        >
          <Compass className="w-4 h-4" />
          <span 
            className="absolute bottom-0 right-0.5 text-[7px] opacity-70"
            onClick={(e) => toggleFlyout('pattern', e)}
          >
            ▸
          </span>
        </button>

        {openFlyout === 'pattern' && (
          <div className="absolute top-0 left-10 w-52 bg-tv-surface border border-tv-border rounded shadow-2xl py-1 z-50 text-xs text-tv-text backdrop-blur-md">
            <button
              onClick={() => { onSelectTool('xabcdPattern'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'xabcdPattern' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs font-bold text-tv-blue">XABCD</span>
              <span>{t.leftToolbar.xabcd}</span>
            </button>
            <button
              onClick={() => { onSelectTool('headAndShoulders'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'headAndShoulders' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs font-bold text-orange-400">H&S</span>
              <span>{t.leftToolbar.headAndShoulders}</span>
            </button>
            <div className="border-t border-tv-border/50 my-1" />
            <button
              onClick={() => { onSelectTool('elliottImpulse'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'elliottImpulse' ? 'text-tv-green font-bold' : ''}`}
            >
              <span className="font-mono text-xs font-bold text-tv-green">1-5</span>
              <span>{t.leftToolbar.elliottImpulse}</span>
            </button>
            <button
              onClick={() => { onSelectTool('elliottCorrection'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'elliottCorrection' ? 'text-tv-red font-bold' : ''}`}
            >
              <span className="font-mono text-xs font-bold text-tv-red">A-C</span>
              <span>{t.leftToolbar.elliottCorrection}</span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 7. PREDICTION & MEASUREMENT GROUP                        */}
      {/* ======================================================== */}
      <div className="relative">
        <button
          onClick={() => onSelectTool(isPositionGroup ? activeTool : 'longPosition')}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors relative ${
            isPositionGroup ? 'bg-tv-blue text-white' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
          }`}
          title={t.leftToolbar.predictionTools}
        >
          <Target className="w-4 h-4" />
          <span 
            className="absolute bottom-0 right-0.5 text-[7px] opacity-70"
            onClick={(e) => toggleFlyout('position', e)}
          >
            ▸
          </span>
        </button>

        {openFlyout === 'position' && (
          <div className="absolute top-0 left-10 w-52 bg-tv-surface border border-tv-border rounded shadow-2xl py-1 z-50 text-xs text-tv-text backdrop-blur-md">
            <button
              onClick={() => { onSelectTool('longPosition'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'longPosition' ? 'text-tv-green font-bold' : ''}`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-tv-green" />
              <span>{t.leftToolbar.longPosition}</span>
            </button>
            <button
              onClick={() => { onSelectTool('shortPosition'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'shortPosition' ? 'text-tv-red font-bold' : ''}`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-tv-red" />
              <span>{t.leftToolbar.shortPosition}</span>
            </button>
            <button
              onClick={() => { onSelectTool('forecast'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'forecast' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">🎯</span>
              <span>{t.leftToolbar.forecast}</span>
            </button>
            <div className="border-t border-tv-border/50 my-1" />
            <button
              onClick={() => { onSelectTool('dateRange'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'dateRange' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">📅</span>
              <span>{t.leftToolbar.dateRange}</span>
            </button>
            <button
              onClick={() => { onSelectTool('priceRange'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'priceRange' ? 'text-tv-blue font-bold' : ''}`}
            >
              <span className="font-mono text-xs">💲</span>
              <span>{t.leftToolbar.priceRange}</span>
            </button>
            <button
              onClick={() => { onSelectTool('measure'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'measure' ? 'text-tv-blue font-bold' : ''}`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>{t.leftToolbar.measureTool}</span>
            </button>
            <div className="border-t border-tv-border/50 my-1" />
            <button
              onClick={() => { onSelectTool('fixedRangeVolumeProfile'); setOpenFlyout(null); }}
              className={`w-full px-3 py-1.5 flex items-center space-x-2.5 hover:bg-tv-hover ${activeTool === 'fixedRangeVolumeProfile' ? 'text-tv-yellow font-bold' : ''}`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-tv-yellow" />
              <div className="flex flex-col text-left">
                <span className="font-semibold text-white">{t.leftToolbar.fixedRangeVolumeProfile}</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 8. QUICK MEASURE TOOL (CETVEL)                           */}
      {/* ======================================================== */}
      <button
        onClick={() => onSelectTool('measure')}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          activeTool === 'measure'
            ? 'bg-tv-blue text-white'
            : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
        }`}
        title={t.leftToolbar.measureTool}
      >
        <Ruler className="w-4 h-4" />
      </button>

      {/* Divider */}
      <div className="w-6 h-[1px] bg-tv-border my-1" />

      {/* ======================================================== */}
      {/* 9. MAGNET MODE TOGGLE                                    */}
      {/* ======================================================== */}
      {(() => {
        const isMagnetActive = magnetMode === true || magnetMode === 'weak' || magnetMode === 'strong';
        return (
          <button
            onClick={onToggleMagnet}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              isMagnetActive
                ? 'bg-tv-blue text-white shadow-lg shadow-tv-blue/30'
                : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
            }`}
            title={t.leftToolbar.magnetMode}
          >
            <Magnet className="w-4 h-4" />
          </button>
        );
      })()}

      {/* ======================================================== */}
      {/* 10. STAY IN DRAWING MODE                                */}
      {/* ======================================================== */}
      <button
        onClick={onToggleStayInDrawingMode}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          stayInDrawingMode
            ? 'bg-tv-blue text-white'
            : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
        }`}
        title={t.leftToolbar.stayInDrawingMode}
      >
        <PenTool className="w-4 h-4" />
      </button>

      {/* ======================================================== */}
      {/* 11. LOCK ALL DRAWINGS                                   */}
      {/* ======================================================== */}
      <button
        onClick={onToggleLockDrawings}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          lockDrawings
            ? 'text-yellow-400 bg-yellow-400/10'
            : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
        }`}
        title={t.leftToolbar.lockAllDrawings}
      >
        {lockDrawings ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </button>

      {/* ======================================================== */}
      {/* 12. HIDE / SHOW DRAWINGS                                */}
      {/* ======================================================== */}
      <button
        onClick={onToggleHideDrawings}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          areDrawingsHidden
            ? 'text-tv-red bg-tv-red/10'
            : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
        }`}
        title={t.leftToolbar.hideAllDrawings}
      >
        {areDrawingsHidden ? <EyeOff className="w-4 h-4 text-tv-red" /> : <Eye className="w-4 h-4" />}
      </button>

      {/* ======================================================== */}
      {/* 13. CLEAR ALL DRAWINGS                                  */}
      {/* ======================================================== */}
      <button
        onClick={onClearDrawings}
        className="w-8 h-8 rounded flex items-center justify-center text-tv-muted hover:text-tv-red hover:bg-tv-hover transition-colors"
        title={t.leftToolbar.removeAll}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* ======================================================== */}
      {/* 14. TOGGLE FAVORITES DRAWING BAR                        */}
      {/* ======================================================== */}
      <button
        onClick={onToggleFavoritesBar}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          showFavoritesBar
            ? 'text-yellow-400 bg-yellow-400/15'
            : 'text-tv-muted hover:text-yellow-400 hover:bg-tv-hover'
        }`}
        title="★ Favorites"
      >
        <span className="text-sm leading-none font-bold">★</span>
      </button>
    </aside>
  );
});
