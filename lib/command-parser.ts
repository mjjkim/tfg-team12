import type { Stock } from "@/types/stock";

export interface ParsedCommand {
  mode: "LIVE" | "HISTORY";
  stock?: Stock;
  interval?: 1 | 3 | 5;
  from?: string;
  to?: string;
  missing: string[];
  raw: string;
}

interface IntervalItem {
  regex: RegExp;
  value: 1 | 3 | 5;
}

const INTERVAL_PATTERNS: IntervalItem[] = [
  {
    regex: /(?:1\s*(?:분봉|분|minute|m\b)|일\s*분)/,
    value: 1
  },
  {
    regex: /(?:3\s*(?:분봉|분|minute|m\b)|삼\s*분)/,
    value: 3
  },
  {
    regex: /(?:5\s*(?:분봉|분|minute|m\b)|오\s*분)/,
    value: 5
  }
];

const MONTH_RANGE_REGEX = /(\d{4})\s*(?:년\s*|[./-]\s*|\s+)(\d{1,2})\s*월?\s*(?:부터|에서|~|-|–|to)\s*(\d{4})\s*(?:년\s*|[./-]\s*|\s+)(\d{1,2})\s*월?/;
const MONTH_ONLY_REGEX = /(\d{4})\s*(?:년\s*|[./-]\s*|\s+)(\d{1,2})\s*월?/;

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function normalizeForCompare(value: string): string {
  return normalizeText(value).replace(/\s+/g, "");
}

function monthToDate(year: number, month: number, isFrom: boolean): string {
  const targetMonth = Math.max(1, Math.min(12, month));
  if (isFrom) {
    return new Date(year, targetMonth - 1, 1).toISOString().slice(0, 10);
  }
  return new Date(year, targetMonth, 0).toISOString().slice(0, 10);
}

function matchStock(input: string, stocks: readonly Stock[]): Stock | undefined {
  const normalized = normalizeForCompare(input);

  return stocks.find((stock) => {
    const aliasMatch = stock.aliases.some((alias) => normalized.includes(normalizeForCompare(alias)));
    const nameMatch = normalized.includes(normalizeForCompare(stock.name));
    const tickerMatch = normalized.includes(stock.ticker);
    return aliasMatch || nameMatch || tickerMatch;
  });
}

export function parseDemoCommand(rawInput: string, stocks: readonly Stock[]): ParsedCommand {
  const input = normalizeText(rawInput);
  const stock = matchStock(input, stocks);

  let interval: 1 | 3 | 5 | undefined;
  for (const item of INTERVAL_PATTERNS) {
    if (item.regex.test(input)) {
      interval = item.value;
      break;
    }
  }

  let from: string | undefined;
  let to: string | undefined;

  const rangeMatch = input.match(MONTH_RANGE_REGEX);
  if (rangeMatch) {
    const [, y1, m1, y2, m2] = rangeMatch;
    from = monthToDate(Number(y1), Number(m1), true);
    to = monthToDate(Number(y2), Number(m2), false);
  } else {
    const onlyMonth = input.match(MONTH_ONLY_REGEX);
    if (onlyMonth) {
      const [, y, m] = onlyMonth;
      from = monthToDate(Number(y), Number(m), true);
      to = monthToDate(Number(y), Number(m), false);
    }
  }

  const hasHistoryKeyword = /(?:과거|역사|히스토리|history|past|demo)/.test(input);
  const hasLiveKeyword = /(?:실시간|라이브|현재|live|realtime)/.test(input);
  const hasDate = Boolean(from && to);
  const isHistory = (hasHistoryKeyword || hasDate) && !hasLiveKeyword;

  const missing: string[] = [];
  if (!stock) missing.push("stock");
  if (!interval && !isHistory) missing.push("interval");
  if (isHistory && !(from && to)) missing.push("date");

  return {
    mode: isHistory ? "HISTORY" : "LIVE",
    stock,
    interval,
    from,
    to,
    missing,
    raw: rawInput
  };
}

export function resolveMissingPrompt(parsed: ParsedCommand): string {
  if (parsed.missing.includes("stock")) {
    return "종목을 선택해 주세요. 삼성전자, SK하이닉스, 현대자동차, 네이버, 카카오 중에서 고를 수 있습니다.";
  }

  if (parsed.mode === "HISTORY" && parsed.missing.includes("date")) {
    return "조회 기간을 말씀해 주세요. 예를 들면 2025년 6월부터 2025년 12월까지입니다.";
  }

  if (parsed.missing.includes("interval")) {
    return "차트 주기를 1분, 3분, 5분 중에서 선택해 주세요.";
  }

  return "명령에 필요한 정보가 부족합니다.";
}
