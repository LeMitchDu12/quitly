import { StorageKeys } from "../storage/keys";
import { getString, setString } from "../storage/mmkv";
import type { JournalCreatePayload, JournalEntry, JournalMood } from "./journalTypes";

const MAX_JOURNAL_ENTRIES = 300;

type UnsafeJournalEntry = {
  id?: unknown;
  createdAt?: unknown;
  mood?: unknown;
  linkedToShield?: unknown;
  linkedToRelapse?: unknown;
  text?: unknown;
};

function isJournalMood(value: unknown): value is JournalMood {
  return value === "stable" || value === "stress" || value === "craving" || value === "proud";
}

function sanitizeJournalEntry(raw: unknown): JournalEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as UnsafeJournalEntry;

  if (typeof candidate.id !== "string" || !candidate.id.trim()) return null;
  const createdAt = Number(candidate.createdAt);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return null;
  if (typeof candidate.text !== "string") return null;

  return {
    id: candidate.id,
    createdAt,
    mood: isJournalMood(candidate.mood) ? candidate.mood : undefined,
    linkedToShield: typeof candidate.linkedToShield === "boolean" ? candidate.linkedToShield : undefined,
    linkedToRelapse: typeof candidate.linkedToRelapse === "boolean" ? candidate.linkedToRelapse : undefined,
    text: candidate.text.trim(),
  };
}

function writeEntries(entries: JournalEntry[]) {
  setString(StorageKeys.journalEntries, JSON.stringify(entries));
}

function trimFIFO(entries: JournalEntry[]): JournalEntry[] {
  if (entries.length <= MAX_JOURNAL_ENTRIES) return entries;
  return entries.slice(entries.length - MAX_JOURNAL_ENTRIES);
}

function makeJournalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readJournalEntries(): JournalEntry[] {
  const raw = getString(StorageKeys.journalEntries);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.map(sanitizeJournalEntry).filter((entry): entry is JournalEntry => entry != null);
    return clean.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function createJournalEntry(payload: JournalCreatePayload): JournalEntry {
  const trimmedText = payload.text.trim();
  const entry: JournalEntry = {
    id: makeJournalId(),
    createdAt: Date.now(),
    mood: payload.mood,
    linkedToShield: payload.linkedToShield ? true : undefined,
    linkedToRelapse: payload.linkedToRelapse ? true : undefined,
    text: trimmedText,
  };

  const existingDesc = readJournalEntries();
  const nextDesc = [entry, ...existingDesc];
  const ascending = nextDesc.sort((a, b) => a.createdAt - b.createdAt);
  const trimmed = trimFIFO(ascending);
  writeEntries(trimmed);

  return entry;
}

export function getJournalEntryById(entryId: string): JournalEntry | undefined {
  return readJournalEntries().find((entry) => entry.id === entryId);
}
