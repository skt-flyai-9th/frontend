/**
 * PlansScreen — 플랜 안내. 시안 `3_플랜안내.png`.
 *
 * ⚠️ **정적 화면입니다.** 플랜·사용량·결제 API 가 명세에 하나도 없습니다.
 *    "Pro로 업그레이드" 는 **비활성 + 이유 표시** 입니다.
 *    막을 거면 이유를 쓴다 — 눌러도 아무 일 없는 화면을 만들지 않습니다.
 *
 * 플랜이 실제로 붙으면 여기뿐 아니라 두 곳이 함께 바뀝니다.
 *   - 15.1 출력의 워터마크 분기
 *   - 3.5 인사이트 접근 제어 (Free 는 못 봄)
 *   그래서 지금 기능을 흉내 내면 나중에 전부 되돌려야 합니다.
 *
 * 설정 화면의 "Free 플랜 · 이번 달 3/3 사용 중" 도 사용량 조회 API 가 없어
 * 만들지 않았습니다. 가짜 숫자를 띄우지 않습니다.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check, Crown, X } from 'lucide-react-native';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { BottomAction, Button } from '../../../ui/Button';
import theme, { color, radius, space, text } from '../../../design/theme';

type Row = { label: string; free: string | boolean; pro: string | boolean };

const ROWS: Row[] = [
  { label: '월 숏폼 제작', free: '3개', pro: '무제한' },
  { label: 'AI 숏폼 추천', free: true, pro: true },
  { label: 'AI 자동 편집', free: true, pro: true },
  { label: '워터마크 제거', free: false, pro: true },
  { label: '매장 인사이트 분석', free: false, pro: true },
];

export default function PlansScreen() {
  const nav = useNavigation();

  return (
    <Screen
      footer={
        <BottomAction>
          <Button label="Pro로 업그레이드" disabled onPress={() => {}} />
          {/* 비활성 이유를 반드시 씁니다 */}
          <Text style={[text.caption, { textAlign: 'center', color: color.ink[500] }]}>
            아직 준비 중입니다. 열리면 앱에서 알려드릴게요.
          </Text>
        </BottomAction>
      }
    >
      <AppBar onBack={() => nav.goBack()} title="플랜 안내" />

      {/* Pro 소개 — 브랜드색 큰 카드 */}
      <View style={styles.hero}>
        <View style={styles.crown}>
          <Crown size={20} strokeWidth={2} color={color.paper} />
        </View>
        <Text style={[text.title, { color: color.paper }]}>Reals. Pro</Text>
        <Text style={[text.bodySmall, { color: color.paper }]}>
          더 많은 숏폼을 만들어 SNS에 꾸준히 올리고 매장을 알려요.
        </Text>
        <View style={styles.priceRow}>
          <Text style={[text.display, { color: color.paper }]}>₩9,900</Text>
          <Text style={[text.bodySmall, { color: color.paper }]}> / 월</Text>
        </View>
      </View>

      {/* 비교표 */}
      <Card padded={false}>
        <View style={[styles.row, styles.headRow]}>
          <Text style={[text.caption, styles.cellLabel, { color: color.ink[500] }]}>기능</Text>
          <Text style={[text.caption, styles.cell, { color: color.ink[500] }]}>Free</Text>
          <Text style={[text.caption, styles.cell, { color: color.brand[600] }]}>Pro</Text>
        </View>

        {ROWS.map((r, i) => (
          <View key={r.label} style={[styles.row, i < ROWS.length - 1 && styles.divider]}>
            <Text style={[text.bodySmall, styles.cellLabel]}>{r.label}</Text>
            <View style={styles.cell}>
              <Value value={r.free} />
            </View>
            <View style={styles.cell}>
              <Value value={r.pro} />
            </View>
          </View>
        ))}
      </Card>

      <Text style={[text.caption, { color: color.ink[400], textAlign: 'center' }]}>
        언제든 해지할 수 있어요.
      </Text>
    </Screen>
  );
}

function Value({ value }: { value: string | boolean }) {
  if (typeof value === 'string') {
    return <Text style={[text.bodySmall, { fontFamily: theme.text.bodyStrong.fontFamily }]}>{value}</Text>;
  }
  return value ? (
    <Check size={18} strokeWidth={2.5} color={color.brand[600]} />
  ) : (
    <X size={18} strokeWidth={2} color={color.ink[300]} />
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: color.brand[600],
    borderRadius: radius.lg,
    padding: space[5],
    gap: space[2],
  },
  crown: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    minHeight: 52,
  },
  headRow: { backgroundColor: color.surface },
  divider: { borderBottomWidth: theme.border.hairline, borderBottomColor: color.ink[200] },
  cellLabel: { flex: 1.6 },
  cell: { flex: 1, alignItems: 'center' },
});
