/** S01.2.1 로그인 · 명세 1.3 */
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Banner } from '../../../ui/Feedback';
import { Field } from '../../../ui/Field';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useLogin } from '../../../api/queries/auth';
import { ApiError } from '../../../api/http';
import { useAppState } from '../../../lib/appState';
import type { RootStackParamList } from '../../../navigation/types';

export default function SignInScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();
  const setSignedIn = useAppState((s) => s.setSignedIn);
  const storeId = useAppState((s) => s.storeId);

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
        onError: (e) => setError(e instanceof ApiError ? e.message : '로그인하지 못했습니다.'),
      }
    );
  };

  return (
    <Screen
      footer={
        <BottomAction>
          <Button label="로그인" onPress={submit} loading={login.isPending} />
          <Button
            label="아직 계정이 없어요"
            variant="quiet"
            size="small"
            onPress={() => nav.navigate('Auth', { screen: 'SignUp' })}
          />
        </BottomAction>
      }
    >
      <AppBar />
      <View style={{ gap: space[2] }}>
        <Text style={text.title}>로그인</Text>
        <Text style={text.bodySmall}>
          가게 정보와 만들던 영상을 이어서 쓰려면 로그인이 필요합니다.
        </Text>
      </View>

      {error ? <Banner tone="danger" title={error} /> : null}

      <Field
        label="이메일"
        required
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="boss01@example.com"
        textContentType="username"
      />
      <Field
        label="비밀번호"
        required
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
      />

      {/*
        비밀번호 찾기 화면은 만들지 않습니다 (확정).
        MVP 에 계정 복구 API 가 없어서, 화면만 있으면 눌러도 아무 일이 안 일어납니다.
        그러면 사장님은 계정에 영영 못 들어가고 앱을 지웁니다 — 가게 정보도
        만든 영상도 함께 사라집니다. 화면 대신 사람에게 연결합니다.
      */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="비밀번호 문의 메일 보내기"
        onPress={() =>
          Linking.openURL(
            'mailto:yeoljeong2team@gmail.com?subject=' +
              encodeURIComponent('[Reals] 비밀번호 문의')
          ).catch(() => {})
        }
        style={({ pressed }) => [styles.helpBox, pressed && { opacity: theme.opacity.pressed }]}
      >
        <Text style={text.bodySmall}>비밀번호를 잊으셨나요?</Text>
        <Text style={[text.bodySmall, { color: color.brand[600] }]}>
          yeoljeong2team@gmail.com
        </Text>
        <Text style={[text.caption, { color: color.ink[500] }]}>
          가입하신 이메일과 함께 알려주시면 도와드립니다.
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  helpBox: {
    gap: 2,
    marginTop: space[4],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
});
