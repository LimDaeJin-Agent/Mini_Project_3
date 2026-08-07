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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
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
      locationName: data.name || "내 위치",
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
