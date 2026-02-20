export type DailyStatus = {
  dateKey: string;
  smoked: boolean;
  cigarettesSmoked?: number;
};

export type MonthlyReportTotals = {
  daysInMonth: number;
  daysTracked: number;
  daysSmokeFree: number;
  consistencyPct: number;
  cravingsBeaten: number;
  moneySavedMonth: number;
  moneySavedTotal: number;
  cigarettesSmokedMonth: number;
  relapseDaysMonth: number;
  cigarettesAvoidedMonth: number;
  cigarettesAvoidedTotal: number;
};

export type MonthlyReport = {
  monthKey: string;
  generatedAt: number;
  totals: MonthlyReportTotals;
  trends?: {
    consistencyDeltaPct?: number;
    cravingsDelta?: number;
    moneyDelta?: number;
  };
  sensitive?: {
    topHours?: number[];
    topWeekdays?: number[];
  };
  insight?: { key: string; params?: Record<string, unknown> };
};

export type DailyStatusMap = Record<string, DailyStatus>;
export type MonthlyReportsMap = Record<string, MonthlyReport>;

export type ReportProfile = {
  quitDate: string;
  cigsPerDay: number;
  pricePerPack: number;
  cigsPerPack: number;
};
