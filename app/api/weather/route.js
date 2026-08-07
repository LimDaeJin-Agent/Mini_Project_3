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

async function resolveCoords(query, apiKey) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.length) return null;
  return { lat: data[0].lat, lon: data[0].lon, name: data[0].local_names?.ko || data[0].name };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const nameOverride = searchParams.get("name");
  let lat = searchParams.get("lat");
  let lon = searchParams.get("lon");

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "서버에 OPENWEATHER_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let overrideName = nameOverride && nameOverride.trim() ? nameOverride.trim() : null;

  if (!overrideName && q && q.trim()) {
    try {
      const resolved = await resolveCoords(q.trim(), apiKey);
      if (!resolved) {
        return Response.json({ error: "입력하신 지역을 찾지 못했어요. 다르게 입력해보세요." }, { status: 404 });
      }
      lat = resolved.lat;
      lon = resolved.lon;
      overrideName = q.trim();
    } catch (error) {
      console.error("Geocoding error:", error);
      return Response.json({ error: "지역을 찾지 못했어요." }, { status: 502 });
    }
  }

  if (!lat || !lon) {
    return Response.json({ error: "위치 정보가 없습니다." }, { status: 400 });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=kr`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error("OpenWeatherMap error:", data);
      return Response.json({ error: "날씨 정보를 가져오지 못했습니다." }, { status: 502 });
    }

    const condition = data.weather?.[0]?.main || "Clear";
    const description = data.weather?.[0]?.description || "";

    return Response.json({
      locationName: overrideName || data.name || "내 위치",
      temp: Math.round(data.main?.temp),
      condition,
      description,
      icon: WEATHER_ICONS[condition] || "🌡️",
      manual: Boolean(overrideName),
    });
  } catch (error) {
    console.error("Weather fetch error:", error);
    return Response.json({ error: "날씨 정보를 가져오지 못했습니다." }, { status: 502 });
  }
}
