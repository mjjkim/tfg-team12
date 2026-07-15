import './globals.css';

import { Inter, Pixelify_Sans } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const pixelifySans = Pixelify_Sans({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pixelify',
  display: 'swap'
});

export const metadata = {
  title: 'PitchStock',
  description: '소리와 음성으로 탐색하는 주식 차트'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${inter.variable} ${pixelifySans.variable}`}>
      <body className="bg-slate-950 text-slate-100">
        <div className="min-h-[100dvh]">{children}</div>
      </body>
    </html>
  );
}
