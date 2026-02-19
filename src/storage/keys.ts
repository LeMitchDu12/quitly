export const StorageKeys = {
  quitDate: "quitDate",
  cigsPerDay: "cigsPerDay",
  pricePerPack: "pricePerPack",
  cigsPerPack: "cigsPerPack",
  isPremium: "isPremium", // pour MVP sans RevenueCat
  language: "language",
  onboardingDone: "onboardingDone",
  notificationsEnabled: "notificationsEnabled",
  dailyCheckins: "dailyCheckins",
  pendingAction: "pendingAction",
  notificationTimes: "notificationTimes",
  shieldSessions: "shield_sessions",
  shieldWeekKey: "shield_weekKey",
  shieldWeekCount: "shield_weekCount",
  shieldTotalCompleted: "shield_totalCompleted",
  shieldVariantMode: "shield_variantMode",
  journalEntries: "journal_entries",
  securityLockEnabled: "security_lock_enabled",
  securityBiometricPreferred: "security_biometric_preferred",
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];
