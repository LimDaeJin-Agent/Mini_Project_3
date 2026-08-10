"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
  const [activeRecipe, setActiveRecipeState] = useState(null);
  const mentionedRef = useRef(new Set());

  const setActiveRecipe = useCallback((recipe) => {
    mentionedRef.current = new Set();
    setActiveRecipeState(recipe);
  }, []);

  const getIngredientItems = useCallback(() => {
    if (!activeRecipe) return [];
    return [...(activeRecipe.mainIngredients || []), ...(activeRecipe.seasonings || [])];
  }, [activeRecipe]);

  const getIngredientNames = useCallback(
    () => getIngredientItems().map((i) => i.name),
    [getIngredientItems]
  );

  const markMentioned = useCallback((names) => {
    (names || []).forEach((n) => mentionedRef.current.add(n));
  }, []);

  const getRemainingIngredientItems = useCallback(
    () => getIngredientItems().filter((i) => !mentionedRef.current.has(i.name)),
    [getIngredientItems]
  );

  return (
    <VoiceContext.Provider
      value={{
        activeRecipe,
        setActiveRecipe,
        getIngredientItems,
        getIngredientNames,
        markMentioned,
        getRemainingIngredientItems,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoiceContext() {
  return useContext(VoiceContext);
}
