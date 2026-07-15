import Image from 'next/image';
import type { ReactNode } from 'react';

interface HistoryChartCardProps {
  stockName: string;
  children: ReactNode;
}

export function HistoryChartCard({ stockName, children }: HistoryChartCardProps) {
  return (
    <section
      className="absolute inset-x-5 top-[228px] h-[319px] rounded-[10px] border border-[#20324a] bg-[#06142b] p-[19px]"
      aria-label={`${stockName} 과거 가격 차트`}
    >
      <div className="relative h-[279px] w-full overflow-hidden">
        <Image
          src="/assets/figma/history-chart-reference.png"
          alt={`${stockName} 기간별 주가 차트`}
          fill
          priority
          sizes="(max-width: 402px) calc(100vw - 80px), 322px"
          className="object-cover"
        />
        {children}
      </div>
    </section>
  );
}
