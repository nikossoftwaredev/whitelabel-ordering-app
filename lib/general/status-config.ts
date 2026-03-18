/**
 * Centralized status configuration for orders and invoices.
 * Used across admin dashboards, order management, and customer-facing components.
 */

// ── Order Status ─────────────────────────────────────────────────────────────

export type OrderStatus =
  | "NEW"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "DELIVERING"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export const orderStatusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  NEW: {
    label: "New",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  ACCEPTED: {
    label: "Accepted",
    className:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  PREPARING: {
    label: "Preparing",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  READY: {
    label: "Ready",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  DELIVERING: {
    label: "Delivering",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
  REJECTED: {
    label: "Rejected",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
};

/** Just the className map — useful when you only need colors, not labels */
export const ORDER_STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(orderStatusConfig).map(([k, v]) => [k, v.className])
);

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "DELIVERING",
];

// ── Invoice Status ───────────────────────────────────────────────────────────

export type InvoiceStatus = "pending" | "submitted" | "cancelled";

export const invoiceStatusConfig: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
  submitted: {
    label: "Submitted",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};
