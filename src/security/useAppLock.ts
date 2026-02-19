import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { StorageKeys } from "../storage/keys";
import { getBool, setBool } from "../storage/mmkv";

const INACTIVITY_TIMEOUT_MS = 75_000;

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: Platform.OS === "ios" ? "Utiliser le code" : undefined,
    disableDeviceFallback: false,
    cancelLabel: undefined,
  });
  return !!result.success;
}

export function useAppLock() {
  const [lockEnabled, setLockEnabledState] = useState<boolean>(getBool(StorageKeys.securityLockEnabled) ?? false);
  const [isLocked, setIsLocked] = useState<boolean>(lockEnabled);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const backgroundAtRef = useRef<number | null>(null);

  useEffect(() => {
    isBiometricAvailable()
      .then(setBiometricAvailable)
      .catch(() => setBiometricAvailable(false));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        backgroundAtRef.current = Date.now();
        return;
      }

      if (nextState === "active") {
        const enabled = getBool(StorageKeys.securityLockEnabled) ?? false;
        setLockEnabledState(enabled);
        if (!enabled) {
          setIsLocked(false);
          return;
        }

        const backgroundAt = backgroundAtRef.current;
        if (!backgroundAt) return;
        if (Date.now() - backgroundAt >= INACTIVITY_TIMEOUT_MS) {
          setIsLocked(true);
        }
      }
    });

    return () => sub.remove();
  }, []);

  const setLockEnabled = useCallback((enabled: boolean) => {
    setBool(StorageKeys.securityLockEnabled, enabled);
    setLockEnabledState(enabled);
    if (!enabled) {
      setIsLocked(false);
    }
  }, []);

  const syncFromStorage = useCallback(() => {
    const enabled = getBool(StorageKeys.securityLockEnabled) ?? false;
    setLockEnabledState(enabled);
    setIsLocked(enabled);
  }, []);

  const lock = useCallback(() => {
    const enabled = getBool(StorageKeys.securityLockEnabled) ?? false;
    if (!enabled) return;
    setIsLocked(true);
  }, []);

  const unlock = useCallback(
    async (onSuccessStart?: () => void) => {
      if (!lockEnabled) {
        setIsLocked(false);
        return true;
      }

      setIsUnlocking(true);
      try {
        const ok = await authenticateWithBiometrics("Déverrouiller Quitly");
        if (!ok) return false;
        onSuccessStart?.();
        await new Promise((resolve) => setTimeout(resolve, 300));
        setIsLocked(false);
        return true;
      } finally {
        setIsUnlocking(false);
      }
    },
    [lockEnabled]
  );

  return useMemo(
    () => ({
      isLocked,
      isUnlocking,
      lock,
      unlock,
      lockEnabled,
      setLockEnabled,
      biometricAvailable,
      syncFromStorage,
    }),
    [isLocked, isUnlocking, lock, unlock, lockEnabled, setLockEnabled, biometricAvailable, syncFromStorage]
  );
}
