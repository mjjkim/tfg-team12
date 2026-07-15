"use client";

import { useCallback, useState } from "react";
import type { AppMode, Stock } from "@/types/stock";
import type { DailyCandle, TimeSeriesAnalysis } from "@/types/analysis";
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
import { parseDemoCommand, resolveMissingPrompt } from "@/lib/command-parser";
import { getDailyCandlesRange } from "@/lib/demo-data-generator";
import { analyzeTimeSeries } from "@/lib/time-series-analysis";
import { buildTrendIntro, buildTrendOutro } from "@/lib/trend-narration";
import { answerHistoryQuestion } from "@/lib/history-question-answerer";
import { downsampleSeries, formatPrice, formatVolume } from "@/lib/formatters";

type ManualMode = "HOME_COMMAND" | "HISTORY_QUESTION" | "EXIT_LIVE" | "EXIT_HISTORY" | null;

function isAffirmative(text: string): boolean {
  return /(yes|ok|correct|go|exit|leave|exit app|move)/i.test(text);
}

function isNegative(text: string): boolean {
  return /(no|not|continue|stay|keep|cancel)/i.test(text);
}

function statusFromMode(mode: AppMode, isListening: boolean, isSpeaking: boolean): string {
  if (isListening) return "listening";
  if (isSpeaking) return "speaking";
  if (mode === "LIVE_CHART" || mode === "LIVE_SETUP") return "running";
  if (mode === "HISTORY_CHART") return "analyzing";
  return "idle";
}

function monthLabel(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00`);
  return `${date.getFullYear()}/${date.getMonth() + 1}`;
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
  const [lastResponse, setLastResponse] = useState("Tap twice on home screen to start voice input.");
  const [errorText, setErrorText] = useState<string | undefined>(undefined);
  const [manualMode, setManualMode] = useState<ManualMode>(null);
  const [historyQuestionLog, setHistoryQuestionLog] = useState<Array<{ question: string; answer: string }>>([]);
  const [historyReadyForQuestion, setHistoryReadyForQuestion] = useState(false);
  const [historyPlaybackIndex, setHistoryPlaybackIndex] = useState<number | null>(null);
  const [isBusy, setBusy] = useState(false);

  const sonification = useSonification();

  const liveDemo = useLiveDemo({
    stock: selectedStock,
    interval: liveInterval,
    enabled: appMode === "LIVE_CHART",
    onCandleStart: ({ stockName, interval, startPrice }) => {
      void speak(`${stockName} ${interval} minute candle started. Start price ${formatPrice(startPrice)}.`);
    },
    onChangeTone: () => {
      // managed in hook
    }
  });

  const heartbeatPulse = useHeartbeat(appMode === "LIVE_CHART");

  const manualConfig = {
    HOME_COMMAND: {
      title: "Enter command text instead of voice.",
      examples: [
        "show live chart",
        "Samsung Electronics 5 minute chart",
        "Samsung Electronics 2025/06 to 2025/12 history chart"
      ]
    },
    HISTORY_QUESTION: {
      title: "Ask a question about the analyzed period.",
      examples: [
        "largest up move?",
        "largest down move?",
        "highest price?",
        "lowest price?",
        "which is sideways?"
      ]
    },
    EXIT_LIVE: {
      title: "Please say or type yes/no.",
      examples: ["yes", "no"]
    },
    EXIT_HISTORY: {
      title: "Please say or type yes/no.",
      examples: ["yes", "no"]
    }
  } as const;

  const resetToHome = useCallback(() => {
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
    setLastResponse("Tap twice on home screen to start voice input.");
  }, [sonification, stopSpeaking]);

  const executeCommand = useCallback(
    async (raw: string) => {
      setLastCommand(raw);
      setErrorText(undefined);
      const parsed = parseDemoCommand(raw, STOCKS);

      if (parsed.missing.length > 0) {
        const prompt = resolveMissingPrompt(parsed);
        setLastResponse(prompt);
        await speak(prompt);
        return;
      }

      if (parsed.mode === "LIVE") {
        if (!parsed.stock || !parsed.interval) {
          const prompt = resolveMissingPrompt(parsed);
          setLastResponse(prompt);
          await speak(prompt);
          return;
        }
        setSelectedStock(parsed.stock);
        setLiveInterval(parsed.interval);
        setHistoryCandles([]);
        setAnalysis(null);
        setHistoryQuestionLog([]);
        setHistoryReadyForQuestion(false);
        setHistoryPlaybackIndex(null);
        setAppMode("LIVE_CHART");

        const intro =
          `${parsed.stock.name} ${parsed.interval} minute demo starts.` +
          " This is synthetic data." +
          " Double tap: quote+volume, triple tap: exit.";
        setLastResponse(intro);
        await speak(intro);
        return;
      }

      if (!parsed.stock || !parsed.from || !parsed.to) {
        const prompt = resolveMissingPrompt(parsed);
        setLastResponse(prompt);
        await speak(prompt);
        return;
      }

      const candles = getDailyCandlesRange(parsed.stock, parsed.from, parsed.to);
      if (candles.length === 0) {
        const msg = "No candles in selected range.";
        setLastResponse(msg);
        await speak(msg);
        return;
      }

      const result = analyzeTimeSeries(parsed.stock, candles);
      setSelectedStock(parsed.stock);
      setHistoryFrom(parsed.from);
      setHistoryTo(parsed.to);
      setHistoryCandles(candles);
      setAnalysis(result);
      setHistoryQuestionLog([]);
      setHistoryReadyForQuestion(false);
      setHistoryPlaybackIndex(null);
      setAppMode("HISTORY_CHART");

      const intro = `${parsed.stock.name} ${monthLabel(parsed.from)} to ${monthLabel(parsed.to)} history demo loaded.`;
      setLastResponse(intro);
      await speak(intro);
    },
    [speak]
  );

  const runHomeVoice = useCallback(async () => {
    setBusy(true);
    setErrorText(undefined);
    setManualMode(null);

    const prompt = "What do you want to do? live chart or history chart?";
    setLastResponse(prompt);

    if (!speechSupported) {
      setManualMode("HOME_COMMAND");
      setBusy(false);
      return;
    }

    try {
      await speak(prompt);
      const text = await listen();
      if (!text) {
        setManualMode("HOME_COMMAND");
        return;
      }
      await executeCommand(text);
    } catch {
      setManualMode("HOME_COMMAND");
      setErrorText("Voice input failed.");
    } finally {
      setBusy(false);
    }
  }, [executeCommand, listen, speechSupported, speak]);

  const runExitFlow = useCallback(async (type: "LIVE" | "HISTORY") => {
    setBusy(true);

    const prompt = type === "LIVE" ? "Exit live chart? say yes or no." : "Exit history chart? say yes or no.";
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
        await speak("Back to home.");
        return;
      }
      if (isNegative(text)) {
        await speak("Continue current screen.");
        return;
      }

      setManualMode(type === "LIVE" ? "EXIT_LIVE" : "EXIT_HISTORY");
      await speak("Please say or type yes or no.");
    } catch {
      setManualMode(type === "LIVE" ? "EXIT_LIVE" : "EXIT_HISTORY");
      setErrorText("Exit command failed.");
    } finally {
      setBusy(false);
    }
  }, [listen, resetToHome, speechSupported, speak]);

  const runLiveDoubleTap = useCallback(async () => {
    if (!selectedStock) return;
    if (!liveDemo.isRunning) {
      const msg = "Live demo is not running yet.";
      setLastResponse(msg);
      await speak(msg);
      return;
    }

    const direction =
      liveDemo.changeRate >= 0.3
        ? `${Math.abs(liveDemo.changeRate).toFixed(1)}% up`
        : liveDemo.changeRate <= -0.3
          ? `${Math.abs(liveDemo.changeRate).toFixed(1)}% down`
          : "sideways";

    const msg =
      `${selectedStock.name} price ${formatPrice(liveDemo.currentPrice)}. ` +
      `Current ${liveInterval} minute candle volume ${formatVolume(liveDemo.candleVolume)}. ` +
      `${direction}.`;
    setLastResponse(msg);
    await speak(msg);
  }, [liveDemo.changeRate, liveDemo.candleVolume, liveDemo.currentPrice, liveDemo.isRunning, liveInterval, selectedStock, speak]);

  const runHistoryQuestionFlow = useCallback(async () => {
    setBusy(true);

    try {
      if (!analysis || historyCandles.length === 0) {
        const msg = "No history analysis available.";
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
        setLastResponse("Ask a question via text.");
        return;
      }

      await speak("What do you want to ask?");
      const text = (await listen()).trim();
      if (!text) {
        setManualMode("HISTORY_QUESTION");
        return;
      }

      const answer = answerHistoryQuestion(text, analysis);
      setHistoryQuestionLog((prev) => [...prev, { question: text, answer }].slice(-6));
      setLastResponse(answer);
      await speak(answer);
    } catch {
      setManualMode("HISTORY_QUESTION");
      setErrorText("question failed");
    } finally {
      setBusy(false);
    }
  }, [analysis, historyCandles, historyReadyForQuestion, listen, speechSupported, sonification, speak]);

  const submitManual = useCallback(async (text: string) => {
    setManualMode(null);
    setErrorText(undefined);

    if (!text.trim()) return;

    if (manualMode === "HOME_COMMAND") {
      await executeCommand(text);
      return;
    }

    if (manualMode === "HISTORY_QUESTION") {
      if (!analysis) {
        const msg = "No analysis target";
        setLastResponse(msg);
        await speak(msg);
        return;
      }
      const answer = answerHistoryQuestion(text, analysis);
      setHistoryQuestionLog((prev) => [...prev, { question: text, answer }].slice(-6));
      setLastResponse(answer);
      await speak(answer);
      return;
    }

    if (manualMode === "EXIT_LIVE" || manualMode === "EXIT_HISTORY") {
      const normalized = text.toLowerCase();
      if (isAffirmative(normalized)) {
        resetToHome();
        await speak("Back to home.");
        return;
      }
      if (isNegative(normalized)) {
        await speak("Continue current screen.");
        return;
      }
      setManualMode(manualMode);
      await speak("Please choose yes or no.");
    }
  }, [analysis, executeCommand, manualMode, resetToHome, speak]);

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
      ? manualConfig.HOME_COMMAND
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
          onSubmitText={(text) => {
            setManualMode(null);
            void executeCommand(text);
          }}
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
          onTap={historyHandler.onTap}
        />
      )}

      {appMode === "HISTORY_CHART" && historyQuestionLog.length > 0 ? (
        <section className="card mt-2">
          <h2 className="text-lg font-bold">Question history</h2>
          <ul className="mt-2 text-sm space-y-1" role="list">
            {historyQuestionLog.map((item) => (
              <li key={`${item.question}-${item.answer}`} role="listitem">
                <p>
                  <strong>Q:</strong> {item.question}
                </p>
                <p>
                  <strong>A:</strong> {item.answer}
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