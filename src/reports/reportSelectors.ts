function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function parseMonthKey(monthKey: string) {
  const [yRaw, mRaw] = monthKey.split("-");
  const year = Number(yRaw);
  const month = Number(mRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    const fallback = new Date();
    return { year: fallback.getFullYear(), month: fallback.getMonth() + 1 };
  }
  return { year, month };
}

export function getMonthBounds(monthKey: string) {
  const { year, month } = parseMonthKey(monthKey);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getDaysInMonth(monthKey: string) {
  const { end } = getMonthBounds(monthKey);
  return end.getDate();
}

export function isCurrentMonth(monthKey: string, now = new Date()) {
  return toMonthKey(now) === monthKey;
}

export function getPreviousMonthKey(monthKey: string) {
  const { year, month } = parseMonthKey(monthKey);
  const d = new Date(year, month - 2, 1);
  return toMonthKey(d);
}

export function listLastMonthKeys(count: number, now = new Date()) {
  const keys: string[] = [];
  const anchor = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 0; i < count; i += 1) {
    const candidate = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    keys.push(toMonthKey(candidate));
  }
  return keys;
}

export function getMonthLabel(monthKey: string, locale: string) {
  const { start } = getMonthBounds(monthKey);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(start);
}

export function getISOWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
