export const STOCKS = [
  {
    name: "Samsung Electronics",
    ticker: "005930",
    aliases: ["samsung", "samsung electronics", "samsung전자", "삼성전자"],
    demoBasePrice: 72000,
    tickSize: 10
  },
  {
    name: "SK Hynix",
    ticker: "000660",
    aliases: ["sk hynix", "sk하이닉스", "하이닉스", "hynix", "에스케이하이닉스"],
    demoBasePrice: 180000,
    tickSize: 100
  },
  {
    name: "Hyundai Motor",
    ticker: "005380",
    aliases: ["hyundai", "hyundai motor", "현대차", "현대자동차"],
    demoBasePrice: 230000,
    tickSize: 100
  },
  {
    name: "NAVER",
    ticker: "035420",
    aliases: ["naver", "네이버"],
    demoBasePrice: 210000,
    tickSize: 100
  },
  {
    name: "Kakao",
    ticker: "035720",
    aliases: ["kakao", "카카오"],
    demoBasePrice: 50000,
    tickSize: 10
  }
];

export const STOCK_BY_TICKER: Record<string, (typeof STOCKS)[number]> = STOCKS.reduce(
  (acc, stock) => {
    acc[stock.ticker] = stock;
    return acc;
  },
  {} as Record<string, (typeof STOCKS)[number]>
);

export const DEMO_INTERVALS: Record<number, number> = {
  1: 12,
  3: 24,
  5: 36
};

export const TREND_CONFIG = {
  movingAverageWindow: 5,
  analysisWindow: 10,
  riseThresholdPct: 2,
  fallThresholdPct: -2
};

export const DEAD_ZONE_PERCENT = 0.3;
export const CHANGE_BANDS = [0.3, 0.6, 1.0, 1.5, 2.0];