"use client";

import { MapPin, Store } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  logo: string | null;
  primaryColor: string;
}

export function StoreSelector() {
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) => setTenants(data.stores ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (slug: string) => {
    const { protocol, port } = window.location;
    const portSuffix = port ? `:${port}` : "";
    window.location.href = `${protocol}//${slug}.lvh.me${portSuffix}/order`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Store className="size-6" />
            <h1 className="text-xl font-bold">Select a Store</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Skeleton className="size-14 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && tenants.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Store className="size-16 text-muted-foreground/30" />
            <div>
              <h2 className="text-xl font-semibold">No stores available</h2>
              <p className="text-muted-foreground mt-1">
                There are no active stores at this time.
              </p>
            </div>
          </div>
        )}

        {!loading && tenants.length > 0 && (
          <div className="space-y-3">
            {tenants.map((tenant) => (
              <Card
                key={tenant.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors duration-200"
                onClick={() => handleSelect(tenant.slug)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Logo */}
                  {tenant.logo ? (
                    <div className="size-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      <img
                        src={tenant.logo}
                        alt={tenant.name}
                        className="size-full object-contain p-1"
                      />
                    </div>
                  ) : (
                    <div
                      className="size-14 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: tenant.primaryColor }}
                    >
                      <span className="text-white text-xl font-bold">
                        {tenant.name.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{tenant.name}</h3>
                    {tenant.address && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">{tenant.address}</span>
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <svg className="size-5 text-muted-foreground shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
