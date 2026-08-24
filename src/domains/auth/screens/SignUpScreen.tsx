/** S01.1.3 회원가입 · 명세 1.2 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Banner } from '../../../ui/Feedback';
import { Field } from '../../../ui/Field';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useSignup } from '../../../api/queries/auth';
import { ApiError } from '../../../api/http';
import type { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signup = useSignup();

  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  // 명세 1.2 body 기준 필수값
  const valid =
    form.name.trim() &&
    form.email.includes('@') &&
    form.phone.replace(/\D/g, '').length >= 10 &&
    form.password.length >= 8;

  const submit = () => {
    setError(null);
    signup.mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/\D/g, ''),
        password: form.password,
        termsAgreed: true,
        marketingAgreed: marketing,
      },
      {
        onSuccess: () => navigation.replace('SignIn'),
        onError: (e) => setError(e instanceof ApiError ? e.message : '가입하지 못했습니다.'),
      }
    );
  };

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="가입하기"
            onPress={submit}
            disabled={!valid}
            loading={signup.isPending}
          />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="회원가입" />
      <Text style={text.title}>계정을 만들어 주세요</Text>

      {error ? <Banner tone="danger" title={error} /> : null}

      <Field label="이름" required value={form.name} onChangeText={set('name')} placeholder="김사장" />
      <Field
        label="이메일"
        required
        value={form.email}
        onChangeText={set('email')}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="boss01@example.com"
      />
      <Field
        label="전화번호"
        required
        value={form.phone}
        onChangeText={set('phone')}
        keyboardType="phone-pad"
        placeholder="01012345678"
        hint="영상 완성 알림을 보낼 때 씁니다."
      />
      <Field
        label="비밀번호"
        required
        value={form.password}
        onChangeText={set('password')}
        secureTextEntry
        hint="8자 이상으로 정해 주세요."
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: marketing }}
        onPress={() => setMarketing((v) => !v)}
        style={styles.row}
      >
        <View style={[styles.box, marketing && styles.boxOn]}>
          {marketing ? <Check size={16} strokeWidth={3} color={color.paper} /> : null}
        </View>
        <Text style={text.bodySmall}>[선택] 새 기능과 소식을 받아볼래요</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 52 },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: theme.border.thick,
    borderColor: color.ink[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: color.brand[600], borderColor: color.brand[600] },
});
