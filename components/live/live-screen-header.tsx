import Image from "next/image";

interface LiveScreenHeaderProps {
  stockName: string;
  interval: 1 | 3 | 5;
  onBack: () => void;
  onVoiceRecognition: () => void;
}

export function LiveScreenHeader({
  stockName,
  interval,
  onBack,
  onVoiceRecognition
}: LiveScreenHeaderProps) {
  return (
    <header>
      <nav className="flex h-[50px] items-center justify-between" aria-label="실시간 차트 내비게이션">
        <button
          type="button"
          className="relative -ml-2 h-[50px] w-[48px] shrink-0 rounded-[10px] transition-colors hover:bg-white/5 active:bg-white/10"
          aria-label="홈으로 돌아가기"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onBack}
        >
          <Image
            src="/assets/figma/back-chevron.png"
            alt=""
            width={15}
            height={28}
            className="absolute left-2 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <Image
            src="/assets/figma/back-line.png"
            alt=""
            width={32}
            height={2}
            className="absolute left-2 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          className="flex h-[50px] w-[115px] items-center justify-center gap-2 rounded-[10px] border border-[#20324a] bg-[#06142b] text-[16px] font-medium leading-[19px] text-white transition-colors hover:border-[#00ecfc] active:bg-[#0a1c39]"
          aria-label="현재 상태 음성으로 듣기"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onVoiceRecognition}
        >
          <Image
            src="/assets/figma/microphone.png"
            alt=""
            width={20}
            height={26}
            aria-hidden="true"
          />
          <span>음성인식</span>
        </button>
      </nav>

      <h1 className="mt-7 text-[30px] font-semibold leading-[36px] text-white">
        {stockName} ({interval}분봉)
      </h1>
      <p className="mt-5 text-[16px] font-normal leading-6 text-white">
        데모 모드에서는 {interval}분봉이 12·24·36초 주기로 빠르게
        <br className="hidden min-[380px]:block" /> 갱신됩니다.
      </p>
    </header>
  );
}
