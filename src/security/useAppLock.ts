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
    fallbackLabel: Platform.OS === "ios" ? "Use Passcode" : undefined,
    disableDeviceFallback: false,
    cancelLabel: undefined,
  });
  return !!result.success;
}

export async function authenticateBiometricOnly(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: true,
    cancelLabel: undefined,
  });
  return !!result.success;
}

export function useAppLock() {
  const [lockEnabled, setLockEnabledState] = useState<boolean>(getBool(StorageKeys.securityLockEnabled) ?? false);
  const [isLocked, setIsLocked] = useState<boolean>(lockEnabled);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [lastUnlockError, setLastUnlockError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasFaceRecognition, setHasFaceRecognition] = useState(false);
  const backgroundAtRef = useRef<number | null>(null);

  useEffect(() => {
    isBiometricAvailable()
      .then(setBiometricAvailable)
      .catch(() => setBiometricAvailable(false));

    LocalAuthentication.supportedAuthenticationTypesAsync()
      .then((types) => setHasFaceRecognition(types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)))
      .catch(() => setHasFaceRecognition(false));
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
    if (!enabled) setIsLocked(false);
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

  const finalizeUnlock = useCallback(async (onSuccessStart?: () => void) => {
    onSuccessStart?.();
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsLocked(false);
  }, []);

  const unlockBiometricFirst = useCallback(
    async (onSuccessStart?: () => void) => {
      if (!lockEnabled) {
        setIsLocked(false);
        return true;
      }

      setIsUnlocking(true);
      try {
        setLastUnlockError(null);
        await new Promise((resolve) => setTimeout(resolve, 250));
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock Quitly",
          disableDeviceFallback: true,
          cancelLabel: undefined,
        });
        const ok = !!result.success;

        if (!ok) {
          setLastUnlockError(result.error ?? "biometric_failed");
          return false;
        }
        await finalizeUnlock(onSuccessStart);
        return true;
      } finally {
        setIsUnlocking(false);
      }
    },
    [lockEnabled, finalizeUnlock]
  );

  const unlockWithDeviceCode = useCallback(
    async (onSuccessStart?: () => void) => {
      if (!lockEnabled) {
        setIsLocked(false);
        return true;
      }

      setIsUnlocking(true);
      try {
        setLastUnlockError(null);
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock Quitly",
          fallbackLabel: Platform.OS === "ios" ? "Use Passcode" : undefined,
          disableDeviceFallback: false,
          cancelLabel: undefined,
        });
        const ok = !!result.success;
        if (!ok) {
          setLastUnlockError(result.error ?? "code_fallback_failed");
          return false;
        }
        await finalizeUnlock(onSuccessStart);
        return true;
      } finally {
        setIsUnlocking(false);
      }
    },
    [lockEnabled, finalizeUnlock]
  );

  const unlock = unlockBiometricFirst;

  return useMemo(
    () => ({
      isLocked,
      isUnlocking,
      lock,
      unlock,
      unlockBiometricFirst,
      unlockWithDeviceCode,
      lastUnlockError,
      lockEnabled,
      setLockEnabled,
      biometricAvailable,
      hasFaceRecognition,
      syncFromStorage,
    }),
    [
      isLocked,
      isUnlocking,
      lock,
      unlock,
      unlockBiometricFirst,
      unlockWithDeviceCode,
      lastUnlockError,
      lockEnabled,
      setLockEnabled,
      biometricAvailable,
      hasFaceRecognition,
      syncFromStorage,
    ]
  );
}
