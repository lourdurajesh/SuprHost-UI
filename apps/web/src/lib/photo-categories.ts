import type { ListingImage } from "@/lib/pms/types";

// Guest-facing names for the photo categories the PMS offers (slugs match the backend's closed
// list). Anything else on a photo is ignored, so a new or odd value can never reach the page.
export const PHOTO_CATEGORY_LABEL: Record<string, string> = {
  exterior: "Outside",
  living: "Living area",
  bedroom: "Bedrooms",
  bathroom: "Bathrooms",
  kitchen: "Kitchen and dining",
  outdoors: "Garden and outdoors",
  view: "Views",
  other: "More",
};

export type PhotoChip = { slug: string; label: string; count: number; first: number };

/**
 * One chip per category present on the photos, in order of first appearance, each pointing at
 * its first photo. Needs at least two categories to be worth showing; otherwise returns [].
 */
export function photoChips(images: ListingImage[]): PhotoChip[] {
  const chips = new Map<string, PhotoChip>();
  images.forEach((img, i) => {
    const slug = img.category ?? "";
    const label = PHOTO_CATEGORY_LABEL[slug];
    if (!label) return;
    const chip = chips.get(slug);
    if (chip) chip.count += 1;
    else chips.set(slug, { slug, label, count: 1, first: i });
  });
  return chips.size >= 2 ? [...chips.values()] : [];
}
