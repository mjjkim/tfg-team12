interface VoiceStatusProps {
  isListening: boolean;
  isSpeaking: boolean;
  micEnabled: boolean;
  statusText: string;
  errorText?: string;
}

export default function VoiceStatus({ isListening, isSpeaking, micEnabled, statusText, errorText }: VoiceStatusProps) {
  return (
    <section
      className="card"
      aria-live="polite"
      aria-atomic="true"
    >
      <h2 className="text-lg font-bold">음성 상태</h2>
      <p className="text-sm">{statusText}</p>
      <div className="mt-2 flex gap-2 flex-wrap">
        <span className="status-pill" aria-live="polite">
          마이크: {micEnabled ? '사용 가능' : '지원 안 됨'}
        </span>
        <span className="status-pill" aria-live="polite">
          음성 출력: {isSpeaking ? '재생 중' : '대기'}
        </span>
        <span className="status-pill" aria-live="polite">
          음성 입력: {isListening ? '듣는 중' : '대기'}
        </span>
      </div>
      {errorText ? (
        <p className="status-pill mt-2 text-rose-200" role="alert" aria-live="assertive">
          {errorText}
        </p>
      ) : null}
    </section>
  );
}
