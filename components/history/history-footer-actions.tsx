'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RecommendedQuestionsSheet } from '@/components/history/recommended-questions-sheet';

interface HistoryFooterActionsProps {
  onAskQuestion: (question: string) => void;
  onExitRequest: () => Promise<void> | void;
  questionPrompts: readonly string[];
}

export function HistoryFooterActions({
  onAskQuestion,
  onExitRequest,
  questionPrompts
}: HistoryFooterActionsProps) {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const recommendationButtonRef = useRef<HTMLButtonElement>(null);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    requestAnimationFrame(() => recommendationButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isSheetOpen) document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSheetOpen]);

  return (
    <section
      className="absolute inset-x-5 top-[946px] flex flex-col gap-[14px]"
      aria-label="과거 차트 작업"
    >
      <button
        ref={recommendationButtonRef}
        type="button"
        className="flex h-16 shrink-0 items-center justify-center rounded-[10px] bg-[#00ecfc] text-[20px] font-semibold leading-6 text-[#010618] transition-[filter,transform] hover:brightness-95 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#010618]"
        aria-expanded={isSheetOpen}
        aria-controls="recommended-questions-title"
        aria-label="추천 질문 열기"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => setSheetOpen(true)}
      >
        추천질문
      </button>

      <button
        type="button"
        className="flex h-16 shrink-0 items-center justify-center rounded-[10px] border-2 border-[#ff9fae] bg-transparent text-[20px] font-semibold leading-6 text-[#ffe3e7] transition-colors hover:bg-[#ff9fae]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9fae] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010618]"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => void onExitRequest()}
      >
        과거 차트 종료
      </button>

      {isSheetOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-y-0 left-1/2 z-30 w-full max-w-[402px] -translate-x-1/2 cursor-default bg-[#010618]/90"
            aria-label="추천 질문 닫기"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={closeSheet}
          />
          <RecommendedQuestionsSheet
            prompts={questionPrompts}
            onAskQuestion={onAskQuestion}
            onClose={closeSheet}
            onExit={() => void onExitRequest()}
          />
        </>
      ) : null}
    </section>
  );
}
