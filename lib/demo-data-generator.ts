import type { Stock } from '@/types/stock';
import type { DailyCandle } from '@/types/analysis';
import { createSeededRandom, makeSeedFromText } from './seeded-random';
import type { MarketRegime } from '@/types/stock';

interface RegimeItem {
  startIndex: number;
  endIndex: number;
  type: MarketRegime;
  dailyDrift: number;
  volatility: number;
}

interface RegimesMap {
  [ticker: string]: RegimeItem[];
}

const BASE_VOLUME: Record<string, number> = {
  '005930': 42000,
  '000660': 24000,
  '005380': 25000,
  '035420': 20000,
  '035720': 32000
};

const REGIMES: RegimesMap = {
  '005930': [
    { startIndex: 0, endIndex: 60, type: 'UPTREND', dailyDrift: 0.0012, volatility: 0.9 },
    { startIndex: 61, endIndex: 130, type: 'SIDEWAYS', dailyDrift: 0.0001, volatility: 0.65 },
    { startIndex: 131, endIndex: 190, type: 'DOWNTREND', dailyDrift: -0.0011, volatility: 1.05 },
    { startIndex: 191, endIndex: 230, type: 'SIDEWAYS', dailyDrift: 0.00005, volatility: 0.6 },
    { startIndex: 231, endIndex: 260, type: 'UPTREND', dailyDrift: 0.0008, volatility: 0.9 }
  ],
  '000660': [
    { startIndex: 0, endIndex: 55, type: 'SIDEWAYS', dailyDrift: 0.00005, volatility: 0.7 },
    { startIndex: 56, endIndex: 120, type: 'UPTREND', dailyDrift: 0.0016, volatility: 1.2 },
    { startIndex: 121, endIndex: 175, type: 'UPTREND', dailyDrift: 0.0006, volatility: 0.8 },
    { startIndex: 176, endIndex: 220, type: 'DOWNTREND', dailyDrift: -0.0015, volatility: 1.2 },
    { startIndex: 221, endIndex: 260, type: 'SIDEWAYS', dailyDrift: 0.0001, volatility: 0.75 }
  ],
  '005380': [
    { startIndex: 0, endIndex: 75, type: 'DOWNTREND', dailyDrift: -0.0010, volatility: 0.95 },
    { startIndex: 76, endIndex: 130, type: 'UPTREND', dailyDrift: 0.0012, volatility: 0.85 },
    { startIndex: 131, endIndex: 190, type: 'SIDEWAYS', dailyDrift: 0.0001, volatility: 0.65 },
    { startIndex: 191, endIndex: 240, type: 'UPTREND', dailyDrift: 0.0014, volatility: 1.0 },
    { startIndex: 241, endIndex: 260, type: 'DOWNTREND', dailyDrift: -0.0008, volatility: 1.0 }
  ],
  '035420': [
    { startIndex: 0, endIndex: 68, type: 'UPTREND', dailyDrift: 0.0011, volatility: 1.05 },
    { startIndex: 69, endIndex: 130, type: 'SIDEWAYS', dailyDrift: 0.00005, volatility: 0.7 },
    { startIndex: 131, endIndex: 200, type: 'UPTREND', dailyDrift: 0.00095, volatility: 0.9 },
    { startIndex: 201, endIndex: 235, type: 'DOWNTREND', dailyDrift: -0.0014, volatility: 1.25 },
    { startIndex: 236, endIndex: 260, type: 'SIDEWAYS', dailyDrift: 0.00008, volatility: 0.7 }
  ],
  '035720': [
    { startIndex: 0, endIndex: 82, type: 'DOWNTREND', dailyDrift: -0.0011, volatility: 1.1 },
    { startIndex: 83, endIndex: 130, type: 'SIDEWAYS', dailyDrift: 0.0001, volatility: 0.7 },
    { startIndex: 131, endIndex: 185, type: 'UPTREND', dailyDrift: 0.0015, volatility: 1.15 },
    { startIndex: 186, endIndex: 225, type: 'DOWNTREND', dailyDrift: -0.0017, volatility: 1.1 },
    { startIndex: 226, endIndex: 260, type: 'UPTREND', dailyDrift: 0.0009, volatility: 0.9 }
  ]
};

function getTradingDays2025(): string[] {
  const start = new Date('2025-01-01T00:00:00');
  const end = new Date('2025-12-31T00:00:00');
  const days: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    const weekday = current.getDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function roundPrice(price: number, tick: number): number {
  return Math.max(tick, Math.round(price / tick) * tick);
}

function getRegime(regimes: RegimeItem[], index: number): RegimeItem {
  const matched = regimes.find((x) => index >= x.startIndex && index <= x.endIndex);
  return matched ?? regimes[regimes.length - 1];
}

const tradingDays = getTradingDays2025();
const dataCache = new Map<string, DailyCandle[]>();

export function generateDailyCandles(stock: Stock): DailyCandle[] {
  const cached = dataCache.get(stock.ticker);
  if (cached) return cached;

  const regimes = REGIMES[stock.ticker] || REGIMES['005930'];
  const baseRng = createSeededRandom(makeSeedFromText(`${stock.ticker}-${stock.name}`));
  let previousClose = stock.demoBasePrice;
  let directionHold = 0;
  let direction = 0;

  const candles: DailyCandle[] = [];

  for (let i = 0; i < tradingDays.length; i += 1) {
    const day = tradingDays[i];
    const regime = getRegime(regimes, i);

    if (directionHold <= 0) {
      const d = baseRng();
      direction = d < 0.43 ? -1 : d > 0.9 ? 1 : 0;
      directionHold = 12 + Math.floor(baseRng() * 18);
    }
    directionHold -= 1;

    const baseDrift = regime.dailyDrift + direction * 0.00065;
    const noise = (baseRng() - 0.5) * 0.0032 * regime.volatility;
    const shock = baseRng() < 0.055 ? (baseRng() < 0.5 ? -1 : 1) * (0.004 + baseRng() * 0.012) : 0;
    const rate = baseDrift + noise + shock;

    const open = previousClose;
    const close = roundPrice(Math.max(stock.tickSize, open * (1 + rate)), stock.tickSize);

    const body = Math.abs(close - open);
    const jitterBase = Math.max(stock.tickSize, body * 0.55 * (0.6 + baseRng() * 0.8));
    const intradayRange = 1 + baseRng() * 0.8;
    const highRaw = Math.max(open, close) + jitterBase * intradayRange;
    const lowRaw = Math.min(open, close) - jitterBase * intradayRange;
    const high = roundPrice(Math.max(highRaw, Math.max(open, close)), stock.tickSize);
    const low = roundPrice(Math.max(stock.tickSize, lowRaw), stock.tickSize);

    const volBase = BASE_VOLUME[stock.ticker] ?? 20000;
    const shockBonus = Math.max(0, Math.abs(shock)) * 160;
    const volNoise = (baseRng() - 0.5) * 0.3;
    const volume = Math.max(
      100,
      Math.round(volBase * (1 + shockBonus * 3 + Math.abs(rate) * 100 + volNoise))
    );

    const row: DailyCandle = {
      time: day,
      open,
      high: Math.max(open, close, high),
      low: Math.min(open, close, low),
      close,
      volume
    };

    previousClose = row.close;
    candles.push(row);
  }

  dataCache.set(stock.ticker, candles);
  return candles;
}

export function getDailyCandlesRange(stock: Stock, from: string, to: string): DailyCandle[] {
  const full = generateDailyCandles(stock);
  const start = from < to ? from : to;
  const end = from < to ? to : from;
  return full.filter((row) => row.time >= start && row.time <= end);
}
