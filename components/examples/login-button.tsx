"use client";

import { LogIn } from "lucide-react";
import { signIn,useSession } from "next-auth/react";

import { ProfileAvatar } from "@/components/auth/profile-avatar";
import { Button } from "@/components/ui/button";

export const LoginButton = () => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Button variant="outline" size="icon" disabled>
        <LogIn className="h-4 w-4" />
      </Button>
    );
  }

  if (session?.user) return <ProfileAvatar user={session.user} />;

  return (
    <Button onClick={() => signIn("google")} size="sm" className="gap-2">
      <LogIn className="h-4 w-4" />
      <span className="hidden sm:inline">Sign in</span>
    </Button>
  );
};