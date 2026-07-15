'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, type LineData, type UTCTimestamp } from 'lightweight-charts';
import type { DailyCandle, TimeSeriesAnalysis } from '@/types/analysis';
import { formatDateLabel, formatPrice, formatVolume, priceToFrequency } from '@/lib/formatters';
import { playSonificationTone } from '@/lib/audio-engine';
import { useSpeech } from '@/hooks/use-speech';

interface HistoryChartScreenProps {
  stockName: string;
  from: string;
  to: string;
  candles: DailyCandle[];
  analysis: TimeSeriesAnalysis;
  playbackIndex: number | null;
  isPlaying: boolean;
  onTap?: () => void;
}

export default function HistoryChartScreen({
  stockName,
  from,
  to,
  candles,
  analysis,
  playbackIndex,
  isPlaying,
  onTap
}: HistoryChartScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const lineRef = useRef<any>(null);

  const { speak } = useSpeech();

  // 스크럽(능동 탐색) 상태 — 손가락/방향키가 가리키는 현재 시점
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const scrubbingRef = useRef(false);
  const movedRef = useRef(false);
  const startXRef = useRef(0);
  const lastToneIndexRef = useRef<number | null>(null);

  const priceRange = useMemo(() => {
    if (candles.length === 0) return { min: 0, max: 1 };
    const closes = candles.map((c) => c.close);
    return { min: Math.min(...closes), max: Math.max(...closes) };
  }, [candles]);

  const indexFromClientX = (clientX: number, el: HTMLElement): number => {
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(rect.width, 1)));
    return Math.round(ratio * Math.max(0, candles.length - 1));
  };

  // 시점의 가격을 소리로 (연속 스크럽 중 인덱스 바뀔 때만 재생 → 소음 방지)
  const playAt = (index: number) => {
    if (index < 0 || index >= candles.length) return;
    if (lastToneIndexRef.current === index) return;
    lastToneIndexRef.current = index;
    const freq = priceToFrequency(candles[index].close, priceRange.min, priceRange.max);
    void playSonificationTone(freq, 90);
    setScrubIndex(index);
  };

  // 멈춘 지점의 값을 음성으로 읽어줌 (speech-based mark)
  const announceAt = (index: number) => {
    if (index < 0 || index >= candles.length) return;
    const c = candles[index];
    void speak(`${formatDateLabel(c.time)}, ${formatPrice(c.close)}`);
  };

  // ── 포인터 스크럽: 누른 채 좌우로 훑기 ──────────────────────
  const onOverlayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (candles.length === 0) return;
    e.stopPropagation(); // 차트 조작 중엔 main의 멀티탭 카운트로 흘러가지 않게
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubbingRef.current = true;
    movedRef.current = false;
    startXRef.current = e.clientX;
    lastToneIndexRef.current = null;
  };

  const onOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    // 임계값 미만 이동은 탭으로 간주(드래그와 탭 구분)
    if (!movedRef.current && Math.abs(e.clientX - startXRef.current) < 6) return;
    movedRef.current = true;
    playAt(indexFromClientX(e.clientX, e.currentTarget));
  };

  const onOverlayPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (movedRef.current) {
      // 스크럽이었으면 멈춘 지점 값 음성
      announceAt(indexFromClientX(e.clientX, e.currentTarget));
    } else {
      // 이동 없는 탭이면 기존 멀티탭 동작 유지(자동재생/질문 플로우)
      onTap?.();
    }
  };

  const onOverlayPointerCancel = () => {
    scrubbingRef.current = false;
  };

  // ── 방향키 탐색: 스크린리더/키보드 사용자용(실제 타깃 사용자) ──
  const onOverlayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (candles.length === 0) return;
    const cur = scrubIndex ?? 0;
    let next = cur;
    if (e.key === 'ArrowRight') next = Math.min(candles.length - 1, cur + 1);
    else if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = candles.length - 1;
    else return;
    e.preventDefault();
    lastToneIndexRef.current = null;
    playAt(next);
    announceAt(next);
  };

  const valueText =
    scrubIndex !== null && scrubIndex >= 0 && scrubIndex < candles.length
      ? `${formatDateLabel(candles[scrubIndex].time)}, ${formatPrice(candles[scrubIndex].close)}`
      : '차트를 좌우로 훑거나 방향키로 시점을 탐색하세요';

  // 새 기간 데이터가 오면 스크럽 위치 초기화
  useEffect(() => {
    setScrubIndex(null);
    lastToneIndexRef.current = null;
  }, [candles]);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const chart = createChart(containerRef.current, {
      height: 320,
      rightPriceScale: { borderColor: '#334155', scaleMargins: { top: 0.1, bottom: 0.2 } },
      layout: {
        background: { color: '#0b1326' },
        textColor: '#e8eefc'
      },
      grid: {
        horzLines: { color: '#1e293b' },
        vertLines: { color: '#1e293b' }
      }
    });

    const series = chart.addLineSeries({
      color: '#60a5fa',
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: true,
      priceLineVisible: true
    });

    chartRef.current = chart;
    lineRef.current = series;

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!lineRef.current) return;

    const points: LineData<UTCTimestamp>[] = candles
      .map((c) => ({
        time: c.time as unknown as UTCTimestamp,
        value: c.close
      }))
      .sort((a, b) => Number(a.time) - Number(b.time));

    lineRef.current.setData(points);

    if (points.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles]);

  useEffect(() => {
    if (!lineRef.current) return;
    // 스크럽 중이면 스크럽 위치를, 아니면 기존 재생 위치를 표시
    const effIndex = scrubIndex !== null ? scrubIndex : playbackIndex;
    const scrubbing = scrubIndex !== null;
    const marker =
      effIndex !== null && effIndex >= 0 && effIndex < candles.length
        ? {
            time: candles[effIndex].time as unknown as UTCTimestamp,
            position: 'inBar' as const,
            shape: scrubbing || isPlaying ? ('circle' as const) : ('arrowUp' as const),
            color: scrubbing ? '#22d3ee' : isPlaying ? '#f59e0b' : '#34d399',
            text: scrubbing ? '탐색' : isPlaying ? '재생 중' : '현재'
          }
        : null;

    if (marker) {
      lineRef.current.setMarkers([marker]);
    } else {
      lineRef.current.setMarkers([]);
    }
  }, [candles, isPlaying, playbackIndex, scrubIndex]);

  return (
    <main
      className="screen-root"
      aria-label="과거 차트 화면"
      role="button"
      tabIndex={0}
      onPointerDown={onTap}
    >
      <header className="card">
        <div className="text-xs status-pill inline-block">과거 차트</div>
        <h1 className="text-2xl font-bold mt-2">{stockName} 데모 차트</h1>
        <p className="text-sm mt-2">기간: {formatDateLabel(from)} ~ {formatDateLabel(to)}</p>
        <p className="text-xs mt-1">데모용 합성 데이터 · 실제 과거가 아닙니다.</p>
      </header>

      <section className="card">
        <div style={{ position: 'relative' }}>
          <div
            ref={containerRef}
            className="chart-wrap h-[320px]"
            role="img"
            aria-label="과거 차트"
          />
          {/* 능동 탐색 오버레이 — 손가락 스크럽 + 방향키 */}
          <div
            className="scrub-overlay"
            style={{ position: 'absolute', inset: 0, cursor: 'ew-resize', touchAction: 'none' }}
            role="slider"
            tabIndex={0}
            aria-label="차트 시점 탐색 슬라이더. 좌우로 훑거나 방향키로 이동하세요."
            aria-valuemin={0}
            aria-valuemax={Math.max(0, candles.length - 1)}
            aria-valuenow={scrubIndex ?? 0}
            aria-valuetext={valueText}
            onPointerDown={onOverlayPointerDown}
            onPointerMove={onOverlayPointerMove}
            onPointerUp={onOverlayPointerUp}
            onPointerCancel={onOverlayPointerCancel}
            onKeyDown={onOverlayKeyDown}
          />
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">핵심 수치</h2>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
          <div>
            <p className="text-slate-300">시작가</p>
            <p className="font-semibold">{formatPrice(analysis.summary.startPrice)}</p>
          </div>
          <div>
            <p className="text-slate-300">종가</p>
            <p className="font-semibold">{formatPrice(analysis.summary.endPrice)}</p>
          </div>
          <div>
            <p className="text-slate-300">전체변화율</p>
            <p className="font-semibold">{analysis.summary.totalReturnPct.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-slate-300">평균거래량</p>
            <p className="font-semibold">{formatVolume(analysis.summary.averageVolume)}</p>
          </div>
          <div>
            <p className="text-slate-300">최고가</p>
            <p className="font-semibold">{formatPrice(analysis.summary.highestPrice)}</p>
            <p className="text-xs">{formatDateLabel(analysis.summary.highestDate)}</p>
          </div>
          <div>
            <p className="text-slate-300">최저가</p>
            <p className="font-semibold">{formatPrice(analysis.summary.lowestPrice)}</p>
            <p className="text-xs">{formatDateLabel(analysis.summary.lowestDate)}</p>
          </div>
          <div>
            <p className="text-slate-300">변동성</p>
            <p className="font-semibold">{analysis.summary.volatilityPct.toFixed(2)}%</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">분석 및 인터랙션</h2>
        <p className="text-sm mt-2">
          손가락으로 차트를 좌우로 훑으면 그 시점의 가격이 소리로 들리고, 멈추면 값을 읽어줍니다. (방향키·Home·End로도 탐색)
        </p>
        <p className="text-sm mt-1">첫 두 번 탭: 전체 흐름 자동 재생 + 통계 설명 · 이후 두 번 탭: 데이터 기반 질문</p>
      </section>
    </main>
  );
}
