import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import theme, { color, radius, sizing, space, text } from '../design/theme';

interface AppBarProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** 위저드 진행 표시 (예: 2/5) */
  step?: { current: number; total: number };
}

export function AppBar({ title, onBack, right, step }: AppBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            hitSlop={12}
            onPress={onBack}
            style={styles.back}
          >
            {/* 가이드라인 §4: 라인 아이콘. 글리프는 기기마다 모양이 달라 씁니다. */}
            <ChevronLeft size={26} strokeWidth={2} color={color.ink[900]} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <Text style={[text.bodyStrong, styles.title]} numberOfLines={1}>
          {title ?? ''}
        </Text>
        <View style={styles.right}>{right}</View>
      </View>
      {step ? <StepBar current={step.current} total={step.total} /> : null}
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
    backgroundColor: color.paper,
    borderBottomWidth: theme.border.hairline,
    borderBottomColor: color.ink[200],
  },
  row: {
    height: sizing.appBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[2],
  },
  back: {
    width: sizing.buttonHeightSmall,
    height: sizing.buttonHeightSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center' },
  right: { minWidth: sizing.buttonHeightSmall, alignItems: 'flex-end', paddingRight: space[2] },
  stepBar: { flexDirection: 'row', gap: 3, paddingHorizontal: space[5], paddingBottom: space[3] },
  stepSeg: { flex: 1, height: 4, borderRadius: radius.pill },
});
