/**
 * AuthField — 시안 v3 `AuthField` · `SignupField` 대조 이식.
 *
 * 시안 원문 (두 컴포넌트가 같은 상자를 쓰길래 하나로 합쳤습니다)
 *   상자   h52 · rounded-xl(12) · border-hairline · bg-surface · px-4 · gap-2.5(10)
 *   아이콘 18 · slate-muted (틀리면 heart)
 *   입력   15 · medium · ink · placeholder slate-muted
 *   라벨   mb-1.5(6) pl-1(4) · 12 · medium · slate-muted   ← SignupField 만
 *   확인됨 우측 check 18 · verified                        ← SignupField 만
 *   오류   mt-1 pl-1 gap-1.5 · 12 · medium · heart + circle-alert 13
 *
 * 라벨과 오류가 화면 규격을 따르는 일반 폼은 Field 를 씁니다.
 * 이건 계정 화면(로그인·회원가입·계정 찾기) 전용입니다.
 */
import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Check, CircleAlert } from 'lucide-react-native';
import theme, { color, radius, sizing, space, text } from '../design/theme';

/** lucide 아이콘 컴포넌트를 그대로 받습니다 (Mail, Lock …). */
type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface AuthFieldProps extends TextInputProps {
  icon: IconComponent;
  /** 상자 위 라벨. 회원가입처럼 무슨 칸인지 말해 줘야 할 때만 씁니다. */
  label?: string;
  /** 입력이 틀렸을 때. 테두리와 아이콘이 빨강으로 바뀝니다. */
  invalid?: boolean;
  /** 무엇이 틀렸는지. 넣으면 invalid 도 함께 켜집니다. */
  error?: string;
  /** 조건을 만족했을 때 우측에 뜨는 체크 (시안: 비밀번호 확인) */
  valid?: boolean;
  /** 우측에 붙는 것 (비밀번호 보기 버튼 등) */
  trailing?: React.ReactNode;
}

export function AuthField({
  icon: Icon,
  label,
  invalid,
  error,
  valid,
  trailing,
  style,
  ...rest
}: AuthFieldProps) {
  const bad = invalid || !!error;
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, bad && styles.boxInvalid]}>
        <Icon size={18} strokeWidth={2} color={bad ? color.danger[500] : color.ink[500]} />
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={color.ink[500]}
          accessibilityLabel={label ?? rest.placeholder}
          {...rest}
        />
        {valid && !bad ? <Check size={18} strokeWidth={2.5} color={color.done[500]} /> : null}
        {trailing}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <CircleAlert size={13} strokeWidth={2} color={color.danger[500]} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // 시안: mb-1.5(6) pl-1(4) · 12 · medium · slate-muted
  /*
   * 시안 SignupField 라벨: `mb-1.5 block pl-1 text-[12px] font-medium` —
   * `leading-*` 이 없어 줄상자가 12 × 1.5 = 18 입니다(토큰 17).
   * 필드가 7개인 회원가입에서 라벨마다 1pt 씩 쌓여 아래가 6pt 어긋났습니다.
   */
  label: { ...text.label, lineHeight: 18, marginBottom: 6, paddingLeft: 4, color: color.ink[500] },
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

  // 시안: mt-1 pl-1 gap-1.5 · 12 · medium · heart
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space[1],
    paddingLeft: 4,
  },
  errorText: { ...text.label, flex: 1, color: color.danger[500] },
});
