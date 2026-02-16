import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageKeys, type StorageKey } from "./keys";

const cache: Partial<Record<StorageKey, string>> = {};
let hydrated = false;

const allKeys = Object.values(StorageKeys) as StorageKey[];

export async function hydrateStorage() {
  if (hydrated) return;
  const entries = await AsyncStorage.multiGet(allKeys);
  for (const [key, value] of entries) {
    if (value != null) {
      cache[key as StorageKey] = value;
    }
  }
  hydrated = true;
}

export async function clearStorage() {
  await AsyncStorage.multiRemove(allKeys);
  for (const key of allKeys) {
    delete cache[key];
  }
}

function persist(key: StorageKey, value: string) {
  AsyncStorage.setItem(key, value).catch(() => {
    // Best effort persistence; in-memory cache stays source of truth for current session.
  });
}

export const setString = (key: StorageKey, value: string) => {
  cache[key] = value;
  persist(key, value);
};

export const getString = (key: StorageKey) => cache[key];

export const setNumber = (key: StorageKey, value: number) => {
  const serialized = String(value);
  cache[key] = serialized;
  persist(key, serialized);
};

export const getNumber = (key: StorageKey) => {
  const raw = cache[key];
  if (raw == null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
};

export const setBool = (key: StorageKey, value: boolean) => {
  const serialized = value ? "true" : "false";
  cache[key] = serialized;
  persist(key, serialized);
};

export const getBool = (key: StorageKey) => {
  const raw = cache[key];
  if (raw == null) return undefined;
  return raw === "true";
};
