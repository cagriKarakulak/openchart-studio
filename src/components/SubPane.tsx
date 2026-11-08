import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  ColorType, 
  CrosshairMode, 
  LineSeries, 
  HistogramSeries,
  Time 
} from 'lightweight-charts';
import { CandleData, IndicatorConfig, Timeframe } from '../types';
import { computeWithMtf } from '../services/multiTimeframeService';
import { executePineScript } from '../services/pineEngine';
import { executePythonScript } from '../services/pythonEngine';
import { 
  calculateRSI, 
  calculateMACD, 
  calculateStochastic, 
  calculateATR, 
  calculateCCI, 
  calculateWilliamsR, 
  calculateAwesomeOscillator, 
  calculateMFI, 
  calculateROC, 
  calculateCMF,
  calculateVolumeSeries,
  calculateADX,
  calculateStochRSI,
  calculateOBV,
  calculateAroon,
  calculateStandardDeviation,
  calculateHistoricalVolatility,
  calculateTSI,
  calculateUltimateOscillator,
  calculateVortex,
  calculateChandeMO,
  calculateDPO,
  calculateEaseOfMovement,
  calculateBOP,
  calculateFisherTransform,
  calculatePPO,
  calculateVolumeOscillator,
  calculateBBWidth,
  calculateBBBPct,
  calculateNATR,
  calculateMOM,
  calculateAcceleratorOscillator,
  calculateKST,
  calculateRVI,
  calculateCoppockCurve,
  calculateMassIndex,
  calculateChaikinVolatility,
  calculateConnorsRSI,
  calculateADL,
  calculatePVT,
  calculateEFI,
  calculateChoppinessIndex,
  calculateKlingerOscillator,
  calculateChaikinOscillator,
  calculateTRIX,
  calculateLinearRegressionSlope,
  calculateStandardError,
  calculateSMIErgodic,
  calculateRelativeVolatilityIndex,
  calculateNetVolume,
  calculatePriceOscillator,
  calculateAccumulativeSwingIndex,
  calculateTrueRange,
  calculateVolatilityCloseToClose,
  calculateRankCorrelationIndex,
  findFloorCandleByTime
} from '../indicators/math';
import { Eye, EyeOff, Settings, X } from 'lucide-react';

interface SubPaneProps {
  indicator: IndicatorConfig;
  candles: CandleData[];
  timeframe?: Timeframe;
  mainChart: IChartApi | null;
  hoverTime?: number | null;
  onHoverTimeChange?: (time: number | null) => void;
  onToggleVisibility: (id: string) => void;
  onOpenSettings: (indicator: IndicatorConfig) => void;
  onRemove: (id: string) => void;
}

export const SubPane: React.FC<SubPaneProps> = React.memo(({
  indicator,
  candles,
  timeframe,
  mainChart,
  hoverTime,
  onHoverTimeChange,
  onToggleVisibility,
  onOpenSettings,
  onRemove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const isSyncingRef = useRef(false);
  const isUserInteractingRef = useRef(false);

  // Dynamic height state with mouse drag resizing & persistence
  const [paneHeight, setPaneHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`openchart_subpane_height_${indicator.id}`) || localStorage.getItem(`openchart_subpane_height_${indicator.type}`);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 65 && val <= 600) return val;
      }
    } catch (_) {}
    return 130;
  });
  const [isResizing, setIsResizing] = useState(false);

  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startH = paneHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Dragging mouse UP increases height of subpane
      const deltaY = startY - moveEvent.clientY;
      const minH = 70;
      const maxH = 550;
      const newHeight = Math.round(Math.min(Math.max(startH + deltaY, minH), maxH));
      setPaneHeight(newHeight);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        setPaneHeight(h => {
          localStorage.setItem(`openchart_subpane_height_${indicator.id}`, String(h));
          localStorage.setItem(`openchart_subpane_height_${indicator.type}`, String(h));
          return h;
        });
      } catch (_) {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Time-to-Value map for O(1) instant crosshair value lookup
  const timeToValueMapRef = useRef<Map<number, string>>(new Map());
  const lastValRef = useRef<string>('');
  const [displayVal, setDisplayVal] = useState<string>('');
  const candlesRef = useRef<CandleData[]>(candles);
  candlesRef.current = candles;

  // 1. Initialize SubChart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: paneHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#787b86',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#787b86', width: 1, style: 3, labelBackgroundColor: '#2a2e39' },
        horzLine: { color: '#787b86', width: 1, style: 3, labelBackgroundColor: '#2a2e39' },
      },
      timeScale: {
        visible: false, // hide time scale, main chart shows time
        borderColor: '#2a2e39',
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        autoScale: true,
      },
    });

    chartRef.current = chart;

    // SubChart's own crosshair listener
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setDisplayVal(lastValRef.current);
        onHoverTimeChange?.(null);
        return;
      }
      const t = Number(param.time);
      const val = timeToValueMapRef.current.get(t);
      if (val !== undefined) {
        setDisplayVal(val);
      }
      onHoverTimeChange?.(t);
    });

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Update chart dimensions when paneHeight changes
  useEffect(() => {
    if (chartRef.current && containerRef.current) {
      chartRef.current.applyOptions({
        height: paneHeight,
      });
    }
  }, [paneHeight]);

  // 2. Sync crosshair & timeScale bidirectionally with Main Chart
  useEffect(() => {
    if (!chartRef.current || !mainChart) return;
    const subChart = chartRef.current;
    const subTimeScale = subChart.timeScale();
    const mainTimeScale = mainChart.timeScale();

    // TimeScale Range Sync: SubPane follows MainChart, never overwrites it on load
    const handleMainRangeChange = (range: any) => {
      if (isSyncingRef.current || !range) return;
      isSyncingRef.current = true;
      try {
        subTimeScale.setVisibleLogicalRange(range);
      } catch (_) {}
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    };

    const handleSubRangeChange = (range: any) => {
      // ONLY forward range changes to MainChart if the user is actively interacting with SubPane
      if (isSyncingRef.current || !isUserInteractingRef.current || !range) return;
      isSyncingRef.current = true;
      try {
        mainTimeScale.setVisibleLogicalRange(range);
      } catch (_) {}
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    };

    mainTimeScale.subscribeVisibleLogicalRangeChange(handleMainRangeChange);
    subTimeScale.subscribeVisibleLogicalRangeChange(handleSubRangeChange);

    // Crosshair Sync: When user moves mouse on Main Chart, update SubPane's legend!
    const handleMainCrosshairMove = (param: any) => {
      if (!param || !param.time) {
        setDisplayVal(lastValRef.current);
        return;
      }
      const val = timeToValueMapRef.current.get(Number(param.time));
      if (val !== undefined) {
        setDisplayVal(val);
      }
    };

    mainChart.subscribeCrosshairMove(handleMainCrosshairMove);

    // Initial range sync: mirror MainChart without propagating back
    const initialRange = mainTimeScale.getVisibleLogicalRange();
    if (initialRange) {
      isSyncingRef.current = true;
      try { 
        subTimeScale.setVisibleLogicalRange(initialRange); 
      } catch (_) {}
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    }

    return () => {
      try {
        mainTimeScale.unsubscribeVisibleLogicalRangeChange(handleMainRangeChange);
        subTimeScale.unsubscribeVisibleLogicalRangeChange(handleSubRangeChange);
        mainChart.unsubscribeCrosshairMove(handleMainCrosshairMove);
      } catch (_) {}
    };
  }, [mainChart]);

  // 3. Render Indicator Data into SubPane & Populate timeToValueMap
  useEffect(() => {
    if (!chartRef.current || candles.length === 0 || !indicator.visible) return;

    const chart = chartRef.current;
    const valueMap = new Map<number, string>();
    let seriesList: ISeriesApi<any>[] = [];
    let latestStr = '';

    const tfSuffix = (indicator.timeframe && indicator.timeframe !== 'chart' && indicator.timeframe !== timeframe)
      ? ` (${indicator.timeframe.toUpperCase()})`
      : '';
    const calcMtf = <T extends { time: number }>(fn: (c: CandleData[]) => T[]) => {
      return computeWithMtf(candles, timeframe || '15m', indicator.timeframe, fn);
    };

    switch (indicator.type) {
      case 'CustomPython':
      case 'CustomPine': {
        let plots = indicator.customPlots;
        let hlines = indicator.customHlines;
        if (indicator.pythonCode) {
          try {
            const executed = executePythonScript(indicator.pythonCode, candles, indicator.params);
            if (executed.success && executed.plots.length > 0) {
              plots = executed.plots;
              hlines = executed.hlines;
            }
          } catch (_) {}
        } else if (indicator.pineCode) {
          try {
            const executed = executePineScript(indicator.pineCode, candles, indicator.params);
            if (executed.success && executed.plots.length > 0) {
              plots = executed.plots;
              hlines = executed.hlines;
            }
          } catch (_) {}
        }
        if (plots && plots.length > 0) {
          const sList: ISeriesApi<any>[] = [];
          plots.forEach(p => {
            const cleanData: { time: Time; value: number }[] = [];
            let lastT = -Infinity;
            for (const pt of p.values) {
              if (pt.time > lastT && !isNaN(pt.value) && isFinite(pt.value)) {
                cleanData.push({ time: pt.time as Time, value: pt.value });
                lastT = pt.time;
              }
            }

            cleanData.forEach(d => valueMap.set(d.time as number, d.value.toFixed(2)));
            if (cleanData.length > 0) {
              latestStr = cleanData[cleanData.length - 1].value.toFixed(2);
            }
            const line = chart.addSeries(LineSeries, {
              color: p.color || '#2962ff',
              lineWidth: (p.lineWidth as any) || 2,
              title: `${p.title}${tfSuffix}`,
            });
            line.setData(cleanData);
            sList.push(line);
          });

          if (hlines) {
            hlines.forEach(hl => {
              const hLine = chart.addSeries(LineSeries, {
                color: hl.color || '#787b86',
                lineWidth: (hl.lineWidth as any) || 1,
                lineStyle: hl.lineStyle || 2,
              });
              hLine.setData(candles.map(c => ({ time: c.time as Time, value: hl.price })));
              sList.push(hLine);
            });
          }
          seriesList = sList;
        }
        break;
      }

      case 'RSI': {
        const period = Number(indicator.params.period || 14);
        const rsi = calcMtf(c => calculateRSI(c, period));

        rsi.forEach(d => {
          valueMap.set(d.time, d.value.toFixed(2));
        });

        if (rsi.length > 0) {
          latestStr = rsi[rsi.length - 1].value.toFixed(2);
        }

        const sList: ISeriesApi<any>[] = [];

        // Main RSI line
        if (indicator.styles.line?.visible !== false) {
          const line = chart.addSeries(LineSeries, {
            color: indicator.styles.line?.color || '#b388ff',
            lineWidth: (indicator.styles.line?.lineWidth ?? 2) as any,
            lineStyle: (indicator.styles.line?.lineStyle ?? 0) as any,
            title: `RSI ${period}${tfSuffix}`,
          });
          line.setData(rsi.map(d => ({ time: d.time as Time, value: d.value })));
          sList.push(line);
        }

        // Upper Band (Dynamic Level, Color, Style, Width)
        const upperVal = Number(indicator.styles.upperBand?.value ?? indicator.params.overbought ?? 70);
        if (indicator.styles.upperBand?.visible !== false && rsi.length > 0) {
          const upper = chart.addSeries(LineSeries, {
            color: indicator.styles.upperBand?.color || '#787b86',
            lineWidth: (indicator.styles.upperBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.upperBand?.lineStyle ?? 2) as any,
            title: `Upper (${upperVal})`,
          });
          upper.setData(rsi.map(d => ({ time: d.time as Time, value: upperVal })));
          sList.push(upper);
        }

        // Middle Band (50 Level)
        const midVal = Number(indicator.styles.middleBand?.value ?? indicator.params.middle ?? 50);
        if (indicator.styles.middleBand?.visible !== false && rsi.length > 0) {
          const middle = chart.addSeries(LineSeries, {
            color: indicator.styles.middleBand?.color || 'rgba(120, 123, 134, 0.6)',
            lineWidth: (indicator.styles.middleBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.middleBand?.lineStyle ?? 1) as any,
            title: `Middle (${midVal})`,
          });
          middle.setData(rsi.map(d => ({ time: d.time as Time, value: midVal })));
          sList.push(middle);
        }

        // Lower Band (Dynamic Level, Color, Style, Width)
        const lowerVal = Number(indicator.styles.lowerBand?.value ?? indicator.params.oversold ?? 30);
        if (indicator.styles.lowerBand?.visible !== false && rsi.length > 0) {
          const lower = chart.addSeries(LineSeries, {
            color: indicator.styles.lowerBand?.color || '#787b86',
            lineWidth: (indicator.styles.lowerBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.lowerBand?.lineStyle ?? 2) as any,
            title: `Lower (${lowerVal})`,
          });
          lower.setData(rsi.map(d => ({ time: d.time as Time, value: lowerVal })));
          sList.push(lower);
        }

        seriesList = sList;
        break;
      }

      case 'MACD': {
        const fast = Number(indicator.params.fast || 12);
        const slow = Number(indicator.params.slow || 26);
        const signal = Number(indicator.params.signal || 9);
        const macd = calcMtf(c => calculateMACD(c, fast, slow, signal));

        macd.forEach(d => {
          valueMap.set(d.time, `MACD: ${d.macd.toFixed(2)}  Signal: ${d.signal.toFixed(2)}  Hist: ${d.histogram.toFixed(2)}`);
        });

        if (macd.length > 0) {
          const last = macd[macd.length - 1];
          latestStr = `MACD: ${last.macd.toFixed(2)}  Signal: ${last.signal.toFixed(2)}  Hist: ${last.histogram.toFixed(2)}`;
        }

        const sList: ISeriesApi<any>[] = [];

        if (indicator.styles.histUp?.visible !== false || indicator.styles.histDown?.visible !== false) {
          const hist = chart.addSeries(HistogramSeries, { title: 'Hist' });
          hist.setData(macd.map(d => ({
            time: d.time as Time,
            value: d.histogram,
            color: d.histogram >= 0 ? (indicator.styles.histUp?.color || '#26a69a') : (indicator.styles.histDown?.color || '#ef5350'),
          })));
          sList.push(hist);
        }

        if (indicator.styles.macd?.visible !== false) {
          const macdLine = chart.addSeries(LineSeries, {
            color: indicator.styles.macd?.color || '#2962ff',
            lineWidth: (indicator.styles.macd?.lineWidth ?? 2) as any,
            lineStyle: (indicator.styles.macd?.lineStyle ?? 0) as any,
            title: 'MACD',
          });
          macdLine.setData(macd.map(d => ({ time: d.time as Time, value: d.macd })));
          sList.push(macdLine);
        }

        if (indicator.styles.signal?.visible !== false) {
          const sigLine = chart.addSeries(LineSeries, {
            color: indicator.styles.signal?.color || '#ff9800',
            lineWidth: (indicator.styles.signal?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.signal?.lineStyle ?? 0) as any,
            title: 'Signal',
          });
          sigLine.setData(macd.map(d => ({ time: d.time as Time, value: d.signal })));
          sList.push(sigLine);
        }

        seriesList = sList;
        break;
      }

      case 'Stochastic': {
        const pk = Number(indicator.params.periodK || 14);
        const sk = Number(indicator.params.smoothK || 3);
        const sd = Number(indicator.params.smoothD || 3);
        const stoch = calcMtf(c => calculateStochastic(c, pk, sk, sd));

        stoch.forEach(d => {
          valueMap.set(d.time, `%K: ${d.k.toFixed(2)}  %D: ${d.d.toFixed(2)}`);
        });

        if (stoch.length > 0) {
          const last = stoch[stoch.length - 1];
          latestStr = `%K: ${last.k.toFixed(2)}  %D: ${last.d.toFixed(2)}`;
        }

        const sList: ISeriesApi<any>[] = [];

        if (indicator.styles.k?.visible !== false) {
          const kLine = chart.addSeries(LineSeries, {
            color: indicator.styles.k?.color || '#2962ff',
            lineWidth: (indicator.styles.k?.lineWidth ?? 2) as any,
            lineStyle: (indicator.styles.k?.lineStyle ?? 0) as any,
            title: `%K${tfSuffix}`,
          });
          kLine.setData(stoch.map(d => ({ time: d.time as Time, value: d.k })));
          sList.push(kLine);
        }

        if (indicator.styles.d?.visible !== false) {
          const dLine = chart.addSeries(LineSeries, {
            color: indicator.styles.d?.color || '#ff9800',
            lineWidth: (indicator.styles.d?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.d?.lineStyle ?? 0) as any,
            title: `%D${tfSuffix}`,
          });
          dLine.setData(stoch.map(d => ({ time: d.time as Time, value: d.d })));
          sList.push(dLine);
        }

        // Upper Band (80)
        const upperVal = Number(indicator.styles.upperBand?.value ?? indicator.params.overbought ?? 80);
        if (indicator.styles.upperBand?.visible !== false && stoch.length > 0) {
          const upper = chart.addSeries(LineSeries, {
            color: indicator.styles.upperBand?.color || '#787b86',
            lineWidth: (indicator.styles.upperBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.upperBand?.lineStyle ?? 2) as any,
            title: `Upper (${upperVal})`,
          });
          upper.setData(stoch.map(d => ({ time: d.time as Time, value: upperVal })));
          sList.push(upper);
        }

        // Middle Band (50)
        const midVal = Number(indicator.styles.middleBand?.value ?? 50);
        if (indicator.styles.middleBand?.visible !== false && stoch.length > 0) {
          const middle = chart.addSeries(LineSeries, {
            color: indicator.styles.middleBand?.color || 'rgba(120, 123, 134, 0.6)',
            lineWidth: (indicator.styles.middleBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.middleBand?.lineStyle ?? 1) as any,
            title: `Middle (${midVal})`,
          });
          middle.setData(stoch.map(d => ({ time: d.time as Time, value: midVal })));
          sList.push(middle);
        }

        // Lower Band (20)
        const lowerVal = Number(indicator.styles.lowerBand?.value ?? indicator.params.oversold ?? 20);
        if (indicator.styles.lowerBand?.visible !== false && stoch.length > 0) {
          const lower = chart.addSeries(LineSeries, {
            color: indicator.styles.lowerBand?.color || '#787b86',
            lineWidth: (indicator.styles.lowerBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.lowerBand?.lineStyle ?? 2) as any,
            title: `Lower (${lowerVal})`,
          });
          lower.setData(stoch.map(d => ({ time: d.time as Time, value: lowerVal })));
          sList.push(lower);
        }

        seriesList = sList;
        break;
      }

      case 'ATR': {
        const period = Number(indicator.params.period || 14);
        const atr = calcMtf(c => calculateATR(c, period));

        atr.forEach(d => {
          valueMap.set(d.time, d.value.toFixed(2));
        });

        if (atr.length > 0) {
          latestStr = atr[atr.length - 1].value.toFixed(2);
        }

        const line = chart.addSeries(LineSeries, {
          color: indicator.styles.line?.color || '#ab47bc',
          lineWidth: 2,
          title: `ATR ${period}${tfSuffix}`,
        });
        line.setData(atr.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'Volume': {
        const { volumes, volumeMA } = calculateVolumeSeries(candles);

        volumes.forEach(v => {
          valueMap.set(v.time, v.value.toLocaleString());
        });

        if (volumes.length > 0) {
          latestStr = volumes[volumes.length - 1].value.toLocaleString();
        }

        const volSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          title: 'Volume',
        });
        volSeries.setData(volumes.map(v => ({ time: v.time as Time, value: v.value, color: v.color })));

        const maSeries = chart.addSeries(LineSeries, {
          color: '#2962ff',
          lineWidth: 1,
          title: 'Vol MA',
        });
        maSeries.setData(volumeMA.map(m => ({ time: m.time as Time, value: m.value })));

        seriesList = [volSeries, maSeries];
        break;
      }

      case 'CCI': {
        const period = Number(indicator.params.period || 20);
        const cci = calculateCCI(candles, period);

        cci.forEach(d => {
          valueMap.set(d.time, d.value.toFixed(2));
        });

        if (cci.length > 0) {
          latestStr = cci[cci.length - 1].value.toFixed(2);
        }

        const sList: ISeriesApi<any>[] = [];

        if (indicator.styles.line?.visible !== false) {
          const line = chart.addSeries(LineSeries, {
            color: indicator.styles.line?.color || '#e040fb',
            lineWidth: (indicator.styles.line?.lineWidth ?? 2) as any,
            lineStyle: (indicator.styles.line?.lineStyle ?? 0) as any,
            title: `CCI ${period}`,
          });
          line.setData(cci.map(d => ({ time: d.time as Time, value: d.value })));
          sList.push(line);
        }

        // Upper Band (100)
        const upperVal = Number(indicator.styles.upperBand?.value ?? 100);
        if (indicator.styles.upperBand?.visible !== false && cci.length > 0) {
          const upper = chart.addSeries(LineSeries, {
            color: indicator.styles.upperBand?.color || '#787b86',
            lineWidth: (indicator.styles.upperBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.upperBand?.lineStyle ?? 2) as any,
            title: `Upper (${upperVal})`,
          });
          upper.setData(cci.map(d => ({ time: d.time as Time, value: upperVal })));
          sList.push(upper);
        }

        // Zero Line (0)
        const zeroVal = Number(indicator.styles.zeroLine?.value ?? 0);
        if (indicator.styles.zeroLine?.visible !== false && cci.length > 0) {
          const zero = chart.addSeries(LineSeries, {
            color: indicator.styles.zeroLine?.color || 'rgba(120, 123, 134, 0.5)',
            lineWidth: (indicator.styles.zeroLine?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.zeroLine?.lineStyle ?? 1) as any,
            title: `Zero (${zeroVal})`,
          });
          zero.setData(cci.map(d => ({ time: d.time as Time, value: zeroVal })));
          sList.push(zero);
        }

        // Lower Band (-100)
        const lowerVal = Number(indicator.styles.lowerBand?.value ?? -100);
        if (indicator.styles.lowerBand?.visible !== false && cci.length > 0) {
          const lower = chart.addSeries(LineSeries, {
            color: indicator.styles.lowerBand?.color || '#787b86',
            lineWidth: (indicator.styles.lowerBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.lowerBand?.lineStyle ?? 2) as any,
            title: `Lower (${lowerVal})`,
          });
          lower.setData(cci.map(d => ({ time: d.time as Time, value: lowerVal })));
          sList.push(lower);
        }

        seriesList = sList;
        break;
      }

      case 'WilliamsR': {
        const period = Number(indicator.params.period || 14);
        const wr = calculateWilliamsR(candles, period);

        wr.forEach(d => {
          valueMap.set(d.time, d.value.toFixed(2));
        });

        if (wr.length > 0) {
          latestStr = wr[wr.length - 1].value.toFixed(2);
        }

        const sList: ISeriesApi<any>[] = [];

        if (indicator.styles.line?.visible !== false) {
          const line = chart.addSeries(LineSeries, {
            color: indicator.styles.line?.color || '#00e676',
            lineWidth: (indicator.styles.line?.lineWidth ?? 2) as any,
            lineStyle: (indicator.styles.line?.lineStyle ?? 0) as any,
            title: `%R ${period}`,
          });
          line.setData(wr.map(d => ({ time: d.time as Time, value: d.value })));
          sList.push(line);
        }

        // Upper Band (-20)
        const upperVal = Number(indicator.styles.upperBand?.value ?? -20);
        if (indicator.styles.upperBand?.visible !== false && wr.length > 0) {
          const upper = chart.addSeries(LineSeries, {
            color: indicator.styles.upperBand?.color || '#787b86',
            lineWidth: (indicator.styles.upperBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.upperBand?.lineStyle ?? 2) as any,
            title: `Upper (${upperVal})`,
          });
          upper.setData(wr.map(d => ({ time: d.time as Time, value: upperVal })));
          sList.push(upper);
        }

        // Lower Band (-80)
        const lowerVal = Number(indicator.styles.lowerBand?.value ?? -80);
        if (indicator.styles.lowerBand?.visible !== false && wr.length > 0) {
          const lower = chart.addSeries(LineSeries, {
            color: indicator.styles.lowerBand?.color || '#787b86',
            lineWidth: (indicator.styles.lowerBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.lowerBand?.lineStyle ?? 2) as any,
            title: `Lower (${lowerVal})`,
          });
          lower.setData(wr.map(d => ({ time: d.time as Time, value: lowerVal })));
          sList.push(lower);
        }

        seriesList = sList;
        break;
      }

      case 'AwesomeOscillator': {
        const ao = calculateAwesomeOscillator(candles);

        ao.forEach(d => {
          valueMap.set(d.time, d.value.toFixed(4));
        });

        if (ao.length > 0) {
          latestStr = ao[ao.length - 1].value.toFixed(4);
        }

        const hist = chart.addSeries(HistogramSeries, { title: 'AO' });
        hist.setData(ao.map(d => ({ time: d.time as Time, value: d.value, color: d.color })));
        seriesList = [hist];
        break;
      }

      case 'MFI': {
        const period = Number(indicator.params.period || 14);
        const mfi = calculateMFI(candles, period);

        mfi.forEach(d => {
          valueMap.set(d.time, d.value.toFixed(2));
        });

        if (mfi.length > 0) {
          latestStr = mfi[mfi.length - 1].value.toFixed(2);
        }

        const sList: ISeriesApi<any>[] = [];

        if (indicator.styles.line?.visible !== false) {
          const line = chart.addSeries(LineSeries, {
            color: indicator.styles.line?.color || '#00bcd4',
            lineWidth: (indicator.styles.line?.lineWidth ?? 2) as any,
            lineStyle: (indicator.styles.line?.lineStyle ?? 0) as any,
            title: `MFI ${period}`,
          });
          line.setData(mfi.map(d => ({ time: d.time as Time, value: d.value })));
          sList.push(line);
        }

        // Upper Band (80)
        const upperVal = Number(indicator.styles.upperBand?.value ?? indicator.params.overbought ?? 80);
        if (indicator.styles.upperBand?.visible !== false && mfi.length > 0) {
          const upper = chart.addSeries(LineSeries, {
            color: indicator.styles.upperBand?.color || '#787b86',
            lineWidth: (indicator.styles.upperBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.upperBand?.lineStyle ?? 2) as any,
            title: `Upper (${upperVal})`,
          });
          upper.setData(mfi.map(d => ({ time: d.time as Time, value: upperVal })));
          sList.push(upper);
        }

        // Lower Band (20)
        const lowerVal = Number(indicator.styles.lowerBand?.value ?? indicator.params.oversold ?? 20);
        if (indicator.styles.lowerBand?.visible !== false && mfi.length > 0) {
          const lower = chart.addSeries(LineSeries, {
            color: indicator.styles.lowerBand?.color || '#787b86',
            lineWidth: (indicator.styles.lowerBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.lowerBand?.lineStyle ?? 2) as any,
            title: `Lower (${lowerVal})`,
          });
          lower.setData(mfi.map(d => ({ time: d.time as Time, value: lowerVal })));
          sList.push(lower);
        }

        seriesList = sList;
        break;
      }

      case 'ROC': {
        const period = Number(indicator.params.period || 12);
        const roc = calculateROC(candles, period);

        roc.forEach(d => {
          valueMap.set(d.time, `${d.value.toFixed(2)}%`);
        });

        if (roc.length > 0) {
          latestStr = `${roc[roc.length - 1].value.toFixed(2)}%`;
        }

        const line = chart.addSeries(LineSeries, { color: '#ffeb3b', lineWidth: 2, title: `ROC ${period}` });
        line.setData(roc.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'CMF': {
        const period = Number(indicator.params.period || 20);
        const cmf = calculateCMF(candles, period);

        cmf.forEach(d => {
          valueMap.set(d.time, d.value.toFixed(4));
        });

        if (cmf.length > 0) {
          latestStr = cmf[cmf.length - 1].value.toFixed(4);
        }

        const line = chart.addSeries(LineSeries, { color: '#26a69a', lineWidth: 2, title: `CMF ${period}` });
        line.setData(cmf.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'ADX': {
        const period = Number(indicator.params.period || 14);
        const adx = calculateADX(candles, period);
        adx.forEach(d => {
          valueMap.set(d.time, `ADX: ${d.adx.toFixed(2)}  +DI: ${d.plusDI.toFixed(2)}  -DI: ${d.minusDI.toFixed(2)}`);
        });
        if (adx.length > 0) {
          const l = adx[adx.length - 1];
          latestStr = `ADX: ${l.adx.toFixed(2)}  +DI: ${l.plusDI.toFixed(2)}  -DI: ${l.minusDI.toFixed(2)}`;
        }
        const adxLine = chart.addSeries(LineSeries, { color: '#ff9800', lineWidth: 2, title: 'ADX' });
        const plusLine = chart.addSeries(LineSeries, { color: '#089981', lineWidth: 1, title: '+DI' });
        const minusLine = chart.addSeries(LineSeries, { color: '#f23645', lineWidth: 1, title: '-DI' });
        adxLine.setData(adx.map(d => ({ time: d.time as Time, value: d.adx })));
        plusLine.setData(adx.map(d => ({ time: d.time as Time, value: d.plusDI })));
        minusLine.setData(adx.map(d => ({ time: d.time as Time, value: d.minusDI })));
        seriesList = [adxLine, plusLine, minusLine];
        break;
      }

      case 'StochRSI': {
        const rp = Number(indicator.params.rsiPeriod || 14);
        const sp = Number(indicator.params.stochPeriod || 14);
        const stochRsi = calculateStochRSI(candles, rp, sp, 3, 3);
        stochRsi.forEach(d => {
          valueMap.set(d.time, `%K: ${d.k.toFixed(2)}  %D: ${d.d.toFixed(2)}`);
        });
        if (stochRsi.length > 0) {
          const l = stochRsi[stochRsi.length - 1];
          latestStr = `%K: ${l.k.toFixed(2)}  %D: ${l.d.toFixed(2)}`;
        }

        const sList: ISeriesApi<any>[] = [];

        if (indicator.styles.k?.visible !== false) {
          const kLine = chart.addSeries(LineSeries, {
            color: indicator.styles.k?.color || '#2962ff',
            lineWidth: (indicator.styles.k?.lineWidth ?? 2) as any,
            lineStyle: (indicator.styles.k?.lineStyle ?? 0) as any,
            title: '%K',
          });
          kLine.setData(stochRsi.map(d => ({ time: d.time as Time, value: d.k })));
          sList.push(kLine);
        }

        if (indicator.styles.d?.visible !== false) {
          const dLine = chart.addSeries(LineSeries, {
            color: indicator.styles.d?.color || '#ff9800',
            lineWidth: (indicator.styles.d?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.d?.lineStyle ?? 0) as any,
            title: '%D',
          });
          dLine.setData(stochRsi.map(d => ({ time: d.time as Time, value: d.d })));
          sList.push(dLine);
        }

        // Upper Band (80)
        const upperVal = Number(indicator.styles.upperBand?.value ?? indicator.params.overbought ?? 80);
        if (indicator.styles.upperBand?.visible !== false && stochRsi.length > 0) {
          const upper = chart.addSeries(LineSeries, {
            color: indicator.styles.upperBand?.color || '#787b86',
            lineWidth: (indicator.styles.upperBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.upperBand?.lineStyle ?? 2) as any,
            title: `Upper (${upperVal})`,
          });
          upper.setData(stochRsi.map(d => ({ time: d.time as Time, value: upperVal })));
          sList.push(upper);
        }

        // Lower Band (20)
        const lowerVal = Number(indicator.styles.lowerBand?.value ?? indicator.params.oversold ?? 20);
        if (indicator.styles.lowerBand?.visible !== false && stochRsi.length > 0) {
          const lower = chart.addSeries(LineSeries, {
            color: indicator.styles.lowerBand?.color || '#787b86',
            lineWidth: (indicator.styles.lowerBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.lowerBand?.lineStyle ?? 2) as any,
            title: `Lower (${lowerVal})`,
          });
          lower.setData(stochRsi.map(d => ({ time: d.time as Time, value: lowerVal })));
          sList.push(lower);
        }

        seriesList = sList;
        break;
      }

      case 'OBV': {
        const obv = calculateOBV(candles);
        obv.forEach(d => valueMap.set(d.time, d.value.toLocaleString()));
        if (obv.length > 0) latestStr = obv[obv.length - 1].value.toLocaleString();
        const line = chart.addSeries(LineSeries, { color: '#00e5ff', lineWidth: 2, title: 'OBV' });
        line.setData(obv.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'Aroon': {
        const period = Number(indicator.params.period || 14);
        const aroon = calculateAroon(candles, period);
        aroon.forEach(d => valueMap.set(d.time, `Up: ${d.up.toFixed(2)}  Down: ${d.down.toFixed(2)}`));
        if (aroon.length > 0) {
          const l = aroon[aroon.length - 1];
          latestStr = `Up: ${l.up.toFixed(2)}  Down: ${l.down.toFixed(2)}`;
        }
        const upLine = chart.addSeries(LineSeries, { color: '#089981', lineWidth: 2, title: 'Aroon Up' });
        const downLine = chart.addSeries(LineSeries, { color: '#f23645', lineWidth: 2, title: 'Aroon Down' });
        upLine.setData(aroon.map(d => ({ time: d.time as Time, value: d.up })));
        downLine.setData(aroon.map(d => ({ time: d.time as Time, value: d.down })));
        seriesList = [upLine, downLine];
        break;
      }

      case 'StandardDeviation': {
        const period = Number(indicator.params.period || 20);
        const stdev = calculateStandardDeviation(candles, period);
        stdev.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (stdev.length > 0) latestStr = stdev[stdev.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: '#ab47bc', lineWidth: 2, title: `StDev ${period}` });
        line.setData(stdev.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'HistoricalVolatility': {
        const period = Number(indicator.params.period || 20);
        const hv = calculateHistoricalVolatility(candles, period);
        hv.forEach(d => valueMap.set(d.time, `${d.value.toFixed(2)}%`));
        if (hv.length > 0) latestStr = `${hv[hv.length - 1].value.toFixed(2)}%`;
        const line = chart.addSeries(LineSeries, { color: '#ff5722', lineWidth: 2, title: `HV ${period}` });
        line.setData(hv.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'TSI': {
        const r = Number(indicator.params.r || 25);
        const s = Number(indicator.params.s || 13);
        const tsi = calculateTSI(candles, r, s);
        tsi.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (tsi.length > 0) latestStr = tsi[tsi.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: '#2962ff', lineWidth: 2, title: `TSI (${r},${s})` });
        line.setData(tsi.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'UltimateOscillator': {
        const uo = calculateUltimateOscillator(candles);
        uo.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (uo.length > 0) latestStr = uo[uo.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: '#00e5ff', lineWidth: 2, title: 'UO' });
        line.setData(uo.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'Vortex': {
        const period = Number(indicator.params.period || 14);
        const vortex = calculateVortex(candles, period);
        vortex.forEach(d => valueMap.set(d.time, `VI+: ${d.plusVI.toFixed(4)}  VI-: ${d.minusVI.toFixed(4)}`));
        if (vortex.length > 0) {
          const l = vortex[vortex.length - 1];
          latestStr = `VI+: ${l.plusVI.toFixed(4)}  VI-: ${l.minusVI.toFixed(4)}`;
        }
        const pLine = chart.addSeries(LineSeries, { color: '#089981', lineWidth: 2, title: 'VI+' });
        const mLine = chart.addSeries(LineSeries, { color: '#f23645', lineWidth: 2, title: 'VI-' });
        pLine.setData(vortex.map(d => ({ time: d.time as Time, value: d.plusVI })));
        mLine.setData(vortex.map(d => ({ time: d.time as Time, value: d.minusVI })));
        seriesList = [pLine, mLine];
        break;
      }

      case 'ChandeMO': {
        const period = Number(indicator.params.period || 14);
        const cmo = calculateChandeMO(candles, period);
        cmo.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (cmo.length > 0) latestStr = cmo[cmo.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: '#e040fb', lineWidth: 2, title: `CMO ${period}` });
        line.setData(cmo.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'DPO': {
        const period = Number(indicator.params.period || 20);
        const dpo = calculateDPO(candles, period);
        dpo.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (dpo.length > 0) latestStr = dpo[dpo.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: '#ffeb3b', lineWidth: 2, title: `DPO ${period}` });
        line.setData(dpo.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'EaseOfMovement': {
        const period = Number(indicator.params.period || 14);
        const eom = calculateEaseOfMovement(candles, period);
        eom.forEach(d => valueMap.set(d.time, d.value.toFixed(4)));
        if (eom.length > 0) latestStr = eom[eom.length - 1].value.toFixed(4);
        const line = chart.addSeries(LineSeries, { color: '#00bcd4', lineWidth: 2, title: `EOM ${period}` });
        line.setData(eom.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'BOP': {
        const bop = calculateBOP(candles, Number(indicator.params.smooth || 14));
        bop.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (bop.length > 0) latestStr = bop[bop.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: '#26a69a', lineWidth: 2, title: 'BOP' });
        line.setData(bop.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'FisherTransform': {
        const fish = calculateFisherTransform(candles, Number(indicator.params.period || 9));
        fish.forEach(d => valueMap.set(d.time, `Fish: ${d.fisher.toFixed(2)}  Trig: ${d.trigger.toFixed(2)}`));
        if (fish.length > 0) {
          const l = fish[fish.length - 1];
          latestStr = `Fish: ${l.fisher.toFixed(2)}  Trig: ${l.trigger.toFixed(2)}`;
        }
        const fishLine = chart.addSeries(LineSeries, { color: '#2962ff', lineWidth: 2, title: 'Fisher' });
        const trigLine = chart.addSeries(LineSeries, { color: '#ff9800', lineWidth: 1, title: 'Trigger' });
        fishLine.setData(fish.map(d => ({ time: d.time as Time, value: d.fisher })));
        trigLine.setData(fish.map(d => ({ time: d.time as Time, value: d.trigger })));
        seriesList = [fishLine, trigLine];
        break;
      }

      case 'PPO': {
        const ppo = calculatePPO(candles, Number(indicator.params.fast || 12), Number(indicator.params.slow || 26), 9);
        ppo.forEach(d => valueMap.set(d.time, `PPO: ${d.ppo.toFixed(2)}  Sig: ${d.signal.toFixed(2)}`));
        if (ppo.length > 0) {
          const l = ppo[ppo.length - 1];
          latestStr = `PPO: ${l.ppo.toFixed(2)}  Sig: ${l.signal.toFixed(2)}`;
        }
        const ppoLine = chart.addSeries(LineSeries, { color: '#2962ff', lineWidth: 2, title: 'PPO' });
        const sigLine = chart.addSeries(LineSeries, { color: '#ff9800', lineWidth: 1, title: 'Signal' });
        ppoLine.setData(ppo.map(d => ({ time: d.time as Time, value: d.ppo })));
        sigLine.setData(ppo.map(d => ({ time: d.time as Time, value: d.signal })));
        seriesList = [ppoLine, sigLine];
        break;
      }

      case 'VolumeOscillator': {
        const vo = calculateVolumeOscillator(candles, Number(indicator.params.shortPeriod || 5), Number(indicator.params.longPeriod || 10));
        vo.forEach(d => valueMap.set(d.time, `${d.value.toFixed(2)}%`));
        if (vo.length > 0) latestStr = `${vo[vo.length - 1].value.toFixed(2)}%`;
        const line = chart.addSeries(LineSeries, { color: '#00e5ff', lineWidth: 2, title: 'VO' });
        line.setData(vo.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'BBWidth': {
        const p = Number(indicator.params.period || 20);
        const m = Number(indicator.params.multiplier || 2);
        const bbw = calculateBBWidth(candles, p, m);
        bbw.forEach(d => valueMap.set(d.time, `${d.value.toFixed(2)}%`));
        if (bbw.length > 0) latestStr = `${bbw[bbw.length - 1].value.toFixed(2)}%`;
        const line = chart.addSeries(LineSeries, { color: '#ab47bc', lineWidth: 2, title: `BBW (${p},${m})` });
        line.setData(bbw.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'BBBPct': {
        const p = Number(indicator.params.period || 20);
        const m = Number(indicator.params.multiplier || 2);
        const bbp = calculateBBBPct(candles, p, m);
        bbp.forEach(d => valueMap.set(d.time, d.value.toFixed(4)));
        if (bbp.length > 0) latestStr = bbp[bbp.length - 1].value.toFixed(4);
        const line = chart.addSeries(LineSeries, { color: '#26a69a', lineWidth: 2, title: `%B (${p},${m})` });
        line.setData(bbp.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'NATR': {
        const p = Number(indicator.params.period || 14);
        const natr = calculateNATR(candles, p);
        natr.forEach(d => valueMap.set(d.time, `${d.value.toFixed(2)}%`));
        if (natr.length > 0) latestStr = `${natr[natr.length - 1].value.toFixed(2)}%`;
        const line = chart.addSeries(LineSeries, { color: '#ab47bc', lineWidth: 2, title: `NATR ${p}` });
        line.setData(natr.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'MOM': {
        const p = Number(indicator.params.period || 10);
        const mom = calculateMOM(candles, p);
        mom.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (mom.length > 0) latestStr = mom[mom.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: '#00e5ff', lineWidth: 2, title: `MOM ${p}` });
        line.setData(mom.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'AcceleratorOscillator': {
        const ac = calculateAcceleratorOscillator(candles);
        ac.forEach(d => valueMap.set(d.time, d.value.toFixed(4)));
        if (ac.length > 0) latestStr = ac[ac.length - 1].value.toFixed(4);
        const line = chart.addSeries(LineSeries, { color: '#00e5ff', lineWidth: 2, title: 'AC' });
        line.setData(ac.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'KST': {
        const kst = calculateKST(candles);
        kst.forEach(d => valueMap.set(d.time, `KST: ${d.kst.toFixed(2)}  Sig: ${d.signal.toFixed(2)}`));
        if (kst.length > 0) {
          const l = kst[kst.length - 1];
          latestStr = `KST: ${l.kst.toFixed(2)}  Sig: ${l.signal.toFixed(2)}`;
        }
        const kstLine = chart.addSeries(LineSeries, { color: '#2962ff', lineWidth: 2, title: 'KST' });
        const sigLine = chart.addSeries(LineSeries, { color: '#ff9800', lineWidth: 1, title: 'Signal' });
        kstLine.setData(kst.map(d => ({ time: d.time as Time, value: d.kst })));
        sigLine.setData(kst.map(d => ({ time: d.time as Time, value: d.signal })));
        seriesList = [kstLine, sigLine];
        break;
      }

      case 'RVI': {
        const p = Number(indicator.params.period || 10);
        const rvi = calculateRVI(candles, p);
        rvi.forEach(d => valueMap.set(d.time, `RVI: ${d.rvi.toFixed(4)}  Sig: ${d.signal.toFixed(4)}`));
        if (rvi.length > 0) {
          const l = rvi[rvi.length - 1];
          latestStr = `RVI: ${l.rvi.toFixed(4)}  Sig: ${l.signal.toFixed(4)}`;
        }
        const rviLine = chart.addSeries(LineSeries, { color: '#089981', lineWidth: 2, title: 'RVI' });
        const sigLine = chart.addSeries(LineSeries, { color: '#f23645', lineWidth: 1, title: 'Signal' });
        rviLine.setData(rvi.map(d => ({ time: d.time as Time, value: d.rvi })));
        sigLine.setData(rvi.map(d => ({ time: d.time as Time, value: d.signal })));
        seriesList = [rviLine, sigLine];
        break;
      }

      case 'CoppockCurve': {
        const cop = calculateCoppockCurve(candles);
        cop.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (cop.length > 0) latestStr = cop[cop.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: '#2962ff', lineWidth: 2, title: 'Coppock' });
        line.setData(cop.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'MassIndex': {
        const p = Number(indicator.params.period || 25);
        const mi = calculateMassIndex(candles, p);
        mi.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (mi.length > 0) latestStr = mi[mi.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: '#ab47bc', lineWidth: 2, title: `Mass ${p}` });
        line.setData(mi.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'ChaikinVolatility': {
        const p = Number(indicator.params.period || 10);
        const cv = calculateChaikinVolatility(candles, p, 10);
        cv.forEach(d => valueMap.set(d.time, `${d.value.toFixed(2)}%`));
        if (cv.length > 0) latestStr = `${cv[cv.length - 1].value.toFixed(2)}%`;
        const line = chart.addSeries(LineSeries, { color: '#ff7043', lineWidth: 2, title: `CHV ${p}` });
        line.setData(cv.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'ConnorsRSI': {
        const crsi = calculateConnorsRSI(candles);
        crsi.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (crsi.length > 0) latestStr = crsi[crsi.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: '#7e57c2', lineWidth: 2, title: 'Connors RSI' });
        line.setData(crsi.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'ADL': {
        const adl = calculateADL(candles);
        adl.forEach(d => valueMap.set(d.time, d.value.toFixed(0)));
        if (adl.length > 0) latestStr = adl[adl.length - 1].value.toFixed(0);
        const line = chart.addSeries(LineSeries, { color: '#ffd600', lineWidth: 2, title: 'A/D' });
        line.setData(adl.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'PVT': {
        const pvt = calculatePVT(candles);
        pvt.forEach(d => valueMap.set(d.time, d.value.toFixed(0)));
        if (pvt.length > 0) latestStr = pvt[pvt.length - 1].value.toFixed(0);
        const line = chart.addSeries(LineSeries, { color: '#26c6da', lineWidth: 2, title: 'PVT' });
        line.setData(pvt.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'ChoppinessIndex': {
        const p = Number(indicator.params.period || 14);
        const chop = calculateChoppinessIndex(candles, p);
        chop.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (chop.length > 0) latestStr = chop[chop.length - 1].value.toFixed(2);

        const sList: ISeriesApi<any>[] = [];

        if (indicator.styles.line?.visible !== false) {
          const line = chart.addSeries(LineSeries, {
            color: indicator.styles.line?.color || '#ab47bc',
            lineWidth: (indicator.styles.line?.lineWidth ?? 2) as any,
            lineStyle: (indicator.styles.line?.lineStyle ?? 0) as any,
            title: `CHOP ${p}`,
          });
          line.setData(chop.map(d => ({ time: d.time as Time, value: d.value })));
          sList.push(line);
        }

        // Upper Band (61.8)
        const upperVal = Number(indicator.styles.upperBand?.value ?? 61.8);
        if (indicator.styles.upperBand?.visible !== false && chop.length > 0) {
          const upper = chart.addSeries(LineSeries, {
            color: indicator.styles.upperBand?.color || '#ef5350',
            lineWidth: (indicator.styles.upperBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.upperBand?.lineStyle ?? 2) as any,
            title: `Upper (${upperVal})`,
          });
          upper.setData(chop.map(d => ({ time: d.time as Time, value: upperVal })));
          sList.push(upper);
        }

        // Lower Band (38.2)
        const lowerVal = Number(indicator.styles.lowerBand?.value ?? 38.2);
        if (indicator.styles.lowerBand?.visible !== false && chop.length > 0) {
          const lower = chart.addSeries(LineSeries, {
            color: indicator.styles.lowerBand?.color || '#26a69a',
            lineWidth: (indicator.styles.lowerBand?.lineWidth ?? 1) as any,
            lineStyle: (indicator.styles.lowerBand?.lineStyle ?? 2) as any,
            title: `Lower (${lowerVal})`,
          });
          lower.setData(chop.map(d => ({ time: d.time as Time, value: lowerVal })));
          sList.push(lower);
        }

        seriesList = sList;
        break;
      }

      case 'KlingerOscillator': {
        const fast = Number(indicator.params.fast || 34);
        const slow = Number(indicator.params.slow || 55);
        const sig = Number(indicator.params.signal || 13);
        const kvo = calculateKlingerOscillator(candles, fast, slow, sig);
        kvo.forEach(d => valueMap.set(d.time, `KVO: ${d.kvo.toFixed(0)} | Sig: ${d.signal.toFixed(0)}`));
        if (kvo.length > 0) latestStr = `KVO: ${kvo[kvo.length - 1].kvo.toFixed(0)} | Sig: ${kvo[kvo.length - 1].signal.toFixed(0)}`;
        const kvoLine = chart.addSeries(LineSeries, { color: indicator.styles.kvo?.color || '#2962ff', lineWidth: 2, title: 'KVO' });
        const sigLine = chart.addSeries(LineSeries, { color: indicator.styles.signal?.color || '#ff5252', lineWidth: 1, title: 'Signal' });
        kvoLine.setData(kvo.map(d => ({ time: d.time as Time, value: d.kvo })));
        sigLine.setData(kvo.map(d => ({ time: d.time as Time, value: d.signal })));
        seriesList = [kvoLine, sigLine];
        break;
      }

      case 'ChaikinOscillator': {
        const fast = Number(indicator.params.fast || 3);
        const slow = Number(indicator.params.slow || 10);
        const osc = calculateChaikinOscillator(candles, fast, slow);
        osc.forEach(d => valueMap.set(d.time, d.value.toFixed(0)));
        if (osc.length > 0) latestStr = osc[osc.length - 1].value.toFixed(0);
        const line = chart.addSeries(LineSeries, { color: indicator.styles.line?.color || '#00e676', lineWidth: 2, title: `Chaikin Osc (${fast},${slow})` });
        line.setData(osc.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'TRIX': {
        const p = Number(indicator.params.period || 18);
        const trix = calculateTRIX(candles, p);
        trix.forEach(d => valueMap.set(d.time, d.value.toFixed(4)));
        if (trix.length > 0) latestStr = trix[trix.length - 1].value.toFixed(4);
        const line = chart.addSeries(LineSeries, { color: indicator.styles.line?.color || '#00bcd4', lineWidth: 2, title: `TRIX ${p}` });
        line.setData(trix.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'LinearRegressionSlope': {
        const p = Number(indicator.params.period || 14);
        const slope = calculateLinearRegressionSlope(candles, p);
        slope.forEach(d => valueMap.set(d.time, d.value.toFixed(4)));
        if (slope.length > 0) latestStr = slope[slope.length - 1].value.toFixed(4);
        const line = chart.addSeries(LineSeries, { color: indicator.styles.line?.color || '#536dfe', lineWidth: 2, title: `LinReg Slope ${p}` });
        line.setData(slope.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'StandardError': {
        const p = Number(indicator.params.period || 14);
        const se = calculateStandardError(candles, p);
        se.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (se.length > 0) latestStr = se[se.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: indicator.styles.line?.color || '#ff6e40', lineWidth: 2, title: `StdErr ${p}` });
        line.setData(se.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'SMIErgodic': {
        const longLen = Number(indicator.params.longLen || 20);
        const shortLen = Number(indicator.params.shortLen || 5);
        const sigLen = Number(indicator.params.signalLen || 5);
        const smi = calculateSMIErgodic(candles, longLen, shortLen, sigLen);
        smi.forEach(d => valueMap.set(d.time, `SMI: ${d.smi.toFixed(2)} | Sig: ${d.signal.toFixed(2)}`));
        if (smi.length > 0) latestStr = `SMI: ${smi[smi.length - 1].smi.toFixed(2)} | Sig: ${smi[smi.length - 1].signal.toFixed(2)}`;
        const smiLine = chart.addSeries(LineSeries, { color: indicator.styles.smi?.color || '#2962ff', lineWidth: 2, title: 'SMI' });
        const sigLine = chart.addSeries(LineSeries, { color: indicator.styles.signal?.color || '#ff9100', lineWidth: 1, title: 'Signal' });
        smiLine.setData(smi.map(d => ({ time: d.time as Time, value: d.smi })));
        sigLine.setData(smi.map(d => ({ time: d.time as Time, value: d.signal })));
        seriesList = [smiLine, sigLine];
        break;
      }

      case 'RelativeVolatilityIndex': {
        const len = Number(indicator.params.length || 14);
        const stdLen = Number(indicator.params.stdDevLen || 10);
        const rvi = calculateRelativeVolatilityIndex(candles, len, stdLen);
        rvi.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (rvi.length > 0) latestStr = rvi[rvi.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: indicator.styles.line?.color || '#e040fb', lineWidth: 2, title: `RVI Vol ${len}` });
        line.setData(rvi.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'NetVolume': {
        const net = calculateNetVolume(candles);
        net.forEach(d => valueMap.set(d.time, d.value.toLocaleString()));
        if (net.length > 0) latestStr = net[net.length - 1].value.toLocaleString();
        const hist = chart.addSeries(HistogramSeries, {
          color: '#00e5ff',
          title: 'Net Vol',
        });
        hist.setData(net.map(d => ({
          time: d.time as Time,
          value: d.value,
          color: d.value >= 0 ? 'rgba(8, 153, 129, 0.8)' : 'rgba(242, 54, 69, 0.8)'
        })));
        seriesList = [hist];
        break;
      }

      case 'PriceOscillator': {
        const fast = Number(indicator.params.fast || 12);
        const slow = Number(indicator.params.slow || 26);
        const apo = calculatePriceOscillator(candles, fast, slow);
        apo.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (apo.length > 0) latestStr = apo[apo.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: indicator.styles.line?.color || '#ffab00', lineWidth: 2, title: `APO (${fast},${slow})` });
        line.setData(apo.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'AccumulativeSwingIndex': {
        const limit = Number(indicator.params.limit || 50);
        const asi = calculateAccumulativeSwingIndex(candles, limit);
        asi.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (asi.length > 0) latestStr = asi[asi.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: indicator.styles.line?.color || '#76ff03', lineWidth: 2, title: `ASI ${limit}` });
        line.setData(asi.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'TrueRange': {
        const tr = calculateTrueRange(candles);
        tr.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (tr.length > 0) latestStr = tr[tr.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: indicator.styles.line?.color || '#ff9100', lineWidth: 2, title: 'TR' });
        line.setData(tr.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'VolatilityCloseToClose': {
        const len = Number(indicator.params.length || 20);
        const vol = calculateVolatilityCloseToClose(candles, len);
        vol.forEach(d => valueMap.set(d.time, `${d.value.toFixed(2)}%`));
        if (vol.length > 0) latestStr = `${vol[vol.length - 1].value.toFixed(2)}%`;
        const line = chart.addSeries(LineSeries, { color: indicator.styles.line?.color || '#e040fb', lineWidth: 2, title: `Hist Vol C-C ${len}` });
        line.setData(vol.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'RankCorrelationIndex': {
        const len = Number(indicator.params.length || 9);
        const rci = calculateRankCorrelationIndex(candles, len);
        rci.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (rci.length > 0) latestStr = rci[rci.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: indicator.styles.line?.color || '#00e5ff', lineWidth: 2, title: `RCI ${len}` });
        line.setData(rci.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }

      case 'EFI': {
        const p = Number(indicator.params.period || 13);
        const efi = calculateEFI(candles, p);
        efi.forEach(d => valueMap.set(d.time, d.value.toFixed(2)));
        if (efi.length > 0) latestStr = efi[efi.length - 1].value.toFixed(2);
        const line = chart.addSeries(LineSeries, { color: '#00e676', lineWidth: 2, title: `EFI ${p}` });
        line.setData(efi.map(d => ({ time: d.time as Time, value: d.value })));
        seriesList = [line];
        break;
      }
    }

    timeToValueMapRef.current = valueMap;
    lastValRef.current = latestStr;
    setDisplayVal(latestStr);

    if (mainChart) {
      const mainRange = mainChart.timeScale().getVisibleLogicalRange();
      if (mainRange) {
        isSyncingRef.current = true;
        try { chart.timeScale().setVisibleLogicalRange(mainRange); } catch (_) {}
        requestAnimationFrame(() => {
          isSyncingRef.current = false;
        });
      }
    }

    return () => {
      seriesList.forEach(s => {
        try { chart.removeSeries(s); } catch (_) {}
      });
    };
  }, [indicator, candles]);

  // 4. Update display value immediately whenever hoverTime changes from Main Chart or sibling panes
  useEffect(() => {
    if (hoverTime === undefined) return;
    if (hoverTime === null) {
      setDisplayVal(lastValRef.current);
      return;
    }
    const val = timeToValueMapRef.current.get(hoverTime);
    if (val !== undefined) {
      setDisplayVal(val);
    } else {
      const currentCandles = candlesRef.current;
      const floorCandle = findFloorCandleByTime(currentCandles, hoverTime);
      const found = floorCandle ? timeToValueMapRef.current.get(floorCandle.time) : undefined;
      setDisplayVal(found !== undefined ? found : 'Ø');
    }
  }, [hoverTime]);

  return (
    <div 
      onMouseEnter={() => { isUserInteractingRef.current = true; }}
      onMouseLeave={() => {
        isUserInteractingRef.current = false;
        setDisplayVal(lastValRef.current);
        onHoverTimeChange?.(null);
      }}
      onPointerDown={() => { isUserInteractingRef.current = true; }}
      onPointerUp={() => { isUserInteractingRef.current = false; }}
      style={{ height: `${paneHeight}px` }}
      className="relative w-full bg-tv-bg border-t border-tv-border flex flex-col group select-none flex-shrink-0"
    >
      {/* Top resize handle for dragging subpane height with mouse */}
      <div 
        onMouseDown={handleStartResize}
        onDoubleClick={() => {
          setPaneHeight(130);
          try { 
            localStorage.setItem(`openchart_subpane_height_${indicator.id}`, '130');
            localStorage.setItem(`openchart_subpane_height_${indicator.type}`, '130');
          } catch (_) {}
        }}
        className="absolute -top-1 left-0 right-0 h-2.5 cursor-ns-resize z-20 group/handle flex items-center justify-center hover:bg-tv-blue/60 active:bg-tv-blue transition-colors select-none"
        title="Alt Pencere Boyutunu Değiştirmek İçin Sürükleyin (Çift Tıkla Sıfırla)"
      >
        <div className="w-12 h-0.5 bg-tv-border/80 group-hover/handle:bg-tv-blue rounded-full transition-colors" />
      </div>

      {isResizing && (
        <div className="fixed inset-0 cursor-ns-resize z-50 select-none bg-transparent" />
      )}
      {/* SubPane Header Bar with Live Tracking Value */}
      <div className="absolute top-1.5 left-2 z-10 flex items-center space-x-2 text-[11px] bg-tv-surface/85 backdrop-blur-sm px-2.5 py-0.5 rounded border border-tv-border/50">
        <span className="font-bold text-white">{indicator.name}</span>
        {indicator.timeframe && indicator.timeframe !== 'chart' && indicator.timeframe !== timeframe && (
          <span className="text-[9px] px-1 py-0.2 rounded bg-tv-blue/25 text-tv-blue font-mono font-bold">
            {indicator.timeframe.toUpperCase()}
          </span>
        )}
        {displayVal && (
          <span className="font-mono text-tv-blue font-bold tracking-tight">
            {displayVal}
          </span>
        )}

        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          <button
            onClick={() => onToggleVisibility(indicator.id)}
            className="p-0.5 hover:text-white text-tv-muted"
            title={indicator.visible ? 'Gizle' : 'Göster'}
          >
            {indicator.visible ? <Eye className="w-2.5 h-2.5 text-tv-blue" /> : <EyeOff className="w-2.5 h-2.5" />}
          </button>
          <button
            onClick={() => onOpenSettings(indicator)}
            className="p-0.5 hover:text-white text-tv-muted"
            title="Ayarlar"
          >
            <Settings className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => onRemove(indicator.id)}
            className="p-0.5 hover:text-tv-red text-tv-muted"
            title="Alt Pencereyi Kapat"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* SubChart lightweight-charts container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
});
