"use client";

import { useMemo, useState } from "react";
import { SelectionList, type SelectionOption } from "@/components/selection-list";
import { SetupHeader } from "@/components/setup-header";
import type { Stock } from "@/types/stock";

type LiveInterval = 1 | 3 | 5;

interface LiveSetupScreenProps {
  isBusy: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  onBack: () => void;
  onStart: (stockTicker: string, interval: LiveInterval) => void;
  onVoiceRecognition: () => void;
  stocks: readonly Stock[];
}

const intervalOptions: readonly SelectionOption<LiveInterval>[] = [
  { label: "1분", value: 1 },
  { label: "3분", value: 3 },
  { label: "5분", value: 5 }
];

export function LiveSetupScreen({
  isBusy,
  isListening,
  isSpeaking,
  onBack,
  onStart,
  onVoiceRecognition,
  stocks
}: LiveSetupScreenProps) {
  const [selectedStockTicker, setSelectedStockTicker] = useState(stocks[0]?.ticker ?? "005930");
  const [selectedInterval, setSelectedInterval] = useState<LiveInterval>(1);
  const [intervalTouched, setIntervalTouched] = useState(false);

  const stockOptions = useMemo<readonly SelectionOption<string>[]>(
    () => stocks.map((stock) => ({ label: stock.name, value: stock.ticker })),
    [stocks]
  );

  const selectInterval = (interval: LiveInterval) => {
    setSelectedInterval(interval);
    setIntervalTouched(true);
  };

  return (
    <main className="landing-screen mx-auto flex min-h-[100dvh] w-full max-w-[402px] flex-col bg-[#010618] px-5 pb-10 pt-[30px] text-white">
      <SetupHeader
        isListening={isListening}
        isSpeaking={isSpeaking}
        onBack={onBack}
        onVoiceRecognition={onVoiceRecognition}
      />

      <section
        className="mt-7 h-[607px] shrink-0 rounded-[10px] border border-[#20324a] bg-[#06142b] px-[15px] pt-[15px]"
        aria-labelledby="recent-stocks-heading"
      >
        <div>
          <h1 id="recent-stocks-heading" className="text-[20px] font-semibold leading-6">
            마지막으로 확인했던 종목
          </h1>
          <div className="mt-4">
            <SelectionList<string>
              ariaLabel="종목 선택"
              options={stockOptions}
              selectedValue={selectedStockTicker}
              onSelect={setSelectedStockTicker}
            />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-[20px] font-semibold leading-6">실시간 차트 주기</h2>
          <div className="mt-[11px]">
            <SelectionList<LiveInterval>
              ariaLabel="실시간 차트 주기 선택"
              highlightSelected={intervalTouched}
              options={intervalOptions}
              selectedValue={selectedInterval}
              onSelect={selectInterval}
            />
          </div>
        </div>
      </section>

      <button
        type="button"
        className="mt-auto h-16 shrink-0 rounded-[10px] bg-[#00ecfc] text-[20px] font-semibold leading-6 text-[#010618] transition-colors hover:bg-[#5ff5ff] disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={() => onStart(selectedStockTicker, selectedInterval)}
        disabled={isBusy || stockOptions.length === 0}
        aria-label={`${stockOptions.find((stock) => stock.value === selectedStockTicker)?.label ?? "선택한 종목"} ${selectedInterval}분 실시간 차트 시작`}
      >
        {isBusy ? "시작하는 중" : "실시간 차트 시작"}
      </button>
    </main>
  );
}
