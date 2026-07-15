import { NextResponse } from "next/server";
import { STOCKS } from "@/lib/stocks";
import type { VoiceAgentDecision, VoiceAgentMessage } from "@/types/voice-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 500;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-luna";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    decision: {
      type: "string",
      enum: ["ASK", "START_LIVE", "START_HISTORY"]
    },
    speech: { type: "string" },
    stockTicker: {
      type: "string",
      enum: ["", ...STOCKS.map((stock) => stock.ticker)]
    },
    interval: {
      type: "integer",
      enum: [0, 1, 3, 5]
    },
    from: { type: "string" },
    to: { type: "string" }
  },
  required: ["decision", "speech", "stockTicker", "interval", "from", "to"],
  additionalProperties: false
} as const;

const stockGuide = STOCKS.map(
  (stock) => `${stock.name} (${stock.ticker}; aliases: ${stock.aliases.join(", ")})`
).join("\n");

const SYSTEM_PROMPT = `You control the next step of a Korean voice interface for a synthetic stock-chart demo.

The user can do exactly one of these actions:
1. START_LIVE: requires a supported stock and an interval of 1, 3, or 5 minutes.
2. START_HISTORY: requires a supported stock, a start month, and an end month within 2025.

Supported stocks:
${stockGuide}

Rules:
- Read the full recent conversation and preserve information the user already supplied.
- If the intended action or any required field is missing or ambiguous, return ASK and ask only the next most useful question.
- Ask one short question at a time. Do not ask again for information already given.
- Never infer or use a default stock or date range for START_HISTORY.
- If a history request has a stock but no complete month range, ask in Korean which year/month to start and end with, for example: "몇 년 몇 월부터 몇 년 몇 월까지 조회할까요?"
- If the user gives a month without a year, use 2025. Convert a start month to its first day and an end month to its last day.
- Only return START_LIVE or START_HISTORY when every required field is known and valid.
- For ASK, use empty stockTicker/from/to and interval 0 unless that field is already known. You may preserve known fields.
- For START_LIVE, set from/to to empty strings.
- For START_HISTORY, set interval to 0 and use YYYY-MM-DD dates.
- speech must be a natural, concise Korean sentence suitable for text-to-speech. For an action, briefly confirm what will start.
- Never claim to trade, buy, sell, or access real market data. If asked for an unsupported task, briefly explain the two available chart actions and ask which one they want.`;

interface OpenAIResponse {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
  error?: { message?: string };
}

function isVoiceAgentMessage(value: unknown): value is VoiceAgentMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<VoiceAgentMessage>;
  return (
    (message.role === "assistant" || message.role === "user") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= MAX_MESSAGE_LENGTH
  );
}

function extractOutputText(response: OpenAIResponse): string | null {
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }
  return null;
}

function isIsoDate(value: string): boolean {
  if (!/^2025-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateDecision(value: unknown): VoiceAgentDecision | null {
  if (!value || typeof value !== "object") return null;
  const decision = value as Partial<VoiceAgentDecision>;
  const validDecision =
    decision.decision === "ASK" ||
    decision.decision === "START_LIVE" ||
    decision.decision === "START_HISTORY";

  if (!validDecision || typeof decision.speech !== "string" || !decision.speech.trim()) {
    return null;
  }

  const stockTicker = typeof decision.stockTicker === "string" ? decision.stockTicker : "";
  const interval = decision.interval;
  const from = typeof decision.from === "string" ? decision.from : "";
  const to = typeof decision.to === "string" ? decision.to : "";

  if (![0, 1, 3, 5].includes(interval as number)) return null;
  if (stockTicker && !STOCKS.some((stock) => stock.ticker === stockTicker)) return null;

  if (decision.decision === "START_LIVE") {
    if (!stockTicker || (interval !== 1 && interval !== 3 && interval !== 5)) return null;
    if (from || to) return null;
  }

  if (decision.decision === "START_HISTORY") {
    if (!stockTicker || interval !== 0 || !isIsoDate(from) || !isIsoDate(to) || from > to) {
      return null;
    }
  }

  return {
    decision: decision.decision,
    speech: decision.speech.trim().slice(0, 240),
    stockTicker,
    interval: interval as 0 | 1 | 3 | 5,
    from,
    to
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY가 설정되지 않았습니다. .env.local을 확인해 주세요." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  const messages =
    body && typeof body === "object" && Array.isArray((body as { messages?: unknown }).messages)
      ? (body as { messages: unknown[] }).messages
      : null;

  if (!messages || messages.length === 0 || messages.length > MAX_MESSAGES || !messages.every(isVoiceAgentMessage)) {
    return NextResponse.json({ error: "대화 내용이 올바르지 않습니다." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  try {
    const openAIResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
        store: false,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((message) => ({ role: message.role, content: message.content }))
        ],
        text: {
          format: {
            type: "json_schema",
            name: "voice_agent_decision",
            schema: RESPONSE_SCHEMA,
            strict: true
          }
        }
      }),
      signal: controller.signal,
      cache: "no-store"
    });

    const responseBody = (await openAIResponse.json()) as OpenAIResponse;
    if (!openAIResponse.ok) {
      console.error("OpenAI Responses API error", openAIResponse.status, responseBody.error?.message);
      return NextResponse.json({ error: "LLM 요청을 처리하지 못했습니다." }, { status: 502 });
    }

    const outputText = extractOutputText(responseBody);
    if (!outputText) {
      return NextResponse.json({ error: "LLM이 실행 가능한 응답을 반환하지 않았습니다." }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      return NextResponse.json({ error: "LLM 응답을 해석하지 못했습니다." }, { status: 502 });
    }

    const decision = validateDecision(parsed);
    if (!decision) {
      return NextResponse.json({ error: "LLM 응답에 필요한 정보가 부족합니다." }, { status: 502 });
    }

    return NextResponse.json(decision, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "LLM 응답 시간이 초과되었습니다." }, { status: 504 });
    }
    console.error("Voice agent route failed", error);
    return NextResponse.json({ error: "LLM 연결 중 오류가 발생했습니다." }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
