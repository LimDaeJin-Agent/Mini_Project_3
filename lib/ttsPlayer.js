const cache = new Map();

async function getAudioSrc(text) {
  if (cache.has(text)) return cache.get(text);
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const src = `data:${data.mimeType};base64,${data.audio}`;
  cache.set(text, src);
  return src;
}

export async function prefetch(text) {
  try {
    await getAudioSrc(text);
  } catch {
    // 프리페치 실패는 조용히 무시 (필요할 때 다시 시도됨)
  }
}

export function playText(text, { onEnd } = {}) {
  const audioEl = new Audio();
  let cancelled = false;

  const promise = getAudioSrc(text)
    .then((src) => {
      if (cancelled) return;
      audioEl.src = src;
      return new Promise((resolve) => {
        audioEl.onended = () => {
          onEnd?.();
          resolve();
        };
        audioEl.onerror = () => resolve();
        audioEl.play().catch(() => resolve());
      });
    })
    .catch(() => {});

  return {
    audioEl,
    promise,
    stop() {
      cancelled = true;
      try {
        audioEl.pause();
      } catch {
        // no-op
      }
    },
  };
}
