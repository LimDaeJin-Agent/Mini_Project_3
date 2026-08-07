https://fridge-recipe-omega.vercel.app

# 🥬 냉장고 파먹기 — AI 레시피 추천

냉장고에 있는 재료(또는 먹고 싶은 요리 이름)를 입력하면, Gemini AI가 실제로 만들 수 있는 요리와 조리법을 추천해주는 웹 서비스입니다. "화면 3개짜리를 확실히 완성한다"는 목표로, 재료 관리 앱이 아니라 **"오늘 뭐 해먹지"라는 질문 하나를 잘 풀어주는 것**에 집중했습니다.

## 배포

- **서비스 주소**: https://fridge-recipe-omega.vercel.app
- 로그인 없이 누구나 바로 사용할 수 있습니다.

## 무엇을 하는 서비스인가요

1. 냉장고에 있는 재료를 쉼표로 입력합니다. (예: `계란, 대파, 두부, 김치`)
2. 특정 요리가 먹고 싶다면 요리 이름도 함께 입력할 수 있습니다. (예: `김치찌개`)
3. 조리 시간, 인원수, 사용할 가스레인지/인덕션 여부를 선택하면 AI가 그에 맞춰 레시피를 추천합니다.
4. 추천받은 레시피는 재료·양념을 "1인분 기준"과 "요청한 인분 기준"으로 나눠 보여주고, 손질 방법·초벌 여부·냄비에 들어가는 순서까지 표로 정리해줍니다.
5. 조리 단계별로 타이머를 눌러 실제로 시간을 재며 요리할 수 있고, 다 되면 알림음이 울립니다.
6. 마음에 드는 레시피는 저장할 수 있고, "저장한 레시피" 화면에서 언제든 다시 꺼내볼 수 있습니다.

## AI 기능 (REQ-02)

Gemini API(`gemini-2.5-flash`)에 사용자의 재료·요청 인분·조리기구 정보를 담은 프롬프트를 보내고, `responseSchema`로 구조화된 JSON을 강제로 받습니다. 응답에는 다음이 포함됩니다.

- 요리명, 예상 조리시간
- 주재료 / 양념 목록 (1인분 기준량, 요청 인분 기준량, 보유 여부)
- 재료별 손질 방법(써는 모양), 초벌 여부, 냄비에 들어가는 순서
- 조리 단계별 설명 + 가스레인지 기준/인덕션 기준 소요 시간(분)

가스레인지와 인덕션 시간을 **한 번의 호출로 동시에** 받아오도록 설계해서, 조리기구를 바꿔도 재료 구성이나 조리 순서는 항상 동일하고 시간만 달라집니다.

## 데이터 저장 (REQ-03)

Supabase(PostgreSQL) `recipes` 테이블에 저장합니다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| created_at | timestamptz | |
| ingredients_input | text | 사용자가 입력한 재료 원문 |
| recipe_name | text | 요리명 |
| cook_time | text | 예상 조리시간 |
| servings_requested | text | 요청한 인분 |
| main_ingredients | jsonb | 주재료 배열 (양, 손질법, 초벌 여부, 투입 순서 포함) |
| seasonings | jsonb | 양념 배열 (위와 동일 구조) |
| steps | jsonb | 조리 단계 배열 (설명, 가스/인덕션별 소요 시간) |
| cooking_device | text | 저장 시점에 보고 있던 조리기구 |

새로고침해도 저장한 레시피 목록은 유지되며, 목록에서 이름을 눌러 펼쳐보거나 개별/다중 삭제할 수 있습니다.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router, Turbopack)
- **배포**: Vercel
- **데이터베이스**: Supabase
- **AI**: Google Gemini API (`@google/genai`)
- **스타일**: Tailwind CSS 4

## 최소한의 사용성 (REQ-05)

- 첫 화면에 "무엇을 입력해야 하는지"를 안내 문구로 바로 보여줍니다.
- 재료와 먹고 싶은 요리가 모두 비어 있으면 API를 호출하지 않고 안내 메시지만 표시합니다.
- AI 호출이 실패하거나 네트워크 오류가 나도 에러 메시지만 뜨고 화면이 깨지지 않습니다.
- 추천을 기다리는 동안 냉장고 문이 열리는 애니메이션과 "정지" 버튼을 제공하고, 입력창은 잠겨서 값이 바뀌지 않습니다.
- 모바일 화면 크기에 맞춰 레이아웃이 자동으로 조정됩니다.

## 로컬에서 실행하기

```bash
npm install
cp .env.local.example .env.local   # Supabase / Gemini 키 입력
npm run dev
```

`.env.local`에 필요한 값:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

Supabase 프로젝트에는 `recipes` 테이블(위 스키마)과, 아래 RLS 정책이 필요합니다.

```sql
alter table recipes enable row level security;

create policy "Public read/write for recipes"
  on recipes for all
  using (true)
  with check (true);
```

## 프로젝트 구조

```
app/
  page.js              # 홈: 재료 입력 + 추천 결과
  history/page.js       # 저장한 레시피 목록
  api/recommend/route.js  # Gemini 호출
  api/recipes/route.js    # 저장/목록 조회
  api/recipes/[id]/route.js # 개별 삭제
components/
  IngredientTable.js    # 주재료/양념 표
  PrepOrderTable.js      # 손질·투입 순서 표
  StepTimer.js           # 조리 단계 타이머
  FridgeLoader.js         # 냉장고 문 여는 로딩 애니메이션
  NotepadLoader.js         # 메모지 넘기는 로딩 애니메이션
lib/
  supabaseClient.js
```
