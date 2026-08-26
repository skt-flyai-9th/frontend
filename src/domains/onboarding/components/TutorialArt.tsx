/**
 * TutorialArt.tsx — 최초 실행 튜토리얼의 화면별 일러스트 4종.
 *
 * ─────────────────────────────────────────────────────────────
 * 2026-08-27 전면 교체 — 추상 도형에서 **실제 앱 화면 크롭**으로
 * ─────────────────────────────────────────────────────────────
 * 시안이 8차에서 삽화를 통째로 갈았습니다. 예전에는 막대·원 같은 추상 도형이
 * 움직였는데, 지금은 **우리 앱 화면을 393px 폭 그대로 그린 뒤 창에 맞춰 축소·크롭**
 * 하고 그 안에서 검색이 자동완성되고 선택되고 메뉴가 채워지는 과정이 돕니다.
 *
 * 원본은 시안 번들의 `js/screens-intro.jsx` 입니다 (8차·9차가 완전히 같습니다).
 * 6차의 옛 버전(`intro6`)이 이 파일의 이전 구현이었습니다.
 *
 *   시안  <ScreenCrop> = 지름 286 원 + 268×320 창(radius 26) + 안쪽 width 393
 *                       transform: scale(.682), transformOrigin: top left
 *   여기  ScreenCrop 이 같은 일을 합니다. 안쪽 화면은 **앱 좌표 그대로** 적습니다
 *         (15px 글자는 15 로 적고, 축소는 창이 합니다). 그래야 시안과 대조됩니다.
 *
 * **슬라이드 문구 4개는 글자 하나 안 바뀌었습니다** — `TutorialScreen` 은 그대로입니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 여기서 네이티브 드라이버를 쓰지 마세요
 * ─────────────────────────────────────────────────────────────
 * `Animated.loop` 는 네이티브 드라이버 애니메이션의 **반복을 네이티브 모듈에
 * 넘깁니다.** 그 모듈이 없는 react-native-web 에서는 **한 바퀴만 돌고 멈춥니다.**
 *
 * 2026-08-25 에 실제로 그렇게 났습니다 — 첫 화면 삽화가 텅 비어 있길래 인라인
 * 스타일을 시간차로 떠 보니, 폭(JS 드라이버)은 계속 변하는데 opacity·transform
 * (네이티브 드라이버)만 진행도 1 에 굳어 있었습니다.
 *
 * 이번 삽화도 사정이 같습니다. 진행바(`onBar`)는 **width**, 막대그래프(`bC1~7`)는
 * **height** 를 바꿉니다 — 레이아웃 속성이라 어차피 네이티브 드라이버를 못 씁니다.
 * 값을 둘로 쪼개면 두 시계가 어긋날 위험만 생기고, 한 노드에 두 드라이버를 섞으면
 * RN 이 예외를 냅니다. 그래서 **시계 하나로 통일**했습니다.
 *
 * 손가락을 따라오는 페이지 전환(`TutorialScreen` 의 `trackX`)은 반복이 아니라
 * 한 번짜리 timing 이라 그대로 네이티브 드라이버입니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 목업 값은 시안 원문 그대로입니다
 * ─────────────────────────────────────────────────────────────
 * 가게 이름·메뉴·추천 카드·상권 수치를 시안 `js/data.js` 에서 그대로 옮겼습니다.
 * 화면만 맞추고 데이터를 다르게 두면 3단 비교에서 "다른 화면" 으로 보입니다.
 *
 * 애니메이션은 **현재 화면에서만** 돕니다. 넘어올 때마다 0 부터 다시 시작합니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import {
  Camera,
  Circle,
  CircleCheck,
  Eye,
  MapPin,
  Search,
  Sparkles,
  Store,
  Users,
  X,
} from 'lucide-react-native';

import { PlayTri } from '../../../ui/RealsLogo';
import { phoneText } from '../../../lib/format';
import { color, radius, space, text } from '../../../design/theme';

/** 시안 `onAnim`: `4.6s linear infinite` — 인트로 키프레임이 전부 이 주기입니다. */
const CYCLE = 4600;

/** 시안 ScreenCrop: 지름 286 원 · 268×320 창 · 안쪽 앱 폭 393 을 .682 로 축소. */
const HALO = 286;
const WIN_W = 268;
const WIN_H = 320;
const APP_W = 393;
const ZOOM = 0.682;

interface ArtProps {
  /** 지금 보고 있는 화면인지. false 면 애니메이션이 멈추고 0% 로 돌아갑니다. */
  active: boolean;
}

/* ────────────────────────────────────────────────────────────
 * 타임라인
 * ──────────────────────────────────────────────────────────── */

/**
 * 시안 `@keyframes` 를 그대로 옮기는 헬퍼.
 *
 *   시안  `onR1{0%,10%{opacity:0}18%,46%{opacity:1}54%,100%{opacity:0}}`
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

/**
 * 화면 하나의 시계 — 0→1 을 4.6초마다 반복합니다.
 * `useNativeDriver` 를 켜면 안 되는 이유는 파일 첫머리 주석에 있습니다.
 */
function useCycle(active: boolean): Animated.Value {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: CYCLE,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      v.setValue(0);
    };
  }, [active, v]);

  return v;
}

/**
 * 04 의 조회수 카운터.
 *
 * 시안은 `setInterval(40ms)` 로 별도 시계를 돌리지만, 여기서는 **같은 시계**에
 * 리스너를 붙입니다(시계를 둘로 두면 어긋납니다). 대신 40ms 보다 자주는 그리지
 * 않습니다 — 숫자가 초당 25번보다 빨리 바뀌어도 눈에 보이지 않고 렌더만 늘어납니다.
 *
 * 시안 곡선: `p = (t - .05) / .45` 를 0~1 로 자르고 `1-(1-p)³` (ease-out cubic).
 */
function useCountUp(v: Animated.Value, active: boolean, to: number): number {
  const [n, setN] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    if (!active) {
      setN(0);
      return;
    }
    const id = v.addListener(({ value }) => {
      const now = Date.now();
      if (now - last.current < 40) return;
      last.current = now;
      const p = Math.min(1, Math.max(0, (value - 0.05) / 0.45));
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
    });
    return () => v.removeListener(id);
  }, [v, active, to]);

  return n;
}

/** 1000 단위 쉼표. `toLocaleString` 은 안드로이드 Intl 설정을 타서 직접 넣습니다. */
function comma(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 삽화 전용 그림자.
 *
 * theme 의 elevation 토큰은 전부 ink 계열에 opacity .04~.06 이라 시안의 진한
 * 그림자가 나오지 않습니다(거의 안 보입니다). 그래서 여기서만 시안 값을 직접
 * 씁니다 (CLAUDE.md §6 — 덮되 근거를 남깁니다).
 *
 * CSS 의 spread(-18·-2)는 RN 에 대응이 없어 뺐습니다. 시안보다 아주 조금 넓게
 * 퍼집니다.
 */
function glow(hex: string, shadowOpacity: number, blur: number, offsetY: number, android: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: hex,
      shadowOpacity,
      shadowRadius: blur / 2,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation: android, shadowColor: hex },
    default: {},
  })!;
}

/* ────────────────────────────────────────────────────────────
 * 무대 — 실제 앱 화면을 창에 맞춰 축소·크롭
 * ──────────────────────────────────────────────────────────── */

/**
 * 시안 `ScreenCrop`.
 *
 * 안쪽 자식은 **앱 좌표(393 폭)로 그대로** 적습니다. 축소는 여기서 한 번만
 * 일어나므로, 화면 코드와 이 삽화의 숫자가 1:1 로 대응합니다.
 *
 * `transformOrigin: 'top left'` 가 핵심입니다 — RN 의 기본은 가운데라 그대로 두면
 * 화면이 창 밖으로 밀려납니다.
 */
function ScreenCrop({
  children,
  bg = color.canvas,
}: {
  children: React.ReactNode;
  bg?: string;
}) {
  return (
    <View style={styles.stage}>
      <View style={styles.halo} />
      <View style={[styles.window, { backgroundColor: bg }]}>
        <View style={styles.inner}>{children}</View>
      </View>
    </View>
  );
}

/* ────────────────────────────────────────────────────────────
 * 01 매장 등록 — 검색 → 자동완성 → 선택 → 메뉴 사진 자동 등록
 * ──────────────────────────────────────────────────────────── */

/** 시안 `REALS.STORE_DB.slice(0, 3)` 원문. */
const STORE_DB = [
  { name: '열정커피 보라매점', road: '서울 동작구 보라매로 87', phone: '025551234' },
  { name: '열정커피 강남점', road: '서울 강남구 테헤란로 152', phone: '02-1234-5678' },
  { name: '열정커피 역삼점', road: '서울 강남구 강남대로 396', phone: '02-2345-6789' },
] as const;

/** 시안 `REALS.STORE_CONTEXT.representative_menus` 원문 이름 세 개. */
const MENUS = ['딸기 크림 라떼', '소금빵', '치즈김밥'] as const;

/** 시안 `onR1~3`: 후보 세 줄이 0.5초 간격으로 떨어졌다가 46% 에 함께 사라집니다. */
const ROWS = [
  [0, 10, 18, 46, 54, 100],
  [0, 15, 23, 46, 54, 100],
  [0, 20, 28, 46, 54, 100],
] as const;

export function Art01({ active }: ArtProps) {
  const v = useCycle(active);

  // 시안 onQ: 친 글자와 지우기 버튼이 같이 떴다가 끝에 사라집니다.
  const typed = { opacity: kf(v, [0, 4, 10, 96, 100], [0, 0, 1, 1, 0]) };
  // 시안 onPick: 고른 가게 카드가 아래에서 올라와 후보 목록을 덮습니다.
  const pick = {
    opacity: kf(v, [0, 52, 60, 96, 100], [0, 0, 1, 1, 0]),
    transform: [{ translateY: kf(v, [0, 52, 60, 100], [10, 10, 0, 0]) }],
  };
  // 시안 onMenus: 그 아래로 메뉴 사진 세 칸이 이어서 채워집니다.
  const menus = {
    opacity: kf(v, [0, 64, 74, 96, 100], [0, 0, 1, 1, 0]),
    transform: [{ translateY: kf(v, [0, 64, 74, 100], [12, 12, 0, 0]) }],
  };

  return (
    <ScreenCrop>
      <View style={styles.pad24}>
        <Text style={styles.h22}>매장 정보를{'\n'}등록해 주세요</Text>

        <View style={{ marginTop: space[5] }}>
          <Text style={styles.fieldLabel}>매장 이름</Text>
          <View style={styles.input}>
            <Search size={18} strokeWidth={2} color={color.ink[500]} />
            <Animated.Text style={[styles.inputText, typed]} numberOfLines={1}>
              열정커피
            </Animated.Text>
            <Animated.View style={typed}>
              <X size={17} strokeWidth={2} color={color.ink[500]} />
            </Animated.View>
          </View>
        </View>

        {/* 시안: relative mt-2 h-[236px] — 후보 목록과 선택 결과가 같은 자리를 씁니다. */}
        <View style={styles.slot}>
          <View style={styles.list}>
            {STORE_DB.map((r, i) => (
              <Animated.View
                key={r.name}
                style={[
                  styles.row,
                  i < STORE_DB.length - 1 && styles.rowDivider,
                  {
                    opacity: kf(v, ROWS[i], [0, 0, 1, 1, 0, 0]),
                    transform: [{ translateY: kf(v, ROWS[i], [-8, -8, 0, 0, 0, 0]) }],
                  },
                ]}
              >
                <View style={styles.rowIcon}>
                  <Store size={16} strokeWidth={2} color={color.brand[600]} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={styles.rowRoad} numberOfLines={1}>
                    {r.road}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>

          <Animated.View style={[styles.picked, pick]}>
            <View style={styles.pickCard}>
              <View style={styles.pickIcon}>
                <Store size={17} strokeWidth={2} color={color.canvas} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.pickName} numberOfLines={1}>
                  {STORE_DB[0].name}
                </Text>
                <Text style={styles.pickRoad} numberOfLines={1}>
                  {STORE_DB[0].road}
                </Text>
                <Text style={styles.pickPhone} numberOfLines={1}>
                  {phoneText(STORE_DB[0].phone)}
                </Text>
              </View>
            </View>

            <Animated.View style={[{ marginTop: space[4] }, menus]}>
              <View style={styles.menuHead}>
                <Text style={styles.fieldLabelFlat}>메뉴 사진</Text>
                <Text style={styles.menuCount}>3개 등록됨</Text>
              </View>
              <View style={styles.menuGrid}>
                {MENUS.map((m) => (
                  <View key={m} style={styles.menuCell}>
                    <Text style={styles.menuName} numberOfLines={1}>
                      {m}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </ScreenCrop>
  );
}

/* ────────────────────────────────────────────────────────────
 * 02 AI 추천 — 객관식으로 답하면 추천 카드가 나온다
 * ──────────────────────────────────────────────────────────── */

/** 시안 `REALS.REELS[2]` 원문 — 제목과 조건 태그 셋. */
const REEL = {
  title: '사장님 소다팝 챌린지 #Shorts',
  tags: ['촬영 8분', '1인 촬영', '얼굴 노출 없음'],
} as const;

export function Art02({ active }: ArtProps) {
  const v = useCycle(active);

  /** 시안 onB1·onChip·onU1·onB2·onCard — 전부 "떠오르며 나타나기" 한 종류입니다. */
  const rise = (at: readonly number[], dy: number) => ({
    opacity: kf(v, at, [0, 0, 1, 1, 0, 0]),
    transform: [{ translateY: kf(v, at, [dy, dy, 0, 0, 0, 0]) }],
  });

  return (
    <ScreenCrop bg={color.surface}>
      <View style={styles.chat}>
        <Animated.View style={[styles.botRow, rise([0, 3, 10, 96, 100, 100], 8)]}>
          <View style={styles.avatar}>
            <Sparkles size={16} strokeWidth={2} color={color.canvas} />
          </View>
          <Text style={styles.botBubble}>오늘 어떤 영상을 찍을까요?</Text>
        </Animated.View>

        {/* 시안 onChip: 칩은 34% 에 먼저 사라집니다 — 고르고 나면 없어지는 자리라서. */}
        <Animated.View style={[styles.chips, rise([0, 12, 20, 34, 40, 100], 8)]}>
          <Text style={[styles.chip, styles.chipOn]}>홍보하고 싶은 게 있어요</Text>
          <Text style={styles.chip}>뭘 찍을지 모르겠어요</Text>
        </Animated.View>

        <Animated.View style={[styles.userRow, rise([0, 36, 44, 96, 100, 100], 8)]}>
          <Text style={styles.userBubble}>딸기 크림 라떼</Text>
        </Animated.View>

        <Animated.View style={[styles.botRow, rise([0, 46, 54, 96, 100, 100], 8)]}>
          <View style={styles.avatar}>
            <Sparkles size={16} strokeWidth={2} color={color.canvas} />
          </View>
          <Text style={styles.botBubble}>실제로 오늘 찍을 수 있는 3가지를 추천해 드려요.</Text>
        </Animated.View>

        <Animated.View style={[styles.reelCard, rise([0, 58, 70, 96, 100, 100], 16)]}>
          <Text style={styles.reelTitle}>{REEL.title}</Text>
          <Text style={styles.reelTags}>{REEL.tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ')}</Text>
          <View style={styles.reelStage}>
            <View style={styles.reelThumb}>
              <View style={styles.reelPlay}>
                <PlayTri size={13} fill={color.canvas} />
              </View>
            </View>
          </View>
          <View style={styles.reelCta}>
            <Camera size={16} strokeWidth={2} color={color.canvas} />
            <Text style={styles.reelCtaText}>바로 촬영하기</Text>
          </View>
        </Animated.View>
      </View>
    </ScreenCrop>
  );
}

/* ────────────────────────────────────────────────────────────
 * 03 AI 자동 편집 — 컷·자막·브랜딩이 차례로 붙는다
 * ──────────────────────────────────────────────────────────── */

/** 시안 `steps` 원문. 8초씩 밀리며 체크가 켜집니다(onS1~4). */
const STEPS = [
  { label: '컷 편집', at: [0, 8, 16, 96, 100] },
  { label: '자막 입히기', at: [0, 22, 30, 96, 100] },
  { label: '위치 태그 · 매장 브랜딩 삽입', at: [0, 36, 44, 96, 100] },
  { label: '최종 렌더링', at: [0, 50, 58, 96, 100] },
] as const;

export function Art03({ active }: ArtProps) {
  const v = useCycle(active);

  // 시안 onCap: 자막이 아래에서 6px 떠오릅니다. left-1/2 보정은 스타일에서 합니다.
  const cap = {
    opacity: kf(v, [0, 30, 38, 96, 100], [0, 0, 1, 1, 0]),
    transform: [{ translateY: kf(v, [0, 30, 38, 100], [6, 6, 0, 0]) }],
  };
  // 시안 onPin: 위치 칩이 .6 에서 1.08 로 튀었다가 1 로 앉습니다.
  const pin = {
    opacity: kf(v, [0, 44, 52, 96, 100], [0, 0, 1, 1, 0]),
    transform: [{ scale: kf(v, [0, 44, 52, 58, 100], [0.6, 0.6, 1.08, 1, 1]) }],
  };

  return (
    <ScreenCrop>
      <View style={styles.pad24}>
        <Text style={styles.h18}>AI 자동 편집</Text>
        <Text style={styles.sub14}>촬영본을 숏폼으로 만드는 중이에요.</Text>

        <View style={styles.preview}>
          {/*
            시안 `left-1/2` + `translate(-50%, …)` — RN 에는 퍼센트 이동이 없어서
            자막을 좌우 가운데 정렬로 두고 세로 이동만 애니메이션합니다.
          */}
          <Animated.View style={[styles.capWrap, cap]}>
            <Text style={styles.capText}>이 단면 실화?</Text>
          </Animated.View>
          <Animated.View style={[styles.pinWrap, pin]}>
            <MapPin size={12} strokeWidth={2} color={color.canvas} />
            <Text style={styles.pinText}>강남역 11번 출구 3분</Text>
          </Animated.View>
        </View>

        <View style={styles.steps}>
          {STEPS.map((s) => (
            <View key={s.label} style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Circle size={22} strokeWidth={2} color={color.ink[300]} style={StyleSheet.absoluteFill} />
                <Animated.View
                  style={[StyleSheet.absoluteFill, { opacity: kf(v, s.at, [0, 0, 1, 1, 0]) }]}
                >
                  <CircleCheck size={22} strokeWidth={2} color={color.done[500]} />
                </Animated.View>
              </View>
              <Text style={styles.stepLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* 시안 onBar: 6% 에서 100% 까지. width 라 네이티브 드라이버를 못 씁니다. */}
        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, { width: kf(v, [0, 6, 90, 96, 100], ['6%', '6%', '100%', '100%', '6%']) }]}
          />
        </View>

        <Animated.View style={[styles.editCta, { opacity: kf(v, [0, 62, 70, 96, 100], [0.4, 0.4, 1, 1, 0.4]) }]}>
          <Text style={styles.editCtaText}>완성된 영상 내보내기</Text>
        </Animated.View>
      </View>
    </ScreenCrop>
  );
}

/* ────────────────────────────────────────────────────────────
 * 04 성과 대시보드 — 인사이트 화면 상단 확대
 * ──────────────────────────────────────────────────────────── */

/** 시안 `bC1~7`: 막대 일곱 개가 왼쪽부터 차례로 자랍니다. */
const BARS = [
  { at: [0, 8, 20, 92, 97, 100], h: 39, bg: color.brand[300] },
  { at: [0, 12, 24, 92, 97, 100], h: 59, bg: color.brand[300] },
  { at: [0, 16, 28, 92, 97, 100], h: 51, bg: color.brand[300] },
  { at: [0, 20, 32, 92, 97, 100], h: 76, bg: color.brand[400] },
  { at: [0, 24, 36, 92, 97, 100], h: 71, bg: color.brand[400] },
  { at: [0, 28, 42, 92, 97, 100], h: 96, bg: color.brand[600] },
  { at: [0, 34, 46, 92, 97, 100], h: 78, bg: color.brand[400] },
] as const;

/** 시안 `REALS.LOCAL_ANALYSIS.slice(0, 3)` 원문. */
const LOCAL = [
  { label: '매장 반경 1km 이내 주민', value: 58, bg: color.brand[600] },
  { label: '인근 직장인 유입', value: 27, bg: color.brand[400] },
  { label: '타지역 방문객', value: 15, bg: color.ink[300] },
] as const;

export function Art04({ active }: ArtProps) {
  const v = useCycle(active);
  const views = useCountUp(v, active, 3820);

  // 시안 bLift: +12% 배지가 아래에서 튀어오릅니다.
  const lift = {
    opacity: kf(v, [0, 44, 54, 92, 97, 100], [0, 0, 1, 1, 0, 0]),
    transform: [
      { translateY: kf(v, [0, 44, 54, 100], [10, 10, 0, 0]) },
      { scale: kf(v, [0, 44, 54, 60, 100], [0.8, 0.8, 1.1, 1, 1]) },
    ],
  };

  return (
    <ScreenCrop bg={color.surface}>
      <View style={styles.pad16}>
        <Text style={styles.h18Dash}>매장 인사이트 분석</Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHead}>
              <Eye size={16} strokeWidth={2} color={color.ink[500]} />
              <Text style={styles.kpiLabel}>주간 조회수</Text>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>{comma(views)}</Text>
              <Animated.View style={lift}>
                <Text style={styles.kpiDelta}>+12%</Text>
              </Animated.View>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHead}>
              <Users size={16} strokeWidth={2} color={color.ink[500]} />
              <Text style={styles.kpiLabel}>주 타깃</Text>
            </View>
            <View style={styles.kpiValueRow}>
              {/* 시안 원문은 en dash(–) 입니다 — 하이픈으로 바꾸지 않습니다. */}
              <Text style={styles.kpiValue}>20–34세</Text>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>주간 조회수 추이</Text>
            <Text style={styles.kpiDelta}>+12%</Text>
          </View>
          <View style={styles.chart}>
            {BARS.map((b, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.bar,
                  { backgroundColor: b.bg, height: kf(v, b.at, [4, 4, b.h, b.h, 4, 4]) },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>지역 상권 분석</Text>
          <View style={styles.localList}>
            {LOCAL.map((l) => (
              <View key={l.label}>
                <View style={styles.localHead}>
                  <Text style={styles.localLabel}>{l.label}</Text>
                  <Text style={styles.localValue}>{l.value}%</Text>
                </View>
                <View style={styles.localTrack}>
                  <View style={[styles.localFill, { width: `${l.value}%`, backgroundColor: l.bg }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScreenCrop>
  );
}

/* ────────────────────────────────────────────────────────────
 * 스타일
 *
 * 안쪽 값은 **앱 좌표(393 폭)** 입니다 — 창이 .682 로 줄입니다.
 * 글자 크기는 시안 px 를 그대로 적고, 줄높이는 시안에 `leading-*` 이 없으면
 * ×1.5 입니다 (CLAUDE.md §5-①). 토큰을 펼쳐 쓰는 것은 폰트 계열·굵기가
 * 폰트 로딩 여부에 따라 갈리기 때문입니다(`family()`·`weight()`).
 * ──────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  // ── 무대 ──
  stage: { width: WIN_W, height: WIN_H, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: color.brand[50],
  },
  // 시안: rounded-[26px] · border-hairline · shadow 0 22px 50px -18px rgba(15,23,42,.4)
  window: {
    width: WIN_W,
    height: WIN_H,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: color.ink[200],
    overflow: 'hidden',
    ...glow('#0F172A', 0.4, 50, 22, 10),
  },
  // 시안: width 393 · scale(.682) · transformOrigin top left
  inner: { width: APP_W, transform: [{ scale: ZOOM }], transformOrigin: 'top left' },

  // ── 공통 ──
  pad24: { paddingHorizontal: space[6], paddingTop: space[6] },
  pad16: { paddingHorizontal: space[4], paddingTop: space[6] },
  // 시안: 22 bold leading-tight(1.25) · tracking-tighter-title(-.02em)
  h22: { ...text.display, fontSize: 22, lineHeight: 27.5, letterSpacing: -0.44 },
  // 시안: 18 bold tracking-tighter-title
  h18: { ...text.display, fontSize: 18, lineHeight: 27, letterSpacing: -0.36 },
  // 시안 04: 18 bold leading-[1.3] · mb-3
  h18Dash: {
    ...text.display,
    fontSize: 18,
    lineHeight: 23.4,
    letterSpacing: -0.36,
    marginBottom: space[3],
  },
  // 시안: 14 · slate-muted · mt-1
  sub14: { ...text.bodySmall, fontSize: 14, lineHeight: 21, color: color.ink[500], marginTop: space[1] },

  // ── 01 ──
  // 시안: 12 medium slate-muted · pl-1 · mb-1.5
  fieldLabel: {
    ...text.bodySmall,
    fontSize: 12,
    lineHeight: 18,
    color: color.ink[500],
    paddingLeft: space[1],
    marginBottom: space[1.5],
  },
  fieldLabelFlat: { ...text.bodySmall, fontSize: 12, lineHeight: 18, color: color.ink[500] },
  // 시안: h52 · rounded-xl · border hairline · bg surface · px-4 · gap-2.5
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputText: { ...text.body, flex: 1, fontSize: 15, lineHeight: 22.5, color: color.ink[900] },
  // 시안: relative mt-2 h-[236px]
  slot: { position: 'relative', marginTop: space[2], height: 236 },
  // 시안: absolute inset-x-0 top-0 · rounded-xl · border hairline · bg panel
  list: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
    overflow: 'hidden',
  },
  // 시안: px-4 py-3 · gap-3
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  // 시안: border-b border-hairline/60 (마지막 줄은 없음)
  rowDivider: { borderBottomWidth: 1, borderBottomColor: color.hairlineSoft },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  // 시안: 14 semibold ink
  rowName: { ...text.bodyStrong, fontSize: 14, lineHeight: 21 },
  // 시안: 12 slate-muted
  rowRoad: { ...text.bodySmall, fontSize: 12, lineHeight: 18, color: color.ink[500] },
  picked: { position: 'absolute', left: 0, right: 0, top: 0 },
  // 시안: rounded-2xl border brand-border bg brand-tint px-4 py-3.5 · gap-3 · items-start
  pickCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.brand[300],
    backgroundColor: color.brand[50],
    paddingHorizontal: space[4],
    paddingVertical: space[3.5],
  },
  pickIcon: {
    marginTop: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안: 15 bold ink
  pickName: { ...text.display, fontSize: 15, lineHeight: 22.5, letterSpacing: 0 },
  // 시안: 12 ink-3 · mt-0.5
  pickRoad: { ...text.bodySmall, fontSize: 12, lineHeight: 18, color: color.ink[700], marginTop: space[0.5] },
  // 시안: 12 slate-muted
  pickPhone: { ...text.bodySmall, fontSize: 12, lineHeight: 18, color: color.ink[500] },
  // 시안: flex items-baseline justify-between · pl-1 · mb-1.5
  menuHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingLeft: space[1],
    marginBottom: space[1.5],
  },
  // 시안: 11
  menuCount: { ...text.bodySmall, fontSize: 11, lineHeight: 16.5, color: color.ink[500] },
  // 시안: grid-cols-3 gap-2
  menuGrid: { flexDirection: 'row', gap: space[2] },
  // 시안: aspect-square rounded-xl bg-hairline
  menuCell: { flex: 1, aspectRatio: 1, borderRadius: radius.md, backgroundColor: color.ink[200], overflow: 'hidden' },
  // 시안: absolute bottom-1.5 left-2 · 12 semibold slate-muted
  menuName: {
    ...text.bodyStrong,
    position: 'absolute',
    bottom: space[1.5],
    left: space[2],
    right: space[1],
    fontSize: 12,
    lineHeight: 18,
    color: color.ink[500],
  },

  // ── 02 ──
  // 시안: flex-col gap-3 px-5 pt-6
  chat: { paddingHorizontal: space[5], paddingTop: space[6], gap: space[3] },
  // 시안: items-start gap-2
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  avatar: {
    marginTop: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안: max-w-80% · rounded-2xl rounded-tl-md · bg panel · px-3.5 py-2.5 · 15 medium leading-snug ink-2
  botBubble: {
    ...text.body,
    maxWidth: '80%',
    borderRadius: radius.lg,
    borderTopLeftRadius: radius.md,
    backgroundColor: color.paper,
    paddingHorizontal: space[3.5],
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 20.6,
    color: color.ink[800],
    ...glow('#0F172A', 0.06, 10, 2, 1),
  },
  // 시안: ml-10 flex-wrap gap-2
  chips: { marginLeft: space[10], flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  // 시안: rounded-full border hairline bg canvas px-4 py-2.5 · 14 semibold ink-2
  chip: {
    ...text.bodyStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.ink[200],
    backgroundColor: color.canvas,
    paddingHorizontal: space[4],
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 21,
    color: color.ink[800],
  },
  // 시안: 고른 칩만 border brand-border · text brand
  chipOn: { borderColor: color.brand[300], color: color.brand[600] },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  // 시안: rounded-tr-md · bg brand · white
  userBubble: {
    ...text.body,
    maxWidth: '80%',
    borderRadius: radius.lg,
    borderTopRightRadius: radius.md,
    backgroundColor: color.brand[600],
    paddingHorizontal: space[3.5],
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 20.6,
    color: color.canvas,
  },
  // 시안: ml-10 rounded-2xl border brand-border bg canvas p-4 · gap-3
  reelCard: {
    marginLeft: space[10],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.brand[300],
    backgroundColor: color.canvas,
    padding: space[4],
    gap: space[3],
  },
  // 시안: 15 bold leading-snug tracking-tighter-title
  reelTitle: { ...text.display, fontSize: 15, lineHeight: 20.6, letterSpacing: -0.3 },
  // 시안: 12 semibold brand
  reelTags: { ...text.bodyStrong, fontSize: 12, lineHeight: 18, color: color.brand[600] },
  // 시안: rounded-xl bg-surface py-3 · 가운데
  reelStage: { borderRadius: radius.md, backgroundColor: color.surface, paddingVertical: space[3], alignItems: 'center' },
  // 시안: h-[120px] w-[68px] rounded-lg bg-hairline
  reelThumb: {
    width: 68,
    height: 120,
    borderRadius: radius.sm,
    backgroundColor: color.ink[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안: h-8 w-8 rounded-full bg-ink/40 (backdrop-blur 는 RN 에 없어 뺐습니다)
  reelPlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안: h-11 rounded-xl bg-brand · gap-1.5
  reelCta: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1.5],
  },
  // 시안: 14 semibold white
  reelCtaText: { ...text.bodyStrong, fontSize: 14, lineHeight: 21, color: color.canvas },

  // ── 03 ──
  // 시안: mx-auto mt-5 h-[184px] w-[104px] rounded-2xl border hairline bg hairline
  preview: {
    alignSelf: 'center',
    marginTop: space[5],
    width: 104,
    height: 184,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.ink[200],
    backgroundColor: color.ink[200],
    overflow: 'hidden',
  },
  // 시안: absolute bottom-12 left-1/2 (가운데 정렬로 대신합니다)
  capWrap: { position: 'absolute', bottom: 48, left: 0, right: 0, alignItems: 'center' },
  // 시안: rounded-md bg-ink/70 px-2 py-1 · 12 bold white
  capText: {
    ...text.display,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
    color: color.canvas,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: radius.xs,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    overflow: 'hidden',
  },
  // 시안: absolute bottom-2.5 left-2.5 · rounded-full bg-brand px-2.5 py-1 · gap-1
  pinWrap: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    borderRadius: radius.pill,
    backgroundColor: color.brand[600],
    paddingHorizontal: 10,
    paddingVertical: space[1],
  },
  // 시안: 11 semibold white
  pinText: { ...text.bodyStrong, fontSize: 11, lineHeight: 16.5, color: color.canvas },
  // 시안: mt-5 gap-2.5
  steps: { marginTop: space[5], gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  stepIcon: { width: 22, height: 22 },
  // 시안: 15 semibold ink
  stepLabel: { ...text.bodyStrong, fontSize: 15, lineHeight: 22.5 },
  // 시안: mt-5 h-1.5 rounded-full bg-hairline
  barTrack: {
    marginTop: space[5],
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: color.ink[200],
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: color.brand[600] },
  // 시안: mt-4 h-12 rounded-xl bg-brand
  editCta: {
    marginTop: space[4],
    height: 48,
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안: 15 semibold white
  editCtaText: { ...text.bodyStrong, fontSize: 15, lineHeight: 22.5, color: color.canvas },

  // ── 04 ──
  // 시안: grid-cols-2 gap-3
  kpiRow: { flexDirection: 'row', gap: space[3] },
  // 시안: rounded-2xl border hairline/80 bg white p-3.5
  kpiCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    padding: space[3.5],
  },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },
  // 시안: 12 slate-muted
  kpiLabel: { ...text.bodySmall, fontSize: 12, lineHeight: 18, color: color.ink[500] },
  // 시안: mt-2 items-end gap-1.5
  kpiValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[1.5], marginTop: space[2] },
  // 시안: 19 bold tabular-nums tracking-tighter-title
  kpiValue: { ...text.display, fontSize: 19, lineHeight: 28.5, letterSpacing: -0.38, fontVariant: ['tabular-nums'] },
  // 시안: 12 semibold verified · mb-0.5
  kpiDelta: { ...text.bodyStrong, fontSize: 12, lineHeight: 18, color: color.done[500], marginBottom: space[0.5] },
  // 시안: mt-4 rounded-2xl border hairline/80 bg white p-4
  panel: {
    marginTop: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    padding: space[4],
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[3] },
  // 시안: 16 semibold ink
  panelTitle: { ...text.subheading, fontSize: 16, lineHeight: 24 },
  // 시안: h-24 items-end justify-between
  chart: { height: 96, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  // 시안: w-[22px] rounded-[5px]
  bar: { width: 22, borderRadius: 5 },
  // 시안: mt-3.5 flex-col gap-3
  localList: { marginTop: space[3.5], gap: space[3] },
  localHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[1.5] },
  // 시안: 13 ink-3
  localLabel: { ...text.caption, fontSize: 13, lineHeight: 19.5, color: color.ink[700] },
  // 시안: 13 semibold ink
  localValue: { ...text.bodyStrong, fontSize: 13, lineHeight: 19.5 },
  /*
    시안 트랙은 `bg-[#F1F5F9]` 입니다 — 토큰의 surface(#F8FAFC)보다 한 단계 진한
    회색이고, 이 값만 팔레트에 없습니다. 카드가 흰색이라 surface 로 바꾸면 트랙이
    거의 안 보여서 시안 값을 그대로 씁니다 (CLAUDE.md §6).
  */
  localTrack: { height: 8, borderRadius: radius.pill, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  localFill: { height: '100%', borderRadius: radius.pill },
});
