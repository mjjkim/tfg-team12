import { useCallback, useEffect, useState } from 'react';

type RecognitionCtor = new () => any;

export function useSpeech() {
  const [isListening, setListening] = useState(false);
  const [isSpeaking, setSpeaking] = useState(false);

  const isSupported =
    typeof window !== 'undefined' &&
    (typeof (window as any).SpeechRecognition !== 'undefined' ||
      typeof (window as any).webkitSpeechRecognition !== 'undefined');

  const speak = useCallback((text: string) => {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.92;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        resolve();
      };
      utterance.onerror = (event) => {
        setSpeaking(false);
        const error = (event as SpeechSynthesisErrorEvent).error || 'tts-error';
        if (error === 'canceled') {
          resolve();
          return;
        }
        reject(new Error(error));
      };

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const listen = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      if (!isSupported || typeof window === 'undefined') {
        reject(new Error('unsupported'));
        return;
      }

      const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition: any = new Recognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;

      let timerId: ReturnType<typeof setTimeout> | number | null = null;

      const clearTimer = () => {
        if (timerId !== null) {
          clearTimeout(timerId);
          timerId = null;
        }
      };

      recognition.onstart = () => setListening(true);
      recognition.onend = () => {
        setListening(false);
        clearTimer();
      };
      recognition.onerror = () => {
        clearTimer();
        setListening(false);
        reject(new Error('recognition-error'));
      };
      recognition.onresult = (event: any) => {
        const text = event?.results?.[0]?.[0]?.transcript?.trim();
        if (!text) {
          clearTimer();
          setListening(false);
          reject(new Error('empty-result'));
          return;
        }
        clearTimer();
        setListening(false);
        resolve(text);
      };

      try {
        recognition.start();
      } catch (error) {
        setListening(false);
        clearTimer();
        reject(error);
        return;
      }

      timerId = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
        clearTimer();
        setListening(false);
        reject(new Error('timeout'));
      }, 9000);
    });
  }, [isSupported]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return { speak, listen, stopSpeaking, isListening, isSpeaking, isSupported };
}
