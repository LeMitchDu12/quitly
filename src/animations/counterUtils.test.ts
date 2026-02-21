declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: {
  (value: unknown): {
    toBe: (expected: unknown) => void;
    toBeGreaterThanOrEqual: (expected: number) => void;
    toBeLessThanOrEqual: (expected: number) => void;
  };
};

import { getCounterDurationMs, sanitizeCounterValue } from "./counterUtils";

describe("counterUtils", () => {
  it("sanitizes null, undefined and NaN to 0", () => {
    expect(sanitizeCounterValue(null)).toBe(0);
    expect(sanitizeCounterValue(undefined)).toBe(0);
    expect(sanitizeCounterValue(Number.NaN)).toBe(0);
  });

  it("keeps finite values", () => {
    expect(sanitizeCounterValue(42.5)).toBe(42.5);
  });

  it("returns bounded durations", () => {
    expect(getCounterDurationMs(0, 1)).toBeGreaterThanOrEqual(450);
    expect(getCounterDurationMs(0, 200)).toBeLessThanOrEqual(700);
  });
});
