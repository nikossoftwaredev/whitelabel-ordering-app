"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignInForm } from "@/components/auth/signin-form";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-6 gap-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-bold">
            Create an account or log in
          </DialogTitle>
          <DialogDescription>
            Log in to place your order. Your cart will be saved.
          </DialogDescription>
        </DialogHeader>
        <SignInForm callbackUrl="/order/checkout" />
      </DialogContent>
    </Dialog>
  );
}
