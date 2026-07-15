"use client";

import { useCallback, useRef, useState } from "react";
import type { AppMode, Stock } from "@/types/stock";
import type { DailyCandle, TimeSeriesAnalysis } from "@/types/analysis";
import type { VoiceAgentDecision, VoiceAgentMessage } from "@/types/voice-agent";
import { useMultiTap } from "@/hooks/use-multi-tap";
import { useSonification } from "@/hooks/use-sonification";
import { useSpeech } from "@/hooks/use-speech";
import { useLiveDemo } from "@/hooks/use-live-demo";
import { useHeartbeat } from "@/hooks/use-heartbeat";
import HomeScreen from "@/components/home-screen";
import LiveChartScreen from "@/components/live-chart-screen";
import HistoryChartScreen from "@/components/history-chart-screen";
import VoiceStatus from "@/components/voice-status";
import FallbackControls from "@/components/fallback-controls";
import { STOCKS } from "@/lib/stocks";
import { getDailyCandlesRange } from "@/lib/demo-data-generator";
import { analyzeTimeSeries } from "@/lib/time-series-analysis";
import { buildTrendIntro, buildTrendOutro } from "@/lib/trend-narration";
import { answerHistoryQuestion } from "@/lib/history-question-answerer";
import { downsampleSeries } from "@/lib/formatters";

type ManualMode = "HOME_COMMAND" | "HISTORY_QUESTION" | "EXIT_LIVE" | "EXIT_HISTORY" | null;

const INITIAL_HOME_PROMPT = "무엇을 도와드릴까요? 실시간 차트 또는 과거 차트를 말씀해 주세요.";
const MAX_HOME_MESSAGES = 12;
const MAX_VOICE_TURNS = 6;

async function requestVoiceAgent(messages: VoiceAgentMessage[]): Promise<VoiceAgentDecision> {
  const response = await fetch("/api/voice-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("인공지능 응답을 읽지 못했습니다.");
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "인공지능 요청에 실패했습니다.";
    throw new Error(message);
  }

  return body as VoiceAgentDecision;
}

function isAffirmative(text: string): boolean {
  return /(네|예|응|좋아|확인|나가기|종료|홈으로|이동|yes|ok|correct|go|exit|leave|exit app|move)/i.test(text);
}

function isNegative(text: string): boolean {
  return /(아니|아니요|계속|취소|머물|no|not|continue|stay|keep|cancel)/i.test(text);
}

function statusFromMode(mode: AppMode, isListening: boolean, isSpeaking: boolean): string {
  if (isListening) return "음성을 듣고 있어요";
  if (isSpeaking) return "안내 음성을 재생하고 있어요";
  if (mode === "LIVE_CHART" || mode === "LIVE_SETUP") return "실시간 차트 실행 중";
  if (mode === "HISTORY_CHART") return "과거 차트 분석 중";
  return "대기 중";
}

function monthLabel(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00`);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function monthRangeFromSimple(monthText: string, isEndOfMonth: boolean): string {
  const [yearText, monthTextPart] = monthText.split("-");
  const year = Number(yearText);
  const month = Number(monthTextPart);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return `${monthText}-01`;
  }

  const start = new Date(year, month - 1, 1);
  if (!isEndOfMonth) {
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  }

  const end = new Date(year, month, 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}

export default function Page() {
  const { speak, listen, stopSpeaking, isListening, isSpeaking, isSupported: speechSupported } = useSpeech();

  const [appMode, setAppMode] = useState<AppMode>("HOME");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [liveInterval, setLiveInterval] = useState<1 | 3 | 5>(1);
  const [historyFrom, setHistoryFrom] = useState("2025-06-01");
  const [historyTo, setHistoryTo] = useState("2025-12-31");
  const [historyCandles, setHistoryCandles] = useState<DailyCandle[]>([]);
  const [analysis, setAnalysis] = useState<TimeSeriesAnalysis | null>(null);
  const [lastCommand, setLastCommand] = useState("");
  const [lastResponse, setLastResponse] = useState("홈 화면을 두 번 탭하면 음성 명령을 시작합니다.");
  const [errorText, setErrorText] = useState<string | undefined>(undefined);
  const [manualMode, setManualMode] = useState<ManualMode>(null);
  const [historyQuestionLog, setHistoryQuestionLog] = useState<Array<{ question: string; answer: string }>>([]);
  const [historyReadyForQuestion, setHistoryReadyForQuestion] = useState(false);
  const [historyPlaybackIndex, setHistoryPlaybackIndex] = useState<number | null>(null);
  const [isBusy, setBusy] = useState(false);
  const homeConversationRef = useRef<VoiceAgentMessage[]>([]);

  const sonification = useSonification();

  const liveDemo = useLiveDemo({
    stock: selectedStock,
    interval: liveInterval,
    enabled: appMode === "LIVE_CHART",
    onCandleStart: ({ startPrice }) => {
      void speak(`${startPrice}`, { rate: 1.5 });
    },
    onChangeTone: () => {
      // managed in hook
    }
  });

  const heartbeatPulse = useHeartbeat(appMode === "LIVE_CHART");

  const manualConfig = {
    HOME_COMMAND: {
      title: "음성 대신 명령을 글자로 입력해 주세요.",
      examples: [
        "실시간 차트 보여줘",
        "삼성전자 5분 실시간 차트",
        "삼성전자 과거 차트 보여줘"
      ]
    },
    HISTORY_QUESTION: {
      title: "분석한 기간에 관해 질문해 주세요.",
      examples: [
        "가장 많이 오른 구간은?",
        "가장 많이 내린 구간은?",
        "최고가는?",
        "최저가는?",
        "횡보 구간은?"
      ]
    },
    EXIT_LIVE: {
      title: "네 또는 아니요라고 말하거나 입력해 주세요.",
      examples: ["네", "아니요"]
    },
    EXIT_HISTORY: {
      title: "네 또는 아니요라고 말하거나 입력해 주세요.",
      examples: ["네", "아니요"]
    }
  } as const;

  const resetToHome = useCallback(() => {
    homeConversationRef.current = [];
    setAppMode("HOME");
    setSelectedStock(null);
    setHistoryCandles([]);
    setAnalysis(null);
    setHistoryFrom("2025-06-01");
    setHistoryTo("2025-12-31");
    setHistoryQuestionLog([]);
    setHistoryReadyForQuestion(false);
    setHistoryPlaybackIndex(null);
    sonification.stop();
    stopSpeaking();
    setManualMode(null);
    setLastResponse("홈 화면을 두 번 탭하면 음성 명령을 시작합니다.");
  }, [sonification, stopSpeaking]);

  const findStockByTicker = (ticker: string): Stock | undefined =>
    STOCKS.find((stock) => stock.ticker === ticker || stock.name === ticker);

  const executeHistoryStart = useCallback(
    async (stock: Stock, from: string, to: string, forceSpeak = true, announcement?: string) => {
      const candles = getDailyCandlesRange(stock, from, to);
      if (candles.length === 0) {
        const msg = "선택한 기간에 표시할 데이터가 없습니다.";
        setLastResponse(msg);
        if (forceSpeak) {
          await speak(msg);
        }
        return;
      }

      const result = analyzeTimeSeries(stock, candles);
      setSelectedStock(stock);
      setHistoryFrom(from);
      setHistoryTo(to);
      setHistoryCandles(candles);
      setAnalysis(result);
      setHistoryQuestionLog([]);
      setHistoryReadyForQuestion(false);
      setHistoryPlaybackIndex(null);
      setAppMode("HISTORY_CHART");

      const intro = announcement?.trim() || `${stock.name}의 과거 분석이 준비되었습니다.`;
      setLastResponse(intro);
      if (forceSpeak) {
        await speak(intro);
      }
    },
    [speak]
  );

  const startLiveBySelection = useCallback(
    async (ticker: string, interval: 1 | 3 | 5, announcement?: string) => {
      const stock = findStockByTicker(ticker);
      if (!stock) {
        const msg = "선택한 종목을 찾을 수 없습니다.";
        setLastResponse(msg);
        await speak(msg);
        return;
      }

      setSelectedStock(stock);
      setLiveInterval(interval);
      setHistoryCandles([]);
      setAnalysis(null);
      setHistoryQuestionLog([]);
      setHistoryReadyForQuestion(false);
      setHistoryPlaybackIndex(null);
      setAppMode("LIVE_CHART");

      const intro = announcement?.trim() || `${stock.name} ${interval}분 실시간 차트를 시작합니다.`;
      setLastResponse(intro);
      await speak(intro);
    },
    [speak]
  );

  const startHistoryBySelection = useCallback(
    async (ticker: string, fromMonth: string, toMonth: string) => {
      const stock = findStockByTicker(ticker);
      if (!stock) {
        const msg = "선택한 종목을 찾을 수 없습니다.";
        setLastResponse(msg);
        await speak(msg);
        return;
      }

      const from = monthRangeFromSimple(fromMonth, false);
      const to = monthRangeFromSimple(toMonth, true);
      await executeHistoryStart(stock, from, to);
    },
    [executeHistoryStart, speak]
  );

  const decideHomeAnswer = useCallback(async (raw: string): Promise<VoiceAgentDecision> => {
    const text = raw.trim();
    if (!text) throw new Error("음성 답변을 인식하지 못했습니다.");

    setLastCommand(text);
    setErrorText(undefined);
    const isHistoryRequest = /(?:과거|역사|히스토리|history|historical|past)/i.test(text);
    const isLiveRequest = /(?:실시간|라이브|live|realtime)/i.test(text);

    if (isHistoryRequest && !isLiveRequest) {
      homeConversationRef.current = [];
      return {
        decision: "START_HISTORY",
        speech: "과거 차트 분석을 시작합니다.",
        stockTicker: STOCKS[0]?.ticker ?? "005930",
        interval: 0,
        from: historyFrom,
        to: historyTo
      };
    }

    const userMessage: VoiceAgentMessage = { role: "user", content: text };
    const messages: VoiceAgentMessage[] = [...homeConversationRef.current, userMessage].slice(
      -(MAX_HOME_MESSAGES - 1)
    );

    const decision = await requestVoiceAgent(messages);
    const assistantMessage: VoiceAgentMessage = { role: "assistant", content: decision.speech };
    homeConversationRef.current = [...messages, assistantMessage].slice(-MAX_HOME_MESSAGES);

    return decision;
  }, [historyFrom, historyTo]);

  const applyHomeDecision = useCallback(
    async (decision: VoiceAgentDecision): Promise<boolean> => {
      if (decision.decision === "ASK") {
        setLastResponse(decision.speech);
        await speak(decision.speech);
        return false;
      }

      if (decision.decision === "START_LIVE") {
        if (decision.interval !== 1 && decision.interval !== 3 && decision.interval !== 5) {
          throw new Error("인공지능이 올바른 실시간 주기를 선택하지 못했습니다.");
        }
        homeConversationRef.current = [];
        await startLiveBySelection(decision.stockTicker, decision.interval, decision.speech);
        return true;
      }

      const stock = findStockByTicker(decision.stockTicker);
      if (!stock) throw new Error("인공지능이 올바른 종목을 선택하지 못했습니다.");

      homeConversationRef.current = [];
      await executeHistoryStart(stock, decision.from, decision.to, true, decision.speech);
      return true;
    },
    [executeHistoryStart, speak, startLiveBySelection]
  );

  const runHomeVoice = useCallback(async () => {
    if (isBusy) return;
    setBusy(true);
    setErrorText(undefined);
    setManualMode(null);

    const lastAssistantMessage = [...homeConversationRef.current]
      .reverse()
      .find((message) => message.role === "assistant");
    const prompt = lastAssistantMessage?.content || INITIAL_HOME_PROMPT;

    if (homeConversationRef.current.length === 0) {
      homeConversationRef.current = [{ role: "assistant", content: prompt }];
    }
    setLastResponse(prompt);

    if (!speechSupported) {
      setManualMode("HOME_COMMAND");
      setBusy(false);
      return;
    }

    try {
      await speak(prompt);

      for (let turn = 0; turn < MAX_VOICE_TURNS; turn += 1) {
        const text = (await listen()).trim();
        const decision = await decideHomeAnswer(text);
        const actionStarted = await applyHomeDecision(decision);
        if (actionStarted) return;
      }

      const limitMessage = "필요한 정보를 모두 확인하지 못했어요. 텍스트로 계속 입력해 주세요.";
      setLastResponse(limitMessage);
      setManualMode("HOME_COMMAND");
      await speak(limitMessage);
    } catch (error) {
      setManualMode("HOME_COMMAND");
      setErrorText(error instanceof Error ? error.message : "음성 대화를 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }, [applyHomeDecision, decideHomeAnswer, isBusy, listen, speechSupported, speak]);

  const runExitFlow = useCallback(async (type: "LIVE" | "HISTORY") => {
    setBusy(true);

    const prompt = type === "LIVE" ? "실시간 차트를 종료할까요? 네 또는 아니요라고 말씀해 주세요." : "과거 차트를 종료할까요? 네 또는 아니요라고 말씀해 주세요.";
    setLastResponse(prompt);

    try {
      if (!speechSupported) {
        setManualMode(type === "LIVE" ? "EXIT_LIVE" : "EXIT_HISTORY");
        return;
      }

      await speak(prompt);
      const text = (await listen()).toLowerCase();
      if (isAffirmative(text)) {
        resetToHome();
        await speak("홈 화면으로 돌아갑니다.");
        return;
      }
      if (isNegative(text)) {
        await speak("현재 화면을 계속 이용합니다.");
        return;
      }

      setManualMode(type === "LIVE" ? "EXIT_LIVE" : "EXIT_HISTORY");
      await speak("네 또는 아니요라고 말하거나 입력해 주세요.");
    } catch {
      setManualMode(type === "LIVE" ? "EXIT_LIVE" : "EXIT_HISTORY");
      setErrorText("종료 명령을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }, [listen, resetToHome, speechSupported, speak]);

  const runLiveDoubleTap = useCallback(async () => {
    if (!selectedStock) return;
    if (!liveDemo.isRunning) {
      const msg = "실시간 차트가 아직 실행되지 않았습니다.";
      setLastResponse(msg);
      await speak(msg);
      return;
    }

    const msg = `${liveDemo.currentPrice}`;
    setLastResponse(msg);
    await speak(msg, { rate: 1.45 });
  }, [liveDemo.currentPrice, liveDemo.isRunning, speak]);

  const answerHistoryQuestionWithText = useCallback(
    async (text: string) => {
      if (!analysis) return;

      const answer = answerHistoryQuestion(text, analysis);
      setHistoryQuestionLog((prev) => [...prev, { question: text, answer }].slice(-6));
      setLastResponse(answer);
      await speak(answer);
    },
    [analysis, speak]
  );

  const runHistoryQuestionFlow = useCallback(async () => {
    setBusy(true);

    try {
      if (!analysis || historyCandles.length === 0) {
        const msg = "확인할 수 있는 과거 분석 결과가 없습니다.";
        setLastResponse(msg);
        await speak(msg);
        return;
      }

      if (!historyReadyForQuestion) {
        const sampled = downsampleSeries(historyCandles, 48);
        const closes = sampled.map((row) => row.close);
        const indexMap = sampled.map((row) => historyCandles.findIndex((cand) => cand.time === row.time));
        const minPrice = Math.min(...sampled.map((row) => row.close));
        const maxPrice = Math.max(...sampled.map((row) => row.close));

        // 말 → 소리 → 말: ① 결론+시작값 음성
        const intro = buildTrendIntro(analysis);
        setLastResponse(intro);
        await speak(intro);

        // ② 형태 스윕(소리)
        await sonification.play(closes, minPrice, maxPrice, (index) => {
          const mapped = index >= 0 ? indexMap[index] : null;
          setHistoryPlaybackIndex(mapped === -1 ? null : mapped);
        });

        setHistoryReadyForQuestion(true);
        setHistoryPlaybackIndex(null);

        // ③ 끝값 못박기 + 요약 음성 (speech-based mark)
        await speak(buildTrendOutro(analysis));
        setLastResponse("You can ask questions by double-tap.");
        return;
      }

      if (!speechSupported) {
        setManualMode("HISTORY_QUESTION");
        setLastResponse("질문을 글자로 입력해 주세요.");
        return;
      }

      await speak("무엇이 궁금한가요?");
      const text = (await listen()).trim();
      if (!text) {
        setManualMode("HISTORY_QUESTION");
        return;
      }

      await answerHistoryQuestionWithText(text);
    } catch {
      setManualMode("HISTORY_QUESTION");
      setErrorText("질문을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }, [
    answerHistoryQuestionWithText,
    analysis,
    historyCandles,
    historyReadyForQuestion,
    listen,
    speechSupported,
    sonification,
    speak
  ]);

  const runHomeText = useCallback(
    async (text: string) => {
      if (!text.trim() || isBusy) return;

      setBusy(true);
      setManualMode(null);
      setErrorText(undefined);

      try {
        const decision = await decideHomeAnswer(text);
        const actionStarted = await applyHomeDecision(decision);
        if (!actionStarted) setManualMode("HOME_COMMAND");
      } catch (error) {
        setManualMode("HOME_COMMAND");
        setErrorText(error instanceof Error ? error.message : "LLM 대화를 처리하지 못했습니다.");
      } finally {
        setBusy(false);
      }
    },
    [applyHomeDecision, decideHomeAnswer, isBusy]
  );

  const submitManual = useCallback(async (text: string) => {
    setManualMode(null);
    setErrorText(undefined);

    if (!text.trim()) return;

    if (manualMode === "HOME_COMMAND") {
      await runHomeText(text);
      return;
    }

    if (manualMode === "HISTORY_QUESTION") {
      if (!analysis) {
        const msg = "질문할 분석 결과가 없습니다.";
        setLastResponse(msg);
        await speak(msg);
        return;
      }
      await answerHistoryQuestionWithText(text);
      return;
    }

    if (manualMode === "EXIT_LIVE" || manualMode === "EXIT_HISTORY") {
      const normalized = text.toLowerCase();
      if (isAffirmative(normalized)) {
        resetToHome();
        await speak("홈 화면으로 돌아갑니다.");
        return;
      }
      if (isNegative(normalized)) {
        await speak("현재 화면을 계속 이용합니다.");
        return;
      }
      setManualMode(manualMode);
      await speak("네 또는 아니요를 선택해 주세요.");
    }
  }, [analysis, answerHistoryQuestionWithText, manualMode, resetToHome, runHomeText, speak]);

  const homeHandler = useMultiTap({
    onDoubleTap: runHomeVoice,
    onTripleTap: () => Promise.resolve()
  });

  const liveHandler = useMultiTap({
    onDoubleTap: runLiveDoubleTap,
    onTripleTap: () => runExitFlow("LIVE")
  });

  const historyHandler = useMultiTap({
    onDoubleTap: runHistoryQuestionFlow,
    onTripleTap: () => runExitFlow("HISTORY")
  });

  const fallbackConfig =
    manualMode === "HOME_COMMAND"
      ? { ...manualConfig.HOME_COMMAND, title: lastResponse || manualConfig.HOME_COMMAND.title }
      : manualMode === "HISTORY_QUESTION"
        ? manualConfig.HISTORY_QUESTION
        : manualMode === "EXIT_LIVE"
          ? manualConfig.EXIT_LIVE
          : manualMode === "EXIT_HISTORY"
            ? manualConfig.EXIT_HISTORY
            : null;

  return (
    <div className="min-h-screen">
      <VoiceStatus
        isListening={isListening}
        isSpeaking={isSpeaking}
        micEnabled={speechSupported}
        statusText={statusFromMode(appMode, isListening, isSpeaking)}
        errorText={errorText}
      />

      {appMode === "HOME" && (
        <HomeScreen
          stocks={STOCKS}
          lastCommand={lastCommand}
          lastResponse={lastResponse}
          onStartVoiceCommand={runHomeVoice}
          onSubmitText={(text) => void runHomeText(text)}
          onLaunchLive={startLiveBySelection}
          onLaunchHistory={startHistoryBySelection}
          onTap={homeHandler.onTap}
        />
      )}

      {appMode === "LIVE_CHART" && selectedStock && (
        <LiveChartScreen
          stockName={selectedStock.name}
          interval={liveInterval}
          candles={liveDemo.candles}
          currentCandle={liveDemo.currentCandle}
          currentPrice={liveDemo.currentPrice}
          candleProgress={liveDemo.candleProgress}
          candleVolume={liveDemo.candleVolume}
          changeRate={liveDemo.changeRate}
          heartbeatPulse={heartbeatPulse}
          onSpeakState={runLiveDoubleTap}
          onExitRequest={() => runExitFlow("LIVE")}
          onTap={liveHandler.onTap}
        />
      )}

      {appMode === "HISTORY_CHART" && selectedStock && analysis && (
        <HistoryChartScreen
          stockName={selectedStock.name}
          from={historyFrom}
          to={historyTo}
          candles={historyCandles}
          analysis={analysis}
          playbackIndex={historyPlaybackIndex}
          isPlaying={sonification.isPlaying}
          isQuestionReady={historyReadyForQuestion}
          onPrimaryAction={runHistoryQuestionFlow}
          onAskQuestion={(text) => {
            void answerHistoryQuestionWithText(text);
          }}
          onExitRequest={() => runExitFlow("HISTORY")}
          questionPrompts={manualConfig.HISTORY_QUESTION.examples}
          onTap={historyHandler.onTap}
        />
      )}

      {appMode === "HISTORY_CHART" && historyQuestionLog.length > 0 ? (
        <section className="card mt-2">
          <h2 className="text-lg font-bold">질문 내역</h2>
          <ul className="mt-2 text-sm space-y-1" role="list">
            {historyQuestionLog.map((item) => (
              <li key={`${item.question}-${item.answer}`} role="listitem">
                <p>
                  <strong>질문:</strong> {item.question}
                </p>
                <p>
                  <strong>답변:</strong> {item.answer}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {fallbackConfig ? (
        <section className="fixed inset-x-0 bottom-0 p-3" style={{ maxWidth: '430px', margin: '0 auto' }}>
          <FallbackControls title={fallbackConfig.title} examples={fallbackConfig.examples} onSubmit={submitManual} />
        </section>
      ) : null}
    </div>
  );
}
