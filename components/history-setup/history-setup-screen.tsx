"use client";

import { useState } from "react";
import { MonthSelect } from "@/components/history-setup/month-select";
import { SetupHeader } from "@/components/setup-header";

interface HistorySetupScreenProps {
  initialFromMonth: string;
  initialToMonth: string;
  isBusy: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  onBack: () => void;
  onVoiceRequest: () => void;
  onStart: (fromMonth: string, toMonth: string) => void;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const month = String(index + 1).padStart(2, "0");
  return {
    label: `25년 ${index + 1}월`,
    value: `2025-${month}`
  };
});

function stopTapPropagation(event: React.PointerEvent) {
  event.stopPropagation();
}

export function HistorySetupScreen({
  initialFromMonth,
  initialToMonth,
  isBusy,
  isListening,
  isSpeaking,
  onBack,
  onVoiceRequest,
  onStart
}: HistorySetupScreenProps) {
  const [fromMonth, setFromMonth] = useState(initialFromMonth);
  const [toMonth, setToMonth] = useState(initialToMonth);
  const isRangeValid = fromMonth <= toMonth;

  return (
    <main
      className="landing-screen screen-root mx-auto flex w-full max-w-[402px] flex-col bg-[#010618] px-5 pb-10 pt-[30px] text-white"
      aria-label="과거 차트 조회 기간 설정"
    >
      <SetupHeader
        isListening={isListening}
        isSpeaking={isSpeaking}
        onBack={onBack}
        onVoiceRecognition={onVoiceRequest}
      />

      <form
        className="mt-7 flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (isRangeValid) onStart(fromMonth, toMonth);
        }}
      >
        <section
          className="h-[286px] rounded-[10px] border border-[#20324a] bg-[#06142b] p-[15px]"
          aria-labelledby="history-period-title"
        >
          <h1 id="history-period-title" className="text-[20px] font-semibold leading-6">
            과거 조회 기간
          </h1>

          <div className="mt-[30px]">
            <MonthSelect
              id="history-from-month"
              label="시작 월"
              options={MONTH_OPTIONS}
              value={fromMonth}
              onChange={setFromMonth}
            />
          </div>

          <div className="mt-10">
            <MonthSelect
              id="history-to-month"
              label="종료 월"
              options={MONTH_OPTIONS}
              value={toMonth}
              onChange={setToMonth}
            />
          </div>
        </section>

        {!isRangeValid ? (
          <p className="mt-3 text-sm text-rose-300" role="alert">
            시작 월은 종료 월보다 늦을 수 없습니다.
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-auto flex h-16 w-full items-center justify-center rounded-[10px] bg-[#00ecfc] text-[20px] font-semibold leading-normal text-[#010618] transition-[filter,transform] hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#60768d] disabled:text-[#010618]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#010618]"
          disabled={!isRangeValid || isBusy}
          onPointerDown={stopTapPropagation}
        >
          과거 차트 시작
        </button>
      </form>
    </main>
  );
}
