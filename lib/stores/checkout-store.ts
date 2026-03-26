import { create } from "zustand";

type OrderType = "PICKUP" | "DELIVERY";
type PaymentMethod = "CASH" | "STRIPE";
type TipOption = "none" | "50" | "100" | "150" | "200" | "custom";

interface AppliedPromo {
  code: string;
  discount: number;
}

interface CouponData {
  id: string;
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  description: string | null;
  discount: number; // calculated discount in cents
}

interface CheckoutStore {
  // Order type
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;

  // Schedule
  scheduleMode: boolean;
  scheduledDate: string;
  scheduledTime: string;
  setScheduleMode: (mode: boolean) => void;
  setScheduledDate: (date: string) => void;
  setScheduledTime: (time: string) => void;

  // Personal details
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  detailsExpanded: boolean;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setCustomerEmail: (email: string) => void;
  setDetailsExpanded: (expanded: boolean) => void;

  // Payment
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;

  // Tip
  tipOption: TipOption;
  customTipValue: string;
  setTipOption: (opt: TipOption) => void;
  setCustomTipValue: (val: string) => void;
  computeTip: () => number;

  // Notes
  notes: string;
  showNotes: boolean;
  setNotes: (notes: string) => void;
  setShowNotes: (show: boolean) => void;

  // Promo code
  promoInput: string;
  appliedPromo: AppliedPromo | null;
  promoLoading: boolean;
  promoError: string;
  setPromoInput: (input: string) => void;
  setAppliedPromo: (promo: AppliedPromo | null) => void;
  setPromoLoading: (loading: boolean) => void;
  setPromoError: (error: string) => void;
  removePromo: () => void;

  // Coupons
  selectedCoupon: CouponData | null;
  setSelectedCoupon: (coupon: CouponData | null) => void;

  // Submission
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;

  // Stripe
  stripeClientSecret: string | null;
  pendingOrderId: string | null;
  pendingOrderNumber: string | null;
  setStripePayment: (clientSecret: string, orderId: string, orderNumber: string) => void;
  clearStripePayment: () => void;

  // Profile
  profileChecked: boolean;
  setProfileChecked: (checked: boolean) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  orderType: "PICKUP" as OrderType,
  scheduleMode: false,
  scheduledDate: "",
  scheduledTime: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  detailsExpanded: false,
  paymentMethod: "CASH" as PaymentMethod,
  tipOption: "none" as TipOption,
  customTipValue: "",
  notes: "",
  showNotes: false,
  promoInput: "",
  appliedPromo: null as AppliedPromo | null,
  promoLoading: false,
  promoError: "",
  selectedCoupon: null as CouponData | null,
  isSubmitting: false,
  stripeClientSecret: null as string | null,
  pendingOrderId: null as string | null,
  pendingOrderNumber: null as string | null,
  profileChecked: false,
};

export const useCheckoutStore = create<CheckoutStore>((set, get) => ({
  ...initialState,

  setOrderType: (orderType) => set({ orderType }),

  setScheduleMode: (scheduleMode) => set({ scheduleMode }),
  setScheduledDate: (scheduledDate) => set({ scheduledDate, scheduledTime: "" }),
  setScheduledTime: (scheduledTime) => set({ scheduledTime }),

  setCustomerName: (customerName) => set({ customerName }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setCustomerEmail: (customerEmail) => set({ customerEmail }),
  setDetailsExpanded: (detailsExpanded) => set({ detailsExpanded }),

  setPaymentMethod: (paymentMethod) => {
    if (paymentMethod === "CASH") {
      set({ paymentMethod, tipOption: "none", customTipValue: "" });
    } else {
      set({ paymentMethod });
    }
  },

  setTipOption: (tipOption) => {
    if (tipOption !== "custom") {
      set({ tipOption, customTipValue: "" });
    } else {
      set({ tipOption });
    }
  },
  setCustomTipValue: (customTipValue) => set({ customTipValue }),
  computeTip: () => {
    const { tipOption, customTipValue } = get();
    if (tipOption === "none") return 0;
    if (tipOption === "custom") return Math.round((parseFloat(customTipValue) || 0) * 100);
    return parseInt(tipOption);
  },

  setNotes: (notes) => set({ notes }),
  setShowNotes: (showNotes) => set({ showNotes }),

  setPromoInput: (promoInput) => set({ promoInput, promoError: "" }),
  setAppliedPromo: (appliedPromo) => set({ appliedPromo }),
  setPromoLoading: (promoLoading) => set({ promoLoading }),
  setPromoError: (promoError) => set({ promoError }),
  removePromo: () => set({ appliedPromo: null, promoInput: "", promoError: "" }),

  setSelectedCoupon: (selectedCoupon) => set({ selectedCoupon }),

  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),

  setStripePayment: (stripeClientSecret, pendingOrderId, pendingOrderNumber) =>
    set({ stripeClientSecret, pendingOrderId, pendingOrderNumber }),
  clearStripePayment: () =>
    set({ stripeClientSecret: null, pendingOrderId: null, pendingOrderNumber: null }),

  setProfileChecked: (profileChecked) => set({ profileChecked }),

  reset: () => set(initialState),
}));
