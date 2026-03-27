"use client";

import {
  ArrowLeft,
  ChevronDown,
  ShoppingCart,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DIALOG_KEYS } from "@/components/dialog-provider";
import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { getAddressLabelIcon } from "@/lib/address/label-icon";
import { useAddressStore } from "@/lib/stores/address-store";
import { useCartStore } from "@/lib/stores/cart-store";
import { useDialogStore } from "@/lib/stores/dialog-store";

import { ProfilePromptSheet } from "./profile-prompt-sheet";

export const CustomerHeader = () => {
  const t = useTranslations("Address");
  const tProfile = useTranslations("Profile");
  const tOrders = useTranslations("OrderHistory");
  const tCheckout = useTranslations("Checkout");
  const tenant = useTenant();
  const cartItemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const selectedAddress = useAddressStore((s) => s.selectedAddress);
  const pathname = usePathname();

  // Subpages have no hero image, so force solid header styling
  const isSubpage = /\/(profile|orders|confirmation|checkout)/.test(pathname);

  // Determine subpage title
  const subpageMatch = pathname.match(/\/(profile|orders|confirmation|checkout)/);
  const subpageKey = subpageMatch?.[1] as string | undefined;
  const subpageTitles: Record<string, string> = {
    profile: tProfile("title"),
    orders: tOrders("title"),
    confirmation: tOrders("title"),
    checkout: tCheckout("title"),
  };
  const subpageTitle = subpageKey ? subpageTitles[subpageKey] : null;

  const openDialog = useDialogStore((s) => s.openDialog);

  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);

    const onScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  let addressDisplay = t("addAddress");
  if (selectedAddress) {
    addressDisplay = selectedAddress.street.length > 22
      ? selectedAddress.street.slice(0, 22) + "..."
      : selectedAddress.street;
  }

  // When over hero (not scrolled): white text on transparent bg
  // When scrolled or on subpages (no hero): theme-aware bg + text
  const solid = scrolled || isSubpage;
  const headerClasses = solid
    ? "bg-background/95 backdrop-blur-md shadow-lg text-foreground"
    : "bg-transparent text-white";

  const subtleTextClass = solid ? "text-muted-foreground" : "text-white/60";
  const hoverBgClass = solid ? "hover:bg-muted" : "hover:bg-white/10";
  const iconDimClass = solid ? "text-muted-foreground" : "text-white/50";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerClasses}`}
      >
        <div className="max-w-7xl mx-auto flex items-center h-14 px-3 sm:px-4 gap-1.5 sm:gap-3">
          {isSubpage ? (
            <>
              {/* Back arrow + page title on subpages */}
              <Link href="/order">
                <Button variant="ghost" size="icon" className={`shrink-0 ${hoverBgClass}`}>
                  <ArrowLeft className="size-5" />
                </Button>
              </Link>
              <h1 className="text-lg font-bold">{subpageTitle}</h1>
            </>
          ) : (
            <>
              {/* Address Picker */}
              <button
                onClick={() => openDialog(DIALOG_KEYS.ADDRESS_MANAGER)}
                className={`flex items-center gap-1.5 py-1.5 px-2 sm:px-3 rounded-lg ${hoverBgClass} transition-colors duration-200 cursor-pointer shrink min-w-0`}
              >
                {getAddressLabelIcon(selectedAddress?.label, `size-4 shrink-0 ${subtleTextClass}`)}
                <span className="text-sm font-semibold truncate drop-shadow-sm max-w-32 sm:max-w-none">
                  {addressDisplay}
                </span>
                <ChevronDown className={`size-3.5 shrink-0 ${iconDimClass}`} />
              </button>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            {/* User Avatar */}
            <UserAvatarMenu
              showCustomerLinks
              onSignInClick={() => openDialog(DIALOG_KEYS.AUTH)}
            />

            {/* Cart Button */}
            <Button
              variant="ghost"
              size="icon"
              className={`relative size-9 rounded-lg ${hoverBgClass}`}
              onClick={() => openDialog(DIALOG_KEYS.CART)}
              disabled={mounted && cartItemCount === 0}
            >
              <ShoppingCart className="size-5" />
              {mounted && cartItemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center justify-center min-w-4.5 h-4.5 rounded-full text-[10px] font-bold text-white px-1 tabular-nums"
                  style={{
                    backgroundColor:
                      "var(--brand-primary, hsl(var(--primary)))",
                  }}
                >
                  {cartItemCount}
                </span>
              )}
            </Button>

          </div>
        </div>
      </header>

      <ProfilePromptSheet />
    </>
  );
};
