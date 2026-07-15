import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './hooks/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: '#38bdf8'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Pretendard', 'Noto Sans KR', 'system-ui', 'sans-serif'],
        pixelify: ['var(--font-pixelify)', 'monospace']
      }
    }
  },
  plugins: []
};

export default config;
