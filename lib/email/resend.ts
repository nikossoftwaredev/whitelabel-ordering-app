import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

if (!process.env.EMAIL_FROM) {
  console.warn("[email] EMAIL_FROM env var not set — using noreply@example.com (dev only)");
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@example.com";
