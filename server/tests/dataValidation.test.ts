import { MarketDataValidator, CandleRecord } from '../validation/dataQualityValidator.js';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  calculateATR
} from '../indicators/technicalEngine.js';
import { InstrumentUniverseService } from '../services/instrumentUniverseService.js';

/**
 * Unit Test Suite for FAZ 1 Data Quality and Deterministic Mathematical Integrity
 */
export function runUnitTests(): { allPassed: boolean; testsCount: number; results: { name: string; passed: boolean; message: string }[] } {
  const results: { name: string; passed: boolean; message: string }[] = [];

  // Test 1: High/Low Integrity Correction Check
  try {
    const rawCandles: CandleRecord[] = [
      {
        symbol: 'THYAO',
        provider: 'BIST_FEED',
        instrumentId: 'TRY_THYAO',
        candleStart: '2026-10-20T00:00:00Z',
        candleEnd: '2026-10-20T23:59:59Z',
        open: 300,
        high: 290, // Defective: high < open
        low: 310,  // Defective: low > open
        close: 305,
        volume: 100000,
        providerTimestamp: '2026-10-20T18:15:00Z',
        receivedAt: '2026-10-20T18:16:00Z',
        timeframe: '1d',
        validationStatus: 'VALID'
      }
    ];

    const { validated } = MarketDataValidator.validateCandles(rawCandles, 'THYAO');
    const c = validated[0];
    const passed = c.high >= 305 && c.low <= 300 && c.validationStatus === 'CORRECTED';
    results.push({
      name: 'Veri Doğrulama: Yüksek/Düşük Mantıksızlık Düzeltmesi (High >= Open/Close, Low <= Open/Close)',
      passed,
      message: passed ? 'Başarılı: Hatalı high/low değerleri doğru sınırlara çekildi.' : 'Hata: High/Low düzeltilemedi.'
    });
  } catch (err: any) {
    results.push({ name: 'Veri Doğrulama Testi', passed: false, message: err.message });
  }

  // Test 2: Negative Volume Rejection / Correction
  try {
    const rawCandles: CandleRecord[] = [
      {
        symbol: 'GARAN',
        provider: 'BIST_FEED',
        instrumentId: 'TRY_GARAN',
        candleStart: '2026-10-21T00:00:00Z',
        candleEnd: '2026-10-21T23:59:59Z',
        open: 110,
        high: 112,
        low: 109,
        close: 111,
        volume: -50000, // Defective negative volume
        providerTimestamp: '2026-10-21T18:15:00Z',
        receivedAt: '2026-10-21T18:16:00Z',
        timeframe: '1d',
        validationStatus: 'VALID'
      }
    ];
    const { validated } = MarketDataValidator.validateCandles(rawCandles, 'GARAN');
    const passed = validated[0].volume >= 0 && validated[0].validationStatus === 'CORRECTED';
    results.push({
      name: 'Veri Doğrulama: Negatif Hacim Düzeltmesi',
      passed,
      message: passed ? 'Başarılı: Negatif hacim sıfırlandı ve kayıt korundu.' : 'Hata: Negatif hacim tespit edilemedi.'
    });
  } catch (err: any) {
    results.push({ name: 'Hacim Testi', passed: false, message: err.message });
  }

  // Test 3: SMA Deterministic Math
  try {
    const prices = [10, 20, 30, 40, 50];
    const sma3 = calculateSMA(prices, 3);
    // sma3 should be [null, null, 20, 30, 40]
    const passed = sma3[0] === null && sma3[1] === null && sma3[2] === 20 && sma3[3] === 30 && sma3[4] === 40;
    results.push({
      name: 'Deterministik İndikatör: SMA Basit Hareketli Ortalama',
      passed,
      message: passed ? 'Başarılı: SMA formülü tam matematiksel değer verdi.' : 'Hata: SMA değeri hatalı.'
    });
  } catch (err: any) {
    results.push({ name: 'SMA Testi', passed: false, message: err.message });
  }

  // Test 4: RSI Bounds Check (0 <= RSI <= 100)
  try {
    const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];
    const rsi = calculateRSI(prices, 14);
    const lastRsi = rsi[rsi.length - 1];
    const passed = lastRsi !== null && lastRsi >= 0 && lastRsi <= 100 && lastRsi > 90; // All gains should result in near 100
    results.push({
      name: 'Deterministik İndikatör: Wilder RSI Sınır ve Duyarlılık Testi',
      passed,
      message: passed ? `Başarılı: RSI sınırları içinde ve aşırı alımda (${lastRsi}).` : 'Hata: RSI sınırları aşıldı.'
    });
  } catch (err: any) {
    results.push({ name: 'RSI Testi', passed: false, message: err.message });
  }

  // Test 5: Bollinger Band Width Check (Upper >= Middle >= Lower)
  try {
    const prices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 110, 112, 111, 113, 115, 114, 116, 118, 117, 120, 122];
    const bb = calculateBollingerBands(prices, 20, 2);
    const lastIdx = prices.length - 1;
    const u = bb.upper[lastIdx];
    const m = bb.middle[lastIdx];
    const l = bb.lower[lastIdx];
    const passed = u !== null && m !== null && l !== null && u >= m && m >= l;
    results.push({
      name: 'Deterministik İndikatör: Bollinger Bantları Simetri ve Genişlik Testi',
      passed,
      message: passed ? `Başarılı: Üst (${u}) >= Orta (${m}) >= Alt (${l}).` : 'Hata: Bollinger bant geometrisi bozuk.'
    });
  } catch (err: any) {
    results.push({ name: 'Bollinger Testi', passed: false, message: err.message });
  }

  // Test 6: BIST Equity Universe Symbol Uniqueness (Duplicate Check)
  try {
    const { InstrumentUniverseService } = await import('../services/instrumentUniverseService.js');
    const universe = InstrumentUniverseService.getInstance();
    const stats = universe.getStatistics();
    const passed = stats.duplicateCount === 0 && stats.totalEquityCount > 250;
    results.push({
      name: 'BIST Hisse Evreni: Tekrarlanan Sembol Kontrolü (Deduplication Check)',
      passed,
      message: passed
        ? `Başarılı: Toplam ${stats.totalEquityCount} hisse arasında 0 adet mükerrer sembol tespit edildi.`
        : `Hata: ${stats.duplicateCount} adet mükerrer sembol bulundu.`
    });
  } catch (err: any) {
    results.push({ name: 'Evren Tekillik Testi', passed: false, message: err.message });
  }

  // Test 7: Non-Equity Leak Filter (No funds, warrants, certificates)
  try {
    const { InstrumentUniverseService } = await import('../services/instrumentUniverseService.js');
    const universe = InstrumentUniverseService.getInstance();
    const stats = universe.getStatistics();
    const passed = stats.nonEquityLeakCount === 0;
    results.push({
      name: 'BIST Hisse Evreni: Fon / Varant / Sertifika Sızıntı Filtresi',
      passed,
      message: passed
        ? 'Başarılı: Evrene hiçbir BYF, TEFAS fonu, varant veya sertifika sızmadı (0 sızıntı).'
        : `Hata: ${stats.nonEquityLeakCount} adet uygun olmayan enstrüman sızıntısı var.`
    });
  } catch (err: any) {
    results.push({ name: 'Sızıntı Filtre Testi', passed: false, message: err.message });
  }

  // Test 8: Market Segment Classification (Yıldız, Ana, Alt, PÖİP)
  try {
    const { InstrumentUniverseService } = await import('../services/instrumentUniverseService.js');
    const universe = InstrumentUniverseService.getInstance();
    const stats = universe.getStatistics();
    const passed = stats.yildizPazarCount > 0 && stats.anaPazarCount > 0 && stats.altPazarCount > 0;
    results.push({
      name: 'BIST Hisse Evreni: Pazar Sınıflandırma Doğrulaması (Yıldız / Ana / Alt)',
      passed,
      message: passed
        ? `Başarılı: Yıldız Pazar (${stats.yildizPazarCount}), Ana Pazar (${stats.anaPazarCount}), Alt Pazar (${stats.altPazarCount}), PÖİP (${stats.digerPazarCount}).`
        : 'Hata: Pazar dağılımında eksik segmentler var.'
    });
  } catch (err: any) {
    results.push({ name: 'Pazar Dağılım Testi', passed: false, message: err.message });
  }

  // Test 9: Decoupled Data Status (Listing != Data Availability)
  try {
    const { InstrumentUniverseService } = await import('../services/instrumentUniverseService.js');
    const universe = InstrumentUniverseService.getInstance();
    const stocks = universe.getAllInstruments();
    const hasValidStatuses = stocks.every(s =>
      ['VERIFIED', 'STALE', 'UNAVAILABLE', 'INVALID', 'NOT_TESTED'].includes(s.dataStatus) &&
      s.instrumentType === 'EQUITY'
    );
    results.push({
      name: 'BIST Hisse Evreni: Listeleme ve Veri Durumu Ayrışımı (Decoupled Status)',
      passed: hasValidStatuses,
      message: hasValidStatuses
        ? 'Başarılı: Tüm hisseler bağımsız veri durumuna (VERIFIED/UNAVAILABLE/NOT_TESTED) sahip; sahte veri üretilmiyor.'
        : 'Hata: Geçersiz veri durumu bulundu.'
    });
  } catch (err: any) {
    results.push({ name: 'Ayrışım Testi', passed: false, message: err.message });
  }

  const allPassed = results.every(r => r.passed);
  return { allPassed, testsCount: results.length, results };
}
