export const NOMINATIM_HEADERS = {
  "User-Agent": "fridge-recipe-app (class project)",
};

export function buildAddressLabel(address) {
  if (!address) return "";
  const city = address.city || address.county || "";
  const borough = address.borough || address.city_district || address.district || "";
  const dong = address.quarter || address.suburb || address.neighbourhood || address.village || "";
  return [city, borough, dong].filter(Boolean).join(" ");
}
