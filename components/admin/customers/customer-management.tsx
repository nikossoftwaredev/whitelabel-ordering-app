"use client";

import { useQuery } from "@tanstack/react-query";
import { Gift, Mail, Phone, ShoppingBag, Users } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { ErrorCard } from "@/components/error-card";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/user-avatar";
import { useFormatPrice } from "@/hooks/use-format-price";
import { formatDate } from "@/lib/general/formatters";
import { ORDER_STATUS_COLORS } from "@/lib/general/status-config";
import { queryKeys } from "@/lib/query/keys";

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
  loyaltyProgress?: number;
  loyaltyRedemptions: number;
  recentOrders: RecentOrder[];
}

interface CustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loyalty: { required: number; rewardAmount: number } | null;
}

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

// ── Main Component ────────────────────────────────────────────────────────────

interface CustomerManagementProps {
  tenantId: string;
}

export function CustomerManagement({ tenantId }: CustomerManagementProps) {
  const formatPrice = useFormatPrice();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("recent");
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
    queryKey: [...queryKeys.customers.all(tenantId), debouncedSearch, page, sort],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sort,
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
      <PageHeader
        title="Customers"
        description="View and manage your customer base."
      />

      {/* Search bar + sort */}
      <div className="flex flex-wrap items-center gap-3">
      <SearchInput
        value={search}
        onChange={handleSearchChange}
        onClear={() => {
          setDebouncedSearch("");
          setPage(1);
        }}
        placeholder="Search by name, email, or phone..."
        className="max-w-sm flex-1"
      />
      <Select
        value={sort}
        onValueChange={(v) => {
          setSort(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Most Recent</SelectItem>
          <SelectItem value="name">Name (A–Z)</SelectItem>
          <SelectItem value="spent">Total Spent</SelectItem>
        </SelectContent>
      </Select>
      </div>

      {/* Content */}
      {isLoading && <CustomerTableSkeleton />}
      {!isLoading && error && (
        <ErrorCard message="Failed to load customers. Please try again." />
      )}
      {!isLoading && !error && customers.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title={debouncedSearch ? "No customers found" : "No customers yet"}
              description={debouncedSearch
                ? "Try adjusting your search terms."
                : "Customers will appear here after they place their first order."}
            />
          </CardContent>
        </Card>
      )}
      {!isLoading && !error && customers.length > 0 && (
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
                  {data?.loyalty && (
                    <TableHead className="text-center hidden md:table-cell">
                      Loyalty
                    </TableHead>
                  )}
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
                        <UserAvatar src={customer.image} name={customer.name} email={customer.email} />
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
                    {data?.loyalty && (
                      <TableCell className="text-center hidden md:table-cell">
                        {customer.loyaltyProgress !== undefined ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{
                                  width: `${Math.min(100, (customer.loyaltyProgress / data.loyalty.required) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {customer.loyaltyProgress}/{data.loyalty.required}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
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
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
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
                  <UserAvatar src={selectedCustomer.image} name={selectedCustomer.name} email={selectedCustomer.email} />
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

                {data?.loyalty && selectedCustomer.loyaltyProgress !== undefined && (
                  <>
                    <Separator />

                    {/* Loyalty */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Loyalty Program
                      </h3>
                      <div className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Progress</span>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">
                            {selectedCustomer.loyaltyProgress}/{data.loyalty.required}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${Math.min(100, (selectedCustomer.loyaltyProgress / data.loyalty.required) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {selectedCustomer.loyaltyProgress >= data.loyalty.required
                              ? "Eligible for reward!"
                              : `${data.loyalty.required - selectedCustomer.loyaltyProgress} more orders needed`}
                          </span>
                          <span>{selectedCustomer.loyaltyRedemptions} redeemed</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

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
                                  ORDER_STATUS_COLORS[order.status] || ""
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
