import { cancelAllNotifications } from "../notifications";
import { clearStorage } from "./mmkv";

export async function resetAllUserData(): Promise<void> {
  await cancelAllNotifications();
  await clearStorage();
}
