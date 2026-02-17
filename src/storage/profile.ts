import { StorageKeys } from "./keys";
import { getNumber, getString, setNumber, setString } from "./mmkv";
import { todayLocalISODate } from "../utils/date";

export function ensureProfileDefaults() {
  const quitDate = getString(StorageKeys.quitDate);
  if (!quitDate) setString(StorageKeys.quitDate, todayLocalISODate());

  if (getNumber(StorageKeys.cigsPerDay) == null) setNumber(StorageKeys.cigsPerDay, 12);
  if (getNumber(StorageKeys.pricePerPack) == null) setNumber(StorageKeys.pricePerPack, 12);
  if (getNumber(StorageKeys.cigsPerPack) == null) setNumber(StorageKeys.cigsPerPack, 20);
}

export function isOnboardingComplete() {
  return getString(StorageKeys.onboardingDone) === "1";
}

export function setOnboardingComplete() {
  setString(StorageKeys.onboardingDone, "1");
}
