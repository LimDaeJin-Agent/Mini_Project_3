"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import IngredientTable from "@/components/IngredientTable";
import PrepOrderTable from "@/components/PrepOrderTable";
import StepTimer from "@/components/StepTimer";
import FridgeLoader from "@/components/FridgeLoader";
import NotepadLoader from "@/components/NotepadLoader";

const EXCLUDE_KEY = "fridge_recent_dishes";
const EXCLUDE_WINDOW_MS = 30 * 60 * 1000;

function getValidExcludes() {
  try {
    const raw = JSON.parse(localStorage.getItem(EXCLUDE_KEY) || "[]");
    const now = Date.now();
    const valid = raw.filter((e) => now - e.t < EXCLUDE_WINDOW_MS);
    localStorage.setItem(EXCLUDE_KEY, JSON.stringify(valid));
    return valid.map((e) => e.name);
  } catch {
    return [];
  }
}

function addExcludes(names) {
  try {
    const raw = JSON.parse(localStorage.getItem(EXCLUDE_KEY) || "[]");
    const now = Date.now();
    const merged = [
      ...raw.filter((e) => now - e.t < EXCLUDE_WINDOW_MS),
      ...names.map((name) => ({ name, t: now })),
    ];
    localStorage.setItem(EXCLUDE_KEY, JSON.stringify(merged));
  } catch {
    // localStorage를 못 쓰는 환경이면 조용히 넘어감
  }
}

export default function Home() {
  const [ingredients, setIngredients] = useState("");
  const [desiredDish, setDesiredDish] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [cookingDevice, setCookingDevice] = useState("gas");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [savedNames, setSavedNames] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState("");
  const [manualLocationLoading, setManualLocationLoading] = useState(false);
  const [locationCandidates, setLocationCandidates] = useState(null);
  const abortControllerRef = useRef(null);

  async function handleSearchLocation(e) {
    e.preventDefault();
    if (!manualLocationInput.trim()) return;
    setWeatherError("");
    setLocationCandidates(null);
    setManualLocationLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(manualLocationInput.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setWeatherError(data.error || "지역을 찾지 못했어요.");
      } else if (!data.candidates || data.candidates.length === 0) {
        setWeatherError("해당 지역을 찾지 못했어요. 다르게 입력해보세요.");
      } else {
        setLocationCandidates(data.candidates);
      }
    } catch (err) {
      setWeatherError("지역을 찾지 못했어요.");
    } finally {
      setManualLocationLoading(false);
    }
  }

  async function handleSelectCandidate(candidate) {
    setWeatherError("");
    setManualLocationLoading(true);
    try {
      const label = [candidate.name, candidate.state].filter(Boolean).join(" ");
      const res = await fetch(
        `/api/weather?lat=${candidate.lat}&lon=${candidate.lon}&name=${encodeURIComponent(label)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setWeatherError(data.error || "날씨 정보를 가져오지 못했어요.");
      } else {
        setWeather(data);
        setShowManualLocation(false);
        setManualLocationInput("");
        setLocationCandidates(null);
      }
    } catch (err) {
      setWeatherError("날씨 정보를 가져오지 못했어요.");
    } finally {
      setManualLocationLoading(false);
    }
  }

  function getPlatform() {
    if (typeof navigator === "undefined") return "desktop";
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/.test(ua)) return "ios";
    if (/Android/.test(ua)) return "android";
    return "desktop";
  }

  function handleGps() {
    setWeatherError("");

    if (!navigator.geolocation) {
      setWeatherError("이 브라우저는 위치 기능을 지원하지 않아요.");
      return;
    }

    if (!window.isSecureContext) {
      setWeatherError(
        "위치 정보는 보안 연결(https)이나 localhost에서만 사용할 수 있어요. 배포된 주소(https://...)나 이 컴퓨터의 localhost:3000에서 시도해주세요."
      );
      return;
    }

    setWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude, accuracy } = pos.coords;
          const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (!res.ok) {
            setWeatherError(data.error || "날씨 정보를 가져오지 못했어요.");
          } else {
            setWeather({ ...data, accuracy: Math.round(accuracy) });
          }
        } catch (err) {
          setWeatherError("날씨 정보를 가져오지 못했어요.");
        } finally {
          setWeatherLoading(false);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setWeatherError("위치 권한이 차단되어 있어요.");
          setShowPermissionHelp(true);
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setWeatherError("위치를 확인할 수 없어요. 기기의 위치 서비스(GPS)가 켜져 있는지 확인해주세요.");
        } else {
          setWeatherError("위치 확인이 시간 초과됐어요. 다시 시도해주세요.");
        }
        setWeatherLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const hasIngredients = ingredients.trim();
    const hasDesiredDish = desiredDish.trim();

    if (!hasIngredients && !hasDesiredDish) {
      setError("가진 재료 또는 먹고 싶은 요리 중 하나는 입력해주세요.");
      return;
    }

    const isWeatherMode = hasIngredients && !hasDesiredDish && weather;
    const excludeDishes = isWeatherMode ? getValidExcludes() : [];

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setRecipes([]);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients,
          desiredDish,
          cookTime,
          servings,
          weather: isWeatherMode ? weather : undefined,
          excludeDishes,
        }),
        signal: controller.signal,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "추천을 받아오지 못했습니다.");
        return;
      }

      setRecipes(data.recipes || []);
      if (isWeatherMode) {
        addExcludes((data.recipes || []).map((r) => r.name));
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError("추천 요청을 취소했어요.");
      } else {
        setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }

  function handleStop() {
    abortControllerRef.current?.abort();
  }

  async function handleSave(recipe) {
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients_input: ingredients,
          recipe_name: recipe.name,
          cook_time: recipe.cookTime,
          servings_requested: recipe.servingsRequested,
          main_ingredients: recipe.mainIngredients,
          seasonings: recipe.seasonings,
          steps: recipe.steps,
          cooking_device: cookingDevice,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSavedNames((prev) => [...prev, recipe.name]);
    } catch (err) {
      alert("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center px-3 sm:px-4 py-6 sm:py-10">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">
            <FridgeLoader active={loading} />
            냉장고 파먹기
          </h1>
          <Link
            href="/history"
            className="text-xs sm:text-sm font-medium text-[var(--board-accent)] underline whitespace-nowrap"
          >
            저장한 레시피 보기
          </Link>
        </div>
        <p className="text-sm sm:text-base text-[var(--board-text-dim)] mb-4">
          냉장고에 있는 재료를 입력하면 AI가 만들 수 있는 요리를 추천해줘요. 먹고 싶은 요리가 있다면 그 요리를 어떻게 만드는지, 추가로 뭘 사야 하는지도 알려줘요.
        </p>

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            type="button"
            onClick={handleGps}
            disabled={weatherLoading || loading}
            className="text-sm font-medium rounded-md border border-dashed border-[var(--board-border)] text-[var(--board-text-dim)] px-3 py-1.5 disabled:opacity-50"
          >
            📍 {weatherLoading ? "위치 확인 중..." : "내 위치 날씨"}
          </button>
          {weather && (
            <span className="text-sm text-[var(--foreground)]">
              {weather.icon} {weather.locationName} {weather.temp}°C
              {typeof weather.accuracy === "number" && (
                <span className="text-[var(--board-text-dim)]"> (오차범위 약 {weather.accuracy.toLocaleString()}m)</span>
              )}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowManualLocation((v) => !v)}
            className="text-xs underline text-[var(--board-text-dim)]"
          >
            위치가 다른가요? 직접 입력
          </button>
          {weatherError && <span className="text-xs text-[var(--board-danger)]">{weatherError}</span>}
        </div>

        {showManualLocation && (
          <div className="mb-6 rounded-md border border-dashed border-[var(--board-border)] bg-[var(--board-surface)] p-3">
            <form onSubmit={handleSearchLocation} className="flex gap-2 mb-2">
              <input
                className="flex-1 rounded-md border border-dashed border-[var(--board-border)] bg-transparent p-2 text-sm text-[var(--foreground)] placeholder:text-[var(--board-text-dim)]"
                placeholder="예: 수원시 장안구 연무동"
                value={manualLocationInput}
                onChange={(e) => setManualLocationInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={manualLocationLoading}
                className="rounded-md bg-[var(--board-accent)] text-[var(--board-accent-ink)] font-bold px-3 py-2 text-sm disabled:opacity-50"
              >
                {manualLocationLoading ? "검색 중..." : "검색"}
              </button>
            </form>
            {locationCandidates && (
              <div className="flex flex-col gap-1.5">
                {locationCandidates.length === 0 && (
                  <p className="text-xs text-[var(--board-text-dim)]">일치하는 지역이 없어요.</p>
                )}
                {locationCandidates.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectCandidate(c)}
                    className="text-left text-sm rounded-md border border-dashed border-[var(--board-border)] px-3 py-2 text-[var(--foreground)] hover:border-[var(--board-accent)]"
                  >
                    {[c.name, c.state, c.country].filter(Boolean).join(", ")}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {weather && !desiredDish.trim() && (
          <p className="text-xs text-[var(--board-text-dim)] -mt-4 mb-4">
            먹고 싶은 요리를 비워두면 지금 날씨({weather.description || weather.condition})에 맞는 요리 2개를 추천해줘요.
          </p>
        )}

        {showPermissionHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-md border border-dashed border-[var(--board-accent)] bg-[var(--board-surface)] p-4">
              <h3 className="text-base font-extrabold text-[var(--foreground)] mb-2">📍 위치 권한이 꺼져 있어요</h3>
              <p className="text-sm text-[var(--board-text-dim)] mb-3">
                한 번 거부하면 브라우저가 다시 팝업을 안 띄워서, 아래 방법으로 직접 허용으로 바꿔주셔야 해요.
              </p>
              <ol className="list-decimal list-inside text-sm text-[var(--foreground)] flex flex-col gap-1.5 mb-4">
                {getPlatform() === "ios" && (
                  <>
                    <li>주소창의 "ᴬᴬ" 아이콘(또는 설정 아이콘) 클릭</li>
                    <li>"웹사이트 설정" → 위치 → "허용"으로 변경</li>
                    <li>안 보이면: 아이폰 설정 앱 → Safari → 위치 서비스 확인</li>
                  </>
                )}
                {getPlatform() === "android" && (
                  <>
                    <li>주소창 왼쪽 자물쇠 또는 ⓘ 아이콘 클릭</li>
                    <li>"권한" → 위치 → "허용"으로 변경</li>
                    <li>휴대폰 설정에서 위치 서비스(GPS)가 켜져 있는지도 확인</li>
                  </>
                )}
                {getPlatform() === "desktop" && (
                  <>
                    <li>주소창 왼쪽 자물쇠(🔒) 아이콘 클릭</li>
                    <li>"위치" 항목을 "허용"으로 변경</li>
                    <li>이 페이지를 새로고침</li>
                  </>
                )}
                <li>바꾼 뒤 아래 "다시 시도"를 눌러주세요</li>
              </ol>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPermissionHelp(false)}
                  className="flex-1 rounded-md border border-dashed border-[var(--board-border)] text-[var(--board-text-dim)] py-2 text-sm"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionHelp(false);
                    handleGps();
                  }}
                  className="flex-1 rounded-md bg-[var(--board-accent)] text-[var(--board-accent-ink)] font-bold py-2 text-sm"
                >
                  다시 시도
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--board-text-dim)]">
              가진 재료 (쉼표로 구분)
            </label>
            <textarea
              className="w-full rounded-md border border-dashed border-[var(--board-border)] bg-[var(--board-surface)] p-3 text-[var(--foreground)] placeholder:text-[var(--board-text-dim)] disabled:opacity-40 disabled:cursor-not-allowed"
              rows={3}
              placeholder="예: 계란, 대파, 두부, 김치"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--board-text-dim)]">
              먹고 싶은 요리 (선택)
            </label>
            <input
              className="w-full rounded-md border border-dashed border-[var(--board-border)] bg-[var(--board-surface)] p-3 text-[var(--foreground)] placeholder:text-[var(--board-text-dim)] disabled:opacity-40 disabled:cursor-not-allowed"
              placeholder="예: 김치찌개 (비워두면 재료 기반으로 추천만 받아요)"
              value={desiredDish}
              onChange={(e) => setDesiredDish(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-[var(--board-text-dim)]">
                조리 시간 (선택)
              </label>
              <input
                className="w-full rounded-md border border-dashed border-[var(--board-border)] bg-[var(--board-surface)] p-3 text-[var(--foreground)] placeholder:text-[var(--board-text-dim)] disabled:opacity-40 disabled:cursor-not-allowed"
                placeholder="예: 15분 이내"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-[var(--board-text-dim)]">
                인원수 (선택, 비우면 1인분)
              </label>
              <input
                className="w-full rounded-md border border-dashed border-[var(--board-border)] bg-[var(--board-surface)] p-3 text-[var(--foreground)] placeholder:text-[var(--board-text-dim)] disabled:opacity-40 disabled:cursor-not-allowed"
                placeholder="예: 2인"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && <p className="text-[var(--board-danger)] text-sm">{error}</p>}

          {loading ? (
            <div className="flex gap-2">
              <div className="flex-1 flex items-center justify-center gap-3 rounded-md bg-[var(--board-accent)] text-[var(--board-accent-ink)] font-extrabold py-2">
                <NotepadLoader />
                레시피 찾는 중...
              </div>
              <button
                type="button"
                onClick={handleStop}
                className="rounded-md border border-[var(--board-danger)] text-[var(--board-danger)] font-semibold px-5 py-3"
              >
                정지
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full rounded-md bg-[var(--board-accent)] text-[var(--board-accent-ink)] font-extrabold py-3"
            >
              레시피 추천받기
            </button>
          )}
        </form>

        {recipes.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-[var(--board-text-dim)]">
              타이머 기준 조리기구
            </label>
            <div className="flex gap-2 max-w-xs">
              {[
                { value: "gas", label: "🔥 가스레인지" },
                { value: "induction", label: "⚡ 인덕션" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCookingDevice(opt.value)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                    cookingDevice === opt.value
                      ? "border-[var(--board-accent)] bg-[var(--board-accent)] text-[var(--board-accent-ink)] font-bold"
                      : "border-dashed border-[var(--board-border)] text-[var(--board-text-dim)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {recipes.map((recipe, idx) => (
            <div
              key={idx}
              className="rounded-md border border-dashed border-[var(--board-border)] bg-[var(--board-surface)] p-3 sm:p-4"
            >
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-[var(--foreground)] -rotate-[0.4deg]">
                  {recipe.name}
                </h2>
                <span className="text-xs sm:text-sm font-bold bg-[var(--board-accent)] text-[var(--board-accent-ink)] px-2 py-0.5 rounded rotate-[0.6deg] whitespace-nowrap">
                  {recipe.cookTime}
                </span>
              </div>

              {recipe.reason && (
                <p className="text-sm text-[var(--board-accent)] mb-3">💬 {recipe.reason}</p>
              )}

              <IngredientTable
                title="주재료"
                items={recipe.mainIngredients}
                servingsLabel={recipe.servingsRequested || "요청 인분"}
              />
              <IngredientTable
                title="양념"
                items={recipe.seasonings}
                servingsLabel={recipe.servingsRequested || "요청 인분"}
              />
              <p className="text-xs text-[var(--board-text-dim)] mb-3">🛒 표시는 추가로 사야 하는 재료예요.</p>

              <PrepOrderTable mainIngredients={recipe.mainIngredients} seasonings={recipe.seasonings} />

              <ol className="list-decimal list-inside text-sm text-[var(--foreground)] flex flex-col gap-2 mb-3">
                {(recipe.steps || []).map((step, i) => (
                  <li key={i} className="leading-relaxed">
                    {step.text}
                    <StepTimer
                      minutes={cookingDevice === "induction" ? step.durationMinutesInduction : step.durationMinutesGas}
                    />
                  </li>
                ))}
              </ol>
              <button
                onClick={() => handleSave(recipe)}
                disabled={savedNames.includes(recipe.name)}
                className="text-sm font-semibold rounded-md border border-[var(--board-accent)] text-[var(--board-accent)] px-3 py-1.5 disabled:opacity-40"
              >
                {savedNames.includes(recipe.name) ? "저장됨" : "저장하기"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
