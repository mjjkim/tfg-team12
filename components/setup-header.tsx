import Image from "next/image";

interface SetupHeaderProps {
  isListening: boolean;
  isSpeaking: boolean;
  onBack: () => void;
  onVoiceRecognition: () => void;
}

export function SetupHeader({
  isListening,
  isSpeaking,
  onBack,
  onVoiceRecognition
}: SetupHeaderProps) {
  const voiceActive = isListening || isSpeaking;

  return (
    <header className="flex h-[50px] items-center justify-between" aria-label="차트 설정 내비게이션">
      <button
        type="button"
        className="relative -ml-2 h-[50px] w-[46px] rounded-[10px] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#00ecfc]"
        onClick={onBack}
        aria-label="이전 화면으로 돌아가기"
      >
        <Image
          src="/assets/figma/back-chevron.png"
          alt=""
          width={15}
          height={28}
          className="absolute left-2 top-[11px] h-[28px] w-[15px]"
          priority
        />
        <Image
          src="/assets/figma/back-line.png"
          alt=""
          width={32}
          height={2}
          className="absolute left-2 top-6 h-[2px] w-8"
          priority
        />
      </button>

      <button
        type="button"
        className="flex h-[50px] w-[115px] items-center rounded-[10px] border border-[#20324a] bg-[#06142b] px-[13px] text-white transition-colors hover:border-[#60768d] hover:bg-[#0b1c36] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#00ecfc]"
        onClick={onVoiceRecognition}
        aria-label={voiceActive ? "음성인식 진행 중" : "음성인식 시작"}
        aria-pressed={voiceActive}
      >
        <Image
          src="/assets/figma/microphone.png"
          alt=""
          width={20}
          height={26}
          className="h-[26px] w-5 shrink-0"
          priority
        />
        <span className="ml-2 whitespace-nowrap text-[16px] font-medium leading-[19px]">
          {isListening ? "듣는 중" : "음성인식"}
        </span>
      </button>
    </header>
  );
}
