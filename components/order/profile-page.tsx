"use client";

import { ArrowLeft, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/lib/i18n/navigation";

export function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, phone: phone.trim() || undefined }),
      });
      await update();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = saving ? "Saving..." : "Save changes";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/order">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">My Profile</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3 pb-2">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" className="size-12 rounded-full object-cover" />
                ) : (
                  <User className="size-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold">{session?.user?.name || "User"}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" value={email} disabled className="opacity-60" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone number</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="699 000 0000"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saved ? "Saved!" : saveLabel}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
