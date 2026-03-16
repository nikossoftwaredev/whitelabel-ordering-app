"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

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
        className="rounded-t-2xl max-w-lg mx-auto px-6 pb-10"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Complete your profile</SheetTitle>
          <SheetDescription>
            Add your name and phone number for a faster checkout experience.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">Phone number</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="699 000 0000"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
