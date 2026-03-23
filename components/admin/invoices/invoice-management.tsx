"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  ChevronLeft,
  Eye,
  FileText,
  Receipt,
  Search,
} from "lucide-react";
import { useCallback,useState } from "react";
import { toast } from "sonner";

import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAmount, formatDateShort, formatInvoiceNumber } from "@/lib/general/formatters";
import { InvoiceStatus,invoiceStatusConfig } from "@/lib/general/status-config";
import { queryKeys } from "@/lib/query/keys";
import { useDialogStore } from "@/lib/stores/dialog-store";

// -- Types -------------------------------------------------------------------

interface InvoiceOrder {
  id: string;
  orderNumber: string;
  customerName: string | null;
  total: number;
}

interface Invoice {
  id: string;
  tenantId: string;
  orderId: string | null;
  series: string;
  sequenceNumber: number;
  invoiceType: string;
  issueDate: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatCategory: number;
  paymentMethodCode: number;
  status: InvoiceStatus;
  mark: string | null;
  uid: string | null;
  customerName: string | null;
  customerVat: string | null;
  aadeErrors: string | null;
  createdAt: string;
  order: InvoiceOrder | null;
}

interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
}

// -- Constants ---------------------------------------------------------------

const PAGE_SIZE = 20;

// -- Component ---------------------------------------------------------------

interface InvoiceManagementProps {
  tenantId: string;
}

export function InvoiceManagement({ tenantId }: InvoiceManagementProps) {
  const queryClient = useQueryClient();
  const openDialog = useDialogStore((s) => s.openDialog);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Debounce search input
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(0);
      const timeout = setTimeout(() => setDebouncedSearch(value), 300);
      return () => clearTimeout(timeout);
    },
    []
  );

  // -- Query -----------------------------------------------------------------

  const { data, isLoading } = useQuery<InvoicesResponse>({
    queryKey: [
      ...queryKeys.invoices.all(tenantId),
      statusFilter,
      debouncedSearch,
      page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(
        `/api/admin/${tenantId}/invoices?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!tenantId,
  });

  // -- Detail query ----------------------------------------------------------

  const { data: invoiceDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["invoices", tenantId, selectedInvoice?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/${tenantId}/invoices/${selectedInvoice!.id}`
      );
      if (!res.ok) throw new Error("Failed to fetch invoice details");
      return res.json();
    },
    enabled: !!selectedInvoice,
  });

  // -- Cancel mutation -------------------------------------------------------

  const cancelMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await fetch(
        `/api/admin/${tenantId}/invoices/${invoiceId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Invoice cancelled");
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.all(tenantId),
      });
      setSelectedInvoice(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // -- Derived data ----------------------------------------------------------

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // -- Detail view -----------------------------------------------------------

  if (selectedInvoice) {
    const inv = invoiceDetail || selectedInvoice;
    const config = invoiceStatusConfig[inv.status as InvoiceStatus] || invoiceStatusConfig.pending;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={() => setSelectedInvoice(null)}
          >
            <ChevronLeft className="size-4" />
            Back to Invoices
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {isDetailLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Invoice {formatInvoiceNumber(inv.series, inv.sequenceNumber)}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Issued: {formatDateShort(inv.issueDate)}
                    </p>
                    {inv.order && (
                      <p className="text-sm text-muted-foreground">
                        Order: #{inv.order.orderNumber}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className={config.className}>
                    {config.label}
                  </Badge>
                </div>

                {/* Customer info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Customer
                    </p>
                    <p className="mt-1">
                      {inv.customerName || inv.order?.customerName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Tax ID (VAT)
                    </p>
                    <p className="mt-1">{inv.customerVat || "N/A"}</p>
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Net Amount
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatAmount(inv.netAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      VAT
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatAmount(inv.vatAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatAmount(inv.grossAmount)}
                    </p>
                  </div>
                </div>

                {/* AADE info */}
                {(inv.mark || inv.uid) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {inv.mark && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          AADE Mark
                        </p>
                        <p className="mt-1 font-mono text-sm">{inv.mark}</p>
                      </div>
                    )}
                    {inv.uid && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          AADE UID
                        </p>
                        <p className="mt-1 font-mono text-sm">{inv.uid}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Errors */}
                {inv.aadeErrors && (
                  <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-4">
                    <p className="text-sm font-medium text-red-800 dark:text-red-400">
                      AADE Errors
                    </p>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      {inv.aadeErrors}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {inv.status !== "cancelled" && !inv.mark && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="cursor-pointer"
                      disabled={cancelMutation.isPending}
                      onClick={() =>
                        openDialog(
                          CONFIRM_DIALOG,
                          {
                            title: "Cancel invoice?",
                            description: "This will permanently cancel this invoice. This action cannot be undone.",
                            actionLabel: "Cancel Invoice",
                          },
                          () => cancelMutation.mutate(inv.id)
                        )
                      }
                    >
                      <Ban className="size-4" />
                      Cancel Invoice
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // -- List view -------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="View and manage invoices for your orders."
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40 cursor-pointer">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">
                All statuses
              </SelectItem>
              <SelectItem value="pending" className="cursor-pointer">
                Pending
              </SelectItem>
              <SelectItem value="submitted" className="cursor-pointer">
                Submitted
              </SelectItem>
              <SelectItem value="cancelled" className="cursor-pointer">
                Cancelled
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {total} invoice{total !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-6 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          )}
          {!isLoading && invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices found"
              description={
                statusFilter !== "all" || debouncedSearch
                  ? "Try adjusting your filters or search query."
                  : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Tax ID</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const config =
                    invoiceStatusConfig[invoice.status as InvoiceStatus] ||
                    invoiceStatusConfig.pending;

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          {formatInvoiceNumber(
                            invoice.series,
                            invoice.sequenceNumber
                          )}
                        </div>
                        {invoice.order && (
                          <span className="text-xs text-muted-foreground">
                            Order #{invoice.order.orderNumber}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatDateShort(invoice.issueDate)}</TableCell>
                      <TableCell>
                        {invoice.customerName ||
                          invoice.order?.customerName ||
                          "-"}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {invoice.customerVat || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAmount(invoice.netAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAmount(invoice.vatAmount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAmount(invoice.grossAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={config.className}
                        >
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          {invoice.status !== "cancelled" && !invoice.mark && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer text-red-600 hover:text-red-700 dark:text-red-400"
                              disabled={cancelMutation.isPending}
                              onClick={() =>
                                openDialog(
                                  CONFIRM_DIALOG,
                                  {
                                    title: "Cancel invoice?",
                                    description: "This will permanently cancel this invoice. This action cannot be undone.",
                                    actionLabel: "Cancel Invoice",
                                  },
                                  () => cancelMutation.mutate(invoice.id)
                                )
                              }
                            >
                              <Ban className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <PaginationControls
        page={page + 1}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p - 1)}
      />
    </div>
  );
}
