/**
 * NotificationsScreen — **시안 v3 `NotificationsScreen` 대조 이식** (2026-08-26).
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
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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

      {/* 시안: 푸시가 꺼져 있을 때 맨 위에 뜨는 안내 카드 */}
      <View style={styles.pushCard}>
        <View style={styles.pushTile}>
          <BellOff size={18} strokeWidth={2} color={color.brand[600]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pushTitle}>푸시 알림이 꺼져 있어요</Text>
          <Text style={styles.pushBody}>
            조회수 리포트와 새 추천을 놓치지 않으려면 알림을 켜주세요.
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
      </View>

      {list.length === 0 ? (
        <View style={{ paddingTop: space[10] }}>
          <StateBlock
            icon={Bell}
            tone="muted"
            title="새 알림이 없어요"
            body="리포트와 추천이 도착하면 여기에 표시됩니다."
          />
        </View>
      ) : (
        <View>
          {list.map((n) => {
            const Icon = ICONS[n.icon] ?? Bell;
            const verified = n.tone === 'verified';
            return (
              <Pressable
                key={n.id}
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
  // 시안 bg-brand-tint/40 — brand.50 을 40% 로 깐 것과 같습니다
  rowUnread: { backgroundColor: 'rgba(239,246,255,0.6)' },
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
