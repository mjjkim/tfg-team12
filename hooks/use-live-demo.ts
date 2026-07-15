import { useEffect, useMemo, useRef, useState } from 'react';
import type { Stock } from '@/types/stock';
import { DEMO_INTERVALS } from '@/lib/stocks';
import { calculateChangeBand, playTrendTone } from '@/lib/audio-engine';
import { createLiveTickGenerator, makeLiveTickSeed } from '@/lib/live-tick-generator';
import type { DemoTick } from '@/types/analysis';

export interface LiveCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiveDemoState {
  candles: LiveCandle[];
  currentPrice: number;
  candleProgress: number;
  candleStartPrice: number;
  candleVolume: number;
  currentCandle: LiveCandle | null;
  changeRate: number;
  isRunning: boolean;
}

const initialState = (price: number): LiveDemoState => ({
  candles: [],
  currentPrice: price,
  candleProgress: 0,
  candleStartPrice: price,
  candleVolume: 0,
  currentCandle: null,
  changeRate: 0,
  isRunning: false
});

export function useLiveDemo({
  stock,
  interval,
  enabled,
  onCandleStart,
  onChangeTone
}: {
  stock: Stock | null;
  interval: 1 | 3 | 5;
  enabled: boolean;
  onCandleStart: (payload: { stockName: string; interval: number; startPrice: number }) => void;
  onChangeTone: (payload: { direction: 'up' | 'down' | 'flat'; band: number }) => void;
}): LiveDemoState {
  const [state, setState] = useState<LiveDemoState>(() => initialState(stock?.demoBasePrice ?? 0));

  const contextRef = useRef({
    candles: [] as LiveCandle[],
    active: null as LiveCandle | null,
    tickCount: 0,
    lastDirection: 'flat' as 'up' | 'down' | 'flat',
    lastBand: 0,
    lastCueTime: 0
  });

  const intervalSec = useMemo(() => DEMO_INTERVALS[interval], [interval]);

  useEffect(() => {
    contextRef.current = {
      candles: [],
      active: null,
      tickCount: 0,
      lastDirection: 'flat',
      lastBand: 0,
      lastCueTime: 0
    };
    setState(initialState(stock?.demoBasePrice ?? 0));
  }, [stock?.ticker]);

  useEffect(() => {
    if (!enabled || !stock) {
      setState((prev) => ({ ...prev, isRunning: false }));
      return;
    }

    const seed = makeLiveTickSeed(stock.ticker, interval);
    const generator = createLiveTickGenerator(seed, stock.demoBasePrice, stock.tickSize);
    let active = true;

    const update = async () => {
      if (!active) return;

      const tick: DemoTick = generator.next(Date.now());
      const ctx = contextRef.current;

      if (!ctx.active || ctx.tickCount >= intervalSec) {
        if (ctx.active) {
          ctx.candles.push({ ...ctx.active });
        }

        ctx.active = {
          time: Math.floor(tick.timestamp / 1000),
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.volume
        };
        ctx.tickCount = 1;
        ctx.lastDirection = 'flat';
        ctx.lastBand = 0;
        onCandleStart({ stockName: stock.name, interval, startPrice: tick.price });
      } else {
        ctx.active.close = tick.price;
        ctx.active.high = Math.max(ctx.active.high, tick.price);
        ctx.active.low = Math.min(ctx.active.low, tick.price);
        ctx.active.volume += tick.volume;
        ctx.tickCount += 1;
      }

      const open = ctx.active.open;
      const changeRate = ((tick.price - open) / open) * 100;
      const band = calculateChangeBand(changeRate);
      const direction = changeRate > 0 ? 'up' : changeRate < 0 ? 'down' : 'flat';
      const now = Date.now();

      if (direction !== 'flat' && (direction !== ctx.lastDirection || band !== ctx.lastBand) && band > 0 && now - ctx.lastCueTime > 1200) {
        ctx.lastDirection = direction;
        ctx.lastBand = band;
        ctx.lastCueTime = now;
        onChangeTone({ direction, band });
        playTrendTone(direction, band);
      }
      if (band === 0) {
        ctx.lastDirection = 'flat';
        ctx.lastBand = 0;
      }

      setState({
        candles: [...ctx.candles],
        currentPrice: tick.price,
        candleProgress: Math.min(100, Math.round((ctx.tickCount / intervalSec) * 100)),
        candleStartPrice: open,
        candleVolume: ctx.active.volume,
        currentCandle: ctx.active ? { ...ctx.active } : null,
        changeRate,
        isRunning: true
      });
    };

    const id = window.setInterval(() => {
      void update();
    }, 1000);
    void update();

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [enabled, stock?.ticker, interval, intervalSec, onCandleStart, onChangeTone]);

  return state;
}
