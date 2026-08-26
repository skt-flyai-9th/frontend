# Reals — 작업 규약

40~60대 자영업자(사장님)가 매장 숏폼을 만드는 Expo/React Native 앱입니다.
읽는 사람이 아니라 **쓰는 사람**을 위한 문서입니다. 여기 적힌 건 전부 한 번 이상
실제로 틀렸던 것들입니다.

---

## 0. 30초 요약

| | |
|---|---|
| 작업 위치 | **`frontend/` 안에서만.** 바깥 `reals-app/` 루트는 08-24 스냅샷(git 없음) |
| 디자인 기준 | `../Reals_V4.html` (시안 V4). 값 명세는 `DESIGN.md` |
| 제1규칙 | **없는 데이터를 지어내지 않는다 / 저장은 상태를 실제로 바꾼다** |
| 검증 | `npx tsc --noEmit` → 빌드 → 캡처 비교. **% 말고 pt 로 잰다** |
| 값 | 화면에 숫자를 직접 쓰지 말고 `src/design/theme.ts` 토큰. 덮을 땐 근거 주석 |

---

## 1. 저장소

작업은 **`reals-app/frontend/`** 안에서만 합니다. git 저장소도 커밋도 여기입니다.

바깥 `reals-app/` 루트의 `src/`·`App.tsx` 는 **2026-08-24 스냅샷이고 git 이 없습니다.**
지워진 화면 26개가 그대로 남아 있어 최신처럼 보이지만 아닙니다. 거기서 파일을 열면
"아직 안 지웠나" 로 오독하게 됩니다.

---

## 2. 제1규칙 — 두 가지

### 가짜 데이터 금지
데이터가 없으면 **영역은 복원하되 값은 비웁니다** — `—`, "집계 준비 중", skeleton.
시안에 숫자가 그려져 있다고 목업 값을 지어내지 마세요. API 에 필드가 없으면
`BE_전달사항.md` 에 질문으로 남깁니다.

지금 이 규칙 때문에 시안과 일부러 다른 곳:
- 마이페이지 `Views` 가 `—` (계정 단위 누적 조회수 API 없음)
- 설정 플랜 줄이 "월 3편까지 만들 수 있어요" (이번 달 사용량 API 없음)
- 플랜 "Pro로 업그레이드" 가 비활성 + 이유 표시 (결제·플랜 API 없음)
- 알림 안내 문구가 단정형이 아님 (`expo-notifications` 가 없어 권한 상태를 못 읽음)
- 내보내기 다운로드·공유 버튼이 15.1 파일 없으면 **비활성** (없는 파일은 저장·공유가 실패함)
- 내보내기 음원 카드는 `publish_kit.track` 이 있을 때만 표시 (곡명·구간을 지어내지 않음)
- 내보내기 AI 게시글 제목은 caption 첫 줄을 자른 것 (15.1 에 제목 필드가 없음)
- 설정 목록이 **4개** — 시안 5번째 "상태·오류 화면 (리뷰용)" 은 26_states 라 구현 대상이 아니고,
  그 자리를 다른 항목으로 메우지 않았습니다

반대로, **자리표시자를 진짜로 만든 사례**도 있습니다 — 매장 등록 지도는 시안이
격자 그림이었지만 사장님이 자기 가게 위치를 확인하는 자리라, 2.1 이 준 좌표로
실제 OpenStreetMap 타일을 깝니다(`src/ui/MapPreview.tsx`).
내보내기 미리보기도 같은 이유로 **실제 영상**입니다 — 회색 상자만 보여주면 뭐가 만들어졌는지
모르고 올립니다. 명세 14.2 가 `preview_video_url` 을 주는 이유가 그것입니다.

**왜:** 사장님이 화면의 값을 믿고 행동합니다. 자리를 채우려고 만든 값이 그대로
의사결정 근거가 됩니다.

### 저장은 상태를 실제로 바꾼다
mock 도 서버 상태를 실제로 갱신해야 합니다. mock 업로드가 가짜 응답만 돌려주는 바람에
촬영이 무한 반복된 적이 있습니다 (`docs/버그분석_2026-08-24.md` §2).

---

## 2-1. 🔴 출시 전 반드시

`src/domains/auth/screens/TermsScreen.tsx` 의 `LEGAL_SECTIONS` 와 `EFFECTIVE_DATE` 는
**시안 목업이며 실제 약관이 아닙니다.** 27_이용약관·28_약관·정책 두 화면이 이 상수를 씁니다.

명세 1.1 `terms` 는 제목 목록(version·required·optional)만 주고 전문을 주지 않아
서버에서 받을 방법이 지금 없습니다. **법무 확정본으로 반드시 교체해야 합니다.**
화면 구조는 그대로 두고 상수만 갈아끼우면 되게 만들어 뒀습니다.

---

## 3. 서버 · mock

- 실서버 `https://sarils.p-e.kr` — `app.json` 의 `extra.mockDomains: []` 라 **전 도메인 실연동**
- 서버에 아직 없는 5개 경로만 mock: `/quiz-questions` `/quiz-answers`
  `/quiz-alternatives` `/evaluate` `/evaluation` (`SERVER_MISSING_SUFFIXES`)
- 디자인 QA 캡처용 전체 mock 스위치: `EXPO_PUBLIC_FORCE_MOCK=1`
- `EXPO_PUBLIC_QA_NAV=1` 이면 QA 전역이 열립니다 (정의 위치가 두 파일로 갈립니다)
  - `navigation/navRef.ts` → `__realsNav` · `__realsReset`
  - `api/mock/server.ts` → `__realsShotAll` · `__realsPlanned`
  - **`__realsShotAll()` 은 16_편집·17_내보내기 캡처 전에 반드시 부릅니다.** 안 부르면
    14.1 이 `TASKS_INCOMPLETE` 로 막아 그 두 화면은 캡처 자체가 안 됩니다
    (`pairsV4.json` 에 이미 들어 있습니다)

---

## 4. 시안 대조 — 작업 방식

기준은 `../Reals_V4.html` 입니다. 소스는 `<script type="__bundler/manifest">` 안에
base64+gzip 으로 들어 있고, 풀어 둔 것이 `C:/tmp/v4/v4src/*.js` 입니다.
**추측하지 말고 항상 시안 원문을 열어 보세요.**

```bash
# ⚠️ 이 블록은 Bash 기준입니다. PowerShell 이면 $env:EXPO_PUBLIC_FORCE_MOCK='1' 식으로 먼저 잡으세요.
# 빌드 (frontend/ 에서)
EXPO_PUBLIC_FORCE_MOCK=1 EXPO_PUBLIC_QA_NAV=1 \
  npx expo export --platform web --output-dir /tmp/webexp --clear

# 서빙 + 캡처 (C:/tmp/shotter/ 에서)
node serve.mjs /tmp/webexp 8099
node batchV4.mjs            # 3-in-1 비교 이미지 → 바탕화면\비교대상V4\
node dbg.mjs <화면이름>      # 시안/앱 글자 밴드 y 를 pt 로 나란히 출력
node scrollshot.mjs <시안화면> <라우트> <params|null> <폴더> <파일> [pre]
                            # 끝까지 내린 상태로 비교 (내용이 한 화면을 넘으면 필수)
                            # 라우트는 중첩까지 정확히 — 예: Create + {"screen":"EditResult",...}
```

### ⚠️ "밝기 불일치 %" 를 믿지 마세요
- 글자만 빽빽한 화면(약관)은 **완전히 맞아도 6~7%**
- 시안에 이미지가 없는 화면(홈 피드·마이페이지·관심 목록·내 숏폼)은
  **레이아웃이 맞을수록 % 가 오릅니다** (회색 자리표시자 vs 실제 사진)

**판단은 `dbg.mjs` 의 밴드 y 차이(pt)로 합니다. 3pt 이내면 맞은 것입니다.**

### 찍힌 숫자를 읽는 법
- 차이가 **일정하면** (0, -6, -6, -6 …) → 그 **위 어딘가에서 한 번** 밀린 것.
  헤더·상단 블록을 봅니다 (24_FAQ 의 -6 이 이 모양이었습니다)
- 차이가 **점점 커지면** (0, -2, -4, -7, -9) → 반복 요소마다 쌓이는 것.
  항목 **하나**의 높이를 봅니다 (§5-①)
- 차이가 **첫 항목부터 크고 그 뒤로 일정하면** → 그 블록 하나가 통째로 다른 것

### 단일 높이 말고 피치를 재세요
카드 하나의 높이를 색 구간으로 재면 둥근 모서리 때문에 74pt 를 57pt 로 읽습니다.
같은 카드 3~4장의 top 간격(피치)은 그 오차에 면역이라 0.5pt 도 가릅니다.

**수치가 계산과 안 맞으면 계산을 버리지 말고 빠진 항을 찾으세요.** §5 의 첫 함정이
그렇게 잡혔습니다.

---

## 5. 반복해서 걸린 함정 네 가지

### ① 줄높이 — 시안은 `leading-*` 이 없으면 **글자크기 × 1.5**

Tailwind preflight 의 `html { line-height: 1.5 }` 입니다 (시안 `_template.html` 에
별도 선언 없음). 우리 토큰은 큰 글자일수록 그보다 짧습니다.

아래는 `src/design/tokens.json` 전수입니다(2026-08-25 실측. countdown 120 은 카메라 전용이라 제외).

| 토큰 | 우리 | 시안(×1.5) | 차 |
|---|---|---|---|
| display 24 | 32 | 36 | +4 |
| title 22 | 29 | 33 | +4 |
| heading 18 | 24 | 27 | +3 |
| subheading 16 | 22 | 24 | +2 |
| body 15 | 22 | 22.5 | +0.5 |
| button 15 | 20 | 22.5 | +2.5 |
| bodySmall 14 | 21 | 21 | **0** |
| caption 13 | 19 | 19.5 | +0.5 |
| chip 13 | 18 | 19.5 | +1.5 |
| label 12 | 17 | 18 | +1 |
| micro 11 | 15 | 16.5 | +1.5 |
| nano 10 | 14 | 15 | +1 |

제목이 든 블록마다 짧아지고 그게 **쌓여서** 아래가 통째로 올라옵니다.
실제 사례: 07_권한 7pt · 23_플랜 10pt · 24_FAQ 9pt · 18_마이 24pt.

적용 조건은 **두 가지가 동시에** 성립할 때입니다 —
① 시안에 `leading-*` 이 없고 ② 높이가 내용으로 정해지는 상자(카드·바텀시트·목록 행) 안일 때.
`h-12` 입력처럼 고정 높이 안이면 영향 없습니다.

**토큰(`theme.ts`)은 고치지 마세요.** 38개 화면이 함께 씁니다. 해당 화면에서만 덮고
왜 그 값인지 주석에 남깁니다.

#### ①-1 행 높이를 끄는 건 글자가 아닐 수 있습니다

시안 원문에서 볼 것은 둘입니다 — **아이콘이 `<span>` 등에 싸여 있는가**, 그리고 **그 아이콘이 글자보다 큰가.**

```html
<!-- 24_FAQ — 래퍼 있음. 행이 24.5 -->
<button className="flex w-full items-center justify-between ...">
  <span className="text-[15px] font-semibold">{q}</span>
  <span className="shrink-0 transition-transform"><I name="chevron-down" size={18} /></span>
</button>

<!-- 22_설정 — 래퍼 없음. 행이 22.5 -->
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3"><I size={20} /><span className="text-[15px]">{label}</span></div>
  <I name="chevron-right" size={18} />
</div>
```

두 가지가 **함께** 성립해야 행이 커집니다.

1. **래퍼가 아이콘을 인라인으로 만든다.** flex 직계 자식이면 flex item 이라 줄상자가 아예
   없고 높이 18 그대로입니다 — `max(22.5, 18) = 22.5`. `<span>` 에 싸이면 인라인 요소가 되어
   줄상자 싸움에 참여합니다.
2. **아이콘이 글자의 베이스라인 위 높이보다 크다.** 15px·줄높이 22.5 면 베이스라인은
   줄상자 위에서 약 15.8 아래입니다. 18px svg 는 베이스라인에 밑면을 붙이므로 위로 18 —
   줄상자 천장을 **약 2.2 밀어 올립니다.** 22.5 + 2.2 ≈ **24.7** (실측 24.3~24.5).

> ⚠️ 래퍼만 있고 아이콘이 작으면(≈15 이하) 행은 22.5 그대로입니다. **둘 다 봐야 합니다.**
> 이 "≈15" 는 **15px 글자일 때의 값**입니다. 베이스라인 위 높이는 글자크기에 비례해서
> (≈ 글자크기 × 1.05) 커지므로, 다른 크기에서는 **아이콘 > 글자크기면 의심**하고 재세요.
> 13px 글자면 ≈13.7, 18px 글자면 ≈19 가 경계입니다.
> 그리고 상속 글자크기는 16 이 아니라 **15** 입니다 — 시안 `_template.html` 의
> `body { font-size: var(--fs-body) }` 가 15px 이고(`--fs-body:15px`, :50/:115),
> 같은 파일 :119 의 `button,input,select,textarea{font:inherit}` 때문에 버튼 안 span 까지
> 15px 이 내려옵니다. 24.5 는 strut 만으로는 안 나옵니다.

**텍스트 비율은 두 화면 다 1.5 로 같습니다.**

이럴 때 **글자 줄높이를 부풀려 맞추지 마세요.** 두 줄로 감기면 시안은 22.5×2 = 45 인데
글자에 24.5 를 두면 49 가 됩니다. 글자는 시안 실제값으로 두고 **행에 `minHeight`** 를 줍니다.
(`src/domains/my/screens/FaqScreen.tsx` 가 그렇게 정리돼 있습니다)

### ② 뒤로가기 음수 여백 — 시안 헤더는 **세 종류**

시안 원문에서 `-ml-1.5`(-6) 가 붙은 곳은 딱 세 군데입니다.

| 헤더 모양 | 음수 여백 | 화면 |
|---|---|---|
| ① 뒤로가기가 홀로 있는 `h-11` | **있음** | 공용 TopHeader · 07_권한(제목 없음) · 20_내 숏폼(제목 절대 중앙) |
| ② 제목이 뒤로가기 바로 옆 좌측 정렬 | 없음 | 17·21·22·23·24·27·28 |
| ③ 어두운 오버레이 헤더 | 없음 | 13·14·15 |

표에 없는 화면(02·03·06·19·25 등)은 공용 `TopHeader`(= `ui/AppBar`)를 쓰므로 ①에 해당합니다.
가르는 건 "자체 헤더냐" 가 아니라 **버튼이 홀로 있느냐**입니다.
`ui/AppBar.tsx` · `PermissionsInfoScreen` · `MyVideoScreen` 의 `-6` 은 **맞는 값입니다 —
일관성을 이유로 지우지 마세요.** 규칙 표는 `FaqScreen.tsx` 헤더 스타일 주석에도 있습니다.

### ③ 공용 `Screen` 의 기본 여백

`src/ui/Screen.tsx` 의 기본 `scrollContent` 는 **`paddingTop: 16` · `gap: 16`** 입니다.
끄지 않으면 화면 전체가 밀립니다 — 18_마이페이지가 이것 때문에 24pt 내려가 있었습니다.
시안 여백을 각 블록이 직접 잡는 화면이면 `contentStyle={{ paddingTop: 0, gap: 0 }}` 를 주세요.

`footer` 가 없으면 `SafeAreaView` 가 하단 안전영역(34)을 먹습니다. 여기에 안쪽
`paddingBottom: 32` 를 또 주면 66 이 됩니다. **이 어긋남은 캡처에도 그대로 재현됩니다** —
`App.tsx:30` 이 캡처 모드에서 기기와 같은 inset(54/34)을 일부러 주입합니다.
("웹이라 inset 0 이니 안 잡힌다" 는 틀린 전제입니다. 첫 화면만 찍으면 안 보일 뿐입니다.)

스크롤 화면이면 `edges={['top']}` 로 두고 안쪽에서 `Math.max(insets.bottom, space[10])`
처럼 계산하세요. 시안 여백에 맞으면서 기기 홈 인디케이터도 침범하지 않습니다.

### ③-1 시안 헤더는 스크롤 영역 **밖**입니다
시안은 `<header>` 다음에 `overflow-y-auto` 인 div 가 따로 옵니다 — 내려도 헤더가 제자리입니다.
`Screen` 에 스크롤을 맡기면(기본 `scroll`) 자체 헤더가 같이 밀려 올라갑니다.
`AppBar` 를 첫 자식으로 쓰면 자동으로 밖에 그려지지만, **좌측 정렬 자체 헤더를 쓰는
화면**(legal·faq·insight·plans·settings·export)은 `scroll={false}` + 안쪽 `ScrollView`
로 직접 나눠야 합니다.

**첫 화면만 찍으면 이 두 가지가 다 안 보입니다.** 내용이 한 화면을 넘는 화면은
`scrollshot.mjs` 로 아래쪽도 찍으세요.

첫 자식이 `AppBar` 면 자동으로 스크롤 **바깥**에 그려집니다 (시안 TopHeader 가
`absolute` 인 것에 맞춘 것). 그래서 `contentStyle` 의 `paddingTop` 은 앱바 **아래**부터입니다.

### ④ `Animated.loop` + `useNativeDriver: true` 는 웹에서 **한 바퀴만 돕니다**

`Animated.loop` 는 네이티브 드라이버 애니메이션의 **반복을 네이티브 모듈에 넘깁니다.**
그 모듈이 없는 react-native-web 에는 반복시킬 주체가 없어서, 애니메이션이 한 번 끝나면
**진행도 1 에 굳은 채로 멈춥니다.** 예외도 경고도 나지 않습니다.

```ts
// ❌ 웹에서 한 바퀴만 돌고 멈춥니다
Animated.loop(Animated.timing(v, { toValue: 1, duration: 2500, useNativeDriver: true })).start();

// ✅ 반복이면 JS 드라이버로 둡니다
Animated.loop(Animated.timing(v, { toValue: 1, duration: 2500, useNativeDriver: false })).start();
```

**증상이 "가끔 되는 것"처럼 보입니다.** 화면을 벗어났다 돌아오면 `.start()` 가 다시
불려 한 바퀴 더 돌기 때문입니다. 2026-08-25 튜토리얼 삽화가 그랬습니다 — 첫 화면만
텅 비어 있고 넘겼다 돌아오면 멀쩡했습니다.

**가르는 법:** 인라인 스타일을 시간차로 두 번 떠서 비교하세요. 캡처만 보면
"애니메이션이 그 시점에 안 보이는 상태였나" 로 오독합니다.

```js
// CDP Runtime.evaluate 로 400ms 간격 두 번
[...document.querySelectorAll('*')].filter(e => e.getAttribute('style'))
  .map(e => e.getAttribute('style'))
```

당시 `width`(JS 드라이버)는 계속 변하는데 `opacity`·`transform`(네이티브)만 고정이라
드라이버가 원인이라는 게 바로 드러났습니다.

#### ④-1 `Animated.sequence` 를 `loop` 에 넣으면 **JS 드라이버로도** 한 바퀴만 돕니다

위 처방(`useNativeDriver: false`)으로 부족한 경우가 있습니다. 2026-08-26 전광판
(`src/ui/Marquee.tsx`)이 그랬습니다 — 드라이버를 JS 로 두었는데도 웹에서 한 바퀴 뒤
끝값에 굳었습니다. `translateX` 를 0.5초마다 재 보니 `-215` 에서 다시 0 으로 안
돌아왔습니다.

```ts
// ❌ 드라이버를 JS 로 둬도 웹에서 한 바퀴 뒤 멈췄습니다
Animated.loop(Animated.sequence([Animated.delay(1200), Animated.timing(x, { ... })])).start();

// ✅ 다음 바퀴를 직접 겁니다. 웹·기기 어느 쪽에서나 똑같이 돕니다
const cycle = () => {
  if (stopped) return;
  x.setValue(0);
  cur = Animated.sequence([Animated.delay(1200), Animated.timing(x, { ... })]);
  cur.start(({ finished }) => finished && cycle());   // finished=false 면 stop() 된 것 — 다시 안 겁니다
};
```

**가르는 법:** 캡처 두 장으로는 못 가립니다. 끝난 그림이 시작과 똑같이 보이도록 만든
애니메이션(전광판이 그렇습니다)은 **멈춰 있어도 정상처럼 보입니다.** `transform` 의
`m41` 을 여러 번 재서 **0 으로 돌아오는지**를 보세요.

```js
Math.round(new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)
```

**반복이 아니면 네이티브 드라이버를 그대로 쓰세요.** 한 번짜리 `timing`·`spring` 은
멀쩡합니다 — 튜토리얼 페이지 전환(`trackX`)이 그렇습니다. 문제는 `loop` 뿐입니다.

그리고 시안의 폭·높이 애니는 **레이아웃 속성이라 어차피 네이티브 드라이버를 못 씁니다.**
`scaleX`/`scaleY` 로 바꾸면 `borderRadius` 가 같이 늘어나 끝 모양이 시안과 달라집니다.
같은 화면에서 값을 둘로 쪼개면 두 시계가 어긋나고, **한 노드의 style 에 두 드라이버를
섞으면 RN 이 예외를 냅니다**(`navigation/SwipeTabs.tsx` 주석). 반복 애니는 시계 하나로
통일하는 게 안전합니다 (`domains/onboarding/components/TutorialArt.tsx`).

---

## 6. 토큰

- 값은 `src/design/tokens.json` → `src/design/theme.ts`. **화면에 숫자를 직접 쓰지 않습니다.**
- 색·모서리·그림자 명세는 `DESIGN.md` (브랜드 `#2563EB`, 카드 radius 16, lucide 라인 아이콘, 이모지 금지)
- `space` 스케일은 디자인 원본과 같습니다: `0.5=2 1=4 1.5=6 2=8 3=12 3.5=14 4=16 5=20 6=24 7=28 8=32 10=40 12=48 14=56 16=64`
- 화면별로 토큰을 덮어야 하면 **덮는 것 자체는 괜찮습니다.** 대신 시안 원문 클래스와
  실측 근거를 주석에 남기세요. 다음 사람이 "일관성" 이유로 되돌립니다.

---

## 7. 명령어

```bash
npx tsc --noEmit      # 커밋 전 필수 (npm run typecheck)
npx expo start --dev-client
npx expo-doctor
```

셸은 PowerShell 이지만 Bash 도 있습니다. 여러 줄 문자열을 네이티브 명령에 넘길 때
PowerShell here-string(`@'...'@`)은 커밋 메시지에 `@` 를 흘립니다 — 파일로 쓰고
`git commit -F` 를 쓰세요.

---

## 7-1. 앱에 반영하기 — OTA (EAS Update)

**깔아둔 앱을 다시 설치하지 않고** 코드를 반영합니다. `expo-updates` 가 들어간
2026-08-26 이후 APK 부터 됩니다.

```bash
npx tsc --noEmit                          # 먼저 통과시킵니다
npx eas update --branch preview -m "무엇을 바꿨는지"
```

앱은 **켤 때 조용히 받아두고 다음 실행에 적용합니다** (`fallbackToCacheTimeout: 0`
이라 스플래시에서 기다리지 않습니다). 그래서 폰에서는 **껐다 켜기를 두 번** 해야
보입니다. 인터넷이 안 되면 이미 받아둔 마지막 버전으로 그냥 뜹니다 — 개발 서버
없이도 앱이 정상적으로 열립니다.

### 무선으로 가는 것 / 안 가는 것

| 무선 O | 무선 X — APK 재빌드 |
|---|---|
| 화면 코드·문구·레이아웃·스타일 | `app.json` 의 `plugins`·권한·아이콘·스플래시 |
| `src/**` 전부, 목업 `fixtures.ts` | 새 네이티브 패키지 (`npx expo install ...`) |
| `assets/` 이미지·폰트 | Expo SDK 업그레이드 |

지금 하는 시안 대조 작업은 **사실상 전부 왼쪽 칸**입니다.

### 🔴 `runtimeVersion` 은 `appVersion` — 네이티브를 바꾸면 `version` 을 올리세요

`app.json` 의 `version`(지금 `1.0.0`)이 그대로 runtimeVersion 입니다. **같은 값을 가진
APK 는 전부 그 업데이트를 받습니다.** 그래서 위 표의 오른쪽 칸(네이티브)을 건드렸는데
`version` 을 안 올리고 `npm run ota` 를 하면, **옛 APK 가 맞지 않는 JS 를 받아 죽습니다.**
네이티브를 건드렸으면 순서가 이렇습니다.

```
app.json 의 version 올리기 (1.0.0 → 1.0.1)  →  npm run build:preview  →  APK 새로 설치
```

`fingerprint` 정책을 쓰면 이걸 자동으로 막아 주지만, **Windows 에서 계산한 값이 EAS
리눅스 빌더의 값과 달라 빌드가 `CONFIGURE_EXPO_UPDATES` 단계에서 실패합니다**
(2026-08-26 실제로 겪음: "Runtime version calculated on local machine not equal to
runtime version calculated during build"). 그래서 `appVersion` 으로 두고 사람이 지킵니다.

```bash
npx eas update:list --branch preview               # 올라간 업데이트 목록
npx eas build:list --platform android --limit 1    # 폰에 깔린 APK 의 Runtime Version
```

두 곳의 Runtime Version 이 같아야 폰이 업데이트를 받습니다.

### 채널

`eas.json` 의 프로필 이름 = 채널 이름입니다 (`development` · `preview` · `production`).
폰에 까는 APK 는 `preview` 프로필이므로 **`--branch preview`** 로 올립니다.

### API 주소

`EXPO_PUBLIC_API_BASE_URL` 은 `eas.json` 의 빌드 프로필에만 있어서 `eas update` 로
만든 번들에는 안 들어갑니다. `src/api/http.ts` 가 `app.json` 의 `extra.apiBaseUrl`
(같은 `https://sarils.p-e.kr`)로 떨어지므로 결과는 같습니다. **주소를 바꿀 일이
생기면 두 곳을 같이 고치세요.**

---

## 8. 문서

| 파일 | 내용 |
|---|---|
| `DESIGN.md` | 색·타이포·간격 값 명세 |
| `BE_전달사항.md` | 백엔드 요청 목록 (API 에 없는 필드는 여기로) |
| `docs/시안V4_대응표.md` | 시안 ↔ 앱 화면 짝과 대조 진행 상황 |
| `docs/버그분석_2026-08-24.md` | 과거 버그 원인 |
| `바탕화면\비교대상V4\_요약.txt` | 최신 대조 결과와 남은 판단 사항 |

---

## 9. 작업 습관

- **화면을 고치기 전에 시안 원문(`C:/tmp/v4/v4src/`)을 먼저 엽니다.** 캡처만 보면
  잘린 부분을 "없는 것" 으로 착각합니다.
- 목업 데이터가 시안과 다른 경우가 있습니다. 화면 로직이 맞는데 결과가 다르면
  `src/api/mock/fixtures.ts` 를 의심하세요.
- 사장님이 검토를 끝낸 화면 범위가 있으면 그 범위는 지시 없이 건드리지 않습니다.
- **확정 사항 — 내보내기의 수정 요청(명세 14.3)은 넣지 않습니다.** 사장님이 정한 것입니다.
  화면 요소가 아니라 API 가 딸린 기능을 뺀 것이라, "고칠 방법이 없네" 하고 되살리지 마세요.
- 커밋 메시지는 **무엇을 왜 바꿨는지** 를 실측 수치와 함께 적습니다
  (예: "카드 높이 209 → 217 로 시안과 일치").
