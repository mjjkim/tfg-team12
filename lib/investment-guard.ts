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
  '조회한 과거 차트의 흐름에 대해 질문해 주세요.';

export function isAdvisoryQuery(text: string): boolean {
  return ADVISORY_KEYWORDS.some((keyword) => text.includes(keyword));
}
