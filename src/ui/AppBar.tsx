/**
 * AppBar — 시안 TopHeader / HomeHeader 대조 이식.
 *
 * 시안 사양 → 구현 대응
 *   배경  rgba(255,255,255,.95) + backdrop blur(12)  →  BlurView(intensity 24) + 흰 0.95 오버레이
 *   하단  1px rgba(226,232,240,.6)                    →  color.hairlineSoft
 *   행    44px, 좌우 16                                →  sizing.appBarHeight(44), space[4]
 *   타이틀 18·700, **절대 중앙**(뒤로가기 유무와 무관)  →  absolute center
 *   back  36 원형, chevron 24                          →  sizing.iconButton + hitSlop 으로 터치 44 보전
 *
 * 세 가지 모양이 있습니다 (시안과 동일).
 *   variant=back   뒤로가기 + 중앙 타이틀      → onBack
 *   variant=title  타이틀만                     → title
 *   variant=logo   좌측 워드마크                → logo
 *   HomeHeader     알림(좌) · 중앙 로고 · 메뉴(우) → home
 *
 * step(온보딩 진행바)은 시안에 없지만 기능 요구라 유지합니다 — 스타일만 시안 토큰.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Bell, ChevronLeft, Menu } from 'lucide-react-native';
import theme, { color, radius, sizing, space } from '../design/theme';
import { RealsLogo } from './RealsLogo';
import { pressTap } from './press';

interface AppBarProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** 좌측 "Reals▶" 워드마크 (title 대신) */
  logo?: boolean;
  /**
   * 시안 HomeHeader — 알림 벨(좌) · 중앙 로고 22 · 메뉴(우).
   * 지정하면 logo·title 대신 이 배치를 씁니다.
   */
  home?: { onBell?: () => void; onMenu?: () => void; unread?: boolean };
  step?: { current: number; total: number };
}

/** 시안 HeaderIconBtn — 36 원형, active:scale-90 */
function IconBtn({
  icon: Icon,
  label,
  onPress,
  edge,
}: {
  icon: typeof Bell;
  label: string;
  onPress?: () => void;
  edge?: 'left' | 'right';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        edge === 'left' && { marginLeft: -6 },
        edge === 'right' && { marginRight: -6 },
        pressTap(pressed, 'icon'),
      ]}
    >
      <Icon size={22} strokeWidth={2} color={color.ink[900]} />
    </Pressable>
  );
}

export function AppBar({ title, onBack, right, logo, home, step }: AppBarProps) {
  return (
    <View style={styles.wrap}>
      {/* 시안의 backdrop-blur. 흰 0.95 가 위에 얹혀 은은하게만 비칩니다. */}
      <BlurView intensity={24} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.whiteGlass]} />

      <View style={styles.row}>
        <View style={styles.side}>
          {home?.onBell ? (
            /*
             * 점을 버튼 기준으로 찍기 위해 바깥 상자가 -6 을 먹습니다.
             *
             * ⚠️ `onBell` 이 없으면 **아예 그리지 않습니다** (2026-08-26).
             *    알림 화면 진입을 닫으면서 onPress 만 뺐더니, 벨이 그대로 보이는데
             *    눌러도 아무 일이 없는 **죽은 버튼**이 됐습니다. 사장님이 고장으로
             *    읽습니다 — 안 쓸 거면 자리도 비웁니다.
             */
            <View style={styles.backBtn}>
              <IconBtn icon={Bell} label="알림" onPress={home.onBell} />
              {/* 시안: 읽지 않은 알림 점 — 7px 빨강 + 흰 링 2px */}
              {home.unread ? <View pointerEvents="none" style={styles.unreadDot} /> : null}
            </View>
          ) : onBack ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={6}
              accessibilityLabel="뒤로가기"
              onPress={onBack}
              style={({ pressed }) => [styles.iconBtn, styles.backBtn, pressTap(pressed, 'icon')]}
            >
              <ChevronLeft size={24} strokeWidth={2} color={color.ink[900]} />
            </Pressable>
          ) : logo ? (
            // 시안 TopHeader `variant === "logo"` 는 **18** 입니다 (홈 헤더만 22)
            <RealsLogo size={18} />
          ) : null}
        </View>

        {/* 시안: 중앙 요소는 절대 배치 — 좌우 요소 폭에 밀리지 않습니다 */}
        {home ? (
          <View pointerEvents="none" style={styles.center}>
            <RealsLogo size={22} />
          </View>
        ) : title ? (
          <View pointerEvents="none" style={styles.center}>
            {/*
              🔴 폭 상한은 **숫자**입니다 — 퍼센트를 쓰면 안 됩니다 (2026-08-27).

              예전에는 `maxWidth: '62%'` 였습니다. 이 상자는 `left/right` 로만 폭이
              정해지는 **절대배치**라, 그 퍼센트가 기기에서 기대대로 풀리지 않습니다.
              실기기에서 "AI 숏폼 추천"(85pt)이 **82pt 에서 잘려** "AI 숏폼 추…" 로
              떴습니다(사장님 캡처를 픽셀로 재서 확인 — 글꼴 배율은 1.0 이었습니다.
              같은 캡처의 "관심 목록" 은 62pt 라 아슬아슬하게 살아남았습니다).

              화면 폭에서 좌우 아이콘 자리(36+4)와 행 여백(16)을 뺀 값이 상한입니다.
              393 폭이면 281pt — 제목이 버튼 밑으로 들어가지도, 잘리지도 않습니다.

              글꼴 배율은 1.3 까지 허용합니다. 사장님 연배에 글씨를 키워 쓰시는 분이
              많고, 281pt 면 1.3 배(111pt)도 넉넉히 들어갑니다.
            */}
            <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {title}
            </Text>
          </View>
        ) : (
          // 가운데에 아무것도 없어도 칸은 남깁니다 — 좌우가 양끝에 붙어 있어야 합니다
          <View style={styles.center} />
        )}

        <View style={[styles.side, styles.sideRight]}>
          {home ? <IconBtn icon={Menu} label="설정" onPress={home.onMenu} edge="right" /> : right}
        </View>
      </View>

      {step && <StepBar current={step.current} total={step.total} />}
    </View>
  );
}

export function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <View
      style={styles.stepBar}
      accessibilityRole="progressbar"
      accessibilityLabel={`전체 ${total}단계 중 ${current}단계`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepSeg,
            { backgroundColor: i < current ? color.brand[600] : color.ink[100] },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderBottomWidth: theme.border.hairline,
    borderBottomColor: color.hairlineSoft,
  },
  whiteGlass: { backgroundColor: 'rgba(255,255,255,0.95)' },
  row: {
    height: sizing.appBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
  },
  side: { minWidth: sizing.iconButton, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end', gap: space[1] },
  iconBtn: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: { marginLeft: -6 },
  unreadDot: {
    // 시안: right-2 top-2 (36 버튼 기준 8px)
    position: 'absolute',
    right: 8,
    top: 8,
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: color.danger[500],
    borderWidth: 2,
    borderColor: color.paper,
  },
  /**
   * 🔴 **절대배치를 걷어냈습니다** (2026-08-27, 두 번째 수정).
   *
   * 시안은 `absolute left-1/2 -translate-x-1/2` 로 가운데를 잡습니다. 그대로 옮겼더니
   * 기기에서 "AI 숏폼 추천"(85pt)이 82pt 언저리에서 잘렸습니다. `maxWidth` 를 퍼센트에서
   * 숫자로 바꿔도 그대로였습니다 — **폭을 `left/right` 로만 정하는 절대배치 자체**가
   * 기기에서 우리가 기대한 폭으로 안 풀립니다.
   *
   * 그래서 평범한 flex 세 칸으로 바꿉니다. 가운데 칸이 `flex: 1` 이라 **좌우 버튼을 뺀
   * 나머지 전부**를 가집니다. 계산도, 퍼센트도, 절대배치도 없습니다.
   *
   * 가운데 정렬도 유지됩니다 — 좌우 `side` 가 둘 다 `minWidth: 36` 이고 우리 헤더는
   * 한쪽에 아이콘이 최대 하나라, 두 칸 폭이 같아 시안의 절대 중앙과 결과가 같습니다.
   */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // 시안: 18·700 · tracking-tighter-title
  title: { ...theme.text.heading, textAlign: 'center' },
  stepBar: { flexDirection: 'row', gap: 3, paddingHorizontal: space[5], paddingBottom: space[3] },
  stepSeg: { flex: 1, height: 4, borderRadius: radius.pill },
});
