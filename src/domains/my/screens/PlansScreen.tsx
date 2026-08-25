/**
 * PlansScreen — **시안 v3 `plans` 대조 이식** (2026-08-26).
 *
 * 시안 구조 (위에서부터)
 *   화면    bg-surface · 헤더 좌측 정렬(뒤로가기 36 + "플랜 안내" 18·bold) · 탭바 없음
 *   본문    px-4(16) pb-10(40)
 *   ①      Pro 카드 — rounded-2xl(16) p-5(20) 브랜드색
 *            왕관 타일 40 rounded-xl · 흰색 15% / 아이콘 22
 *            mt-3 "Reals. Pro" 20·bold / mt-1 설명 14 (흰색 85%)
 *            mt-3 "₩9,900" 24·bold + " / 월" 14·medium (흰색 80%)
 *   ②      mt-4 비교표 — rounded-2xl · 흰 배경 · 머리행 bg-surface px-4 py-3 12·semibold
 *            본문행 px-4 py-3.5 · 라벨 14 · 열 비율 1.4 : 1 : 1 · 구분선 #F1F5F9
 *   ③      mt-5 업그레이드 버튼 rounded-2xl py-4 + 아래 12 회색 한 줄
 *
 * ⚠️ **정적 화면입니다.** 플랜·사용량·결제 API 가 명세에 하나도 없습니다.
 *    "Pro로 업그레이드" 는 **비활성 + 이유 표시** 입니다.
 *    막을 거면 이유를 쓴다 — 눌러도 아무 일 없는 화면을 만들지 않습니다.
 *    그래서 시안의 "언제든 해지할 수 있어요." 자리에는 해지할 것이 없다는 사실 대신
 *    아직 열리지 않았다는 안내를 둡니다.
 *
 * ⚠️ 시안 카드는 좌상→우하 그라디언트입니다. 그라디언트는 네이티브 모듈
 *    (expo-linear-gradient)이 필요해 단색 brand 600 으로 둡니다 —
 *    없는 의존성을 이 화면 하나 때문에 늘리지 않습니다.
 *
 * 플랜이 실제로 붙으면 여기뿐 아니라 두 곳이 함께 바뀝니다.
 *   - 15.1 출력의 워터마크 분기
 *   - 3.5 인사이트 접근 제어 (Free 는 못 봄)
 *   그래서 지금 기능을 흉내 내면 나중에 전부 되돌려야 합니다.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check, ChevronLeft, Crown, X } from 'lucide-react-native';

import { Screen } from '../../../ui/Screen';
import { pressTap } from '../../../ui/press';
import theme, { color, radius, space, text } from '../../../design/theme';

type Row = { label: string; free: string | boolean; pro: string | boolean };

const ROWS: Row[] = [
  // 시안 2차: '무제한' 이 아니라 '30편 추가' 입니다.
  { label: '월 숏폼 제작', free: '3개', pro: '30편 추가' },
  { label: 'AI 숏폼 추천', free: true, pro: true },
  { label: 'AI 자동 편집', free: true, pro: true },
  { label: '워터마크 제거', free: false, pro: true },
  { label: '매장 인사이트 분석', free: false, pro: true },
];

export default function PlansScreen() {
  const nav = useNavigation();

  return (
    <Screen
      padded={false}
      background={color.surface}
      contentStyle={{ paddingTop: 0, paddingBottom: 0, gap: 0 }}
    >
      {/* 시안: 헤더가 좌측 정렬입니다 (자주 묻는 질문과 같은 모양) */}
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
        <Text style={text.heading}>플랜 안내</Text>
      </View>

      <View style={styles.body}>
        {/* ① Pro 카드 */}
        <View style={styles.hero}>
          <View style={styles.crown}>
            <Crown size={22} strokeWidth={2} color={color.paper} />
          </View>
          <Text style={styles.heroTitle}>Reals. Pro</Text>
          <Text style={styles.heroDesc}>
            더 많은 숏폼을 만들어 SNS에 꾸준히 올리고 매장을 알려요.
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₩9,900</Text>
            <Text style={styles.priceUnit}> / 월</Text>
          </View>
        </View>

        {/* ② 비교표 */}
        <View style={styles.table}>
          <View style={[styles.row, styles.headRow]}>
            <Text style={[styles.headCell, styles.cellLabel]}>기능</Text>
            <Text style={[styles.headCell, styles.cell]}>Free</Text>
            <Text style={[styles.headCell, styles.cell, styles.proHead]}>Pro</Text>
          </View>

          {ROWS.map((r, i) => (
            <View key={r.label} style={[styles.row, i < ROWS.length - 1 && styles.divider]}>
              <Text style={[styles.label, styles.cellLabel]}>{r.label}</Text>
              <View style={styles.cell}>
                <Value value={r.free} />
              </View>
              <View style={styles.cell}>
                <Value value={r.pro} />
              </View>
            </View>
          ))}
        </View>

        {/* ③ 업그레이드 — 아직 못 엽니다. 이유를 바로 아래에 씁니다. */}
        <View
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel="Pro로 업그레이드 (준비 중)"
          style={styles.cta}
        >
          <Crown size={18} strokeWidth={2} color={color.paper} />
          <Text style={styles.ctaText}>Pro로 업그레이드</Text>
        </View>
        <Text style={styles.note}>아직 준비 중입니다. 열리면 앱에서 알려드릴게요.</Text>
      </View>
    </Screen>
  );
}

function Value({ value }: { value: string | boolean }) {
  if (typeof value === 'string') {
    return <Text style={styles.valueText}>{value}</Text>;
  }
  return value ? (
    <Check size={18} strokeWidth={2.5} color={color.brand[600]} />
  ) : (
    <X size={18} strokeWidth={2} color={color.ink[300]} />
  );
}

const styles = StyleSheet.create({
  /**
   * 시안: px-4 pb-3 · 뒤로가기 36 + 제목.
   * 시안 헤더 위 여백은 pt-[62px] 인데 안전영역(54)이 그중 54 를 이미 먹으므로
   * 남은 8 만 여기서 더합니다 — 이게 없으면 화면 전체가 8 위로 붙습니다.
   */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingTop: 8,
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

  // 시안: px-4 pb-10
  body: { paddingHorizontal: space[4], paddingBottom: space[10] },

  // 시안: rounded-2xl p-5 (그라디언트는 위 주석 참고)
  hero: { borderRadius: radius.lg, padding: space[5], backgroundColor: color.brand[600] },
  crown: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안 h2 는 20 입니다. 스케일에 20 이 없어 이 화면에서만 크기를 짚어 줍니다.
  heroTitle: { ...text.title, fontSize: 20, lineHeight: 26, marginTop: space[3], color: color.paper },
  // 시안 leading-relaxed(1.625) — 기본 21 보다 줄이 넉넉합니다
  heroDesc: {
    ...text.bodySmall,
    lineHeight: 23,
    marginTop: space[1],
    color: 'rgba(255,255,255,0.85)',
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: space[3] },
  price: { ...text.display, color: color.paper },
  priceUnit: { ...text.bodySmall, color: 'rgba(255,255,255,0.8)' },

  // 시안: mt-4 rounded-2xl border-hairline/80 bg-white
  table: {
    marginTop: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    overflow: 'hidden',
  },
  // 시안: 머리행 py-3(12) · 본문행 py-3.5(14)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space['3.5'],
  },
  headRow: { backgroundColor: color.surface, paddingVertical: space[3] },
  headCell: {
    ...text.label,
    fontFamily: theme.text.chipLabel.fontFamily,
    fontWeight: theme.text.chipLabel.fontWeight,
    color: color.ink[500],
  },
  proHead: { color: color.brand[600] },
  // 시안 구분선은 #F1F5F9 — hairline(#E2E8F0)보다 옅습니다
  divider: { borderBottomWidth: theme.border.hairline, borderBottomColor: '#F1F5F9' },
  label: { ...text.bodySmall, color: color.ink[800] },
  valueText: {
    ...text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
  },
  // 시안: 열 비율 1.4 : 1 : 1
  cellLabel: { flex: 1.4 },
  cell: { flex: 1, alignItems: 'center' },

  // 시안: mt-5 rounded-2xl py-4. 못 누르므로 track 색입니다(가이드라인 §5.1).
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: space[5],
    paddingVertical: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.track,
  },
  ctaText: { ...text.button, color: color.paper },
  // 시안: mt-2.5 가운데 12 · #94A3B8
  note: { ...text.label, marginTop: 10, textAlign: 'center', color: color.ink[400] },
});
