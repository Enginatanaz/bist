import {
  BISTStock,
  OHLCV,
  MarketStatus,
  TechnicalIndicators,
  SupportResistanceZone,
  ChartPattern,
  MultiTimeframeTrend,
  ScenarioHorizon,
  BacktestResult,
  KAPDisclosure,
  DataHealthReport,
  AnalyticalReport
} from '../types';

export const apiClient = {
  async getMarketStatus(): Promise<MarketStatus> {
    const res = await fetch('/api/market/status');
    if (!res.ok) throw new Error('Piyasa durumu alınamadı.');
    return res.json();
  },

  async getStocks(params?: {
    index?: string;
    sector?: string;
    search?: string;
    marketSegment?: string;
    dataStatus?: string;
  }): Promise<BISTStock[]> {
    const q = new URLSearchParams();
    if (params?.index) q.set('index', params.index);
    if (params?.sector) q.set('sector', params.sector);
    if (params?.search) q.set('search', params.search);
    if (params?.marketSegment) q.set('marketSegment', params.marketSegment);
    if (params?.dataStatus) q.set('dataStatus', params.dataStatus);

    const res = await fetch(`/api/stocks?${q.toString()}`);
    if (!res.ok) throw new Error('Hisseler alınamadı.');
    return res.json();
  },

  async getStock(symbol: string): Promise<BISTStock> {
    const res = await fetch(`/api/stocks/${symbol}`);
    if (!res.ok) throw new Error(`Hisse bulunamadı: ${symbol}`);
    return res.json();
  },

  async getOHLCV(symbol: string, timeframe: string = '1d', limit: number = 180): Promise<{
    symbol: string;
    timeframe: string;
    count: number;
    provider: string;
    isDelayed: boolean;
    candles: OHLCV[];
  }> {
    const res = await fetch(`/api/stocks/${symbol}/ohlcv?timeframe=${timeframe}&limit=${limit}`);
    if (!res.ok) throw new Error('OHLCV verisi alınamadı.');
    return res.json();
  },

  async getTechnical(symbol: string, timeframe: string = '1d'): Promise<{
    symbol: string;
    stock: BISTStock;
    timeframe: string;
    indicators: TechnicalIndicators;
    zones: SupportResistanceZone[];
    patterns: ChartPattern[];
    trends: MultiTimeframeTrend[];
    candleCount: number;
    lastCandleDate: string;
    provider: string;
    isDelayed: boolean;
  }> {
    const res = await fetch(`/api/stocks/${symbol}/technical?timeframe=${timeframe}`);
    if (!res.ok) throw new Error('Teknik analiz verisi alınamadı.');
    return res.json();
  },

  async getScenarios(symbol: string): Promise<import('../types').ExtendedScenarioResult> {
    const res = await fetch(`/api/stocks/${symbol}/scenarios`);
    if (!res.ok) throw new Error('Senaryo verisi alınamadı.');
    return res.json();
  },

  async generateAiReport(symbol: string): Promise<AnalyticalReport> {
    const res = await fetch(`/api/stocks/${symbol}/ai-report`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Yapay zeka analitik raporu üretilemedi.');
    return res.json();
  },

  async runBacktest(params: any): Promise<BacktestResult> {
    const res = await fetch('/api/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Backtest simülasyonu başarısız oldu.');
    return res.json();
  },

  async runScreener(filters: Record<string, string>): Promise<{
    totalCount: number;
    screenedUniverseSize: number;
    cachedCount: number;
    logic: 'AND' | 'OR';
    results: import('../types').ScreenerStockResult[];
  }> {
    const q = new URLSearchParams(filters);
    const res = await fetch(`/api/screener?${q.toString()}`);
    if (!res.ok) throw new Error('Tarama filtresi uygulanamadı.');
    return res.json();
  },

  async getWatchlists(): Promise<import('../types').WatchlistFolder[]> {
    const res = await fetch('/api/watchlist');
    if (!res.ok) throw new Error('İzleme listeleri alınamadı.');
    return res.json();
  },

  async saveWatchlists(folders: import('../types').WatchlistFolder[]): Promise<any> {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folders })
    });
    if (!res.ok) throw new Error('İzleme listeleri kaydedilemedi.');
    return res.json();
  },


  async getDisclosures(symbol?: string): Promise<KAPDisclosure[]> {
    const url = symbol ? `/api/disclosures?symbol=${symbol}` : '/api/disclosures';
    const res = await fetch(url);
    if (!res.ok) throw new Error('KAP bildirimleri alınamadı.');
    return res.json();
  },

  async getHealthReport(): Promise<DataHealthReport & { telemetry?: any }> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Sağlık raporu alınamadı.');
    return res.json();
  },

  async runUnitTests(): Promise<{ allPassed: boolean; testsCount: number; results: { name: string; passed: boolean; message: string }[] }> {
    const res = await fetch('/api/tests/run');
    if (!res.ok) throw new Error('Birim testleri çalıştırılamadı.');
    return res.json();
  },

  async getSettings(): Promise<{
    providerMode: string;
    providerName: string;
    isRealData: boolean;
    isDelayed: boolean;
    delayMinutes: number;
    hasGeminiKey: boolean;
  }> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Ayarlar alınamadı.');
    return res.json();
  },

  async updateSettings(mode: 'REAL' | 'DEMO'): Promise<any> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    if (!res.ok) throw new Error('Ayar güncellenemedi.');
    return res.json();
  }
};
