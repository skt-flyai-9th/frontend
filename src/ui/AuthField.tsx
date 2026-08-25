/**
 * AuthField — 시안 v3 `AuthField` 대조 이식.
 *
 * 시안 원문
 *   상자   h52 · rounded-xl(12) · border-hairline · bg-surface · px-4 · gap-2.5(10)
 *   아이콘 18 · slate-muted (틀리면 heart)
 *   입력   15 · medium · ink · placeholder slate-muted
 *   invalid 이면 테두리와 아이콘이 heart 로 바뀝니다
 *
 * 라벨이 붙는 일반 폼은 Field 를 씁니다. 이건 라벨 없이 아이콘 + placeholder 만
 * 쓰는 계정 화면(로그인·회원가입·계정 찾기) 전용입니다.
 */
import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import theme, { color, radius, sizing, text } from '../design/theme';

/** lucide 아이콘 컴포넌트를 그대로 받습니다 (Mail, Lock …). */
type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface AuthFieldProps extends TextInputProps {
  icon: IconComponent;
  /** 입력이 틀렸을 때. 테두리와 아이콘이 빨강으로 바뀝니다. */
  invalid?: boolean;
  /** 우측에 붙는 것 (비밀번호 보기 버튼 등) */
  trailing?: React.ReactNode;
}

export function AuthField({ icon: Icon, invalid, trailing, style, ...rest }: AuthFieldProps) {
  return (
    <View style={[styles.box, invalid && styles.boxInvalid]}>
      <Icon size={18} strokeWidth={2} color={invalid ? color.danger[500] : color.ink[500]} />
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={color.ink[500]}
        accessibilityLabel={rest.placeholder}
        {...rest}
      />
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // 시안 gap-2.5
    height: sizing.inputHeight, // 시안 style={{height:52}}
    paddingHorizontal: 16, // 시안 px-4
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
  },
  boxInvalid: { borderColor: color.danger[500] },
  // 상자가 높이를 정하므로 입력은 채우기만 합니다.
  input: { ...text.body, flex: 1, height: '100%', color: color.ink[900], padding: 0 },
});
