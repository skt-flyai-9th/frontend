# Reals 디자인 가이드라인

> **이 문서의 목적**
> 프로토타입(`reals.zip`, Next.js)의 디자인 기조를 React Native 앱에 옮기기 위한 **값 명세**입니다.
> "느낌"이 아니라 **숫자와 hex** 로 씁니다. 다른 문서·프롬프트에 통째로 붙여 넣어 쓰는 것을 전제로 합니다.
>
> **출처**: `app/globals.css` 의 `@theme` 블록 + 화면 22개·공용 컴포넌트 4개의 클래스 전수 조사 (2026-08-23 기준)
> **적용 대상**: `src/design/tokens.json` 및 `src/ui/*` 를 쓰는 모든 화면
> **디자인은 계속 바뀝니다.** 그래서 화면 코드에는 값을 직접 쓰지 않고 토큰만 참조합니다 (§9).

---

## 0. 30초 요약 — 이것만 지켜도 80%는 맞습니다

| 항목 | 값 |
| --- | --- |
| 브랜드색 | **파랑 `#2563EB`** (주황 아님) |
| 화면 배경 | **흰색 `#FFFFFF`** (회색 아님) |
| 카드 | 흰 배경 + 헤어라인 테두리 + **아주 옅은 그림자** + `radius 16` |
| 글자색 | `#0F172A` (제목) / `#334155` (본문) / `#64748B` (보조) |
| 아이콘 | **lucide 라인 아이콘** (이모지 금지) |
| 하트 | `#EF4444`, 채움(fill) |
| 굵기 | 대부분 **semibold**, 제목만 bold |
| 모서리 | 칩·아바타는 완전 pill, 버튼 `12`, 카드 `16`, 말풍선 `16` |

**한 줄로**: 흰 바탕 · 파란 포인트 · 얇은 회색 선 · 옅은 그림자 · 둥근 모서리 · 라인 아이콘.

---

## 1. 색

### 1.1 브랜드 (파랑)

| 역할 | hex | 어디에 |
| --- | --- | --- |
| `brand` | `#2563EB` | 기본 버튼 배경, 활성 탭, 링크, 내 말풍선, 활성 칩, 강조 아이콘 |
| `brand-tint` | `#EFF6FF` | 강조 박스 배경, 아이콘 뒤 배경, 배지 배경 |
| `brand-border` | `#BFDBFE` | 강조 박스·아웃라인 버튼 테두리, 입력 포커스 테두리 |
| `brand-soft` | `#60A5FA` | 보조 강조 (드물게) |

> 현재 앱의 `brand` 는 주황 `#F0561F` 계열입니다. 이건 이전 프로젝트(사릴스) 팔레트입니다.
> `tokens.json` 의 brand 스케일만 아래 §9.1 처럼 갈아끼우면 전 화면이 한 번에 바뀝니다.

### 1.2 글자·선·배경 (slate 계열)

| 역할 | hex | 용도 |
| --- | --- | --- |
| `ink` | `#0F172A` | 제목, 가장 진한 글자 |
| `ink-2` | `#1E293B` | 본문 강조, 아웃라인 버튼 글자 |
| `ink-3` | `#334155` | 일반 본문, 비활성 칩 글자 |
| `slate-muted` | `#64748B` | 보조 설명, 비활성 탭 아이콘, placeholder |
| `hairline` | `#E2E8F0` | 모든 테두리·구분선. 로딩 스켈레톤 배경 |
| `track` | `#CBD5E1` | 비활성(disabled) 버튼 배경, 진행바 트랙 |
| `canvas` | `#FFFFFF` | **화면 기본 배경** |
| `panel` | `#FFFFFF` | 카드 배경 (canvas 와 같은 흰색, 그림자로 구분) |
| `surface` | `#F8FAFC` | 섹션 구분이 필요할 때만 쓰는 옅은 회색 배경 (인사이트 화면 등) |

> **중요**: 기본은 흰 바탕이고 회색은 예외입니다. 현재 앱은 반대(회색 캔버스 + 흰 카드)이므로 뒤집어야 합니다.

### 1.3 의미색

| 역할 | hex | 용도 |
| --- | --- | --- |
| `heart` | `#EF4444` | 하트(찜), 로고의 점, 위험·삭제 |
| `verified` | `#10B981` | 연동 완료, 성공, 상승 지표 |
| `naver` | `#03C75A` | 네이버 스마트플레이스 뱃지 전용 |
| YouTube red | `#FF0000` | 유튜브 아이콘 배경에만 |

### 1.4 어두운 표면 위 (카메라·영상 오버레이)

- 반투명 검정: `rgba(15,23,42,0.25)` / `0.45` / `0.60` / `0.65` 를 상황에 따라
- 그 위 글자·아이콘은 **흰색**
- 항상 `backdrop-blur` 를 함께 (RN 에서는 `expo-blur` 또는 불투명도를 조금 높여 대체)

---

## 2. 서체

- **Pretendard** 단일. 400/500/600/700/900 다섯 종. (현재 앱과 동일 — 바꿀 것 없음)
- 제목류는 자간 `-0.02em` (RN: `letterSpacing: -0.4 ~ -0.6`)

### 2.1 실제 쓰이는 크기 (사용 빈도순)

| px | 빈도 | 굵기 | 용도 |
| --- | --- | --- | --- |
| 15 | 최다 | semibold / medium | **본문 기본**, 카드 제목, 버튼 라벨, 말풍선, 입력 |
| 14 | 많음 | semibold | 보조 버튼, 칩 라벨 |
| 13 | 많음 | semibold / regular | 설명문, 작은 칩 |
| 12 | 많음 | medium | 해시태그, 캡션, 메타 정보 |
| 18 | 보통 | **bold** | 화면 타이틀, 헤더 로고 |
| 16 | 보통 | semibold | 섹션 제목 |
| 22 | 적음 | bold | 큰 숫자, 강조 수치 |
| 11 / 10 | 적음 | semibold | 배지, 뱃지 라벨 |

### 2.2 굵기 분포 (프로토타입 전 화면 실측)

```
semibold(600)  71회   ← 기본값. 애매하면 semibold
medium(500)    46회   ← 본문 문장, 말풍선
bold(700)      38회   ← 제목, 숫자, 배지
```

> **regular(400)를 거의 안 씁니다.** 전체적으로 한 단계 굵은 인상입니다.
> 우리 앱의 `text.body` 는 regular 이므로, 프로토 느낌을 내려면 본문을 medium 으로 올려야 합니다.

### 2.3 ⚠️ 크기는 프로토를 그대로 따르지 않습니다

프로토는 **440px 웹 데모**라 밀도가 높습니다. 우리 사용자는 **40~60대 소상공인**입니다.

| | 프로토 | 우리 앱(유지) | 판단 |
| --- | --- | --- | --- |
| 본문 | 15px | **17px** | 우리 것 유지 |
| 기본 버튼 높이 | 48px | **58px** (`sizing.buttonHeight`) | 우리 것 유지 |
| 입력 높이 | 44px | **58px** (`sizing.inputHeight`) | 우리 것 유지 |
| 주 동작 터치 | 36~44px | **52px** (`sizing.touchTargetMin`) | 우리 것 유지 |
| 보조 컨트롤 터치 | 32~36px | **44px** (`sizing.buttonHeightSmall`) | 기능명세 하한 충족 |

> ⚠️ **2026-08-24 개정 — "시안 우선" 지시로 크기 정책을 시안값으로 전환했습니다.**
> 버튼 58→**48** · 입력 58→**52** · 칩 44→**32(글자 13)** · 헤더 56→**44** · 보조 아이콘 44→**36**.
> 터치 하한 44(기능명세)는 시각 크기가 아니라 **hitSlop 으로 보전**합니다
> (Chip/Button(small)/AppBar back 에 적용됨). 아래 기존 §2.3 서술은 역사 기록으로 남깁니다.

### 터치 크기 규칙 — 두 단계입니다 (구판, 2026-08-24 이전)

크기를 하나로 못 박으면 칩이 버튼만큼 커지고 화면이 무너집니다. 그래서 둘로 나눕니다.

| 단계 | 값 | 어디에 |
| --- | --- | --- |
| **주 동작** | 52 이상 (버튼은 58) | 화면의 목적을 이루는 버튼, 목록 행, 선택 카드, 하단 CTA |
| **보조 컨트롤** | 44 (하한, 더 줄이지 않음) | 칩, 앱바 아이콘 버튼, 카드 안 아이콘 버튼, 복사 버튼 |

기능명세 요구("최소 44px")는 두 단계 모두 충족합니다.
**44 미만은 어떤 경우에도 만들지 않습니다.**
숫자를 직접 쓰지 말고 `sizing.touchTargetMin` / `sizing.buttonHeightSmall` 을 참조하세요.

**색·형태·아이콘은 프로토를 따르고, 크기·터치 영역은 우리 것을 유지합니다.**
이건 타협이 아니라 기능명세 요구사항입니다("터치 영역 최소 44px, 탭바 콘텐츠 58px").

---

## 3. 모양 (radius·테두리·그림자)

### 3.1 radius

프로토 기준값 `--radius: 10px`, 파생 `sm 6 / md 8 / lg 10 / xl 14 / 2xl 18`.
실사용을 RN 토큰으로 옮기면:

| 대상 | 값 | 비고 |
| --- | --- | --- |
| 칩, 아바타, 아이콘 버튼, 배지, 진행바, 스켈레톤 | **pill (999)** | 프로토는 pill 을 아주 자주 씀 |
| 버튼 (기본·아웃라인) | **12** | `rounded-xl` |
| 카드, 말풍선, 강조 박스 | **16** | `rounded-2xl` |
| 작은 아이콘 컨테이너(36~40px) | **12** | |
| 바텀시트 상단 | **28** | 카메라 하단 패널 등 |
| 썸네일·미디어 | **12~16** | |

> 현재 앱은 `sm 8 / md 12 / lg 16 / xl 22` — **`xl` 만 22→18 로 낮추면** 나머지는 프로토와 거의 맞습니다.

### 3.2 테두리

- 두께는 **항상 1px** (헤어라인). 2px 이상은 쓰지 않음
- 색은 `hairline #E2E8F0`, 종종 60~80% 불투명도로 더 옅게
- 강조 박스만 `brand-border #BFDBFE`

### 3.3 그림자 — 현재 앱에 **없는 개념**입니다

프로토는 카드에 아주 옅은 그림자를 씁니다 (17회 사용, 사실상 카드 = 그림자).

앱에는 이미 `theme.elevation(name)` 헬퍼가 있습니다. **새 shadow 체계를 만들지 말고 여기에 값을 추가하세요.**
체계가 둘이 되면 반드시 한쪽만 고쳐집니다.

```ts
import theme from '../design/theme';
<View style={[styles.card, theme.elevation('card')]} />
```

| 이름 | CSS 원본 | 쓰는 곳 |
| --- | --- | --- |
| `card` | `0 4px 16px -2px rgba(15,23,42,0.04)` | 일반 카드 |
| `raised` | `0 4px 16px -4px rgba(15,23,42,0.06)` | 누를 수 있는 카드 |
| `bubble` | `0 2px 10px -2px rgba(15,23,42,0.06)` | 말풍선, 선택지 버튼 |
| `sheet` | — | 아래에서 올라오는 패널 |

> 흰 배경 위 흰 카드를 구분하는 유일한 수단이라 **빼면 화면이 밋밋해집니다.**
> 안드로이드는 `elevation` 이 없으면 그림자가 안 나오니 반드시 함께 지정.

---

## 4. 아이콘 — lucide 라인 아이콘

**이모지 글리프(🏠 ♥ ✦ 🏪)를 쓰지 않습니다.** 프로토는 전부 `lucide-react` 입니다.

- RN 패키지: **`lucide-react-native`**
- 기본 크기: 목록/버튼 안 `20`, 탭바 `26`, 작은 배지 `12~13`
- 선 두께: 기본 `1.75`, 활성·강조 `2`, 아주 작은 아이콘 `2.6`
- 활성 상태는 **fill** 로 표현 (하트는 완전 채움, 나머지는 `fillOpacity 0.12`)

### 4.1 실제 사용 아이콘 목록 (프로토 전수)

```
탭바      Home  Heart  Sparkles  Store
내비      ChevronLeft  ChevronRight  ChevronDown  ArrowRight  X  Menu  Search
미디어    Play  Send  Camera  Mic  Music2  Music4  Upload  Download  RotateCcw
상태      Check  CheckCircle2  AlertCircle  Loader2  Circle  ShieldCheck  Lock
정보      Clock  User  EyeOff  MapPin  Phone  Mail  Link2  Bell  Crown
편집      Plus  Copy  GripVertical  Wand2  Sparkles  KeyRound  Image
```

---

## 5. 컴포넌트 명세

프로토의 공용 컴포넌트(`components/ui/reals.tsx`)를 우리 `src/ui/*` 에 매핑한 표입니다.
**크기는 §2.3 규칙대로 우리 값으로 올려 적었습니다.**

### 5.1 기본 버튼 (PrimaryButton → `ui/Button` variant="primary")

```
배경  brand #2563EB      (비활성: track #CBD5E1)
글자  흰색, 15→17px, semibold
높이  프로토 48 → 우리 58
radius 12
너비  기본 전체폭
누름  scale 0.95 (또는 opacity 0.72)
아이콘 있으면 왼쪽, gap 8
```

### 5.2 아웃라인 버튼 (OutlineButton → variant="secondary")

```
배경  흰색   테두리 1px hairline   글자 ink-2 #1E293B semibold
나머지 기본 버튼과 동일
※ 강조가 필요한 아웃라인은 테두리 brand-border + 글자 brand
```

### 5.3 칩 (Chip → `ui/Chip`)

```
활성   배경 brand, 글자 흰색
비활성 배경 흰색, 테두리 1px hairline, 글자 ink-3
높이 32→44 (보조 컨트롤 하한, `sizing.buttonHeightSmall`)   radius pill   글자 13px semibold   좌우 여백 14
아이콘 동반 가능 (13px, gap 6)
```

### 5.4 카드 (Card → `ui/Card`)

```
배경 흰색   테두리 1px hairline(80% 불투명)   radius 16   그림자 card
안쪽 여백 16
누를 수 있는 카드는 그림자 raised + 누름 시 scale 0.98
```

### 5.5 배지

두 종류가 있습니다.

```
① 밝은 배경 위     배경 brand-tint,  글자 brand,   11px bold, radius pill, 패딩 8×4
② 미디어(어두운) 위 배경 rgba(15,23,42,0.65), 글자 흰색, 11px semibold, blur
③ 의미색 배지      done/verified·danger/heart 는 각 색의 10% 배경 + 진한 글자
```

### 5.6 말풍선 (AI 채팅)

```
AI    배경 흰색, 글자 ink-2, radius 16 (왼쪽 위 모서리만 8), 그림자 bubble
사용자 배경 brand,  글자 흰색,  radius 16 (오른쪽 위 모서리만 8), 그림자 없음
최대 너비 78%   글자 15→17px medium   안쪽 여백 14×10
AI 아바타 32px 원, 배경 brand, 흰 Sparkles 아이콘, 말풍선과 gap 8
선택지 버튼 높이 44, radius 12, 배경 brand-tint 또는 흰색+brand-border, 글자 brand semibold
```

### 5.7 입력창

```
높이 44→58   radius pill   배경 흰색   테두리 1px hairline
포커스 시 테두리 brand-border    글자 15→17px   placeholder slate-muted
전송 버튼: 원형 44→52, 배경 brand, 흰 Send 아이콘, 비활성 시 opacity 0.4
```

### 5.8 탭바 (4탭 확정)

```
구성   홈(Home) · 관심목록(Heart) · AI 추천(Sparkles) · 마이(Store)
높이   콘텐츠 58 + 하단 인셋 (고정값 금지)
배경   흰색 + 상단 테두리 1px hairline
아이콘 26px, 비활성 stroke 1.75 색 slate-muted / 활성 stroke 2 + fill
활성색 기본 brand #2563EB, **관심목록 탭만 heart #EF4444**
인디케이터 활성 탭 위쪽에 폭 32 · 높이 4 · pill, 활성색과 동일 (스프링 애니메이션)
라벨   프로토는 라벨 없이 아이콘만. 우리는 40~60대 대상이므로 **라벨 유지 권장**(12px)
```

### 5.9 상단 헤더

```
높이 44→56   배경 흰색(95% 불투명 + blur)   하단 테두리 1px hairline
제목 18px bold, 자간 타이트, 가운데 정렬
좌우 아이콘 버튼 36→44 원형(`sizing.buttonHeightSmall`), 색 ink
홈 전용: 가운데 로고 "Reals" + 빨간 점(heart) — 점만 색이 다릅니다
```

### 5.10 피드 카드 (홈·관심목록 공용)

```
썸네일  가로 전체, 비율 4:5, 배경 hairline(로딩 중 통일 회색)
        가운데 재생 표시: 원형 56, 배경 rgba(15,23,42,0.25) + blur, 흰 Play 24
        우하단 SHORTS 배지: 흰 배경, radius 8, 빨간 Play 12 + "SHORTS" 11px bold
메타줄  아바타 36 원형 · 제목 15→17px semibold 한 줄 말줄임
        · 해시태그 12→13px medium slate-muted 한 줄 말줄임
        · 하트 버튼 · 화살표(Send) 버튼
하트    미채움 stroke ink-3 / 채움 fill+stroke heart, 누르면 1→1.3→0.9→1 튕김(400ms)
화살표  Send 20px, 색 brand, 원형 터치영역 36→52
```

### 5.11 카메라·영상 위 UI

```
칩·배지는 rgba(15,23,42,0.60) + blur + 흰 글자
하단 컨트롤 패널은 흰 배경 + 상단 radius 28 로 올라옴
녹화 중 표시: 빨간 점 + 경과 시간, 상단 가운데
※ 유튜브 플레이어 위에는 어떤 것도 겹치지 않습니다 (약관). 위아래로 분리.
```

---

## 6. 여백·레이아웃

```
화면 좌우 여백   16 (프로토 px-4)
카드 안쪽 여백   16
요소 사이 세로   8 / 12 / 16 (촘촘 / 기본 / 섹션)
섹션 사이        24
목록 아이템 사이 12
아이콘과 글자    6~8
```

- 세로 스크롤 영역 하단에는 탭바 높이만큼 여백을 둡니다 (`58 + insets.bottom + 16`)
- 스크롤바는 숨깁니다 (`showsVerticalScrollIndicator={false}`)
- 피드는 카드 단위 스냅 스크롤 (프로토 `snap-y-mandatory`)

---

## 7. 움직임

프로토는 framer-motion 을 씁니다. RN 에서는 `Pressable` + `Animated` 로 대응합니다.

| 상황 | 프로토 | RN 대응 |
| --- | --- | --- |
| 버튼·칩 누름 | `scale 0.95` | `Animated.spring` 또는 `opacity 0.72` |
| 아이콘 버튼 누름 | `scale 0.90` | 동일 |
| 하트 토글 | `1→1.3→0.9→1`, 400ms | `Animated.sequence` |
| 탭 인디케이터 이동 | spring(stiffness 450, damping 32) | `Animated.spring` |
| 로딩 스켈레톤 | `animate-pulse`, 배경 hairline, radius pill | `Animated.loop` opacity 0.4↔1 |

지속시간은 우리 토큰 `motion.fast 140 / base 220 / slow 380` 을 그대로 씁니다.

---

## 8. 상태 표현 규칙

디자인이 아니라 **정직성**의 문제라 색보다 우선합니다.

```
없는 값        "N/A" 또는 "없음". 0 으로 쓰지 않습니다
AI 추측        "AI 추측" 배지 (중립색), 실제 데이터와 반드시 구분
기준 시점      "8/23 기준" 표시
로딩           스켈레톤(pulse) 또는 문구. 무한 스피너 금지
빈 목록        EmptyState — 실패가 아니라 정상 상태로 표현
실패           이유 + "다시 시도" + 빠져나갈 길. 조용히 실패 금지
비활성 버튼    이유를 함께 표시. 눌러도 반응 없는 화면 금지
```

---

## 9. 적용 방법 — 화면 코드는 건드리지 않습니다

### 9.1 `src/design/tokens.json` 교체분

```jsonc
"color": {
  "brand": {
    "50":  "#EFF6FF",   // brand-tint
    "100": "#DBEAFE",
    "300": "#BFDBFE",   // brand-border
    "500": "#3B82F6",
    "600": "#2563EB",   // ★ 기본 브랜드색
    "700": "#1D4ED8"
  },
  "ink": {
    "900": "#0F172A", "800": "#1E293B", "700": "#334155",
    "500": "#64748B", "400": "#94A3B8", "300": "#CBD5E1",
    "200": "#E2E8F0", "100": "#E2E8F0", "50": "#F8FAFC"
  },
  "paper":  "#FFFFFF",
  "canvas": "#FFFFFF",        // ★ 회색 → 흰색
  "surface": "#F8FAFC",       // ★ 신규: 섹션 구분용
  "done":   { "500": "#10B981", "100": "#D1FAE5" },
  "warn":   { "500": "#B45309", "100": "#FDF1DC" },
  "danger": { "500": "#EF4444", "100": "#FEE2E2" },
  "naver":  "#03C75A",        // ★ 신규
  "track":  "#CBD5E1",        // ★ 신규: 비활성 배경
  "overlay": {
    "scrim": "rgba(15,23,42,0.60)",
    "cameraChrome": "rgba(15,23,42,0.45)",
    "guideLine": "rgba(255,255,255,0.92)",
    "guideFill": "rgba(37,99,235,0.16)"   // ★ 주황 → 파랑
  }
},
"radius": { "sm": 8, "md": 12, "lg": 16, "xl": 18, "pill": 999 },
// 그림자는 기존 elevation 그룹에 넣습니다 (theme.elevation() 헬퍼가 이미 씁니다)
"elevation": {
  "card":   { "shadowColor": "#0F172A", "shadowOpacity": 0.06, "shadowRadius": 12, "shadowOffsetY": 4,  "androidElevation": 2 },
  "raised": { "shadowColor": "#0F172A", "shadowOpacity": 0.08, "shadowRadius": 14, "shadowOffsetY": 4,  "androidElevation": 3 },
  "bubble": { "shadowColor": "#0F172A", "shadowOpacity": 0.06, "shadowRadius": 8,  "shadowOffsetY": 2,  "androidElevation": 1 },
  "sheet":  { "shadowColor": "#0F172A", "shadowOpacity": 0.14, "shadowRadius": 24, "shadowOffsetY": -6, "androidElevation": 12 }
}
```

`size`·`space`·`font` 는 **바꾸지 않습니다** (§2.3).

### 9.2 그 다음 손대는 곳 (순서대로)

1. `theme.ts` — `surface`·`naver`·`track`·`mediaBlack`·`storePalette` 를 export 에 추가
2. `ui/Card.tsx` — 그림자 적용, radius 16 고정
3. `ui/Chip.tsx` — 활성 시 배경 brand + 흰 글자 (현재는 tint 계열)
4. `ui/Button.tsx` — radius 12, 비활성 배경 track
5. `navigation/RootNavigator.tsx` — 이모지 → `lucide-react-native`, 관심목록 탭 활성색만 heart, 인디케이터 추가
6. `ui/Screen.tsx` — 기본 배경 canvas(흰색) 확인

### 9.3 새 화면을 만들 때 지킬 것

```
✅ theme 에서 가져다 씁니다:  color.brand[600], space[4], radius.lg, text.body
❌ 화면 코드에 hex·px 직접 금지: '#2563EB', 16, borderRadius: 12
❌ 이모지 아이콘 금지 → lucide-react-native
✅ 터치 영역 최소 sizing.touchTargetMin(52)
✅ 탭 화면은 Screen edges={['top']} — 하단은 탭바가 처리
✅ 하단 고정 버튼은 BottomAction (인셋 자동 처리)
```

---

## 10. 프로토타입을 따르지 **않는** 것 — 의도적 차이

이 목록은 "빠뜨린 것"이 아니라 **판단한 것**입니다. 되돌리지 마세요.

| 항목 | 프로토 | 우리 | 이유 |
| --- | --- | --- | --- |
| 본문 크기 | 15px | 17px | 40~60대 가독성 |
| 터치 영역 | 36~44px | 52px | 기능명세 요구 |
| 버튼 높이 | 48px | 58px | 동일 |
| 탭 라벨 | 없음(아이콘만) | 있음 | 아이콘만으로 뜻이 안 통함 |
| 다크모드 | CSS 변수 존재 | 미지원 | 프로토도 실제로 안 씀(shadcn 잔재) |
| 플랜/요금제 UI | 있음 | 없음 | API 미정 (별도 확정 후) |

---

## 11. 체크리스트 — 화면 하나를 다 만들고 나서

```
[ ] hex 나 숫자를 직접 쓴 곳이 없는가 (grep '#[0-9a-fA-F]{6}')
[ ] 이모지 아이콘이 남아 있지 않은가
[ ] 화면 배경이 흰색인가 (회색 캔버스가 아닌가)
[ ] 카드에 그림자가 있는가 (안드로이드 elevation 포함)
[ ] 강조색이 파랑 계열인가, 하트만 빨강인가
[ ] 주 동작이 52px 이상, 보조 컨트롤이 44px 이상인가 (숫자 직접 쓰지 않고 sizing 참조)
[ ] 비활성 버튼에 이유가 표시되는가
[ ] 빈 목록 / 실패 / 로딩 세 상태가 모두 처리됐는가
[ ] 없는 값이 0 이 아니라 N/A 로 나오는가
[ ] 탭 화면이면 하단 여백에 탭바 높이가 반영됐는가
```
