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
        sans: ['Pretendard', 'Noto Sans KR', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
