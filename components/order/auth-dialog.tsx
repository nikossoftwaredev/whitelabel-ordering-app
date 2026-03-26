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
    <div className="flex flex-col flex-1">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <div className="px-6 pb-6">
        <SignInForm callbackUrl="/order" embedded />
      </div>
    </div>
  );
}
