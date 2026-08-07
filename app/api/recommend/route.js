import { GoogleGenAI, Type } from "@google/genai";

const INGREDIENT_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "재료 이름 (예: 두부, 고춧가루)" },
    amountPerServing: {
      type: Type.STRING,
      description: "1인분 기준 필요한 양. 단위 포함 (예: '100g', '1큰술', '1/2개')",
    },
    amountForRequestedServings: {
      type: Type.STRING,
      description: "사용자가 요청한 인분 기준 필요한 양. 단순 비례가 아니라 실제 조리 기준으로 자연스럽게 조정한 값.",
    },
    owned: {
      type: Type.BOOLEAN,
      description: "사용자가 가진 재료 목록에 이미 포함되어 있으면 true, 추가로 사야 하면 false",
    },
    prepMethod: {
      type: Type.STRING,
      description: "이 재료의 손질/써는 방법 (예: '1.5cm 두께로 슬라이스', '채썰기', '어슷썰기', '다지기'). 손질이 필요 없으면 '손질 불필요'.",
    },
    preSeared: {
      type: Type.BOOLEAN,
      description: "다른 재료와 합치기 전에 이 재료만 먼저 굽거나 데치는 등 초벌 조리를 하면 true, 아니면 false.",
    },
    addOrder: {
      type: Type.INTEGER,
      description: "냄비/팬에 넣는 순서. 1부터 시작하는 정수이며, 동시에 넣는 재료는 같은 숫자를 사용.",
    },
  },
  required: ["name", "amountPerServing", "amountForRequestedServings", "owned", "prepMethod", "preSeared", "addOrder"],
};

const STEP_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "이 단계에서 해야 할 행동 설명" },
    durationMinutesGas: {
      type: Type.INTEGER,
      description: "가스레인지 기준, 이 단계를 실제로 몇 분간 가열/조리해야 하는지(정수). 타이머가 필요 없으면 0.",
    },
    durationMinutesInduction: {
      type: Type.INTEGER,
      description: "인덕션 기준, 이 단계를 실제로 몇 분간 가열/조리해야 하는지(정수). 타이머가 필요 없으면 0.",
    },
  },
  required: ["text", "durationMinutesGas", "durationMinutesInduction"],
};

const RECIPE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    recipes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          cookTime: { type: Type.STRING },
          servingsRequested: { type: Type.STRING, description: "사용자가 요청한 인분 표시 (예: '2인분')" },
          reason: {
            type: Type.STRING,
            description: "날씨 기반 추천일 때만 왜 지금 날씨에 이 요리가 어울리는지 한 줄로 설명. 날씨 기반이 아니면 빈 문자열.",
          },
          mainIngredients: { type: Type.ARRAY, items: INGREDIENT_ITEM_SCHEMA },
          seasonings: { type: Type.ARRAY, items: INGREDIENT_ITEM_SCHEMA },
          steps: { type: Type.ARRAY, items: STEP_SCHEMA },
        },
        required: ["name", "cookTime", "servingsRequested", "reason", "mainIngredients", "seasonings", "steps"],
      },
    },
  },
  required: ["recipes"],
};

function buildPrompt({ ingredients, desiredDish, cookTime, servings, weather, excludeDishes }) {
  const servingsLabel = (servings && servings.trim()) || "1인분";

  const common = `희망 조리시간: ${cookTime || "상관없음"}
요청한 인분: ${servingsLabel}

모든 요리는 다른 요리를 물어보더라도 항상 아래와 같은 고정된 형식과 기준으로 답변하세요:

[재료 - mainIngredients, seasonings 공통]
- 재료는 주재료(mainIngredients)와 양념(seasonings)으로 구분해주세요.
- 각 재료마다 "1인분 기준 양(amountPerServing)"과 "요청한 인분(${servingsLabel}) 기준 양(amountForRequestedServings)"을 g, ml, 큰술, 개 등 적절한 단위로 표시해주세요. 인분 기준 양은 단순 비례가 아니라 소금/향신료처럼 인분에 비례하지 않는 재료는 실제 요리 상식에 맞게 자연스럽게 조정해주세요.
- 사용자가 가진 재료 목록에 있는 항목은 owned:true, 없어서 추가로 사야 하는 항목은 owned:false로 표시해주세요.
- 모든 재료에 대해 prepMethod(손질/써는 모양)를 구체적으로 적어주세요. 손질이 필요 없으면 "손질 불필요"라고 적어주세요. 절대 생략하지 마세요.
- 모든 재료에 대해 preSeared(다른 재료와 합치기 전에 따로 굽거나 데치는 초벌 조리를 하는지)를 true/false로 표시해주세요.
- 모든 재료에 대해 addOrder(냄비/팬에 들어가는 순서, 1부터 시작하는 정수)를 표시해주세요. 함께 넣는 재료는 같은 숫자를 쓰세요.

[조리 순서 - steps]
- steps는 addOrder 순서와 일치하게, 재료가 실제로 냄비/팬에 들어가는 순서대로 작성해주세요.
- 각 단계는 하나의 동작으로 잘게 나눠주세요. 예: "고기를 넣고 볶는다", "야채를 추가하고 볶는다", "춘장을 넣고 볶는다", "물을 붓고 끓인다".
- 재료 손질, 양념장 섞기, 그릇에 담기처럼 불 위에서 시간을 잴 필요가 없는 단계는 durationMinutesGas와 durationMinutesInduction을 모두 0으로 해주세요.
- 불 위에서 조리하는 단계는 durationMinutesGas(가스레인지 기준 분)와 durationMinutesInduction(인덕션 기준 분)을 각각 정수로 알려주세요. 인덕션은 화력이 강하고 일정하게 유지되고, 가스레인지는 불꽃 조절과 예열 특성이 달라 시간이 다를 수 있다는 점을 반영해서 두 값을 정하되, 재료 구성/손질법/조리 순서 자체는 조리기구와 무관하게 항상 동일하게 유지하세요.
- reason 필드는 날씨 기반 추천일 때만 한 줄로 채우고, 그 외에는 빈 문자열("")로 두세요.`;

  const excludeLine =
    excludeDishes && excludeDishes.length > 0
      ? `\n다음 요리는 최근 30분 이내에 이미 추천했으니 절대 다시 추천하지 말고 다른 요리로 골라주세요: ${excludeDishes.join(", ")}`
      : "";

  if (desiredDish && desiredDish.trim()) {
    return `당신은 한국 가정식 요리 전문가입니다.
사용자가 만들고 싶은 요리: "${desiredDish}"
사용자가 가진 재료: ${ingredients || "없음"}

위 요리 1개에 대해서만, 가진 재료를 최대한 활용해서 만드는 방법을 알려주세요.
recipes 배열에는 이 요리 1개만 담아주세요.
${common}`;
  }

  if (weather && weather.condition) {
    return `당신은 한국 가정식 요리 전문가입니다.
사용자가 가진 재료: ${ingredients}
현재 날씨: ${weather.locationName || ""} 기온 ${weather.temp}°C, ${weather.description || weather.condition}

가진 재료와 현재 날씨를 함께 고려해서 지금 먹기 좋은 요리를 정확히 2개 추천해주세요.
각 요리의 reason에는 "왜 지금 날씨에 이 요리가 어울리는지"를 한 줄로 설명해주세요 (예: "쌀쌀한 날씨엔 뜨끈한 국물이 생각나서 추천해요").${excludeLine}
${common}`;
  }

  return `당신은 한국 가정식 요리 전문가입니다.
다음 재료로 만들 수 있는 요리를 2~3개 추천해주세요.
재료: ${ingredients}${excludeLine}
${common}`;
}

export async function POST(request) {
  const { ingredients, desiredDish, cookTime, servings, weather, excludeDishes } = await request.json();

  const hasIngredients = ingredients && ingredients.trim();
  const hasDesiredDish = desiredDish && desiredDish.trim();

  if (!hasIngredients && !hasDesiredDish) {
    return Response.json(
      { error: "가진 재료 또는 먹고 싶은 요리 중 하나는 입력해주세요." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const prompt = buildPrompt({ ingredients, desiredDish, cookTime, servings, weather, excludeDishes });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RECIPE_SCHEMA,
      },
    });

    const parsed = JSON.parse(response.text);
    return Response.json(parsed);
  } catch (error) {
    console.error("Gemini recommend error:", error);
    return Response.json(
      { error: "AI 추천을 받아오지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }
}
