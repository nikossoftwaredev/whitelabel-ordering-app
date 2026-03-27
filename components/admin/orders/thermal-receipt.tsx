/**
 * ThermalReceipt — hidden 80mm receipt rendered into #thermal-receipt div.
 * Populated via usePrintOrder hook before window.print() is called.
 * Styled only via @media print CSS (invisible in normal UI).
 */

interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: { name: string; priceAdjustment: number }[];
}

export interface ReceiptData {
  storeName: string;
  orderNumber: string;
  orderType: "PICKUP" | "DELIVERY" | "DINE_IN";
  createdAt: string;
  scheduledFor: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  promoDiscount: number;
  couponDiscount: number;
  groupDiscount: number;
  groupDiscountName: string | null;
  promoCode: string | null;
  tipAmount: number;
  total: number;
  paymentMethod: "STRIPE" | "CASH";
  paymentStatus: "PENDING" | "PAID" | "REFUNDED" | "FAILED" | "DISPUTED";
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  customerNote: string | null;
  currency: string;
}

const LINE = "================================";
const DIVIDER = "--------------------------------";
const CUT = "- - - - - - - - - - - - - - - -";

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function padLine(left: string, right: string, width = 32): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(spaces) + right;
}

const ORDER_TYPE_LABEL: Record<ReceiptData["orderType"], string> = {
  PICKUP: "PICKUP",
  DELIVERY: "DELIVERY",
  DINE_IN: "DINE-IN",
};

export function ThermalReceipt({ data }: { data: ReceiptData | null }) {
  if (!data) return <div id="thermal-receipt" style={{ display: "none" }} />;

  const {
    storeName,
    orderNumber,
    orderType,
    createdAt,
    scheduledFor,
    items,
    discount,
    promoDiscount,
    couponDiscount,
    groupDiscount,
    groupDiscountName,
    promoCode,
    tipAmount,
    total,
    paymentMethod,
    paymentStatus,
    customerName,
    customerPhone,
    deliveryAddress,
    customerNote,
    currency,
  } = data;

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      item.quantity *
        (item.unitPrice +
          item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)),
    0,
  );

  const date = new Date(createdAt).toLocaleString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalDiscounts =
    discount + promoDiscount + couponDiscount + groupDiscount;

  const center = (text: string, width = 32) =>
    text.padStart(Math.floor((width + text.length) / 2)).padEnd(width);

  const scheduledStr = scheduledFor
    ? new Date(scheduledFor).toLocaleString("el-GR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const lines: string[] = [
    LINE,
    center(storeName.toUpperCase()),
    center(`Order #${orderNumber}`),
    center(ORDER_TYPE_LABEL[orderType]),
    center(date),
    ...(scheduledStr ? [center(`SCHEDULED: ${scheduledStr}`)] : []),
    LINE,
    ...items.flatMap((item) => {
      const itemTotal =
        item.quantity *
        (item.unitPrice +
          item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0));
      const label = `${item.quantity}x ${item.productName}`;
      const price = formatCents(itemTotal, currency);
      return [
        padLine(label, price),
        ...item.modifiers.map((m) =>
          m.priceAdjustment > 0
            ? padLine(`  + ${m.name}`, formatCents(m.priceAdjustment * item.quantity, currency))
            : `  + ${m.name}`,
        ),
      ];
    }),
    DIVIDER,
    padLine("Subtotal", formatCents(subtotal, currency)),
    ...(discount > 0 ? [padLine("Discount", `-${formatCents(discount, currency)}`)] : []),
    ...(promoDiscount > 0
      ? [padLine(`Promo${promoCode ? ` (${promoCode})` : ""}`, `-${formatCents(promoDiscount, currency)}`)]
      : []),
    ...(couponDiscount > 0 ? [padLine("Coupon", `-${formatCents(couponDiscount, currency)}`)] : []),
    ...(groupDiscount > 0
      ? [padLine(groupDiscountName ? `Group (${groupDiscountName})` : "Group discount", `-${formatCents(groupDiscount, currency)}`)]
      : []),
    ...(tipAmount > 0 ? [padLine("Tip", formatCents(tipAmount, currency))] : []),
    ...(totalDiscounts > 0 || tipAmount > 0 ? [DIVIDER] : []),
    padLine("TOTAL", formatCents(total, currency)),
    LINE,
    padLine("Payment:", paymentMethod === "STRIPE" ? `Card (${paymentStatus})` : "Cash"),
    ...(customerName ? [padLine("Customer:", customerName)] : []),
    ...(customerPhone ? [padLine("Phone:", customerPhone)] : []),
    ...(deliveryAddress ? [`Address: ${deliveryAddress}`] : []),
    ...(customerNote ? [`Note: ${customerNote}`] : []),
    "",
    CUT,
    "        \u2702 cut here",
  ];

  return (
    <div id="thermal-receipt" style={{ display: "none" }}>
      <pre
        style={{
          fontFamily: "monospace",
          fontSize: "12px",
          lineHeight: "1.4",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "#000",
          margin: 0,
          padding: 0,
        }}
      >
        {lines.join("\n")}
      </pre>
    </div>
  );
}
