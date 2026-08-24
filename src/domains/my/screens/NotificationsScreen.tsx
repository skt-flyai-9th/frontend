/**
 * NotificationsScreen — 시안 `NotificationsScreen` 대조 이식.
 *
 * ⚠️ **알림 목록은 비어 있는 게 정상입니다.**
 *    시안에는 "조회수가 32% 늘었어요" 같은 알림 3건이 들어 있지만 그건 데모 픽스처이고,
 *    명세에 알림 API 가 없습니다(1.x~17.x 어디에도 없음). 없는 데이터를 지어내면
 *    사장님이 그 숫자를 믿고 판단합니다 — 이 프로젝트의 N/A 원칙 위반입니다.
 *    그래서 시안이 스스로 갖고 있는 **빈 상태 분기**를 씁니다.
 *
 *    알림 API 가 생기면 STATE 부분만 목록으로 바꾸면 됩니다. 시안의 행 구조
 *    (아이콘 타일 36 · 제목 14·semibold · 본문 13 · 시각 · 안읽음 점)는 그대로 두었습니다.
 *
 * 푸시 권한 카드는 지금도 의미가 있습니다 — 시스템 설정으로 보내는 것뿐이라
 * 서버가 필요 없습니다.
 */
import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Bell, BellOff } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { StateBlock } from '../../../ui/Feedback';
import { color, radius, space, text } from '../../../design/theme';
import theme from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';

export default function NotificationsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen edges={['top']}>
      <AppBar onBack={() => nav.goBack()} title="알림" />

      {/* 시안: 푸시가 꺼져 있을 때 맨 위에 뜨는 안내 카드 */}
      <View style={styles.pushCard}>
        <View style={styles.pushTile}>
          <BellOff size={18} strokeWidth={2} color={color.brand[600]} />
        </View>
        <View style={{ flex: 1, gap: space[1] }}>
          <Text style={styles.pushTitle}>푸시 알림을 켜면 놓치지 않습니다</Text>
          <Text style={text.caption}>
            영상이 다 만들어졌을 때와 반응이 올라왔을 때 알려드립니다.
          </Text>
          <Button
            label="설정에서 알림 켜기"
            size="small"
            full={false}
            style={styles.pushButton}
            onPress={() => Linking.openSettings().catch(() => {})}
          />
        </View>
      </View>

      <StateBlock
        icon={Bell}
        tone="muted"
        title="새 알림이 없습니다"
        body="영상이 완성되거나 반응이 모이면 여기에 표시됩니다."
      />

    </Screen>
  );
}

const styles = StyleSheet.create({
  pushCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
  },
  pushTile: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: color.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushTitle: {
    ...text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[900],
  },
  pushButton: { height: 36, marginTop: space[1] },
});
