"use client";

import { ArrowLeft, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";

const LANGUAGES = [
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

export function ProfilePage() {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
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

  let saveLabel = t("saveChanges");
  if (saving) saveLabel = t("saving");
  else if (saved) saveLabel = t("saved");

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
            <h1 className="text-lg font-bold">{t("title")}</h1>
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
              <Label htmlFor="edit-name">{t("fullName")}</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">{t("email")}</Label>
              <Input id="edit-email" value={email} disabled className="opacity-60" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">{t("phone")}</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
              />
            </div>

            {/* Language switcher */}
            <div className="space-y-1.5">
              <Label>{t("language")}</Label>
              <div className="flex gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => router.replace(pathname, { locale: lang.code })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                      locale === lang.code
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saveLabel}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
