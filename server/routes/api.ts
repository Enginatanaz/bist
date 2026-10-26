import { Router, Request, Response } from 'express';
import { MarketDataProvider } from '../providers/marketDataProvider.js';
import { BISTRealDataProvider } from '../providers/bistRealDataProvider.js';
import { MockMarketDataProvider } from '../providers/mockDataProvider.js';
import {
  buildTechnicalIndicators,
  detectSupportResistanceZones,
  detectChartPatterns,
  calculateMultiTimeframeTrends,
  calculateScenarioHorizons,
  calculateScenarioHorizonsExtended,
  calculateTechnicalScore
} from '../indicators/technicalEngine.js';
import { runBacktest } from '../backtesting/backtestEngine.js';
import { generateAnalyticalReport } from '../services/geminiService.js';
import { runUnitTests } from '../tests/dataValidation.test.js';
import { ProviderHealthService } from '../services/providerHealthService.js';
import { BacktestParams, ScreenerStockResult, WatchlistFolder } from '../types.js';

export const apiRouter = Router();

// Watchlist store
let userWatchlists: WatchlistFolder[] = [
  {
    id: 'fav-1',
    name: 'Favorilerim',
    createdAt: new Date().toISOString(),
    items: [
      { symbol: 'THYAO', addedAt: new Date().toISOString(), targetPrice: 285.0, stopPrice: 248.0, notes: 'Ulaştırma lideri, direnç kırılımı bekleniyor' },
      { symbol: 'ASELS', addedAt: new Date().toISOString(), targetPrice: 375.0, stopPrice: 320.0, notes: 'Savunma sanayii sipariş hacmi güçlü' },
      { symbol: 'GARAN', addedAt: new Date().toISOString(), targetPrice: 145.0, stopPrice: 118.0, notes: 'Banka endeksi lokomotifi' },
    ]
  },
  {
    id: 'breakout-2',
    name: 'Kırılım & Momentum Adayları',
    createdAt: new Date().toISOString(),
    items: [
      { symbol: 'TUPRS', addedAt: new Date().toISOString(), targetPrice: 395.0, stopPrice: 350.0, notes: 'Rafineri marjları takibinde' },
      { symbol: 'KCHOL', addedAt: new Date().toISOString(), targetPrice: 210.0, stopPrice: 175.0, notes: 'Holding iskonto daralması' },
    ]
  },
  {
    id: 'bist30-3',
    name: 'BIST 30 Çekirdek',
    createdAt: new Date().toISOString(),
    items: [
      { symbol: 'AKBNK', addedAt: new Date().toISOString(), targetPrice: 68.0, stopPrice: 56.0, notes: 'Özsermaye kârlılığı yüksek' },
      { symbol: 'BIMAS', addedAt: new Date().toISOString(), targetPrice: 580.0, stopPrice: 490.0, notes: 'Defansif perakende gücü' },
    ]
  }
];

// Provider management
let currentProvider: MarketDataProvider = new BISTRealDataProvider();
let providerMode: 'REAL' | 'DEMO' = 'REAL';
const healthService = ProviderHealthService.getInstance();

export function getActiveProvider(): MarketDataProvider {
  return currentProvider;
}

// 1. Market Status
apiRouter.get('/market/status', async (_req: Request, res: Response) => {
  try {
    const status = await currentProvider.getMarketStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Piyasa durumu alınamadı.' });
  }
});

// 2. All Stocks List
apiRouter.get('/stocks', async (req: Request, res: Response) => {
  try {
    const { index, sector, search, marketSegment, dataStatus } = req.query;
    let stocks = await currentProvider.getStocks();

    if (marketSegment && typeof marketSegment === 'string' && marketSegment !== 'ALL') {
      stocks = stocks.filter(s => s.marketSegment === marketSegment);
    }
    if (dataStatus && typeof dataStatus === 'string' && dataStatus !== 'ALL') {
      stocks = stocks.filter(s => s.dataStatus === dataStatus);
    }
    if (index && typeof index === 'string' && index !== 'ALL') {
      stocks = stocks.filter(s => s.indices.includes(index));
    }
    if (sector && typeof sector === 'string' && sector !== 'ALL') {
      stocks = stocks.filter(s => s.sector === sector);
    }
    if (search && typeof search === 'string') {
      const q = search.toUpperCase();
      stocks = stocks.filter(s => s.symbol.includes(q) || s.name.toUpperCase().includes(q));
    }

    res.json(stocks);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Hisse listesi alınamadı.' });
  }
});

// 3. Single Stock Details
apiRouter.get('/stocks/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const stock = await currentProvider.getStock(symbol);
    if (!stock) {
      return res.status(404).json({ error: `Sembol bulunamadı: ${symbol}` });
    }
    res.json(stock);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Hisse verisi alınamadı.' });
  }
});

// 4. Historical OHLCV Candles
apiRouter.get('/stocks/:symbol/ohlcv', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const timeframe = (req.query.timeframe as string) || '1d';
    const limit = parseInt((req.query.limit as string) || '180', 10);

    const ohlcv = await currentProvider.getOHLCV(symbol, timeframe, limit);
    res.json({
      symbol: symbol.toUpperCase(),
      timeframe,
      count: ohlcv.length,
      provider: currentProvider.name,
      isDelayed: currentProvider.isDelayed,
      candles: ohlcv
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'OHLCV verisi alınamadı.' });
  }
});

// 5. Complete Technical Analysis
apiRouter.get('/stocks/:symbol/technical', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const timeframe = (req.query.timeframe as string) || '1d';
    const stock = await currentProvider.getStock(symbol);
    const ohlcv = await currentProvider.getOHLCV(symbol, timeframe, 180);

    if (!ohlcv || ohlcv.length < 20) {
      return res.status(400).json({ error: 'Teknik analiz için yeterli veri bulunamadı.' });
    }

    const indicators = buildTechnicalIndicators(ohlcv);
    const zones = detectSupportResistanceZones(ohlcv);
    const patterns = detectChartPatterns(ohlcv);
    const trends = calculateMultiTimeframeTrends(ohlcv);

    res.json({
      symbol: symbol.toUpperCase(),
      stock,
      timeframe,
      indicators,
      zones,
      patterns,
      trends,
      candleCount: ohlcv.length,
      lastCandleDate: ohlcv[ohlcv.length - 1].dateStr,
      provider: currentProvider.name,
      isDelayed: currentProvider.isDelayed
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Teknik analiz hesaplanamadı.' });
  }
});

// 6. 5, 7, 10 Days Scenario Modeling (FAZ 4)
apiRouter.get('/stocks/:symbol/scenarios', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const stock = await currentProvider.getStock(symbol);
    if (!stock) {
      return res.status(404).json({ error: `Sembol bulunamadı: ${symbol}` });
    }

    const ohlcv = await currentProvider.getOHLCV(symbol, '1d', 180);
    if (!ohlcv || ohlcv.length < 25) {
      return res.status(400).json({ error: 'Senaryo modellemesi için yeterli veri bulunamadı (En az 25 bar gereklidir).' });
    }

    const extended = calculateScenarioHorizonsExtended(ohlcv);
    const zones = detectSupportResistanceZones(ohlcv);

    res.json({
      symbol: symbol.toUpperCase(),
      stock,
      currentPrice: ohlcv[ohlcv.length - 1].close,
      horizons: extended.horizons,
      calibration: extended.calibration,
      keyLevels: zones.slice(0, 5),
      riskManagementDefaults: {
        defaultCapitalTL: 100000,
        defaultRiskPct: 1.0,
        estimatedCommissionPct: 0.15,
        estimatedSlippagePct: 0.10
      },
      provider: currentProvider.name,
      isDelayed: currentProvider.isDelayed,
      marketDataTime: ohlcv[ohlcv.length - 1].dateStr,
      analysisTime: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Senaryo hesaplanamadı.' });
  }
});

// 7. Gemini AI Analytical Report
apiRouter.post('/stocks/:symbol/ai-report', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const stock = await currentProvider.getStock(symbol);
    if (!stock) {
      return res.status(404).json({ error: 'Hisse bulunamadı.' });
    }

    const ohlcv = await currentProvider.getOHLCV(symbol, '1d', 180);
    const indicators = buildTechnicalIndicators(ohlcv);
    const zones = detectSupportResistanceZones(ohlcv);
    const patterns = detectChartPatterns(ohlcv);
    const trends = calculateMultiTimeframeTrends(ohlcv);
    const horizons = calculateScenarioHorizons(ohlcv);

    const report = await generateAnalyticalReport({
      stock,
      indicators,
      zones,
      patterns,
      trends,
      horizons
    });

    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Rapor üretilemedi.' });
  }
});

// 8. Backtest Strategy Execution
apiRouter.post('/backtest', async (req: Request, res: Response) => {
  try {
    const params: BacktestParams = req.body;
    if (!params.symbol || !params.strategy) {
      return res.status(400).json({ error: 'Sembol ve strateji seçimi zorunludur.' });
    }

    const ohlcv = await currentProvider.getOHLCV(params.symbol, params.timeframe || '1d', 250);
    const result = runBacktest(ohlcv, params);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Backtest çalıştırılamadı.' });
  }
});

// 9. Advanced Screener Multi-criteria Filter with AND/OR Logic and Presets (FAZ 3)
apiRouter.get('/screener', async (req: Request, res: Response) => {
  try {
    const {
      logic = 'AND',        // 'AND' | 'OR'
      preset,               // Preconfigured strategy templates
      marketSegment,       // 'YILDIZ_PAZAR', 'ANA_PAZAR', 'ALT_PAZAR', 'POIP', 'ALL'
      index,               // 'BIST 30', 'BIST 50', 'BIST 100', 'BIST TUM', 'ALL'
      sector,              // sector name or 'ALL'
      minPrice,
      maxPrice,
      minChange,
      maxChange,
      rsiFilter,           // 'OVERSOLD_30', 'OVERBOUGHT_70', 'BULLISH_50_70', 'ABOVE_50', 'BELOW_50'
      macdFilter,          // 'BULLISH_CROSS', 'BEARISH_CROSS', 'POSITIVE_HIST'
      smaFilter,           // 'ABOVE_SMA50', 'ABOVE_SMA200', 'GOLDEN_CROSS', 'EMA20_ABOVE_EMA50'
      volumeFilter,        // 'HIGH_VOLUME_1_2X', 'HIGH_VOLUME_1_5X', 'HIGH_VOLUME_2X'
      bollingerFilter,     // 'SQUEEZE', 'BREAKOUT_UP', 'BREAKOUT_DOWN'
      adxFilter,           // 'TRENDING_25', 'RANGING_20', 'STRONG_TREND_30'
      srProximity,         // 'NEAR_SUPPORT_2PCT', 'NEAR_RESISTANCE_2PCT'
      breakoutFilter,      // 'RESISTANCE_BREAK', 'SUPPORT_BREAK'
      patternFilter,       // 'DOUBLE_BOTTOM', 'DOUBLE_TOP', 'ASCENDING_TRIANGLE', 'BULL_FLAG'
      relPerformanceFilter,// 'OUTPERFORMING_XU100', 'UNDERPERFORMING_XU100'
      minScore,            // e.g. 60
      customWeights        // JSON string of TechnicalScoreWeights
    } = req.query;

    const isOrLogic = String(logic).toUpperCase() === 'OR';

    let parsedWeights = undefined;
    if (customWeights && typeof customWeights === 'string') {
      try {
        parsedWeights = JSON.parse(customWeights);
      } catch {
        // ignore JSON parse error
      }
    }

    const allStocks = await currentProvider.getStocks();
    const results: ScreenerStockResult[] = [];

    // Pre-filter candidate stocks to maintain high responsiveness and respect API rate limits
    let candidateStocks = allStocks;
    if (marketSegment && typeof marketSegment === 'string' && marketSegment !== 'ALL') {
      candidateStocks = candidateStocks.filter(s => s.marketSegment === marketSegment);
    }
    if (index && typeof index === 'string' && index !== 'ALL') {
      candidateStocks = candidateStocks.filter(s => s.indices.includes(index));
    }
    if (sector && typeof sector === 'string' && sector !== 'ALL') {
      candidateStocks = candidateStocks.filter(s => s.sector === sector);
    }
    if (minPrice) {
      const minP = parseFloat(minPrice as string);
      candidateStocks = candidateStocks.filter(s => s.lastPrice === 0 || s.lastPrice >= minP);
    }
    if (maxPrice) {
      const maxP = parseFloat(maxPrice as string);
      candidateStocks = candidateStocks.filter(s => s.lastPrice === 0 || s.lastPrice <= maxP);
    }
    if (minChange) {
      const minC = parseFloat(minChange as string);
      candidateStocks = candidateStocks.filter(s => s.changePercent >= minC);
    }
    if (maxChange) {
      const maxC = parseFloat(maxChange as string);
      candidateStocks = candidateStocks.filter(s => s.changePercent <= maxC);
    }

    // Process top candidates (up to 45 per screener execution) to ensure sub-2-second response time
    const stocksToScreen = candidateStocks.slice(0, 45);

    // Pre-calculate XU100 20-bar performance as benchmark
    let xu100Performance = 0.5;
    try {
      const xu100Bars = await currentProvider.getOHLCV('XU100', '1d', 30);
      if (xu100Bars.length >= 20) {
        const cNow = xu100Bars[xu100Bars.length - 1].close;
        const c20Ago = xu100Bars[xu100Bars.length - 20].close;
        xu100Performance = ((cNow - c20Ago) / c20Ago) * 100;
      }
    } catch {
      // default baseline
    }

    let missingCount = 0;

    for (const stock of stocksToScreen) {
      try {

        // Fetch verified daily candles
        const ohlcv = await currentProvider.getOHLCV(stock.symbol, '1d', 90);
        if (!ohlcv || ohlcv.length < 20) continue;

        const ind = buildTechnicalIndicators(ohlcv);
        const zones = detectSupportResistanceZones(ohlcv);
        const patterns = detectChartPatterns(ohlcv);
        const trends = calculateMultiTimeframeTrends(ohlcv);
        const scoreBreakdown = calculateTechnicalScore(ohlcv, parsedWeights);

        // Relative performance vs XU100 over last 20 bars
        const cNow = ohlcv[ohlcv.length - 1].close;
        const c20Ago = ohlcv[Math.max(0, ohlcv.length - 20)].close;
        const stock20Return = ((cNow - c20Ago) / c20Ago) * 100;
        const relPerf = Number((stock20Return - xu100Performance).toFixed(2));

        // Nearest S/R
        const nearestSup = zones.find(z => z.type === 'SUPPORT') || null;
        const nearestRes = zones.find(z => z.type === 'RESISTANCE') || null;

        // MACD Status
        let macdStatus: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        if (ind.macd) {
          if (ind.macd.histogram > 0 && ind.macd.macdLine > ind.macd.signalLine) macdStatus = 'BULLISH';
          else if (ind.macd.histogram < 0 && ind.macd.macdLine < ind.macd.signalLine) macdStatus = 'BEARISH';
        }

        // Check conditions
        const conditions: { passed: boolean; active: boolean }[] = [];

        // 1. Preset handling
        if (preset === 'RSI_50_EMA_BULL') {
          const pass = (ind.rsi14 !== null && ind.rsi14 >= 50) && (ind.ema20 !== null && ind.ema50 !== null && ind.ema20 > ind.ema50);
          conditions.push({ passed: pass, active: true });
        } else if (preset === 'VOLUME_RESISTANCE_BREAK') {
          const pass = (ind.volumeRatio !== null && ind.volumeRatio >= 1.5) && (nearestRes !== null && Math.abs(nearestRes.distancePercent) <= 2.0);
          conditions.push({ passed: pass, active: true });
        } else if (preset === 'BOLLINGER_SQUEEZE') {
          const pass = ind.bollinger !== null && ind.bollinger.bandwidth <= 6.0;
          conditions.push({ passed: pass, active: true });
        } else if (preset === 'GOLDEN_CROSS_ADX') {
          const pass = (ind.sma50 !== null && ind.sma200 !== null && ind.sma50 > ind.sma200) && (ind.adx14 !== null && ind.adx14.adx >= 22);
          conditions.push({ passed: pass, active: true });
        } else if (preset === 'OVERSOLD_REBOUND') {
          const pass = (ind.rsi14 !== null && ind.rsi14 <= 38) && (nearestSup !== null && Math.abs(nearestSup.distancePercent) <= 3.0);
          conditions.push({ passed: pass, active: true });
        } else if (preset === 'OUTPERFORMER_XU100') {
          const pass = relPerf > 0.0;
          conditions.push({ passed: pass, active: true });
        }

        // 2. RSI filter
        if (rsiFilter && rsiFilter !== 'ALL') {
          let pass = false;
          if (rsiFilter === 'OVERSOLD_30') pass = ind.rsi14 !== null && ind.rsi14 < 30;
          else if (rsiFilter === 'OVERBOUGHT_70') pass = ind.rsi14 !== null && ind.rsi14 > 70;
          else if (rsiFilter === 'BULLISH_50_70') pass = ind.rsi14 !== null && ind.rsi14 >= 50 && ind.rsi14 <= 70;
          else if (rsiFilter === 'ABOVE_50') pass = ind.rsi14 !== null && ind.rsi14 >= 50;
          else if (rsiFilter === 'BELOW_50') pass = ind.rsi14 !== null && ind.rsi14 < 50;
          conditions.push({ passed: pass, active: true });
        }

        // 3. MACD filter
        if (macdFilter && macdFilter !== 'ALL') {
          let pass = false;
          if (macdFilter === 'BULLISH_CROSS') pass = macdStatus === 'BULLISH';
          else if (macdFilter === 'BEARISH_CROSS') pass = macdStatus === 'BEARISH';
          else if (macdFilter === 'POSITIVE_HIST') pass = ind.macd !== null && ind.macd.histogram > 0;
          conditions.push({ passed: pass, active: true });
        }

        // 4. SMA / EMA filter
        if (smaFilter && smaFilter !== 'ALL') {
          let pass = false;
          if (smaFilter === 'ABOVE_SMA50') pass = ind.sma50 !== null && stock.lastPrice > ind.sma50;
          else if (smaFilter === 'ABOVE_SMA200') pass = ind.sma200 !== null && stock.lastPrice > ind.sma200;
          else if (smaFilter === 'GOLDEN_CROSS') pass = ind.sma50 !== null && ind.sma200 !== null && ind.sma50 > ind.sma200;
          else if (smaFilter === 'EMA20_ABOVE_EMA50') pass = ind.ema20 !== null && ind.ema50 !== null && ind.ema20 > ind.ema50;
          conditions.push({ passed: pass, active: true });
        }

        // 5. Volume filter
        if (volumeFilter && volumeFilter !== 'ALL') {
          let pass = false;
          if (volumeFilter === 'HIGH_VOLUME_1_2X') pass = ind.volumeRatio !== null && ind.volumeRatio >= 1.2;
          else if (volumeFilter === 'HIGH_VOLUME_1_5X') pass = ind.volumeRatio !== null && ind.volumeRatio >= 1.5;
          else if (volumeFilter === 'HIGH_VOLUME_2X') pass = ind.volumeRatio !== null && ind.volumeRatio >= 2.0;
          conditions.push({ passed: pass, active: true });
        }

        // 6. Bollinger filter
        if (bollingerFilter && bollingerFilter !== 'ALL') {
          let pass = false;
          if (bollingerFilter === 'SQUEEZE') pass = ind.bollinger !== null && ind.bollinger.bandwidth <= 6.0;
          else if (bollingerFilter === 'BREAKOUT_UP') pass = ind.bollinger !== null && stock.lastPrice >= ind.bollinger.upper;
          else if (bollingerFilter === 'BREAKOUT_DOWN') pass = ind.bollinger !== null && stock.lastPrice <= ind.bollinger.lower;
          conditions.push({ passed: pass, active: true });
        }

        // 7. ADX filter
        if (adxFilter && adxFilter !== 'ALL') {
          let pass = false;
          if (adxFilter === 'TRENDING_25') pass = ind.adx14 !== null && ind.adx14.adx >= 25;
          else if (adxFilter === 'RANGING_20') pass = ind.adx14 !== null && ind.adx14.adx < 20;
          else if (adxFilter === 'STRONG_TREND_30') pass = ind.adx14 !== null && ind.adx14.adx >= 30;
          conditions.push({ passed: pass, active: true });
        }

        // 8. Support / Resistance proximity
        if (srProximity && srProximity !== 'ALL') {
          let pass = false;
          if (srProximity === 'NEAR_SUPPORT_2PCT') pass = nearestSup !== null && Math.abs(nearestSup.distancePercent) <= 2.0;
          else if (srProximity === 'NEAR_RESISTANCE_2PCT') pass = nearestRes !== null && Math.abs(nearestRes.distancePercent) <= 2.0;
          conditions.push({ passed: pass, active: true });
        }

        // 9. Breakout filter
        if (breakoutFilter && breakoutFilter !== 'ALL') {
          let pass = false;
          if (breakoutFilter === 'RESISTANCE_BREAK') pass = nearestRes !== null && nearestRes.distancePercent >= 0 && nearestRes.distancePercent <= 1.0;
          else if (breakoutFilter === 'SUPPORT_BREAK') pass = nearestSup !== null && nearestSup.distancePercent <= 0 && nearestSup.distancePercent >= -1.0;
          conditions.push({ passed: pass, active: true });
        }

        // 10. Pattern filter
        if (patternFilter && patternFilter !== 'ALL') {
          const pass = patterns.some(p => p.type === patternFilter);
          conditions.push({ passed: pass, active: true });
        }

        // 11. Relative performance filter
        if (relPerformanceFilter && relPerformanceFilter !== 'ALL') {
          let pass = false;
          if (relPerformanceFilter === 'OUTPERFORMING_XU100') pass = relPerf > 0;
          else if (relPerformanceFilter === 'UNDERPERFORMING_XU100') pass = relPerf < 0;
          conditions.push({ passed: pass, active: true });
        }

        // 12. Minimum technical score
        if (minScore) {
          const threshold = parseFloat(minScore as string);
          const pass = scoreBreakdown.totalScore >= threshold;
          conditions.push({ passed: pass, active: true });
        }

        // Evaluate AND / OR logic
        let matched = true;
        if (conditions.length > 0) {
          if (isOrLogic) {
            matched = conditions.some(c => c.passed);
          } else {
            matched = conditions.every(c => c.passed);
          }
        }

        if (!matched) continue;

        const dailyTrend = trends.find(t => t.timeframe === '1d')?.trend || 'NEUTRAL';

        results.push({
          stock,
          indicators: {
            rsi14: ind.rsi14,
            macdHistogram: ind.macd?.histogram || null,
            macdStatus,
            sma20: ind.sma20,
            sma50: ind.sma50,
            sma200: ind.sma200,
            ema20: ind.ema20,
            ema50: ind.ema50,
            bollingerBandwidth: ind.bollinger?.bandwidth || null,
            volumeRatio: ind.volumeRatio,
            adx14: ind.adx14?.adx || null,
            atr14: ind.atr14
          },
          trend: dailyTrend,
          technicalScore: scoreBreakdown.totalScore,
          scoreBreakdown,
          nearestSupport: nearestSup ? { price: nearestSup.pivotPrice, distancePct: nearestSup.distancePercent } : null,
          nearestResistance: nearestRes ? { price: nearestRes.pivotPrice, distancePct: nearestRes.distancePercent } : null,
          activePatterns: patterns.map(p => p.turkishName),
          relativePerformanceVsXU100: relPerf,
          dataQuality: {
            isRealData: currentProvider.isRealData,
            isValidated: true,
            barCount: ohlcv.length
          }
        });
      } catch (stockErr) {
        // Individual stock error from provider: record as missing and continue screening
        missingCount++;
        continue;
      }
    }

    res.json({
      totalCount: results.length,
      screenedUniverseSize: stocksToScreen.length,
      totalUniverseSize: allStocks.length,
      cachedCount: stocksToScreen.length - missingCount,
      missingCount,
      logic: isOrLogic ? 'OR' : 'AND',
      results
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Tarama hatası oluştu.' });
  }
});


// 10. KAP Disclosures
apiRouter.get('/disclosures', async (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string;
    const items = await currentProvider.getKAPDisclosures(symbol);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'KAP bildirimleri alınamadı.' });
  }
});

// 11. Data Health & Provider Inventory
apiRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    const report = await currentProvider.getHealthReport();
    const metrics = healthService.getMetrics(
      currentProvider.name,
      currentProvider.isRealData,
      currentProvider.isDelayed,
      currentProvider.delayMinutes
    );
    res.json({ ...report, telemetry: metrics });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Sağlık raporu alınamadı.' });
  }
});

// 11.1 Run Automated Unit & Integrity Tests (FAZ 1 Requirement)
apiRouter.get('/tests/run', (_req: Request, res: Response) => {
  try {
    const testResults = runUnitTests();
    res.json(testResults);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Birim testleri çalıştırılamadı.' });
  }
});

// 12. Settings & Provider Switch
apiRouter.get('/settings', (_req: Request, res: Response) => {
  res.json({
    providerMode,
    providerName: currentProvider.name,
    isRealData: currentProvider.isRealData,
    isDelayed: currentProvider.isDelayed,
    delayMinutes: currentProvider.delayMinutes,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
  });
});

apiRouter.post('/settings', (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode === 'DEMO') {
    currentProvider = new MockMarketDataProvider();
    providerMode = 'DEMO';
  } else {
    currentProvider = new BISTRealDataProvider();
    providerMode = 'REAL';
  }

  res.json({
    success: true,
    providerMode,
    providerName: currentProvider.name,
    isRealData: currentProvider.isRealData
  });
});

// 13. Watchlists Management (FAZ 3.5)
apiRouter.get('/watchlist', (_req: Request, res: Response) => {
  res.json(userWatchlists);
});

apiRouter.post('/watchlist', (req: Request, res: Response) => {
  try {
    const { folders } = req.body;
    if (Array.isArray(folders)) {
      userWatchlists = folders;
      return res.json({ success: true, count: userWatchlists.length });
    }
    res.status(400).json({ error: 'Geçersiz izleme listesi verisi.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'İzleme listesi kaydedilemedi.' });
  }
});

