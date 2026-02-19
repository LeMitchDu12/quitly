import { StorageKeys } from "../storage/keys";
import { getNumber, getString, setNumber, setString } from "../storage/mmkv";

export const SHIELD_DURATION_SEC = 180;
export const SHIELD_FREE_WEEKLY_LIMIT = 3;
export const SHIELD_MAX_SESSIONS = 200;

export type ShieldSession = {
  startedAt: string;
  completed: boolean;
  durationSec: number;
  hourOfDay: number;
  createdAt: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function getISOWeekKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-${pad2(weekNo)}`;
}

export function readShieldSessions(): ShieldSession[] {
  const raw = getString(StorageKeys.shieldSessions);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (typeof entry !== "object" || entry == null) return null;
        const obj = entry as Partial<ShieldSession>;
        if (
          typeof obj.startedAt !== "string" ||
          typeof obj.completed !== "boolean" ||
          typeof obj.durationSec !== "number" ||
          typeof obj.hourOfDay !== "number" ||
          typeof obj.createdAt !== "string"
        ) {
          return null;
        }
        return {
          startedAt: obj.startedAt,
          completed: obj.completed,
          durationSec: Math.max(0, Math.floor(obj.durationSec)),
          hourOfDay: Math.max(0, Math.min(23, Math.floor(obj.hourOfDay))),
          createdAt: obj.createdAt,
        } satisfies ShieldSession;
      })
      .filter((entry): entry is ShieldSession => entry != null);
  } catch {
    return [];
  }
}

export function writeShieldSessions(sessions: ShieldSession[]) {
  const sliced = sessions.slice(-SHIELD_MAX_SESSIONS);
  setString(StorageKeys.shieldSessions, JSON.stringify(sliced));
}

export function appendShieldSession(session: ShieldSession) {
  const sessions = readShieldSessions();
  sessions.push(session);
  writeShieldSessions(sessions);
}

export function readShieldWeekState(now = new Date()) {
  const currentWeek = getISOWeekKey(now);
  const storedWeek = getString(StorageKeys.shieldWeekKey);
  const storedCount = getNumber(StorageKeys.shieldWeekCount) ?? 0;
  if (storedWeek !== currentWeek) {
    return { weekKey: currentWeek, weekCount: 0 };
  }
  return { weekKey: currentWeek, weekCount: Math.max(0, Math.floor(storedCount)) };
}

export function consumeFreeShieldWeeklySlot(now = new Date()) {
  const state = readShieldWeekState(now);
  const nextCount = state.weekCount + 1;
  setString(StorageKeys.shieldWeekKey, state.weekKey);
  setNumber(StorageKeys.shieldWeekCount, nextCount);
  return { weekKey: state.weekKey, weekCount: nextCount };
}

export function canStartShieldSession(isPremium: boolean, now = new Date()) {
  if (isPremium) return { allowed: true, remaining: Infinity };
  const state = readShieldWeekState(now);
  const remaining = Math.max(0, SHIELD_FREE_WEEKLY_LIMIT - state.weekCount);
  return { allowed: remaining > 0, remaining };
}

export function readShieldTotalCompleted() {
  return Math.max(0, Math.floor(getNumber(StorageKeys.shieldTotalCompleted) ?? 0));
}

export function incrementShieldTotalCompleted() {
  const next = readShieldTotalCompleted() + 1;
  setNumber(StorageKeys.shieldTotalCompleted, next);
  return next;
}

export function recordShieldSession(params: {
  startedAtMs: number;
  endedAtMs: number;
  completed: boolean;
}) {
  const durationSec = Math.max(0, Math.floor((params.endedAtMs - params.startedAtMs) / 1000));
  const started = new Date(params.startedAtMs);
  const session: ShieldSession = {
    startedAt: started.toISOString(),
    completed: params.completed,
    durationSec,
    hourOfDay: started.getHours(),
    createdAt: new Date(params.endedAtMs).toISOString(),
  };
  appendShieldSession(session);
  if (params.completed) incrementShieldTotalCompleted();
  return session;
}
