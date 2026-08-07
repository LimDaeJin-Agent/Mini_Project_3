import { NOMINATIM_HEADERS, buildAddressLabel } from "@/lib/geo";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return Response.json({ error: "지역명을 입력해주세요." }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      q.trim()
    )}&format=json&addressdetails=1&countrycodes=kr&accept-language=ko&limit=5`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    const data = await res.json();

    if (!res.ok) {
      console.error("Nominatim geocode error:", data);
      return Response.json({ error: "지역을 찾지 못했어요." }, { status: 502 });
    }

    const seen = new Set();
    const candidates = [];
    for (const item of data || []) {
      const label = buildAddressLabel(item.address) || item.name;
      if (!label || seen.has(label)) continue;
      seen.add(label);
      candidates.push({ label, lat: item.lat, lon: item.lon });
    }

    return Response.json({ candidates });
  } catch (error) {
    console.error("Geocode fetch error:", error);
    return Response.json({ error: "지역을 찾지 못했어요." }, { status: 502 });
  }
}
