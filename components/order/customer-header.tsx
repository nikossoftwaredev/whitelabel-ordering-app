"use client";

import {
  ChevronDown,
  MapPin,
  Search,
  ShoppingCart,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useTenant } from "@/components/tenant-provider";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { Button } from "@/components/ui/button";
import { useAddressStore } from "@/lib/stores/address-store";
import { useCartStore } from "@/lib/stores/cart-store";

import { AddressManagerSheet } from "./address-manager-sheet";
import { AuthDialog } from "./auth-dialog";
import { CartSheet } from "./cart-sheet";
import { ProfilePromptSheet } from "./profile-prompt-sheet";

export const CustomerHeader = () => {
  const t = useTranslations("Address");
  const tenant = useTenant();
  const cart = useCartStore();
  const selectedAddress = useAddressStore((s) => s.selectedAddress);

  const [mounted, setMounted] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
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
  // When scrolled: theme-aware bg + text
  const headerClasses = scrolled
    ? "bg-background/95 backdrop-blur-md shadow-lg text-foreground"
    : "bg-transparent text-white";

  const subtleTextClass = scrolled ? "text-muted-foreground" : "text-white/60";
  const hoverBgClass = scrolled ? "hover:bg-muted" : "hover:bg-white/10";
  const iconDimClass = scrolled ? "text-muted-foreground" : "text-white/50";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerClasses}`}
      >
        <div className="max-w-7xl mx-auto flex items-center h-14 px-3 sm:px-4 gap-1.5 sm:gap-3">
          {/* Store Logo / Name — hidden on mobile (shown in hero) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {tenant.logo ? (
              <Image
                src={tenant.logo}
                alt={tenant.name}
                width={80}
                height={32}
                className="h-7 w-auto object-contain"
              />
            ) : (
              <span className="text-lg font-bold italic tracking-tight drop-shadow-md">
                {tenant.name}
              </span>
            )}
          </div>

          {/* Address Picker */}
          <button
            onClick={() => setAddressOpen(true)}
            className={`flex items-center gap-1.5 py-1.5 px-2 sm:px-3 rounded-lg ${hoverBgClass} transition-colors duration-200 cursor-pointer shrink min-w-0`}
          >
            <MapPin className={`size-4 shrink-0 ${subtleTextClass}`} />
            <span className="text-sm font-semibold truncate drop-shadow-sm max-w-32 sm:max-w-none">
              {addressDisplay}
            </span>
            <ChevronDown className={`size-3.5 shrink-0 ${iconDimClass}`} />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search Bar — desktop only */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 ${iconDimClass}`} />
              <input
                type="text"
                placeholder={`Search in ${tenant.name}...`}
                className={`w-full h-9 pl-9 pr-4 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-1 ${
                  scrolled
                    ? "bg-muted placeholder:text-muted-foreground border border-border focus:ring-ring"
                    : "bg-white/15 backdrop-blur-sm placeholder:text-white/40 border border-white/10 focus:ring-white/30"
                }`}
              />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            {/* User Avatar */}
            <UserAvatarMenu
              showCustomerLinks
              onSignInClick={() => setAuthOpen(true)}
            />

            {/* Cart Button */}
            <Button
              variant="ghost"
              size="icon"
              className={`relative size-9 rounded-lg ${hoverBgClass}`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="size-5" />
              {mounted && cart.itemCount() > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center justify-center min-w-4.5 h-4.5 rounded-full text-[10px] font-bold text-white px-1 tabular-nums"
                  style={{
                    backgroundColor:
                      "var(--brand-primary, hsl(var(--primary)))",
                  }}
                >
                  {cart.itemCount()}
                </span>
              )}
            </Button>

          </div>
        </div>
      </header>

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        tenantSlug={tenant.slug}
      />

      <AddressManagerSheet
        open={addressOpen}
        onOpenChange={setAddressOpen}
      />

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <ProfilePromptSheet />
    </>
  );
};
