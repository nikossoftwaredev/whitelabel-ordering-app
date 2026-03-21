"use client";

import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialogStore } from "@/lib/stores/dialog-store";

export const STORE_INFO_DIALOG = "store-info";

interface OperatingHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface StoreInfoDialogData {
  storeName: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  operatingHours?: OperatingHour[];
}

export const StoreInfoDialog = () => {
  const t = useTranslations("Menu");
  const open = useDialogStore((s) => s.currentDialog === STORE_INFO_DIALOG);
  const dialogData = useDialogStore((s) => s.dialogData);
  const closeDialog = useDialogStore((s) => s.closeDialog);

  const data = dialogData as StoreInfoDialogData | null;

  const storeName = data?.storeName ?? "";
  const { description, phone, email, address, operatingHours } = data ?? {};
  const today = new Date().getDay();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeDialog(STORE_INFO_DIALOG);
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-lg">{storeName}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 pb-6">
          {/* ═══ CALL CTA (HERO) ═══ */}
          {phone && (
            <div className="flex flex-col items-center gap-2">
              <a
                href={`tel:${phone}`}
                className="flex items-center justify-center gap-3 w-full rounded-xl bg-green-600 hover:bg-green-700 text-white py-4 px-6 text-lg font-semibold transition-colors duration-300"
              >
                <Phone className="size-5" />
                <span>{phone}</span>
              </a>
              <span className="text-xs text-muted-foreground">
                {t("tapToCall")}
              </span>
            </div>
          )}

          {/* ═══ OPERATING HOURS ═══ */}
          {operatingHours && operatingHours.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("hours")}</span>
              </div>
              <div className="space-y-1.5">
                {operatingHours.map((h) => {
                  const isToday = h.dayOfWeek === today;
                  return (
                    <div
                      key={h.dayOfWeek}
                      className={`flex items-center justify-between text-sm px-2 py-1 rounded-md ${
                        isToday ? "bg-primary/5 font-medium" : ""
                      }`}
                    >
                      <span>{t(`day${h.dayOfWeek}`)}</span>
                      <span
                        className={
                          h.isClosed
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        {h.isClosed
                          ? t("closed")
                          : `${h.openTime} – ${h.closeTime}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ CONTACT & LOCATION ═══ */}
          {(email || address) && (
            <div className="rounded-xl border bg-card p-4">
              <div className="space-y-3">
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-3 text-sm hover:text-primary transition-colors duration-300"
                  >
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <span>{email}</span>
                  </a>
                )}
                {address && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{address}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
