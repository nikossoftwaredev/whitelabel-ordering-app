"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Mail, Phone, ShoppingBag, X } from "lucide-react";

import { queryKeys } from "@/lib/query/keys";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecentOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  totalSpent: number;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
  lastOrderDate: string | null;
  recentOrders: RecentOrder[];
}

interface CustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ACCEPTED:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  PREPARING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  READY:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED:
    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CustomerTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-2 py-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function CustomerAvatar({
  customer,
  size = "md",
}: {
  customer: Customer;
  size?: "sm" | "md";
}) {
  const sizeClasses = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

  if (customer.image) {
    return (
      <img
        src={customer.image}
        alt={customer.name || "Customer"}
        className={`${sizeClasses} rounded-full object-cover`}
      />
    );
  }

  const initial = (customer.name || customer.email || "?")
    .charAt(0)
    .toUpperCase();
  return (
    <div
      className={`flex ${sizeClasses} items-center justify-center rounded-full bg-primary/10 font-semibold text-primary`}
    >
      {initial}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface CustomerManagementProps {
  tenantId: string;
}

export function CustomerManagement({ tenantId }: CustomerManagementProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  // Debounce search
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
    setDebounceTimer(timer);
  };

  // Fetch customers
  const { data, isLoading, error } = useQuery<CustomersResponse>({
    queryKey: [...queryKeys.customers.all(tenantId), debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/${tenantId}/customers?${params}`);
      if (!res.ok) throw new Error("Failed to load customers");
      return res.json();
    },
    enabled: !!tenantId,
  });

  const customers = data?.customers ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          View and manage your customer base.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setSearch("");
              setDebouncedSearch("");
              setPage(1);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <CustomerTableSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Failed to load customers. Please try again.
          </CardContent>
        </Card>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              {debouncedSearch ? "No customers found" : "No customers yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? "Try adjusting your search terms."
                : "Customers will appear here after they place their first order."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            {total} customer{total !== 1 ? "s" : ""} found
          </p>

          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    Total Spent
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Last Order
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <CustomerAvatar customer={customer} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {customer.name || "Unnamed"}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {customer.phone || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{customer.orderCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell font-medium">
                      {formatPrice(customer.totalSpent)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {customer.lastOrderDate
                        ? formatDate(customer.lastOrderDate)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Customer Detail Sheet */}
      <Sheet
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selectedCustomer && (
            <>
              <SheetHeader>
                <SheetTitle>Customer Details</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Profile */}
                <div className="flex items-center gap-4">
                  <CustomerAvatar customer={selectedCustomer} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold">
                      {selectedCustomer.name || "Unnamed"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      Customer since {formatDate(selectedCustomer.createdAt)}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Contact info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Order Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">
                          {selectedCustomer.orderCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Orders
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">
                          {formatPrice(selectedCustomer.totalSpent)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Spent
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                {/* Recent orders */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Recent Orders
                  </h3>
                  {selectedCustomer.recentOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No orders yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedCustomer.recentOrders.map((order) => (
                        <Card key={order.id}>
                          <CardContent className="flex items-center justify-between p-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  #{order.orderNumber}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {formatDate(order.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={
                                  STATUS_COLORS[order.status] || ""
                                }
                              >
                                {order.status}
                              </Badge>
                              <span className="text-sm font-medium">
                                {formatPrice(order.total)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
