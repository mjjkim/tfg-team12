'use client';

import { useEffect, useRef, useState } from 'react';

interface RecommendedQuestionsSheetProps {
  prompts: readonly string[];
  onAskQuestion: (question: string) => void;
  onClose: () => void;
  onExit: () => void;
}

export function RecommendedQuestionsSheet({
  prompts,
  onAskQuestion,
  onClose,
  onExit
}: RecommendedQuestionsSheetProps) {
  const [question, setQuestion] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const submitQuestion = () => {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) return;
    onAskQuestion(normalizedQuestion);
    setQuestion('');
  };

  return (
    <section
      className="history-question-sheet fixed bottom-0 left-1/2 z-40 flex w-full max-w-[402px] -translate-x-1/2 flex-col overflow-y-auto rounded-t-[30px] border border-[#20324a] bg-[#06142b] px-5 pb-10 pt-[45px]"
      style={{ height: 'min(690px, calc(100dvh - 24px))' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recommended-questions-title"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        className="absolute left-1/2 top-[13px] h-[3px] w-[90px] -translate-x-1/2 rounded-[2px] bg-[#60768d]"
        aria-hidden="true"
      />

      <h2
        id="recommended-questions-title"
        ref={titleRef}
        tabIndex={-1}
        className="text-[20px] font-semibold leading-normal text-white outline-none"
      >
        추천질문
      </h2>

      <ul className="mt-5 flex flex-col gap-[14px]" aria-label="추천 질문 목록">
        {prompts.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              className="h-[60px] w-full rounded-[10px] border border-[#60768d] bg-[#2f4258] px-[13px] text-left text-[16px] font-medium leading-normal text-white transition-colors hover:bg-[#3a5069] active:bg-[#25384d]"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onAskQuestion(prompt)}
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>

      <form
        className="mt-[30px] flex h-[60px] shrink-0 items-center rounded-[10px] border border-[#60768d] py-[5px] pl-[13px] pr-[5px]"
        onSubmit={(event) => {
          event.preventDefault();
          submitQuestion();
        }}
      >
        <label htmlFor="history-question" className="sr-only">
          질문 입력
        </label>
        <input
          id="history-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onPointerDown={(event) => event.stopPropagation()}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[16px] font-medium leading-normal text-white outline-none placeholder:text-[#888888]"
          placeholder="질문을 입력하세요"
          autoComplete="off"
        />
        <button
          type="submit"
          className="h-[48px] w-[71px] shrink-0 rounded-[10px] bg-[#00ecfc] text-[16px] font-medium leading-normal text-[#06142b] transition-[filter,transform] hover:brightness-95 active:scale-[0.98]"
          onPointerDown={(event) => event.stopPropagation()}
        >
          보내기
        </button>
      </form>

      <button
        type="button"
        className="mt-auto h-16 shrink-0 rounded-[10px] border-2 border-[#ff9fae] bg-transparent text-[20px] font-semibold leading-normal text-[#ffe3e7] transition-colors hover:bg-[#ff9fae]/10 active:bg-[#ff9fae]/20"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onExit}
      >
        과거 차트 종료
      </button>
    </section>
  );
}
