import type { TimeSeriesAnalysis } from '@/types/analysis';
import { ADVISORY_BLOCK_MESSAGE, isAdvisoryQuery } from './investment-guard';
import { formatDateForSpeech } from './formatters';

export function answerHistoryQuestion(query: string, analysis: TimeSeriesAnalysis): string {
  const q = query.toLowerCase();

  if (isAdvisoryQuery(q)) {
    return ADVISORY_BLOCK_MESSAGE;
  }

  if (q.includes('가장 많이 오른') || q.includes('최고 상승') || q.includes('최대 상승')) {
    const candidate = [...analysis.segments]
      .filter((segment) => segment.type === 'RISE')
      .sort((a, b) => b.changePct - a.changePct)[0];
    if (!candidate) return '상승 구간이 탐지되지 않았습니다.';
    return `가장 많이 오른 구간은 ${formatDateForSpeech(candidate.startDate)}부터 ${formatDateForSpeech(candidate.endDate)}까지 약 ${candidate.changePct.toFixed(1)}퍼센트 상승한 구간입니다.`;
  }

  if (q.includes('가장 많이 내린') || q.includes('최대 하락') || q.includes('가장 많이 떨어진')) {
    const candidate = [...analysis.segments]
      .filter((segment) => segment.type === 'FALL')
      .sort((a, b) => a.changePct - b.changePct)[0];
    if (!candidate) return '하락 구간이 탐지되지 않았습니다.';
    return `가장 많이 내린 구간은 ${formatDateForSpeech(candidate.startDate)}부터 ${formatDateForSpeech(candidate.endDate)}까지 약 ${Math.abs(candidate.changePct).toFixed(1)}퍼센트 하락한 구간입니다.`;
  }

  if (q.includes('최고가')) {
    return `최고가는 ${formatDateForSpeech(analysis.summary.highestDate)} 기준 ${analysis.summary.highestPrice.toLocaleString('ko-KR')}원입니다.`;
  }
  if (q.includes('최저가')) {
    return `최저가는 ${formatDateForSpeech(analysis.summary.lowestDate)} 기준 ${analysis.summary.lowestPrice.toLocaleString('ko-KR')}원입니다.`;
  }
  if (q.includes('전체적으로') || q.includes('전체 기간') || q.includes('얼마나 변했')) {
    return `전체적으로는 ${analysis.summary.totalReturnPct.toFixed(1)}퍼센트 변했습니다.`;
  }
  if (q.includes('횡보')) {
    const side = analysis.segments.find((segment) => segment.type === 'SIDEWAYS');
    if (!side) return '횡보 구간이 탐지되지 않았습니다.';
    return `횡보 구간은 ${formatDateForSpeech(side.startDate)}부터 ${formatDateForSpeech(side.endDate)}입니다.`;
  }
  if (q.includes('변동성')) {
    const target = [...analysis.segments].sort((a, b) => b.volatilityPct - a.volatilityPct)[0];
    if (!target) return '변동성 분석 결과가 부족합니다.';
    return `변동성이 가장 큰 구간은 ${formatDateForSpeech(target.startDate)}부터 ${formatDateForSpeech(target.endDate)}로 약 ${target.volatilityPct.toFixed(1)}퍼센트입니다.`;
  }

  return '가장 많이 오른 구간, 가장 많이 내린 구간, 최고가, 최저가, 변동성에 대한 질문을 해 주세요.';
}
