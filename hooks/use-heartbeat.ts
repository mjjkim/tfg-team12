import { useEffect, useRef, useState } from 'react';
import { playHeartbeat } from '@/lib/audio-engine';

export function useHeartbeat(enabled: boolean): boolean {
  const [pulse, setPulse] = useState(false);
  const activeRef = useRef(false);

  useEffect(() => {
    activeRef.current = enabled;
    if (!enabled) {
      setPulse(false);
      return;
    }

    const timer = window.setInterval(async () => {
      if (!activeRef.current) return;
      setPulse((prev) => !prev);
      try {
        await playHeartbeat();
      } catch {
        // ignore
      }
    }, 5000);

    return () => {
      activeRef.current = false;
      clearInterval(timer);
      setPulse(false);
    };
  }, [enabled]);

  return pulse;
}
