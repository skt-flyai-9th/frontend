import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme, { color, radius, sizing, space, text } from '../design/theme';
import { pressTap } from './press';

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
  /**
   * 문구 앞에 붙는 아이콘 (시안 PrimaryButton 의 icon).
   * 색은 버튼이 정합니다 — 호출부가 색까지 정하면 variant 와 어긋납니다.
   */
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
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
  icon: Icon,
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
          /**
           * 시안은 눌림을 축소로 표현합니다(active:scale-95). 투명도는 비활성에만 씁니다.
           * 기본 버튼의 비활성은 track 색이 이미 말해 주므로 흐리지 않습니다.
           */
          opacity:
            disabled && variant === 'primary' ? 1 : inactive ? theme.opacity.disabled : 1,
        },
        // 비활성일 때는 눌러도 반응하지 않아야 하므로 축소도 걸지 않습니다.
        !inactive && pressTap(pressed, 'button'),
        variant === 'secondary' && styles.secondaryBorder,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={18} strokeWidth={2} color={FG[variant]} /> : null}
          <Text style={[text.button, { color: FG[variant] }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
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

  /*
    🔴 **키보드가 올라오면 아래 안전영역을 빼야 합니다** (2026-08-31 지시 ③:
       "촬영 가이드 화면에서 하단 버튼과 키보드 사이 여백 없애기").

    아래 안전영역(홈 인디케이터, 34)은 **화면 맨 아래에 있을 때** 필요한 값입니다.
    키보드가 올라오면 그 자리를 키보드가 덮으므로 남겨 둘 이유가 없는데, 그대로
    두고 있어서 **버튼과 키보드 사이에 34pt 흰 띠**가 남았습니다.

    키보드가 올라온 동안에는 8 만 둡니다. 버튼이 키보드에 붙어 보이지 않을
    만큼만입니다. 이 컴포넌트를 쓰는 화면 전부에 같이 적용됩니다 — 입력이 있는
    화면이면 어디서나 같은 띠가 생기던 문제입니다.
  */
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    // iOS 는 will* 이 먼저 와서 애니메이션과 같이 움직입니다. 안드로이드는 did* 만 옵니다.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardUp(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <View
      style={[
        styles.bottomAction,
        { paddingBottom: keyboardUp ? space[2] : Math.max(insets.bottom, space[4]) },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // 시안: 아이콘과 문구 사이 gap-2
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
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
