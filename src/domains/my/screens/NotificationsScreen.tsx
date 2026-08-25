/**
 * NotificationsScreen — **시안 V4 `NotificationsScreen` 대조 이식** (2026-08-26).
 *
 * V4 재대조 (비교 이미지 @2x 픽셀 측정): 배치는 이미 맞습니다 —
 * 헤더 구분선 y196, 푸시 카드 x[54,731], 버튼 x[162,441] h72 가 시안과 동일하고
 * 행 구분선도 1~2 안입니다. 고친 것은 안 읽은 행의 **틴트 농도**와
 * 빈 상태 위 여백, 그리고 시안 등장 애니메이션입니다.
 *
 * 시안 사양 (원문 수치 그대로)
 *   헤더     TopHeader variant="back" · 중앙 타이틀 "알림"
 *   푸시카드 mx-4 mb-3 · rounded-2xl · border-hairline · bg-panel · p-4
 *            타일 36 rounded-xl bg-brand-tint + bell-off 18
 *            제목 14·semibold / 본문 13 / 버튼 h-9 rounded-lg bg-brand 13·semibold
 *   목록 행  px-4 py-4 · 아래 hairline/60 · 안읽음이면 bg-brand-tint/40
 *            타일 36 rounded-xl (verified 는 초록 10%) + 아이콘 18
 *            제목 14·semibold + 안읽음 점 6 · 본문 13 · 시각 12
 *   하단     "모두 읽음 처리" 14·semibold·slate (누르면 목록이 비고 빈 상태로)
 *
 * ⚠️ 알림 API 가 명세에 없습니다(1.x~17.x 어디에도 없음).
 *    그래서 목록은 mock 픽스처에서만 옵니다 — 실서버 연결 시에는 빈 상태가 됩니다.
 *    화면 구조는 시안 그대로라, API 가 생기면 데이터 출처만 바꾸면 됩니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Bell, BellOff, CircleCheck, ExternalLink, Sparkles, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { StateBlock } from '../../../ui/Feedback';
import { pressTap } from '../../../ui/press';
import { useNotifications, type Notice } from '../../../api/queries/notifications';
import theme, { color, radius, space, text } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';

/** 시안 icon 문자열 → lucide 컴포넌트 */
const ICONS = {
  'trending-up': TrendingUp,
  sparkles: Sparkles,
  'circle-check': CircleCheck,
} as const;

/**
 * 시안 `rise-in` — `@keyframes rise{from{opacity:0;transform:translateY(14px)}}`
 * `.3s cubic-bezier(.16,1,.3,1)`. 목록 행은 `animationDelay: i*0.05` 로 계단식입니다.
 *
 * 알림이 한꺼번에 나타나면 어느 것이 새 것인지 안 보입니다. 위에서부터 차례로
 * 들어와야 읽는 순서가 생깁니다.
 */
function RiseIn({
  delay = 0,
  style,
  children,
}: {
  delay?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 300,
      delay,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [t, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data } = useNotifications();

  /** 읽음 처리는 서버가 없어 화면 안에서만 유지합니다. */
  const [items, setItems] = useState<Notice[] | null>(null);
  const list = items ?? data ?? [];

  const markRead = (id: string) =>
    setItems(list.map((n) => (n.id === id ? { ...n, unread: false } : n)));

  return (
    <Screen edges={['top']} padded={false} contentStyle={{ paddingTop: 0, gap: 0 }}>
      <AppBar onBack={() => nav.goBack()} title="알림" />

      {/*
        시안의 알림 안내 카드 (rise-in).

        ⚠️ 시안은 `{!pushOn && …}` 로 **꺼져 있을 때만** 띄우고 문구도
           "푸시 알림이 꺼져 있어요" 라고 단정합니다. 우리는 그렇게 못 씁니다 —
           `expo-notifications` 가 의존성에 없어서 **실제 권한 상태를 읽을 수가
           없습니다**. 상태를 모르는 채 꺼져 있다고 말하면, 이미 켜 둔 사장님에게
           거짓말을 하는 셈입니다.

           그래서 카드는 늘 두되 문구를 단정에서 안내로 바꿨습니다. 켜져 있든
           꺼져 있든 맞는 말이고, 눌러서 설정으로 가는 길도 그대로입니다.
           (`expo-notifications` 가 다른 이유로 들어오면 그때 시안처럼
            `getPermissionsAsync()` 로 가려서 켜져 있으면 숨기면 됩니다)
      */}
      <RiseIn style={styles.pushCard}>
        <View style={styles.pushTile}>
          <BellOff size={18} strokeWidth={2} color={color.brand[600]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pushTitle}>알림을 켜두면 놓치지 않아요</Text>
          {/*
           * 두 줄로 감기게 길이를 맞췄습니다. 시안 문구가 두 줄(31자)이라
           * 한 줄로 줄이면 카드가 22pt 짧아지고 아래 목록 전체가 위로 올라옵니다
           * (실측: 3.4% → 6.0%). 문구를 바꿀 때 길이도 같이 보셔야 합니다.
           */}
          <Text style={styles.pushBody}>
            조회수 리포트와 새 추천이 도착하면 앱을 열지 않아도 바로 알려 드려요.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => Linking.openSettings().catch(() => {})}
            style={({ pressed }) => [styles.pushBtn, pressTap(pressed, 'button')]}
          >
            <Text style={styles.pushBtnText}>설정에서 알림 켜기</Text>
            <ExternalLink size={14} strokeWidth={2} color={color.paper} />
          </Pressable>
        </View>
      </RiseIn>

      {list.length === 0 ? (
        // 시안 pt-24(96). space 에 24 가 없어 값으로 씁니다.
        <View style={{ paddingTop: 96 }}>
          <StateBlock
            icon={Bell}
            tone="muted"
            title="새 알림이 없어요"
            body="리포트와 추천이 도착하면 여기에 표시됩니다."
          />
        </View>
      ) : (
        <View>
          {list.map((n, i) => {
            const Icon = ICONS[n.icon] ?? Bell;
            const verified = n.tone === 'verified';
            return (
              /* 시안: rise-in · animationDelay i*0.05 */
              <RiseIn key={n.id} delay={50 * i}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${n.title}. ${n.body}`}
                  onPress={() => markRead(n.id)}
                  style={({ pressed }) => [
                    styles.row,
                    // 시안: 안 읽은 알림은 브랜드 틴트가 옅게 깔립니다
                    n.unread && styles.rowUnread,
                    pressed && { backgroundColor: color.surface },
                  ]}
                >
                  <View style={[styles.tile, verified ? styles.tileDone : styles.tileBrand]}>
                    <Icon
                      size={18}
                      strokeWidth={2}
                      color={verified ? color.done[500] : color.brand[600]}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title}>{n.title}</Text>
                      {n.unread ? <View style={styles.dot} /> : null}
                    </View>
                    <Text style={styles.body}>{n.body}</Text>
                    <Text style={styles.time}>{n.time}</Text>
                  </View>
                </Pressable>
              </RiseIn>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={() => setItems([])}
            style={({ pressed }) => [styles.readAll, pressTap(pressed, 'button')]}
          >
            <Text style={styles.readAllText}>모두 읽음 처리</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 시안: mx-4 mb-3 · rounded-2xl · p-4
  pushCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    marginHorizontal: space[4],
    marginBottom: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
  },
  pushTile: {
    marginTop: 2,
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: color.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushTitle: { ...theme.text.bodySmall, fontFamily: theme.text.bodyStrong.fontFamily, fontWeight: theme.text.bodyStrong.fontWeight, color: color.ink[900] },
  pushBody: { ...theme.text.caption, marginTop: space[1], lineHeight: 20, color: color.ink[500] },
  // 시안: h-9 rounded-lg bg-brand px-3 · 13·semibold
  pushBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: 36,
    marginTop: 10,
    paddingHorizontal: space[3],
    borderRadius: radius.sm,
    backgroundColor: color.brand[600],
  },
  pushBtnText: { ...theme.text.chipLabel, color: color.paper },

  // 시안: px-4 py-4 · 아래 hairline/60
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[4],
    borderBottomWidth: theme.border.hairline,
    borderBottomColor: color.hairlineSoft,
  },
  /*
   * 시안 `bg-brand-tint/40` — brand.50(#EFF6FF)을 **40%** 로 깐 값입니다.
   * 0.6 으로 돼 있어 시안보다 진했습니다 (@2x 측정: 시안 rgb(249,251,255) /
   * 앱 rgb(245,250,255)). 안 읽은 행이 화면의 5분의 1을 덮어 차이가 그대로 드러납니다.
   */
  rowUnread: { backgroundColor: 'rgba(239,246,255,0.4)' },
  tile: {
    marginTop: 2,
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBrand: { backgroundColor: color.brand[50] },
  tileDone: { backgroundColor: 'rgba(16,185,129,0.1)' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { ...theme.text.bodySmall, fontFamily: theme.text.bodyStrong.fontFamily, fontWeight: theme.text.bodyStrong.fontWeight, color: color.ink[900], flexShrink: 1 },
  dot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: color.danger[500] },
  // 시안: 13 · leading-relaxed(1.625) = 21
  body: { ...theme.text.caption, marginTop: space[1], lineHeight: 21, color: color.ink[500] },
  // 시안: 12 · 기본 leading(1.5) = 18
  time: {
    ...theme.text.label,
    lineHeight: 18,
    marginTop: 6,
    fontFamily: theme.text.caption.fontFamily,
    fontWeight: theme.text.caption.fontWeight,
    color: color.ink[500],
  },

  readAll: { alignSelf: 'center', marginTop: space[5], paddingVertical: space[2] },
  readAllText: { ...theme.text.bodySmall, fontFamily: theme.text.bodyStrong.fontFamily, fontWeight: theme.text.bodyStrong.fontWeight, color: color.ink[500] },
});
