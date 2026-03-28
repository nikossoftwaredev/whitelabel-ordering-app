"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { SignInForm } from "@/components/auth/signin-form";
import {
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export const AUTH_DIALOG = "auth";

export function AuthContent() {
  const t = useTranslations("AuthDialog");

  return (
    <div>
      {/* Warm gradient header */}
      <div className="relative -m-6 mb-0 px-6 pt-8 pb-6 overflow-hidden bg-linear-to-br from-primary/8 via-primary/4 to-transparent border-b border-border/50">
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 size-28 rounded-full bg-primary/5" />
        <div className="absolute top-2 right-8 size-12 rounded-full bg-primary/4" />

        <div className="relative flex items-start gap-4">
          <div className="shrink-0 size-11 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
            <ShoppingBag className="size-5 text-primary-foreground" />
          </div>
          <div className="space-y-0.5 pt-0.5">
            <DialogTitle className="text-xl font-bold leading-tight tracking-tight">
              {t("title")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-snug">
              {t("description")}
            </DialogDescription>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="pt-5">
        <SignInForm callbackUrl="/order" embedded />
      </div>
    </div>
  );
}
