"use client";

import { useTranslations } from "next-intl";

import { SignInForm } from "@/components/auth/signin-form";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const AUTH_DIALOG = "auth";

export function AuthContent() {
  const t = useTranslations("AuthDialog");

  return (
    <div className="p-6 space-y-6">
      <DialogHeader className="space-y-2">
        <DialogTitle className="text-2xl font-bold">{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <SignInForm callbackUrl="/order" />
    </div>
  );
}
