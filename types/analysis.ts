export interface DailyCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DemoTick {
  timestamp: number;
  price: number;
  volume: number;
}

export interface TimeSeriesSegment {
  startDate: string;
  endDate: string;
  type: 'RISE' | 'FALL' | 'SIDEWAYS';
  startPrice: number;
  endPrice: number;
  changePct: number;
  volatilityPct: number;
  maxDrawdownPct: number;
}

export interface TimeSeriesAnalysis {
  stock: { name: string; ticker: string };
  period: { from: string; to: string };
  summary: {
    startPrice: number;
    endPrice: number;
    totalReturnPct: number;
    highestPrice: number;
    highestDate: string;
    lowestPrice: number;
    lowestDate: string;
    averageVolume: number;
    volatilityPct: number;
  };
  segments: TimeSeriesSegment[];
}
