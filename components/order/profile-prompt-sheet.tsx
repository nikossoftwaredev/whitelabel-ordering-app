"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const PROMPT_KEY = "profile-prompt-shown";

export function ProfilePromptSheet() {
  const t = useTranslations("ProfilePrompt");
  const { data: session, update } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(PROMPT_KEY)) return;

    // Fetch profile to check if phone is missing
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        const hasPhone = (data.phone || "").trim().length > 0;
        if (!hasPhone) {
          setName(data.name || session.user?.name || "");
          setPhone("");
          setOpen(true);
        } else {
          sessionStorage.setItem(PROMPT_KEY, "1");
        }
      })
      .catch(() => {});
  }, [session?.user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      await update(); // refresh session
      sessionStorage.setItem(PROMPT_KEY, "1");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem(PROMPT_KEY, "1");
    setOpen(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) handleSkip();
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-w-lg mx-auto pb-10"
      >
        <SheetHeader className="text-left">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">{t("fullName")}</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">{t("phone")}</Label>
            <PhoneInput
              id="profile-phone"
              value={phone}
              onChange={setPhone}
              placeholder={t("phonePlaceholder")}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleSkip}>
              {t("skipForNow")}
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
