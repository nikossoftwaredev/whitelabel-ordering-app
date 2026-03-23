"use client";

import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { AbstractIntlMessages, NextIntlClientProvider } from "next-intl";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { DialogProvider } from "@/components/dialog-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/lib/query/provider";

type Props = {
  children: React.ReactNode;
  messages: AbstractIntlMessages;
  locale: string;
  session: Session | null;
};

export const Providers = ({ children, messages, locale, session }: Props) => {
  return (
    <QueryProvider>
      <SessionProvider session={session}>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages} locale={locale} timeZone="Europe/Athens">
            <TooltipProvider>
              {children}
            </TooltipProvider>
            <DialogProvider />
            <Toaster />
          </NextIntlClientProvider>
        </NextThemesProvider>
      </SessionProvider>
    </QueryProvider>
  );
};
