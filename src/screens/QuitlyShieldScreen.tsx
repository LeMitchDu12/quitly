import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import ShieldRing from "../components/shield/ShieldRing";
import ShieldPaywallModal from "../components/shield/ShieldPaywallModal";
import { theme } from "../theme";
import { StorageKeys } from "../storage/keys";
import { getBool, getNumber, getString, setBool } from "../storage/mmkv";
import { daysSince, cigarettesAvoided, moneySavedFromCigarettes } from "../utils/calculations";
import { formatCurrencyEUR } from "../utils/format";
import { readDailyCheckins, totalSmokedSince } from "../storage/checkins";
import {
  SHIELD_DURATION_SEC,
  SHIELD_FREE_WEEKLY_LIMIT,
  canStartShieldSession,
  consumeFreeShieldWeeklySlot,
  recordShieldSession,
  type ShieldSession,
} from "../shield/shieldStorage";
import { formatHourRange, getShieldStatsSnapshot } from "../shield/shieldStats";

type ShieldView = "session" | "stats";
type SessionState = "idle" | "running" | "completed";

function formatSessionDate(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function QuitlyShieldScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [isPremium, setIsPremium] = useState<boolean>(getBool(StorageKeys.isPremium) ?? false);
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [view, setView] = useState<ShieldView>("session");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [statsTick, setStatsTick] = useState(0);

  const startedAtMsRef = useRef<number | null>(null);
  const completionHandledRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setIsPremium(getBool(StorageKeys.isPremium) ?? false);
      setStatsTick((x) => x + 1);
    }, [])
  );

  const profile = useMemo(() => {
    const quitDate = getString(StorageKeys.quitDate);
    const cigsPerDay = getNumber(StorageKeys.cigsPerDay) ?? 12;
    const cigsPerPack = getNumber(StorageKeys.cigsPerPack) ?? 20;
    const pricePerPack = getNumber(StorageKeys.pricePerPack) ?? 12;
    const checkins = readDailyCheckins();
    const days = quitDate ? daysSince(quitDate) : 0;
    const avoidedRaw = quitDate ? cigarettesAvoided(days, cigsPerDay) - totalSmokedSince(checkins, quitDate) : 0;
    const avoided = Math.max(0, avoidedRaw);
    const saved = moneySavedFromCigarettes(avoided, cigsPerPack, pricePerPack);
    return { days, saved };
  }, [statsTick]);

  const savedLabel = formatCurrencyEUR(profile.saved);
  const stats = useMemo(() => getShieldStatsSnapshot(new Date()), [statsTick]);

  const freeUsed = Math.max(0, Math.min(SHIELD_FREE_WEEKLY_LIMIT, stats.thisWeekCount));
  const freeRemaining = Math.max(0, SHIELD_FREE_WEEKLY_LIMIT - stats.thisWeekCount);
  const progress = Math.max(0, Math.min(1, elapsedSec / SHIELD_DURATION_SEC));
  const secondsLeft = Math.max(0, SHIELD_DURATION_SEC - elapsedSec);
  const phaseIndex = elapsedSec < 60 ? 1 : elapsedSec < 120 ? 2 : 3;

  const phaseText = useMemo(() => {
    if (elapsedSec < 60) return t("shieldPhase1");
    if (elapsedSec < 120) return t("shieldPhase2", { days: profile.days, money: savedLabel });
    return t("shieldPhase3");
  }, [elapsedSec, t, profile.days, savedLabel]);

  const refreshStats = () => setStatsTick((x) => x + 1);

  const completeSession = useCallback(() => {
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;
    const startedAtMs = startedAtMsRef.current;
    if (startedAtMs == null) return;
    recordShieldSession({
      startedAtMs,
      endedAtMs: Date.now(),
      completed: true,
    });
    setSessionState("completed");
    refreshStats();
  }, []);

  const stopSessionEarly = useCallback(() => {
    const startedAtMs = startedAtMsRef.current;
    if (startedAtMs == null) return;
    recordShieldSession({
      startedAtMs,
      endedAtMs: Date.now(),
      completed: false,
    });
    setSessionState("idle");
    setElapsedSec(0);
    startedAtMsRef.current = null;
    completionHandledRef.current = false;
    refreshStats();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (sessionState !== "running") return;

      const updateElapsed = () => {
        const startedAtMs = startedAtMsRef.current;
        if (startedAtMs == null) return;
        const sec = Math.min(SHIELD_DURATION_SEC, Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
        setElapsedSec(sec);
        if (sec >= SHIELD_DURATION_SEC) completeSession();
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 250);
      const appSub = AppState.addEventListener("change", (state) => {
        if (state === "active") updateElapsed();
      });

      return () => {
        clearInterval(interval);
        appSub.remove();
      };
    }, [sessionState, completeSession])
  );

  const startShieldSession = () => {
    if (sessionState === "running") return;

    const gate = canStartShieldSession(isPremium, new Date());
    if (!gate.allowed) {
      setPaywallOpen(true);
      return;
    }

    if (!isPremium) consumeFreeShieldWeeklySlot(new Date());

    startedAtMsRef.current = Date.now();
    completionHandledRef.current = false;
    setElapsedSec(0);
    setSessionState("running");
    setView("session");
    refreshStats();
  };

  const confirmQuit = () => {
    Alert.alert(t("shieldQuitTitle"), t("shieldQuitBody"), [
      { text: t("shieldStay"), style: "cancel" },
      { text: t("shieldQuit"), onPress: stopSessionEarly },
    ]);
  };

  const closeCompleted = () => {
    setSessionState("idle");
    setElapsedSec(0);
    startedAtMsRef.current = null;
    completionHandledRef.current = false;
    navigation.goBack();
  };

  const unlockPremium = () => {
    setBool(StorageKeys.isPremium, true);
    setIsPremium(true);
    setPaywallOpen(false);
  };

  const renderSessionPanel = () => {
    if (sessionState === "running") {
      return (
        <View style={styles.sessionWrap}>
          <View style={styles.sessionGlowA} />
          <View style={styles.sessionGlowB} />
          <View style={styles.runningHeader}>
            <View style={styles.phaseChip}>
              <Text style={styles.phaseChipText}>
                {t("shieldTabSession")} {phaseIndex}/3
              </Text>
            </View>
            <Pressable onPress={confirmQuit} hitSlop={10}>
              <Text style={styles.quitText}>{t("shieldQuit")}</Text>
            </Pressable>
          </View>
          <ShieldRing progress={progress} secondsLeft={secondsLeft} />
          <Text numberOfLines={1} style={styles.phaseText}>
            {phaseText}
          </Text>
          <View style={styles.phaseTrack}>
            <View style={[styles.phaseFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>
      );
    }

    if (sessionState === "completed") {
      return (
        <View style={styles.sessionWrap}>
          <Text style={styles.doneCheck}>OK</Text>
          <ShieldRing progress={1} secondsLeft={0} />
          <Text style={styles.doneTitle}>{t("shieldDoneTitle")}</Text>
          <Pressable style={styles.backButton} onPress={closeCompleted}>
            <Text style={styles.backButtonText}>{t("shieldBack")}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.idleWrap}>
        <Text style={styles.title}>{t("shieldTitle")}</Text>
        <Text style={styles.subtitle}>{t("shieldSubtitle")}</Text>
        {!isPremium && (
          <>
            <Text style={styles.limitText}>
              {t("shieldFreeUsage", {
                used: freeUsed,
                limit: SHIELD_FREE_WEEKLY_LIMIT,
              })}
            </Text>
            <Text style={styles.limitSubText}>
              {t("shieldFreeLimitInfo", {
                limit: SHIELD_FREE_WEEKLY_LIMIT,
              })}
            </Text>
          </>
        )}
        <Pressable style={styles.startButton} onPress={startShieldSession}>
          <Text style={styles.startButtonText}>{t("shieldStart")}</Text>
        </Pressable>
      </View>
    );
  };

  const renderStatsPanel = () => {
    if (!isPremium) {
      return (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>{t("shieldStatsTitle")}</Text>
          <Text style={styles.statsMuted}>{t("shieldStatsFreeTeaser")}</Text>
          <Pressable style={styles.statsCta} onPress={() => setPaywallOpen(true)}>
            <Text style={styles.statsCtaText}>{t("shieldPaywallCtaUnlock")}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View>
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>{t("shieldStatsTitle")}</Text>
          <View style={styles.kpisRow}>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{stats.totalCompleted}</Text>
              <Text style={styles.kpiLabel}>{t("shieldStatsTotalCompleted")}</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{stats.thisWeekCompleted}</Text>
              <Text style={styles.kpiLabel}>{t("shieldStatsThisWeek")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>{t("shieldStatsTopHours")}</Text>
          {stats.topRiskHours.length === 0 ? (
            <Text style={styles.statsMuted}>{t("shieldStatsNoData")}</Text>
          ) : (
            stats.topRiskHours.map((entry) => (
              <View key={entry.hour} style={styles.hourRow}>
                <Text style={styles.hourLabel}>{formatHourRange(entry.hour)}</Text>
                <Text style={styles.hourValue}>{t("shieldStatsCount", { count: entry.count })}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>{t("shieldStatsRecent")}</Text>
          {stats.recentSessions.length === 0 ? (
            <Text style={styles.statsMuted}>{t("shieldStatsNoData")}</Text>
          ) : (
            stats.recentSessions.map((session: ShieldSession, index) => (
              <View key={`${session.createdAt}-${index}`} style={styles.recentRow}>
                <Text style={styles.recentDate}>{formatSessionDate(session.createdAt, i18n.language || "fr-FR")}</Text>
                <Text style={styles.recentMeta}>
                  {session.durationSec}s · {session.completed ? t("shieldCompletedShort") : t("shieldInterruptedShort")}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.backTop}>{t("close")}</Text>
          </Pressable>
          {sessionState !== "running" && (
            <View style={styles.switchRow}>
              <Pressable
                style={[styles.switchChip, view === "session" && styles.switchChipActive]}
                onPress={() => setView("session")}
              >
                <Text style={[styles.switchText, view === "session" && styles.switchTextActive]}>{t("shieldTabSession")}</Text>
              </Pressable>
              <Pressable
                style={[styles.switchChip, view === "stats" && styles.switchChipActive]}
                onPress={() => setView("stats")}
              >
                <Text style={[styles.switchText, view === "stats" && styles.switchTextActive]}>{t("shieldTabStats")}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {view === "session" || sessionState === "running" ? (
          renderSessionPanel()
        ) : (
          <ScrollView contentContainerStyle={styles.statsScroll}>{renderStatsPanel()}</ScrollView>
        )}
      </View>

      <ShieldPaywallModal
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlock={unlockPremium}
        savedAmountLabel={savedLabel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    marginTop: theme.spacing.xs,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backTop: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: "row",
    gap: 8,
  },
  switchChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "transparent",
  },
  switchChipActive: {
    borderColor: theme.colors.primary,
  },
  switchText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  switchTextActive: {
    color: theme.colors.primary,
  },
  sessionWrap: {
    flex: 1,
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  sessionGlowA: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.06)",
    top: -120,
    right: -120,
  },
  sessionGlowB: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.04)",
    bottom: -90,
    left: -80,
  },
  runningHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  phaseChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.35)",
    backgroundColor: "rgba(74,222,128,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  phaseChipText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  quitText: {
    color: theme.colors.textTertiary,
    fontSize: 12,
  },
  phaseText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textPrimary,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 15,
  },
  phaseTrack: {
    marginTop: theme.spacing.sm,
    height: 6,
    backgroundColor: theme.colors.divider,
    borderRadius: 999,
    overflow: "hidden",
  },
  phaseFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
  },
  doneCheck: {
    alignSelf: "center",
    color: theme.colors.primary,
    fontSize: 26,
    fontWeight: "900",
    marginBottom: theme.spacing.xs,
  },
  doneTitle: {
    marginTop: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontWeight: "800",
    textAlign: "center",
    fontSize: 18,
  },
  backButton: {
    marginTop: theme.spacing.md,
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
  },
  idleWrap: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  limitText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
  },
  limitSubText: {
    color: theme.colors.textTertiary,
    textAlign: "center",
    marginTop: 4,
    fontSize: 11,
  },
  startButton: {
    marginTop: theme.spacing.md,
    alignSelf: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  startButtonText: {
    color: "#0B0D10",
    fontWeight: "900",
  },
  statsScroll: {
    paddingBottom: theme.spacing.lg,
  },
  statsCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.lg,
    padding: 14,
  },
  statsTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 8,
  },
  statsMuted: {
    color: theme.colors.textSecondary,
  },
  statsCta: {
    marginTop: theme.spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 999,
  },
  statsCtaText: {
    color: theme.colors.primary,
    fontWeight: "800",
  },
  kpisRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpi: {
    flex: 1,
    backgroundColor: theme.colors.elevated,
    borderRadius: theme.radius.md,
    padding: 10,
  },
  kpiValue: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
  },
  kpiLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  hourLabel: { color: theme.colors.textPrimary, fontWeight: "700" },
  hourValue: { color: theme.colors.textSecondary },
  recentRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  recentDate: { color: theme.colors.textPrimary, fontWeight: "700" },
  recentMeta: { color: theme.colors.textSecondary, marginTop: 3, fontSize: 12 },
});


