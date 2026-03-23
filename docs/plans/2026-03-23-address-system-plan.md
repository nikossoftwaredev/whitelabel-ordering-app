# Full Address System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Google Maps with draggable pin and structured address details (floor, buzzer, instructions) to the address flow, with JSON snapshot on orders for admin visibility.

**Architecture:** 2-step address flow inside the existing dialog stack. Step 1: search (existing). Step 2: map + detail form. Address model gets detail fields, Order model gets a JSON snapshot field. Admin order view renders structured details.

**Tech Stack:** `@vis.gl/react-google-maps`, Google Maps JS API + Geocoding API, Prisma, Zustand, next-intl

---

### Task 1: Install Google Maps React Library

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

```bash
pnpm add @vis.gl/react-google-maps
```

**Step 2: Verify**

Run: `pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @vis.gl/react-google-maps"
```

---

### Task 2: Schema — Add Detail Fields to Address + JSON Field to Order

**Files:**
- Modify: `lib/db/schema.prisma`

**Step 1: Add fields to Address model**

After the existing `isDefault` field in the Address model, add:

```prisma
locationType         String?  @map("location_type")
floor                String?
apartmentNumber      String?  @map("apartment_number")
companyName          String?  @map("company_name")
entrance             String?
accessDetails        String?  @map("access_details")
deliveryInstructions String?  @map("delivery_instructions")
```

**Step 2: Add JSON field to Order model**

After the existing `deliveryAddress` field in the Order model, add:

```prisma
deliveryAddressDetails Json?  @map("delivery_address_details")
```

**Step 3: Run migration**

```bash
pnpm prisma migrate dev --name add-address-details
pnpm prisma generate
```

**Step 4: Verify**

Run: `pnpm tsc --noEmit`

**Step 5: Commit**

```bash
git add lib/db/schema.prisma lib/db/migrations/
git commit -m "feat: add address detail fields + order delivery JSON snapshot"
```

---

### Task 3: Update Address Store + API Routes for New Fields

**Files:**
- Modify: `lib/stores/address-store.ts`
- Modify: `app/api/tenants/[tenantSlug]/addresses/route.ts`
- Modify: `app/api/tenants/[tenantSlug]/addresses/[addressId]/route.ts`

**Step 1: Update Address interface in Zustand store**

In `lib/stores/address-store.ts`, add to the `Address` interface:

```ts
locationType: string | null;
floor: string | null;
apartmentNumber: string | null;
companyName: string | null;
entrance: string | null;
accessDetails: string | null;
deliveryInstructions: string | null;
```

**Step 2: Update GET route to return new fields**

In `app/api/tenants/[tenantSlug]/addresses/route.ts`, the Prisma `findMany` select (if using select) must include the new fields. If it returns all fields already (no explicit select), no change needed. Check and adjust.

**Step 3: Update POST route to accept new fields**

In the POST handler, destructure the new fields from the request body and include them in `prisma.address.create`:

```ts
const { label, street, city, postalCode, country, lat, lng, isDefault,
        locationType, floor, apartmentNumber, companyName,
        entrance, accessDetails, deliveryInstructions } = body;
```

Pass all to `create.data`.

**Step 4: Update PUT route to accept new fields**

In `app/api/tenants/[tenantSlug]/addresses/[addressId]/route.ts`, include the new fields in the update data.

**Step 5: Verify**

Run: `pnpm tsc --noEmit`

**Step 6: Commit**

```bash
git add lib/stores/address-store.ts app/api/tenants/\[tenantSlug\]/addresses/
git commit -m "feat: support address detail fields in store and API routes"
```

---

### Task 4: Create Google Map with Draggable Pin Component

**Files:**
- Create: `components/order/address-map.tsx`

**Step 1: Create the map component**

```tsx
"use client";

import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { useCallback, useRef, useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

interface AddressMapProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
}

export function AddressMap({ lat, lng, onPositionChange }: AddressMapProps) {
  const [markerPosition, setMarkerPosition] = useState({ lat, lng });
  const mapId = useRef(`map-${Date.now()}`);

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        setMarkerPosition({ lat: newLat, lng: newLng });
        onPositionChange(newLat, newLng);
      }
    },
    [onPositionChange]
  );

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={markerPosition}
        defaultZoom={17}
        gestureHandling="greedy"
        disableDefaultUI
        mapId={mapId.current}
        className="h-[200px] w-full rounded-xl"
      >
        <AdvancedMarker
          position={markerPosition}
          draggable
          onDragEnd={handleDragEnd}
        />
      </Map>
    </APIProvider>
  );
}
```

Note: `AdvancedMarker` requires a `mapId`. You can create one in the Google Cloud Console under "Map Management" or use a placeholder string (the map will still render with default styling). If `AdvancedMarker` causes issues with mapId, fall back to the basic `Marker` component from the same library.

**Step 2: Verify**

Run: `pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add components/order/address-map.tsx
git commit -m "feat: add Google Maps draggable pin component"
```

---

### Task 5: Create Reverse Geocode Server Action

**Files:**
- Modify: `server_actions/googleSearchActions.ts`

**Step 1: Add reverse geocode function**

Add to the existing file:

```ts
export async function reverseGeocode(lat: number, lng: number) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=el`
    );
    const data = await res.json();

    if (data.status !== "OK" || !data.results?.[0]) return null;

    const result = data.results[0];
    const components = result.address_components || [];

    let street = "";
    let streetNumber = "";
    let city = "";
    let postalCode = "";

    for (const comp of components) {
      if (comp.types.includes("route")) street = comp.long_name;
      if (comp.types.includes("street_number")) streetNumber = comp.long_name;
      if (comp.types.includes("locality")) city = comp.long_name;
      if (comp.types.includes("postal_code")) postalCode = comp.long_name;
    }

    return {
      street: streetNumber ? `${street} ${streetNumber}` : street,
      city,
      postalCode,
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return null;
  }
}
```

Mark it as a server action with `"use server"` at the top of the file (check if already present).

**Step 2: Verify**

Run: `pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add server_actions/googleSearchActions.ts
git commit -m "feat: add Google reverse geocode server action"
```

---

### Task 6: Add i18n Translations for Address Details

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/el.json`

**Step 1: Add English translations**

Add to the `"Address"` section in `messages/en.json`:

```json
"refinePin": "Drag the pin to your exact location",
"locationType": "Location type",
"house": "House",
"apartment": "Apartment",
"office": "Office",
"otherType": "Other",
"floor": "Floor",
"floorPlaceholder": "e.g. 3",
"apartmentNumber": "Apartment / Unit",
"apartmentPlaceholder": "e.g. 4B",
"companyName": "Company name",
"companyPlaceholder": "e.g. Acme Inc.",
"entranceAccess": "Entrance access",
"doorbell": "Doorbell",
"doorCode": "Door code",
"doorOpen": "Door is open",
"otherAccess": "Other",
"accessDetails": "Access details",
"accessDetailsPlaceholder": "Code, name on bell, etc.",
"deliveryInstructions": "Delivery instructions",
"deliveryInstructionsPlaceholder": "Leave at door, call when arriving, etc."
```

**Step 2: Add Greek translations**

Add to the `"Address"` section in `messages/el.json`:

```json
"refinePin": "Σύρετε την πινέζα στην ακριβή τοποθεσία σας",
"locationType": "Τύπος τοποθεσίας",
"house": "Σπίτι",
"apartment": "Διαμέρισμα",
"office": "Γραφείο",
"otherType": "Άλλο",
"floor": "Όροφος",
"floorPlaceholder": "π.χ. 3",
"apartmentNumber": "Διαμέρισμα",
"apartmentPlaceholder": "π.χ. 4Β",
"companyName": "Επωνυμία εταιρείας",
"companyPlaceholder": "π.χ. Acme ΕΠΕ",
"entranceAccess": "Πρόσβαση εισόδου",
"doorbell": "Κουδούνι",
"doorCode": "Κωδικός πόρτας",
"doorOpen": "Η πόρτα είναι ανοιχτή",
"otherAccess": "Άλλο",
"accessDetails": "Λεπτομέρειες πρόσβασης",
"accessDetailsPlaceholder": "Κωδικός, όνομα στο κουδούνι, κ.λπ.",
"deliveryInstructions": "Οδηγίες παράδοσης",
"deliveryInstructionsPlaceholder": "Αφήστε στην πόρτα, τηλεφωνήστε όταν φτάσετε, κ.λπ."
```

**Step 3: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat: add i18n translations for address detail fields"
```

---

### Task 7: Rewrite Address Manager — Map + Details Form

**Files:**
- Modify: `components/order/address-manager-sheet.tsx`

This is the largest task. The existing component has 3 views: list, search, form. We're replacing the "form" view with the new "map + details" view.

**Step 1: Read the full current file**

Read `components/order/address-manager-sheet.tsx` completely to understand the existing view switching logic, state, and API calls.

**Step 2: Replace the form view**

The existing form view has: label selector, street input, city input, save button. Replace it with:

**Map section (top):**
```tsx
import { AddressMap } from "@/components/order/address-map";
import { reverseGeocode } from "@/server_actions/googleSearchActions";

// When user drags pin:
const handlePinMove = async (newLat: number, newLng: number) => {
  setLat(newLat);
  setLng(newLng);
  const result = await reverseGeocode(newLat, newLng);
  if (result) {
    setStreet(result.street);
    setCity(result.city);
  }
};
```

Render map only when lat/lng are available:
```tsx
{lat != null && lng != null && (
  <div className="space-y-1">
    <AddressMap lat={lat} lng={lng} onPositionChange={handlePinMove} />
    <p className="text-xs text-muted-foreground text-center">{t("refinePin")}</p>
  </div>
)}
```

**Detail form (below map):**

```tsx
{/* Street + City (pre-filled, editable) */}
<Input value={street} onChange={...} placeholder={t("streetPlaceholder")} />
<Input value={city} onChange={...} placeholder={t("cityPlaceholder")} />

{/* Location type pills */}
<div className="space-y-2">
  <Label>{t("locationType")}</Label>
  <div className="flex gap-2">
    {(["house", "apartment", "office", "other"] as const).map((type) => (
      <Button
        key={type}
        variant={locationType === type ? "default" : "outline"}
        size="sm"
        onClick={() => setLocationType(type)}
      >
        {t(type === "other" ? "otherType" : type)}
      </Button>
    ))}
  </div>
</div>

{/* Conditional: Floor (apartment/office) */}
{(locationType === "apartment" || locationType === "office") && (
  <Input value={floor} onChange={...} placeholder={t("floorPlaceholder")} label={t("floor")} />
)}

{/* Conditional: Apartment number */}
{locationType === "apartment" && (
  <Input value={apartmentNumber} onChange={...} placeholder={t("apartmentPlaceholder")} label={t("apartmentNumber")} />
)}

{/* Conditional: Company name */}
{locationType === "office" && (
  <Input value={companyName} onChange={...} placeholder={t("companyPlaceholder")} label={t("companyName")} />
)}

{/* Entrance access pills */}
<div className="space-y-2">
  <Label>{t("entranceAccess")}</Label>
  <div className="flex flex-wrap gap-2">
    {(["doorbell", "door_code", "door_open", "other"] as const).map((method) => (
      <Button
        key={method}
        variant={entrance === method ? "default" : "outline"}
        size="sm"
        onClick={() => setEntrance(method)}
      >
        {t(method === "door_code" ? "doorCode" : method === "door_open" ? "doorOpen" : method === "other" ? "otherAccess" : "doorbell")}
      </Button>
    ))}
  </div>
</div>

{/* Access details (shown when entrance is selected) */}
{entrance && (
  <Input value={accessDetails} onChange={...} placeholder={t("accessDetailsPlaceholder")} label={t("accessDetails")} />
)}

{/* Delivery instructions textarea */}
<Textarea
  value={deliveryInstructions}
  onChange={...}
  placeholder={t("deliveryInstructionsPlaceholder")}
  label={t("deliveryInstructions")}
  rows={2}
/>

{/* Label selector (existing: Home/Work/Other) */}
{/* Keep the existing label pills exactly as they are */}

{/* Save button */}
<Button className="w-full" onClick={handleSave} loading={saving}>
  {saving ? t("saving") : t("saveAddress")}
</Button>
```

**Step 3: Update state variables**

Add new state for the detail fields:
```tsx
const [locationType, setLocationType] = useState<string>("house");
const [floor, setFloor] = useState("");
const [apartmentNumber, setApartmentNumber] = useState("");
const [companyName, setCompanyName] = useState("");
const [entrance, setEntrance] = useState<string>("");
const [accessDetails, setAccessDetails] = useState("");
const [deliveryInstructions, setDeliveryInstructions] = useState("");
```

**Step 4: Update save handler**

Include new fields in the POST body:
```ts
body: JSON.stringify({
  label, street, city, postalCode, country, lat, lng, isDefault: addresses.length === 0,
  locationType, floor: floor || null, apartmentNumber: apartmentNumber || null,
  companyName: companyName || null, entrance: entrance || null,
  accessDetails: accessDetails || null, deliveryInstructions: deliveryInstructions || null,
}),
```

**Step 5: Verify**

Run: `pnpm tsc --noEmit`

**Step 6: Commit**

```bash
git add components/order/address-manager-sheet.tsx
git commit -m "feat: rewrite address form with map + detail fields"
```

---

### Task 8: Wire Delivery Address Details into Checkout + Order Creation

**Files:**
- Modify: `components/order/checkout-form.tsx`
- Modify: `app/api/tenants/[tenantSlug]/orders/route.ts`
- Modify: `lib/validations/order.ts`

**Step 1: Update checkout form**

In `components/order/checkout-form.tsx`, when building the order payload for delivery, add a `deliveryAddressDetails` JSON snapshot built from the selected address:

```ts
deliveryAddressDetails:
  orderType === "DELIVERY" && selectedAddress
    ? {
        street: selectedAddress.street,
        city: selectedAddress.city,
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
        locationType: selectedAddress.locationType,
        floor: selectedAddress.floor,
        apartmentNumber: selectedAddress.apartmentNumber,
        companyName: selectedAddress.companyName,
        entrance: selectedAddress.entrance,
        accessDetails: selectedAddress.accessDetails,
        deliveryInstructions: selectedAddress.deliveryInstructions,
      }
    : undefined,
```

**Step 2: Update order validation schema**

In `lib/validations/order.ts`, add to `createOrderSchema`:

```ts
deliveryAddressDetails: z.object({
  street: z.string(),
  city: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  locationType: z.string().nullable().optional(),
  floor: z.string().nullable().optional(),
  apartmentNumber: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  entrance: z.string().nullable().optional(),
  accessDetails: z.string().nullable().optional(),
  deliveryInstructions: z.string().nullable().optional(),
}).optional(),
```

**Step 3: Update order creation API**

In `app/api/tenants/[tenantSlug]/orders/route.ts`, destructure `deliveryAddressDetails` from the validated data and pass it to `prisma.order.create`:

```ts
const { ..., deliveryAddressDetails } = validated;

// In prisma.order.create data:
deliveryAddressDetails: deliveryAddressDetails ?? undefined,
```

**Step 4: Verify**

Run: `pnpm tsc --noEmit`

**Step 5: Commit**

```bash
git add components/order/checkout-form.tsx lib/validations/order.ts app/api/tenants/\[tenantSlug\]/orders/route.ts
git commit -m "feat: pass delivery address details JSON to order creation"
```

---

### Task 9: Show Delivery Details in Admin Order View

**Files:**
- Modify: `components/admin/orders/order-management.tsx`

**Step 1: Read the component**

Read `components/admin/orders/order-management.tsx` to find where delivery address is displayed in the order detail/card view.

**Step 2: Render structured details**

Find where `deliveryAddress` is shown. Below it, add structured rendering of `deliveryAddressDetails`:

```tsx
{order.deliveryAddressDetails && (() => {
  const d = order.deliveryAddressDetails as {
    locationType?: string;
    floor?: string;
    apartmentNumber?: string;
    companyName?: string;
    entrance?: string;
    accessDetails?: string;
    deliveryInstructions?: string;
  };
  return (
    <div className="text-sm text-muted-foreground space-y-0.5 mt-1">
      {d.floor && <p>Floor: {d.floor}{d.apartmentNumber ? `, Apt: ${d.apartmentNumber}` : ""}</p>}
      {d.companyName && <p>Company: {d.companyName}</p>}
      {d.entrance && <p>Access: {d.entrance === "door_code" ? "Door code" : d.entrance === "door_open" ? "Door is open" : d.entrance}{d.accessDetails ? `: ${d.accessDetails}` : ""}</p>}
      {d.deliveryInstructions && <p>Notes: {d.deliveryInstructions}</p>}
    </div>
  );
})()}
```

Also ensure the API/query that fetches orders includes `deliveryAddressDetails` in the select/return.

**Step 3: Verify**

Run: `pnpm tsc --noEmit`

**Step 4: Commit**

```bash
git add components/admin/orders/order-management.tsx
git commit -m "feat: show structured delivery details in admin order view"
```

---

### Task 10: Final Verification

**Step 1: Full build check**

```bash
pnpm tsc --noEmit && pnpm lint && pnpm build
```

**Step 2: Manual test checklist**

- [ ] Open address manager → search an address → map appears with pin
- [ ] Drag pin → street/city update via reverse geocode
- [ ] Fill detail fields (apartment, floor 3, doorbell, "ring twice")
- [ ] Save → address stored with all detail fields
- [ ] Select address in checkout → delivery details shown
- [ ] Place delivery order → admin sees structured delivery details
- [ ] Edit existing address → detail fields pre-filled
- [ ] Delete address → works as before

**Step 3: Final commit if any fixes needed**
