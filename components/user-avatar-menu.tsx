"use client";

import {
  Download,
  LogOut,
  Moon,
  Settings,
  ShoppingBag,
  Sun,
  User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/lib/i18n/navigation";

interface UserAvatarMenuProps {
  /** When true, shows "My Profile", "My Orders", and conditionally "Admin Panel" */
  showCustomerLinks?: boolean;
  /** Called when user is not signed in and clicks the avatar — lets parent open auth dialog */
  onSignInClick?: () => void;
}

export const UserAvatarMenu = ({
  showCustomerLinks = false,
  onSignInClick,
}: UserAvatarMenuProps) => {
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const user = session?.user;

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
          true
    );
    setIsMobile(
      /android|iphone|ipad|ipod|mobile|tablet/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
    );
  }, []);

  useEffect(() => {
    if (!user || !showCustomerLinks) {
      setIsAdmin(false);
      return;
    }
    fetch("/api/user/role")
      .then((r) => r.json())
      .then((data) => setIsAdmin(data.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [user, showCustomerLinks]);

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-10 rounded-full hover:bg-muted/50"
        onClick={onSignInClick}
      >
        <User className="size-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1 rounded-full hover:bg-muted/50 h-auto p-0.5 cursor-pointer"
        >
          <Avatar className="size-8">
            <AvatarImage src={user.image || ""} alt={user.name || "User"} />
            <AvatarFallback
              className="text-xs font-semibold"
              style={{
                backgroundColor:
                  "var(--brand-primary, hsl(var(--primary)))",
                color: "white",
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {showCustomerLinks && (
          <>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/order/profile">
                <User className="mr-2 size-4" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/order/orders">
                <ShoppingBag className="mr-2 size-4" />
                My Orders
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/admin">
                    <Settings className="mr-2 size-4" />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </>
        )}

        <DropdownMenuItem
          onClick={() =>
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }
          className="cursor-pointer"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="mr-2 size-4" />
          ) : (
            <Moon className="mr-2 size-4" />
          )}
          {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>

        {showCustomerLinks && !isStandalone && isMobile && (
          <DropdownMenuItem
            onClick={() => {
              const prompt = (window as unknown as { __pwaInstallPrompt?: { prompt: () => void } }).__pwaInstallPrompt;
              if (prompt) {
                prompt.prompt();
              } else {
                window.dispatchEvent(new Event("show-pwa-prompt"));
              }
            }}
            className="cursor-pointer"
          >
            <Download className="mr-2 size-4" />
            Download App
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/order" })}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
