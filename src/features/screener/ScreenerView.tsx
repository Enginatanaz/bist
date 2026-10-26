import React, { useState, useEffect } from 'react';
import { ScreenerStockResult, TechnicalScoreWeights } from '../../types';
import { apiClient } from '../../services/apiClient';
import {
  Filter,
  Download,
  RotateCcw,
  Search,
  ChevronRight,
  Sliders,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Layers,
  Star
} from 'lucide-react';

interface ScreenerViewProps {
  onSelectStock: (symbol: string) => void;
  onAddToWatchlist?: (symbol: string) => void;
}

export const ScreenerView: React.FC<ScreenerViewProps> = ({ onSelectStock, onAddToWatchlist }) => {
  // Preset filter state
  const [activePreset, setActivePreset] = useState<string>('ALL');

  // AND / OR logic
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');

  // Primary filters
  const [marketSegmentFilter, setMarketSegmentFilter] = useState<string>('ALL');
  const [indexFilter, setIndexFilter] = useState<string>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [rsiFilter, setRsiFilter] = useState<string>('ALL');
  const [macdFilter, setMacdFilter] = useState<string>('ALL');
  const [smaFilter, setSmaFilter] = useState<string>('ALL');
  const [volumeFilter, setVolumeFilter] = useState<string>('ALL');
  const [bollingerFilter, setBollingerFilter] = useState<string>('ALL');
  const [adxFilter, setAdxFilter] = useState<string>('ALL');
  const [srProximityFilter, setSrProximityFilter] = useState<string>('ALL');
  const [breakoutFilter, setBreakoutFilter] = useState<string>('ALL');
  const [patternFilter, setPatternFilter] = useState<string>('ALL');
  const [relPerfFilter, setRelPerfFilter] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Configurable weights for technical score
  const [weights, setWeights] = useState<TechnicalScoreWeights>({
    trend: 25,
    momentum: 25,
    volume: 20,
    volatility: 15,
    structure: 15
  });
  const [showWeightModal, setShowWeightModal] = useState<boolean>(false);
  const [selectedScoreBreakdown, setSelectedScoreBreakdown] = useState<ScreenerStockResult | null>(null);

  // Results & pagination
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ScreenerStockResult[]>([]);
  const [universeSize, setUniverseSize] = useState<number>(0);
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Sorting
  const [sortField, setSortField] = useState<keyof ScreenerStockResult['stock'] | 'technicalScore' | 'rsi' | 'relPerf'>('technicalScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const executeScreen = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        logic: filterLogic
      };

      if (activePreset !== 'ALL') params.preset = activePreset;
      if (marketSegmentFilter !== 'ALL') params.marketSegment = marketSegmentFilter;
      if (indexFilter !== 'ALL') params.index = indexFilter;
      if (sectorFilter !== 'ALL') params.sector = sectorFilter;
      if (rsiFilter !== 'ALL') params.rsiFilter = rsiFilter;
      if (macdFilter !== 'ALL') params.macdFilter = macdFilter;
      if (smaFilter !== 'ALL') params.smaFilter = smaFilter;
      if (volumeFilter !== 'ALL') params.volumeFilter = volumeFilter;
      if (bollingerFilter !== 'ALL') params.bollingerFilter = bollingerFilter;
      if (adxFilter !== 'ALL') params.adxFilter = adxFilter;
      if (srProximityFilter !== 'ALL') params.srProximity = srProximityFilter;
      if (breakoutFilter !== 'ALL') params.breakoutFilter = breakoutFilter;
      if (patternFilter !== 'ALL') params.patternFilter = patternFilter;
      if (relPerfFilter !== 'ALL') params.relPerformanceFilter = relPerfFilter;
      if (minScore > 0) params.minScore = minScore.toString();

      params.customWeights = JSON.stringify(weights);

      const resp = await apiClient.runScreener(params);
      let list = resp.results || [];

      if (searchTerm) {
        const q = searchTerm.toUpperCase();
        list = list.filter(item => item.stock.symbol.includes(q) || item.stock.name.toUpperCase().includes(q));
      }

      setResults(list);
      setUniverseSize(resp.screenedUniverseSize);
      setCachedCount(resp.cachedCount);
      setCurrentPage(1);
    } catch (err) {
      console.error('Tarama hatası:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    executeScreen();
  }, [
    activePreset,
    filterLogic,
    marketSegmentFilter,
    indexFilter,
    sectorFilter,
    rsiFilter,
    macdFilter,
    smaFilter,
    volumeFilter,
    bollingerFilter,
    adxFilter,
    srProximityFilter,
    breakoutFilter,
    patternFilter,
    relPerfFilter,
    minScore,
    weights
  ]);

  const resetFilters = () => {
    setActivePreset('ALL');
    setFilterLogic('AND');
    setMarketSegmentFilter('ALL');
    setIndexFilter('ALL');
    setSectorFilter('ALL');
    setRsiFilter('ALL');
    setMacdFilter('ALL');
    setSmaFilter('ALL');
    setVolumeFilter('ALL');
    setBollingerFilter('ALL');
    setAdxFilter('ALL');
    setSrProximityFilter('ALL');
    setBreakoutFilter('ALL');
    setPatternFilter('ALL');
    setRelPerfFilter('ALL');
    setMinScore(0);
    setSearchTerm('');
  };

  const sortedResults = [...results].sort((a, b) => {
    let diff = 0;
    if (sortField === 'technicalScore') diff = a.technicalScore - b.technicalScore;
    else if (sortField === 'rsi') diff = (a.indicators.rsi14 || 0) - (b.indicators.rsi14 || 0);
    else if (sortField === 'relPerf') diff = a.relativePerformanceVsXU100 - b.relativePerformanceVsXU100;
    else if (sortField === 'symbol') diff = a.stock.symbol.localeCompare(b.stock.symbol);
    else if (sortField === 'lastPrice') diff = a.stock.lastPrice - b.stock.lastPrice;
    else if (sortField === 'changePercent') diff = a.stock.changePercent - b.stock.changePercent;
    else if (sortField === 'volumeTL') diff = a.stock.volumeTL - b.stock.volumeTL;
    return sortDir === 'asc' ? diff : -diff;
  });

  const totalPages = Math.ceil(sortedResults.length / pageSize) || 1;
  const paginatedResults = sortedResults.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const exportCSV = () => {
    const headers = [
      'Sembol',
      'Şirket Adı',
      'Sektör',
      'Son Fiyat',
      'Günlük Değişim %',
      'Hacim TL',
      '20G Hacim Oranı',
      'Trend',
      'RSI 14',
      'MACD Durumu',
      'Teknik Puan',
      'Rölatif Getiri %',
      'Destek Mesafesi %',
      'Direnç Mesafesi %'
    ];
    const rows = sortedResults.map(r => [
      r.stock.symbol,
      `"${r.stock.name}"`,
      r.stock.sector,
      r.stock.lastPrice,
      r.stock.changePercent,
      r.stock.volumeTL,
      r.indicators.volumeRatio || '',
      r.trend,
      r.indicators.rsi14 || '',
      r.indicators.macdStatus,
      r.technicalScore,
      r.relativePerformanceVsXU100,
      r.nearestSupport ? r.nearestSupport.distancePct : '',
      r.nearestResistance ? r.nearestResistance.distancePct : ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BIST_Tarama_Sonuclari_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const presets = [
    { id: 'ALL', label: 'Tüm BIST Evreni' },
    { id: 'RSI_50_EMA_BULL', label: 'RSI 50+ & EMA20 > EMA50' },
    { id: 'VOLUME_RESISTANCE_BREAK', label: 'Hacim Kırılımı (1.5x) & Direnç' },
    { id: 'BOLLINGER_SQUEEZE', label: 'Bollinger Bant Sıkışması' },
    { id: 'GOLDEN_CROSS_ADX', label: 'Golden Cross & Güçlü Trend' },
    { id: 'OVERSOLD_REBOUND', label: 'Aşırı Satım & Destek Yakınlığı' },
    { id: 'OUTPERFORMER_XU100', label: 'BIST 100 Üzeri Rölatif Güç' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header & Strategy Presets */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              Akıllı BIST Hisse Tarayıcısı (FAZ 3)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tüm Borsa İstanbul pay senetlerinde deterministik göstergeler, formasyonlar ve çoklu filtreleme motoru.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWeightModal(true)}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Puan Ağırlıkları
            </button>
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Sıfırla
            </button>
            <button
              onClick={exportCSV}
              disabled={results.length === 0}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              CSV Dışa Aktar
            </button>
          </div>
        </div>

        {/* Quick Presets Segmented Buttons */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Örnek Strateji Şablonları (Eğitimsel)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePreset(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  activePreset === p.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Strategy Preset Warning Note */}
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-950/60 p-2 rounded border border-slate-800/60">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Hazır şablonlar yatırım tavsiyesi veya otomatik kâr garantisi değildir. Analiz için matematiksel indikatör filtreleme kurallarıdır.
          </span>
        </div>
      </div>

      {/* Multi-Criteria Filters Drawer */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Çoklu Koşul Filtreleri
          </div>

          {/* AND / OR Logic Switch */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-md border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Mantık:</span>
            <button
              onClick={() => setFilterLogic('AND')}
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                filterLogic === 'AND' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AND (Tümü)
            </button>
            <button
              onClick={() => setFilterLogic('OR')}
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                filterLogic === 'OR' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              OR (Herhangi Biri)
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Market Segment */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Pazar Segmenti</label>
            <select
              value={marketSegmentFilter}
              onChange={(e) => setMarketSegmentFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tüm Pazarlar</option>
              <option value="YILDIZ_PAZAR">Yıldız Pazar</option>
              <option value="ANA_PAZAR">Ana Pazar</option>
              <option value="ALT_PAZAR">Alt Pazar</option>
              <option value="POIP">PÖİP &amp; Diğer</option>
            </select>
          </div>

          {/* Index */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Endeks</label>
            <select
              value={indexFilter}
              onChange={(e) => setIndexFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tümü</option>
              <option value="BIST 30">BIST 30</option>
              <option value="BIST 50">BIST 50</option>
              <option value="BIST 100">BIST 100</option>
            </select>
          </div>

          {/* Sector */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Sektör</label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tüm Sektörler</option>
              <option value="Bankacılık">Bankacılık</option>
              <option value="Havacılık / Ulaştırma">Ulaştırma</option>
              <option value="Savunma & Havacılık">Savunma</option>
              <option value="Enerji & Petrol">Enerji</option>
              <option value="Perakende & Tüketim">Perakende</option>
              <option value="Holding & Yatırım">Holding</option>
              <option value="Telekomünikasyon">Telekom</option>
            </select>
          </div>

          {/* RSI Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">RSI (14)</label>
            <select
              value={rsiFilter}
              onChange={(e) => setRsiFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tümü</option>
              <option value="OVERSOLD_30">Aşırı Satım (&lt; 30)</option>
              <option value="BULLISH_50_70">Boğa Bölgesi (50 - 70)</option>
              <option value="OVERBOUGHT_70">Aşırı Alım (&gt; 70)</option>
              <option value="ABOVE_50">50 Üzerinde</option>
            </select>
          </div>

          {/* MACD Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">MACD</label>
            <select
              value={macdFilter}
              onChange={(e) => setMacdFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tümü</option>
              <option value="BULLISH_CROSS">Boğa Kesişimi (Line &gt; Signal)</option>
              <option value="POSITIVE_HIST">Pozitif Histogram</option>
              <option value="BEARISH_CROSS">Ayı Kesişimi (Line &lt; Signal)</option>
            </select>
          </div>

          {/* SMA / EMA Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Ortalamalar</label>
            <select
              value={smaFilter}
              onChange={(e) => setSmaFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tümü</option>
              <option value="ABOVE_SMA50">Fiyat &gt; SMA50</option>
              <option value="ABOVE_SMA200">Fiyat &gt; SMA200</option>
              <option value="GOLDEN_CROSS">Golden Cross (SMA50 &gt; 200)</option>
              <option value="EMA20_ABOVE_EMA50">EMA20 &gt; EMA50</option>
            </select>
          </div>

          {/* Volume Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">20G Hacim Artışı</label>
            <select
              value={volumeFilter}
              onChange={(e) => setVolumeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tümü</option>
              <option value="HIGH_VOLUME_1_2X">&gt; 1.2x Ortalama</option>
              <option value="HIGH_VOLUME_1_5X">&gt; 1.5x Ortalama</option>
              <option value="HIGH_VOLUME_2X">&gt; 2.0x Patlama</option>
            </select>
          </div>

          {/* ADX Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">ADX Trend Gücü</label>
            <select
              value={adxFilter}
              onChange={(e) => setAdxFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tümü</option>
              <option value="TRENDING_25">Trendde (ADX &gt; 25)</option>
              <option value="STRONG_TREND_30">Çok Güçlü (ADX &gt; 30)</option>
              <option value="RANGING_20">Yatay / Sıkışık (&lt; 20)</option>
            </select>
          </div>

          {/* Bollinger Band */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Bollinger Bandı</label>
            <select
              value={bollingerFilter}
              onChange={(e) => setBollingerFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tümü</option>
              <option value="SQUEEZE">Daralma (Bandwidth &lt; 6%)</option>
              <option value="BREAKOUT_UP">Üst Bant Kırılımı</option>
              <option value="BREAKOUT_DOWN">Alt Bant Kırılımı</option>
            </select>
          </div>

          {/* S/R Proximity */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">D/D Yakınlığı</label>
            <select
              value={srProximityFilter}
              onChange={(e) => setSrProximityFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tümü</option>
              <option value="NEAR_SUPPORT_2PCT">Desteğe %2 Yakın</option>
              <option value="NEAR_RESISTANCE_2PCT">Dirence %2 Yakın</option>
            </select>
          </div>

          {/* Chart Patterns */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Formasyon</label>
            <select
              value={patternFilter}
              onChange={(e) => setPatternFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tümü</option>
              <option value="DOUBLE_BOTTOM">İkili Dip</option>
              <option value="DOUBLE_TOP">İkili Tepe</option>
              <option value="ASCENDING_TRIANGLE">Yükselen Üçgen</option>
              <option value="BULL_FLAG">Boğa Bayrağı</option>
            </select>
          </div>

          {/* Rel Performance vs XU100 */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">XU100 Kıyası</label>
            <select
              value={relPerfFilter}
              onChange={(e) => setRelPerfFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tümü</option>
              <option value="OUTPERFORMING_XU100">Endeks Üstü Getiri</option>
              <option value="UNDERPERFORMING_XU100">Endeks Altı Getiri</option>
            </select>
          </div>

          {/* Min Technical Score */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Min. Puan ({minScore})</label>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded cursor-pointer mt-2"
            />
          </div>
        </div>

        {/* Search & Active Results Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sembol veya şirket ara..."
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="text-slate-400 text-xs flex items-center gap-2">
            <span>
              Eşleşen: <strong className="text-emerald-400 font-mono">{results.length}</strong> / {universeSize} hisse
            </span>
            <span>·</span>
            <span className="text-[11px] text-slate-500 font-mono">
              Doğrulanmış önbellek: {cachedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                <th
                  onClick={() => handleSort('symbol')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  Sembol {sortField === 'symbol' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('lastPrice')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  Son Fiyat {sortField === 'lastPrice' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('changePercent')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  Değişim % {sortField === 'changePercent' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('volumeTL')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  Hacim (TL) {sortField === 'volumeTL' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-2.5 px-3">Trend</th>
                <th
                  onClick={() => handleSort('rsi')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  RSI 14 {sortField === 'rsi' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-2.5 px-3">MACD</th>
                <th className="py-2.5 px-3">D/D Mesafe</th>
                <th
                  onClick={() => handleSort('relPerf')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  XU100 Kıyas {sortField === 'relPerf' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('technicalScore')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  Teknik Puan {sortField === 'technicalScore' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-2.5 px-3">Veri</th>
                <th className="py-2.5 px-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    Borsa İstanbul gerçek verileri taranıyor...
                  </td>
                </tr>
              ) : paginatedResults.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    Seçilen filtre kriterlerine uyan hisse bulunamadı. Filtreleri esnetmeyi deneyin.
                  </td>
                </tr>
              ) : (
                paginatedResults.map((r) => {
                  const isPositive = r.stock.changePercent >= 0;
                  const rsiVal = r.indicators.rsi14;
                  const score = r.technicalScore;

                  return (
                    <tr
                      key={r.stock.symbol}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectStock(r.stock.symbol)}
                    >
                      {/* Symbol & Name */}
                      <td className="py-2.5 px-3 font-mono">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          {r.stock.symbol}
                          <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-sans font-medium">
                            {r.stock.marketSegment === 'YILDIZ_PAZAR' ? 'YILDIZ' : r.stock.marketSegment === 'ANA_PAZAR' ? 'ANA' : r.stock.marketSegment === 'ALT_PAZAR' ? 'ALT' : 'PÖİP'}
                          </span>
                          {r.activePatterns.length > 0 && (
                            <span className="text-[10px] text-amber-400 font-sans" title={r.activePatterns.join(', ')}>
                              ★
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px] font-sans">
                          {r.stock.name}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                        {r.stock.lastPrice.toFixed(2)} TL
                      </td>

                      {/* Change % */}
                      <td className="py-2.5 px-3 font-mono font-medium">
                        <span className={`flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : ''}{r.stock.changePercent.toFixed(2)}%
                        </span>
                      </td>

                      {/* Volume & Multiplier */}
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        <div>{(r.stock.volumeTL / 1e6).toFixed(1)}M TL</div>
                        {r.indicators.volumeRatio && (
                          <div className={`text-[10px] ${r.indicators.volumeRatio >= 1.5 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                            {r.indicators.volumeRatio}x 20G Ort.
                          </div>
                        )}
                      </td>

                      {/* Trend */}
                      <td className="py-2.5 px-3 text-[11px]">
                        {r.trend === 'STRONG_BULL' && <span className="text-emerald-400 font-bold">Güçlü Boğa</span>}
                        {r.trend === 'BULLISH' && <span className="text-emerald-400">Boğa</span>}
                        {r.trend === 'NEUTRAL' && <span className="text-slate-400">Nötr</span>}
                        {r.trend === 'BEARISH' && <span className="text-rose-400">Ayı</span>}
                        {r.trend === 'STRONG_BEAR' && <span className="text-rose-400 font-bold">Güçlü Ayı</span>}
                      </td>

                      {/* RSI */}
                      <td className="py-2.5 px-3 font-mono">
                        {rsiVal !== null ? (
                          <span className={
                            rsiVal >= 70 ? 'text-amber-400 font-bold' :
                            rsiVal <= 30 ? 'text-cyan-400 font-bold' :
                            rsiVal >= 50 ? 'text-emerald-300' : 'text-slate-400'
                          }>
                            {rsiVal.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>

                      {/* MACD */}
                      <td className="py-2.5 px-3 text-[11px] font-mono">
                        {r.indicators.macdStatus === 'BULLISH' ? (
                          <span className="text-emerald-400 font-semibold">Boğa Kesişim</span>
                        ) : r.indicators.macdStatus === 'BEARISH' ? (
                          <span className="text-rose-400">Ayı Kesişim</span>
                        ) : (
                          <span className="text-slate-500">Nötr</span>
                        )}
                      </td>

                      {/* Nearest Support / Resistance */}
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {r.nearestSupport && (
                          <div className="text-emerald-400/90 text-[10px]">
                            D: {r.nearestSupport.price.toFixed(1)} (%{Math.abs(r.nearestSupport.distancePct).toFixed(1)})
                          </div>
                        )}
                        {r.nearestResistance && (
                          <div className="text-rose-400/90 text-[10px]">
                            R: {r.nearestResistance.price.toFixed(1)} (%{Math.abs(r.nearestResistance.distancePct).toFixed(1)})
                          </div>
                        )}
                      </td>

                      {/* Relative Performance */}
                      <td className="py-2.5 px-3 font-mono text-xs">
                        <span className={r.relativePerformanceVsXU100 >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {r.relativePerformanceVsXU100 >= 0 ? '+' : ''}{r.relativePerformanceVsXU100.toFixed(1)}%
                        </span>
                      </td>

                      {/* Technical Score with breakdown click */}
                      <td
                        className="py-2.5 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScoreBreakdown(r);
                        }}
                      >
                        <div className="flex items-center gap-1.5 hover:underline cursor-pointer">
                          <span className={`font-mono font-bold text-xs ${
                            score >= 70 ? 'text-emerald-400' :
                            score >= 50 ? 'text-amber-400' :
                            'text-rose-400'
                          }`}>
                            {score}
                          </span>
                          <span className="text-[10px] text-slate-500">/ 100</span>
                        </div>
                        <div className="w-16 h-1 bg-slate-800 rounded overflow-hidden mt-1">
                          <div
                            className={`h-full ${
                              score >= 70 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </td>

                      {/* Data Quality */}
                      <td className="py-2.5 px-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 text-emerald-400 font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          {r.dataQuality.barCount}G
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {onAddToWatchlist && (
                            <button
                              onClick={() => onAddToWatchlist(r.stock.symbol)}
                              title="İzleme Listesine Ekle"
                              className="p-1 hover:text-amber-400 text-slate-500 transition-colors"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectStock(r.stock.symbol)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                          >
                            İncele
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between p-3 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Sayfa başı:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
            >
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Sayfa {currentPage} / {totalPages} ({results.length} kayıt)
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 disabled:opacity-40"
              >
                Önceki
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Customization Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Teknik Puan Ağırlık Dağılımı (0-100)
              </h3>
              <button
                onClick={() => setShowWeightModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Teknik puanlama motorunun hangi bileşene ne kadar ağırlık vereceğini özelleştirin. Toplam ağırlık otomatik olarak 100'e normalize edilir.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-sans">
                  <span>Trend Ağırlığı (SMA, EMA, Golden Cross)</span>
                  <span className="font-mono text-emerald-400">%{weights.trend}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.trend}
                  onChange={(e) => setWeights({ ...weights, trend: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-sans">
                  <span>Momentum Ağırlığı (RSI, MACD, ADX)</span>
                  <span className="font-mono text-emerald-400">%{weights.momentum}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.momentum}
                  onChange={(e) => setWeights({ ...weights, momentum: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-sans">
                  <span>Hacim Ağırlığı (20G Hacim Artışı, OBV)</span>
                  <span className="font-mono text-emerald-400">%{weights.volume}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.volume}
                  onChange={(e) => setWeights({ ...weights, volume: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-sans">
                  <span>Volatilite Ağırlığı (Bollinger, ATR)</span>
                  <span className="font-mono text-emerald-400">%{weights.volatility}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.volatility}
                  onChange={(e) => setWeights({ ...weights, volatility: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-sans">
                  <span>Piyasa Yapısı & Formasyonlar</span>
                  <span className="font-mono text-emerald-400">%{weights.structure}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.structure}
                  onChange={(e) => setWeights({ ...weights, structure: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setWeights({ trend: 25, momentum: 25, volume: 20, volatility: 15, structure: 15 });
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-md"
              >
                Varsayılana Dön
              </button>
              <button
                onClick={() => setShowWeightModal(false)}
                className="px-4 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-md"
              >
                Kaydet ve Uygula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Breakdown Detail Modal */}
      {selectedScoreBreakdown && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>{selectedScoreBreakdown.stock.symbol}</span>
                  <span className="text-xs font-normal text-slate-400 font-sans">
                    {selectedScoreBreakdown.stock.name}
                  </span>
                </h3>
                <div className="text-xs text-emerald-400 font-mono mt-0.5">
                  Bileşik Teknik Puan: <strong>{selectedScoreBreakdown.technicalScore} / 100</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedScoreBreakdown(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Evaluation Text */}
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs text-slate-300">
              <strong>Değerlendirme: </strong>
              {selectedScoreBreakdown.scoreBreakdown.evaluationText}
            </div>

            {/* Components Detail */}
            <div className="space-y-2.5 text-xs">
              {Object.entries(selectedScoreBreakdown.scoreBreakdown.components).map(([key, val]) => (
                <div key={key} className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-200 uppercase text-[11px] tracking-wider">
                      {key === 'trend' && 'Trend (Ortalamalar)'}
                      {key === 'momentum' && 'Momentum (RSI/MACD)'}
                      {key === 'volume' && 'Hacim Gücü'}
                      {key === 'volatility' && 'Volatilite & Bantlar'}
                      {key === 'structure' && 'Destek/Direnç & Formasyon'}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {val.score} / {val.maxScore} Puan
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {val.details}
                  </div>
                </div>
              ))}
            </div>

            {/* Anti-Hype Disclaimer */}
            <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
              {selectedScoreBreakdown.scoreBreakdown.disclaimer}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  const sym = selectedScoreBreakdown.stock.symbol;
                  setSelectedScoreBreakdown(null);
                  onSelectStock(sym);
                }}
                className="px-4 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-md flex items-center gap-1.5"
              >
                Grafik & Detaylı Analize Git
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
