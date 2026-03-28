// Google Maps "Night Mode" style parameters — applied when dark theme is active
const DARK_STYLES = [
  "feature:all|element:geometry|color:0x242f3e",
  "feature:all|element:labels.text.fill|color:0x746855",
  "feature:all|element:labels.text.stroke|color:0x242f3e",
  "feature:road|element:geometry|color:0x38414e",
  "feature:road|element:geometry.stroke|color:0x212a37",
  "feature:road.highway|element:geometry|color:0x746855",
  "feature:road.highway|element:geometry.stroke|color:0x1f2835",
  "feature:water|element:geometry|color:0x17263c",
  "feature:poi|element:all|visibility:off",
  "feature:transit|element:all|visibility:off",
  "feature:all|element:labels.icon|visibility:off",
];

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface BuildMapUrlOptions {
  storeLat: number;
  storeLng: number;
  /** Second pin for the customer (delivery orders). Omit for pickup. */
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  dark?: boolean;
  /** Size string e.g. "800x320". Default "800x320". */
  size?: string;
  zoom?: number;
}

/**
 * Builds a Google Static Maps URL with one or two pins and optional dark theme.
 * When both store and delivery coordinates are supplied Google auto-fits the
 * viewport to show both markers.
 */
export function buildMapUrl({
  storeLat,
  storeLng,
  deliveryLat,
  deliveryLng,
  dark = false,
  size = "800x320",
  zoom,
}: BuildMapUrlOptions): string {
  const params = new URLSearchParams({ size, scale: "2", key: MAPS_KEY });

  params.append("markers", `color:red|size:mid|${storeLat},${storeLng}`);

  if (deliveryLat != null && deliveryLng != null) {
    params.append("markers", `color:blue|size:mid|${deliveryLat},${deliveryLng}`);
  } else {
    params.set("center", `${storeLat},${storeLng}`);
    params.set("zoom", String(zoom ?? 15));
  }

  if (dark) DARK_STYLES.forEach((s) => params.append("style", s));

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/** Convenience: single-pin thumbnail for an address (used in checkout address card). */
export function buildAddressThumbnailUrl(lat: number, lng: number, dark = false): string {
  return buildMapUrl({ storeLat: lat, storeLng: lng, size: "144x144", zoom: 15, dark });
}

export { MAPS_KEY };
