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
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];
