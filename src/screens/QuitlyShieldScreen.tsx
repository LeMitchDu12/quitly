import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View, Animated, Easing } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import ShieldVisual, { type ShieldVariant } from "../components/shield/ShieldVisual";
import ShieldPaywallModal from "../components/shield/ShieldPaywallModal";
import { theme } from "../theme";
import { StorageKeys } from "../storage/keys";
import { getBool, getNumber, getString, setBool } from "../storage/mmkv";
import { SHIELD_SOUND_ENABLED } from "../features/featureFlags";
import { daysSince, cigarettesAvoided, moneySavedFromCigarettes } from "../utils/calculations";
import { formatMoney } from "../localization/money";
import { readDailyCheckins, totalSmokedSince } from "../storage/checkins";
import { playShieldSound } from "../shield/shieldAudio";
import {
  SHIELD_DURATION_SEC,
  SHIELD_FREE_WEEKLY_LIMIT,
  canStartShieldSession,
  consumeFreeShieldWeeklySlot,
  recordShieldSession,
  type ShieldSession,
} from "../shield/shieldStorage";
import { formatHourRange, getShieldStatsSnapshot } from "../shield/shieldStats";
import type { RootStackParamList } from "../navigation/Root";

type ShieldView = "session" | "stats";
type SessionState = "idle" | "running" | "completed";
type ShieldModelOption = "random" | ShieldVariant;

const SHIELD_VARIANTS: ShieldVariant[] = [
  "default",
  "morphing",
  "bubbles",
  "bubblesV2",
  "bubblesV3",
  "geoV1",
  "geoV2",
  "geoV3",
  "geoV4",
];
const SHIELD_MODEL_OPTIONS: ShieldModelOption[] = ["random", ...SHIELD_VARIANTS];

function pickRandomVariant(): ShieldVariant {
  const idx = Math.floor(Math.random() * SHIELD_VARIANTS.length);
  return SHIELD_VARIANTS[idx] ?? "default";
}

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isPremium, setIsPremium] = useState<boolean>(getBool(StorageKeys.isPremium) ?? false);
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [view, setView] = useState<ShieldView>("session");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [pendingJournalAfterUnlock, setPendingJournalAfterUnlock] = useState(false);
  const [statsTick, setStatsTick] = useState(0);
  const [activeVariant, setActiveVariant] = useState<ShieldVariant>("default");
  const [selectedModel, setSelectedModel] = useState<ShieldModelOption>("random");
  const [audioDebugMessage, setAudioDebugMessage] = useState<string | null>(null);

  const startedAtMsRef = useRef<number | null>(null);
  const completionHandledRef = useRef(false);
  const lastPhaseRef = useRef<number>(1);
  const phaseFade = useRef(new Animated.Value(1)).current;
  const phaseScale = useRef(new Animated.Value(1)).current;
  const sparkOpacity = useRef(new Animated.Value(0)).current;
  const audioStopRef = useRef<(() => Promise<void>) | null>(null);
  const audioStartInFlightRef = useRef(false);
  const audioRequestIdRef = useRef(0);

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

  const savedLabel = formatMoney(profile.saved);
  const stats = useMemo(() => getShieldStatsSnapshot(new Date()), [statsTick]);

  const freeUsed = Math.max(0, Math.min(SHIELD_FREE_WEEKLY_LIMIT, stats.thisWeekCount));
  const shieldVariant: ShieldVariant = !isPremium ? "default" : activeVariant;
  const centerLabelInCircle = shieldVariant === "default" || shieldVariant === "defaut" || shieldVariant === "morphing";
  const progress = Math.max(0, Math.min(1, elapsedSec / SHIELD_DURATION_SEC));
  const secondsLeft = Math.max(0, SHIELD_DURATION_SEC - elapsedSec);
  const phaseIndex = elapsedSec < 60 ? 1 : elapsedSec < 120 ? 2 : 3;
  const phaseMessageIndex =
    elapsedSec < 30 ? 1 :
    elapsedSec < 60 ? 2 :
    elapsedSec < 90 ? 3 :
    elapsedSec < 120 ? 4 :
    elapsedSec < 150 ? 5 :
    6;

  const phaseText = useMemo(() => {
    if (phaseMessageIndex === 1) return t("shieldPhase1");
    if (phaseMessageIndex === 2) return t("shieldPhase2");
    if (phaseMessageIndex === 3) return t("shieldPhase3", { days: profile.days, money: savedLabel });
    if (phaseMessageIndex === 4) return t("shieldPhase4");
    if (phaseMessageIndex === 5) return t("shieldPhase5");
    return t("shieldPhase6");
  }, [phaseMessageIndex, t, profile.days, savedLabel]);
  const phaseIcon = useMemo(() => {
    if (phaseMessageIndex === 1) return "🫁";
    if (phaseMessageIndex === 2) return "🌬️";
    if (phaseMessageIndex === 3) return "💚";
    if (phaseMessageIndex === 4) return "🧠";
    if (phaseMessageIndex === 5) return "✨";
    return "🏆";
  }, [phaseMessageIndex]);

  useEffect(() => {
    if (sessionState !== "running") {
      lastPhaseRef.current = phaseIndex;
      return;
    }
    if (phaseIndex === lastPhaseRef.current) return;
    lastPhaseRef.current = phaseIndex;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(phaseFade, {
          toValue: 0.55,
          duration: 130,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(phaseFade, {
          toValue: 1,
          duration: 190,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(phaseScale, {
          toValue: 0.97,
          duration: 130,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(phaseScale, {
          toValue: 1,
          duration: 190,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(sparkOpacity, {
          toValue: 0.85,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sparkOpacity, {
          toValue: 0,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [phaseIndex, phaseFade, phaseScale, sessionState, sparkOpacity]);

  const refreshStats = () => setStatsTick((x) => x + 1);

  const stopShieldAudio = useCallback(async () => {
    audioRequestIdRef.current += 1;
    const stop = audioStopRef.current;
    audioStopRef.current = null;
    if (!stop) return;
    try {
      await stop();
    } catch {
      // Ignore audio cleanup errors.
    }
  }, []);

  const startShieldAudio = useCallback(async () => {
    const preferenceEnabled = getBool(StorageKeys.shieldSoundEnabled) ?? false;
    if (!SHIELD_SOUND_ENABLED || !isPremium || !preferenceEnabled) {
      setAudioDebugMessage(
        `Audio skipped (flag:${SHIELD_SOUND_ENABLED ? "on" : "off"}, premium:${isPremium ? "yes" : "no"}, pref:${
          preferenceEnabled ? "on" : "off"
        })`
      );
      console.log("[ShieldAudio] Skip start", {
        featureFlag: SHIELD_SOUND_ENABLED,
        isPremium,
        preferenceEnabled,
      });
      return;
    }
    if (audioStopRef.current || audioStartInFlightRef.current) return;

    const requestId = audioRequestIdRef.current + 1;
    audioRequestIdRef.current = requestId;
    audioStartInFlightRef.current = true;
    try {
      setAudioDebugMessage("Starting shield audio...");
      const handle = await playShieldSound((message) => setAudioDebugMessage(message));
      if (audioRequestIdRef.current !== requestId) {
        await handle.stop();
        return;
      }
      audioStopRef.current = handle.stop;
    } catch (error) {
      console.warn("[ShieldAudio] Failed to init handle", error);
    } finally {
      audioStartInFlightRef.current = false;
    }
  }, [isPremium]);

  const completeSession = useCallback(() => {
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;
    void stopShieldAudio();
    const startedAtMs = startedAtMsRef.current;
    if (startedAtMs == null) return;
    recordShieldSession({
      startedAtMs,
      endedAtMs: Date.now(),
      completed: true,
    });
    setSessionState("completed");
    refreshStats();
  }, [stopShieldAudio]);

  const stopSessionEarly = useCallback(() => {
    void stopShieldAudio();
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
  }, [stopShieldAudio]);

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
        if (state === "active") {
          updateElapsed();
          return;
        }
        if (state === "background") {
          void stopShieldAudio();
        }
      });

      return () => {
        clearInterval(interval);
        appSub.remove();
      };
    }, [sessionState, completeSession, stopShieldAudio])
  );

  useEffect(() => {
    return () => {
      void stopShieldAudio();
    };
  }, [stopShieldAudio]);

  const startShieldSession = () => {
    if (sessionState === "running") return;

    const gate = canStartShieldSession(isPremium, new Date());
    if (!gate.allowed) {
      setPaywallOpen(true);
      return;
    }

    if (!isPremium) consumeFreeShieldWeeklySlot(new Date());

    const pickedVariant: ShieldVariant = !isPremium
      ? "default"
      : selectedModel === "random"
      ? pickRandomVariant()
      : selectedModel;

    setActiveVariant(pickedVariant);
    setAudioDebugMessage(null);
    startedAtMsRef.current = Date.now();
    completionHandledRef.current = false;
    setElapsedSec(0);
    setSessionState("running");
    setView("session");
    refreshStats();
    void startShieldAudio();
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
    if (pendingJournalAfterUnlock) {
      setPendingJournalAfterUnlock(false);
      navigation.navigate("JournalCreate", { linkedToShield: true });
    }
  };

  const onAddJournalNote = () => {
    if (!isPremium) {
      setPendingJournalAfterUnlock(true);
      setPaywallOpen(true);
      return;
    }
    navigation.navigate("JournalCreate", { linkedToShield: true });
  };

  const renderSessionPanel = () => {
    if (sessionState === "running") {
      return (
        <View style={styles.sessionWrap}>
          <View style={styles.sessionGlowA} />
          <View style={styles.sessionGlowB} />
          <Animated.View pointerEvents="none" style={[styles.sparkOverlay, { opacity: sparkOpacity }]} />
          <View style={styles.runningHeader}>
            <View />
            <Pressable onPress={confirmQuit} hitSlop={10}>
              <Text style={styles.quitText}>{t("shieldQuit")}</Text>
            </Pressable>
          </View>
          <ShieldVisual
            progress={progress}
            secondsLeft={secondsLeft}
            phase={phaseIndex as 1 | 2 | 3}
            premiumFx={isPremium}
            variant={shieldVariant}
            showCenterLabel={centerLabelInCircle}
            animate
          />
          {!centerLabelInCircle ? (
            <View style={styles.outerTimerWrap}>
              <Text style={styles.outerTimerTime}>{secondsLeft}s</Text>
              <Text style={styles.outerTimerPercent}>{Math.round(progress * 100)}%</Text>
            </View>
          ) : null}
          <Animated.View
            style={[
              styles.phaseCard,
              {
                opacity: phaseFade,
                transform: [{ scale: phaseScale }],
              },
            ]}
          >
            <Text style={styles.phaseIcon}>{phaseIcon}</Text>
            <Text style={styles.phaseText}>
              {phaseText}
            </Text>
          </Animated.View>
          <View style={styles.phaseTrack}>
            <View style={[styles.phaseFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          {audioDebugMessage ? (
            <View style={styles.audioDebugCard}>
              <Text style={styles.audioDebugText}>{audioDebugMessage}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    if (sessionState === "completed") {
      return (
        <View style={styles.sessionWrap}>
          <Text style={styles.doneCheck}>GO</Text>
          <ShieldVisual
            progress={1}
            secondsLeft={0}
            phase={3}
            premiumFx={isPremium}
            variant={shieldVariant}
            showCenterLabel={centerLabelInCircle}
            animate={false}
          />
          <Text style={styles.doneTitle}>{t("shieldDoneTitle")}</Text>
          <Pressable style={styles.noteButton} onPress={onAddJournalNote}>
            <Text style={styles.noteButtonText}>{t("journalAddNote")}</Text>
          </Pressable>
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
        <View style={styles.modelDebugBadge}>
          <Text style={styles.modelDebugText}>Model: {shieldVariant} (selected: {selectedModel})</Text>
        </View>
        {sessionState !== "running" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.modelSelectorRow}
            style={styles.modelSelectorWrap}
          >
            {SHIELD_MODEL_OPTIONS.map((option) => {
              const active = selectedModel === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setSelectedModel(option)}
                  style={[styles.modelChip, active && styles.modelChipActive]}
                >
                  <Text style={[styles.modelChipText, active && styles.modelChipTextActive]}>{option}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {view === "session" || sessionState === "running" ? (
          renderSessionPanel()
        ) : (
          <ScrollView contentContainerStyle={styles.statsScroll}>{renderStatsPanel()}</ScrollView>
        )}
      </View>

      <ShieldPaywallModal
        visible={paywallOpen}
        onClose={() => {
          setPaywallOpen(false);
          setPendingJournalAfterUnlock(false);
        }}
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
  sparkOverlay: {
    position: "absolute",
    top: "34%",
    left: "8%",
    right: "8%",
    height: 120,
    borderRadius: theme.radius.lg,
    backgroundColor: "rgba(74,222,128,0.22)",
  },
  runningHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  quitText: {
    color: theme.colors.textTertiary,
    fontSize: 12,
  },
  phaseText: {
    color: theme.colors.textPrimary,
    textAlign: "center",
    fontWeight: "800",
    fontSize: 16,
    paddingRight: 10,
  },
  outerTimerWrap: {
    marginTop: theme.spacing.sm,
    alignItems: "center",
  },
  outerTimerTime: {
    color: theme.colors.textPrimary,
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  outerTimerPercent: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  phaseCard: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.25)",
    backgroundColor: "rgba(74,222,128,0.08)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  phaseIcon: {
    fontSize: 18,
    paddingLeft: 4,
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
  noteButton: {
    marginTop: theme.spacing.sm,
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  noteButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
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
  audioDebugCard: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.5)",
    backgroundColor: "rgba(250,204,21,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  audioDebugText: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "700",
  },
  modelDebugBadge: {
    marginTop: 6,
    marginBottom: 2,
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.55)",
    backgroundColor: "rgba(74,222,128,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modelDebugText: {
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  modelSelectorWrap: {
    marginTop: 6,
    maxHeight: 46,
  },
  modelSelectorRow: {
    gap: 8,
    paddingRight: 8,
  },
  modelChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "transparent",
  },
  modelChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(74,222,128,0.16)",
  },
  modelChipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  modelChipTextActive: {
    color: theme.colors.primary,
  },
});



