# NFC Payment Todo

## ✅ Already done
- Apple Pay / Google Pay enabled in PaymentElement (`wallets: auto`)
- Apple Pay domain verification route at `/.well-known/apple-developer-merchantid-domain-association`

---

## 🔲 To activate (no code — just config)

1. **Stripe Dashboard → Settings → Payment methods → Apple Pay**
   - Click "Add domain"
   - Enter your production domain (e.g. `yourdomain.gr`)
   - Download the domain association file
   - Set `APPLE_PAY_DOMAIN_ASSOCIATION=<file content>` in Vercel env vars

2. **Stripe Dashboard → Settings → Payment methods**
   - Enable **Apple Pay**
   - Enable **Google Pay**

3. **Test on iPhone (Safari)** → checkout should show Apple Pay button
4. **Test on Android (Chrome)** → checkout should show Google Pay button

---

## 🔲 Physical card reader (Stripe Terminal) — optional, future

1. Purchase **Stripe Reader S700** or **BBPOS WisePOS E** (~€250)
2. Register reader in Stripe Dashboard
3. Build `POST /api/admin/[tenantId]/terminal/session` — creates a Terminal connection token
4. Add "Charge at counter" flow in admin: staff opens order → clicks "Charge" → reader activates → customer taps card
5. Webhook handles `payment_intent.succeeded` → marks order PAID (already built)

---

> For 90% of the use case (customer orders + pays on their own phone at the table),
> steps 1–4 in the config section is all you need. The physical reader is only needed
> if staff want to charge customers' cards manually at the counter.
