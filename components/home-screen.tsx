import type { Stock } from "@/types/stock";
import LandingHeader from "@/components/landing/landing-header";
import ChartModeCard from "@/components/landing/chart-mode-card";
import QuickCommandList from "@/components/landing/quick-command-list";
import VoiceCommandButton from "@/components/landing/voice-command-button";

interface HomeScreenProps {
  stocks: Stock[];
  lastCommand: string;
  lastResponse: string;
  onStartVoiceCommand: () => void;
  onSubmitText: (text: string) => void;
  onLaunchLive: (stockTicker: string, interval: 1 | 3 | 5) => void;
  onLaunchHistory: (stockTicker: string, from: string, to: string) => void;
  onTap?: () => void;
}

const QUICK_COMMANDS = [
  {
    label: "예) 삼성전자 1분 실시간 차트",
    value: "삼성전자 1분 실시간 차트"
  },
  {
    label: "예) 삼성전자 2025년 6월부터 12월까지 과거 차트",
    value: "삼성전자 2025년 6월부터 2025년 12월까지 과거 차트"
  }
] as const;

export default function HomeScreen({
  stocks,
  onStartVoiceCommand,
  onSubmitText,
  onLaunchLive,
  onLaunchHistory,
  onTap
}: HomeScreenProps) {
  const defaultStockTicker = stocks[0]?.ticker ?? "005930";

  return (
    <main
      className="landing-screen screen-root mx-auto flex w-full max-w-[402px] flex-col bg-[#010618] px-5 pb-10 pt-[50px] text-white"
      onPointerDown={onTap}
      aria-label="PitchStock 홈"
    >
      <LandingHeader />

      <nav className="mt-10 flex flex-col gap-10" aria-label="차트 유형 선택">
        <ChartModeCard
          title="실시간 차트"
          ariaLabel="삼성전자 1분 실시간 차트 시작"
          onClick={() => onLaunchLive(defaultStockTicker, 1)}
        />
        <ChartModeCard
          title="과거 차트 확인"
          ariaLabel="삼성전자 2025년 6월부터 12월까지 과거 차트 시작"
          onClick={() => onLaunchHistory(defaultStockTicker, "2025-06", "2025-12")}
        />
      </nav>

      <div className="mt-10">
        <QuickCommandList commands={QUICK_COMMANDS} onSelect={onSubmitText} />
      </div>

      <div className="min-h-[61px] flex-1" aria-hidden="true" />

      <VoiceCommandButton onClick={onStartVoiceCommand} />
    </main>
  );
}
