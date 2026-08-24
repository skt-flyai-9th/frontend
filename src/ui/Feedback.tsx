import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import theme, { color, radius, space, text } from '../design/theme';
import { Button } from './Button';

/**
 * 빈 상태 / 오류 / 로딩 / 권한 거부.
 * FE 백로그 "완료 조건: 정상·빈값·오류·권한거부·네트워크 끊김까지 화면 검증"을 위해
 * 모든 화면이 이 컴포넌트들을 재사용합니다.
 *
 * 문구 원칙: 무엇이 잘못됐는지와 다음에 뭘 하면 되는지만 씁니다. 사과하지 않습니다.
 */

export function Loading({ label = '불러오는 중' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={color.brand[600]} size="large" />
      <Text style={text.bodySmall}>{label}</Text>
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
    <View style={styles.center}>
      <Text style={[text.subheading, styles.centerText]}>{title}</Text>
      {description ? <Text style={[text.bodySmall, styles.centerText]}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" full={false} size="small" />
      ) : null}
    </View>
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
    <View style={styles.center}>
      <Text style={[text.subheading, styles.centerText]}>{title}</Text>
      {description ? <Text style={[text.bodySmall, styles.centerText]}>{description}</Text> : null}
      {onRetry ? <Button label="다시 시도" onPress={onRetry} variant="secondary" full={false} size="small" /> : null}
    </View>
  );
}

type BannerTone = 'info' | 'warn' | 'danger' | 'done';

const BANNER = {
  info: { bg: color.ink[50], fg: color.ink[800], bar: color.ink[300] },
  warn: { bg: color.warn[100], fg: color.warn[500], bar: color.warn[500] },
  danger: { bg: color.danger[100], fg: color.danger[500], bar: color.danger[500] },
  done: { bg: color.done[100], fg: color.done[500], bar: color.done[500] },
} as const;

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
    <View style={[styles.banner, { backgroundColor: t.bg }]}>
      <View style={[styles.bannerBar, { backgroundColor: t.bar }]} />
      <View style={styles.bannerBody}>
        <Text style={[text.bodySmall, { color: t.fg, fontFamily: theme.text.bodyStrong.fontFamily }]}>
          {title}
        </Text>
        {description ? <Text style={[text.caption, { color: t.fg }]}>{description}</Text> : null}
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

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: space[3], paddingVertical: space[8] },
  centerText: { textAlign: 'center' },
  banner: { flexDirection: 'row', borderRadius: radius.md, overflow: 'hidden' },
  bannerBar: { width: 4 },
  bannerBody: { flex: 1, padding: space[4], gap: 2 },
  jobRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: color.ink[100], overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: color.brand[600] },
});
