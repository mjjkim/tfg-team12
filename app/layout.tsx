import './globals.css';

export const metadata = {
  title: '소리로 보는 주식',
  description: '음성 기반 데모 주식 차트 앱'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-100">
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
