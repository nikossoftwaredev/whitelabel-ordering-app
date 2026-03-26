"use client";

import { CalendarClock, ChevronDown, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useTenant } from "@/components/tenant-provider";
import { useCheckoutStore } from "@/lib/stores/checkout-store";

export function CheckoutScheduleCard() {
  const t = useTranslations("Checkout");
  const tenant = useTenant();
  const scheduleMode = useCheckoutStore((s) => s.scheduleMode);
  const scheduledDate = useCheckoutStore((s) => s.scheduledDate);
  const scheduledTime = useCheckoutStore((s) => s.scheduledTime);
  const setScheduleMode = useCheckoutStore((s) => s.setScheduleMode);
  const setScheduledDate = useCheckoutStore((s) => s.setScheduledDate);
  const setScheduledTime = useCheckoutStore((s) => s.setScheduledTime);

  const [expanded, setExpanded] = useState(false);

  // Generate time slots (every 30 min) from now+30min to end of day
  const generateTimeSlots = () => {
    const now = new Date();
    const slots: string[] = [];
    const isToday = scheduledDate === "today";

    const minHour = isToday ? now.getHours() : 0;
    const minMinute = isToday ? now.getMinutes() + 30 : 0;

    for (let h = Math.max(minHour, 0); h < 24; h++) {
      for (const m of [0, 30]) {
        if (isToday && (h < minHour || (h === minHour && m < minMinute)))
          continue;
        slots.push(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        );
      }
    }
    return slots;
  };

  // Summary label for collapsed state
  let summaryLabel: string;
  if (scheduleMode && scheduledTime) {
    summaryLabel = `${t(scheduledDate as "today" | "tomorrow")} ${scheduledTime}`;
  } else if (scheduleMode) {
    summaryLabel = t("scheduleForLater");
  } else {
    summaryLabel = `${t("standard")} (${tenant.prepTimeMinutes}-${tenant.prepTimeMinutes + 10} min)`;
  }

  return (
    <div className="px-4 pb-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {t("when")}
      </h3>

      {/* Collapsed clickable card */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50 transition-all duration-300 text-left"
      >
        {scheduleMode ? (
          <CalendarClock
            className="size-5 shrink-0"
            style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
          />
        ) : (
          <Clock
            className="size-5 shrink-0"
            style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
          />
        )}
        <span className="flex-1 text-sm font-semibold">{summaryLabel}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded schedule options */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {/* Standard option */}
          <button
            type="button"
            onClick={() => {
              setScheduleMode(false);
              setScheduledDate("");
              setScheduledTime("");
              setExpanded(false);
            }}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
              !scheduleMode
                ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
                : "border-border/50 hover:border-border"
            }`}
          >
            <Clock
              className="size-5"
              style={{
                color: !scheduleMode
                  ? "var(--brand-primary, hsl(var(--primary)))"
                  : "var(--muted-foreground)",
              }}
            />
            <div>
              <p className="text-sm font-semibold">{t("standard")}</p>
              <p className="text-xs text-muted-foreground">
                {tenant.prepTimeMinutes}-{tenant.prepTimeMinutes + 10} min
              </p>
            </div>
          </button>

          {/* Schedule for later option */}
          <button
            type="button"
            onClick={() => {
              setScheduleMode(true);
              if (!scheduledDate) setScheduledDate("today");
            }}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
              scheduleMode
                ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
                : "border-border/50 hover:border-border"
            }`}
          >
            <CalendarClock
              className="size-5"
              style={{
                color: scheduleMode
                  ? "var(--brand-primary, hsl(var(--primary)))"
                  : "var(--muted-foreground)",
              }}
            />
            <div>
              <p className="text-sm font-semibold">{t("scheduleForLater")}</p>
              <p className="text-xs text-muted-foreground">
                {t("selectTime")}
              </p>
            </div>
          </button>

          {/* Date + Time selectors */}
          {scheduleMode && (
            <div className="space-y-3 pt-2">
              {/* Day toggle */}
              <div className="flex gap-2">
                {(["today", "tomorrow"] as const).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setScheduledDate(day);
                      setScheduledTime("");
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border-2 cursor-pointer active:scale-[0.97] ${
                      scheduledDate === day
                        ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/10 text-foreground"
                        : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {t(day)}
                  </button>
                ))}
              </div>

              {/* Time slots grid */}
              {scheduledDate && (
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                  {generateTimeSlots().map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setScheduledTime(slot);
                        setExpanded(false);
                      }}
                      className={`py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                        scheduledTime === slot
                          ? "text-white"
                          : "bg-muted/50 text-foreground hover:bg-muted"
                      }`}
                      style={
                        scheduledTime === slot
                          ? {
                              background:
                                "var(--brand-primary, hsl(var(--primary)))",
                            }
                          : undefined
                      }
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
