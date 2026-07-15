"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp
} from "lightweight-charts";
import type { LiveCandle } from "@/hooks/use-live-demo";
import { SegmentedProgress } from "@/components/live/segmented-progress";

interface LiveChartPanelProps {
  candles: LiveCandle[];
  currentCandle: LiveCandle | null;
  candleProgress: number;
  heartbeatPulse: boolean;
}

const CHART_HEIGHT = 282;

export function LiveChartPanel({
  candles,
  currentCandle,
  candleProgress,
  heartbeatPulse
}: LiveChartPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth || undefined,
      height: CHART_HEIGHT,
      layout: {
        background: { color: "#0b1326" },
        textColor: "#e8eefc",
        fontFamily: "Inter, Pretendard, system-ui, sans-serif",
        fontSize: 11
      },
      grid: {
        horzLines: { color: "#1e293b" },
        vertLines: { color: "#1e293b" }
      },
      rightPriceScale: {
        borderColor: "#20324a",
        scaleMargins: { top: 0.08, bottom: 0.18 }
      },
      timeScale: {
        borderColor: "#20324a",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 1,
        barSpacing: 49,
        minBarSpacing: 12
      },
      crosshair: {
        vertLine: { color: "#54657d", style: LineStyle.Dotted },
        horzLine: { color: "#54657d", style: LineStyle.Dotted }
      },
      handleScroll: false,
      handleScale: false
    });

    const series = chart.addCandlestickSeries({
      upColor: "#6bcea1",
      downColor: "#f27b7b",
      borderVisible: false,
      wickUpColor: "#6bcea1",
      wickDownColor: "#f27b7b",
      priceLineColor: "#6bcea1",
      priceLineStyle: LineStyle.Dotted,
      priceLineWidth: 1,
      lastValueVisible: true
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) chart.applyOptions({ width });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const merged = new Map<number, CandlestickData<UTCTimestamp>>();
    for (const candle of [...candles, currentCandle]) {
      if (!candle || !Number.isFinite(candle.time)) continue;
      merged.set(candle.time, {
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      });
    }

    const points = Array.from(merged.entries())
      .sort(([first], [second]) => first - second)
      .map(([, point]) => point);

    series.setData(points);
    if (points.length > 0) chartRef.current?.timeScale().fitContent();
  }, [candles, currentCandle]);

  return (
    <section
      className="mt-10 h-[352px] rounded-[10px] border border-[#20324a] bg-[#06142b] p-[19px]"
      aria-label="실시간 캔들 차트"
    >
      <div
        ref={containerRef}
        className="h-[282px] w-full overflow-hidden bg-[#0b1326]"
        role="img"
        aria-label="시간에 따른 실시간 가격 캔들 차트"
      />
      <div className="mt-[10px]">
        <SegmentedProgress value={candleProgress} pulse={heartbeatPulse} />
      </div>
    </section>
  );
}
