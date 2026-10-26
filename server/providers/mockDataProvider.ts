import { BISTStock, OHLCV, MarketStatus, KAPDisclosure, DataHealthReport } from '../types.js';
import { MarketDataProvider } from './marketDataProvider.js';
import { BIST_COMPREHENSIVE_UNIVERSE } from './bistUniverseData.js';

/**
 * MockMarketDataProvider
 * EXPLICITLY TAGGED TEST / DEMO PROVIDER (RULE 1)
 * Used only when explicitly activated for test suites or offline sandbox mode.
 */
export class MockMarketDataProvider implements MarketDataProvider {
  name = '[DEMO / TEST KAYNAĞI] Simülasyon Test Sağlayıcısı';
  isRealData = false;
  isDelayed = false;
  delayMinutes = 0;

  private mockStocks: BISTStock[] = [];

  constructor() {
    this.mockStocks = BIST_COMPREHENSIVE_UNIVERSE.map(s => ({
      ...s,
      status: 'ACTIVE',
      isDelayed: false,
      delayMinutes: 0
    }));
  }

  async getStocks(): Promise<BISTStock[]> {
    return this.mockStocks;
  }

  async getStock(symbol: string): Promise<BISTStock | null> {
    return this.mockStocks.find(s => s.symbol === symbol.toUpperCase()) || null;
  }

  async getOHLCV(symbol: string, timeframe: string = '1d', limit: number = 100): Promise<OHLCV[]> {
    const stock = await this.getStock(symbol);
    const basePrice = stock?.lastPrice || 100;
    const candles: OHLCV[] = [];
    const now = Date.now();
    const dayMs = 86400000;

    let cur = basePrice * 0.85;
    for (let i = 0; i < limit; i++) {
      const change = (Math.random() - 0.48) * (cur * 0.03);
      cur += change;
      const open = cur - change * 0.5;
      const high = Math.max(open, cur) + Math.random() * (cur * 0.015);
      const low = Math.min(open, cur) - Math.random() * (cur * 0.015);
      const d = new Date(now - (limit - 1 - i) * dayMs);

      candles.push({
        timestamp: d.getTime(),
        dateStr: d.toISOString().substring(0, 10),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(cur.toFixed(2)),
        volume: Math.round(500000 + Math.random() * 2000000),
        isValidated: true
      });
    }
    return candles;
  }

  async getMarketStatus(): Promise<MarketStatus> {
    return {
      isOpen: true,
      sessionPhase: 'CONTINUOUS_AUCTION',
      exchangeLocalTime: '14:30 UTC+3 [DEMO TEST]',
      serverTime: new Date().toISOString(),
      providerName: this.name,
      delayMinutes: 0,
      lastUpdated: new Date().toISOString(),
      bistIndices: [
        { symbol: 'XU100', name: 'BIST 100 (Demo)', value: 9245.80, change: 112.40, changePercent: 1.23 },
        { symbol: 'XU030', name: 'BIST 30 (Demo)', value: 10120.50, change: 145.20, changePercent: 1.45 }
      ]
    };
  }

  async getKAPDisclosures(): Promise<KAPDisclosure[]> {
    return [
      {
        id: 'mock_kap_1',
        symbol: 'THYAO',
        companyTitle: 'TÜRK HAVA YOLLARI A.O.',
        publishDate: 'Test 10:00',
        title: '[DEMO TEST BİLDİRİMİ] Simüle Edilmiş KAP Açıklaması',
        summary: 'Bu bildirim MockMarketDataProvider tarafından test amaçlı üretilmiştir.',
        category: 'Özel Durum',
        isImportant: false
      }
    ];
  }

  async getHealthReport(): Promise<DataHealthReport> {
    return {
      totalBistUniverseCount: this.mockStocks.length,
      activeCount: this.mockStocks.length,
      haltedCount: 0,
      providerName: this.name,
      providerStatus: 'ONLINE',
      isDelayed: false,
      delayMinutes: 0,
      lastSyncTime: new Date().toISOString(),
      cacheHitRatio: 1.0,
      validationCheck: {
        passed: true,
        highLowIntegrity: true,
        nonNegativeVolume: true,
        chronologicalOrder: true,
        deduplicated: true,
        gapDetectedCount: 0
      },
      indexDistribution: {
        bist30: 30,
        bist50: 50,
        bist100: 100,
        bistTum: this.mockStocks.length
      }
    };
  }
}
