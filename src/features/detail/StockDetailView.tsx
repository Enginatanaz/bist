import React, { useState, useEffect } from 'react';
import { BISTStock, OHLCV, SupportResistanceZone, KAPDisclosure } from '../../types';
import { apiClient } from '../../services/apiClient';
import { FinancialChart } from '../../components/FinancialChart';
import { Activity, ShieldAlert, ArrowUpRight, BarChart2, Layers, Search, Bookmark, BookmarkCheck, CheckCircle2 } from 'lucide-react';

interface StockDetailViewProps {
  symbol: string;
  stocks: BISTStock[];
  onSelectStock: (symbol: string) => void;
  onNavigateTab: (tab: string) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (symbol: string) => void;
}

export const StockDetailView: React.FC<StockDetailViewProps> = ({
  symbol,
  stocks,
  onSelectStock,
  onNavigateTab,
  isWatchlisted,
  onToggleWatchlist
}) => {
  const [stock, setStock] = useState<BISTStock | null>(null);
  const [candles, setCandles] = useState<OHLCV[]>([]);
  const [zones, setZones] = useState<SupportResistanceZone[]>([]);
  const [disclosures, setDisclosures] = useState<KAPDisclosure[]>([]);
  const [timeframe, setTimeframe] = useState<string>('1d');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataErrorMessage, setDataErrorMessage] = useState<string | null>(null);

  // Quick symbol search box
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setDataErrorMessage(null);

    const loadData = async () => {
      // 1. Fetch stock basic metadata first
      let currentStock: BISTStock | null = null;
      try {
        currentStock = await apiClient.getStock(symbol);
        if (isMounted) setStock(currentStock);
      } catch (err: any) {
        // Find in passed stock list
        const found = stocks.find(s => s.symbol === symbol.toUpperCase());
        if (found && isMounted) setStock(found);
      }

      // 2. Fetch candles and technical data with isolated error handling
      try {
        const [ohlcvData, techData, kapData] = await Promise.all([
          apiClient.getOHLCV(symbol, timeframe, 180).catch(err => {
            if (isMounted) setDataErrorMessage(err.message);
            return { candles: [] };
          }),
          apiClient.getTechnical(symbol, timeframe).catch(() => ({ zones: [] })),
          apiClient.getDisclosures(symbol).catch(() => [])
        ]);

        if (isMounted) {
          setCandles(ohlcvData.candles || []);
          setZones(techData.zones || []);
          setDisclosures(kapData || []);
        }
      } catch (err: any) {
        if (isMounted) setDataErrorMessage(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [symbol, timeframe, stocks]);

  const filteredStocks = searchQuery
    ? stocks.filter(s => s.symbol.includes(searchQuery.toUpperCase()) || s.name.toUpperCase().includes(searchQuery.toUpperCase())).slice(0, 10)
    : [];

  const isPos = (stock?.changePercent || 0) >= 0;

  const segmentLabel = stock?.marketSegment === 'YILDIZ_PAZAR'
    ? 'Yıldız Pazar'
    : stock?.marketSegment === 'ANA_PAZAR'
    ? 'Ana Pazar'
    : stock?.marketSegment === 'ALT_PAZAR'
    ? 'Alt Pazar'
    : stock?.marketSegment === 'POIP'
    ? 'Piyasa Öncesi İşlem Platformu'
    : 'BIST Pay Senedi';

  return (
    <div className="space-y-5">
      {/* Stock Header & Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Symbol Title & Search Switcher */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight font-mono">{symbol}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                {stock?.sector || 'BIST Pay Senedi'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold font-mono">
                {segmentLabel}
              </span>
              {stock?.dataStatus === 'VERIFIED' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </span>
              ) : stock?.dataStatus === 'UNAVAILABLE' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/60 font-mono">
                  UNAVAILABLE
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {stock?.dataStatus || 'NOT_TESTED'}
                </span>
              )}

              <button
                onClick={() => onToggleWatchlist(symbol)}
                className={`p-1.5 rounded border transition-colors ${
                  isWatchlisted
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title={isWatchlisted ? 'İzleme listesinden çıkar' : 'İzleme listesine ekle'}
              >
                {isWatchlisted ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium">{stock?.name}</p>

            {/* Quick Switch Dropdown */}
            <div className="relative pt-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Search className="w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Tüm BIST hisselerinde ara (500+)..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="bg-transparent border-b border-slate-800 focus:border-emerald-500 text-xs text-slate-200 placeholder-slate-600 outline-none pb-0.5 w-60"
                />
              </div>

              {isSearchOpen && filteredStocks.length > 0 && (
                <div className="absolute left-0 mt-1 w-80 bg-slate-950 border border-slate-800 rounded-md shadow-xl z-30 py-1 max-h-56 overflow-y-auto">
                  {filteredStocks.map(s => (
                    <button
                      key={s.symbol}
                      onClick={() => {
                        onSelectStock(s.symbol);
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-200">{s.symbol}</span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-sans">
                          {s.marketSegment === 'YILDIZ_PAZAR' ? 'YILDIZ' : s.marketSegment === 'ANA_PAZAR' ? 'ANA' : s.marketSegment === 'ALT_PAZAR' ? 'ALT' : 'PÖİP'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current Price & Daily Delta */}
          <div className="text-right">
            <div className="text-3xl font-extrabold text-slate-100 font-mono tabular-nums">
              {stock?.lastPrice ? stock.lastPrice.toFixed(2) : '-'} <span className="text-sm font-normal text-slate-400">TL</span>
            </div>
            <div className={`text-sm font-bold font-mono tabular-nums flex items-center justify-end gap-1 mt-0.5 ${
              isPos ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isPos ? `+${stock?.change.toFixed(2) || '0.00'}` : (stock?.change.toFixed(2) || '0.00')} TL
              <span>({isPos ? `+${stock?.changePercent.toFixed(2) || '0.00'}` : (stock?.changePercent.toFixed(2) || '0.00')}%)</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              15 Dk Gecikmeli · Son İşlem: {stock?.updatedAt ? new Date(stock.updatedAt).toLocaleTimeString('tr-TR') : '-'}
            </div>
          </div>
        </div>

        {/* Fundamental & Trading KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs font-mono">
          <div>
            <div className="text-slate-500 text-[11px]">Açılış</div>
            <div className="text-slate-200 font-semibold tabular-nums">{stock?.open ? stock.open.toFixed(2) : '-'} TL</div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">Günlük Yüksek / Düşük</div>
            <div className="text-slate-200 font-semibold tabular-nums">
              {stock?.high ? stock.high.toFixed(2) : '-'} / {stock?.low ? stock.low.toFixed(2) : '-'}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">İşlem Hacmi (TL)</div>
            <div className="text-slate-200 font-semibold tabular-nums">
              {stock?.volumeTL ? `${(stock.volumeTL / 1_000_000).toFixed(1)} M TL` : '-'}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">Piyasa Değeri</div>
            <div className="text-slate-200 font-semibold tabular-nums">
              {stock?.marketCapTL ? `${(stock.marketCapTL / 1_000_000_000).toFixed(2)} Mr TL` : '-'}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">F/K / PD/DD</div>
            <div className="text-slate-200 font-semibold tabular-nums">
              {stock?.pe || '-'} / {stock?.pb || '-'}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px]">Temettü / Pazar</div>
            <div className="text-slate-200 font-semibold tabular-nums">
              %{stock?.dividendYield || 0} / {segmentLabel}
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/50">
          <button
            onClick={() => onNavigateTab('technical')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
            Teknik Analiz Motoruna Git
          </button>
          <button
            onClick={() => onNavigateTab('scenarios')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            5/7/10 Günlük Senaryo Modellemesi
          </button>
          <button
            onClick={() => onNavigateTab('backtesting')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
            Bu Hissede Strateji Backtesti Yap
          </button>
        </div>
      </div>

      {/* Honest Data Unavailability Warning (Kural 1 & Kural 3) */}
      {!isLoading && (candles.length === 0 || dataErrorMessage || stock?.dataStatus === 'UNAVAILABLE') && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-4 flex items-start gap-3 text-xs text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-300">
              Kural 1 &amp; Kural 3 Bildirimi: Gerçek Piyasa Verisi Akışı Durumu ({symbol})
            </div>
            <p className="text-amber-200/90 text-[11px] leading-relaxed">
              Bu şirket ({stock?.name || symbol}), Borsa İstanbul {segmentLabel} evrenimizde kayıtlı resmi bir pay senedidir.
              {dataErrorMessage ? ` Sağlayıcı yanıtı: "${dataErrorMessage}"` : ' Harici piyasa verisi sağlayıcısında bu hisseye ait geçmiş OHLCV mum verisi henüz bulunmamaktadır.'}
            </p>
            <p className="text-amber-300 font-semibold text-[11px]">
              Kural 1 gereğince yatırımcı sağlığını korumak adına hiçbir sahte, rastgele (Math.random) veya sentetik fiyat/mum üretilmemektedir.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Candlestick Chart */}
      {candles.length > 0 && (
        <FinancialChart
          candles={candles}
          symbol={symbol}
          zones={zones}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          isLoading={isLoading}
        />
      )}

      {/* KAP Disclosures List */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          {symbol} Kamuyu Aydınlatma Platformu (KAP) Bildirimleri
        </h3>

        {disclosures.length === 0 ? (
          <div className="text-slate-500 text-xs py-4 text-center font-mono">
            Bu sembol için son 30 gün içinde yayımlanmış KAP açıklaması bulunmuyor.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {disclosures.map(k => (
              <div key={k.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">{k.title}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">{k.summary}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {k.category}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">{k.publishDate}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
