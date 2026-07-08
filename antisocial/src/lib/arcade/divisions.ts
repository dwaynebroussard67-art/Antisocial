// Arcade sub-piece 2 of 6: War. PORTED from docs/salvaged/original-upload-reference.txt,
// no rename needed — this file never touches the members table.

export const DIVISIONS = [
  { name: "bronze", minRating: 0 },
  { name: "silver", minRating: 1200 },
  { name: "gold", minRating: 1400 },
  { name: "platinum", minRating: 1600 },
  { name: "elite", minRating: 1800 },
] as const;

export type Division = (typeof DIVISIONS)[number]["name"];

export function divisionForRating(rating: number): Division {
  let current: Division = "bronze";
  for (const d of DIVISIONS) if (rating >= d.minRating) current = d.name;
  return current;
}
