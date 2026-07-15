"use client";

import type { LiveCandle } from "@/hooks/use-live-demo";
import { formatPrice, formatVolume } from "@/lib/formatters";
import { LiveChartPanel } from "@/components/live/live-chart-panel";
import { LiveMetricCard } from "@/components/live/live-metric-card";
import { LiveScreenHeader } from "@/components/live/live-screen-header";

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

function getStatusText(changeRate: number) {
  if (changeRate >= 0.3) return `상승 ${changeRate.toFixed(1)}%`;
  if (changeRate <= -0.3) return `하락 ${Math.abs(changeRate).toFixed(1)}%`;
  return "횡보 중";
}

export function LiveChartScreen({
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
  const requestExit = () => void onExitRequest();

  return (
    <main
      className="screen-root mx-auto min-h-[1128px] w-full max-w-[402px] bg-[#010618] px-5 pb-10 pt-[30px] text-white"
      aria-label="실시간 차트"
      onPointerDown={onTap}
    >
      <LiveScreenHeader
        stockName={stockName}
        interval={interval}
        onBack={requestExit}
        onVoiceRecognition={onSpeakState}
      />

      <LiveChartPanel
        candles={candles}
        currentCandle={currentCandle}
        candleProgress={candleProgress}
        heartbeatPulse={heartbeatPulse}
      />

      <section className="mt-[14px] flex flex-col gap-[14px]" aria-label="실시간 차트 요약">
        <LiveMetricCard label="현재가" value={formatPrice(currentPrice)} />
        <LiveMetricCard label="현재거래량" value={formatVolume(candleVolume)} />
        <LiveMetricCard label="추세" value={getStatusText(changeRate)} />
      </section>

      <p className="mt-4 text-[14px] font-normal leading-6 text-[#888888]">
        두 번 탭: 분석 실행 또는 음성 질문
        <br />
        세 번 탭: 현재 화면 종료
      </p>

      <button
        type="button"
        className="mt-[59px] flex h-16 w-full items-center justify-center rounded-[10px] border-2 border-[#ff9fae] text-[20px] font-semibold leading-6 text-[#ffe3e7] transition-colors hover:bg-[#ff9fae]/10 active:bg-[#ff9fae]/15"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={requestExit}
      >
        실시간 차트 종료
      </button>
    </main>
  );
}
