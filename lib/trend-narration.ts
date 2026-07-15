import type { TimeSeriesAnalysis } from '@/types/analysis';
import { TREND_CONFIG } from './stocks';
import { formatDateLabel, formatPrice } from './formatters';

// "말 → 소리 → 말" 오케스트레이션 문구 생성.
//
// 자체 청취 검증: 순수 음높이만으로는 추세 방향의 신뢰도가 낮다.
// 그래서 소리에 판단을 맡기지 않고, 소리 앞뒤를 말로 감싼다.
//   ① 말(결론 + 시작값)  →  ② 소리(형태 스윕)  →  ③ 말(끝값 못박기 + 요약)
// 절대음감 없이도 "두 숫자 + 사이 모양"으로 추세를 잡게 한다(speech-based mark).

function directionLabel(totalReturnPct: number): string {
  if (totalReturnPct >= TREND_CONFIG.riseThresholdPct) return '상승세';
  if (totalReturnPct <= TREND_CONFIG.fallThresholdPct) return '하락세';
  return '뚜렷한 방향 없이 횡보';
}

function signedChange(pct: number): string {
  const magnitude = Math.abs(pct).toFixed(1);
  if (pct > 0) return `${magnitude}퍼센트 상승`;
  if (pct < 0) return `${magnitude}퍼센트 하락`;
  return '변화 없음';
}

// ① 말 — 결론 + 시작값. 소리를 재생하기 "전"에 먼저 말한다.
export function buildTrendIntro(analysis: TimeSeriesAnalysis): string {
  const label = directionLabel(analysis.summary.totalReturnPct);
  return (
    `${analysis.stock.name}, ${formatDateLabel(analysis.period.from)}부터 ` +
    `${formatDateLabel(analysis.period.to)}까지 전반적으로 ${label}입니다. ` +
    `시작 ${formatDateLabel(analysis.period.from)}, ${formatPrice(analysis.summary.startPrice)}. ` +
    `지금부터 흐름을 소리로 들려드립니다.`
  );
}

// ③ 말 — 끝값 못박기 + 요약. 소리를 재생한 "후"에 말한다.
export function buildTrendOutro(analysis: TimeSeriesAnalysis): string {
  return (
    `끝 ${formatDateLabel(analysis.period.to)}, ${formatPrice(analysis.summary.endPrice)}. ` +
    `전체 ${signedChange(analysis.summary.totalReturnPct)}했습니다. ` +
    `기간 중 최고가 ${formatPrice(analysis.summary.highestPrice)}, ` +
    `최저가 ${formatPrice(analysis.summary.lowestPrice)}. ` +
    `이 설명은 데모용 합성 데이터의 통계 요약이며 미래 가격을 예측하지 않습니다.`
  );
}
