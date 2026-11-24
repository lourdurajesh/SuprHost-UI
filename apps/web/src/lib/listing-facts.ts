import type { ListingSummary, PropertyType } from "./pms/types";
import { plural } from "./text";

export const PROPERTY_TYPE: Record<PropertyType, string> = {
  cottage: "Cottage",
  suite: "Suite",
  villa: "Villa",
  home: "Home",
  apartment: "Apartment",
};

/** ["4 guests", "2 bedrooms", "2 beds", "2 bathrooms"]: whatever is known. */
export function listingSpecs(l: Pick<ListingSummary, "maxGuests" | "bedrooms" | "beds" | "bathrooms">, parts: ("bedrooms" | "beds" | "bathrooms")[] = ["bedrooms", "beds", "bathrooms"]): string[] {
  const words = { bedrooms: "bedroom", beds: "bed", bathrooms: "bathroom" } as const;
  return [plural(l.maxGuests, "guest"), ...parts.flatMap((k) => (l[k] ? [plural(l[k], words[k])] : []))];
}
