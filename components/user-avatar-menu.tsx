"use client";

import {
  Download,
  Globe,
  LogOut,
  Moon,
  Settings,
  ShoppingBag,
  Sun,
  User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { TenantSummary, TenantSwitcherItem } from "@/components/tenant-switcher-item";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
] as const;

interface UserAvatarMenuProps {
  /** When true, shows "My Profile", "My Orders", and conditionally "My Stores" */
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
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [tenants, setTenants] = useState<TenantSummary[] | null>(null);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const user = session?.user;

  useEffect(() => {
    setMounted(true);
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

  const fetchTenants = useCallback(() => {
    if (!user || !showCustomerLinks || tenants !== null) return;
    setTenantsLoading(true);
    fetch("/api/user/tenants")
      .then((r) => r.json())
      .then((data) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => setTenants([]))
      .finally(() => setTenantsLoading(false));
  }, [user, showCustomerLinks, tenants]);

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

  // Render a static avatar button during SSR to avoid Radix useId() hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        className="flex items-center gap-1 rounded-full hover:bg-muted/50 h-auto p-0.5"
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
    );
  }

  return (
    <>
      <DropdownMenu onOpenChange={(open) => { if (open) fetchTenants(); }}>
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
            </>
          )}

          {showCustomerLinks && (tenantsLoading || tenants === null || tenants.length > 0) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                My Stores
              </DropdownMenuLabel>
              {tenantsLoading || tenants === null ? (
                <>
                  <div className="mx-2 my-1 h-8 rounded-md bg-muted animate-pulse" />
                  <div className="mx-2 my-1 h-8 rounded-md bg-muted animate-pulse" />
                </>
              ) : (
                tenants.map((tenant) => (
                  <TenantSwitcherItem key={tenant.id} tenant={tenant} />
                ))
              )}
            </>
          )}

          <DropdownMenuItem
            onClick={() => setSettingsOpen(true)}
            className="cursor-pointer"
          >
            <Settings className="mr-2 size-4" />
            Settings
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
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/${locale}/order` })}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-5 mt-6">
            {/* Theme */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Theme</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all duration-300 cursor-pointer ${
                    resolvedTheme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Sun className="size-5 text-amber-600" />
                  </div>
                  <span className="text-xs font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all duration-300 cursor-pointer ${
                    resolvedTheme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div className="size-10 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                    <Moon className="size-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-xs font-medium">Dark</span>
                </button>
              </div>
            </div>

            {/* Language */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Language</span>
              </div>
              <div className="flex flex-col gap-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      router.replace(pathname, { locale: lang.code });
                      setSettingsOpen(false);
                    }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 cursor-pointer ${
                      locale === lang.code
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span className="text-xl leading-none">{lang.flag}</span>
                    <span className="text-sm">{lang.name}</span>
                    {locale === lang.code && (
                      <div className="ml-auto size-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
