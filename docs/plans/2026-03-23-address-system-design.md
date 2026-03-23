# Full Address System (Map Pin + Details) Design

**Date:** 2026-03-23

---

## Flow

2-step inside address-manager dialog:

1. **Search step** -- Google Places autocomplete + "Detect location" button (both existing)
2. **Map + Details step** -- Google Map with draggable pin (top), detail form (below), save button at bottom

Selecting a search result transitions to step 2 with pin placed at the result's coordinates.

---

## Map Component

- **Library:** `@vis.gl/react-google-maps` (Google's official React wrapper)
- Map centered on selected coordinates, zoom ~17
- Draggable marker pin
- On drag end: reverse-geocode via Google Geocoding API, update street/city text
- Map height: ~200px on mobile
- API key: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (same key as server-side, exposed to client)

---

## Detail Form Fields (below map)

```
[Street Address]          -- pre-filled from search, editable
[City]                    -- pre-filled, editable

[Location Type]           -- House | Apartment | Office | Other (pill buttons)

--- Conditional (Apartment/Office) ---
[Floor]                   -- number input
[Apartment/Unit]          -- text input (Apartment only)
[Company Name]            -- text input (Office only)

[Entrance / Access]       -- Doorbell | Door code | Door is open | Other (pill selector)
[Access details]          -- text input (code, name on bell, etc.)

[Delivery Instructions]   -- textarea

[Label]                   -- Home | Work | Other (existing pill buttons)

[ Save Address ]
```

---

## Schema Changes

### Address model -- add fields

```prisma
locationType          String?  @map("location_type")       // house, apartment, office, other
floor                 String?
apartmentNumber       String?  @map("apartment_number")
companyName           String?  @map("company_name")
entrance              String?                               // doorbell, door_code, door_open, other
accessDetails         String?  @map("access_details")
deliveryInstructions  String?  @map("delivery_instructions")
```

### Order model -- add JSON snapshot

```prisma
deliveryAddressDetails Json? @map("delivery_address_details")
```

Snapshot format:
```json
{
  "street": "123 Main St",
  "city": "Athens",
  "lat": 37.98,
  "lng": 23.73,
  "locationType": "apartment",
  "floor": "3",
  "apartmentNumber": "42",
  "entrance": "door_code",
  "accessDetails": "1234",
  "deliveryInstructions": "Ring twice"
}
```

---

## Integration Points

- **Checkout form**: passes `deliveryAddressDetails` JSON to order creation API
- **Order creation API**: stores JSON in new field
- **Order validation schema**: add `deliveryAddressDetails` as optional object
- **Admin order view**: render structured delivery details from JSON
- **i18n**: all new labels in EN + EL

---

## Admin Order View

Structured rendering of delivery details:

- **Address:** 123 Main St, Athens
- **Floor:** 3, **Apt:** 42
- **Access:** Door code: 1234
- **Notes:** Ring twice

---

## Non-Goals

- Saved address editing (existing flow handles this)
- Multiple map providers
- Delivery zone visualization on map
- Real-time driver tracking on map
