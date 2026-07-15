'use client';

import React, { useEffect, useRef } from "react";
import { createChart, type CandlestickData, type UTCTimestamp } from "lightweight-charts";
import type { LiveCandle } from "@/hooks/use-live-demo";
import { formatPrice, formatVolume } from "@/lib/formatters";

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
  onSpeakState: () => void;
  onExitRequest: () => Promise<void> | void;
}

function stopTapPropagation(event: React.PointerEvent) {
  event.stopPropagation();
}

function getStatusText(changeRate: number) {
  if (changeRate >= 0.3) {
    return `상승 ${changeRate.toFixed(1)}%`;
  }
  if (changeRate <= -0.3) {
    return `하락 ${Math.abs(changeRate).toFixed(1)}%`;
  }
  return "횡보";
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
  onTap,
  onSpeakState,
  onExitRequest
}: LiveChartScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    const width = containerRef.current.clientWidth;
    const chart = createChart(containerRef.current, {
      width: width > 0 ? width : undefined,
      height: 320,
      rightPriceScale: { borderColor: "#334155", scaleMargins: { top: 0.1, bottom: 0.2 } },
      layout: {
        background: { color: "#0b1326" },
        textColor: "#e8eefc"
      },
      grid: {
        horzLines: { color: "#1e293b" },
        vertLines: { color: "#1e293b" }
      }
    });

    const series = chart.addCandlestickSeries({
      upColor: "#34d399",
      downColor: "#f87171",
      borderVisible: false,
      wickUpColor: "#34d399",
      wickDownColor: "#f87171"
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || typeof window === "undefined") return;

    const merged = new Map<number, CandlestickData<UTCTimestamp>>();
    for (const c of [...candles, currentCandle]) {
      if (!c) continue;
      const time = Number(c.time);
      if (!Number.isFinite(time)) continue;

      merged.set(time, {
        time: time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      });
    }

    const sortedPoints = Array.from(merged.entries())
      .sort(([a], [b]) => a - b)
      .map(([, point]) => point);

    seriesRef.current.setData(sortedPoints);

    if (sortedPoints.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles, currentCandle]);

  const changeStatus = getStatusText(changeRate);

  return (
    <main
      className="screen-root"
      aria-label="실시간 차트"
      role="button"
      tabIndex={0}
      onPointerDown={onTap}
    >
      <header className="card">
        <div className="text-xs status-pill inline-block">실시간 데모 실행 중</div>
        <h1 className="text-2xl font-bold mt-2">{stockName} ({interval}분봉)</h1>
        <p className="text-sm">데모 모드에서는 {interval}분봉이 12·24·36초 주기로 빠르게 갱신됩니다.</p>
      </header>

      <section className="card">
        <div ref={containerRef} className="chart-wrap h-[320px]" role="img" aria-label="실시간 캔들 차트" />
      </section>

      <section className="grid grid-cols-2 gap-2">
        <article className="card" aria-label="현재가">
          <h2 className="text-sm text-slate-300">현재가</h2>
          <p className="text-lg font-bold">{formatPrice(currentPrice)}</p>
        </article>
        <article className="card" aria-label="현재 거래량">
          <h2 className="text-sm text-slate-300">현재 거래량</h2>
          <p className="text-lg font-bold">{formatVolume(candleVolume)}</p>
        </article>
        <article className="card" aria-label="캔들 진행률">
          <h2 className="text-sm text-slate-300">캔들 진행률</h2>
          <p className="text-lg font-bold">{candleProgress}%</p>
          <div
            className={`mt-2 h-2 w-full rounded-full ${heartbeatPulse ? "bg-cyan-400" : "bg-slate-700"}`}
            aria-hidden="true"
          />
        </article>
        <article className="card" aria-label="추세 상태">
          <h2 className="text-sm text-slate-300">추세</h2>
          <p className="text-lg font-bold">{changeStatus}</p>
        </article>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">조작</h2>
        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            className="rounded-lg bg-cyan-400 text-slate-950 font-bold py-3 min-h-[56px]"
            onPointerDown={stopTapPropagation}
            onClick={onSpeakState}
          >
            현재 상태 듣기
          </button>
          <button
            type="button"
            className="rounded-lg border border-rose-300 text-rose-100 font-bold py-3 min-h-[56px]"
            onPointerDown={stopTapPropagation}
            onClick={() => void onExitRequest()}
          >
            실시간 차트 종료
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-300">
          가격 변화가 기준치를 넘으면 상승·하락 추세에 맞는 소리가 재생됩니다.
        </p>
      </section>
    </main>
  );
}
