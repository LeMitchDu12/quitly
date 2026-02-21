declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const expect: {
  (value: unknown): {
    toBe: (expected: unknown) => void;
  };
};
declare const jest: {
  mock: (path: string, factory: () => unknown) => void;
};

const memory = new Map<string, number>();

jest.mock("../storage/mmkv", () => ({
  getNumber: (key: string) => memory.get(key),
  setNumber: (key: string, value: number) => memory.set(key, value),
}));

import { StorageKeys } from "../storage/keys";
import { getShieldDurationSec } from "./shieldDuration";

describe("shieldDuration", () => {
  beforeEach(() => {
    memory.clear();
  });

  it("returns 180 when value is missing", () => {
    expect(getShieldDurationSec()).toBe(180);
    expect(memory.get(StorageKeys.shieldDurationSec)).toBe(180);
  });

  it("returns 180 when value is invalid", () => {
    memory.set(StorageKeys.shieldDurationSec, 75);
    expect(getShieldDurationSec()).toBe(180);
    expect(memory.get(StorageKeys.shieldDurationSec)).toBe(180);
  });

  it("returns stored value when valid", () => {
    memory.set(StorageKeys.shieldDurationSec, 300);
    expect(getShieldDurationSec()).toBe(300);
  });
});
