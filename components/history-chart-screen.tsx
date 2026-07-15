'use client';

import { HistoryChartCard } from '@/components/history/history-chart-card';
import { HistoryChartInteraction } from '@/components/history/history-chart-interaction';
import { HistoryFooterActions } from '@/components/history/history-footer-actions';
import { HistoryHeader } from '@/components/history/history-header';
import { HistorySummaryCard } from '@/components/history/history-summary-card';
import type { DailyCandle, TimeSeriesAnalysis } from '@/types/analysis';

interface HistoryChartScreenProps {
  stockName: string;
  from: string;
  to: string;
  candles: DailyCandle[];
  analysis: TimeSeriesAnalysis;
  playbackIndex: number | null;
  isPlaying: boolean;
  onTap?: () => void;
  onPrimaryAction: () => void;
  onAskQuestion: (text: string) => void;
  onExitRequest: () => Promise<void> | void;
  questionPrompts: readonly string[];
}

export default function HistoryChartScreen({
  stockName,
  from,
  to,
  candles,
  analysis,
  onTap,
  onPrimaryAction,
  onAskQuestion,
  onExitRequest,
  questionPrompts
}: HistoryChartScreenProps) {
  return (
    <main
      className="screen-root relative mx-auto h-[1128px] min-h-[1128px] w-full max-w-[402px] overflow-hidden bg-[#010618] font-sans text-white"
      aria-label={`${stockName} 과거 차트`}
      onPointerDown={onTap}
    >
      <HistoryHeader
        stockName={stockName}
        from={from}
        to={to}
        onBack={() => void onExitRequest()}
        onVoiceAction={onPrimaryAction}
      />

      <HistoryChartCard stockName={stockName}>
        <HistoryChartInteraction candles={candles} onTap={onTap} />
      </HistoryChartCard>

      <HistorySummaryCard analysis={analysis} />

      <HistoryFooterActions
        onAskQuestion={onAskQuestion}
        onExitRequest={onExitRequest}
        questionPrompts={questionPrompts}
      />
    </main>
  );
}
