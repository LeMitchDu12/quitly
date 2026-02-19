declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: {
  (value: unknown): {
    toEqual: (expected: unknown) => void;
    toBe: (expected: unknown) => void;
  };
};

import type { ShieldSession } from "../shield/shieldStorage";
import { generateMonthlyReport, getTopHoursFromSessions } from "./reportGenerator";

const profile = {
  quitDate: "2026-01-01",
  cigsPerDay: 10,
  pricePerPack: 12,
  cigsPerPack: 20,
};

describe("reportGenerator", () => {
  it("calculates top hours from completed sessions", () => {
    const sessions: ShieldSession[] = [
      { startedAt: "2026-01-01T10:00:00.000Z", createdAt: "2026-01-01T10:03:00.000Z", completed: true, durationSec: 180, hourOfDay: 10 },
      { startedAt: "2026-01-02T10:00:00.000Z", createdAt: "2026-01-02T10:03:00.000Z", completed: true, durationSec: 180, hourOfDay: 10 },
      { startedAt: "2026-01-03T18:00:00.000Z", createdAt: "2026-01-03T18:03:00.000Z", completed: true, durationSec: 180, hourOfDay: 18 },
    ];
    expect(getTopHoursFromSessions(sessions)).toEqual([10, 18]);
  });

  it("computes deltas against previous month report", () => {
    const prev = generateMonthlyReport({
      monthKey: "2026-01",
      dailyStatusMap: {
        "2026-01-01": { dateKey: "2026-01-01", smoked: false },
        "2026-01-02": { dateKey: "2026-01-02", smoked: true, cigarettesSmoked: 3 },
      },
      shieldSessions: [],
      profile,
      now: new Date("2026-01-31T12:00:00.000Z"),
    });

    const current = generateMonthlyReport({
      monthKey: "2026-02",
      dailyStatusMap: {
        "2026-02-01": { dateKey: "2026-02-01", smoked: false },
        "2026-02-02": { dateKey: "2026-02-02", smoked: false },
      },
      shieldSessions: [],
      profile,
      previousReport: prev,
      now: new Date("2026-02-28T12:00:00.000Z"),
    });

    expect(current.trends?.consistencyDeltaPct).toBe(50);
  });

  it("returns 0 consistency when daysTracked is 0", () => {
    const report = generateMonthlyReport({
      monthKey: "2026-02",
      dailyStatusMap: {},
      shieldSessions: [],
      profile,
      now: new Date("2026-02-15T12:00:00.000Z"),
    });

    expect(report.totals.daysTracked).toBe(0);
    expect(report.totals.consistencyPct).toBe(0);
  });
});
