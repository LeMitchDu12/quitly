declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: {
  (value: unknown): {
    toBe: (expected: unknown) => void;
  };
};

import { sanitizeNotificationTime, shiftHour, shiftMinute } from "./settingsTimeUtils";

describe("settingsTimeUtils", () => {
  it("sanitizes invalid values to default", () => {
    const sanitized = sanitizeNotificationTime({ hour: Number.NaN, minute: Number.NaN });
    expect(sanitized.hour).toBe(9);
    expect(sanitized.minute).toBe(0);
  });

  it("clamps out-of-range values", () => {
    const sanitized = sanitizeNotificationTime({ hour: 35, minute: -4 });
    expect(sanitized.hour).toBe(23);
    expect(sanitized.minute).toBe(0);
  });

  it("wraps hours when shifting", () => {
    expect(shiftHour({ hour: 23, minute: 10 }, 1).hour).toBe(0);
    expect(shiftHour({ hour: 0, minute: 10 }, -1).hour).toBe(23);
  });

  it("wraps minutes when shifting", () => {
    expect(shiftMinute({ hour: 12, minute: 59 }, 1).minute).toBe(0);
    expect(shiftMinute({ hour: 12, minute: 0 }, -1).minute).toBe(59);
  });
});
