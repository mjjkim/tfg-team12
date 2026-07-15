'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSpeech } from '@/hooks/use-speech';
import { playSonificationTone } from '@/lib/audio-engine';
import { formatDateLabel, formatPrice, priceToFrequency } from '@/lib/formatters';
import type { DailyCandle } from '@/types/analysis';

interface HistoryChartInteractionProps {
  candles: DailyCandle[];
  onTap?: () => void;
}

export function HistoryChartInteraction({ candles, onTap }: HistoryChartInteractionProps) {
  const scrubbingRef = useRef(false);
  const movedRef = useRef(false);
  const startXRef = useRef(0);
  const lastToneIndexRef = useRef<number | null>(null);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const { speak } = useSpeech();

  const priceRange = useMemo(() => {
    if (candles.length === 0) return { min: 0, max: 1 };
    const closes = candles.map((candle) => candle.close);
    return { min: Math.min(...closes), max: Math.max(...closes) };
  }, [candles]);

  const getIndex = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(rect.width, 1)));
    return Math.round(ratio * Math.max(0, candles.length - 1));
  };

  const playAt = (index: number) => {
    if (index < 0 || index >= candles.length || lastToneIndexRef.current === index) return;

    lastToneIndexRef.current = index;
    const frequency = priceToFrequency(candles[index].close, priceRange.min, priceRange.max);
    void playSonificationTone(frequency, 90);
    setScrubIndex(index);
  };

  const announceAt = (index: number) => {
    if (index < 0 || index >= candles.length) return;
    const candle = candles[index];
    void speak(`${formatDateLabel(candle.time)}, ${formatPrice(candle.close)}`);
  };

  useEffect(() => {
    setScrubIndex(null);
    lastToneIndexRef.current = null;
  }, [candles]);

  const valueText =
    scrubIndex !== null && scrubIndex < candles.length
      ? `${formatDateLabel(candles[scrubIndex].time)}, ${formatPrice(candles[scrubIndex].close)}`
      : '좌우 방향키 또는 드래그로 차트 시점을 탐색하세요.';

  return (
    <div
      className="absolute inset-0 cursor-ew-resize touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00ecfc]"
      role="slider"
      tabIndex={0}
      aria-label="과거 차트 시점 탐색"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, candles.length - 1)}
      aria-valuenow={scrubIndex ?? 0}
      aria-valuetext={valueText}
      onPointerDown={(event) => {
        if (candles.length === 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        scrubbingRef.current = true;
        movedRef.current = false;
        startXRef.current = event.clientX;
        lastToneIndexRef.current = null;
        playAt(getIndex(event.clientX, event.currentTarget));
      }}
      onPointerMove={(event) => {
        if (!scrubbingRef.current) return;
        event.preventDefault();
        if (Math.abs(event.clientX - startXRef.current) >= 2) movedRef.current = true;
        playAt(getIndex(event.clientX, event.currentTarget));
      }}
      onPointerUp={(event) => {
        if (!scrubbingRef.current) return;
        scrubbingRef.current = false;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        if (movedRef.current) announceAt(getIndex(event.clientX, event.currentTarget));
        else onTap?.();
      }}
      onPointerCancel={() => {
        scrubbingRef.current = false;
      }}
      onKeyDown={(event) => {
        if (candles.length === 0) return;

        const current = scrubIndex ?? 0;
        let next = current;
        if (event.key === 'ArrowRight') next = Math.min(candles.length - 1, current + 1);
        else if (event.key === 'ArrowLeft') next = Math.max(0, current - 1);
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = candles.length - 1;
        else return;

        event.preventDefault();
        lastToneIndexRef.current = null;
        playAt(next);
        announceAt(next);
      }}
    />
  );
}
