import { createSeededRandom, makeSeedFromText } from './seeded-random';
import type { DemoTick } from '@/types/analysis';

function coerceToTick(price: number, tickSize: number): number {
  return Math.max(tickSize, Math.round(price / tickSize) * tickSize);
}

export function createLiveTickGenerator(seed: number, basePrice: number, tickSize: number) {
  const rng = createSeededRandom(seed);
  let price = coerceToTick(basePrice, tickSize);
  let directionHold = 0;
  let direction: -1 | 0 | 1 = 0;

  return {
    next(timestamp: number): DemoTick {
      if (directionHold <= 0) {
        const v = rng();
        direction = v < 0.43 ? -1 : v > 0.86 ? 1 : 0;
        directionHold = 8 + Math.floor(rng() * 26);
      }
      directionHold -= 1;

      const drift = direction === 1 ? 0.0015 : direction === -1 ? -0.0015 : 0;
      const noise = (rng() - 0.5) * 0.0025;
      const shock = rng() < 0.08 ? (rng() < 0.5 ? -1 : 1) * (0.004 + rng() * 0.018) : 0;
      const movement = drift + noise + shock;
      const candidate = price * (1 + movement);
      let nextPrice = coerceToTick(candidate, tickSize);
      if (nextPrice === price) {
        const fallbackDir = movement === 0 ? (rng() < 0.5 ? 1 : -1) : movement > 0 ? 1 : -1;
        nextPrice = Math.max(tickSize, price + fallbackDir * tickSize);
      }

      const absMove = Math.abs(movement);
      const volumeBase = tickSize >= 100 ? 2500 : 1800;
      const volume = Math.max(100, Math.round(volumeBase * (1 + absMove * 1200 + (rng() - 0.5) * 0.4)));
      price = nextPrice;
      return { timestamp, price: nextPrice, volume };
    }
  };
}

export function makeLiveTickSeed(ticker: string, intervalMinutes: number): number {
  return makeSeedFromText(`${ticker}-live-${intervalMinutes}`);
}
