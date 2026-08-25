/**
 * SettingsScreen — **시안 v3 `settings` 대조 이식** (2026-08-26).
 *
 * 시안 구조 (위에서부터 그대로)
 *   ① 뒤로가기 + "설정" (좌측 정렬 · 18·bold)
 *   ② Free 플랜 카드 — brand-tint 배경 + brand-border
 *        흰 타일(44) 안에 왕관 · "Free 플랜" 15·semibold
 *        "이번 달 3/3 사용 중" 13·slate · 우측에 "Pro 업그레이드" 브랜드 버튼(h-9)
 *   ③ 목록 카드 — 자주 묻는 질문 / 알림 / 서비스 이용약관 / 개인정보 처리방침 / 상태·오류
 *        아이콘 20·slate + 라벨 15·medium + chevron 18
 *   ④ 로그아웃 — 흰 카드 · 하트색 글자 · 아이콘 동반
 *   ⑤ 회원탈퇴(밑줄) · "Reals. 버전 1.0.0"
 *
 * ⚠️ 이전 구현은 가게 이름·권한 상태를 위에 두고 있었습니다. 시안에 없는 구성이라
 *    전부 걷어냈습니다. 권한 안내는 지우지 않고 마이페이지 진입점에 남아 있습니다
 *    (기능 축소 없이 시안 배치를 따른다는 방침).
 *
 * ⚠️ "이번 달 3/3" 은 사용량 API 가 없어 숫자를 지어낼 수 없습니다.
 *    영역은 시안대로 두되 값이 없으면 문구로 대신합니다.
 */
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Crown,
  FileText,
  Layers,
  LogOut,
  Shield,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { pressTap } from '../../../ui/press';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useLogout, useWithdraw } from '../../../api/queries/auth';
import { useAppState } from '../../../lib/appState';
import type { RootStackParamList, MyStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList & MyStackParamList>;

/** 시안 SETTINGS_ITEMS 순서 그대로. 아이콘도 시안이 지정한 lucide 이름입니다. */
/** Faq·Notifications 는 탭 밖(Root), 나머지는 마이 탭 안입니다. */
type Dest = keyof MyStackParamList | 'Notifications' | 'Faq';

const ITEMS: { icon: typeof Bell; label: string; go: Dest }[] = [
  { icon: CircleHelp, label: '자주 묻는 질문', go: 'Faq' },
  { icon: Bell, label: '알림', go: 'Notifications' },
  { icon: FileText, label: '서비스 이용약관', go: 'Legal' },
  { icon: Shield, label: '개인정보 처리방침', go: 'Legal' },
  // 시안의 "상태·오류 화면 (리뷰용)" 자리. 우리는 권한 안내를 여기에 둡니다.
  { icon: Layers, label: '앱 권한 안내', go: 'PermissionsInfo' },
];

export default function SettingsScreen() {
  const nav = useNavigation<Nav>();
  const logout = useLogout();
  const withdraw = useWithdraw();
  const reset = useAppState((s) => s.reset);

  const confirmLogout = () =>
    Alert.alert('로그아웃 하시겠어요?', '다시 로그인하면 언제든 이어서 작업할 수 있어요.', [
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
    Alert.alert('정말 탈퇴하시겠어요?', '가게 정보와 만든 영상이 모두 삭제되고 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴',
        style: 'destructive',
        onPress: () =>
          withdraw.mutate('사용자 요청', {
            onSettled: () => {
              reset();
              nav.reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'SignIn' } }] });
            },
          }),
      },
    ]);

  return (
    <Screen background={color.surface} padded={false}>
      {/* ① 시안: 좌측 정렬 헤더 */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={6}
          onPress={() => nav.goBack()}
          style={({ pressed }) => [styles.backBtn, pressTap(pressed, 'icon')]}
        >
          <ChevronLeft size={24} strokeWidth={2} color={color.ink[900]} />
        </Pressable>
        <Text style={text.heading}>설정</Text>
      </View>

      <View style={styles.body}>
        {/* ② Free 플랜 카드 */}
        <View style={styles.planCard}>
          <View style={styles.planLeft}>
            <View style={styles.planTile}>
              <Crown size={22} strokeWidth={2} color={color.brand[600]} />
            </View>
            <View style={{ gap: 2 }}>
              <Text style={text.bodyStrong}>Free 플랜</Text>
              {/* 사용량 API 가 없어 "3/3" 같은 숫자를 지어내지 않습니다. */}
              <Text style={[text.caption, { color: color.ink[500] }]}>월 3편까지 만들 수 있어요</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => nav.navigate('Plans')}
            style={({ pressed }) => [styles.upgradeBtn, pressTap(pressed, 'button')]}
          >
            <Text style={styles.upgradeText}>Pro 업그레이드</Text>
          </Pressable>
        </View>

        {/* ③ 목록 카드 */}
        <View style={styles.list}>
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={() =>
                  // Root 화면과 탭 안 화면이 섞여 있어 분기합니다.
                  item.go === 'Notifications' || item.go === 'Faq'
                    ? nav.navigate(item.go)
                    : nav.navigate(item.go as never)
                }
                style={({ pressed }) => [
                  styles.row,
                  i !== ITEMS.length - 1 && styles.rowDivider,
                  pressed && { backgroundColor: color.surface },
                ]}
              >
                <View style={styles.rowLeft}>
                  <Icon size={20} strokeWidth={2} color={color.ink[500]} />
                  <Text style={styles.rowLabel}>{item.label}</Text>
                </View>
                <ChevronRight size={18} strokeWidth={2} color={color.ink[300]} />
              </Pressable>
            );
          })}
        </View>

        {/* ④ 로그아웃 */}
        <Pressable
          accessibilityRole="button"
          onPress={confirmLogout}
          style={({ pressed }) => [styles.logout, pressTap(pressed, 'card')]}
        >
          <LogOut size={18} strokeWidth={2} color={color.danger[500]} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>

        {/* ⑤ 회원탈퇴 · 버전 */}
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={confirmWithdraw} hitSlop={8}>
            <Text style={styles.withdraw}>회원탈퇴</Text>
          </Pressable>
          <Text style={[text.label, { color: color.ink[500] }]}>Reals. 버전 1.0.0</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 시안: px-4 pb-3, 뒤로가기 36 + 타이틀 좌측 정렬
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingBottom: space[3],
  },
  backBtn: {
    width: 36,
    height: 36,
    marginLeft: -6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: space[4], paddingBottom: space[10] },

  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.brand[300],
    backgroundColor: color.brand[50],
  },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 },
  planTile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtn: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
  },
  upgradeText: { ...theme.text.chipLabel, color: color.paper },

  list: {
    marginTop: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    overflow: 'hidden',
    ...theme.elevation('card'),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingVertical: 14,
  },
  rowDivider: { borderBottomWidth: theme.border.hairline, borderBottomColor: '#F1F5F9' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  rowLabel: { ...theme.text.body, color: color.ink[800] },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    marginTop: space[4],
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
  },
  logoutText: { ...theme.text.bodyStrong, color: color.danger[500] },

  footer: { marginTop: space[6], alignItems: 'center', gap: space[3] },
  withdraw: {
    ...theme.text.caption,
    color: color.ink[400],
    textDecorationLine: 'underline',
  },
});
