/**
 * Canonical brand name lookup. Every source (automobile.tn's slug-derived
 * names, tayara.tn's free-text detection) funnels through this before
 * touching the DB, so "BMW"/"Bmw", "Mercedes"/"Mercedes-Benz"/"Mercedes Benz",
 * "Citroen"/"Citroën" etc. all collapse to one row instead of creating
 * separate Brand entries that fragment stats and filter dropdowns.
 *
 * Keyed by lowercased, trimmed input. Anything not in this map passes
 * through unchanged (trimmed) — this list only needs entries for brands
 * that actually showed up as duplicates or are known to vary by source.
 */
const CANONICAL_BRANDS: Record<string, string> = {
  bmw: "BMW",
  byd: "BYD",
  citroen: "Citroën",
  "citroën": "Citroën",
  mercedes: "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  "mercedes benz": "Mercedes-Benz",
  benz: "Mercedes-Benz",
  mb: "Mercedes-Benz",
  mg: "MG",
  ssangyong: "SsangYong",
  "ssang yong": "SsangYong",
  vw: "Volkswagen",
  volkswagen: "Volkswagen",
};

export function canonicalizeBrand(name: string): string {
  const key = name.trim().toLowerCase();
  return CANONICAL_BRANDS[key] ?? name.trim();
}
