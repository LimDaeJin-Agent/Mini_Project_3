"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import IngredientTable from "@/components/IngredientTable";
import PrepOrderTable from "@/components/PrepOrderTable";
import StepTimer from "@/components/StepTimer";
import FridgeLoader from "@/components/FridgeLoader";
import NotepadLoader from "@/components/NotepadLoader";

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
  const abortControllerRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!ingredients.trim() && !desiredDish.trim()) {
      setError("가진 재료 또는 먹고 싶은 요리 중 하나는 입력해주세요.");
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setRecipes([]);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, desiredDish, cookTime, servings }),
        signal: controller.signal,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "추천을 받아오지 못했습니다.");
        return;
      }

      setRecipes(data.recipes || []);
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
        <p className="text-sm sm:text-base text-[var(--board-text-dim)] mb-6">
          냉장고에 있는 재료를 입력하면 AI가 만들 수 있는 요리를 추천해줘요. 먹고 싶은 요리가 있다면 그 요리를 어떻게 만드는지, 추가로 뭘 사야 하는지도 알려줘요.
        </p>

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
