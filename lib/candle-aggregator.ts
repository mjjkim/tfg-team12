import type { DemoTick } from '@/types/analysis';

export interface AggregatedLiveCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function aggregateTicksToCandles(
  ticks: DemoTick[],
  candleDurationSec: number,
  _startTimestamp = 0
): AggregatedLiveCandle[] {
  if (ticks.length === 0 || candleDurationSec <= 0) {
    return [];
  }

  const sorted = [...ticks].sort((a, b) => a.timestamp - b.timestamp);
  const candles: AggregatedLiveCandle[] = [];

  let current: AggregatedLiveCandle | null = null;
  let tickIndexInCandle = 0;

  for (const tick of sorted) {
    if (!current || tickIndexInCandle >= candleDurationSec) {
      if (current) {
        candles.push(current);
      }
      current = {
        time: Math.floor((tick.timestamp - (tick.timestamp % 1000)) / 1000),
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume
      };
      tickIndexInCandle = 1;
      continue;
    }

    current.close = tick.price;
    current.high = Math.max(current.high, tick.price);
    current.low = Math.min(current.low, tick.price);
    current.volume += tick.volume;
    tickIndexInCandle += 1;
  }

  if (current) {
    candles.push(current);
  }

  return candles;
}
