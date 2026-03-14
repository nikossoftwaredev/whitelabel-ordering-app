import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Add it to your .env.local file."
      );
    }
    _stripe = new Stripe(key, {
      apiVersion: "2025-04-30.basil" as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}

// Lazy proxy so importing this module doesn't throw when STRIPE_SECRET_KEY is absent (e.g. during build)
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const instance = getStripe();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
