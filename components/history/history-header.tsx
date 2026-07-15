import Image from 'next/image';
import { formatShortDateLabel } from '@/lib/formatters';

interface HistoryHeaderProps {
  stockName: string;
  from: string;
  to: string;
  onBack: () => void;
  onVoiceAction: () => void;
}

export function HistoryHeader({
  stockName,
  from,
  to,
  onBack,
  onVoiceAction
}: HistoryHeaderProps) {
  return (
    <header className="absolute inset-x-5 top-[30px] h-[174px]">
      <button
        type="button"
        className="absolute left-0 top-0 h-[50px] w-[48px] rounded-[10px] transition-colors hover:bg-[#06142b] active:bg-[#0a1c39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ecfc]"
        aria-label="과거 차트에서 뒤로 가기"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onBack}
      >
        <Image src="/assets/figma/back-chevron.png" alt="" width={15} height={28} className="absolute left-0 top-[11px]" />
        <Image src="/assets/figma/back-line.png" alt="" width={32} height={2} className="absolute left-0 top-[24px]" />
      </button>

      <button
        type="button"
        className="absolute right-0 top-0 flex h-[50px] w-[115px] items-center gap-2 rounded-[10px] border border-[#20324a] bg-[#06142b] px-[13px] text-[16px] font-medium leading-normal text-white transition-colors hover:border-[#60768d] active:bg-[#0a1c39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ecfc]"
        aria-label="음성으로 차트 분석 또는 질문하기"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onVoiceAction}
      >
        <Image src="/assets/figma/microphone.png" alt="" width={20} height={26} />
        <span>음성인식</span>
      </button>

      <h1 className="absolute left-0 top-[78px] text-[30px] font-semibold leading-normal text-white">
        {stockName} 과거 차트
      </h1>
      <p className="absolute left-0 top-[134px] text-[16px] font-normal leading-6 text-white">
        조회기간: {formatShortDateLabel(from)} ~ {formatShortDateLabel(to)}
      </p>
    </header>
  );
}
