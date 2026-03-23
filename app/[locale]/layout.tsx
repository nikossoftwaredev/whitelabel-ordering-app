import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { hasLocale } from "next-intl";
import { getMessages,setRequestLocale } from "next-intl/server";

import { AddressPreloader } from "@/components/address-preloader";
import { Providers } from "@/components/providers";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { SwRegister } from "@/components/sw-register";
import { TenantProvider } from "@/components/tenant-provider";
import { authOptions } from "@/lib/auth/auth";
import { routing } from "@/lib/i18n/routing";
import { generateBrandStyles } from "@/lib/tenant/brand-styles";
import { setCurrentTenant } from "@/lib/tenant/context";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { getBaseUrl } from "@/lib/tenant/url";
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

  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor,
  };
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  const tenant = await getRequestTenant();

  const headerList = await headers();
  const host = headerList.get("x-tenant-host") || "localhost:3000";
  const baseUrl = getBaseUrl(host);

  if (!tenant) {
    return { title: "Store Not Found", description: "" };
  }

  const config = tenant.config;
  const description = config?.description || `Order online from ${tenant.name}`;

  // Build hreflang alternates for all locales
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${baseUrl}/${loc}`;
  }

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: tenant.name,
      template: `%s | ${tenant.name}`,
    },
    description,
    icons: {
      icon: config?.logoSmall || config?.logo || "/favicon.ico",
      apple: config?.logoSmall || config?.logo || "/favicon.ico",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: tenant.name,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages,
    },
    openGraph: {
      title: tenant.name,
      description,
      url: `${baseUrl}/${locale}`,
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
  const customFont = tenant?.config?.fontFamily || null;
  const googleFontUrl = customFont
    ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(customFont)}:wght@400;500;600;700&display=swap`
    : null;

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
        {googleFontUrl && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={googleFontUrl} />
          </>
        )}
        {brandStyles && <style>{brandStyles}</style>}
        {/* Capture beforeinstallprompt before React hydrates so it's never missed */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){window.__pwaInstallPrompt=e;});`,
          }}
        />
      </head>
      <body className={`${roboto.variable} font-sans antialiased`}>
        <SwRegister />
        <Providers messages={messages} locale={locale} session={session}>
          <PwaInstallPrompt />
          {tenantContextValue ? (
            <TenantProvider value={tenantContextValue}>
              <AddressPreloader />
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
