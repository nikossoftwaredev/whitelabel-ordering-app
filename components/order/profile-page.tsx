"use client";

import { useMutation } from "@tanstack/react-query";
import { MapPin, Trash2, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AddButton } from "@/components/add-button";
import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { PhoneInput } from "@/components/phone-input";
import { useTenant } from "@/components/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddressStore } from "@/lib/stores/address-store";
import { useDialogStore } from "@/lib/stores/dialog-store";

export function ProfilePage() {
  const t = useTranslations("Profile");
  const tAddr = useTranslations("Address");
  const { data: session, update } = useSession();
  const tenant = useTenant();
  const openDialog = useDialogStore((s) => s.openDialog);
  const addresses = useAddressStore((s) => s.addresses);
  const selectedAddress = useAddressStore((s) => s.selectedAddress);
  const setSelectedAddress = useAddressStore((s) => s.setSelectedAddress);
  const removeAddress = useAddressStore((s) => s.removeAddress);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenants/${tenant.slug}/addresses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return id;
    },
    onSuccess: (id) => {
      removeAddress(id);
    },
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      await update();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  let saveLabel = t("saveChanges");
  if (saving) saveLabel = t("saving");
  else if (saved) saveLabel = t("saved");

  return (
    <div className="min-h-screen bg-background pt-14">
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3 pb-2">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="size-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="size-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold">{session?.user?.name || "User"}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">{t("fullName")}</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">{t("email")}</Label>
              <Input
                id="edit-email"
                value={email}
                disabled
                className="opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">{t("phone")}</Label>
              <PhoneInput
                id="edit-phone"
                value={phone}
                onChange={setPhone}
                placeholder={t("phonePlaceholder")}
              />
            </div>

            {/* Addresses */}
            <div className="space-y-1.5">
              <Label>{t("addresses")}</Label>
              {addresses.length > 0 ? (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`flex items-center rounded-lg border transition-colors hover:bg-muted/50 ${
                        selectedAddress?.id === addr.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedAddress(addr)}
                        className="flex-1 flex items-start gap-2.5 p-3 cursor-pointer text-left"
                      >
                        <MapPin className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {addr.street}
                          </p>
                          {addr.city && (
                            <p className="text-xs text-muted-foreground">
                              {addr.city}
                            </p>
                          )}
                        </div>
                        {addr.label && (
                          <Badge
                            variant="secondary"
                            className="text-xs shrink-0"
                          >
                            {addr.label}
                          </Badge>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openDialog(
                            CONFIRM_DIALOG,
                            {
                              title: "Delete address?",
                              description:
                                "This will permanently delete this saved address.",
                              actionLabel: "Delete",
                            },
                            () => deleteMutation.mutate(addr.id),
                          )
                        }
                        disabled={deleteMutation.isPending}
                        className="size-9 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors duration-200 cursor-pointer shrink-0 mr-2"
                      >
                        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("noAddressesYet")}
                </p>
              )}
              <AddButton
                variant="outline"
                className="w-full mt-2"
                onClick={() =>
                  openDialog("address-manager", { initialView: "search" })
                }
              >
                {tAddr("addNewAddress")}
              </AddButton>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saveLabel}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
