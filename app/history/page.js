"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import IngredientTable from "@/components/IngredientTable";
import PrepOrderTable from "@/components/PrepOrderTable";
import StepTimer from "@/components/StepTimer";

const LONG_PRESS_MS = 500;

export default function HistoryPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cookingDevice, setCookingDevice] = useState("gas");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const pressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/recipes");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "목록을 불러오지 못했습니다.");
          return;
        }
        setRecipes(data.recipes || []);
      } catch (err) {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleExpanded(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePointerDown(id) {
    if (selectionMode) return;
    longPressFiredRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setSelectionMode(true);
      setSelectedIds(new Set([id]));
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    clearTimeout(pressTimerRef.current);
  }

  function handleCardClick(id) {
    cancelPress();
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    toggleExpanded(id);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === recipes.length ? new Set() : new Set(recipes.map((r) => r.id))));
  }

  async function deleteIds(ids) {
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => fetch(`/api/recipes/${id}`, { method: "DELETE" })));
      setRecipes((prev) => prev.filter((r) => !ids.includes(r.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch (err) {
      alert("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteSingle(id) {
    if (!confirm("이 레시피를 삭제할까요?")) return;
    deleteIds([id]);
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개 레시피를 삭제할까요?`)) return;
    await deleteIds([...selectedIds]);
    setSelectionMode(false);
  }

  return (
    <div className="flex flex-col flex-1 items-center px-3 sm:px-4 py-6 sm:py-10">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">
            저장한 레시피
          </h1>
          <Link href="/" className="text-xs sm:text-sm font-medium text-[var(--board-accent)] underline whitespace-nowrap">
            새 추천받기
          </Link>
        </div>

        {loading && <p className="text-[var(--board-text-dim)]">불러오는 중...</p>}
        {error && <p className="text-[var(--board-danger)] text-sm">{error}</p>}
        {!loading && !error && recipes.length === 0 && (
          <p className="text-[var(--board-text-dim)]">아직 저장한 레시피가 없어요.</p>
        )}

        {recipes.length > 0 && !selectionMode && (
          <>
            <p className="text-xs text-[var(--board-text-dim)] mb-3">
              레시피 이름을 누르면 자세히 볼 수 있어요. (휴대폰에서 길게 누르면 여러 개 선택해서 삭제할 수 있어요)
            </p>
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
          </>
        )}

        {selectionMode && (
          <div className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-2 rounded-md border border-dashed border-[var(--board-accent)] bg-[var(--board-surface)] p-3">
            <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={selectedIds.size === recipes.length && recipes.length > 0}
                onChange={toggleSelectAll}
              />
              전체 선택 ({selectedIds.size}/{recipes.length})
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exitSelectionMode}
                className="text-sm px-3 py-1.5 rounded-md border border-dashed border-[var(--board-border)] text-[var(--board-text-dim)]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0 || deleting}
                className="text-sm px-3 py-1.5 rounded-md bg-[var(--board-danger)] text-[var(--foreground)] font-bold disabled:opacity-40"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {recipes.map((recipe) => {
            const isOpen = expandedIds.has(recipe.id);
            const isSelected = selectedIds.has(recipe.id);
            return (
              <div
                key={recipe.id}
                className="rounded-md border border-dashed border-[var(--board-border)] bg-[var(--board-surface)] p-3 sm:p-4"
              >
                {selectionMode ? (
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(recipe.id)}
                      className="shrink-0 w-4 h-4"
                    />
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                      <h2 className="text-base sm:text-lg font-extrabold text-[var(--foreground)] truncate">
                        {recipe.recipe_name}
                      </h2>
                      <span className="text-xs sm:text-sm font-bold bg-[var(--board-accent)] text-[var(--board-accent-ink)] px-2 py-0.5 rounded whitespace-nowrap">
                        {recipe.cook_time}
                      </span>
                    </div>
                  </label>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onPointerDown={() => handlePointerDown(recipe.id)}
                    onPointerUp={cancelPress}
                    onPointerLeave={cancelPress}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={() => handleCardClick(recipe.id)}
                    onKeyDown={(e) => e.key === "Enter" && toggleExpanded(recipe.id)}
                    className="w-full flex items-center justify-between gap-2 text-left select-none"
                    style={{ WebkitTouchCallout: "none" }}
                    aria-expanded={isOpen}
                  >
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-extrabold text-[var(--foreground)] -rotate-[0.4deg] truncate">
                        {recipe.recipe_name}
                      </h2>
                      <p className="text-xs text-[var(--board-text-dim)] truncate">
                        입력한 재료: {recipe.ingredients_input || "없음"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs sm:text-sm font-bold bg-[var(--board-accent)] text-[var(--board-accent-ink)] px-2 py-0.5 rounded rotate-[0.6deg] whitespace-nowrap">
                        {recipe.cook_time}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSingle(recipe.id);
                        }}
                        aria-label="삭제"
                        className="text-[var(--board-danger)] px-1"
                      >
                        🗑
                      </button>
                      <span className="text-[var(--board-text-dim)]">{isOpen ? "▾" : "▸"}</span>
                    </div>
                  </div>
                )}

                {isOpen && !selectionMode && (
                  <div className="mt-3">
                    <IngredientTable
                      title="주재료"
                      items={recipe.main_ingredients}
                      servingsLabel={recipe.servings_requested || "요청 인분"}
                    />
                    <IngredientTable
                      title="양념"
                      items={recipe.seasonings}
                      servingsLabel={recipe.servings_requested || "요청 인분"}
                    />

                    <PrepOrderTable mainIngredients={recipe.main_ingredients} seasonings={recipe.seasonings} />

                    <ol className="list-decimal list-inside text-sm text-[var(--foreground)] flex flex-col gap-2">
                      {(recipe.steps || []).map((step, i) => (
                        <li key={i} className="leading-relaxed">
                          {step.text}
                          <StepTimer
                            minutes={cookingDevice === "induction" ? step.durationMinutesInduction : step.durationMinutesGas}
                          />
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
