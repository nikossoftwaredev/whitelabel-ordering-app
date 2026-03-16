"use client";

import { useTranslations } from "next-intl";

import { SignInForm } from "@/components/auth/signin-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const t = useTranslations("AuthDialog");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-6 gap-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-bold">
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <SignInForm callbackUrl="/order" />
      </DialogContent>
    </Dialog>
  );
}
