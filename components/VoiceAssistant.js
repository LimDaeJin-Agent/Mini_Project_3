"use client";

import { useEffect, useRef, useState } from "react";
import { useVoiceContext } from "@/lib/VoiceContext";
import { useSequentialReader } from "@/hooks/useSequentialReader";

const SILENCE_MS = 800;
const VOLUME_THRESHOLD = 0.02;
const MAX_RECORD_MS = 10000;
const MIN_RECORD_MS = 300;

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onloadend = () => resolve(String(fileReader.result).split(",")[1]);
    fileReader.onerror = reject;
    fileReader.readAsDataURL(blob);
  });
}

export default function VoiceAssistant() {
  const voice = useVoiceContext();
  const reader = useSequentialReader();
  const [status, setStatus] = useState("init"); // init | listening | error
  const [error, setError] = useState("");

  const stateRef = useRef({ recording: false, silenceStart: null, recordStart: null });
  const mediaRef = useRef({ stream: null, audioCtx: null, analyser: null, recorder: null, rafId: null });
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaRef.current.stream = stream;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        mediaRef.current.audioCtx = audioCtx;
        mediaRef.current.analyser = analyser;
        setStatus("listening");
        loop();
      } catch (err) {
        setStatus("error");
        setError("마이크 권한이 필요해요.");
      }
    }

    function loop() {
      const { analyser } = mediaRef.current;
      if (!analyser) return;
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / data.length);
      handleVolume(rms);
      mediaRef.current.rafId = requestAnimationFrame(loop);
    }

    function handleVolume(rms) {
      const st = stateRef.current;
      const now = Date.now();
      const speaking = rms > VOLUME_THRESHOLD;

      if (!st.recording) {
        if (speaking) startRecording();
        return;
      }

      if (speaking) {
        st.silenceStart = null;
      } else {
        if (!st.silenceStart) st.silenceStart = now;
        if (now - st.silenceStart > SILENCE_MS) {
          stopRecording();
          return;
        }
      }
      if (now - st.recordStart > MAX_RECORD_MS) {
        stopRecording();
      }
    }

    function startRecording() {
      const { stream } = mediaRef.current;
      if (!stream) return;
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => onRecordingComplete(chunks, recorder.mimeType);
      recorder.start();
      mediaRef.current.recorder = recorder;
      stateRef.current.recording = true;
      stateRef.current.silenceStart = null;
      stateRef.current.recordStart = Date.now();
    }

    function stopRecording() {
      const st = stateRef.current;
      if (!st.recording) return;
      st.recording = false;
      try {
        mediaRef.current.recorder?.stop();
      } catch {
        // no-op
      }
    }

    async function onRecordingComplete(chunks, mimeType) {
      const duration = Date.now() - (stateRef.current.recordStart || 0);
      if (duration < MIN_RECORD_MS || chunks.length === 0) return;
      const blob = new Blob(chunks, { type: mimeType });
      try {
        const base64 = await blobToBase64(blob);
        const res = await fetch("/api/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: base64,
            mimeType,
            ingredientNames: voiceRef.current?.getIngredientNames() || [],
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return;
        handleIntent(data);
      } catch {
        // 음성 인식 실패는 조용히 무시하고 계속 듣기
      }
    }

    function handleIntent(data) {
      const ctx = voiceRef.current;
      if (!ctx || !ctx.activeRecipe) return;
      const recipe = ctx.activeRecipe;

      switch (data.intent) {
        case "read_ingredients": {
          const items = ctx.getIngredientItems();
          const chunks = items.map((i) => `${i.name} ${i.amountForRequestedServings}`);
          reader.play(chunks.length ? chunks : ["재료 목록이 없어요."]);
          break;
        }
        case "read_recipe": {
          const chunks = (recipe.steps || []).map((s) => s.text);
          reader.play(chunks.length ? chunks : ["조리 순서가 없어요."]);
          break;
        }
        case "pause":
          reader.pause();
          break;
        case "resume":
          reader.resume();
          break;
        case "restart":
          reader.restart();
          break;
        case "mentioned_ingredients": {
          ctx.markMentioned(data.mentionedIngredients || []);
          const remaining = ctx.getRemainingIngredientItems();
          const chunks = remaining.map((i) => `${i.name} ${i.amountForRequestedServings}`);
          reader.play(chunks.length ? chunks : ["다 넣으셨어요."]);
          break;
        }
        default:
          break;
      }
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(mediaRef.current.rafId);
      mediaRef.current.stream?.getTracks().forEach((t) => t.stop());
      mediaRef.current.audioCtx?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 11, opacity: 0.6, zIndex: 40 }}>
      {status === "listening" && "🎙️ 듣는 중"}
      {status === "error" && error}
    </div>
  );
}
