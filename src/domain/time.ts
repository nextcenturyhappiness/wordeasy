const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertIanaTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date(0));
  } catch {
    throw new Error(`Invalid IANA timezone: ${timezone}`);
  }
}

export function studyDateFor(now: Date, timezone: string): string {
  assertIanaTimezone(timezone);
  if (Number.isNaN(now.getTime())) {
    throw new Error("Cannot derive a study date from an invalid time.");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = value.year;
  const month = value.month;
  const day = value.day;
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Could not derive a study date in ${timezone}.`);
  }
  return `${year}-${month}-${day}`;
}

function epochDay(studyDate: string): number {
  if (!DATE_PATTERN.test(studyDate)) {
    throw new Error(`Invalid study date: ${studyDate}`);
  }
  return Date.parse(`${studyDate}T00:00:00.000Z`) / 86_400_000;
}

export function calculateStreak(studyDates: string[]): number {
  const uniqueDates = [...new Set(studyDates)].sort();
  if (uniqueDates.length === 0) {
    return 0;
  }

  let streak = 1;
  for (let index = uniqueDates.length - 1; index > 0; index -= 1) {
    const current = uniqueDates[index];
    const previous = uniqueDates[index - 1];
    if (current === undefined || previous === undefined) {
      break;
    }
    if (epochDay(current) - epochDay(previous) !== 1) {
      break;
    }
    streak += 1;
  }
  return streak;
}
