export type MarketSegment = 'YILDIZ_PAZAR' | 'ANA_PAZAR' | 'ALT_PAZAR' | 'POIP' | 'DIGER_PAZAR';
export type InstrumentDataStatus = 'VERIFIED' | 'STALE' | 'UNAVAILABLE' | 'INVALID' | 'NOT_TESTED';

export interface BISTStock {
  symbol: string;
  name: string;
  sector: string;
  subSector?: string;
  indices: string[];
  marketSegment: MarketSegment;
  instrumentType: 'EQUITY';
  dataStatus: InstrumentDataStatus;
  lastVerifiedAt?: string | null;
  unavailableReason?: string | null;
  lastPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  volumeTL: number;
  marketCapTL: number;
  pe?: number;
  pb?: number;
  dividendYield?: number;
  freeFloatRate?: number;
  status: 'ACTIVE' | 'HALTED' | 'SUSPENDED';
  updatedAt: string;
  isDelayed: boolean;
  delayMinutes: number;
}

export interface OHLCV {
  timestamp: number;
  dateStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isValidated?: boolean;
}

export interface MarketStatus {
  isOpen: boolean;
  sessionPhase: 'PRE_MARKET' | 'CONTINUOUS_AUCTION' | 'CLOSING_SESSION' | 'CLOSED';
  exchangeLocalTime: string;
  serverTime: string;
  providerName: string;
  delayMinutes: number;
  lastUpdated: string;
  bistIndices: {
    symbol: string;
    name: string;
    value: number;
    change: number;
    changePercent: number;
  }[];
}

export interface TechnicalIndicators {
  sma20: number | null;
  sma50: number | null;
  sma100: number | null;
  sma200: number | null;
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  rsi14: number | null;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  } | null;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    percentB: number;
  } | null;
  atr14: number | null;
  stochastic: {
    k: number;
    d: number;
  } | null;
  stochRsi: {
    k: number;
    d: number;
  } | null;
  adx14: {
    adx: number;
    pdi: number;
    ndi: number;
  } | null;
  parabolicSar: number | null;
  ichimoku: {
    tenkanSen: number;
    kijunSen: number;
    senkouSpanA: number;
    senkouSpanB: number;
    chikouSpan: number;
  } | null;
  cci20: number | null;
  williamsR14: number | null;
  roc12: number | null;
  obv: number | null;
  vwap: number | null;
  volumeSma20: number | null;
  volumeRatio: number | null;
}

export interface SupportResistanceZone {
  id: string;
  type: 'SUPPORT' | 'RESISTANCE';
  priceLow: number;
  priceHigh: number;
  pivotPrice: number;
  strengthScore: number;
  touchCount: number;
  lastTestedDate: string;
  distancePercent: number;
}

export interface ChartPattern {
  id: string;
  type: string;
  turkishName: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  status: 'FORMING' | 'CONFIRMED' | 'INVALIDATED';
  necklinePrice: number;
  targetPrice: number;
  stopLossPrice: number;
  confidenceScore: number;
  description: string;
  detectedIndex: number;
}

export interface ScenarioHorizon {
  days: 5 | 7 | 10;
  bullish: {
    probability: number;
    targetLow: number;
    targetHigh: number;
    expectedGainPct: number;
    triggerCondition: string;
    invalidationPrice: number;
  };
  base: {
    probability: number;
    corridorLow: number;
    corridorHigh: number;
    triggerCondition: string;
  };
  bearish: {
    probability: number;
    targetLow: number;
    targetHigh: number;
    expectedLossPct: number;
    triggerCondition: string;
    invalidationPrice: number;
  };
  volatilityEstimatePct: number;
  var95LossPct: number;
  riskRewardRatio: number;
}

export interface MultiTimeframeTrend {
  timeframe: '15m' | '1h' | '4h' | '1d' | '1w';
  label: string;
  trend: 'STRONG_BULL' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEAR';
  strengthScore: number;
  rsi: number;
  summary: string;
}

export interface BacktestParams {
  symbol: string;
  timeframe: '1d' | '4h' | '1h';
  strategy: 'SMA_CROSSOVER' | 'RSI_REVERSAL' | 'MACD_CROSSOVER' | 'BOLLINGER_BREAKOUT' | 'SUPERTREND_MOMENTUM';
  startDate?: string;
  endDate?: string;
  initialCapital: number;
  slippagePct: number;
  commissionPct: number;
  takeProfitPct?: number;
  stopLossPct?: number;
  parameters?: Record<string, number>;
}

export interface BacktestTrade {
  id: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  side: 'LONG';
  shares: number;
  pnlTL: number;
  returnPct: number;
  holdingDays: number;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL_EXIT' | 'END_OF_DATA';
}

export interface BacktestResult {
  symbol: string;
  strategyName: string;
  initialCapital: number;
  finalCapital: number;
  totalReturnPct: number;
  benchmarkReturnPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  averageTradePct: number;
  totalCommissionsTL: number;
  totalSlippageTL: number;
  equityCurve: { dateStr: string; portfolioValue: number; benchmarkValue: number }[];
  trades: BacktestTrade[];
}

export interface KAPDisclosure {
  id: string;
  symbol: string;
  companyTitle: string;
  publishDate: string;
  title: string;
  summary: string;
  category: string;
  isImportant: boolean;
}

export interface UniverseStatistics {
  totalEquityCount: number;
  yildizPazarCount: number;
  anaPazarCount: number;
  altPazarCount: number;
  digerPazarCount: number;
  verifiedCount: number;
  staleCount: number;
  unavailableCount: number;
  notTestedCount: number;
  duplicateCount: number;
  nonEquityLeakCount: number;
  lastUniverseUpdateTime: string;
  unavailableSymbols: { symbol: string; segment: string; reason: string; timestamp: string }[];
}

export interface DataHealthReport {
  totalBistUniverseCount: number;
  activeCount: number;
  haltedCount: number;
  providerName: string;
  providerStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  isDelayed: boolean;
  delayMinutes: number;
  lastSyncTime: string;
  cacheHitRatio: number;
  validationCheck: {
    passed: boolean;
    highLowIntegrity: boolean;
    nonNegativeVolume: boolean;
    chronologicalOrder: boolean;
    deduplicated: boolean;
    gapDetectedCount: number;
  };
  indexDistribution: {
    bist30: number;
    bist50: number;
    bist100: number;
    bistTum: number;
  };
  universe?: UniverseStatistics;
}

export interface TechnicalScoreWeights {
  trend: number;
  momentum: number;
  volume: number;
  volatility: number;
  structure: number;
}

export interface TechnicalScoreBreakdown {
  totalScore: number;
  isComputable: boolean;
  missingIndicators: string[];
  weights: TechnicalScoreWeights;
  components: {
    trend: { score: number; maxScore: number; details: string };
    momentum: { score: number; maxScore: number; details: string };
    volume: { score: number; maxScore: number; details: string };
    volatility: { score: number; maxScore: number; details: string };
    structure: { score: number; maxScore: number; details: string };
  };
  evaluationText: string;
  disclaimer: string;
}

export interface ScenarioCalibrationReport {
  modelStatus: 'EXPERIMENTAL' | 'CALIBRATED';
  sampleBars: number;
  historicalVolatilityAnnualized: number;
  dailyVolatilityPct: number;
  dailySkewness: number;
  dailyKurtosis: number;
  historicalCalibration: {
    bucket70PctTheoretical: number;
    bucket70PctRealized: number;
    brierScore: number;
    calibrationStatus: 'WELL_CALIBRATED' | 'ACCEPTABLE' | 'DRIFTING';
  };
  regime: 'LOW_VOL_TRENDING' | 'HIGH_VOL_CHOPPY' | 'BREAKOUT_MOMENTUM' | 'CONSOLIDATION';
  dataSufficiencyScore: number;
}

export interface ExtendedScenarioResult {
  symbol: string;
  stock: BISTStock;
  currentPrice: number;
  horizons: {
    horizon5d: ScenarioHorizon;
    horizon7d: ScenarioHorizon;
    horizon10d: ScenarioHorizon;
  };
  calibration: ScenarioCalibrationReport;
  keyLevels: SupportResistanceZone[];
  riskManagementDefaults: {
    defaultCapitalTL: number;
    defaultRiskPct: number;
    estimatedCommissionPct: number;
    estimatedSlippagePct: number;
  };
  provider: string;
  isDelayed: boolean;
  marketDataTime: string;
  analysisTime: string;
}

export interface ScreenerStockResult {
  stock: BISTStock;
  indicators: {
    rsi14: number | null;
    macdHistogram: number | null;
    macdStatus: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema20: number | null;
    ema50: number | null;
    bollingerBandwidth: number | null;
    volumeRatio: number | null;
    adx14: number | null;
    atr14: number | null;
  };
  trend: 'STRONG_BULL' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEAR';
  technicalScore: number;
  scoreBreakdown: TechnicalScoreBreakdown;
  nearestSupport: { price: number; distancePct: number } | null;
  nearestResistance: { price: number; distancePct: number } | null;
  activePatterns: string[];
  relativePerformanceVsXU100: number;
  dataQuality: {
    isRealData: boolean;
    isValidated: boolean;
    barCount: number;
  };
}

export interface WatchlistItem {
  symbol: string;
  addedAt: string;
  targetPrice?: number;
  stopPrice?: number;
  notes?: string;
}

export interface WatchlistFolder {
  id: string;
  name: string;
  createdAt: string;
  items: WatchlistItem[];
}

export interface AnalyticalReport {
  summary: string;
  trendEvaluation: string;
  scenarioAnalysis: string;
  riskAndInvalidationRules: string;
  keyLevelsSummary: string;
  disclaimer: string;
  isAiGenerated: boolean;
}

