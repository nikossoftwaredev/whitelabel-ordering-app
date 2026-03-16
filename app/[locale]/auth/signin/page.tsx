import { setRequestLocale } from "next-intl/server";

import { SignInForm } from "@/components/auth/signin-form";
import { BasePageProps } from "@/types/page-props";

export default async function SignInPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignInForm />
    </div>
  );
}
