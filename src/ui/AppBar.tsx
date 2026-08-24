/**
 * AppBar — 시안 TopHeader 사양 (디자인 1차수정, components/shell/TopHeader.jsx 대조 이식)
 *
 * 시안 사양 → 구현 대응
 *   배경  rgba(255,255,255,.95) + backdrop blur(12)  →  BlurView(intensity 24) + 흰 0.95 오버레이
 *   하단  1px rgba(226,232,240,.6)                    →  동일 rgba
 *   행    44px, 좌우 16                                →  sizing.appBarHeight(44), space[4]
 *   타이틀 18·700, **절대 중앙**(뒤로가기 유무와 무관)  →  absolute center
 *   back  36 원형, chevron 24                          →  36 + hitSlop 으로 터치 44 보전
 *   logo  variant: RealsLogo 22 (+빨간 ▶)              →  logo prop
 *
 * step(온보딩 진행바)은 시안에 없지만 기능 요구라 유지합니다 — 스타일만 시안 토큰.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChevronLeft } from 'lucide-react-native';
import theme, { color, radius, sizing, space, text } from '../design/theme';

interface AppBarProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** 홈 전용: "Reals▶" 워드마크를 좌측에 (title 대신) */
  logo?: boolean;
  step?: { current: number; total: number };
}

export function AppBar({ title, onBack, right, logo, step }: AppBarProps) {
  return (
    <View style={styles.wrap}>
      {/* 시안의 backdrop-blur. 흰 0.95 가 위에 얹혀 은은하게만 비칩니다. */}
      <BlurView intensity={24} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.whiteGlass]} />

      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={6}
              accessibilityLabel="뒤로가기"
              onPress={onBack}
              style={({ pressed }) => [styles.iconBtn, pressed && { transform: [{ scale: 0.9 }], opacity: theme.opacity.pressed }]}
            >
              <ChevronLeft size={24} strokeWidth={2} color={color.ink[900]} />
            </Pressable>
          ) : logo ? (
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>Reals</Text>
              {/* RealsLogo.jsx: 's' 뒤 베이스라인의 하트색 재생 ▶ (size×0.31) */}
              <View style={styles.logoPlay} />
            </View>
          ) : null}
        </View>

        {/* 시안: 타이틀은 절대 중앙 — 좌우 요소 폭에 밀리지 않습니다 */}
        {title ? (
          <View pointerEvents="none" style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        ) : null}

        <View style={[styles.side, styles.sideRight]}>{right}</View>
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
    // 시안: rgba(226,232,240,.6)
    borderBottomColor: 'rgba(226,232,240,0.6)',
  },
  whiteGlass: { backgroundColor: 'rgba(255,255,255,0.95)' },
  row: {
    height: sizing.appBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
  },
  side: { minWidth: 36, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end', gap: space[1] },
  iconBtn: {
    width: 36,
    height: 36,
    marginLeft: -6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // 시안: 18·700
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: theme.text.title.fontFamily,
    color: color.ink[900],
    maxWidth: '62%',
  },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end' },
  logoText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    fontFamily: theme.text.bodyStrong.fontFamily,
    letterSpacing: -0.44,
    color: color.ink[900],
  },
  logoPlay: {
    width: 0,
    height: 0,
    marginLeft: 2,
    marginBottom: 4,
    borderTopWidth: 3.5,
    borderBottomWidth: 3.5,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: color.danger[500],
  },
  stepBar: { flexDirection: 'row', gap: 3, paddingHorizontal: space[5], paddingBottom: space[3] },
  stepSeg: { flex: 1, height: 4, borderRadius: radius.pill },
});
