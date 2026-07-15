import type { Stock } from '@/types/stock';
import type { DailyCandle, TimeSeriesAnalysis, TimeSeriesSegment } from '@/types/analysis';
import { TREND_CONFIG } from './stocks';
import { formatDateForSpeech } from './formatters';

function movingAverage(values: number[], window: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    out.push(i >= window - 1 ? sum / Math.min(window, i + 1) : values[i]);
  }
  return out;
}

function volatility(closes: number[]): number {
  if (closes.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1];
    returns.push(Math.abs((closes[i] - prev) / prev) * 100);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / returns.length;
  return Number((Math.sqrt(variance)).toFixed(2));
}

function maxDrawdown(values: number[]): number {
  let peak = values[0] ?? 0;
  let dd = 0;
  for (const value of values) {
    if (value > peak) peak = value;
    const ratio = peak === 0 ? 0 : (peak - value) / peak;
    dd = Math.max(dd, ratio);
  }
  return Number((dd * 100).toFixed(2));
}

export function analyzeTimeSeries(stock: Stock, candles: DailyCandle[]): TimeSeriesAnalysis {
  const closes = candles.map((c) => c.close);
  const ma = movingAverage(closes, TREND_CONFIG.movingAverageWindow);

  const segments: TimeSeriesSegment[] = [];
  let current: TimeSeriesSegment | null = null;

  for (let i = 0; i + TREND_CONFIG.analysisWindow <= closes.length; i += 1) {
    const start = i;
    const end = i + TREND_CONFIG.analysisWindow - 1;
    const startPrice = closes[start];
    const endPrice = closes[end];
    const change = ((endPrice - startPrice) / startPrice) * 100;
    const type = change >= TREND_CONFIG.riseThresholdPct ? 'RISE' : change <= TREND_CONFIG.fallThresholdPct ? 'FALL' : 'SIDEWAYS';
    const windowCloses = closes.slice(start, end + 1);
    const segment: TimeSeriesSegment = {
      startDate: candles[start].time,
      endDate: candles[end].time,
      type,
      startPrice,
      endPrice,
      changePct: change,
      volatilityPct: volatility(windowCloses),
      maxDrawdownPct: maxDrawdown(windowCloses)
    };

    if (!current) {
      current = segment;
    } else if (current.type === type) {
      current.endDate = segment.endDate;
      current.endPrice = segment.endPrice;
      current.changePct = ((current.endPrice - current.startPrice) / current.startPrice) * 100;
      current.volatilityPct = (current.volatilityPct + segment.volatilityPct) / 2;
      current.maxDrawdownPct = Math.max(current.maxDrawdownPct, segment.maxDrawdownPct);
    } else {
      segments.push(current);
      current = segment;
    }
  }

  if (current) segments.push(current);

  const startPrice = closes[0] ?? 0;
  const endPrice = closes[closes.length - 1] ?? startPrice;
  const minPrice = Math.min(...closes);
  const maxPrice = Math.max(...closes);
  const lowIdx = closes.indexOf(minPrice);
  const highIdx = closes.indexOf(maxPrice);
  const avgVolume = Math.round(candles.reduce((acc, row) => acc + row.volume, 0) / Math.max(candles.length, 1));

  return {
    stock: { name: stock.name, ticker: stock.ticker },
    period: { from: candles[0]?.time ?? '', to: candles[candles.length - 1]?.time ?? '' },
    summary: {
      startPrice,
      endPrice,
      totalReturnPct: ((endPrice - startPrice) / startPrice) * 100,
      highestPrice: maxPrice,
      highestDate: candles[highIdx]?.time ?? '',
      lowestPrice: minPrice,
      lowestDate: candles[lowIdx]?.time ?? '',
      averageVolume: avgVolume,
      volatilityPct: ma.length ? (Math.min(...ma) > 0 ? ma.reduce((acc, value) => acc + value, 0) / ma.length / Math.max(startPrice, 1) * 100 : 0) : 0
    },
    segments
  };
}

export function describeAnalysis(analysis: TimeSeriesAnalysis): string {
  const lines: string[] = [];
  const header = `${analysis.stock.name}의 ${formatDateForSpeech(analysis.period.from)}부터 ${formatDateForSpeech(analysis.period.to)}까지 분석입니다.`;
  lines.push(header);

  if (analysis.segments.length === 0) {
    lines.push('구간 분류가 충분하지 않습니다.');
  } else {
    analysis.segments.slice(0, 4).forEach((segment) => {
      const verb =
        segment.type === 'RISE'
          ? `${segment.changePct.toFixed(1)}퍼센트 상승`
          : segment.type === 'FALL'
            ? `${Math.abs(segment.changePct).toFixed(1)}퍼센트 하락`
            : '횡보';
      lines.push(
        `${formatDateForSpeech(segment.startDate)}부터 ${formatDateForSpeech(segment.endDate)} 구간은 ${verb}으로 분류되었습니다.`
      );
    });
  }

  lines.push(`전체 기간의 가격 변화율은 ${analysis.summary.totalReturnPct.toFixed(1)}퍼센트입니다.`);
  lines.push(`기간 중 최고가는 ${analysis.summary.highestPrice.toLocaleString('ko-KR')}원, 최저가는 ${analysis.summary.lowestPrice.toLocaleString('ko-KR')}원입니다.`);
  return lines.join(' ');
}
