import type { Stock } from '@/types/stock';

interface HomeScreenProps {
  stocks: Stock[];
  lastCommand: string;
  lastResponse: string;
  onStartVoiceCommand: () => void;
  onSubmitText: (text: string) => void;
  onTap?: () => void;
}

export default function HomeScreen({
  stocks,
  lastCommand,
  lastResponse,
  onStartVoiceCommand,
  onSubmitText,
  onTap
}: HomeScreenProps) {
  return (
    <main
      className="screen-root"
      onPointerDown={onTap}
      aria-live="polite"
      aria-label="홈 화면"
      role="button"
      tabIndex={0}
    >
      <header className="card">
        <h1 className="text-2xl font-black">소리로 보는 주식</h1>
        <p className="text-sm mt-2">화면을 두 번 탭해 음성 명령을 시작하세요.</p>
      </header>

      <section className="card">
        <h2 className="text-lg font-bold">안내 문구</h2>
        <p className="text-sm mt-1">합성 데이터 기반 데모로, 실제 시장과 다릅니다.</p>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">지원 종목</h2>
        <ul className="mt-2 grid gap-2" role="list">
          {stocks.map((stock) => (
            <li key={stock.ticker} className="status-pill" role="listitem">
              {stock.name}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">빠른 명령</h2>
        <p className="text-sm mt-2">예시</p>
        <div className="mt-2 flex flex-col gap-2">
          <button className="rounded-lg border border-cyan-300 px-3 py-3 text-left" onClick={() => onSubmitText('실시간 차트 보여줘')}>
            실시간 차트 보여줘
          </button>
          <button className="rounded-lg border border-cyan-300 px-3 py-3 text-left" onClick={() => onSubmitText('삼성전자 5분봉 보여줘')}>
            삼성전자 5분봉 보여줘
          </button>
          <button className="rounded-lg border border-cyan-300 px-3 py-3 text-left" onClick={() => onSubmitText('삼성전자의 2025년 6월부터 2025년 12월까지 차트 보여줘')}>
            삼성전자 2025년 6월~12월 과거 차트
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-bold">명령/응답</h2>
        <p className="text-sm mt-2"><span className="font-semibold">최근 음성 명령:</span> {lastCommand || '없음'}</p>
        <p className="text-sm mt-2"><span className="font-semibold">최근 앱 응답:</span> {lastResponse || '대기 중'}</p>
      </section>

      <button
        type="button"
        className="fixed left-3 right-3 bottom-3 mx-auto max-w-[430px] rounded-xl bg-cyan-400 text-slate-950 font-bold py-3 min-h-[56px]"
        onClick={onStartVoiceCommand}
      >
        음성 명령 시작
      </button>
    </main>
  );
}
