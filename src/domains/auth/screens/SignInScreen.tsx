/**
 * SignInScreen — **시안 v3 `auth` 대조 이식** (2026-08-26). 명세 1.3.
 *
 * 시안 구조 (위에서부터, 이게 전부입니다)
 *   화면    앱바 없음 · bg-canvas · 세로 가운데 정렬 · px-6(24) · pb-16(64)
 *   ①      RealsLogo **48 · slate 색** + mt-2 문구 15·medium·slate
 *          (32·검정으로 들어가 있었습니다 — 시안 v3 의 글자 로고 시절 값입니다.
 *           9차 원문은 `<RealsLogo size={48} tone="#64748B" />` 입니다)
 *   ②      mt-9(36) gap-3(12) · AuthField 2개 (mail / lock 아이콘, h52)
 *          틀리면 그 아래 13·medium·heart 한 줄 + circle-alert 15
 *   ③      mt-6(24) 로그인 버튼 h48 rounded-xl brand
 *   ④      mt-4(16) 작은 링크 바 — 아이디 찾기 │ 비밀번호 재설정 │ 회원가입(brand)
 *          구분선은 h-3(12) w-px hairline
 *
 * ⚠️ 아이디 찾기·비밀번호 재설정은 **화면이 없습니다**.
 *    MVP 에 계정 복구 API 가 없어서(BE 전달사항 §Phase 2 요청), 화면만 만들면
 *    사장님이 입력하고 눌러도 아무 일이 안 일어납니다. 그러면 계정에 영영 못
 *    들어가고 앱을 지웁니다 — 가게 정보도 만든 영상도 함께 사라집니다.
 *    그래서 시안의 자리와 문구는 그대로 두되, 누르면 문의 메일이 열립니다.
 *    API 가 생기면 이 두 곳만 시안 04·05 화면으로 갈아 끼우면 됩니다.
 */
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CircleAlert, Lock, Mail } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AuthField } from '../../../ui/AuthField';
import { RealsLogo } from '../../../ui/RealsLogo';
import { pressTap } from '../../../ui/press';
import theme, { color, space, text } from '../../../design/theme';
import { useLogin } from '../../../api/queries/auth';
import { ApiError, BASE_URL } from '../../../api/http';
import { useAppState } from '../../../lib/appState';
import type { RootStackParamList } from '../../../navigation/types';

const SUPPORT_MAIL = 'yeoljeong2team@gmail.com';

export default function SignInScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();
  const setSignedIn = useAppState((s) => s.setSignedIn);
  const storeId = useAppState((s) => s.storeId);

  /** 시안: 입력을 고치면 빨간 표시가 바로 풀립니다. */
  const edit = (set: (v: string) => void) => (v: string) => {
    setError(null);
    set(v);
  };

  /** 계정 복구 API 가 생기기 전까지는 사람에게 연결합니다. */
  const askSupport = (subject: string) =>
    Linking.openURL(
      `mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent(`[Reals] ${subject}`)}`
    ).catch(() => setError(`메일 앱을 열지 못했습니다. ${SUPPORT_MAIL} 으로 보내 주세요.`));

  const submit = () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          setSignedIn(true);
          // 이미 가게를 등록한 사람은 검색을 다시 시키지 않습니다.
          if (storeId) nav.replace('Main', { screen: 'HomeFeed' });
          else nav.replace('StoreSetup', { screen: 'StoreSearch' });
        },
        onError: (e) => {
          if (!(e instanceof ApiError)) {
            setError('로그인하지 못했습니다.');
            return;
          }
          /**
           * 서버에 닿지도 못한 경우에는 **어디로 연결하려 했는지**까지 보여줍니다.
           *
           * 주소를 못 읽어 localhost 로 떨어지면 화면에는 그냥 "로그인이 안 된다" 로만
           * 보입니다(2026-08-26 실제로 그 일이 있었습니다). 비밀번호가 틀린 것인지
           * 서버에 못 닿은 것인지 한눈에 구분되게 합니다.
           */
          setError(
            e.code === 'NETWORK_ERROR' ? `${e.message}\n(연결 시도: ${BASE_URL})` : e.message
          );
        },
      }
    );
  };

  /*
   * 시안은 이 화면에서 하단 안전영역을 따로 잡지 않습니다 — pb-16(64) 이 그 몫까지 합니다.
   * bottom edge 까지 켜면 34 를 더 먹어, 가운데 정렬이 그만큼 위로 뜹니다.
   */
  return (
    <Screen scroll={false} padded={false} edges={['top']}>
      <View style={styles.center}>
        {/* ① 로고 + 한 줄 */}
        <View>
          {/* 시안 9차: size 48 · tone #64748B(= ink[500]) · 상자 없이 이미지만 */}
          <RealsLogo size={48} tint={color.ink[500]} lineBox={false} />
          <Text style={styles.tagline}>로그인하고 오늘의 숏폼을 시작하세요.</Text>
        </View>

        {/* ② 입력 */}
        <View style={styles.fields}>
          <AuthField
            icon={Mail}
            placeholder="이메일 주소"
            value={email}
            onChangeText={edit(setEmail)}
            invalid={!!error}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
          />
          <AuthField
            icon={Lock}
            placeholder="비밀번호"
            value={password}
            onChangeText={edit(setPassword)}
            invalid={!!error}
            secureTextEntry
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {error ? (
            <View style={styles.errorRow}>
              <CircleAlert size={15} strokeWidth={2} color={color.danger[500]} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        {/* ③ 로그인 */}
        <View style={styles.cta}>
          <Button label="로그인" onPress={submit} loading={login.isPending} />
        </View>

        {/* ④ 링크 바 */}
        <View style={styles.linkBar}>
          <LinkText label="아이디 찾기" onPress={() => askSupport('아이디 찾기 문의')} />
          <View style={styles.divider} />
          <LinkText label="비밀번호 재설정" onPress={() => askSupport('비밀번호 재설정 문의')} />
          <View style={styles.divider} />
          <LinkText
            label="회원가입"
            tint={color.brand[600]}
            onPress={() => nav.navigate('Auth', { screen: 'SignUp' })}
          />
        </View>
      </View>
    </Screen>
  );
}

function LinkText({
  label,
  onPress,
  tint,
}: {
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => pressTap(pressed, 'button')}
    >
      <Text style={[styles.link, tint ? { color: tint } : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /**
   * 시안: flex-1 justify-center px-6 pb-16.
   * pb-16 은 "가운데보다 조금 위" 를 만드는 값입니다 — 키보드가 올라와도
   * 로고와 입력이 함께 보입니다.
   */
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: space[6], paddingBottom: 64 },

  // 시안: mt-2 · 15 · medium · slate-muted
  // 시안 15 는 leading 이 없어 1.5 가 걸립니다
  tagline: { ...text.body, lineHeight: 22.5, marginTop: space[2], color: color.ink[500] },

  // 시안: mt-9(36) gap-3(12). 36 은 원본 스케일에도 없어 그대로 둡니다.
  fields: { marginTop: 36, gap: space[3] },

  // 시안: pl-1 gap-1.5 · 13 · medium · heart
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
  errorText: { ...text.caption, flex: 1, color: color.danger[500] },

  cta: { marginTop: space[6] },

  // 시안: mt-4 gap-4 가운데 정렬
  linkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    marginTop: space[4],
  },
  // 시안 13 은 leading 이 없어 1.5 가 걸립니다
  link: { ...text.caption, lineHeight: 19.5, color: color.ink[500] },
  // 시안: h-3 w-px bg-hairline
  divider: { width: theme.border.hairline, height: 12, backgroundColor: color.ink[200] },
});
