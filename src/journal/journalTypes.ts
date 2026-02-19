export type JournalMood = "stable" | "stress" | "craving" | "proud";

export type JournalEntry = {
  id: string;
  createdAt: number;
  mood?: JournalMood;
  linkedToShield?: boolean;
  linkedToRelapse?: boolean;
  text: string;
};

export type JournalCreatePayload = {
  mood?: JournalMood;
  linkedToShield?: boolean;
  linkedToRelapse?: boolean;
  text: string;
};
