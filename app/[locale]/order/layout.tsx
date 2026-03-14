import { setRequestLocale } from "next-intl/server";
import { BaseLayoutProps } from "@/types/page-props";

export default async function OrderLayout({
  children,
  params,
}: BaseLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <>{children}</>;
}
