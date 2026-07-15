import type { TimeSeriesAnalysis } from '@/types/analysis';
import { formatPrice, formatShortDateLabel, formatVolume } from '@/lib/formatters';

interface HistorySummaryCardProps {
  analysis: TimeSeriesAnalysis;
}

interface SummaryMetricProps {
  label: string;
  value: string;
  detail?: string;
}

function SummaryMetric({ label, value, detail }: SummaryMetricProps) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-[6px]">
      <p className="text-[16px] font-medium leading-normal text-white">{label}</p>
      <p className="whitespace-nowrap text-[20px] font-semibold leading-normal text-white">
        {value}
      </p>
      {detail ? (
        <p className="whitespace-nowrap text-[14px] font-normal leading-normal text-[#888888]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function HistorySummaryCard({ analysis }: HistorySummaryCardProps) {
  const { summary } = analysis;

  return (
    <section className="absolute inset-x-5 top-[561px] h-[371px] rounded-[10px] border border-[#20324a] bg-[#06142b] px-[15px] pt-[11px]">
      <h2 className="text-[20px] font-semibold leading-normal text-white">분석 요약</h2>

      <div className="mt-[24px] grid grid-cols-2 gap-x-[78px] gap-y-[21px]">
        <SummaryMetric label="시작가" value={formatPrice(summary.startPrice)} />
        <SummaryMetric label="종가" value={formatPrice(summary.endPrice)} />
        <SummaryMetric label="전체 수익률" value={`${summary.totalReturnPct.toFixed(1)}%`} />
        <SummaryMetric label="평균 거래량" value={formatVolume(summary.averageVolume)} />
        <SummaryMetric
          label="최고가"
          value={formatPrice(summary.highestPrice)}
          detail={formatShortDateLabel(summary.highestDate)}
        />
        <SummaryMetric
          label="최저가"
          value={formatPrice(summary.lowestPrice)}
          detail={formatShortDateLabel(summary.lowestDate)}
        />
        <SummaryMetric label="변동성" value={`${summary.volatilityPct.toFixed(2)}%`} />
      </div>
    </section>
  );
}
