'use client';

import { useEffect, useRef } from 'react';
import { createChart, type CandlestickData, type UTCTimestamp } from 'lightweight-charts';
import type { LiveCandle } from '@/hooks/use-live-demo';
import { formatPrice, formatVolume } from '@/lib/formatters';

interface LiveChartScreenProps {
  stockName: string;
  interval: 1 | 3 | 5;
  candles: LiveCandle[];
  currentCandle: LiveCandle | null;
  currentPrice: number;
  candleProgress: number;
  candleVolume: number;
  changeRate: number;
  heartbeatPulse: boolean;
  onTap?: () => void;
}

export default function LiveChartScreen({
  stockName,
  interval,
  candles,
  currentCandle,
  currentPrice,
  candleProgress,
  candleVolume,
  changeRate,
  heartbeatPulse,
  onTap
}: LiveChartScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<any>(null);

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

    const series = chart.addCandlestickSeries({
      upColor: '#34d399',
      downColor: '#f87171',
      borderVisible: false,
      wickUpColor: '#34d399',
      wickDownColor: '#f87171'
    });

    chartRef.current = chart;
    seriesRef.current = series;

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
    if (!seriesRef.current || typeof window === 'undefined') return;

    const points: CandlestickData<UTCTimestamp>[] = [...candles, currentCandle]
      .filter((c): c is LiveCandle => c != null)
      .map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }));

    const sorted = points.sort((a, b) => a.time - b.time);
    seriesRef.current.setData(sorted);

    if (sorted.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles, currentCandle]);

  const changeStatus =
    changeRate >= 0.3
      ? `상승 ${changeRate.toFixed(1)}%`
      : changeRate <= -0.3
        ? `하락 ${changeRate.toFixed(1)}%`
        : '횡보';

  return (
    <main
      className="screen-root"
      aria-label="실시간 차트 화면"
      role="button"
      tabIndex={0}
      onPointerDown={onTap}
    >
      <header className="card">
        <div className="text-xs status-pill inline-block">실시간 데모 재생 · 합성 데이터</div>
        <h1 className="text-2xl font-bold mt-2">{stockName} {interval}분봉 실시간</h1>
        <p className="text-sm">현재 화면명: LIVE_CHART</p>
      </header>

      <section className="card">
        <div ref={containerRef} className="chart-wrap h-[320px]" role="img" aria-label="실시간 캔들 차트" />
      </section>

      <section className="grid grid-cols-2 gap-2">
        <article className="card" aria-label="현재가 카드">
          <h2 className="text-sm text-slate-300">현재가</h2>
          <p className="text-lg font-bold">{formatPrice(currentPrice)}</p>
        </article>
        <article className="card" aria-label="현재 봉 거래량">
          <h2 className="text-sm text-slate-300">현재봉 거래량</h2>
          <p className="text-lg font-bold">{formatVolume(candleVolume)}</p>
        </article>
        <article className="card" aria-label="봉 진행률">
          <h2 className="text-sm text-slate-300">봉 진행률</h2>
          <p className="text-lg font-bold">{candleProgress}%</p>
          <div
            className={`mt-2 h-2 w-full rounded-full ${heartbeatPulse ? 'bg-cyan-400' : 'bg-slate-700'}`}
            aria-hidden="true"
          />
        </article>
        <article className="card" aria-label="등락 상태">
          <h2 className="text-sm text-slate-300">현재 변화</h2>
          <p className="text-lg font-bold">{changeStatus}</p>
        </article>
      </section>

      <p className="px-1 text-sm">
        두 번 탭: 현재가와 거래량 안내 / 세 번 탭: 종료 확인
      </p>
    </main>
  );
}
