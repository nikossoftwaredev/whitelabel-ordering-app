"use client";

import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCheckoutStore } from "@/lib/stores/checkout-store";

export function CheckoutCommentRow() {
  const t = useTranslations("Checkout");
  const notes = useCheckoutStore((s) => s.notes);
  const showNotes = useCheckoutStore((s) => s.showNotes);
  const setNotes = useCheckoutStore((s) => s.setNotes);
  const setShowNotes = useCheckoutStore((s) => s.setShowNotes);

  if (!showNotes) {
    return (
      <div className="px-4 pb-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowNotes(true)}
          className="flex items-center gap-3 w-full py-3 h-auto group"
        >
          <MessageSquare className="size-5 text-muted-foreground" />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">
              {t("addCommentForVenue")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("specialRequests")}
            </p>
          </div>
          <span
            className="text-sm font-semibold"
            style={{
              color: "var(--brand-primary, hsl(var(--primary)))",
            }}
          >
            {t("edit")}
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pb-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t("commentForVenue")}</p>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setNotes("");
              setShowNotes(false);
            }}
            className="text-xs text-muted-foreground hover:text-foreground h-auto py-0.5 px-1"
          >
            {t("remove")}
          </Button>
        </div>
        <Textarea
          placeholder={t("specialInstructions")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-xl bg-muted/30 border-border/50 resize-none"
          autoFocus
        />
      </div>
    </div>
  );
}
