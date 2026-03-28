"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const GoogleLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export const SignInForm = ({ callbackUrl = "/", embedded = false }: { callbackUrl?: string; embedded?: boolean }) => {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    const absoluteCallback = new URL(callbackUrl, window.location.origin).href;
    await signIn("google", { callbackUrl: absoluteCallback });
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoadingEmail(true);
    await signIn("email", { email, callbackUrl, redirect: false });
    setIsLoadingEmail(false);
    setSent(true);
  };

  const googleButton = (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={isLoadingGoogle}
      className="w-full flex items-center justify-center gap-3 h-11 px-4 rounded-xl border border-border bg-background hover:bg-muted/60 transition-all duration-200 text-sm font-medium shadow-xs disabled:opacity-60 cursor-pointer"
    >
      {isLoadingGoogle ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (
        <>
          <GoogleLogo className="size-4 shrink-0" />
          <span>{t("continueWithGoogle")}</span>
        </>
      )}
    </button>
  );

  const emailForm = sent ? (
    <div className="text-center py-2 space-y-1">
      <p className="text-sm font-medium text-foreground">✉️ {t("checkEmail") ?? "Check your email"}</p>
      <p className="text-xs text-muted-foreground">{t("magicLinkSent") ?? `We sent a link to ${email}`}</p>
    </div>
  ) : (
    <form onSubmit={handleEmailSignIn} className="space-y-2.5">
      <div className="relative">
        <Input
          id="email-signin"
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 pr-30 rounded-xl"
          autoComplete="email"
        />
        <button
          type="submit"
          disabled={isLoadingEmail || !email}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 transition-opacity duration-200 cursor-pointer flex items-center gap-1.5"
        >
          {isLoadingEmail ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            t("sendMagicLink")
          )}
        </button>
      </div>
    </form>
  );

  const divider = (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">{t("or")}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );

  const content = isStandalone ? (
    <div className="space-y-3">
      {emailForm}
      {divider}
      {googleButton}
    </div>
  ) : (
    <div className="space-y-3">
      {googleButton}
      {divider}
      {emailForm}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("signIn")}</CardTitle>
        <CardDescription>{t("chooseMethod")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
      </CardContent>
    </Card>
  );
};
