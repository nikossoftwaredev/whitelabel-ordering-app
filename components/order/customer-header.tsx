"use client";

import { ChevronDown, LogOut, Moon, Settings,ShoppingBag, Sun, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect,useState } from "react";

import { useTenant } from "@/components/tenant-provider";
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
import { useCartStore } from "@/lib/stores/cart-store";

import { AuthDialog } from "./auth-dialog";
import { CartSheet } from "./cart-sheet";
import { ProfilePromptSheet } from "./profile-prompt-sheet";

export const CustomerHeader = () => {
  const { data: session } = useSession();
  const tenant = useTenant();
  const cart = useCartStore();
  const itemCount = cart.itemCount();
  const { resolvedTheme, setTheme } = useTheme();

  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const user = session?.user;

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    fetch("/api/user/role")
      .then((r) => r.json())
      .then((data) => setIsAdmin(data.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [user]);
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto flex items-center h-14 px-4 gap-3">
          {/* Logo + Store name */}
          <Link
            href="/order"
            className="flex items-center gap-2.5 shrink-0 group"
          >
            {tenant.logo ? (
              <div className="size-8 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img
                  src={tenant.logo}
                  alt={tenant.name}
                  className="size-full object-contain p-0.5"
                />
              </div>
            ) : (
              <div
                className="size-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor:
                    "var(--brand-primary, hsl(var(--primary)))",
                }}
              >
                <span className="text-white text-sm font-bold">
                  {tenant.name.charAt(0)}
                </span>
              </div>
            )}
            <span className="text-[15px] font-bold hidden sm:block group-hover:opacity-80 transition-opacity duration-200">
              {tenant.name}
            </span>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User Profile */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1.5 rounded-full pr-1 hover:bg-muted/50 h-auto p-0">
                  <Avatar className="size-8">
                    <AvatarImage
                      src={user.image || ""}
                      alt={user.name || "User"}
                    />
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
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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
                <DropdownMenuItem
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="cursor-pointer"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="mr-2 size-4" />
                  ) : (
                    <Moon className="mr-2 size-4" />
                  )}
                  {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
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
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => setAuthOpen(true)}
            >
              <User className="size-4" />
              <span className="text-sm">Sign in</span>
            </Button>
          )}

          {/* Cart Button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative size-10 rounded-full hover:bg-muted/50"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="size-5" />
            {itemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-5 h-5 rounded-full text-[11px] font-bold text-white px-1 tabular-nums"
                style={{
                  backgroundColor:
                    "var(--brand-primary, hsl(var(--primary)))",
                }}
              >
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        tenantSlug={tenant.slug}
      />

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <ProfilePromptSheet />
    </>
  );
};
