import { GoogleGenAI } from "@google/genai";
import { pcmToWav } from "@/lib/wav";

const MAX_ATTEMPTS = 3;

async function generateSpeech(ai, text, voice) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || "Kore" } },
      },
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (!part?.inlineData?.data) {
    throw new Error("음성 데이터가 비어 있습니다.");
  }
  return part;
}

export async function POST(request) {
  const { text, voice } = await request.json();

  if (!text || !text.trim()) {
    return Response.json({ error: "읽을 텍스트가 없습니다." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const part = await generateSpeech(ai, text, voice);
      const pcm = Buffer.from(part.inlineData.data, "base64");
      const rateMatch = /rate=(\d+)/.exec(part.inlineData.mimeType || "");
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      const wav = pcmToWav(pcm, sampleRate);

      return Response.json({ audio: wav.toString("base64"), mimeType: "audio/wav" });
    } catch (error) {
      lastError = error;
      console.error(`TTS attempt ${attempt} failed:`, error.message);
    }
  }

  console.error("TTS error (all attempts failed):", lastError);
  return Response.json({ error: "음성을 생성하지 못했습니다." }, { status: 502 });
}
