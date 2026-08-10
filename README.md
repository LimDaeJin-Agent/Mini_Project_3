https://fridge-recipe-omega.vercel.app

# 🥬 냉장고 파먹기 — AI 레시피 추천

> 상태 확인: [Next.js/Supabase 상태 보기](https://fridge-recipe-omega.vercel.app/api/health) (로그인 없이 누구나 확인 가능)

## 1. 이 서비스는 왜 만들었나요

"오늘 뭐 해먹지?"는 매일 반복되지만 매번 답하기 귀찮은 질문입니다. 냉장고를 열어봐도 뭘 만들 수 있는지 잘 안 떠오르고, 레시피를 검색해도 내가 가진 재료와 딱 맞는 걸 찾기는 어렵습니다.

**냉장고 파먹기**는 이 질문 하나에만 집중한 서비스입니다.

- 재료 관리 앱이 아닙니다 (재고를 등록하고 빼는 기능 없음)
- 레시피 백과사전이 아닙니다 (레시피를 검색해서 찾는 게 아니라, AI가 지금 상황에 맞춰 새로 짜줍니다)
- 대신, **지금 가진 재료 + 지금 날씨 + 지금 쓸 조리기구**를 알려주면 AI가 그 자리에서 요리를 추천하고, 손질법부터 타이머까지 실제로 요리할 때 필요한 정보를 순서대로 짜줍니다.

## 2. 어떻게 동작하나요 (로직 구성)

```
[사용자 입력]                         [외부 서비스]
재료 / 먹고 싶은 요리                       │
조리시간 / 인분 / 조리기구                   │
위치(GPS 또는 직접 입력) ──────────► OpenStreetMap(Nominatim)
                                    → "OO시 OO구 OO동" 주소 확인
                                    │
                                    ► OpenWeatherMap
                                    → 현재 기온·날씨 상태 확인
                                    │
        ▼
[Next.js 서버(API Route)]
재료 + 날씨 + 조리기구 정보를 하나의 프롬프트로 구성
                                    │
                                    ► Google Gemini API
                                    → 정해진 형식(JSON)으로 레시피 생성
                                    │
        ▼
[화면에 표시]                              [Supabase]
요리명 + 추천 이유만 먼저 보여주고   ────►  요청/결과를 검색 이력으로 기록
클릭하면 재료표·손질순서·조리법이 펼쳐짐
                                    │
"저장하기" 클릭 시 ─────────────────►  레시피를 DB에 영구 저장
"저장한 레시피" 화면에서 다시 확인/삭제
```

핵심 규칙 두 가지:

1. **조리기구(가스레인지/인덕션)를 바꿔도 재료·손질법·조리 순서는 항상 동일**하고, 오직 각 단계의 소요 시간만 달라집니다. AI에게 두 조리기구의 시간을 한 번에 같이 요청해서, 매번 다시 물어봐서 생기는 결과 불일치를 원천적으로 막았습니다.
2. **날씨 기반 추천은 재료만 입력했을 때만** 동작합니다. 이때는 요리를 2개로 좁히고, "왜 지금 날씨에 이 요리가 어울리는지" 이유를 한 줄 붙여줍니다. 같은 조건으로 30분 안에 다시 추천을 받으면, 방금 추천받은 메뉴는 제외하고 다른 메뉴를 찾아줍니다.

## 3. 사용 방법

### ① 데스크탑 (PC)

1. 브라우저에서 [https://fridge-recipe-omega.vercel.app](https://fridge-recipe-omega.vercel.app) 접속
2. **가진 재료**를 쉼표로 입력 (예: `계란, 대파, 두부, 김치`)
3. (선택) **먹고 싶은 요리**, **조리 시간**, **인원수** 입력
4. **레시피 추천받기** 클릭 → 메모지가 넘어가는 애니메이션이 나오는 동안 잠시 대기 (마음이 바뀌면 **정지** 버튼으로 취소 가능)
5. 결과는 요리 이름 + 추천 이유만 먼저 보이고, **이름을 클릭하면** 재료표·손질순서·조리법이 펼쳐집니다
6. 각 조리 단계 옆의 **⏱ N분 타이머 시작**을 누르면 실제로 카운트다운되고, 끝나면 알림음이 울립니다
7. 마음에 든 레시피는 **저장하기** 클릭 → 오른쪽 위 **저장한 레시피 보기**에서 언제든 다시 확인
8. **참고**: PC는 GPS 칩이 없어서 "내 위치 날씨" 기능은 IP 기반으로 위치를 추정해 부정확할 수 있습니다. 화면에 "(오차범위 약 XXm)"으로 정확도가 표시되며, 위치가 틀리면 **"위치가 다른가요? 직접 입력"** 을 눌러 지역명을 검색해 고를 수 있습니다.

### ② 모바일 (휴대폰)

기본적인 사용법은 데스크탑과 동일합니다. 아래는 모바일에서만 다르거나 추가되는 부분입니다.

1. 휴대폰 브라우저로 동일한 주소 접속 (같은 배포 주소, 별도 앱 설치 필요 없음)
2. **📍 내 위치 날씨** 버튼을 누르면 처음 한 번 "위치 접근을 허용하시겠습니까?" 팝업이 뜹니다 → **허용**을 눌러야 정확한 위치/날씨가 표시됩니다
   - 실수로 **거부**를 누른 경우, 브라우저가 다시 팝업을 띄워주지 않습니다. 이때는 화면에 뜨는 안내창을 따라 브라우저 설정에서 위치 권한을 직접 "허용"으로 바꿔주세요
   - 휴대폰은 실제 GPS를 사용하므로 PC보다 위치가 훨씬 정확합니다
3. 화면 크기에 맞춰 레이아웃이 자동으로 조정되어 한 손으로도 입력하기 편합니다
4. **저장한 레시피** 화면에서 목록을 **길게(0.5초 이상) 누르면** 선택 모드로 전환되어 체크박스가 나타납니다 → 여러 개 선택 후 상단 **삭제** 버튼으로 한꺼번에 지울 수 있습니다 (하나만 지울 땐 각 항목의 🗑 버튼 사용)

## 4. 주요 기능 요약

- 재료 기반 / 특정 요리 기반 AI 레시피 추천 (Gemini API)
- 위치(GPS·직접 검색) + 실시간 날씨 연동 추천, 30분 내 재추천 시 중복 제외
- 재료를 "1인분 vs 요청 인분"으로 환산, 손질법·초벌 여부·투입 순서 표준화
- 가스레인지/인덕션별 조리 단계 타이머 (음성 안내 + 알림음)
- **손 안 대고 쓰는 음성 비서** — 재료·레시피를 말로 물어보면 읽어주고, "그리고 뭐라고?" 하면 남은 재료만 알려줌 (자세한 내용은 5번 항목)
- 레시피 저장 / 목록 조회 / 개별·다중 삭제 (Supabase)
- 모든 검색 이력 자동 기록 (Supabase `search_history`)
- Next.js·Supabase 상태를 누구나 확인할 수 있는 공개 링크 (`/api/health`)
- 모바일 반응형 레이아웃, 롱프레스 다중 선택, 로딩 애니메이션, 입력창 잠금 등 사용성 보완

## 5. 음성 비서 (핸즈프리 모드)

요리할 때는 손에 재료나 물이 묻어 있어서 화면을 만지기 어렵습니다. 그래서 말을 걸면 알아듣고, 필요한 내용을 음성으로 읽어주는 기능을 넣었습니다. 레시피를 펼친 화면에서 마이크가 항상 켜져 있고, 버튼을 누르지 않아도 말이 끝나면 자동으로 인식합니다.

**할 수 있는 말:**

| 이렇게 말하면 | 이렇게 동작해요 |
|---|---|
| "재료를 불러줘" | 주재료·양념을 하나씩 읽어줘요 |
| "레시피를 알려줘" | 조리 순서를 단계별로 읽어줘요 |
| "그만", "멈춰" | 읽어주는 걸 멈춰요 |
| "처음부터 다시 불러줘" | 처음부터 다시 읽어요 |
| "이어서 불러줘" | 멈췄던 곳부터 계속 읽어요 |
| "두부, 고추장, 그리고 뭐라고?" | 이미 말한 재료(두부, 고추장)는 빼고, **아직 안 넣은 재료만** 읽어줘요 |

조리 단계 타이머를 시작하면 "N분간 가열을 시작합니다" → "1분/30초/10초 남았습니다" → "완료되었습니다"까지 자동으로 음성 안내가 나옵니다.

- **음성 인식**(말의 의도 파악): `gemini-3.1-pro-preview` — 마이크로 녹음된 짧은 발화를 듣고 위 표의 명령 중 무엇인지, 어떤 재료를 언급했는지 판단합니다.
- **음성 생성**(문장을 소리로): `gemini-2.5-pro-preview-tts` — 읽어줄 문장을 오디오로 변환합니다. 자주 나오는 고정 문구(1분/30초/10초 남았습니다 등)는 한 번 만들어서 재사용합니다.
- 마이크 권한을 허용해야 동작하며, 처음 접속하면 브라우저가 권한을 한 번 물어봅니다.
- **알아두시면 좋은 점**: 두 모델 모두 구글의 프리뷰(베타) 모델이라, 음성 생성이 간헐적으로 실패할 수 있습니다 (구글 서버 쪽 이슈로 확인됨, 저희 코드가 자동으로 몇 번 재시도합니다). 실패해도 화면이나 타이머는 정상 작동하고, 그 순간의 음성 안내만 조용히 생략됩니다.

## 6. 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 배포 | Vercel |
| 데이터베이스 | Supabase (PostgreSQL) |
| AI (레시피 추천) | Google Gemini API (`gemini-2.5-flash`) |
| AI (음성 인식/의도 파악) | Google Gemini API (`gemini-3.1-pro-preview`) |
| AI (음성 생성) | Google Gemini API (`gemini-2.5-pro-preview-tts`) |
| 날씨 | OpenWeatherMap |
| 위치/주소 변환 | OpenStreetMap Nominatim |
| 스타일 | Tailwind CSS 4 |

## 7. Supabase 테이블 구조

**recipes** — 저장한 레시피

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| created_at | timestamptz | |
| ingredients_input | text | 입력한 재료 원문 |
| recipe_name | text | 요리명 |
| cook_time | text | 예상 조리시간 |
| servings_requested | text | 요청한 인분 |
| main_ingredients | jsonb | 주재료(양·손질법·초벌·투입순서 포함) |
| seasonings | jsonb | 양념 (위와 동일 구조) |
| steps | jsonb | 조리 단계 (설명, 가스/인덕션별 시간) |
| cooking_device | text | 저장 시점의 조리기구 |

**search_history** — 모든 추천 요청/결과 이력

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| created_at | timestamptz | |
| ingredients_input | text | |
| desired_dish | text | |
| weather_condition / weather_temp / weather_location | text/integer/text | 날씨 기반 추천일 때만 값 존재 |
| results | jsonb | 추천된 요리명·이유·조리시간 목록 |

**status_checks** — `/api/health` 호출 이력

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| created_at | timestamptz | |
| nextjs_ok | boolean | |
| supabase_ok | boolean | |
| supabase_error | text | 실패 시 에러 메시지 |

## 8. 로그·데이터는 이 저장소(파일)에 있나요?

**아니요. 이 Git 저장소에는 실제 로그나 데이터가 저장되지 않습니다.** 저장소에는 "코드"만 커밋되고, 로그와 실제 데이터는 각각 아래처럼 외부 서비스에 따로 쌓입니다.

- **Next.js 로그** (`console.error` 등 실행 중 남기는 기록)
  - **배포본(Vercel)**: 저장소 파일이 아니라 **Vercel 대시보드 → 프로젝트(fridge-recipe) → Logs 탭**에서 확인합니다. (`vercel logs <배포주소>` 명령으로도 확인 가능)
  - **로컬 개발 중**: `npm run dev` 실행 시 `.next/dev/logs/next-development.log`에 임시로 쌓이지만, `.next/` 폴더는 `.gitignore`에 포함돼 있어 **커밋되지 않습니다** (매번 새로 생성되는 캐시/빌드 산물이라서요).
- **실제 데이터** (저장한 레시피, 검색 이력, 상태 확인 기록)
  - 저장소 안의 어떤 파일에도 들어있지 않고, **Supabase가 관리하는 클라우드 PostgreSQL DB**에 저장됩니다.
  - 저장소에는 "DB에 어떻게 연결하는지"(`lib/supabaseClient.js`)와 "테이블을 어떻게 만드는지"(이 문서 6번 항목의 SQL)만 코드/문서로 있을 뿐, 실제 값(행 데이터)은 전혀 커밋되지 않습니다.
  - 데이터를 직접 보려면 **Supabase 대시보드 → Table Editor → `recipes` / `search_history` / `status_checks`** 테이블을 클릭하면 됩니다.

## 9. 로컬에서 실행하기

```bash
npm install
cp .env.local.example .env.local   # 아래 키 입력
npm run dev
```

`.env.local`에 필요한 값:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
OPENWEATHER_API_KEY=
```

Supabase에는 위 3개 테이블과, 아래처럼 공개 읽기/쓰기 정책이 필요합니다 (테이블마다 동일하게 적용).

```sql
alter table recipes enable row level security;
create policy "Public read/write for recipes" on recipes for all using (true) with check (true);
```

## 10. 프로젝트 구조

```
app/
  layout.js                    # 전체 레이아웃 (음성 비서 Provider 포함)
  page.js                     # 홈: 재료 입력 + 위치/날씨 + 추천 결과
  history/page.js              # 저장한 레시피 목록 (펼치기/삭제)
  api/recommend/route.js       # Gemini 호출 + 검색 이력 기록
  api/recipes/route.js         # 레시피 저장/목록 조회
  api/recipes/[id]/route.js    # 레시피 개별 삭제
  api/weather/route.js         # 날씨 조회 (+ 위치명 역지오코딩)
  api/geocode/route.js         # 지역명으로 위치 검색
  api/health/route.js          # 서비스 상태 확인
  api/tts/route.js             # 문장 → 음성(WAV) 변환
  api/voice-command/route.js   # 음성 → 명령 의도 파악
components/
  IngredientTable.js           # 주재료/양념 표
  PrepOrderTable.js             # 손질·투입 순서 표
  StepTimer.js                  # 조리 단계 타이머 (음성 안내 포함)
  FridgeLoader.js                # 냉장고 문 여는 로딩 애니메이션
  NotepadLoader.js                # 메모지 넘기는 로딩 애니메이션
  Providers.js                    # 음성 비서 Context Provider 래퍼
  VoiceAssistant.js               # 상시 듣기 + 음성 명령 처리 (화면에 안 보이는 백그라운드 컴포넌트)
hooks/
  useSequentialReader.js         # 문장을 순서대로 읽어주는 재생 큐
lib/
  supabaseClient.js
  VoiceContext.js                # "지금 펼쳐본 레시피" 공유 상태
  ttsPlayer.js                    # 음성 재생/캐싱 유틸
  wav.js                          # PCM → WAV 변환 유틸
  geo.js                        # 위치명 조합 유틸
```
