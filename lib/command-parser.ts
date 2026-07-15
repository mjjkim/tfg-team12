import type { Stock } from '@/types/stock';

export interface ParsedCommand {
  mode: 'LIVE' | 'HISTORY';
  stock?: Stock;
  interval?: 1 | 3 | 5;
  from?: string;
  to?: string;
  missing: string[];
  raw: string;
}

const INTERVAL_PATTERNS: Array<{ regex: RegExp; value: 1 | 3 | 5 }> = [
  { regex: /(?:1|일)\s*분봉/g, value: 1 },
  { regex: /(?:3|삼)\s*분봉/g, value: 3 },
  { regex: /(?:5|오)\s*분봉/g, value: 5 }
];

const MONTH_RANGE_REGEX = /(\d{4})\s*년\s*(\d{1,2})\s*월\s*부터\s*(\d{4})\s*년\s*(\d{1,2})\s*월\s*까지/;
const MONTH_ONLY_REGEX = /\b(\d{4})\s*년\s*(\d{1,2})\s*월\b/;

function matchStock(text: string, stocks: readonly Stock[]): Stock | undefined {
  return stocks.find((stock) => {
    const matchedAlias = stock.aliases.some((alias) => text.includes(alias.toLowerCase()));
    const matchedTicker = text.includes(stock.ticker.toLowerCase());
    return matchedAlias || matchedTicker;
  });
}

function monthToDate(year: number, month: number, isFrom: boolean): string {
  const start = new Date(year, month - 1, isFrom ? 1 : 0);
  if (isFrom) {
    return start.toISOString().slice(0, 10);
  }
  const end = new Date(year, month, 0);
  return end.toISOString().slice(0, 10);
}

function normalizeKoreanMonth(month: number): number {
  return Math.max(1, Math.min(12, month));
}

export function parseDemoCommand(rawInput: string, stocks: readonly Stock[]): ParsedCommand {
  const input = rawInput.toLowerCase();
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

  const range = input.match(MONTH_RANGE_REGEX);
  if (range) {
    const [, y1, m1, y2, m2] = range;
    from = monthToDate(Number(y1), normalizeKoreanMonth(Number(m1)), true);
    to = monthToDate(Number(y2), normalizeKoreanMonth(Number(m2)), false);
  } else {
    const single = input.match(MONTH_ONLY_REGEX);
    if (single) {
      const [, y, m] = single;
      const year = Number(y);
      const month = normalizeKoreanMonth(Number(m));
      from = monthToDate(year, month, true);
      to = monthToDate(year, month, false);
    }
  }

  const hasHistoryKeyword = /(과거|히스토리|과거의|범위|월부터|월까지)/.test(input);
  const hasLiveKeyword = /(실시간|라이브|현재)/.test(input);
  const looksLikeHistoryDate = !!(from && to && /월/.test(input));
  const isHistory = (hasHistoryKeyword || looksLikeHistoryDate) && !hasLiveKeyword;

  const missing: string[] = [];
  if (!stock) missing.push('stock');
  if (!interval && !isHistory) missing.push('interval');
  if (isHistory && !(from && to)) missing.push('date');

  return {
    mode: isHistory ? 'HISTORY' : 'LIVE',
    stock,
    interval,
    from,
    to,
    missing,
    raw: rawInput
  };
}

export function resolveMissingPrompt(parsed: ParsedCommand): string {
  if (parsed.missing.includes('stock')) {
    return '삼성전자, SK하이닉스, 현대차, 네이버, 카카오 중 어떤 회사의 차트를 볼까요?';
  }
  if (parsed.mode === 'HISTORY' && parsed.missing.includes('date')) {
    return '2025년 6월부터 2025년 12월까지와 같이 기간을 말씀해 주세요.';
  }
  if (parsed.missing.includes('interval')) {
    return '1분봉, 3분봉, 5분봉 중 어떤 봉을 말해 주세요.';
  }
  return '명령을 조금 더 구체적으로 말씀해 주세요.';
}
