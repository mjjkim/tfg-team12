export function formatPrice(value: number): string {
  const rounded = Math.max(0, Math.round(value));
  return `${rounded.toLocaleString('ko-KR')}원`;
}

export function formatVolume(volume: number): string {
  return `${Math.max(0, Math.round(volume)).toLocaleString('ko-KR')}주`;
}

export function priceToFrequency(price: number, min: number, max: number): number {
  const range = Math.max(max - min, 1);
  const ratio = (price - min) / range;
  return 220 + ratio * 660;
}

export function formatDateLabel(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function formatDateForSpeech(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return formatDateLabel(value);
}

export function downsampleSeries<T>(items: T[], maxPoints: number): T[] {
  if (items.length <= maxPoints) return items;
  const interval = Math.max(1, Math.floor(items.length / maxPoints));
  const result: T[] = [];
  for (let i = 0; i < items.length; i += interval) {
    result.push(items[i]);
  }
  const last = items[items.length - 1];
  if (result[result.length - 1] !== last) result.push(last);
  return result;
}
