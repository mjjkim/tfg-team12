'use client';

import React, { useEffect, useRef, useState } from "react";
import { createChart, type LineData, type UTCTimestamp } from "lightweight-charts";
import type { DailyCandle, TimeSeriesAnalysis } from "@/types/analysis";
import { formatDateLabel, formatPrice, formatVolume } from "@/lib/formatters";

interface HistoryChartScreenProps {
  stockName: string;
  from: string;
  to: string;
  candles: DailyCandle[];
  analysis: TimeSeriesAnalysis;
  playbackIndex: number | null;
  isPlaying: boolean;
  onTap?: () => void;
  isQuestionReady: boolean;
  onPrimaryAction: () => void;
  onAskQuestion: (text: string) => void;
  onExitRequest: () => Promise<void> | void;
  questionPrompts: readonly string[];
}

function stopTapPropagation(event: React.PointerEvent) {
  event.stopPropagation();
}

export default function HistoryChartScreen({
  stockName,
  from,
  to,
  candles,
  analysis,
  playbackIndex,
  isPlaying,
  onTap,
  isQuestionReady,
  onPrimaryAction,
  onAskQuestion,
  onExitRequest,
  questionPrompts
}: HistoryChartScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const lineRef = useRef<any>(null);
  const [questionText, setQuestionText] = useState("");

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    const chart = createChart(containerRef.current, {
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

    const series = chart.addLineSeries({
      color: "#60a5fa",
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
            position: "inBar" as const,
            shape: isPlaying ? "circle" : "arrowUp",
            color: isPlaying ? "#f59e0b" : "#34d399",
            text: isPlaying ? "재생 중" : "표시"
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
      aria-label="과거 차트"
      role="button"
      tabIndex={0}
      onPointerDown={onTap}
    >
      <header className="card">
        <div className="text-xs status-pill inline-block">과거 분석 모드</div>
        <h1 className="text-2xl font-bold mt-2">{stockName} 과거 차트</h1>
        <p className="text-sm mt-2">
          조회 기간: {formatDateLabel(from)} ~ {formatDateLabel(to)}
        </p>
      </header>

      <section className="card">
        <div
          ref={containerRef}
          className="chart-wrap h-[320px]"
          role="img"
          aria-label="과거 가격 선 차트"
        />
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">분석 요약</h2>
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
            <p className="text-slate-300">전체 수익률</p>
            <p className="font-semibold">{analysis.summary.totalReturnPct.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-slate-300">평균 거래량</p>
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
        <h2 className="text-lg font-bold">분석 질문</h2>
        <p className="text-sm mt-2">분석을 실행해 소리와 요약을 들은 뒤 궁금한 내용을 질문하세요.</p>

        <div className="mt-2 grid gap-2">
          <button
            type="button"
            className="rounded-lg bg-cyan-400 text-slate-950 font-bold py-3 min-h-[56px]"
            onPointerDown={stopTapPropagation}
            onClick={onPrimaryAction}
          >
            {isQuestionReady ? "질문하기" : "분석 실행 및 질문 준비"}
          </button>

          {isQuestionReady ? (
            <>
              <p className="text-sm mt-1">추천 질문</p>
              <div className="mt-2 grid gap-2">
                {questionPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border border-cyan-300 px-3 py-2 min-h-[48px] text-left"
                    onPointerDown={stopTapPropagation}
                    onClick={() => onAskQuestion(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                className="mt-2 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const q = questionText.trim();
                  if (!q) return;
                  onAskQuestion(q);
                  setQuestionText("");
                }}
              >
                <input
                  className="flex-1 rounded-lg border border-slate-500 bg-slate-900 px-3 py-2"
                  value={questionText}
                  onChange={(event) => setQuestionText(event.target.value)}
                  onPointerDown={stopTapPropagation}
                  placeholder="질문을 입력하세요"
                  aria-label="질문 입력"
                />
                <button
                  type="submit"
                  onPointerDown={stopTapPropagation}
                  className="rounded-lg bg-slate-800 border border-slate-500 px-3 py-2 min-h-[48px]"
                >
                  보내기
                </button>
              </form>
            </>
          ) : null}

          <button
            type="button"
            className="rounded-lg border border-rose-300 text-rose-100 font-bold py-3 min-h-[56px]"
            onPointerDown={stopTapPropagation}
            onClick={() => void onExitRequest()}
          >
            과거 차트 종료
          </button>
        </div>
      </section>

      <p className="px-1 text-sm">
        두 번 탭: 분석 실행 또는 음성 질문
        <br />
        세 번 탭: 현재 화면 종료
      </p>
    </main>
  );
}
