import { useEffect, useRef } from 'react';

export function useMultiTap({
  onDoubleTap,
  onTripleTap,
  timeoutMs = 450
}: {
  onDoubleTap: () => void;
  onTripleTap: () => void;
  timeoutMs?: number;
}) {
  const countRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTap = () => {
    countRef.current += 1;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setTimeout(() => {
      const taps = countRef.current;
      if (taps === 2) {
        onDoubleTap();
      } else if (taps >= 3) {
        onTripleTap();
      }
      countRef.current = 0;
      timerRef.current = null;
    }, timeoutMs);
  };

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      countRef.current = 0;
    },
    []
  );

  return { onTap };
}
