import { EMAIL_FROM, resend } from "./resend";
import {
  orderConfirmationEmail,
  orderStatusEmail,
  refundEmail,
} from "./templates";

interface OrderForEmail {
  orderNumber: string;
  orderType: string;
  customerName: string | null;
  customerEmail: string | null;
  subtotal: number;
  tipAmount: number;
  total: number;
  estimatedReadyAt: Date | null;
  scheduledFor?: Date | null;
  rejectionReason?: string | null;
  items: {
    productName: string;
    quantity: number;
    totalPrice: number;
    modifiers: { name: string }[];
  }[];
}

interface TenantForEmail {
  name: string;
  config?: { primaryColor?: string } | null;
}

export async function sendOrderConfirmation(
  order: OrderForEmail,
  tenant: TenantForEmail
): Promise<void> {
  if (!resend || !order.customerEmail) return;

  const email = orderConfirmationEmail({
    orderNumber: order.orderNumber,
    storeName: tenant.name,
    items: order.items,
    subtotal: order.subtotal,
    tipAmount: order.tipAmount,
    total: order.total,
    orderType: order.orderType,
    customerName: order.customerName || "Customer",
    estimatedReadyAt: order.estimatedReadyAt,
    scheduledFor: order.scheduledFor,
    primaryColor: tenant.config?.primaryColor,
  });

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: order.customerEmail,
      subject: email.subject,
      html: email.html,
    });
  } catch (err) {
    console.error("[Email] Failed to send order confirmation:", err);
  }
}

export async function sendOrderStatusUpdate(
  order: OrderForEmail,
  status: string,
  tenant: TenantForEmail
): Promise<void> {
  if (!resend || !order.customerEmail) return;

  const email = orderStatusEmail(
    status,
    order.orderNumber,
    order.customerName || "Customer",
    tenant.name,
    tenant.config?.primaryColor,
    order.rejectionReason,
    order.estimatedReadyAt
  );

  if (!email) return;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: order.customerEmail,
      subject: email.subject,
      html: email.html,
    });
  } catch (err) {
    console.error("[Email] Failed to send status update:", err);
  }
}

interface RefundForEmail {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  refundAmount: number;
  orderTotal: number;
  reason: string | null;
}

export async function sendRefundNotification(
  data: RefundForEmail,
  tenant: TenantForEmail
): Promise<void> {
  if (!resend || !data.customerEmail) return;

  const email = refundEmail({
    orderNumber: data.orderNumber,
    customerName: data.customerName,
    refundAmount: data.refundAmount,
    orderTotal: data.orderTotal,
    storeName: tenant.name,
    reason: data.reason,
    primaryColor: tenant.config?.primaryColor,
  });

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: data.customerEmail,
      subject: email.subject,
      html: email.html,
    });
  } catch (err) {
    console.error("[Email] Failed to send refund notification:", err);
  }
}
