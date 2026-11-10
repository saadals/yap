import type { City } from "@/lib/types";

/** North America first (no Quebec cities: the legal pack excludes Quebec at launch). */
export const cities: City[] = [
  { id: "toronto", name: "Toronto", countryId: "ca" },
  { id: "vancouver", name: "Vancouver", countryId: "ca" },
  { id: "ottawa", name: "Ottawa", countryId: "ca" },
  { id: "new-york", name: "New York", countryId: "us" },
  { id: "san-francisco", name: "San Francisco", countryId: "us" },
  { id: "los-angeles", name: "Los Angeles", countryId: "us" },
  { id: "chicago", name: "Chicago", countryId: "us" },
  { id: "austin", name: "Austin", countryId: "us" },
  { id: "seattle", name: "Seattle", countryId: "us" },
  { id: "detroit", name: "Detroit", countryId: "us" },
  { id: "miami", name: "Miami", countryId: "us" },
  { id: "dubai", name: "Dubai", countryId: "ae" },
  { id: "riyadh", name: "Riyadh", countryId: "sa" },
  { id: "cairo", name: "Cairo", countryId: "eg" },
  { id: "london", name: "London", countryId: "gb" },
  { id: "lagos", name: "Lagos", countryId: "ng" },
  { id: "sao-paulo", name: "São Paulo", countryId: "br" },
];
