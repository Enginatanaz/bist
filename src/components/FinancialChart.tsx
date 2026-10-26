import React, { useState, useMemo, useRef } from 'react';
import { OHLCV, SupportResistanceZone } from '../types';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD
} from '../../server/indicators/technicalEngine';

interface FinancialChartProps {
  candles: OHLCV[];
  symbol: string;
  zones?: SupportResistanceZone[];
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  isLoading?: boolean;
}

export const FinancialChart: React.FC<FinancialChartProps> = ({
  candles,
  symbol,
  zones = [],
  timeframe,
  onTimeframeChange,
  isLoading = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Overlay toggles
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);
  const [showSma200, setShowSma200] = useState(false);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showZones, setShowZones] = useState(true);

  // Subplot selection: 'VOLUME' | 'RSI' | 'MACD'
  const [activeSubplot, setActiveSubplot] = useState<'VOLUME' | 'RSI' | 'MACD'>('VOLUME');

  // Visible window range (Zooming/panning)
  const [zoomLevel, setZoomLevel] = useState<number>(80); // number of visible candles

  const visibleCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    return candles.slice(-zoomLevel);
  }, [candles, zoomLevel]);

  // Pre-calculate indicators for visible slice
  const { closes, highs, lows, volumes } = useMemo(() => {
    return {
      closes: candles.map(c => c.close),
      highs: candles.map(c => c.high),
      lows: candles.map(c => c.low),
      volumes: candles.map(c => c.volume)
    };
  }, [candles]);

  const sma20Series = useMemo(() => calculateSMA(closes, 20).slice(-zoomLevel), [closes, zoomLevel]);
  const sma50Series = useMemo(() => calculateSMA(closes, 50).slice(-zoomLevel), [closes, zoomLevel]);
  const sma200Series = useMemo(() => calculateSMA(closes, 200).slice(-zoomLevel), [closes, zoomLevel]);
  const bbSeries = useMemo(() => {
    const bb = calculateBollingerBands(closes, 20, 2);
    return {
      upper: bb.upper.slice(-zoomLevel),
      middle: bb.middle.slice(-zoomLevel),
      lower: bb.lower.slice(-zoomLevel)
    };
  }, [closes, zoomLevel]);

  const rsiSeries = useMemo(() => calculateRSI(closes, 14).slice(-zoomLevel), [closes, zoomLevel]);
  const macdSeries = useMemo(() => {
    const m = calculateMACD(closes);
    return {
      macdLine: m.macdLine.slice(-zoomLevel),
      signalLine: m.signalLine.slice(-zoomLevel),
      histogram: m.histogram.slice(-zoomLevel)
    };
  }, [closes, zoomLevel]);

  const volumeSmaSeries = useMemo(() => calculateSMA(volumes, 20).slice(-zoomLevel), [volumes, zoomLevel]);

  // Coordinate math
  const chartWidth = 900;
  const mainHeight = 340;
  const subHeight = 110;
  const paddingRight = 65;
  const paddingLeft = 15;
  const paddingTop = 20;
  const paddingBottom = 25;

  const plotWidth = chartWidth - paddingLeft - paddingRight;

  // Price Scale Bounds
  const { minPrice, maxPrice } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 0, maxPrice: 100 };
    let min = Math.min(...visibleCandles.map(c => c.low));
    let max = Math.max(...visibleCandles.map(c => c.high));

    if (showBollinger) {
      bbSeries.lower.forEach(v => { if (v !== null && v < min) min = v; });
      bbSeries.upper.forEach(v => { if (v !== null && v > max) max = v; });
    }

    const pad = (max - min) * 0.06 || 1;
    return { minPrice: min - pad, maxPrice: max + pad };
  }, [visibleCandles, showBollinger, bbSeries]);

  const priceToY = (price: number) => {
    const range = maxPrice - minPrice || 1;
    return paddingTop + (1 - (price - minPrice) / range) * (mainHeight - paddingTop - paddingBottom);
  };

  const candleCount = visibleCandles.length;
  const candleStep = plotWidth / (candleCount || 1);
  const candleWidth = Math.max(2, Math.min(14, candleStep * 0.72));

  const getCandleX = (idx: number) => paddingLeft + idx * candleStep + candleStep / 2;

  // Mouse hover event
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || candleCount === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = (x / rect.width) * chartWidth - paddingLeft;
    const idx = Math.floor(relativeX / candleStep);
    if (idx >= 0 && idx < candleCount) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activeCandle = hoverIndex !== null && visibleCandles[hoverIndex]
    ? visibleCandles[hoverIndex]
    : visibleCandles[visibleCandles.length - 1];

  const candleChangePct = activeCandle && activeCandle.open > 0
    ? Number((((activeCandle.close - activeCandle.open) / activeCandle.open) * 100).toFixed(2))
    : 0;

  // Subplot scaling
  const maxVol = useMemo(() => {
    return Math.max(...visibleCandles.map(c => c.volume), 1);
  }, [visibleCandles]);

  // Price grid lines
  const gridSteps = 5;
  const gridPrices = useMemo(() => {
    const steps: number[] = [];
    const step = (maxPrice - minPrice) / gridSteps;
    for (let i = 0; i <= gridSteps; i++) {
      steps.push(Number((minPrice + i * step).toFixed(2)));
    }
    return steps;
  }, [minPrice, maxPrice]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-sans select-none" ref={containerRef}>
      {/* Top Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs">
        {/* Left: Stock info & active candle readout */}
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-100 text-sm tracking-wide">{symbol}</span>
          {activeCandle && (
            <div className="flex items-center gap-2 text-slate-400 font-mono tabular-nums text-[11px]">
              <span className="text-slate-300 font-semibold">{activeCandle.dateStr}</span>
              <span>A: <strong className="text-slate-200">{activeCandle.open.toFixed(2)}</strong></span>
              <span>Y: <strong className="text-slate-200">{activeCandle.high.toFixed(2)}</strong></span>
              <span>D: <strong className="text-slate-200">{activeCandle.low.toFixed(2)}</strong></span>
              <span>K: <strong className={activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{activeCandle.close.toFixed(2)}</strong></span>
              <span className={candleChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                ({candleChangePct >= 0 ? `+${candleChangePct}` : candleChangePct}%)
              </span>
              <span>Hacim: <strong className="text-slate-200">{activeCandle.volume.toLocaleString('tr-TR')}</strong></span>
            </div>
          )}
        </div>

        {/* Right: Timeframe and zoom controls */}
        <div className="flex items-center gap-2">
          {/* Timeframes */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
            {['15m', '1h', '4h', '1d', '1w'].map(tf => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf === '15m' ? '15Dk' : tf === '1h' ? '1S' : tf === '4h' ? '4S' : tf === '1d' ? 'Gün' : 'Hft'}
              </button>
            ))}
          </div>

          {/* Zoom buttons */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 20, 180))}
              className="px-2 py-0.5 text-slate-400 hover:text-slate-200 text-[11px]"
              title="Uzaklaştır"
            >
              -
            </button>
            <span className="text-[10px] text-slate-500 px-1 font-mono">{zoomLevel}</span>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 20, 30))}
              className="px-2 py-0.5 text-slate-400 hover:text-slate-200 text-[11px]"
              title="Yakınlaştır"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Indicator overlay switches */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-[11px] border-b border-slate-800/60 text-slate-400">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-medium">Göstergeler:</span>
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showSma20}
              onChange={e => setShowSma20(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
            />
            <span className="text-amber-400">SMA 20</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showSma50}
              onChange={e => setShowSma50(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span className="text-cyan-400">SMA 50</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showSma200}
              onChange={e => setShowSma200(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-purple-500 focus:ring-0"
            />
            <span className="text-purple-400">SMA 200</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showBollinger}
              onChange={e => setShowBollinger(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span className="text-emerald-400">Bollinger</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showZones}
              onChange={e => setShowZones(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0"
            />
            <span className="text-rose-400">Destek / Direnç</span>
          </label>
        </div>

        {/* Subplot selector tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setActiveSubplot('VOLUME')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              activeSubplot === 'VOLUME' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hacim
          </button>
          <button
            onClick={() => setActiveSubplot('RSI')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              activeSubplot === 'RSI' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RSI (14)
          </button>
          <button
            onClick={() => setActiveSubplot('MACD')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              activeSubplot === 'MACD' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MACD
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-hidden mt-2 bg-slate-950 rounded border border-slate-800/80">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-20">
            <div className="text-xs text-emerald-400 font-mono animate-pulse">Grafik verisi yükleniyor...</div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${chartWidth} ${mainHeight + subHeight}`}
          className="w-full h-auto cursor-crosshair block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Bollinger fill gradient */}
            <linearGradient id="bbGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* MAIN PRICE PANEL */}
          {/* Background grid lines */}
          {gridPrices.map((price, i) => {
            const y = priceToY(price);
            return (
              <g key={`grid_${i}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={chartWidth - paddingRight + 6}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  textAnchor="start"
                >
                  {price.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Support / Resistance Zones Overlay */}
          {showZones && zones.map((zone, idx) => {
            const yMid = priceToY(zone.pivotPrice);
            if (yMid < paddingTop || yMid > mainHeight - paddingBottom) return null;
            const isSupp = zone.type === 'SUPPORT';
            const strokeColor = isSupp ? '#10b981' : '#f43f5e';

            return (
              <g key={`zone_${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={yMid}
                  x2={chartWidth - paddingRight}
                  y2={yMid}
                  stroke={strokeColor}
                  strokeWidth="1.2"
                  strokeDasharray={zone.strengthScore > 65 ? 'none' : '4 3'}
                  opacity={0.65}
                />
                <rect
                  x={chartWidth - paddingRight + 4}
                  y={yMid - 7}
                  width="54"
                  height="14"
                  fill={isSupp ? '#064e3b' : '#881337'}
                  rx="2"
                />
                <text
                  x={chartWidth - paddingRight + 6}
                  y={yMid + 3}
                  fill={isSupp ? '#6ee7b7' : '#fda4af'}
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                  fontWeight="600"
                >
                  {zone.pivotPrice.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Bollinger Bands Fill */}
          {showBollinger && (
            <path
              d={(() => {
                let dUpper = '';
                let dLower = '';
                for (let i = 0; i < candleCount; i++) {
                  const u = bbSeries.upper[i];
                  const l = bbSeries.lower[i];
                  if (u !== null && l !== null) {
                    const x = getCandleX(i);
                    const yU = priceToY(u);
                    const yL = priceToY(l);
                    if (!dUpper) dUpper = `M ${x} ${yU}`;
                    else dUpper += ` L ${x} ${yU}`;
                    if (!dLower) dLower = `L ${x} ${yL}`;
                    else dLower = `L ${x} ${yL} ` + dLower;
                  }
                }
                return dUpper ? `${dUpper} ${dLower} Z` : '';
              })()}
              fill="url(#bbGradient)"
            />
          )}

          {/* Bollinger Upper & Lower Lines */}
          {showBollinger && (
            <>
              <path
                d={bbSeries.upper.map((val, i) => val !== null ? `${i === 0 ? 'M' : 'L'} ${getCandleX(i)} ${priceToY(val)}` : '').filter(Boolean).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity={0.5}
              />
              <path
                d={bbSeries.lower.map((val, i) => val !== null ? `${i === 0 ? 'M' : 'L'} ${getCandleX(i)} ${priceToY(val)}` : '').filter(Boolean).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity={0.5}
              />
            </>
          )}

          {/* SMA Lines */}
          {showSma20 && (
            <path
              d={sma20Series.map((val, i) => val !== null ? `${i === 0 ? 'M' : 'L'} ${getCandleX(i)} ${priceToY(val)}` : '').filter(Boolean).join(' ')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.4"
            />
          )}
          {showSma50 && (
            <path
              d={sma50Series.map((val, i) => val !== null ? `${i === 0 ? 'M' : 'L'} ${getCandleX(i)} ${priceToY(val)}` : '').filter(Boolean).join(' ')}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.4"
            />
          )}
          {showSma200 && (
            <path
              d={sma200Series.map((val, i) => val !== null ? `${i === 0 ? 'M' : 'L'} ${getCandleX(i)} ${priceToY(val)}` : '').filter(Boolean).join(' ')}
              fill="none"
              stroke="#a855f7"
              strokeWidth="1.4"
            />
          )}

          {/* Candlesticks */}
          {visibleCandles.map((c, i) => {
            const x = getCandleX(i);
            const isBullish = c.close >= c.open;
            const candleColor = isBullish ? '#10b981' : '#f43f5e';

            const yHigh = priceToY(c.high);
            const yLow = priceToY(c.low);
            const yOpen = priceToY(c.open);
            const yClose = priceToY(c.close);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

            return (
              <g key={`candle_${i}`}>
                {/* High/Low wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth="1.2"
                />
                {/* Real Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={candleColor}
                  stroke={candleColor}
                  strokeWidth="0.5"
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* Separator between main and subplot */}
          <line
            x1={paddingLeft}
            y1={mainHeight}
            x2={chartWidth - paddingRight}
            y2={mainHeight}
            stroke="#334155"
            strokeWidth="1"
          />

          {/* SUBPLOT PANEL */}
          {activeSubplot === 'VOLUME' && (
            <g transform={`translate(0, ${mainHeight})`}>
              <text x={paddingLeft + 4} y="14" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                HACİM (20 SMA)
              </text>
              {visibleCandles.map((c, i) => {
                const x = getCandleX(i);
                const isBull = c.close >= c.open;
                const barHeight = (c.volume / maxVol) * (subHeight - 25);
                const y = subHeight - barHeight;

                return (
                  <rect
                    key={`vol_${i}`}
                    x={x - candleWidth / 2}
                    y={y}
                    width={candleWidth}
                    height={Math.max(1, barHeight)}
                    fill={isBull ? '#065f46' : '#881337'}
                    opacity={0.8}
                  />
                );
              })}
              {/* Volume SMA line */}
              <path
                d={volumeSmaSeries.map((v, i) => {
                  if (v === null) return '';
                  const x = getCandleX(i);
                  const y = subHeight - (v / maxVol) * (subHeight - 25);
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).filter(Boolean).join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.2"
              />
            </g>
          )}

          {activeSubplot === 'RSI' && (
            <g transform={`translate(0, ${mainHeight})`}>
              {/* 70 & 30 Lines */}
              <line
                x1={paddingLeft}
                y1={subHeight * 0.3}
                x2={chartWidth - paddingRight}
                y2={subHeight * 0.3}
                stroke="#f43f5e"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity={0.6}
              />
              <text x={chartWidth - paddingRight + 4} y={subHeight * 0.3 + 3} fill="#f43f5e" fontSize="9" fontFamily="JetBrains Mono">70</text>

              <line
                x1={paddingLeft}
                y1={subHeight * 0.7}
                x2={chartWidth - paddingRight}
                y2={subHeight * 0.7}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity={0.6}
              />
              <text x={chartWidth - paddingRight + 4} y={subHeight * 0.7 + 3} fill="#10b981" fontSize="9" fontFamily="JetBrains Mono">30</text>

              {/* RSI Curve */}
              <path
                d={rsiSeries.map((v, i) => {
                  if (v === null) return '';
                  const x = getCandleX(i);
                  const y = (1 - v / 100) * subHeight;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).filter(Boolean).join(' ')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <text x={paddingLeft + 4} y="14" fill="#38bdf8" fontSize="9" fontFamily="JetBrains Mono">
                RSI 14: {rsiSeries[rsiSeries.length - 1] || '-'}
              </text>
            </g>
          )}

          {activeSubplot === 'MACD' && (
            <g transform={`translate(0, ${mainHeight})`}>
              <line
                x1={paddingLeft}
                y1={subHeight / 2}
                x2={chartWidth - paddingRight}
                y2={subHeight / 2}
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* MACD Histogram */}
              {macdSeries.histogram.map((h, i) => {
                if (h === null) return null;
                const x = getCandleX(i);
                const zeroY = subHeight / 2;
                const scaledH = Math.max(-subHeight / 2 + 5, Math.min(subHeight / 2 - 5, h * 12));
                const y = scaledH > 0 ? zeroY - scaledH : zeroY;

                return (
                  <rect
                    key={`hist_${i}`}
                    x={x - candleWidth / 2}
                    y={y}
                    width={candleWidth}
                    height={Math.max(1, Math.abs(scaledH))}
                    fill={scaledH >= 0 ? '#10b981' : '#f43f5e'}
                    opacity={0.75}
                  />
                );
              })}
              {/* MACD Line */}
              <path
                d={macdSeries.macdLine.map((v, i) => {
                  if (v === null) return '';
                  const x = getCandleX(i);
                  const y = subHeight / 2 - v * 12;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).filter(Boolean).join(' ')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.4"
              />
              {/* Signal Line */}
              <path
                d={macdSeries.signalLine.map((v, i) => {
                  if (v === null) return '';
                  const x = getCandleX(i);
                  const y = subHeight / 2 - v * 12;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).filter(Boolean).join(' ')}
                fill="none"
                stroke="#f97316"
                strokeWidth="1.2"
              />
              <text x={paddingLeft + 4} y="14" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                MACD (12, 26, 9)
              </text>
            </g>
          )}

          {/* CROSSHAIR TRACKER */}
          {hoverIndex !== null && visibleCandles[hoverIndex] && (
            <g>
              {/* Vertical line across full height */}
              <line
                x1={getCandleX(hoverIndex)}
                y1={paddingTop}
                x2={getCandleX(hoverIndex)}
                y2={mainHeight + subHeight}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Horizontal line on price */}
              <line
                x1={paddingLeft}
                y1={priceToY(visibleCandles[hoverIndex].close)}
                x2={chartWidth - paddingRight}
                y2={priceToY(visibleCandles[hoverIndex].close)}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Price badge on right axis */}
              <rect
                x={chartWidth - paddingRight + 2}
                y={priceToY(visibleCandles[hoverIndex].close) - 8}
                width="60"
                height="16"
                fill="#0284c7"
                rx="2"
              />
              <text
                x={chartWidth - paddingRight + 5}
                y={priceToY(visibleCandles[hoverIndex].close) + 3}
                fill="#ffffff"
                fontSize="10"
                fontFamily="JetBrains Mono"
                fontWeight="700"
              >
                {visibleCandles[hoverIndex].close.toFixed(2)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Bottom disclaimer bar */}
      <div className="flex items-center justify-between pt-2 text-[10px] text-slate-500 font-mono">
        <span>Kapsam: BIST Pay Piyasası · Son Güncelleme: {candles[candles.length - 1]?.dateStr || '-'}</span>
        <span>15 Dk Gecikmeli Veri · Kaynak: BIST Resmi Feed / Yahoo Finans</span>
      </div>
    </div>
  );
};
