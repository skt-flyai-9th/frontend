/** S01.2.2 로그아웃·탈퇴 + S01.3 권한 상태 · 명세 1.4 */
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { Screen } from '../../../ui/Screen';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useLogout, useWithdraw } from '../../../api/queries/auth';
import { useStore } from '../../../api/queries/store';
import { useAppState, useCurrentStore } from '../../../lib/appState';
import { formatDate } from '../../../api/schema/convert';
import type { RootStackParamList } from '../../../navigation/types';

export default function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const storeId = useCurrentStore();
  const { data: store } = useStore(storeId);
  const logout = useLogout();
  const withdraw = useWithdraw();
  const reset = useAppState((s) => s.reset);

  const confirmLogout = () =>
    Alert.alert('로그아웃할까요?', '이 기기에서만 로그아웃됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () =>
          logout.mutate(undefined, {
            onSettled: () => {
              reset();
              nav.reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'SignIn' } }] });
            },
          }),
      },
    ]);

  const confirmWithdraw = () =>
    Alert.alert(
      '정말 탈퇴하시겠어요?',
      '가게 정보와 만든 영상이 모두 삭제되고 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: () =>
            withdraw.mutate('서비스 이용 종료', {
              onSettled: () => {
                reset();
                nav.reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'SignIn' } }] });
              },
            }),
        },
      ]
    );

  return (
    <Screen edges={['top']}>
      <Text style={text.title}>설정</Text>

      {store && (
        <Card>
          <Text style={text.subheading}>{store.name}</Text>
          <Text style={text.caption}>
            {store.category} · {store.address}
          </Text>
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <Badge label={`정보 갱신 ${formatDate(store.updatedAt)}`} />
          </View>
        </Card>
      )}

      <Section title="권한">
        <Row label="카메라·마이크" hint="촬영할 때만 씁니다" onPress={() => Linking.openSettings()} />
        <Row label="사진첩" hint="영상을 저장할 때만 씁니다" onPress={() => Linking.openSettings()} />
        <Row label="알림" hint="영상이 다 만들어지면 알려드립니다" onPress={() => Linking.openSettings()} />
      </Section>

      <Section title="연결">
        <Row
          label="SNS 계정 연결"
          hint="조회수와 반응을 받아옵니다"
          onPress={() => nav.navigate('Main', { screen: 'My', params: { screen: 'SnsConnect' } })}
        />
      </Section>

      <Section title="플랜">
        {/*
          시안에는 "Free 플랜 · 이번 달 3/3 사용 중" 이 있지만
          플랜·사용량 조회 API 가 없어 현재 상태는 표시하지 않습니다.
          가짜 숫자를 띄우지 않습니다.
        */}
        <Row
          label="플랜 안내"
          hint="Free · Pro 요금제 보기"
          onPress={() => nav.navigate('Main', { screen: 'My', params: { screen: 'Plans' } })}
        />
      </Section>

      <Section title="안내">
        <Row label="사용법 다시 보기" onPress={() => nav.navigate('Onboarding', { screen: 'Intro' })} />
        {/* 시안 legal: 약관은 목록 화면 하나로 모읍니다. 뷰어는 읽기 모드로 열립니다. */}
        <Row
          label="약관 및 정책"
          onPress={() => nav.navigate('Main', { screen: 'My', params: { screen: 'Legal' } })}
        />
      </Section>

      <Section title="계정">
        <Row label="로그아웃" onPress={confirmLogout} />
        <Row label="회원 탈퇴" danger onPress={confirmWithdraw} />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space[2] }}>
      <Text style={[text.caption, { paddingHorizontal: space[1] }]}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function Row({
  label,
  hint,
  danger,
  onPress,
}: {
  label: string;
  hint?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: theme.opacity.pressed }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[text.body, danger && { color: color.danger[500] }]}>{label}</Text>
        {hint ? <Text style={text.caption}>{hint}</Text> : null}
      </View>
      <ChevronRight size={20} strokeWidth={2} color={color.ink[300]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: color.paper,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[4],
    minHeight: 60,
    borderBottomWidth: theme.border.hairline,
    borderBottomColor: color.ink[200],
  },
});
