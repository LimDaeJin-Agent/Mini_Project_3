import { NOMINATIM_HEADERS, buildAddressLabel } from "@/lib/geo";

const WEATHER_ICONS = {
  Clear: "☀️",
  Clouds: "☁️",
  Rain: "🌧️",
  Drizzle: "🌦️",
  Thunderstorm: "⛈️",
  Snow: "❄️",
  Mist: "🌫️",
  Fog: "🌫️",
  Haze: "🌫️",
  Smoke: "🌫️",
  Dust: "🌫️",
  Tornado: "🌪️",
};

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=ko&zoom=16`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    const data = await res.json();
    if (!res.ok) return null;
    return buildAddressLabel(data.address) || null;
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const nameOverride = searchParams.get("name");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return Response.json({ error: "위치 정보가 없습니다." }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "서버에 OPENWEATHER_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const [weatherRes, resolvedName] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=kr`),
      nameOverride && nameOverride.trim() ? Promise.resolve(nameOverride.trim()) : reverseGeocode(lat, lon),
    ]);
    const data = await weatherRes.json();

    if (!weatherRes.ok) {
      console.error("OpenWeatherMap error:", data);
      return Response.json({ error: "날씨 정보를 가져오지 못했습니다." }, { status: 502 });
    }

    const condition = data.weather?.[0]?.main || "Clear";
    const description = data.weather?.[0]?.description || "";

    return Response.json({
      locationName: resolvedName || data.name || "내 위치",
      temp: Math.round(data.main?.temp),
      condition,
      description,
      icon: WEATHER_ICONS[condition] || "🌡️",
    });
  } catch (error) {
    console.error("Weather fetch error:", error);
    return Response.json({ error: "날씨 정보를 가져오지 못했습니다." }, { status: 502 });
  }
}
