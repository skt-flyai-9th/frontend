/**
 * 빈 상태 / 오류 / 로딩 / 배너 / 진행률 / 스켈레톤.
 *
 * 시안 `StateBlock` 대조 이식 —
 *   아이콘 타일 56 rounded-2xl(틴트 배경) · 아이콘 26
 *   제목 bold · 본문 14 slate-muted 가운데 정렬
 *   주 버튼 h-11 rounded-xl brand · 보조는 글자 버튼
 *
 * 문구 원칙(유지): 무엇이 잘못됐는지와 다음에 뭘 하면 되는지만 씁니다. 사과하지 않습니다.
 *
 * ⚠️ 시안 StateBlock 의 제목은 17px 인데 우리 스케일에는 17 이 없습니다(16/18).
 *    새 크기 역할을 하나 더 만드는 것보다 heading(18) 을 쓰는 편이 스케일이 깨끗해
 *    1px 차이는 감수했습니다. 시안에서 17px 은 전체 3곳뿐입니다.
 */
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from 'lucide-react-native';
import theme, { color, radius, space, text } from '../design/theme';
import { Button } from './Button';

export function Loading({ label = '불러오는 중' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={color.brand[600]} size="large" />
      <Text style={text.bodySmall}>{label}</Text>
    </View>
  );
}

/**
 * Spinner — 시안 `loader-circle` + `animate-spin`.
 *
 * ActivityIndicator 는 OS 기본 모양이라 시안과 다르게 생겼습니다. 시안이 쓰는
 * 원호 아이콘을 그대로 쓰고 회전만 우리가 겁니다 (1회전 1초, 등속).
 */
export function Spinner({ size = 22, tint = color.brand[600] }: { size?: number; tint?: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <LoaderCircle size={size} strokeWidth={2} color={tint} />
    </Animated.View>
  );
}

type BlockTone = 'brand' | 'heart' | 'muted';

const BLOCK_TONE: Record<BlockTone, { tile: string; icon: string }> = {
  brand: { tile: color.brand[50], icon: color.brand[600] },
  heart: { tile: color.danger[100], icon: color.danger[500] },
  muted: { tile: color.surface, icon: color.ink[500] },
};

/** 시안 StateBlock. 빈 상태·오류가 같은 뼈대를 씁니다. */
export function StateBlock({
  icon: Icon = Info,
  tone = 'brand',
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  icon?: typeof Info;
  tone?: BlockTone;
  title: string;
  body?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const t = BLOCK_TONE[tone];
  return (
    <View style={styles.block}>
      <View style={[styles.tile, { backgroundColor: t.tile }]}>
        <Icon size={26} strokeWidth={2} color={t.icon} />
      </View>
      <Text style={[text.heading, styles.centerText]}>{title}</Text>
      {body ? <Text style={[text.bodySmall, styles.centerText, { color: color.ink[500] }]}>{body}</Text> : null}
      {primaryLabel && onPrimary ? (
        // 시안 StateBlock 의 주 버튼은 44 입니다 (기본 48 / small 36 의 사이).
        <Button label={primaryLabel} onPress={onPrimary} full={false} style={styles.blockButton} />
      ) : null}
      {secondaryLabel && onSecondary ? (
        <Button label={secondaryLabel} onPress={onSecondary} variant="quiet" size="small" full={false} />
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <StateBlock
      title={title}
      body={description}
      tone="muted"
      primaryLabel={actionLabel}
      onPrimary={onAction}
    />
  );
}

export function ErrorState({
  title = '불러오지 못했습니다',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <StateBlock
      icon={CircleAlert}
      tone="heart"
      title={title}
      body={description}
      primaryLabel={onRetry ? '다시 시도' : undefined}
      onPrimary={onRetry}
    />
  );
}

type BannerTone = 'info' | 'warn' | 'danger' | 'done';

const BANNER: Record<BannerTone, { tile: string; icon: string; fg: string; Icon: typeof Info }> = {
  info: { tile: color.brand[50], icon: color.brand[600], fg: color.ink[900], Icon: Info },
  warn: { tile: color.warn[100], icon: color.warn[500], fg: color.warn[500], Icon: TriangleAlert },
  danger: { tile: color.danger[100], icon: color.danger[500], fg: color.danger[500], Icon: CircleAlert },
  done: { tile: color.done[100], icon: color.done[500], fg: color.done[500], Icon: CircleCheck },
};

/**
 * 알림 배너.
 *
 * 시안에는 색 배경 배너가 없고, 대신 **흰 카드 + 틴트 아이콘 타일** 로 알립니다
 * (알림 화면의 "푸시 알림이 꺼져 있어요" 카드가 그 표준형).
 * 그 형태를 따르되 경고·오류는 제목을 tone 색으로 써서 급함이 사라지지 않게 했습니다.
 */
export function Banner({
  tone = 'info',
  title,
  description,
}: {
  tone?: BannerTone;
  title: string;
  description?: string;
}) {
  const t = BANNER[tone];
  return (
    <View style={styles.banner}>
      <View style={[styles.bannerTile, { backgroundColor: t.tile }]}>
        <t.Icon size={18} strokeWidth={2} color={t.icon} />
      </View>
      <View style={styles.bannerBody}>
        <Text style={[text.bodySmall, styles.bannerTitle, { color: t.fg }]}>{title}</Text>
        {description ? <Text style={text.caption}>{description}</Text> : null}
      </View>
    </View>
  );
}

/** 비동기 job 진행률. 업로드·평가·렌더·가져오기가 전부 같은 표시를 씁니다. */
export function JobProgress({
  label,
  progress,
  eta,
}: {
  label: string;
  progress: number;
  eta?: string;
}) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ gap: space[2] }}>
      <View style={styles.jobRow}>
        <Text style={text.bodySmall}>{label}</Text>
        <Text style={text.caption}>{eta ?? `${Math.round(pct * 100)}%`}</Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ now: Math.round(pct * 100), min: 0, max: 100 }}
      >
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

/**
 * 스켈레톤 블록.
 *
 * 시안은 좌우로 흐르는 그라디언트(shimmer)를 쓰지만, 그러려면 그라디언트 네이티브
 * 모듈이 필요합니다. 지금 앱에 없는 의존성을 늘리지 않기 위해 밝기 맥동으로 대신합니다 —
 * "아직 채워지지 않은 칸" 이라는 신호는 동일하게 전달됩니다.
 */
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });
  return <Animated.View style={[styles.skeleton, style, { opacity }]} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: space[3], paddingVertical: space[8] },
  centerText: { textAlign: 'center' },
  block: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[7],
    paddingVertical: space[8],
    gap: space[2],
  },
  tile: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[2],
  },
  blockButton: { height: 44, marginTop: space[3] },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
  },
  bannerTile: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontFamily: theme.text.bodyStrong.fontFamily, fontWeight: theme.text.bodyStrong.fontWeight },
  bannerBody: { flex: 1, gap: 2 },
  jobRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: color.ink[100], overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: color.brand[600] },
  skeleton: { backgroundColor: color.ink[200], borderRadius: radius.sm },
});
