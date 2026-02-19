declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const expect: {
  (value: unknown): {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toBeDefined: () => void;
  };
};
declare const jest: {
  mock: (path: string, factory: () => unknown) => void;
};

const memory = new Map<string, string>();

jest.mock("../storage/mmkv", () => ({
  getString: (key: string) => memory.get(key),
  setString: (key: string, value: string) => memory.set(key, value),
  getBool: () => undefined,
  setBool: () => undefined,
}));

import { readMonthlyReportsMap, saveMonthlyReportSnapshot, trimMonthlyReports } from "./reportStorage";

describe("reportStorage", () => {
  beforeEach(() => {
    memory.clear();
  });

  it("saves and loads reports map", () => {
    saveMonthlyReportSnapshot({
      monthKey: "2026-02",
      generatedAt: 1,
      totals: {
        daysInMonth: 28,
        daysTracked: 0,
        daysSmokeFree: 0,
        consistencyPct: 0,
        cravingsBeaten: 0,
        moneySavedMonth: 0,
        moneySavedTotal: 0,
        cigarettesAvoidedMonth: 0,
        cigarettesAvoidedTotal: 0,
      },
    });

    const map = readMonthlyReportsMap();
    expect(map["2026-02"]).toBeDefined();
    expect(map["2026-02"]?.monthKey).toBe("2026-02");
  });

  it("keeps only last 12 reports by month key", () => {
    const map: Record<string, any> = {};
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(2024, i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = {
        monthKey: key,
        generatedAt: i + 1,
        totals: {
          daysInMonth: 30,
          daysTracked: 0,
          daysSmokeFree: 0,
          consistencyPct: 0,
          cravingsBeaten: 0,
          moneySavedMonth: 0,
          moneySavedTotal: 0,
          cigarettesAvoidedMonth: 0,
          cigarettesAvoidedTotal: 0,
        },
      };
    }

    const trimmed = trimMonthlyReports(map);
    expect(Object.keys(trimmed).length).toBe(12);
    expect(trimmed["2024-01"]).toBe(undefined);
    expect(trimmed["2025-02"]?.monthKey).toBe("2025-02");
  });
});
