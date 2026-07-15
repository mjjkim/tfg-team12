'use client';

import { useEffect, useRef } from 'react';
import { createChart, type LineData, type UTCTimestamp } from 'lightweight-charts';
import type { DailyCandle, TimeSeriesAnalysis } from '@/types/analysis';
import { formatDateLabel, formatPrice, formatVolume } from '@/lib/formatters';

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
    const marker =
      playbackIndex !== null && playbackIndex >= 0 && playbackIndex < candles.length
        ? {
            time: candles[playbackIndex].time as unknown as UTCTimestamp,
            position: 'inBar' as const,
            shape: isPlaying ? 'circle' : 'arrowUp',
            color: isPlaying ? '#f59e0b' : '#34d399',
            text: isPlaying ? '재생 중' : '현재'
          }
        : null;

    if (marker) {
      lineRef.current.setMarkers([marker]);
    } else {
      lineRef.current.setMarkers([]);
    }
  }, [candles, isPlaying, playbackIndex]);

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
        <div
          ref={containerRef}
          className="chart-wrap h-[320px]"
          role="img"
          aria-label="과거 차트"
        />
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
        <p className="text-sm mt-2">첫 두 번 탭: 가격 흐름 소리 재생 + 통계 설명</p>
        <p className="text-sm mt-1">이후 두 번 탭: 데이터 기반 질문</p>
      </section>
    </main>
  );
}
