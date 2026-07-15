export const ADVISORY_KEYWORDS = [
  '매수',
  '매도',
  '살까',
  '사도',
  '팔까',
  '팔아',
  '오를까',
  '내릴까',
  '전망',
  '추천',
  '목표가',
  '수익'
] as const;

export const ADVISORY_BLOCK_MESSAGE =
  '이 서비스는 데모용 과거 데이터와 통계 정보만 설명합니다. 미래 가격 예측이나 매수, 매도와 같은 투자 판단은 제공하지 않습니다. 조회한 기간의 가격 변화와 통계에 대해서는 설명해 드릴 수 있습니다.';

export function isAdvisoryQuery(text: string): boolean {
  return ADVISORY_KEYWORDS.some((keyword) => text.includes(keyword));
}
