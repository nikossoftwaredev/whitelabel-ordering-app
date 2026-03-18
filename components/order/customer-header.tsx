"use client";

import { ChevronDown, MapPin, ShoppingBag } from "lucide-react";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const tenant = useTenant();
  const cart = useCartStore();
  const selectedAddress = useAddressStore((s) => s.selectedAddress);

  const [mounted, setMounted] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

  const user = session?.user;

  useEffect(() => {
    setMounted(true);
  }, []);

  const addressLabel = selectedAddress
    ? selectedAddress.street.length > 28
      ? selectedAddress.street.slice(0, 28) + "..."
      : selectedAddress.street
    : "Add address";

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto flex items-center h-14 px-4 gap-2">
          {/* Address Selector */}
          <button
            onClick={() => setAddressOpen(true)}
            className="flex items-center gap-1.5 min-w-0 shrink py-1.5 px-2 rounded-full hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
          >
            <MapPin className="size-4 shrink-0" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }} />
            <span className="text-sm font-medium truncate max-w-45 sm:max-w-70">
              {addressLabel}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cart Button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative size-10 rounded-full hover:bg-muted/50"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="size-5" />
            {mounted && cart.itemCount() > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-5 h-5 rounded-full text-[11px] font-bold text-white px-1 tabular-nums"
                style={{
                  backgroundColor:
                    "var(--brand-primary, hsl(var(--primary)))",
                }}
              >
                {cart.itemCount()}
              </span>
            )}
          </Button>

          {/* User Profile — right of cart */}
          <UserAvatarMenu
            showCustomerLinks
            onSignInClick={() => setAuthOpen(true)}
          />
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
