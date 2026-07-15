export const STOCKS = [
  {
    name: "삼성전자",
    ticker: "005930",
    aliases: ["삼성전자", "삼성 전자", "Samsung Electronics", "Samsung", "005930"],
    demoBasePrice: 72000,
    tickSize: 10
  },
  {
    name: "SK하이닉스",
    ticker: "000660",
    aliases: ["SK하이닉스", "SK 하이닉스", "에스케이하이닉스", "에스케이 하이닉스", "SK Hynix", "000660"],
    demoBasePrice: 180000,
    tickSize: 100
  },
  {
    name: "현대자동차",
    ticker: "005380",
    aliases: ["현대자동차", "현대 자동차", "현대차", "Hyundai Motor", "Hyundai", "005380"],
    demoBasePrice: 230000,
    tickSize: 100
  },
  {
    name: "네이버",
    ticker: "035420",
    aliases: ["네이버", "NAVER", "035420"],
    demoBasePrice: 210000,
    tickSize: 100
  },
  {
    name: "카카오",
    ticker: "035720",
    aliases: ["카카오", "Kakao", "035720"],
    demoBasePrice: 50000,
    tickSize: 10
  }
];

export const STOCK_BY_TICKER: Record<string, (typeof STOCKS)[0]> = STOCKS.reduce(
  (acc, stock) => {
    acc[stock.ticker] = stock;
    return acc;
  },
  {} as Record<string, (typeof STOCKS)[0]>
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

export const DEAD_ZONE_PERCENT = 0.08;
export const CHANGE_BANDS = [0.3, 0.6, 1.0, 1.5, 2.0];
