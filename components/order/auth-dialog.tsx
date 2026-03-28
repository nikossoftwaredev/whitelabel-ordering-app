"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { SignInForm } from "@/components/auth/signin-form";
import {
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const AUTH_DIALOG = "auth";

export function AuthContent() {
  const t = useTranslations("AuthDialog");

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      <DialogHeader>
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
      </DialogHeader>

      {/* Decorative header section */}
      <div className="px-5 pb-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 size-10 rounded-xl bg-primary flex items-center justify-center">
            <ShoppingBag className="size-4.5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-base leading-tight">{t("title")}</p>
            <p className="text-sm text-muted-foreground leading-snug">{t("description")}</p>
          </div>
        </div>

        <SignInForm callbackUrl="/order" embedded />
      </div>
    </div>
  );
}
