async function fetchCandidates(query, apiKey) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
    query
  )}&limit=5&appid=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) return { ok: false, data };
  return { ok: true, data };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return Response.json({ error: "지역명을 입력해주세요." }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "서버에 OPENWEATHER_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const trimmed = q.trim();
  // 시/구/동을 붙여서 입력하면 못 찾는 경우가 많아서, 못 찾으면 마지막 단어(보통 가장 구체적인 지명)로 재시도
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const queriesToTry = [trimmed];
  if (tokens.length > 1 && !queriesToTry.includes(tokens[tokens.length - 1])) {
    queriesToTry.push(tokens[tokens.length - 1]);
  }

  try {
    let result = null;
    for (const query of queriesToTry) {
      const attempt = await fetchCandidates(query, apiKey);
      if (!attempt.ok) {
        console.error("OpenWeatherMap geocode error:", attempt.data);
        return Response.json({ error: "지역을 찾지 못했어요." }, { status: 502 });
      }
      if (attempt.data && attempt.data.length > 0) {
        result = attempt.data;
        break;
      }
    }

    const candidates = (result || []).map((item) => ({
      name: item.local_names?.ko || item.name,
      state: item.state || "",
      country: item.country || "",
      lat: item.lat,
      lon: item.lon,
    }));

    return Response.json({ candidates });
  } catch (error) {
    console.error("Geocode fetch error:", error);
    return Response.json({ error: "지역을 찾지 못했어요." }, { status: 502 });
  }
}
