"use client";

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
    <div className="space-y-4">
      <div className="space-y-1">
        <DialogTitle className="text-lg font-bold">{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </div>
      <SignInForm callbackUrl="/order" embedded />
    </div>
  );
}
