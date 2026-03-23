import { formatPrice } from "@/lib/general/formatters";

interface OrderItem {
  productName: string;
  quantity: number;
  totalPrice: number;
  modifiers?: { name: string }[];
}

interface OrderEmailData {
  orderNumber: string;
  storeName: string;
  items: OrderItem[];
  subtotal: number;
  tipAmount: number;
  total: number;
  orderType: string;
  customerName: string;
  estimatedReadyAt?: Date | null;
  scheduledFor?: Date | string | null;
  primaryColor?: string;
}

function itemRows(items: OrderItem[]): string {
  return items
    .map((item) => {
      const mods =
        item.modifiers && item.modifiers.length > 0
          ? `<br/><span style="color:#888;font-size:12px;">${item.modifiers.map((m) => m.name).join(", ")}</span>`
          : "";
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">
            ${item.quantity}x ${item.productName}${mods}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">
            ${formatPrice(item.totalPrice)}
          </td>
        </tr>`;
    })
    .join("");
}

function baseLayout(
  content: string,
  storeName: string,
  primaryColor: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:${primaryColor};padding:24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${storeName}</h1>
      </div>
      <div style="padding:24px;">
        ${content}
      </div>
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin-top:16px;">
      Powered by OrderApp
    </p>
  </div>
</body>
</html>`;
}

export function orderConfirmationEmail(data: OrderEmailData): {
  subject: string;
  html: string;
} {
  const color = data.primaryColor || "#000000";
  const typeLabel = data.orderType === "DELIVERY" ? "Delivery" : "Pickup";

  let timeInfo = "";
  if (data.scheduledFor) {
    const dt = new Date(data.scheduledFor);
    const dateStr = dt.toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" });
    const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    timeInfo = `<p style="margin:0;color:#b45309;font-size:14px;">&#128197; Scheduled for: <strong>${dateStr} at ${timeStr}</strong></p>`;
  } else if (data.estimatedReadyAt) {
    const time = new Date(data.estimatedReadyAt).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    timeInfo = `<p style="margin:0;color:#666;font-size:14px;">Estimated ready: <strong>${time}</strong></p>`;
  }

  const tipRow =
    data.tipAmount > 0
      ? `<tr><td style="padding:4px 0;color:#666;">Tip</td><td style="padding:4px 0;text-align:right;">${formatPrice(data.tipAmount)}</td></tr>`
      : "";

  const content = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#111;">Order Confirmed!</h2>
    <p style="margin:0 0 16px;color:#666;font-size:14px;">
      Hi ${data.customerName}, your order <strong>#${data.orderNumber}</strong> has been placed.
    </p>

    <div style="background:#f9f9f9;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${typeLabel}</p>
      ${timeInfo}
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${itemRows(data.items)}
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
      <tr>
        <td style="padding:4px 0;color:#666;">Subtotal</td>
        <td style="padding:4px 0;text-align:right;">${formatPrice(data.subtotal)}</td>
      </tr>
      ${tipRow}
      <tr>
        <td style="padding:8px 0;font-weight:700;font-size:16px;border-top:2px solid #111;">Total</td>
        <td style="padding:8px 0;font-weight:700;font-size:16px;border-top:2px solid #111;text-align:right;">${formatPrice(data.total)}</td>
      </tr>
    </table>
  `;

  return {
    subject: `Order #${data.orderNumber} confirmed — ${data.storeName}`,
    html: baseLayout(content, data.storeName, color),
  };
}

type StatusKey =
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "DELIVERING"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

const STATUS_CONFIG: Record<
  StatusKey,
  { emoji: string; title: string; message: string }
> = {
  ACCEPTED: {
    emoji: "&#9989;",
    title: "Order Accepted",
    message: "Great news! The store has accepted your order and will start preparing it soon.",
  },
  PREPARING: {
    emoji: "&#128293;",
    title: "Being Prepared",
    message: "Your order is now being prepared.",
  },
  READY: {
    emoji: "&#127881;",
    title: "Ready!",
    message: "Your order is ready for pickup!",
  },
  DELIVERING: {
    emoji: "&#128666;",
    title: "On Its Way",
    message: "Your order is on its way to you!",
  },
  COMPLETED: {
    emoji: "&#10004;",
    title: "Completed",
    message: "Your order has been completed. Thank you for ordering!",
  },
  REJECTED: {
    emoji: "&#10060;",
    title: "Declined",
    message: "Unfortunately, the store was unable to accept your order.",
  },
  CANCELLED: {
    emoji: "&#10060;",
    title: "Cancelled",
    message: "Your order has been cancelled.",
  },
};

export function orderStatusEmail(
  status: string,
  orderNumber: string,
  customerName: string,
  storeName: string,
  primaryColor?: string,
  rejectionReason?: string | null,
  estimatedReadyAt?: Date | null
): { subject: string; html: string } | null {
  const config = STATUS_CONFIG[status as StatusKey];
  if (!config) return null;

  const color = primaryColor || "#000000";

  let extra = "";
  if (status === "REJECTED" && rejectionReason) {
    extra = `<p style="margin:12px 0 0;padding:12px;background:#fef2f2;border-radius:8px;color:#991b1b;font-size:13px;">Reason: ${rejectionReason}</p>`;
  }
  if (status === "ACCEPTED" && estimatedReadyAt) {
    const time = new Date(estimatedReadyAt).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    extra = `<p style="margin:12px 0 0;padding:12px;background:#f0fdf4;border-radius:8px;color:#166534;font-size:13px;">Estimated ready at: <strong>${time}</strong></p>`;
  }

  const content = `
    <div style="text-align:center;margin-bottom:16px;">
      <span style="font-size:48px;">${config.emoji}</span>
    </div>
    <h2 style="margin:0 0 4px;font-size:22px;color:#111;text-align:center;">
      Order #${orderNumber} — ${config.title}
    </h2>
    <p style="margin:8px 0 0;color:#666;font-size:14px;text-align:center;">
      Hi ${customerName}, ${config.message}
    </p>
    ${extra}
  `;

  return {
    subject: `Order #${orderNumber} — ${config.title} — ${storeName}`,
    html: baseLayout(content, storeName, color),
  };
}

export function refundEmail(data: {
  orderNumber: string;
  customerName: string;
  refundAmount: number;
  orderTotal: number;
  storeName: string;
  reason?: string | null;
  primaryColor?: string;
}): { subject: string; html: string } {
  const color = data.primaryColor || "#000000";
  const isPartial = data.refundAmount < data.orderTotal;

  const reasonBlock = data.reason
    ? `<p style="margin:12px 0 0;padding:12px;background:#f5f5f5;border-radius:8px;color:#666;font-size:13px;">Reason: ${data.reason}</p>`
    : "";

  const content = `
    <div style="text-align:center;margin-bottom:16px;">
      <span style="font-size:48px;">&#128176;</span>
    </div>
    <h2 style="margin:0 0 4px;font-size:22px;color:#111;text-align:center;">
      ${isPartial ? "Partial Refund" : "Refund"} Processed
    </h2>
    <p style="margin:8px 0 0;color:#666;font-size:14px;text-align:center;">
      Hi ${data.customerName}, a ${isPartial ? "partial " : ""}refund has been processed for your order <strong>#${data.orderNumber}</strong>.
    </p>
    <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin:20px 0;text-align:center;">
      <p style="margin:0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Refund Amount</p>
      <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#166534;">${formatPrice(data.refundAmount)}</p>
      ${isPartial ? `<p style="margin:4px 0 0;font-size:12px;color:#888;">of ${formatPrice(data.orderTotal)} order total</p>` : ""}
    </div>
    ${reasonBlock}
    <p style="margin:20px 0 0;color:#888;font-size:13px;text-align:center;">
      The refund will appear in your account within 5-10 business days.
    </p>
  `;

  return {
    subject: `Refund for Order #${data.orderNumber} — ${data.storeName}`,
    html: baseLayout(content, data.storeName, color),
  };
}
