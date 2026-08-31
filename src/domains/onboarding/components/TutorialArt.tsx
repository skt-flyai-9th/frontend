/**
 * TutorialArt.tsx — 최초 실행 튜토리얼의 화면별 일러스트 **5종**.
 *
 * ─────────────────────────────────────────────────────────────
 * 2026-08-31 전면 교체 — 시안 `온보딩최종.html`
 * ─────────────────────────────────────────────────────────────
 * 시안이 삽화를 다시 짰습니다. 화면이 넷에서 **다섯**으로 늘고(영상 가이드가
 * 새로 들어옴), 애니메이션 타이밍도 전부 다시 잡혔습니다.
 *
 * 원본을 푸는 법 — `온보딩최종.html` 은 22MB 번들입니다. 안에
 * `<script type="__bundler/template">` 로 **JSON 문자열 하나**가 들어 있고 그게
 * 실제 페이지입니다. `JSON.parse` 하면 948줄짜리 HTML 이 나옵니다.
 * 풀어 둔 것: `C:/tmp/onb/page.html`
 *
 * ─────────────────────────────────────────────────────────────
 * 좌표를 그대로 씁니다 — 축소 창이 없습니다
 * ─────────────────────────────────────────────────────────────
 * 예전 시안은 393 폭 화면을 그린 뒤 `scale(.682)` 로 줄여 268 창에 끼웠습니다.
 * 새 시안은 **처음부터 268 폭으로 그렸습니다**(12px 라벨, 48px 입력칸 …).
 * 그래서 여기서도 시안 숫자를 그대로 적습니다 — 축소 래퍼가 없습니다.
 *
 *   카드   268 × 352 (03 만 268 × 196) · radius 26 · 1px #e2e8f0 테두리
 *   뒤광   지름 344 원 · 파랑에서 투명으로 번지는 원. 시안은 `blur(16px)` 인데
 *          RN 에는 그런 필터가 없어 **SVG 방사형 그라디언트**로 대신합니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 여기서 네이티브 드라이버를 쓰지 마세요
 * ─────────────────────────────────────────────────────────────
 * `Animated.loop` 는 반복을 네이티브 모듈에 넘기는데, 그 모듈이 없는
 * react-native-web 에서는 **한 바퀴만 돌고 멈춥니다** (CLAUDE.md §5-④).
 * 게다가 여기서는 막대 폭·높이 같은 **레이아웃 값**도 움직여서 어차피 못 씁니다.
 * 그래서 화면마다 **시계 하나**(0→1 반복)를 두고 모든 조각이 거기서 값을 뽑습니다.
 * 값을 둘로 쪼개면 두 시계가 어긋나고, 한 노드에 두 드라이버를 섞으면 RN 이
 * 예외를 냅니다.
 *
 * 시안의 `animation-delay` 는 **퍼센트를 그만큼 뒤로 민 것**과 같습니다.
 * (예: 5.6s 주기에 .16s 지연 = 2.86% 뒤로). 그렇게 옮겨 적었습니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 색은 시안 원문 그대로입니다
 * ─────────────────────────────────────────────────────────────
 * 이 파일이 그리는 것은 **앱 화면이 아니라 삽화**입니다. 토큰으로 갈아 끼우면
 * 시안과 대조가 안 됩니다. 그래서 아래 `C` 에 시안 hex 를 그대로 두고 씁니다
 * (브랜드 파랑 #2563eb 는 `color.brand[600]` 과 같은 값입니다).
 *
 * 애니메이션은 **보고 있는 화면에서만** 돕니다. 넘어올 때마다 0 부터 시작합니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  LinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';

interface ArtProps {
  /** 지금 보고 있는 화면인지. false 면 애니메이션이 멈추고 0% 로 돌아갑니다. */
  active: boolean;
}

/** 시안 원문 색 (`온보딩최종.html`). 토큰으로 바꾸지 마세요 — 위 머리말 참고. */
const C = {
  brand: '#2563eb',
  brand50: '#eff6ff',
  brand100: '#dbeafe',
  brand200: '#bfdbfe',
  ink: '#0f172a',
  ink700: '#1e293b',
  ink600: '#334155',
  ink500: '#64748b',
  ink400: '#94a3b8',
  line: '#e2e8f0',
  line100: '#f1f5f9',
  paper: '#ffffff',
  surface: '#f8fafc',
  slate300: '#cbd5e1',
  green: '#10b981',
} as const;

/* ────────────────────────────────────────────────────────────
 * 타임라인
 * ──────────────────────────────────────────────────────────── */

/**
 * 시안 `@keyframes` 를 그대로 옮기는 헬퍼.
 *
 *   시안  `s1r1{0%,10%{opacity:0}18%,46%{opacity:1}54%,100%{opacity:0}}`
 *   여기  kf(v, [0, 10, 18, 46, 54, 100], [0, 0, 1, 1, 0, 0])
 *
 * `at` 은 시안과 같은 **퍼센트**로 적습니다. 눈으로 대조할 수 있어야 해서
 * 0~1 로 미리 환산하지 않습니다.
 */
function kf(v: Animated.Value, at: readonly number[], to: readonly number[] | readonly string[]) {
  return v.interpolate({
    inputRange: at.map((p) => p / 100),
    outputRange: to as number[],
    extrapolate: 'clamp',
  });
}

/** 시안의 `animation-delay` — 퍼센트를 그만큼 뒤로 밉니다. */
const shift = (at: readonly number[], by: number) => at.map((p) => Math.min(100, p + by));

/**
 * 화면 하나의 시계 — 0→1 을 `ms` 마다 반복합니다.
 * `useNativeDriver` 를 켜면 안 되는 이유는 파일 첫머리 주석에 있습니다.
 */
function useCycle(active: boolean, ms: number): Animated.Value {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: false })
    );
    loop.start();
    return () => {
      loop.stop();
      v.setValue(0);
    };
  }, [active, ms, v]);

  return v;
}

/* ────────────────────────────────────────────────────────────
 * 공통 조각
 * ──────────────────────────────────────────────────────────── */

/**
 * 카드 뒤로 번지는 파란 빛.
 *
 * 시안: `344×344` 원 + `radial-gradient(#cfe3fd 0%, #dbeafe 42%,
 *       rgba(239,246,255,.75) 66%, rgba(239,246,255,0) 78%)` + `blur(16px)`.
 * RN 에는 CSS 필터가 없어 **그라디언트 자체를 더 부드럽게** 잡아 흉내 냅니다.
 */
function Halo() {
  return (
    <Svg width={344} height={344} style={styles.halo} pointerEvents="none">
      <Defs>
        <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#cfe3fd" stopOpacity="1" />
          <Stop offset="0.42" stopColor={C.brand100} stopOpacity="1" />
          <Stop offset="0.66" stopColor="#eff6ff" stopOpacity="0.75" />
          <Stop offset="0.82" stopColor="#eff6ff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={172} cy={172} r={172} fill="url(#halo)" />
    </Svg>
  );
}

/** 시안의 268 폭 카드. 03 만 높이가 196 입니다. */
function Card({
  height = 352,
  background = C.paper,
  children,
}: {
  height?: number;
  background?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.stage}>
      <Halo />
      <View style={[styles.card, { height, backgroundColor: background }]}>{children}</View>
    </View>
  );
}

/** 시안이 반복해 쓰는 초록 체크 (14~15px). */
function Check({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20 6 9 17l-5-5"
        fill="none"
        stroke={C.green}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 시안의 매장 아이콘(차양). */
function StoreGlyph({ size = 16, tint = C.brand }: { size?: number; tint?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 9h16" fill="none" stroke={tint} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M5 9V6h14v3" fill="none" stroke={tint} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M5 9v9h14V9" fill="none" stroke={tint} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * 새 줄이 **아래에서 위로 떠오릅니다** (2026-08-31 지시: "알약 모양 답변이
 * 선택지 하단에서 위로 올라오게").
 *
 * 시안 원문: `opacity .28s cubic-bezier(.33,1,.68,1)` + `transform .32s
 * cubic-bezier(.2,.9,.25,1)`, `translateY(10px) → 0`.
 *
 * 붙는 순간 딱 한 번 도는 애니메이션이라 **네이티브 드라이버를 그대로 씁니다** —
 * 웹에서 한 바퀴만 도는 함정은 `Animated.loop` 에만 있습니다(CLAUDE.md §5-④).
 */
function Rise({ children }: { children: React.ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(t, {
        toValue: 1,
        duration: 320,
        easing: Easing.bezier(0.2, 0.9, 0.25, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [t]);
  return (
    <Animated.View
      style={{
        opacity: t,
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** 시안의 AI 반짝임. */
function Spark({ size = 15 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.6l1.7 4.6 4.6 1.7-4.6 1.7L12 15.2l-1.7-4.6L5.7 8.9l4.6-1.7z" fill={C.paper} />
    </Svg>
  );
}

/* ════════════════════════════════════════════════════════════
 * 01 매장 등록 — 검색 → 자동완성 → 선택 → 정보 자동 입력 (5.6s)
 * ════════════════════════════════════════════════════════════ */

const S1 = 5600;

/** 시안 `s1r1·s1r2·s1r3` — 자동완성 세 줄이 차례로 떨어집니다. */
const S1_ROWS = [
  [0, 10, 18, 46, 54, 100],
  [0, 15, 23, 46, 54, 100],
  [0, 20, 28, 46, 54, 100],
] as const;

const S1_SUGGESTIONS = [
  ['오니 신림점', '서울 관악구 신림로 330'],
  ['오니 낙성대점', '서울 관악구 남부순환로 1930'],
  ['오니 서울대입구역점', '서울 관악구 관악로 145'],
] as const;

const S1_MENU = [
  ['참치마요 오니기리', '3,900원'],
  ['연어 아보카도 덮밥', '12,000원'],
  ['가라아게 정식', '9,800원'],
] as const;

export function Art01({ active }: ArtProps) {
  const v = useCycle(active, S1);

  /** 시안 `s1page` — 두 쪽짜리 트랙이 왼쪽으로 한 쪽만큼 밀립니다. */
  const PAGE = 236; // 카드 268 − 좌우 패딩 16씩
  const pageX = kf(v, [0, 70, 82, 100], [0, 0, -PAGE, -PAGE]);

  return (
    <Card>
      <View style={s1.body}>
        <Text style={s1.label}>매장 이름</Text>

        {/* 검색칸 — 글자가 s1q 로 떴다 사라집니다 */}
        <View style={s1.search}>
          <Svg width={17} height={17} viewBox="0 0 24 24">
            <Circle cx={11} cy={11} r={7} fill="none" stroke={C.ink500} strokeWidth={2} />
            <Path d="M20 20l-4-4" stroke={C.ink500} strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <Animated.Text
            style={[s1.query, { opacity: kf(v, [0, 4, 10, 96, 100], [0, 0, 1, 1, 0]) }]}
          >
            오니
          </Animated.Text>
        </View>

        <View style={s1.deck}>
          {/* 자동완성 목록 — s1list 로 통째로, 줄마다 s1r1~3 */}
          <Animated.View
            style={[
              s1.list,
              {
                opacity: kf(v, [0, 8, 16, 46, 54, 100], [0, 0, 1, 1, 0, 0]),
                transform: [
                  { scale: kf(v, [0, 8, 16, 46, 54, 100], [0.98, 0.98, 1, 1, 0.98, 0.98]) },
                ],
              },
            ]}
          >
            {S1_SUGGESTIONS.map(([name, addr], i) => (
              <Animated.View
                key={name}
                style={[
                  s1.row,
                  i < 2 && s1.rowDivider,
                  {
                    opacity: kf(v, S1_ROWS[i], [0, 0, 1, 1, 0, 0]),
                    transform: [{ translateY: kf(v, S1_ROWS[i], [-8, -8, 0, 0, 0, 0]) }],
                  },
                ]}
              >
                <View style={s1.rowIcon}>
                  <StoreGlyph />
                </View>
                <View style={s1.rowText}>
                  <Text style={s1.rowName}>{name}</Text>
                  <Text style={s1.rowAddr}>{addr}</Text>
                </View>
              </Animated.View>
            ))}
          </Animated.View>

          {/* 고른 뒤 — s1pick 으로 떠오르고, 안쪽 트랙이 s1page 로 넘어갑니다 */}
          <Animated.View
            style={[
              s1.pick,
              {
                opacity: kf(v, [0, 46, 54, 96, 100], [0, 0, 1, 1, 0]),
                transform: [{ translateY: kf(v, [0, 46, 54, 96, 100], [10, 10, 0, 0, 0]) }],
              },
            ]}
          >
            <Animated.View style={[s1.track, { transform: [{ translateX: pageX }] }]}>
              {/* ① 고른 매장 + 주소·전화 자동 입력 */}
              <View style={[s1.page, { paddingRight: 2 }]}>
                <View style={s1.picked}>
                  <View style={s1.pickedIcon}>
                    <StoreGlyph size={17} tint={C.paper} />
                  </View>
                  <View style={s1.pickedText}>
                    <Text style={s1.pickedName}>오니 신림점</Text>
                    <Check size={15} />
                  </View>
                </View>

                {[
                  ['주소', '서울 관악구 신림로 330'],
                  ['전화번호', '02-882-1234'],
                ].map(([label, value], i) => (
                  <Animated.View
                    key={label}
                    style={{
                      marginTop: i === 0 ? 14 : 10,
                      // 시안: 두 번째는 .16s 늦게 = 5.6s 의 2.86%
                      opacity: kf(v, shift([0, 62, 72, 96, 100], i * 2.86), [0, 0, 1, 1, 0]),
                      transform: [
                        {
                          translateY: kf(
                            v,
                            shift([0, 62, 72, 96, 100], i * 2.86),
                            [12, 12, 0, 0, 0]
                          ),
                        },
                      ],
                    }}
                  >
                    <Text style={s1.fieldLabel}>{label}</Text>
                    <View style={s1.field}>
                      <Text style={s1.fieldValue}>{value}</Text>
                      <Check />
                    </View>
                  </Animated.View>
                ))}
              </View>

              {/* ② 업종·메뉴 자동 입력 */}
              <View style={[s1.page, { paddingLeft: 2 }]}>
                <Animated.View
                  style={{
                    opacity: kf(v, [0, 78, 88, 100], [0, 0, 1, 1]),
                    transform: [{ translateY: kf(v, [0, 78, 88, 100], [8, 8, 0, 0]) }],
                  }}
                >
                  <Text style={s1.fieldLabel}>업종 카테고리</Text>
                  <View style={[s1.field, s1.fieldTall]}>
                    <View style={s1.chips}>
                      <Text style={s1.chip}>한식</Text>
                      <Text style={s1.chip}>덮밥 · 오니기리</Text>
                    </View>
                    <Check />
                  </View>
                </Animated.View>

                <Animated.View
                  style={{
                    marginTop: 12,
                    // 시안: .12s 늦게 = 2.14%
                    opacity: kf(v, shift([0, 78, 88, 100], 2.14), [0, 0, 1, 1]),
                    transform: [
                      { translateY: kf(v, shift([0, 78, 88, 100], 2.14), [8, 8, 0, 0]) },
                    ],
                  }}
                >
                  <Text style={s1.fieldLabel}>메뉴 정보</Text>
                  <View style={s1.menuBox}>
                    {S1_MENU.map(([name, price], i) => (
                      <View key={name} style={[s1.menuRow, i < 2 && s1.menuDivider]}>
                        <Text style={s1.menuName}>{name}</Text>
                        <Text style={s1.menuPrice}>{price}</Text>
                        <Check />
                      </View>
                    ))}
                  </View>
                </Animated.View>
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      </View>

      {/* 시안: 카드 아래 44px 페이드 */}
      <FadeBottom />
    </Card>
  );
}

/** 시안이 01·04 카드 바닥에 두는 44px 페이드. */
function FadeBottom({ color = C.surface }: { color?: string }) {
  return (
    <Svg width={268} height={44} style={styles.fadeBottom} pointerEvents="none">
      <Defs>
        <LinearGradient id="fade" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect width={268} height={44} fill="url(#fade)" />
    </Svg>
  );
}

/* ════════════════════════════════════════════════════════════
 * 02 AI 대화 — 질문·선택·답이 차례로 쌓입니다
 * ════════════════════════════════════════════════════════════ */

/**
 * 시안 `CHAT_D` 원문 — 단계마다 이만큼 뒤에 다음이 나옵니다.
 * 합이 12.64초라 이 화면의 한 바퀴가 그 길이입니다.
 */
const CHAT_D = [
  380, 640, 420, 380, 640, 420, 380, 640, 420, 380, 640, 420, 380, 640, 420, 380, 640, 420, 1200,
  2800,
];

type ChatStep =
  | { kind: 'ai'; text: string }
  | { kind: 'me'; text: string }
  /** 선택지 줄. `until` 단계가 오면 사라집니다(시안 `data-until`). */
  | { kind: 'pick'; options: string[]; until: number }
  | { kind: 'dots' }
  | { kind: 'cards' };

const CHAT: ChatStep[] = [
  { kind: 'ai', text: '오늘 어떤 영상을 찍을까요?' },
  { kind: 'pick', options: ['홍보하고 싶은 게 있어요', '직접 입력'], until: 2 },
  { kind: 'me', text: '홍보하고 싶은 게 있어요' },
  { kind: 'ai', text: '무엇을 홍보하고 싶으세요?' },
  { kind: 'pick', options: ['참치마요 오니기리', '신상 도시락', '매장 분위기'], until: 5 },
  { kind: 'me', text: '참치마요 오니기리' },
  { kind: 'ai', text: '이 영상으로 무엇을 하고 싶으세요?' },
  { kind: 'pick', options: ['메뉴 알리기', '팔기', '단골 만들기'], until: 8 },
  { kind: 'me', text: '메뉴 알리기' },
  { kind: 'ai', text: '촬영에 쓸 수 있는 시간은요?' },
  { kind: 'pick', options: ['10분 이내', '30분 이내', '상관없어요'], until: 11 },
  { kind: 'me', text: '10분 이내' },
  { kind: 'ai', text: '얼굴 노출은 괜찮으세요?' },
  { kind: 'pick', options: ['얼굴 노출 가능', '손만 노출'], until: 14 },
  { kind: 'me', text: '얼굴 노출 가능' },
  { kind: 'ai', text: '준비됐어요. 바로 추천해 드릴까요?' },
  { kind: 'pick', options: ['이대로 추천받기', '조건 바꾸기'], until: 17 },
  { kind: 'me', text: '이대로 추천받기' },
  { kind: 'dots' },
  { kind: 'cards' },
];

export function Art02({ active }: ArtProps) {
  /**
   * 시안은 `setTimeout` 사슬로 단계를 넘깁니다. 여기서도 같은 표(`CHAT_D`)를
   * 그대로 씁니다 — 한 바퀴가 끝나면 처음으로 돌아갑니다.
   */
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    let i = 0;
    const tick = () => {
      t = setTimeout(() => {
        i = i + 1 >= CHAT.length ? 0 : i + 1;
        setStep(i);
        tick();
      }, CHAT_D[i] ?? 600);
    };
    tick();
    return () => clearTimeout(t);
  }, [active]);

  /** 시안 `b2dot` — 생각 중 점 셋. 0.95초짜리 별도 주기입니다. */
  const dots = useCycle(active, 950);

  /*
    시안은 새 말풍선이 나올 때마다 대화창을 아래로 굴립니다. 여기서는 목록을
    **아래에 붙여** 같은 결과를 냅니다 — 새 줄이 생기면 위가 밀려 올라갑니다.
    (높이를 재서 굴리면 시계가 둘이 되고 웹에서 어긋납니다)
  */
  const visible = CHAT.map((c, i) => ({ c, i })).filter(
    ({ c, i }) => i <= step && !(c.kind === 'pick' && step >= c.until)
  );

  return (
    <Card background={C.surface}>
      <View style={s2.pad}>
        {visible.map(({ c, i }) => {
          if (c.kind === 'ai') {
            return (
              <Rise key={i}>
              <View style={s2.aiRow}>
                <View style={s2.avatar}>
                  <Spark />
                </View>
                <Text style={s2.aiBubble}>{c.text}</Text>
              </View>
              </Rise>
            );
          }
          if (c.kind === 'me') {
            return (
              <Rise key={i}>
                <View style={s2.meRow}>
                  <Text style={s2.meBubble}>{c.text}</Text>
                </View>
              </Rise>
            );
          }
          if (c.kind === 'pick') {
            return (
              <Rise key={i}>
              <View style={s2.pickRow}>
                {c.options.map((o, oi) => (
                  <Text key={o} style={[s2.chip, oi === 0 ? s2.chipOn : s2.chipOff]}>
                    {o}
                  </Text>
                ))}
              </View>
              </Rise>
            );
          }
          if (c.kind === 'dots') {
            return (
              <Rise key={i}>
              <View style={s2.aiRow}>
                <View style={s2.avatar}>
                  <Spark />
                </View>
                <View style={s2.dotsBubble}>
                  {[0, 1, 2].map((d) => (
                    <Animated.View
                      key={d}
                      style={[
                        s2.dot,
                        {
                          // 시안: .14s 씩 늦게 = 0.95s 의 14.7%
                          opacity: kf(dots, shift([0, 50, 100], d * 14.7), [0.28, 1, 0.28]),
                          transform: [
                            {
                              translateY: kf(dots, shift([0, 50, 100], d * 14.7), [0, -3.5, 0]),
                            },
                          ],
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
              </Rise>
            );
          }
          return (
            <Rise key={i}>
            <View style={s2.cardsRow}>
              {[0, 1, 2].map((k) => (
                <View key={k} style={s2.recCard}>
                  <Svg width={74} height={132} style={StyleSheet.absoluteFill}>
                    <Defs>
                      <LinearGradient id={`rec${k}`} x1="0" y1="0" x2="0.6" y2="1">
                        <Stop offset="0" stopColor={C.slate300} />
                        <Stop offset="0.55" stopColor={C.ink400} />
                        <Stop offset="1" stopColor={C.ink500} />
                      </LinearGradient>
                    </Defs>
                    <Rect width={74} height={132} rx={12} fill={`url(#rec${k})`} />
                  </Svg>
                  <View style={s2.playBtn}>
                    <Svg width={12} height={14} viewBox="0 0 12 14">
                      <Path d="M0 0l12 7-12 7z" fill={C.paper} />
                    </Svg>
                  </View>
                </View>
              ))}
            </View>
            </Rise>
          );
        })}
      </View>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
 * 03 영상 가이드 — 컷 카드가 옆으로 넘어갑니다 (12s)
 * ════════════════════════════════════════════════════════════ */

const S3 = 12000;

/** 시안 원문. 다섯 번째는 첫 장을 복제한 것이라 무한히 이어집니다. */
const S3_CUTS = [
  ['01', '인트로 포인트', '첫 박에 박수를 크게 쳐야 시선이 붙어요. 손은 얼굴 높이까지 올려주세요.', 0, '가이드 촬영 시작하기'],
  ['02', '메인 안무', '스텝보다 어깨 반동이 중요해요. 두 박자마다 어깨를 확실히 끊어주세요.', 1, '안무 익혔어요, 촬영 시작'],
  ['03', '포인트 동작', '이 구간이 썸네일로 쓰여요. 카메라 정면을 보고 천천히 튕겨주세요.', 2, '안무 익혔어요, 촬영 시작'],
  ['04', '마무리', '마지막 0.5초는 정지 상태로 두면 반복 재생이 자연스러워져요.', 3, '안무 익혔어요, 촬영 시작'],
  ['01', '인트로 포인트', '첫 박에 박수를 크게 쳐야 시선이 붙어요. 손은 얼굴 높이까지 올려주세요.', 0, '안무 익혔어요, 촬영 시작'],
] as const;

export function Art03({ active }: ArtProps) {
  const v = useCycle(active, S3);

  /** 시안 `s3gslide` — 한 장(268)씩 네 번 밀립니다. */
  const x = kf(
    v,
    [0, 17, 24, 41, 48, 65, 72, 89, 96, 100],
    [0, 0, -268, -268, -536, -536, -804, -804, -1072, -1072]
  );

  return (
    <Card height={196}>
      {/*
        🔴 **버튼은 고정, 지시사항만 넘어갑니다** (2026-08-31 지시:
           "가이드 영상 넘길 때 버튼은 움직이지 않고 지시사항 부분만").

        예전에는 카드 한 장을 통째로 밀어서 버튼까지 같이 흘렀습니다. 이제 카드를
        세 층으로 나눕니다 — **위 띠(고정) · 지시사항(넘어감) · 버튼(고정)**.
        넘어가는 층만 트랙에 얹습니다.

        버튼 글자는 시안이 장마다 달랐는데(01 만 "가이드 촬영 시작하기"), 고정하는
        이상 하나로 둬야 해서 **첫 장의 것**을 씁니다.
      */}

      {/* ① 위 띠 — 영상이 잘려 보이는 자리. 고정입니다 */}
      <View style={s3.bar}>
        <Svg width={268} height={14}>
          <Defs>
            <LinearGradient id="s3bar" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={C.ink600} />
              <Stop offset="1" stopColor={C.ink700} />
            </LinearGradient>
          </Defs>
          <Rect width={268} height={14} fill="url(#s3bar)" />
        </Svg>
      </View>

      {/* ② 지시사항 — 이 층만 넘어갑니다 */}
      <View style={s3.window}>
        <Animated.View style={[s3.track, { transform: [{ translateX: x }] }]}>
          {S3_CUTS.map(([no, title, body, dot], i) => (
            <View key={i} style={s3.body}>
              <View style={s3.head}>
                <Text style={s3.no}>{no}</Text>
                <Text style={s3.title}>{title}</Text>
              </View>
              <Text style={s3.desc}>{body}</Text>
              <View style={s3.dots}>
                {[0, 1, 2, 3].map((d) => (
                  <View key={d} style={[s3.dot, d === dot && s3.dotOn]} />
                ))}
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* ③ 버튼 — 고정입니다 */}
      <View style={s3.ctaWrap}>
        <Text style={s3.cta}>가이드 촬영 시작하기</Text>
      </View>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
 * 04 자동 편집 — 다섯 단계가 차례로 끝납니다 (7s)
 * ════════════════════════════════════════════════════════════ */

const S4 = 7000;

const S4_TASKS = [
  ['컷 편집', [0, 3, 7, 100], [0, 2, 5, 17, 20, 100], [0, 18, 23, 100]],
  ['컷 사이 흔들림 효과 삽입', [0, 19, 23, 100], [0, 18, 21, 33, 36, 100], [0, 34, 39, 100]],
  ['자막 입히기', [0, 35, 39, 100], [0, 34, 37, 49, 52, 100], [0, 50, 55, 100]],
  ['위치 태그 · 매장 브랜딩 삽입', [0, 51, 55, 100], [0, 50, 53, 65, 68, 100], [0, 66, 71, 100]],
  ['최종 렌더링', [0, 67, 71, 100], [0, 66, 69, 83, 86, 100], [0, 84, 89, 100]],
] as const;

export function Art04({ active }: ArtProps) {
  const v = useCycle(active, S4);
  /** 시안 `s5sk` — 1.5초짜리 별도 주기(스켈레톤 숨쉬기). */
  const sk = useCycle(active, 1500);
  /** 시안 `s5spin` — 0.85초 한 바퀴. */
  const spin = useCycle(active, 850);
  const turn = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Card background={C.surface}>
      <View style={s4.body}>
        {/* 위쪽 미리보기 자리 — 막대 셋이 숨을 쉽니다 */}
        <View style={s4.preview}>
          {[C.brand200, C.ink400, C.slate300].map((bg, i) => (
            <Animated.View
              key={bg}
              style={[
                s4.skel,
                {
                  backgroundColor: bg,
                  // 시안: .18s 씩 늦게 = 1.5s 의 12%
                  opacity: kf(sk, shift([0, 50, 100], i * 12), [0.45, 1, 0.45]),
                  transform: [{ scaleY: kf(sk, shift([0, 50, 100], i * 12), [0.88, 1, 0.88]) }],
                },
              ]}
            />
          ))}
        </View>

        <View style={s4.tasks}>
          {S4_TASKS.map(([label, rowAt, spinAt, checkAt]) => (
            <Animated.View
              key={label}
              style={[s4.taskRow, { opacity: kf(v, rowAt, [0.4, 0.4, 1, 1]) }]}
            >
              <View style={s4.mark}>
                {/* 바탕 원 */}
                <View style={s4.markRing} />
                {/* 도는 조각 — 그 단계 동안만 보입니다 */}
                <Animated.View
                  style={[
                    s4.markSpin,
                    { opacity: kf(v, spinAt, [0, 0, 1, 1, 0, 0]), transform: [{ rotate: turn }] },
                  ]}
                />
                {/* 끝나면 체크가 톡 튀어나옵니다 */}
                <Animated.View
                  style={[
                    s4.markDone,
                    {
                      opacity: kf(v, checkAt, [0, 0, 1, 1]),
                      transform: [{ scale: kf(v, checkAt, [0.5, 0.5, 1, 1]) }],
                    },
                  ]}
                >
                  <Svg width={11} height={11} viewBox="0 0 24 24">
                    <Path
                      d="M20 6 9 17l-5-5"
                      fill="none"
                      stroke={C.paper}
                      strokeWidth={3.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Animated.View>
              </View>
              <Text style={s4.taskLabel}>{label}</Text>
            </Animated.View>
          ))}
        </View>

        {/*
          진행바 — 시안 s5bar.

          🔴 **`scaleX` 를 쓰면 안 됩니다** (2026-08-31 지적: "가운데에서 퍼진다").
             시안 CSS 는 `transform-origin: left` 라 왼쪽에서 자라는데, RN 의
             `scaleX` 는 **가운데를 기준**으로 늘어나 양쪽으로 퍼집니다.
             `transform-origin` 이 없어서 **폭을 직접** 움직입니다.
        */}
        <View style={s4.barTrack}>
          <Animated.View
            style={[s4.barFill, { width: kf(v, [0, 4, 86, 100], ['4%', '4%', '100%', '100%']) }]}
          />
        </View>

        <View style={s4.cta}>
          <Text style={s4.ctaText}>편집 중...</Text>
        </View>
      </View>

      <FadeBottom />
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
 * 05 인사이트 — 상권·방문층 → 지표 → 다음 숏폼 추천 (7.6s)
 * ════════════════════════════════════════════════════════════ */

const S5 = 7600;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const S5_AGES = [
  ['10대', 8, 0.168, false],
  ['20대', 40, 0.84, true],
  ['30대', 28, 0.588, false],
  ['40대', 16, 0.336, false],
  ['50 +', 8, 0.168, false],
] as const;

const LINE_D =
  'M15,62 C31,62 30,44 46,44 C62,44 61,54 77,54 C93,54 92,32 108,32 C124,32 123,30 139,30 C155,30 154,12 170,12 C186,12 185,26 201,26';
const AREA_D = `${LINE_D} L201,74 L15,74 Z`;
const DOTS: readonly (readonly [number, number])[] = [
  [15, 62],
  [46, 44],
  [77, 54],
  [108, 32],
  [139, 30],
  [170, 12],
  [201, 26],
];

export function Art05({ active }: ArtProps) {
  const v = useCycle(active, S5);

  /** 시안 `s6scroll` — 카드 안이 세 번에 나눠 굴러 내려갑니다. */
  const scrollY = kf(v, [0, 34, 46, 62, 74, 100], [0, 0, -276, -276, -310, -310]);

  return (
    <Card background={C.surface}>
      <Animated.View style={[s5.pad, { transform: [{ translateY: scrollY }] }]}>
        {/* ① 지역 상권 분석 */}
        <View style={s5.headRow}>
          <Text style={s5.h}>지역 상권 분석</Text>
          <Text style={s5.pill}>신림역</Text>
        </View>
        <Animated.Text
          style={[
            s5.note,
            {
              opacity: kf(v, [0, 2, 12, 100], [0, 0, 1, 1]),
              transform: [{ translateY: kf(v, [0, 2, 12, 100], [6, 6, 0, 0]) }],
            },
          ]}
        >
          신림역은 20대 초중반 대학생·사회초년생과 친구 모임 수요가 큰 고경쟁 청년 상권으로,
          주점은 새로움과 가성비·비주얼, 역세권·심야 접근성을 빠르게 보여주는 것이 중요합니다.
        </Animated.Text>

        {/* ② 주요 방문층 */}
        <Text style={[s5.h, s5.h2]}>우리 매장 주요 방문층</Text>
        <View style={s5.mixRow}>
          <View style={s5.donutBox}>
            <View style={s5.donut}>
              <Svg width={62} height={62} viewBox="0 0 74 74">
                <Circle cx={37} cy={37} r={28} fill="none" stroke={C.brand100} strokeWidth={11} />
                <AnimatedCircle
                  cx={37}
                  cy={37}
                  r={28}
                  fill="none"
                  stroke={C.brand}
                  strokeWidth={11}
                  strokeLinecap="round"
                  strokeDasharray="175.9"
                  // 시안 s6ring — 원이 56% 만큼 그려집니다
                  strokeDashoffset={kf(v, [0, 8, 30, 100], [175.9, 175.9, 77.4, 77.4]) as never}
                  transform="rotate(-90 37 37)"
                />
              </Svg>
              <Text style={s5.donutText}>56%</Text>
            </View>
            <View style={s5.legend}>
              <View style={s5.legendRow}>
                <View style={[s5.swatch, { backgroundColor: C.brand }]} />
                <Text style={s5.legendOn}>남성</Text>
              </View>
              <View style={s5.legendRow}>
                <View style={[s5.swatch, { backgroundColor: C.brand200 }]} />
                <Text style={s5.legendOff}>여성</Text>
              </View>
            </View>
          </View>

          <View style={s5.ages}>
            {S5_AGES.map(([label, pct, w, on], i) => (
              <View key={label} style={s5.ageRow}>
                <View style={[s5.ageDot, { backgroundColor: on ? C.brand : C.slate300 }]} />
                <Text style={[s5.ageLabel, on && s5.ageLabelOn]}>{label}</Text>
                <View style={s5.ageTrack}>
                  <Animated.View
                    style={[
                      s5.ageFill,
                      {
                        backgroundColor: on ? C.brand : C.brand200,
                        /*
                          진행바와 같은 이유로 **폭을 직접** 움직입니다 —
                          `scaleX` 는 가운데에서 퍼집니다(위 s5bar 주석).
                          시안: .06s 씩 늦게 = 7.6s 의 0.79%
                        */
                        width: kf(v, shift([0, 10, 30, 100], i * 0.79), [
                          `${w * 2}%`,
                          `${w * 2}%`,
                          `${w * 100}%`,
                          `${w * 100}%`,
                        ]),
                      },
                    ]}
                  />
                </View>
                <Text style={[s5.agePct, on && s5.agePctOn]}>{pct}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ③ 주간 조회수 추이 */}
        <View style={s5.chartCard}>
          <View style={s5.chartHead}>
            <Text style={s5.chartTitle}>주간 조회수 추이</Text>
            <Text style={s5.chartDelta}>+14%</Text>
          </View>
          <Svg width={220} height={62} viewBox="0 0 216 76">
            <Defs>
              <LinearGradient id="s6g" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={C.brand} stopOpacity="0.16" />
                <Stop offset="1" stopColor={C.brand} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <AnimatedPath
              d={AREA_D}
              fill="url(#s6g)"
              opacity={kf(v, [0, 44, 60, 100], [0, 0, 1, 1]) as never}
            />
            <AnimatedPath
              d={LINE_D}
              fill="none"
              stroke={C.brand}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeDasharray="300"
              strokeDashoffset={kf(v, [0, 40, 58, 100], [300, 300, 0, 0]) as never}
            />
            {DOTS.map(([cx, cy], i) => (
              <AnimatedCircle
                key={cx}
                cx={cx}
                cy={cy}
                r={2.6}
                fill={C.paper}
                stroke={C.brand}
                strokeWidth={1.8}
                // 시안: .04s 씩 늦게 = 0.53%
                opacity={kf(v, shift([0, 48, 60, 100], i * 0.53), [0, 0, 1, 1]) as never}
              />
            ))}
          </Svg>
          <View style={s5.days}>
            {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
              <Text key={d} style={s5.day}>
                {d}
              </Text>
            ))}
          </View>
        </View>

        {/* ④ 지표 두 칸 */}
        <View style={s5.kpiRow}>
          {[
            ['총 조회수', '2,480회', '+14%'],
            ['좋아요 수', '312개', '+9%'],
          ].map(([label, value, delta]) => (
            <View key={label} style={s5.kpi}>
              <Text style={s5.kpiLabel}>{label}</Text>
              <View style={s5.kpiValueRow}>
                <Text style={s5.kpiValue}>{value}</Text>
                <Text style={s5.kpiDelta}>{delta}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ⑤ 다음 숏폼 추천 */}
        <Text style={[s5.h, s5.h2]}>다음 숏폼 추천</Text>
        <Animated.View
          style={[
            s5.rec,
            {
              opacity: kf(v, [0, 72, 84, 100], [0, 0, 1, 1]),
              transform: [{ translateY: kf(v, [0, 72, 84, 100], [12, 12, 0, 0]) }],
            },
          ]}
        >
          <View style={s5.recThumb}>
            <Svg width={76} height={135} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="s6rec" x1="0" y1="0" x2="0.6" y2="1">
                  <Stop offset="0" stopColor={C.slate300} />
                  <Stop offset="0.55" stopColor={C.ink400} />
                  <Stop offset="1" stopColor={C.ink500} />
                </LinearGradient>
              </Defs>
              <Rect width={76} height={135} rx={12} fill="url(#s6rec)" />
            </Svg>
            <View style={s5.recPlay}>
              <Svg width={11} height={13} viewBox="0 0 12 14">
                <Path d="M0 0l12 7-12 7z" fill={C.paper} />
              </Svg>
            </View>
          </View>
          <View style={s5.recText}>
            <Text style={s5.recBadge}>추천 1</Text>
            <Text style={s5.recName}>참치마요 오니기리</Text>
            <Text style={s5.recSub}>20대 초중반 · 15초 · 가성비 강조</Text>
          </View>
        </Animated.View>
      </Animated.View>

      <FadeBottom />
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────
 * 값 — 전부 시안 원문 숫자입니다
 * ──────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  card: {
    width: 268,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
    // 시안: 0 22px 50px -18px rgba(15,23,42,.4)
    shadowColor: C.ink,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  fadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

const s1 = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 20 },
  label: { marginLeft: 2, marginBottom: 6, fontSize: 12, fontWeight: '500', color: C.ink500 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    backgroundColor: C.surface,
  },
  query: { flex: 1, fontSize: 15, fontWeight: '500', color: C.ink },
  deck: { marginTop: 10, height: 260 },
  list: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: C.paper,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 11 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(226,232,240,0.6)' },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: C.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '600', color: C.ink },
  rowAddr: { marginTop: 1, fontSize: 12, color: C.ink500 },

  pick: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  track: { flexDirection: 'row', width: 472 },
  page: { width: 236 },
  picked: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: C.brand200,
    borderRadius: 16,
    backgroundColor: C.brand50,
  },
  pickedIcon: {
    marginTop: 2,
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickedText: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 },
  pickedName: { fontSize: 15, fontWeight: '700', color: C.ink },

  fieldLabel: { marginLeft: 2, marginBottom: 5, fontSize: 12, fontWeight: '500', color: C.ink500 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: C.brand200,
    borderRadius: 12,
    backgroundColor: C.surface,
  },
  fieldTall: { height: undefined, minHeight: 44, paddingVertical: 8 },
  fieldValue: { flex: 1, fontSize: 13.5, fontWeight: '500', color: C.ink },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.brand50,
    fontSize: 12,
    fontWeight: '600',
    color: C.brand,
    overflow: 'hidden',
  },
  menuBox: {
    borderWidth: 1,
    borderColor: C.brand200,
    borderRadius: 12,
    backgroundColor: C.surface,
    overflow: 'hidden',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 9 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(191,219,254,0.6)' },
  menuName: { flex: 1, fontSize: 13, fontWeight: '500', color: C.ink },
  menuPrice: { fontSize: 12.5, fontWeight: '600', color: C.ink600 },
});

const s2 = StyleSheet.create({
  // 시안: padding 16 14, gap 8. 아래에 붙여 새 줄이 위를 밀어 올리게 합니다.
  pad: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 14, paddingVertical: 16, gap: 8 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBubble: {
    maxWidth: '80%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    borderBottomLeftRadius: 5,
    backgroundColor: C.paper,
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 19,
    color: C.ink700,
    overflow: 'hidden',
  },
  meRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  meBubble: {
    maxWidth: '80%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    borderBottomRightRadius: 5,
    backgroundColor: C.brand,
    color: C.paper,
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 19,
    overflow: 'hidden',
  },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 36 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: '600',
    overflow: 'hidden',
  },
  chipOn: { borderColor: C.brand200, backgroundColor: C.paper, color: C.brand },
  chipOff: { borderColor: C.line, backgroundColor: C.paper, color: C.ink600 },
  dotsBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 5,
    backgroundColor: C.paper,
  },
  dot: { width: 5, height: 5, borderRadius: 999, backgroundColor: C.ink400 },
  cardsRow: { flexDirection: 'row', gap: 8 },
  recCard: { width: 74, height: 132, borderRadius: 12, overflow: 'hidden' },
  playBtn: {
    position: 'absolute',
    left: 20,
    top: 49,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
});

const s3 = StyleSheet.create({
  bar: { height: 14, overflow: 'hidden' },
  /* 카드 196 − 위 띠 14 − 버튼 자리 56 = 126 */
  window: { height: 126, overflow: 'hidden' },
  track: { flexDirection: 'row', width: 1340, height: 126 },
  body: { width: 268, height: 126, paddingHorizontal: 16, paddingTop: 14 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  no: { fontSize: 13, fontWeight: '800', color: C.brand },
  title: { fontSize: 16, fontWeight: '700', color: C.ink },
  desc: { marginTop: 7, fontSize: 12.5, lineHeight: 19, fontWeight: '500', color: C.ink500 },
  dots: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: C.slate300 },
  dotOn: { width: 16, backgroundColor: C.brand },
  ctaWrap: { paddingHorizontal: 16, paddingBottom: 14 },
  cta: {
    height: 42,
    lineHeight: 42,
    textAlign: 'center',
    borderRadius: 12,
    backgroundColor: C.brand,
    fontSize: 13.5,
    fontWeight: '700',
    color: C.paper,
    overflow: 'hidden',
  },
});

const s4 = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 18 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 104,
    borderRadius: 16,
    backgroundColor: C.paper,
  },
  skel: { width: 26, height: 56, borderRadius: 13 },
  tasks: { marginTop: 16, gap: 14 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 18, height: 18 },
  markRing: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.slate300,
  },
  markSpin: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 1.8,
    borderColor: 'transparent',
    borderTopColor: C.brand,
  },
  markDone: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskLabel: { fontSize: 13, fontWeight: '600', color: C.ink },
  barTrack: { marginTop: 18, height: 6, borderRadius: 999, backgroundColor: C.line, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 999, backgroundColor: C.brand },
  cta: {
    marginTop: 16,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 13.5, fontWeight: '700', color: C.ink400 },
});

const s5 = StyleSheet.create({
  pad: { paddingHorizontal: 14, paddingTop: 14 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 2, marginBottom: 7 },
  h: { fontSize: 13.5, fontWeight: '700', color: C.ink },
  h2: { marginTop: 14, marginBottom: 7, marginHorizontal: 2 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.brand50,
    fontSize: 11,
    fontWeight: '700',
    color: C.brand,
    overflow: 'hidden',
  },
  note: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
    borderRadius: 14,
    backgroundColor: C.paper,
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: '500',
    color: C.ink600,
    overflow: 'hidden',
  },
  mixRow: { flexDirection: 'row', gap: 8 },
  donutBox: {
    width: 96,
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
    borderRadius: 14,
    backgroundColor: C.paper,
  },
  donut: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  donutText: {
    position: 'absolute',
    fontSize: 13,
    fontWeight: '700',
    color: C.brand,
  },
  legend: { gap: 3 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 6, height: 6, borderRadius: 2 },
  legendOn: { fontSize: 10, fontWeight: '600', color: C.ink700 },
  legendOff: { fontSize: 10, fontWeight: '500', color: C.ink400 },
  ages: {
    flex: 1,
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
    borderRadius: 14,
    backgroundColor: C.paper,
  },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ageDot: { width: 5, height: 5, borderRadius: 999 },
  ageLabel: { width: 26, fontSize: 10, fontWeight: '500', color: C.ink500 },
  ageLabelOn: { fontWeight: '600', color: C.ink },
  ageTrack: { flex: 1, height: 6, borderRadius: 999, backgroundColor: C.line100, overflow: 'hidden' },
  ageFill: { height: 6, borderRadius: 999 },
  agePct: { width: 24, textAlign: 'right', fontSize: 10, fontWeight: '500', color: C.ink500 },
  agePctOn: { fontWeight: '700', color: C.brand },

  chartCard: {
    marginTop: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
    borderRadius: 16,
    backgroundColor: C.paper,
  },
  chartHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 1,
    marginTop: 2,
    marginBottom: 6,
  },
  chartTitle: { fontSize: 12.5, fontWeight: '700', color: C.ink },
  chartDelta: { fontSize: 11, fontWeight: '700', color: C.green },
  days: { flexDirection: 'row', paddingTop: 4 },
  day: { flex: 1, textAlign: 'center', fontSize: 9.5, fontWeight: '500', color: C.ink400 },

  kpiRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  kpi: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
    borderRadius: 14,
    backgroundColor: C.paper,
  },
  kpiLabel: { fontSize: 10.5, fontWeight: '500', color: C.ink500 },
  kpiValueRow: { marginTop: 4, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  kpiValue: { fontSize: 16, fontWeight: '700', color: C.ink },
  kpiDelta: { marginBottom: 2, fontSize: 10.5, fontWeight: '700', color: C.green },

  rec: { flexDirection: 'row', gap: 10, paddingBottom: 14 },
  recThumb: { width: 76, height: 135, borderRadius: 12, overflow: 'hidden' },
  recPlay: {
    position: 'absolute',
    left: 22,
    top: 51,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  recText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
    borderRadius: 14,
    backgroundColor: C.paper,
  },
  recBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.brand50,
    fontSize: 10.5,
    fontWeight: '700',
    color: C.brand,
    overflow: 'hidden',
  },
  recName: { fontSize: 12.5, fontWeight: '700', color: C.ink },
  recSub: { fontSize: 11, lineHeight: 16.5, fontWeight: '500', color: C.ink500 },
});
