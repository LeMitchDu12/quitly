import * as Notifications from "expo-notifications";

export async function requestNotifPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleDailyMotivation() {
  // 9:00 tous les jours
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Keep going 💪",
      body: "Every smoke-free day is a win.",
    },
    trigger: { hour: 9, minute: 0, repeats: true },
  });
}

export async function scheduleMilestone(title: string, body: string, secondsFromNow: number) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { seconds: secondsFromNow },
  });
}
