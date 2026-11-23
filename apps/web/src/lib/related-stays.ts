import type { ListingSummary } from "@/lib/pms/types";

/**
 * Other stays worth showing under a listing: same town first, then same property, then a similar
 * size, then a similar price. Replaces "the first three in the list", which suggested a one-person
 * suite under a family house.
 */
export function relatedStays(current: ListingSummary, all: ListingSummary[], count = 3): ListingSummary[] {
  const score = (l: ListingSummary) =>
    (l.city === current.city ? 100 : 0) +
    (l.propertyName === current.propertyName ? 40 : 0) +
    Math.max(0, 30 - Math.abs(l.maxGuests - current.maxGuests) * 6) +
    Math.max(0, 20 - (Math.abs(l.fromPrice - current.fromPrice) / Math.max(current.fromPrice, 1)) * 20);
  return all
    .filter((l) => l.id !== current.id)
    .sort((a, b) => score(b) - score(a))
    .slice(0, count);
}
