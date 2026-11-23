import type { ListingSummary } from "@/lib/pms/types";

export interface GroupSuggestion {
  propertyName: string;
  city: string;
  stays: ListingSummary[];
  capacity: number;
}

/**
 * For a party bigger than any single home: stays at the same property in the same town that sleep
 * the party between them, using as few homes as possible (largest first). Empty when one home
 * already fits (the normal search handles that) or no property is big enough. Availability is not
 * known here, so the page asks the guest to check dates on each home.
 */
export function groupSuggestions(listings: ListingSummary[], guests: number, max = 2): GroupSuggestion[] {
  if (guests < 2 || listings.some((l) => l.maxGuests >= guests)) return [];
  const sites = new Map<string, ListingSummary[]>();
  for (const l of listings) sites.set(`${l.propertyName}|${l.city}`, [...(sites.get(`${l.propertyName}|${l.city}`) ?? []), l]);

  const out: GroupSuggestion[] = [];
  for (const homes of sites.values()) {
    const sorted = [...homes].sort((a, b) => b.maxGuests - a.maxGuests);
    const picked: ListingSummary[] = [];
    let capacity = 0;
    for (const h of sorted) {
      if (capacity >= guests) break;
      picked.push(h);
      capacity += h.maxGuests;
    }
    if (capacity >= guests && picked.length >= 2) out.push({ propertyName: picked[0].propertyName, city: picked[0].city, stays: picked, capacity });
  }
  // Fewest homes first, then least spare room.
  return out.sort((a, b) => a.stays.length - b.stays.length || a.capacity - b.capacity).slice(0, max);
}
