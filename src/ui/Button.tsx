import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme, { color, radius, sizing, space, text } from '../design/theme';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';
type Size = 'large' | 'small';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: ViewStyle;
  /** 접근성 라벨. 버튼 문구와 실제 동작이 다를 때만 지정합니다. */
  a11yLabel?: string;
}

const BG: Record<Variant, string> = {
  primary: color.brand[600],
  secondary: color.paper,
  quiet: 'transparent',
  danger: color.danger[500],
};

const FG: Record<Variant, string> = {
  primary: color.paper,
  secondary: color.ink[900],
  quiet: color.ink[700],
  danger: color.paper,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  disabled,
  loading,
  full = true,
  style,
  a11yLabel,
}: ButtonProps) {
  const inactive = disabled || loading;
  const height = size === 'large' ? sizing.buttonHeight : sizing.buttonHeightSmall;

  return (
    <Pressable
      // 시안 우선 전환으로 small=36. 터치 44 하한은 hitSlop 으로 보전합니다.
      hitSlop={size === 'small' ? 6 : 0}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          /**
           * 가이드라인 §5.1: 비활성 기본 버튼은 흐려지는 게 아니라 track 색으로 바뀝니다.
           * 흐린 파랑은 "잠깐 로딩 중" 처럼 보여서 눌러도 되는 줄 압니다.
           * 로딩 중일 때는 색을 유지하고 스피너로만 알립니다.
           */
          backgroundColor:
            disabled && variant === 'primary' ? color.track : BG[variant],
          alignSelf: full ? 'stretch' : 'flex-start',
          paddingHorizontal: full ? space[5] : space[6],
          opacity:
            disabled && variant === 'primary'
              ? 1
              : inactive
                ? theme.opacity.disabled
                : pressed
                  ? theme.opacity.pressed
                  : 1,
        },
        variant === 'secondary' && styles.secondaryBorder,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <Text style={[text.button, { color: FG[variant] }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** 화면 하단에 고정되는 주 행동 영역. 한 화면에 주 행동은 하나만 둡니다. */
/**
 * 화면 하단 고정 버튼 영역.
 *
 * 안전영역을 여기서 직접 처리합니다.
 * Screen 의 SafeAreaView 에 맡기면 버튼 배경(흰색)이 화면 끝까지 안 내려가고
 * 아래에 캔버스 색 띠가 남습니다. 그리고 제스처 바와 겹쳐 터치가 씹힙니다.
 *
 * insets.bottom 은 제스처 내비게이션이면 20~34, 버튼 방식이면 0 입니다.
 * 0 이어도 손가락이 화면 끝에 걸리지 않도록 최소 여백을 둡니다.
 */
export function BottomAction({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, space[4]) }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    // 가이드라인 §3.1: 버튼은 12 (카드 16 과 구분)
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space[2],
  },
  secondaryBorder: {
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
  },
  bottomAction: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    backgroundColor: color.paper,
    borderTopWidth: theme.border.hairline,
    borderTopColor: color.ink[200],
    gap: space[2],
  },
});
