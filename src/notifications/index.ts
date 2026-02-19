import * as Notifications from "expo-notifications";
import i18n from "../i18n";
import type { NotificationPlan, NotificationTime } from "../storage/notificationTimes";

const PASSIVE_TEMPLATES = [
  { titleKey: "notif.passive.1.title", bodyKey: "notif.passive.1.body" },
  { titleKey: "notif.passive.2.title", bodyKey: "notif.passive.2.body" },
  { titleKey: "notif.passive.3.title", bodyKey: "notif.passive.3.body" },
  { titleKey: "notif.passive.4.title", bodyKey: "notif.passive.4.body" },
  { titleKey: "notif.passive.5.title", bodyKey: "notif.passive.5.body" },
  { titleKey: "notif.passive.6.title", bodyKey: "notif.passive.6.body" },
];

// Important: comportement en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotifPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const req = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: false,
    },
  });

  return !!req.granted;
}

function pickRandomPassiveTemplate() {
  const index = Math.floor(Math.random() * PASSIVE_TEMPLATES.length);
  return PASSIVE_TEMPLATES[index] ?? PASSIVE_TEMPLATES[0];
}

function buildLegacyPlan(times: NotificationTime[]): NotificationPlan {
  const sorted = [...times].sort((a, b) => a.hour - b.hour || a.minute - b.minute);
  return {
    check: sorted[0] ?? null,
    passive: sorted.slice(1, 3),
  };
}

export async function scheduleMotivationReminders(input: NotificationPlan | NotificationTime[]): Promise<void> {
  const plan = Array.isArray(input) ? buildLegacyPlan(input) : input;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const passiveTimes = plan.passive.slice(0, 2);
  if (!plan.check && passiveTimes.length === 0) return;

  const jobs: Promise<string>[] = [];

  if (plan.check) {
    jobs.push(
      Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t("notif.daily.title"),
          body: i18n.t("notif.daily.body"),
          data: { target: "dailyCheckin", reminderKind: "check" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: plan.check.hour,
          minute: plan.check.minute,
          repeats: true,
        },
      })
    );
  }

  passiveTimes.forEach((time, index) => {
    const template = pickRandomPassiveTemplate();
    jobs.push(
      Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t(template.titleKey),
          body: i18n.t(template.bodyKey),
          data: { reminderKind: "passive", reminderId: index },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: time.hour,
          minute: time.minute,
          repeats: true,
        },
      })
    );
  });

  await Promise.all(jobs);
}

export async function scheduleDailyMotivation(hour = 9, minute = 0): Promise<void> {
  return scheduleMotivationReminders({ check: { hour, minute }, passive: [] });
}

/**
 * Exemples de milestones: 24h, 7j, 30j
 */
export async function scheduleDefaultMilestones(): Promise<void> {
  // 24h
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t("notif.milestone.24h.title"),
      body: i18n.t("notif.milestone.24h.body"),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 24 * 60 * 60 },
  });

  // 7 jours
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t("notif.milestone.7d.title"),
      body: i18n.t("notif.milestone.7d.body"),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 7 * 24 * 60 * 60 },
  });

  // 30 jours
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t("notif.milestone.30d.title"),
      body: i18n.t("notif.milestone.30d.body"),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 30 * 24 * 60 * 60 },
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
