"use client";

import { useCallback, useRef, useState } from "react";
import { playText } from "@/lib/ttsPlayer";

export function useSequentialReader() {
  const queueRef = useRef([]);
  const indexRef = useRef(0);
  const controllerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playFrom = useCallback((i) => {
    const queue = queueRef.current;
    if (i < 0 || i >= queue.length) {
      setIsPlaying(false);
      return;
    }
    indexRef.current = i;
    setIsPlaying(true);
    controllerRef.current = playText(queue[i], {
      onEnd: () => playFrom(i + 1),
    });
  }, []);

  const play = useCallback(
    (chunks) => {
      controllerRef.current?.stop();
      queueRef.current = chunks || [];
      playFrom(0);
    },
    [playFrom]
  );

  const pause = useCallback(() => {
    controllerRef.current?.stop();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    playFrom(indexRef.current);
  }, [playFrom]);

  const restart = useCallback(() => {
    playFrom(0);
  }, [playFrom]);

  return { play, pause, resume, restart, isPlaying };
}
