import { useCallback, useRef, useState } from 'react';
import { playSonificationTone } from '@/lib/audio-engine';
import { priceToFrequency } from '@/lib/formatters';

export function useSonification() {
  const timerRef = useRef<number | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
    setPlaybackIndex(null);
  }, []);

  const play = useCallback(
    (prices: number[], minPrice: number, maxPrice: number, onProgress?: (index: number) => void): Promise<void> => {
      return new Promise((resolve) => {
        if (prices.length === 0) {
          resolve();
          return;
        }

        stop();
        setPlaying(true);
        let index = 0;
        setPlaybackIndex(0);
        onProgress?.(0);

        timerRef.current = window.setInterval(async () => {
          const value = prices[index];
          const freq = priceToFrequency(value, minPrice, maxPrice);
          await playSonificationTone(freq);

          if (index >= prices.length - 1) {
            stop();
            onProgress?.(-1);
            resolve();
            return;
          }

          index += 1;
          setPlaybackIndex(index);
          onProgress?.(index);
        }, 140);
      });
    },
    [stop]
  );

  return { play, stop, isPlaying, playbackIndex };
}
