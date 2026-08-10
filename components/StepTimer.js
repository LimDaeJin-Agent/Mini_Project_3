"use client";

import { useEffect, useRef, useState } from "react";
import { playText, prefetch } from "@/lib/ttsPlayer";

const FIXED_ANNOUNCEMENTS = ["1분 남았습니다.", "30초 남았습니다.", "10초 남았습니다.", "완료되었습니다."];

if (typeof window !== "undefined") {
  FIXED_ANNOUNCEMENTS.forEach((text) => prefetch(text));
}

function playAlarm() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      const start = now + i * 0.4;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    }
  } catch (err) {
    // 브라우저가 오디오를 지원하지 않으면 조용히 무시
  }
}

export default function StepTimer({ minutes }) {
  const [remaining, setRemaining] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  function start() {
    clearInterval(intervalRef.current);
    setDone(false);
    setRunning(true);
    setRemaining(minutes * 60);
    playText(`${minutes}분간 가열을 시작합니다.`);

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next === 60 || next === 30 || next === 10) {
          playText(`${next === 60 ? "1분" : next + "초"} 남았습니다.`);
        }
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setDone(true);
          playAlarm();
          playText("완료되었습니다.");
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  function reset() {
    clearInterval(intervalRef.current);
    setRunning(false);
    setDone(false);
    setRemaining(minutes * 60);
  }

  if (!minutes || minutes <= 0) return null;

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <span className="inline-flex items-center gap-2 ml-1 align-middle">
      {!running && !done && (
        <button
          type="button"
          onClick={start}
          className="text-xs rounded-md border border-[var(--board-accent)] text-[var(--board-accent)] px-2 py-0.5 whitespace-nowrap font-medium"
        >
          ⏱ {minutes}분 타이머 시작
        </button>
      )}
      {running && (
        <>
          <span className="text-xs font-mono font-bold text-[var(--board-accent)]">
            {mm}:{ss}
          </span>
          <button type="button" onClick={reset} className="text-xs underline text-[var(--board-text-dim)]">
            취소
          </button>
        </>
      )}
      {done && (
        <>
          <span className="text-xs font-semibold text-[var(--board-success)]">✅ 완료!</span>
          <button type="button" onClick={start} className="text-xs underline text-[var(--board-text-dim)]">
            다시
          </button>
        </>
      )}
    </span>
  );
}
