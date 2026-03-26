export type DatePreset =
  | "today"
  | "last7days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "custom";

export const DATE_PRESET_KEYS: Exclude<DatePreset, "custom">[] = [
  "today",
  "last7days",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "lastYear",
];

export function getDateRange(preset: Exclude<DatePreset, "custom">): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  switch (preset) {
    case "today":
      return { startDate: todayStart, endDate: todayEnd };

    case "last7days": {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { startDate: start, endDate: todayEnd };
    }

    case "thisMonth":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: todayEnd,
      };

    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case "thisYear":
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: todayEnd,
      };

    case "lastYear": {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
  }
}

export type Granularity = "hour" | "day" | "week" | "month";

export function determineGranularity(startDate: Date, endDate: Date): Granularity {
  const diffMs = endDate.getTime() - startDate.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 1) return "hour";
  if (days <= 31) return "day";
  if (days <= 90) return "week";
  return "month";
}

export function toISODateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
