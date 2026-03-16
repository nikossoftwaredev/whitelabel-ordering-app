import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { hasLocale } from "next-intl";
import { getMessages,setRequestLocale } from "next-intl/server";

import { Providers } from "@/components/providers";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { SwRegister } from "@/components/sw-register";
import { TenantProvider } from "@/components/tenant-provider";
import { authOptions } from "@/lib/auth/auth";
import { routing } from "@/lib/i18n/routing";
import { generateBrandStyles } from "@/lib/tenant/brand-styles";
import { setCurrentTenant } from "@/lib/tenant/context";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BaseLayoutProps } from "@/types/page-props";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const generateStaticParams = () => {
  return routing.locales.map((locale) => ({ locale }));
};

export const generateViewport = async (): Promise<Viewport> => {
  const tenant = await getRequestTenant();
  const themeColor =
    tenant?.config?.pwaThemeColor || tenant?.config?.primaryColor || "#0a0a0a";

  return { themeColor };
};

export const generateMetadata = async (): Promise<Metadata> => {
  const tenant = await getRequestTenant();

  if (!tenant) {
    return { title: "Store Not Found", description: "" };
  }

  const config = tenant.config;

  return {
    title: {
      default: tenant.name,
      template: `%s | ${tenant.name}`,
    },
    description:
      config?.description || `Order online from ${tenant.name}`,
    icons: {
      icon: config?.logoSmall || config?.logo || "/favicon.ico",
      apple: config?.logoSmall || config?.logo || "/favicon.ico",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: tenant.name,
    },
    openGraph: {
      title: tenant.name,
      description:
        config?.description || `Order online from ${tenant.name}`,
      images: config?.coverImage || config?.logo
        ? [{ url: config?.coverImage || config?.logo || "" }]
        : undefined,
      type: "website",
    },
  };
};

const LocaleLayout = async ({ children, params }: BaseLayoutProps) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  // Resolve tenant from domain header
  const tenant = await getRequestTenant();

  // Set tenant in server context if found
  if (tenant) {
    setCurrentTenant(tenant);
  }

  const session = await getServerSession(authOptions);
  const brandStyles = tenant ? generateBrandStyles(tenant.config) : "";

  const tenantContextValue = tenant
    ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.config?.logo ?? null,
        logoSmall: tenant.config?.logoSmall ?? null,
        primaryColor: tenant.config?.primaryColor ?? "#000000",
        secondaryColor: tenant.config?.secondaryColor ?? "#ffffff",
        accentColor: tenant.config?.accentColor ?? "#3b82f6",
        currency: tenant.currency,
        timezone: tenant.timezone,
        prepTimeMinutes: tenant.prepTimeMinutes,
        isPaused: tenant.isPaused,
        deliveryEnabled: tenant.deliveryEnabled,
        deliveryFee: tenant.deliveryFee,
        freeDeliveryThreshold: tenant.freeDeliveryThreshold,
        minOrderAmount: tenant.minOrderAmount,
      }
    : null;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/api/manifest" />
        {brandStyles && <style>{brandStyles}</style>}
        {/* Capture beforeinstallprompt before React hydrates so it's never missed */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaInstallPrompt=e;});`,
          }}
        />
      </head>
      <body className={`${roboto.variable} font-sans antialiased`}>
        <SwRegister />
        <Providers messages={messages} locale={locale} session={session}>
          <PwaInstallPrompt />
          {tenantContextValue ? (
            <TenantProvider value={tenantContextValue}>
              {children}
            </TenantProvider>
          ) : (
            children
          )}
        </Providers>
      </body>
    </html>
  );
};

export default LocaleLayout;
