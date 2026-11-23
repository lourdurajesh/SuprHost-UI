// Groups a listing's flat amenity list into a few headed sections so a long list scans quickly.
// Matching is by keyword on the host's own labels; anything unrecognised lands in "More", so a
// new or oddly worded amenity is never dropped.

const GROUPS: { title: string; words: string[] }[] = [
  { title: "Essentials", words: ["wi-fi", "wifi", "air", "hot water", "power", "parking", "heating", "tv", "shower", "bathroom"] },
  { title: "Kitchen and dining", words: ["kitchen", "breakfast", "fridge", "refrigerator", "microwave", "dining", "cook", "coffee", "tea"] },
  { title: "Outdoors and views", words: ["garden", "courtyard", "river", "lake", "view", "balcony", "verandah", "veranda", "terrace", "pool", "bonfire", "barbecue", "bbq"] },
  { title: "Services", words: ["caretaker", "housekeeping", "laundry", "wash", "iron", "staff", "cook on request", "pick-up", "pickup"] },
];

export function groupAmenities(amenities: string[]): { title: string; items: string[] }[] {
  const out = GROUPS.map((g) => ({ title: g.title, items: [] as string[] }));
  const more: string[] = [];
  for (const a of amenities) {
    const l = a.toLowerCase();
    const i = GROUPS.findIndex((g) => g.words.some((w) => l.includes(w)));
    (i === -1 ? more : out[i].items).push(a);
  }
  const groups = out.filter((g) => g.items.length > 0);
  if (more.length) groups.push({ title: "More", items: more });
  return groups;
}
