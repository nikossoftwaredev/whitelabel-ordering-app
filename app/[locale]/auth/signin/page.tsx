import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { SignInForm } from "@/components/auth/signin-form";

export default async function SignInPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignInForm />
    </div>
  );
}
