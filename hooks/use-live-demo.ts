import { useEffect, useMemo, useRef, useState } from 'react';
import type { Stock } from '@/types/stock';
import { DEMO_INTERVALS } from '@/lib/stocks';
import { calculateChangeBand, startTrendTone, stopTrendTone } from '@/lib/audio-engine';
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

const MIN_TONE_CHANGE_RATE = 0.0002;

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
    tickCount: 0
  });

  const onCandleStartRef = useRef(onCandleStart);
  const onChangeToneRef = useRef(onChangeTone);

  onCandleStartRef.current = onCandleStart;
  onChangeToneRef.current = onChangeTone;

  const intervalSec = useMemo(() => DEMO_INTERVALS[interval], [interval]);

  useEffect(() => {
    contextRef.current = {
      candles: [],
      active: null,
      tickCount: 0
    };
    setState(initialState(stock?.demoBasePrice ?? 0));
    stopTrendTone();
  }, [stock?.ticker]);

  useEffect(() => {
    if (!enabled || !stock) {
      setState((prev) => ({ ...prev, isRunning: false }));
      stopTrendTone();
      return;
    }

    const seed = makeLiveTickSeed(stock.ticker, interval);
    const generator = createLiveTickGenerator(seed, stock.demoBasePrice, stock.tickSize);
    let active = true;
    let lastTickSec = Math.floor(Date.now() / 1000);

    const getTickSecond = (timestamp: number) => {
      const sec = Math.floor(timestamp / 1000);
      if (sec <= lastTickSec) {
        lastTickSec += 1;
        return lastTickSec;
      }
      lastTickSec = sec;
      return sec;
    };

    const update = () => {
      if (!active) return;

      const tick: DemoTick = generator.next(Date.now());
      const ctx = contextRef.current;
      const tickSec = getTickSecond(tick.timestamp);

      if (!ctx.active || ctx.tickCount >= intervalSec) {
        if (ctx.active) {
          ctx.candles.push({ ...ctx.active });
        }

        ctx.active = {
          time: tickSec,
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.volume
        };
        ctx.tickCount = 1;
        onCandleStartRef.current({ stockName: stock.name, interval, startPrice: tick.price });
      } else {
        ctx.active.close = tick.price;
        ctx.active.high = Math.max(ctx.active.high, tick.price);
        ctx.active.low = Math.min(ctx.active.low, tick.price);
        ctx.active.volume += tick.volume;
        ctx.tickCount += 1;
      }

      const open = ctx.active.open;
      const changeRate = ((tick.price - open) / open) * 100;
      const absChangeRate = Math.abs(changeRate);
      const rawBand = calculateChangeBand(changeRate);
      const direction = changeRate > 0 ? 'up' : changeRate < 0 ? 'down' : 'flat';
      const shouldPlayTone = direction !== 'flat' && absChangeRate >= MIN_TONE_CHANGE_RATE;

      if (shouldPlayTone) {
        const toneBand = Math.max(1, rawBand);
        onChangeToneRef.current({ direction, band: toneBand });
        startTrendTone(direction, toneBand, open, tick.price);
      } else {
        stopTrendTone();
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
      update();
    }, 1000);
    update();

    return () => {
      active = false;
      clearInterval(id);
      stopTrendTone();
    };
  }, [enabled, stock?.ticker, interval, intervalSec, stock?.name]);

  return state;
}

