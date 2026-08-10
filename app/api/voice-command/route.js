import { GoogleGenAI, Type } from "@google/genai";

const COMMAND_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING, description: "음성을 그대로 받아적은 텍스트" },
    intent: {
      type: Type.STRING,
      enum: [
        "read_ingredients",
        "read_recipe",
        "pause",
        "restart",
        "resume",
        "mentioned_ingredients",
        "unknown",
      ],
      description:
        "read_ingredients: 재료를 불러달라는 요청 / read_recipe: 레시피(조리법)를 알려달라는 요청 / " +
        "pause: 그만·멈춰·일시정지 요청 / restart: 처음부터 다시 불러달라는 요청 / resume: 이어서 불러달라는 요청 / " +
        "mentioned_ingredients: 사용자가 재료 이름을 말하면서 나머지를 물어보는 경우(예: '두부, 고추장, 그리고 뭐라고?') / " +
        "unknown: 위 어느 것에도 해당하지 않음",
    },
    mentionedIngredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "intent가 mentioned_ingredients일 때, 음성에서 언급된 재료를 주어진 재료 목록의 정확한 이름으로 매칭해서 담기. 그 외에는 빈 배열.",
    },
  },
  required: ["transcript", "intent", "mentionedIngredients"],
};

export async function POST(request) {
  const { audio, mimeType, ingredientNames } = await request.json();

  if (!audio) {
    return Response.json({ error: "음성 데이터가 없습니다." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  const ingredientList = (ingredientNames || []).join(", ") || "(재료 목록 없음)";

  const prompt = `당신은 요리 중인 사용자를 돕는 음성 비서입니다. 아래 음성을 듣고 사용자의 의도를 파악하세요.

이 요리에 필요한 전체 재료 목록: ${ingredientList}

사용자가 할 수 있는 말과 의도:
- "재료를 불러줘" 류 → read_ingredients
- "레시피를 알려줘", "조리법 알려줘" 류 → read_recipe
- "그만", "멈춰", "잠깐" 류 → pause
- "처음부터 다시 불러줘" 류 → restart
- "이어서 불러줘", "계속해줘" 류 → resume
- 재료 이름을 나열하면서 나머지를 물어보는 경우 (예: "두부, 고추장, 그리고 뭐라고?", "두부랑 고추장 넣었고 또 뭐 있지?") → mentioned_ingredients. 이때 언급된 재료는 위 재료 목록에 있는 정확한 이름으로 매칭해서 mentionedIngredients에 담아주세요. 목록에 없는 재료는 무시하세요.
- 위에 해당하지 않으면 → unknown`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType || "audio/webm", data: audio } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: COMMAND_SCHEMA,
      },
    });

    const parsed = JSON.parse(response.text);
    return Response.json(parsed);
  } catch (error) {
    console.error("Voice command error:", error);
    return Response.json({ error: "음성을 이해하지 못했습니다." }, { status: 502 });
  }
}
