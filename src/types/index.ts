export type FuelType = "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC" | "UNKNOWN";
export type Transmission = "MANUAL" | "AUTOMATIC" | "UNKNOWN";
export type Source = "AUTOMOBILE_TN" | "TAYARA" | "DEALERSHIP";

// Normalized shape every scraper must produce, regardless of source site
// quirks. This is the contract between scrapers/ and upsertListing.ts.
export interface ScrapedListing {
  source: Source;
  sourceId: string; // unique id/slug on that source
  url: string;
  brandRaw: string;
  modelRaw: string;
  year?: number;
  mileageKm?: number;
  fuelType?: FuelType;
  transmission?: Transmission;
  price: number;
  currency?: string;
  location?: string;
  imageURL?: string;
  dealershipName?: string;
}