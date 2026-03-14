"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe/client";
import { Button } from "@/components/ui/button";

interface StripePaymentProps {
  clientSecret: string;
  orderId: string;
  returnUrl?: string;
}

function CheckoutForm({
  orderId,
  returnUrl,
}: {
  orderId: string;
  returnUrl?: string;
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

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url:
          returnUrl || `${window.location.origin}/order/${orderId}/confirmation`,
      },
    });

    // This will only be reached if there's an immediate error
    // (e.g., card declined). Successful payments redirect automatically.
    if (submitError) {
      setError(submitError.message ?? "An unexpected error occurred.");
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
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
}: StripePaymentProps) {
  return (
    <Elements
      stripe={getStripePromise()}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
        },
      }}
    >
      <CheckoutForm orderId={orderId} returnUrl={returnUrl} />
    </Elements>
  );
}
