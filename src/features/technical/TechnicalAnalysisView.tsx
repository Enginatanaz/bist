import React, { useState, useEffect } from 'react';
import {
  BISTStock,
  TechnicalIndicators,
  SupportResistanceZone,
  ChartPattern,
  MultiTimeframeTrend
} from '../../types';
import { apiClient } from '../../services/apiClient';
import {
  ShieldCheck,
  AlertTriangle,
  Compass,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';

interface TechnicalAnalysisViewProps {
  symbol: string;
  stocks: BISTStock[];
  onSelectStock: (symbol: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const TechnicalAnalysisView: React.FC<TechnicalAnalysisViewProps> = ({
  symbol,
  stocks,
  onSelectStock,
  onNavigateTab
}) => {
  const [data, setData] = useState<{
    stock: BISTStock;
    indicators: TechnicalIndicators;
    zones: SupportResistanceZone[];
    patterns: ChartPattern[];
    trends: MultiTimeframeTrend[];
    candleCount: number;
    lastCandleDate: string;
    isDelayed: boolean;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'SUMMARY' | 'INDICATORS' | 'LEVELS' | 'PATTERNS' | 'REPORT'>('SUMMARY');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    apiClient.getTechnical(symbol, '1d')
      .then(res => {
        if (isMounted) setData(res);
      })
      .catch(err => {
        if (isMounted) setError(err.message || 'Teknik analiz verisi alınamadı.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [symbol]);

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mb-3" />
        <div className="text-xs text-slate-400 font-mono">
          {symbol} için tüm teknik göstergeler, pivot bölgeleri ve formasyonlar hesaplanıyor...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-100">
            {symbol} İçin Doğrulanmış Teknik Analiz Verisi Bulunamadı
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
            Bu sembol Borsa İstanbul hisse evreninde kayıtlıdır ancak sağlayıcıdan yeterli geçerli OHLCV mum verisi alınamadı ({error}). Kural 1 uyarınca sahte veya sentetik indikatör hesaplanmamaktadır.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => onSelectStock('THYAO')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded transition-colors"
          >
            Doğrulanmış BIST 30 Hisselerine Dön (THYAO)
          </button>
        </div>
      </div>
    );
  }

  const { stock, indicators, zones, patterns, trends, lastCandleDate } = data;
  const currentPrice = stock.lastPrice;

  // Evaluate technical gauges
  const rsi = indicators.rsi14 || 50;
  const isAboveSma50 = indicators.sma50 ? currentPrice > indicators.sma50 : true;
  const isAboveSma200 = indicators.sma200 ? currentPrice > indicators.sma200 : true;
  const isMacdBullish = (indicators.macd?.histogram || 0) > 0;

  let trendSignal = 'NÖTR';
  let trendColor = 'text-slate-300';
  if (isAboveSma50 && isAboveSma200) {
    trendSignal = 'GÜÇLÜ BOĞA';
    trendColor = 'text-emerald-400';
  } else if (isAboveSma50) {
    trendSignal = 'BOĞA EĞİLİMLİ';
    trendColor = 'text-emerald-300';
  } else if (!isAboveSma50 && !isAboveSma200) {
    trendSignal = 'GÜÇLÜ AYI';
    trendColor = 'text-rose-400';
  } else {
    trendSignal = 'AYI EĞİLİMLİ';
    trendColor = 'text-rose-300';
  }

  let momentumSignal = 'DENGELİ';
  if (rsi > 70) momentumSignal = 'AŞIRI ALIM (Kâr Satışı Riski)';
  else if (rsi < 30) momentumSignal = 'AŞIRI SATIM (Tepki Potansiyeli)';
  else if (rsi >= 55) momentumSignal = 'POZİTİF MOMENTUM';
  else if (rsi <= 45) momentumSignal = 'NEGATİF MOMENTUM';

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100 font-mono">{symbol}</h2>
              <span className="text-xs text-slate-400 font-medium">· {stock.name}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{stock.sector}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1">
              <span>Son Fiyat: <strong className="text-slate-100">{stock.lastPrice.toFixed(2)} TL</strong></span>
              <span className="text-slate-600">·</span>
              <span className={stock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                Günlük: {stock.changePercent >= 0 ? `+${stock.changePercent}%` : `${stock.changePercent}%`}
              </span>
              <span className="text-slate-600">·</span>
              <span>Veri Zamanı: {lastCandleDate}</span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-400">15 Dk Gecikmeli Doğrulanmış Veri</span>
            </div>
          </div>

          {/* Sub-nav Tab Buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveSubTab('SUMMARY')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeSubTab === 'SUMMARY' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Özet Göstergeler
            </button>
            <button
              onClick={() => setActiveSubTab('INDICATORS')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeSubTab === 'INDICATORS' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tüm İndikatörler
            </button>
            <button
              onClick={() => setActiveSubTab('LEVELS')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeSubTab === 'LEVELS' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Destek & Direnç
            </button>
            <button
              onClick={() => setActiveSubTab('PATTERNS')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeSubTab === 'PATTERNS' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Formasyonlar ({patterns.length})
            </button>
            <button
              onClick={() => setActiveSubTab('REPORT')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeSubTab === 'REPORT' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kapsamlı Rapor
            </button>
          </div>
        </div>
      </div>

      {/* 4 Primary Summary Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Trend Direction */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Trend Yönü</span>
            <Compass className="w-4 h-4 text-slate-500" />
          </div>
          <div className={`text-sm font-bold font-mono tracking-tight ${trendColor}`}>
            {trendSignal}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Fiyat &gt; SMA 50: {isAboveSma50 ? 'Evet' : 'Hayır'} · Fiyat &gt; SMA 200: {isAboveSma200 ? 'Evet' : 'Hayır'}
          </div>
        </div>

        {/* Momentum Strength */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Momentum Durumu</span>
            <Zap className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-sm font-bold font-mono text-cyan-400">
            {momentumSignal}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            RSI (14): <strong className="text-slate-300">{rsi.toFixed(1)}</strong> · MACD Hist: <strong className="text-slate-300">{indicators.macd?.histogram || '-'}</strong>
          </div>
        </div>

        {/* Volatility Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Volatilite Seviyesi</span>
            <AlertTriangle className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-sm font-bold font-mono text-amber-400">
            {indicators.bollinger && indicators.bollinger.bandwidth < 6 ? 'SIKIŞMA (Bant %6 altı)' : 'NORMAL DALGA BOYU'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            ATR (14): <strong className="text-slate-300">{indicators.atr14?.toFixed(2) || '-'} TL</strong> (Ortalama günlük aralık)
          </div>
        </div>

        {/* Volume Confluence */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Hacim Teyidi</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-sm font-bold font-mono text-emerald-400">
            {indicators.volumeRatio && indicators.volumeRatio >= 1.5 ? 'GÜÇLÜ HACİM ARTIŞI' : 'RUTİN İŞLEM HACMİ'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Güncel Hacim / 20 Ort: <strong className="text-slate-300">{indicators.volumeRatio || '1.0'}x</strong>
          </div>
        </div>
      </div>

      {/* Multi-Timeframe Alignment Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          Çoklu Zaman Dilimi Trend Uyumu (Multi-Timeframe Trend Matrix)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {trends.map(t => {
            const isBull = t.trend.includes('BULL');
            const isBear = t.trend.includes('BEAR');
            return (
              <div
                key={t.timeframe}
                className="bg-slate-950 p-3 rounded border border-slate-800/80 font-mono"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400 font-semibold">{t.label}</span>
                  <span className="text-[10px] text-slate-500">RSI: {t.rsi.toFixed(0)}</span>
                </div>
                <div className={`text-xs font-bold ${isBull ? 'text-emerald-400' : isBear ? 'text-rose-400' : 'text-slate-300'}`}>
                  {t.trend === 'STRONG_BULL' ? 'GÜÇLÜ BOĞA' : t.trend === 'BULLISH' ? 'YUKARI' : t.trend === 'STRONG_BEAR' ? 'GÜÇLÜ AYI' : t.trend === 'BEARISH' ? 'AŞAĞI' : 'YATAY'}
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full ${isBull ? 'bg-emerald-500' : isBear ? 'bg-rose-500' : 'bg-slate-600'}`}
                    style={{ width: `${t.strengthScore}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 font-sans mt-1.5 truncate">{t.summary}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TAB 1: SUMMARY / GENERAL ANALYSIS */}
      {activeSubTab === 'SUMMARY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Support and Resistance highlights */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center justify-between">
              <span>Önemli Destek ve Direnç Koridorları</span>
              <button onClick={() => setActiveSubTab('LEVELS')} className="text-emerald-400 hover:underline text-[11px]">
                Tümünü Gör
              </button>
            </h3>
            <div className="space-y-2 font-mono text-xs">
              {zones.slice(0, 4).map(z => {
                const isSupp = z.type === 'SUPPORT';
                return (
                  <div
                    key={z.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded border border-slate-800/80"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSupp ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {isSupp ? 'DESTEK' : 'DİRENÇ'}
                      </span>
                      <span className="font-semibold text-slate-200">{z.priceLow.toFixed(2)} - {z.priceHigh.toFixed(2)} TL</span>
                    </div>
                    <div className="text-right text-slate-400 text-[11px]">
                      Mesafe: <strong className={isSupp ? 'text-emerald-400' : 'text-rose-400'}>{z.distancePercent}%</strong>
                      <span className="text-slate-600 mx-1">·</span>
                      Güç: <strong className="text-slate-200">{z.strengthScore}/100</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Chart Patterns */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center justify-between">
              <span>Tespit Edilen Fiyat Formasyonları</span>
              <button onClick={() => setActiveSubTab('PATTERNS')} className="text-emerald-400 hover:underline text-[11px]">
                Detaylar
              </button>
            </h3>
            {patterns.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Son periyotta aktif kırılım aşamasına gelmiş klasik grafik formasyonu tespit edilmedi.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {patterns.map(p => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-950/60 rounded border border-slate-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{p.turkishName}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        p.status === 'CONFIRMED' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                      }`}>
                        {p.status === 'CONFIRMED' ? 'Teyit Edildi' : 'Oluşum Aşamasında'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{p.description}</p>
                    <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-slate-400">
                      <span>Hedef Fiyat: <strong className="text-emerald-400">{p.targetPrice} TL</strong></span>
                      <span>Stop-Loss: <strong className="text-rose-400">{p.stopLossPrice} TL</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED INDICATOR TABLE */}
      {activeSubTab === 'INDICATORS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-3 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="font-bold text-slate-200">Deterministik İndikatör Değerleri ve Parametreleri</span>
            <span className="font-mono text-[11px]">Son Mum: {lastCandleDate}</span>
          </div>
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] text-slate-400 font-medium uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3.5">İndikatör</th>
                <th className="py-2.5 px-3.5">Kategori</th>
                <th className="py-2.5 px-3.5">Parametre / Formül</th>
                <th className="py-2.5 px-3.5 text-right">Hesaplanan Değer</th>
                <th className="py-2.5 px-3.5 text-center">Teknik Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs tabular-nums">
              <tr>
                <td className="py-2.5 px-3.5 font-bold text-slate-100 font-sans">RSI (Relative Strength Index)</td>
                <td className="py-2.5 px-3.5 text-slate-400 font-sans">Momentum</td>
                <td className="py-2.5 px-3.5 text-slate-500 font-sans">14 Periyot Wilder Düzeltmesi</td>
                <td className="py-2.5 px-3.5 text-right font-bold text-cyan-400">{indicators.rsi14 || '-'}</td>
                <td className="py-2.5 px-3.5 text-center font-sans">
                  {rsi > 70 ? 'Aşırı Alım' : rsi < 30 ? 'Aşırı Satım' : 'Dengeli Bölge'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3.5 font-bold text-slate-100 font-sans">MACD (12, 26, 9)</td>
                <td className="py-2.5 px-3.5 text-slate-400 font-sans">Trend & Momentum</td>
                <td className="py-2.5 px-3.5 text-slate-500 font-sans">EMA12 - EMA26 vs Sinyal EMA9</td>
                <td className="py-2.5 px-3.5 text-right font-bold text-slate-100">
                  {indicators.macd?.macdLine} / {indicators.macd?.signalLine} (Hist: {indicators.macd?.histogram})
                </td>
                <td className="py-2.5 px-3.5 text-center font-sans">
                  {(indicators.macd?.histogram || 0) > 0 ? (
                    <span className="text-emerald-400 font-semibold">Pozitif Kesişim</span>
                  ) : (
                    <span className="text-rose-400 font-semibold">Negatif Kesişim</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3.5 font-bold text-slate-100 font-sans">Bollinger Bantları (20, 2)</td>
                <td className="py-2.5 px-3.5 text-slate-400 font-sans">Volatilite</td>
                <td className="py-2.5 px-3.5 text-slate-500 font-sans">SMA20 ± 2 Standart Sapma</td>
                <td className="py-2.5 px-3.5 text-right text-slate-200">
                  Üst: {indicators.bollinger?.upper} · Alt: {indicators.bollinger?.lower} (Bant: %{indicators.bollinger?.bandwidth})
                </td>
                <td className="py-2.5 px-3.5 text-center font-sans">
                  {indicators.bollinger && indicators.bollinger.bandwidth < 6 ? 'Sıkışma (Patlama Yakın)' : 'Normal Bant'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3.5 font-bold text-slate-100 font-sans">SMA 20 / 50 / 200</td>
                <td className="py-2.5 px-3.5 text-slate-400 font-sans">Trend</td>
                <td className="py-2.5 px-3.5 text-slate-500 font-sans">Basit Hareketli Ortalamalar</td>
                <td className="py-2.5 px-3.5 text-right text-slate-200">
                  SMA20: {indicators.sma20} | SMA50: {indicators.sma50} | SMA200: {indicators.sma200}
                </td>
                <td className="py-2.5 px-3.5 text-center font-sans">
                  {isAboveSma50 && isAboveSma200 ? 'Ortalamalar Üzerinde' : 'Ortalamalar Altında'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3.5 font-bold text-slate-100 font-sans">ATR 14 (Average True Range)</td>
                <td className="py-2.5 px-3.5 text-slate-400 font-sans">Volatilite</td>
                <td className="py-2.5 px-3.5 text-slate-500 font-sans">14 Günlük Gerçek Ortalama Aralık</td>
                <td className="py-2.5 px-3.5 text-right text-slate-200 font-bold">{indicators.atr14?.toFixed(2)} TL</td>
                <td className="py-2.5 px-3.5 text-center font-sans">Günlük %{((indicators.atr14 || 1) / currentPrice * 100).toFixed(1)} Salınım</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3.5 font-bold text-slate-100 font-sans">Stokastik Osilatör (%K, %D)</td>
                <td className="py-2.5 px-3.5 text-slate-400 font-sans">Momentum</td>
                <td className="py-2.5 px-3.5 text-slate-500 font-sans">14, 3, 3 Hızlı ve Yavaş</td>
                <td className="py-2.5 px-3.5 text-right text-slate-200">
                  %K: {indicators.stochastic?.k || '-'} | %D: {indicators.stochastic?.d || '-'}
                </td>
                <td className="py-2.5 px-3.5 text-center font-sans">
                  {(indicators.stochastic?.k || 50) > 80 ? 'Aşırı Alım' : (indicators.stochastic?.k || 50) < 20 ? 'Aşırı Satım' : 'Denge'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3.5 font-bold text-slate-100 font-sans">Ichimoku Bulutu</td>
                <td className="py-2.5 px-3.5 text-slate-400 font-sans">Piyasa Yapısı</td>
                <td className="py-2.5 px-3.5 text-slate-500 font-sans">Tenkan 9, Kijun 26, Span A/B 52</td>
                <td className="py-2.5 px-3.5 text-right text-slate-200">
                  Tenkan: {indicators.ichimoku?.tenkanSen} | Kijun: {indicators.ichimoku?.kijunSen}
                </td>
                <td className="py-2.5 px-3.5 text-center font-sans">
                  {currentPrice > (indicators.ichimoku?.kijunSen || currentPrice) ? 'Kijun Üzerinde' : 'Kijun Altında'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3.5 font-bold text-slate-100 font-sans">Parabolic SAR</td>
                <td className="py-2.5 px-3.5 text-slate-400 font-sans">Trend Takip</td>
                <td className="py-2.5 px-3.5 text-slate-500 font-sans">Adım 0.02, Maks 0.2</td>
                <td className="py-2.5 px-3.5 text-right text-slate-200">{indicators.parabolicSar?.toFixed(2)} TL</td>
                <td className="py-2.5 px-3.5 text-center font-sans">
                  {currentPrice > (indicators.parabolicSar || 0) ? (
                    <span className="text-emerald-400 font-semibold">Alım Konumunda</span>
                  ) : (
                    <span className="text-rose-400 font-semibold">Satış Konumunda</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: SUPPORT & RESISTANCE ENGINE */}
      {activeSubTab === 'LEVELS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100">Destek ve Direnç Bölgeleri Motoru</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Fiyat seviyeleri tek bir çizgi yerine ATR dinamik toleransına dayalı fiyat bölgeleri olarak kümelenmiştir.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {zones.map(z => {
              const isSupp = z.type === 'SUPPORT';
              return (
                <div
                  key={z.id}
                  className={`p-3.5 rounded border ${
                    isSupp ? 'bg-emerald-950/20 border-emerald-900/60' : 'bg-rose-950/20 border-rose-900/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isSupp ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
                      }`}>
                        {isSupp ? 'DESTEK BÖLGESİ' : 'DİRENÇ BÖLGESİ'}
                      </span>
                      <span className="text-sm font-bold text-slate-100">
                        {z.priceLow.toFixed(2)} - {z.priceHigh.toFixed(2)} TL
                      </span>
                      <span className="text-slate-500">(Pivot: {z.pivotPrice.toFixed(2)} TL)</span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400">
                      <span>Mesafe: <strong className={isSupp ? 'text-emerald-400' : 'text-rose-400'}>{z.distancePercent}%</strong></span>
                      <span>Test Sayısı: <strong className="text-slate-200">{z.touchCount} temas</strong></span>
                      <span>Güç Skoru: <strong className="text-slate-100">{z.strengthScore} / 100</strong></span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className={`h-full ${isSupp ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${z.strengthScore}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PATTERNS */}
      {activeSubTab === 'PATTERNS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100">Grafik Formasyonları Tespit Motoru</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gelecekte oluşan tepe ve dipler geçmişte biliniyormuş gibi kullanılmaz; boyun çizgisi kırılımı sonrası teyit aranır.
            </p>
          </div>

          {patterns.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-mono">
              Bu hissede yakın dönemde matematiksel kurallarla doğrulanmış formasyon bulunmamaktadır.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {patterns.map(p => (
                <div
                  key={p.id}
                  className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-sm">{p.turkishName}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      p.bias === 'BULLISH' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                    }`}>
                      {p.bias === 'BULLISH' ? 'Yükseliş Eğilimli' : 'Düşüş Eğilimli'}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">{p.description}</p>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
                    <div>
                      <div className="text-slate-500">Boyun Çizgisi</div>
                      <div className="text-slate-200 font-semibold">{p.necklinePrice} TL</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Formasyon Hedefi</div>
                      <div className="text-emerald-400 font-semibold">{p.targetPrice} TL</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Stop-Loss</div>
                      <div className="text-rose-400 font-semibold">{p.stopLossPrice} TL</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AUTOMATED TECHNICAL REPORT (RULE 2.6) */}
      {activeSubTab === 'REPORT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Otomatik Teknik Analiz ve Risk Raporu ({symbol})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kural 2.6 uyarınca üretilmiş deterministik teknik değerlendirme özetidir.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('scenarios')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors flex items-center gap-1.5"
            >
              Senaryo Modeline Git
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-300">
            <div className="p-3 bg-slate-950 rounded border border-slate-800/80">
              <h4 className="font-bold text-emerald-400 mb-1">1. Piyasa Trendi ve Momentum Değerlendirmesi</h4>
              <p>
                {symbol} pay senedi {currentPrice.toFixed(2)} TL seviyesinde olup, 50 günlük basit hareketli ortalaması {indicators.sma50} TL ve 200 günlük ortalaması {indicators.sma200} TL seviyesindedir. Fiyatın ortalamalar üzerindeki konumu trend yönünün {trendSignal} olarak sınıflandırılmasına işaret etmektedir. RSI (14) göstergesi {indicators.rsi14} seviyesinde bulunarak {momentumSignal.toLowerCase()} karakter sergilemektedir.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800/80">
              <h4 className="font-bold text-cyan-400 mb-1">2. Volatilite ve İşlem Hacmi Analizi</h4>
              <p>
                14 günlük Ortalama Gerçek Aralık (ATR) {indicators.atr14?.toFixed(2)} TL seviyesindedir. Bu durum seans başına ortalama %{((indicators.atr14 || 1) / currentPrice * 100).toFixed(2)} düzeyinde teorik fiyat dalgalanması beklenebileceğini göstermektedir. Bollinger bant genişliği %{indicators.bollinger?.bandwidth} olup, güncel işlem hacminin 20 günlük ortalamaya oranı {indicators.volumeRatio}x kat seviyesindedir.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800/80">
              <h4 className="font-bold text-amber-400 mb-1">3. Olumlu ve Olumsuz Senaryo Tetikleyicileri</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-300 mt-1">
                <li>
                  <strong className="text-slate-100">Olumlu Görünüm Teyidi:</strong> En yakın direnç bölgesi olan {zones.find(z => z.type === 'RESISTANCE')?.priceHigh || '-'} TL seviyesinin üzerinde hacimli kapanış gerçekleşmesi.
                </li>
                <li>
                  <strong className="text-slate-100">Olumsuz Görünüm Teyidi:</strong> En yakın destek koridoru olan {zones.find(z => z.type === 'SUPPORT')?.priceLow || '-'} TL seviyesinin kırılması ve momentum zayıflaması.
                </li>
                <li>
                  <strong className="text-slate-100">Analizi Geçersiz Kılacak Koşullar:</strong> Stop seviyesinin altında seans kapanışı veya piyasa genelinde olağanüstü volatilite şokları.
                </li>
              </ul>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <strong>Veri Güvenilirliği & Sınırlamalar:</strong> Bu analiz 15 dakika gecikmeli resmi Borsa İstanbul verileri kullanılarak hazırlanmıştır. Tek bir teknik indikatör tek başına gelecekteki fiyat yönünü garanti edemez. Aracı kurum komisyonları, kayma (slippage) ve piyasa likiditesi dikkate alınmalıdır.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
