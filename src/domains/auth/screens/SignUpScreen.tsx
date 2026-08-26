/**
 * SignUpScreen — **시안 v3 `signup` 대조 이식** (2026-08-26). 명세 1.2.
 *
 * 시안 구조 (위에서부터)
 *   헤더    뒤로가기 + "회원가입"
 *   ①      "계정을 만들어 볼까요?" 22·bold + mt-2 안내 14·slate
 *   ②      mt-7(28) gap-3.5(14) 입력 5개 — 라벨 12 + 아이콘 상자 h52
 *          비밀번호 확인이 맞으면 우측에 초록 체크
 *          틀린 칸은 테두리·아이콘이 빨강이 되고 아래에 12·heart 한 줄
 *   ③      mt-auto pt-8 "다음" + mt-4 "이미 계정이 있으신가요? 로그인"
 *
 * ⚠️ 첫 칸은 시안대로 **"아이디"** 입니다 (2026-08-26, 사장님 지시).
 *
 *    한때 "이름" 으로 바꿔 뒀었습니다 — 시안은 아이디를 만들게 해 놓고 정작 로그인은
 *    이메일로 하기 때문입니다(시안 6차 AuthScreen 도 이메일 로그인입니다). 그래서
 *    사장님이 만든 아이디로 로그인을 시도하면 못 들어옵니다.
 *
 *    사장님 판단은 **시안 우선**이라 되돌렸습니다. 다만 명세 1.2 가 받는 값은
 *    name·email·phone·password 뿐이라 아이디를 따로 보낼 자리가 없어,
 *    **적어 주신 아이디를 `name` 으로 보냅니다.**
 *
 *    ⚠️ 그래서 마이페이지·프로필 등 "이름" 이 보이는 자리에는 사장님 성함이 아니라
 *       **아이디가 표시됩니다.** 서버에 아이디 컬럼이 생기면 그때 갈라야 합니다
 *       (BE_전달사항). 로그인은 지금도 이메일로만 됩니다 — 안내 문구가 그렇게 말합니다.
 *
 * ⚠️ 시안의 "다음 → 본인 인증(문자 6자리)" 단계는 **없습니다**.
 *    인증번호를 보내고 확인하는 API 가 명세에 없습니다. 화면만 만들면 아무 번호나
 *    통과시키거나(인증이 아님) 영영 못 넘어가거나 둘 중 하나입니다.
 *    그래서 이 화면에서 바로 가입하고, 버튼도 "다음" 대신 "가입하기" 입니다.
 *
 * ⚠️ 마케팅 수신 동의 체크박스를 뺐습니다.
 *    시안에 없고, 약관 화면에서 이미 같은 동의를 받고 있었습니다(두 번 묻던 셈).
 *    약관에서 받은 값을 appState 로 넘겨받아 가입할 때 함께 보냅니다.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CircleAlert, Lock, Mail, Phone, User } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { AuthField } from '../../../ui/AuthField';
import { pressTap } from '../../../ui/press';
import { color, space, text } from '../../../design/theme';
import { useSignup } from '../../../api/queries/auth';
import { useAppState } from '../../../lib/appState';
import { ApiError } from '../../../api/http';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList, RootStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

type FormKey = 'name' | 'password' | 'password2' | 'email' | 'phone';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  // 가입이 끝나면 이 스택을 벗어나므로 루트 내비게이션을 씁니다.
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [form, setForm] = useState<Record<FormKey, string>>({
    name: '',
    password: '',
    password2: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});
  /** 서버가 막은 경우(이미 가입된 이메일 등). 어느 칸 문제인지 모를 수 있어 버튼 위에 둡니다. */
  const [serverError, setServerError] = useState<string | null>(null);
  const signup = useSignup();
  const marketingAgreed = useAppState((s) => s.marketingAgreed);

  const set = (k: FormKey) => (v: string) => {
    // 시안: 고치기 시작하면 그 칸의 빨간 표시가 바로 풀립니다.
    setErrors((e) => ({ ...e, [k]: undefined }));
    setServerError(null);
    setForm((p) => ({ ...p, [k]: v }));
  };

  /** 시안 validate 원문 규칙에 명세 1.2 필수값(이름)을 얹었습니다. */
  const validate = () => {
    const next: Partial<Record<FormKey, string>> = {};
    // 시안 6차 원문 규칙: 아이디 4자 이상
    if (form.name.trim().length < 4) next.name = '아이디는 4자 이상 입력해주세요.';
    if (form.password.length < 8) next.password = '비밀번호는 8자 이상 입력해주세요.';
    if (form.password2 !== form.password) next.password2 = '비밀번호가 일치하지 않습니다.';
    if (!EMAIL.test(form.email)) next.email = '올바른 이메일 주소를 입력해주세요.';
    if (form.phone.replace(/\D/g, '').length < 10) next.phone = '올바른 휴대폰 번호를 입력해주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    setServerError(null);
    if (!validate()) return;
    signup.mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/\D/g, ''),
        password: form.password,
        termsAgreed: true,
        marketingAgreed,
      },
      {
        // 시안 V4: 가입 다음은 약관·접근 권한 동의입니다.
        onSuccess: () => rootNav.replace('PermissionsInfo'),
        onError: (e) =>
          setServerError(e instanceof ApiError ? e.message : '가입하지 못했습니다.'),
      }
    );
  };

  return (
    /*
     * flexGrow 를 줘야 스크롤 콘텐츠가 화면 높이만큼 늘어나고, 그래야 "가입하기" 가
     * mt-auto 로 바닥에 붙습니다(시안 mt-auto pt-8). 하단 안전영역은 끕니다 —
     * 시안처럼 pb-8(32) 이 그 몫까지 합니다.
     */
    <Screen
      padded={false}
      edges={['top']}
      contentStyle={{ paddingTop: 0, paddingBottom: 0, gap: 0, flexGrow: 1 }}
    >
      <AppBar onBack={() => navigation.goBack()} title="회원가입" />

      {/*
        하단 여백은 **시안값과 기기 안전영역 중 큰 쪽**입니다 (2026-08-26).
        시안 pb-8(32) 만 주면 제스처 내비게이션 폰에서 "이미 계정이 있으신가요? 로그인"
        이 시스템 바에 덮입니다 — 눌러도 안 눌리고 뒤로가기 제스처로 먹혀 앱이 나갑니다.
        브라우저 시안에는 시스템 바가 없어 드러나지 않던 문제입니다 (CLAUDE.md §5-③).
      */}
      <View style={[styles.body, { paddingBottom: Math.max(insets.bottom, space[8]) }]}>
        {/* ① */}
        <Text style={text.title}>계정을 만들어 볼까요?</Text>
        <Text style={styles.lead}>
          {/*
            ⚠️ 시안 원문은 "로그인에 사용할 **아이디와** 비밀번호" 입니다. 그대로 옮기면
               거짓말이 됩니다 — 로그인 화면은 시안 6차에서도 **이메일**로만 받습니다.
               그 문구를 믿고 아이디로 로그인을 시도하면 못 들어옵니다.
               25_푸시 안내 문구를 사실대로 바꿨던 것과 같은 이유입니다(CLAUDE.md §2).
               서버에 아이디 로그인이 생기면 시안 문구로 되돌리세요.
          */}
          로그인에 사용할 이메일과 비밀번호, 연락받을 정보를 입력해주세요.
        </Text>

        {/* ② */}
        <View style={styles.fields}>
          {/*
            시안 6차: 첫 칸은 "아이디" 입니다. 명세 1.2 에 아이디 자리가 없어
            이 값이 `name` 으로 나갑니다 — 위 머리말 참고.
          */}
          <AuthField
            icon={User}
            label="아이디"
            placeholder="4자 이상"
            value={form.name}
            onChangeText={set('name')}
            error={errors.name}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <AuthField
            icon={Lock}
            label="비밀번호"
            placeholder="8자 이상"
            value={form.password}
            onChangeText={set('password')}
            error={errors.password}
            secureTextEntry
            textContentType="newPassword"
            returnKeyType="next"
          />
          <AuthField
            icon={Lock}
            label="비밀번호 확인"
            placeholder="비밀번호를 다시 입력"
            value={form.password2}
            onChangeText={set('password2')}
            error={errors.password2}
            valid={form.password2.length > 0 && form.password2 === form.password}
            secureTextEntry
            textContentType="newPassword"
            returnKeyType="next"
          />
          <AuthField
            icon={Mail}
            label="이메일 주소"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={set('email')}
            error={errors.email}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
          />
          <AuthField
            icon={Phone}
            label="휴대폰 번호"
            placeholder="010-0000-0000"
            value={form.phone}
            onChangeText={set('phone')}
            error={errors.phone}
            keyboardType="phone-pad"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
        </View>

        {/* ③ */}
        <View style={styles.cta}>
          {serverError ? (
            <View style={styles.serverErrorRow}>
              <CircleAlert size={15} strokeWidth={2} color={color.danger[500]} />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          ) : null}
          <Button label="가입하기" onPress={submit} loading={signup.isPending} />
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => navigation.replace('SignIn')}
            style={({ pressed }) => [styles.loginLink, pressTap(pressed, 'button')]}
          >
            <Text style={styles.loginText}>
              이미 계정이 있으신가요? <Text style={styles.loginTint}>로그인</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 시안: px-6 pb-8 · 헤더(98) 아래로 pt-[110px] → 12 만큼 띄웁니다
  // paddingBottom 은 화면에서 안전영역과 함께 계산합니다 (위 주석 참고)
  body: { flex: 1, paddingHorizontal: space[6], paddingTop: space[3] },

  // 시안: mt-2 · 14 · slate-muted · leading-relaxed
  lead: { ...text.bodySmall, marginTop: space[2], color: color.ink[500] },

  // 시안: mt-7(28) gap-3.5(14)
  fields: { marginTop: space[7], gap: space['3.5'] },

  // 시안: mt-auto pt-8(32)
  cta: { marginTop: 'auto', paddingTop: space[8], gap: space[3] },
  serverErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
  serverErrorText: { ...text.caption, flex: 1, color: color.danger[500] },

  // 시안: mt-4 · 13 · medium · 가운데
  loginLink: { alignSelf: 'center', marginTop: space[1] },
  loginText: { ...text.caption, color: color.ink[500] },
  loginTint: { color: color.brand[600] },
});
