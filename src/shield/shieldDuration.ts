import { StorageKeys } from "../storage/keys";
import { getNumber, setNumber } from "../storage/mmkv";

export const SHIELD_DURATION_DEFAULT_SEC = 180;
export const SHIELD_DURATION_OPTIONS_SEC = [60, 120, 180, 300] as const;
export type ShieldDurationSec = (typeof SHIELD_DURATION_OPTIONS_SEC)[number];

const SHIELD_FREE_DURATIONS: ReadonlySet<ShieldDurationSec> = new Set([180]);
const SHIELD_PREMIUM_DURATIONS: ReadonlySet<ShieldDurationSec> = new Set([60, 120, 300]);

export const SHIELD_DURATION_PREMIUM_GATING_ENABLED = true;

function isValidShieldDuration(value: number): value is ShieldDurationSec {
  return SHIELD_DURATION_OPTIONS_SEC.includes(value as ShieldDurationSec);
}

export function getShieldDurationSec(): ShieldDurationSec {
  const raw = getNumber(StorageKeys.shieldDurationSec);
  if (raw == null || !isValidShieldDuration(raw)) {
    setNumber(StorageKeys.shieldDurationSec, SHIELD_DURATION_DEFAULT_SEC);
    return SHIELD_DURATION_DEFAULT_SEC;
  }
  return raw;
}

export function getShieldDurationSecForPlan(isPremium: boolean): ShieldDurationSec {
  if (!isPremium) return SHIELD_DURATION_DEFAULT_SEC;
  return getShieldDurationSec();
}

export function setShieldDurationSec(value: number): void {
  if (!isValidShieldDuration(value)) {
    setNumber(StorageKeys.shieldDurationSec, SHIELD_DURATION_DEFAULT_SEC);
    return;
  }
  setNumber(StorageKeys.shieldDurationSec, value);
}

export function canUseShieldDuration(value: number, isPremium: boolean): boolean {
  if (!isValidShieldDuration(value)) return false;
  if (!SHIELD_DURATION_PREMIUM_GATING_ENABLED) return true;
  if (!isPremium) return SHIELD_FREE_DURATIONS.has(value);
  return SHIELD_PREMIUM_DURATIONS.has(value) || SHIELD_FREE_DURATIONS.has(value);
}

export function formatShieldDurationMinutes(sec: number): string {
  const minutes = Math.round(sec / 60);
  return `${minutes} min`;
}
