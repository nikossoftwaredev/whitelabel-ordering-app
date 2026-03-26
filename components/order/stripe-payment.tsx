"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useTheme } from "next-themes";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getStripePromise } from "@/lib/stripe/client";

interface StripePaymentProps {
  clientSecret: string;
  orderId: string;
  returnUrl?: string;
  onSuccess?: () => void;
  locale?: string;
}

function CheckoutForm({
  orderId,
  returnUrl,
  onSuccess,
}: {
  orderId: string;
  returnUrl?: string;
  onSuccess?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error: submitError, paymentIntent } =
      await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url:
            returnUrl ||
            `${window.location.origin}/order/${orderId}/confirmation`,
        },
        redirect: "if_required",
      });

    if (submitError) {
      setError(submitError.message ?? "An unexpected error occurred.");
      setIsProcessing(false);
      return;
    }

    // Payment succeeded without redirect (e.g. no 3DS required)
    if (paymentIntent?.status === "succeeded" && onSuccess) {
      onSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />

      {error && (
        <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        variant="brand"
        type="submit"
        disabled={!stripe}
        loading={isProcessing}
        className="w-full h-12 rounded-2xl font-semibold text-[15px]"
      >
        {isProcessing ? "Processing..." : "Pay now"}
      </Button>
    </form>
  );
}

export function StripePayment({
  clientSecret,
  orderId,
  returnUrl,
  onSuccess,
  locale,
}: StripePaymentProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Elements
      stripe={getStripePromise(locale)}
      options={{
        clientSecret,
        appearance: {
          theme: isDark ? "night" : "stripe",
          variables: {
            borderRadius: "12px",
          },
        },
      }}
    >
      <CheckoutForm
        orderId={orderId}
        returnUrl={returnUrl}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}
