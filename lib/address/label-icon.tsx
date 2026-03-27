import { Briefcase, Home, MapPin } from "lucide-react";

/**
 * Single source of truth for address label → icon mapping.
 * Used everywhere an address icon is rendered.
 */
export function getAddressLabelIcon(label: string | null | undefined, className = "size-5") {
  if (label === "Home") return <Home className={className} />;
  if (label === "Work") return <Briefcase className={className} />;
  return <MapPin className={className} />;
}
