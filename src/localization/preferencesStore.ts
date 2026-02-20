import { useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();
let version = 0;

export function notifyPreferencesChanged() {
  version += 1;
  listeners.forEach((listener) => {
    listener();
  });
}

export function subscribePreferences(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePreferencesVersion() {
  return useSyncExternalStore(subscribePreferences, () => version, () => version);
}

