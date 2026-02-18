import * as Notifications from "expo-notifications";
import i18n from "../i18n";

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

/**
 * Planifie une notification quotidienne (ex: 9h00).
 * On annule d'abord les anciennes pour éviter les doublons.
 */
export async function scheduleDailyMotivation(hour = 9, minute = 0): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t("notif.daily.title"),
      body: i18n.t("notif.daily.body"),
      data: { target: "dailyCheckin" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
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
