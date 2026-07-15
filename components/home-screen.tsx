import React, { useMemo, useState } from "react";
import type { Stock } from "@/types/stock";

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

function createMonthOptions(): string[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    return `2025-${month}`;
  });
}

function stopTapPropagation(event: React.PointerEvent) {
  event.stopPropagation();
}

function formatMonthLabel(value: string): string {
  const [year, month] = value.split("-");
  return `${year}년 ${Number(month)}월`;
}

export default function HomeScreen({
  stocks,
  lastCommand,
  lastResponse,
  onStartVoiceCommand,
  onSubmitText,
  onLaunchLive,
  onLaunchHistory,
  onTap
}: HomeScreenProps) {
  const [selectedStockTicker, setSelectedStockTicker] = useState(stocks[0]?.ticker ?? "005930");
  const [selectedInterval, setSelectedInterval] = useState<1 | 3 | 5>(1);
  const [historyFromMonth, setHistoryFromMonth] = useState("2025-06");
  const [historyToMonth, setHistoryToMonth] = useState("2025-12");
  const [historyError, setHistoryError] = useState("");

  const monthOptions = useMemo(createMonthOptions, []);
  const historyRangeValid = historyFromMonth <= historyToMonth;

  const launchLive = () => {
    onLaunchLive(selectedStockTicker, selectedInterval);
  };

  const launchHistory = () => {
    if (!historyRangeValid) {
      setHistoryError("시작 월은 종료 월보다 늦을 수 없습니다.");
      return;
    }

    setHistoryError("");
    onLaunchHistory(selectedStockTicker, historyFromMonth, historyToMonth);
  };

  return (
    <main
      className="screen-root app-shell"
      onPointerDown={onTap}
      aria-live="polite"
      aria-label="홈 화면"
    >
      <header className="card">
        <h1 className="text-2xl font-black">소리로 보는 주식</h1>
        <p className="text-sm mt-2">종목을 선택하고 실시간 차트나 과거 분석을 시작하세요.</p>
      </header>

      <section className="card">
        <h2 className="text-lg font-bold">음성 입력</h2>
        <p className="text-sm mt-1">홈 화면을 두 번 탭해 음성 명령을 사용하거나 아래에서 직접 선택하세요.</p>
        <p className="text-xs status-pill mt-2 inline-block">터치 모드로 이용 중</p>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">종목 선택</h2>

        <div className="mt-3">
          <p className="text-sm font-semibold">선택 가능한 종목</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {stocks.map((stock) => (
              <button
                key={stock.ticker}
                type="button"
                onPointerDown={stopTapPropagation}
                className={`rounded-lg border px-3 py-3 text-left ${
                  selectedStockTicker === stock.ticker
                    ? "border-cyan-300 bg-slate-700"
                    : "border-slate-500 bg-slate-800"
                }`}
                onClick={() => setSelectedStockTicker(stock.ticker)}
                aria-pressed={selectedStockTicker === stock.ticker}
                aria-label={`${stock.name} 선택`}
              >
                {stock.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold">실시간 차트 주기</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onPointerDown={stopTapPropagation}
              onClick={() => setSelectedInterval(1)}
              className={`rounded-lg border px-3 py-3 ${
                selectedInterval === 1 ? "border-cyan-300 bg-slate-700" : "border-slate-500 bg-slate-800"
              }`}
              aria-pressed={selectedInterval === 1}
            >
              1분
            </button>
            <button
              type="button"
              onPointerDown={stopTapPropagation}
              onClick={() => setSelectedInterval(3)}
              className={`rounded-lg border px-3 py-3 ${
                selectedInterval === 3 ? "border-cyan-300 bg-slate-700" : "border-slate-500 bg-slate-800"
              }`}
              aria-pressed={selectedInterval === 3}
            >
              3분
            </button>
            <button
              type="button"
              onPointerDown={stopTapPropagation}
              onClick={() => setSelectedInterval(5)}
              className={`rounded-lg border px-3 py-3 ${
                selectedInterval === 5 ? "border-cyan-300 bg-slate-700" : "border-slate-500 bg-slate-800"
              }`}
              aria-pressed={selectedInterval === 5}
            >
              5분
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onPointerDown={stopTapPropagation}
            onClick={launchLive}
            className="rounded-xl bg-cyan-400 text-slate-950 font-bold py-3 min-h-[56px]"
          >
            실시간 차트 시작
          </button>
        </div>

        <div className="mt-4 border-t border-slate-700 pt-3">
          <p className="text-sm font-semibold">과거 조회 기간</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-sm">
              시작 월
              <select
                className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-900 px-3 py-3"
                value={historyFromMonth}
                onChange={(event) => setHistoryFromMonth(event.target.value)}
                onPointerDown={stopTapPropagation}
              >
                {monthOptions.map((month) => (
                  <option key={`from-${month}`} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              종료 월
              <select
                className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-900 px-3 py-3"
                value={historyToMonth}
                onChange={(event) => setHistoryToMonth(event.target.value)}
                onPointerDown={stopTapPropagation}
              >
                {monthOptions.map((month) => (
                  <option key={`to-${month}`} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {historyError ? <p className="mt-2 status-pill text-rose-200">{historyError}</p> : null}
          <div className="mt-3">
            <button
              type="button"
              onPointerDown={stopTapPropagation}
              onClick={launchHistory}
              className="rounded-xl bg-indigo-400 text-slate-950 font-bold py-3 min-h-[56px]"
              disabled={!historyRangeValid}
              aria-label="과거 차트 시작"
            >
              과거 차트 시작
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">지원 종목</h2>
        <ul className="mt-2 grid gap-2" role="list">
          {stocks.map((stock) => (
            <li key={stock.ticker} className="status-pill" role="listitem">
              {stock.name}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">명령 기록</h2>
        <p className="text-sm mt-2">
          <span className="font-semibold">마지막 명령:</span> {lastCommand || "없음"}
        </p>
        <p className="text-sm mt-2">
          <span className="font-semibold">마지막 안내:</span> {lastResponse || "없음"}
        </p>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">빠른 명령 예시</h2>
        <p className="text-sm mt-2">음성 입력을 사용할 수 없을 때 선택하세요.</p>
        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            className="rounded-lg border border-cyan-300 px-3 py-3 text-left"
            onPointerDown={stopTapPropagation}
            onClick={() => onSubmitText("삼성전자 1분 실시간 차트")}
          >
            삼성전자 1분 실시간 차트
          </button>
          <button
            type="button"
            className="rounded-lg border border-cyan-300 px-3 py-3 text-left"
            onPointerDown={stopTapPropagation}
            onClick={() => onSubmitText("삼성전자 5분 실시간 차트")}
          >
            삼성전자 5분 실시간 차트
          </button>
          <button
            type="button"
            className="rounded-lg border border-cyan-300 px-3 py-3 text-left"
            onPointerDown={stopTapPropagation}
            onClick={() => onSubmitText("삼성전자 2025년 6월부터 2025년 12월까지 과거 차트")}
          >
            삼성전자 2025년 6월부터 12월까지 과거 차트
          </button>
        </div>
      </section>

      <button
        type="button"
        className="fixed left-3 right-3 bottom-3 mx-auto max-w-[430px] rounded-xl bg-cyan-400 text-slate-950 font-bold py-3 min-h-[56px]"
        onPointerDown={stopTapPropagation}
        onClick={onStartVoiceCommand}
      >
        음성 명령 시작
      </button>
    </main>
  );
}
