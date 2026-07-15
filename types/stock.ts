export interface Stock {
  name: string;
  ticker: string;
  aliases: string[];
  demoBasePrice: number;
  tickSize: number;
}

export type AppMode = 'HOME' | 'LIVE_SETUP' | 'LIVE_CHART' | 'HISTORY_CHART' | 'EXIT_CONFIRM';

export type MarketRegime = 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';

export interface RegimeConfig {
  startIndex: number;
  endIndex: number;
  type: MarketRegime;
  dailyDrift: number;
  volatility: number;
}
