/**
 * Utility to check if a store is currently open based on operating hours and timezone.
 *
 * dayOfWeek convention (matches JS getDay()):
 *   0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */

interface OperatingHour {
  dayOfWeek: number;
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
  isClosed: boolean;
}

interface StoreStatus {
  isOpen: boolean;
  reason?: "closed_today" | "outside_hours" | "no_hours_configured";
  opensAt?: string;
  currentTime?: string;
  currentDay?: string;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function isStoreOpen(
  operatingHours: OperatingHour[],
  timezone: string = "Europe/Athens"
): StoreStatus {
  if (!operatingHours || operatingHours.length === 0) {
    return { isOpen: true };
  }

  // Get current time and day in the store's timezone
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const hour = parts.find((p) => p.type === "hour")?.value || "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const weekdayShort = parts.find((p) => p.type === "weekday")?.value || "Mon";
  const currentTime = `${hour}:${minute}`;
  const dayOfWeek = WEEKDAY_MAP[weekdayShort] ?? 1;

  const currentDayName = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(now);

  // Find today's operating hours
  const todayHours = operatingHours.find((h) => h.dayOfWeek === dayOfWeek);

  if (!todayHours) {
    return { isOpen: true, currentTime, currentDay: currentDayName };
  }

  if (todayHours.isClosed) {
    return {
      isOpen: false,
      reason: "closed_today",
      currentTime,
      currentDay: currentDayName,
    };
  }

  const currentMinutes = timeToMinutes(currentTime);
  const openMinutes = timeToMinutes(todayHours.openTime);
  const closeMinutes = timeToMinutes(todayHours.closeTime);

  // Handle overnight hours (e.g., open 18:00, close 02:00)
  if (closeMinutes <= openMinutes) {
    const isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    if (!isOpen) {
      return {
        isOpen: false,
        reason: "outside_hours",
        opensAt: todayHours.openTime,
        currentTime,
        currentDay: currentDayName,
      };
    }
    return { isOpen: true, currentTime, currentDay: currentDayName };
  }

  // Normal hours
  if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      reason: "outside_hours",
      opensAt: todayHours.openTime,
      currentTime,
      currentDay: currentDayName,
    };
  }

  if (currentMinutes >= closeMinutes) {
    return {
      isOpen: false,
      reason: "outside_hours",
      currentTime,
      currentDay: currentDayName,
    };
  }

  return { isOpen: true, currentTime, currentDay: currentDayName };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
