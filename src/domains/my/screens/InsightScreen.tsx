/**
 * InsightScreen — **시안 v3 `insight` 대조 이식** (2026-08-26).
 *
 * 시안 구조 (위에서부터)
 *   ① 헤더  뒤로가기 + "매장 인사이트 분석" 좌측 정렬 · 탭바 없음 · bg-surface
 *   ② KPI   2열 그리드 · gap-3 · 카드 p-3.5 rounded-2xl
 *           라벨 12·slate + 아이콘 16 / 값 19·bold / 증감 12·semibold·verified
 *   ③ 차트  카드 p-4 · 제목 16·semibold + 우측 증감 · LineChart(329x132)
 *   ④ 상권  카드 p-4 · 제목 16 · 행마다 라벨 13 + 값 13·semibold, 막대 h-2 pill
 *   ⑤ 추천  제목 16 · 카드(4:5 미디어 + 배지 + 제목 15 + 설명 13 + 버튼 2개 h-11)
 *
 * ⚠️ 데이터가 없는 지표 처리 (2026-08-26 방침: **영역은 살리고 가짜 숫자는 금지**)
 *   조회수·전환·저장 KPI 와 주간 추이는 **계정 단위 집계 API 가 없습니다**
 *   (17.1 은 게시물 단위). 숫자를 지어내지 않고 "—" 로 두고,
 *   차트 자리에는 왜 비었는지 한 줄로 말합니다.
 *
 *   상권 분석과 다음 숏폼 추천은 3.5 insights 로 **실제 값**이 옵니다.
 *   상권 비율(58/27/15%)은 3.5 응답에 수치 필드가 없어 본문만 씁니다.
 *
 * 이전 구현은 칩 필터 + 카드 목록이었습니다. 시안에 없는 구성이라 걷어냈고,
 * 인사이트 종류별 내용은 각 섹션 안으로 들어갔습니다(기능 축소 없음).
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Bookmark,
  Camera,
  ChevronDown,
  ChevronLeft,
  MapPin,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { LineChart } from '../../../ui/LineChart';
import { LoadGate } from '../../../ui/LoadGate';
import { pressTap } from '../../../ui/press';
import { useAppState } from '../../../lib/appState';
import { useInsights } from '../../../api/queries/store';
import { useInsightMetrics } from '../../../api/queries/insightMetrics';
import theme, { color, radius, space, text } from '../../../design/theme';
import type { RootStackParamList, MyStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList & MyStackParamList>;

/** 지표의 icon 문자열 → lucide 컴포넌트 */
const KPI_ICONS: Record<string, typeof TrendingUp> = {
  'trending-up': TrendingUp,
  'map-pin': MapPin,
  bookmark: Bookmark,
  users: Users,
};

export default function InsightScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);
  const insights = useInsights(storeId ?? undefined);
  const metrics = useInsightMetrics();
  const [showLocalText, setShowLocalText] = useState(false);

  const list = insights.data ?? [];
  const local = list.find((i) => i.insightType === '상권분석');
  const next = list.find((i) => i.insightType === '다음숏폼추천');

  return (
    <Screen
      background={color.surface}
      padded={false}
      // 시안: 화면 맨 위에서 헤더까지 62 (= 상태바 54 + 8)
      contentStyle={{ paddingTop: space[2], gap: 0 }}
    >
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
        <Text style={text.heading}>매장 인사이트 분석</Text>
      </View>

      <View style={styles.body}>
        {/* ② KPI 2열 그리드 */}
        <View style={styles.kpiGrid}>
          {(metrics.data?.kpis ?? []).map((kpi) => {
            const Icon = KPI_ICONS[kpi.icon] ?? TrendingUp;
            return (
              <View key={kpi.label} style={styles.kpiWrap}>
                <View style={styles.kpiCard}>
                  <View style={styles.kpiHead}>
                    <Icon size={16} strokeWidth={2} color={color.ink[500]} />
                    <Text style={styles.kpiLabel}>{kpi.label}</Text>
                  </View>
                  <View style={styles.kpiValueRow}>
                    <Text style={styles.kpiValue}>{kpi.value ?? '—'}</Text>
                    {kpi.delta ? <Text style={styles.kpiDelta}>{kpi.delta}</Text> : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        {/* 값이 없을 때만 왜 비었는지 밝힙니다. 빈 값만 두면 고장으로 읽힙니다. */}
        {!metrics.data?.kpis.some((k) => k.value) && (
          <Text style={styles.note}>
            조회수·전환 집계는 준비 중입니다. 게시한 숏폼의 성과는 반응 보기에서 볼 수 있어요.
          </Text>
        )}

        {/* ③ 주간 조회수 추이 */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>주간 조회수 추이</Text>
            {metrics.data?.weekViewsDelta ? (
              <Text style={styles.delta}>{metrics.data.weekViewsDelta}</Text>
            ) : null}
          </View>
          {(metrics.data?.weekViews.length ?? 0) >= 2 ? (
            <LineChart
              data={metrics.data!.weekViews.map((d) => ({ label: d.day, value: d.value }))}
            />
          ) : (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>주간 집계가 쌓이면 여기에 표시됩니다</Text>
            </View>
          )}
        </View>

        {/* ④ 지역 상권 분석 — 3.5 로 실제 값이 옵니다 */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { marginBottom: space[4] }]}>지역 상권 분석</Text>
          <LoadGate
            loading={insights.isLoading}
            error={insights.isError}
            ready={insights.data !== undefined}
            onRetry={insights.refetch}
            loadingLabel="분석을 불러오고 있어요"
          >
            {(metrics.data?.local.length ?? 0) > 0 ? (
              <View style={{ gap: 14 }}>
                {metrics.data!.local.map((item) => (
                  <View key={item.label}>
                    <View style={styles.shareHead}>
                      <Text style={styles.shareLabel}>{item.label}</Text>
                      <Text style={styles.shareValue}>{item.value}%</Text>
                    </View>
                    {/* 시안: h-2 pill · 트랙 #F1F5F9 */}
                    <View style={styles.shareTrack}>
                      <View
                        style={[
                          styles.shareFill,
                          { width: `${item.value}%`, backgroundColor: item.color },
                        ]}
                      />
                    </View>
                  </View>
                ))}
                {/*
                  3.5 문장형 분석은 시안에 없는 요소입니다. 지우지 않고 접어 둡니다 —
                  펼치기 전에는 카드 높이가 시안과 같고, 필요하면 눌러서 봅니다.
                */}
                {local ? (
                  <View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showLocalText }}
                      hitSlop={6}
                      onPress={() => setShowLocalText((v) => !v)}
                      style={({ pressed }) => [styles.moreBtn, pressTap(pressed, 'button')]}
                    >
                      <Text style={styles.moreText}>
                        {showLocalText ? '설명 접기' : '자세한 설명 보기'}
                      </Text>
                      <ChevronDown
                        size={14}
                        strokeWidth={2}
                        color={color.ink[500]}
                        style={showLocalText ? styles.chevronOpen : undefined}
                      />
                    </Pressable>
                    {showLocalText ? (
                      <View style={{ gap: space[1], marginTop: space[2] }}>
                        <Text style={styles.localBody}>{local.insightContent}</Text>
                        <Text style={styles.source}>출처 {local.insightSource}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : local ? (
              <View style={{ gap: space[2] }}>
                <Text style={styles.localTitle}>{local.insightTitle}</Text>
                <Text style={styles.localBody}>{local.insightContent}</Text>
                <Text style={styles.source}>출처 {local.insightSource}</Text>
              </View>
            ) : (
              <Text style={styles.localBody}>아직 상권 분석이 준비되지 않았습니다.</Text>
            )}
          </LoadGate>
        </View>

        {/* ⑤ 다음 숏폼 추천 */}
        <Text style={[styles.cardTitle, styles.sectionTitle]}>다음 숏폼 추천</Text>
        <View style={styles.recCard}>
          <View style={styles.recMedia} />
          <View style={{ padding: space[4] }}>
            <View style={styles.recBadge}>
              <Sparkles size={12} strokeWidth={2} color={color.brand[600]} />
              <Text style={styles.recBadgeText}>인사이트 분석 기반</Text>
            </View>
            <Text style={styles.recTitle}>
              {next?.insightTitle ?? '추천을 준비하고 있습니다'}
            </Text>
            <Text style={styles.recBody}>
              {next?.insightContent ?? '가게 정보가 쌓이면 다음에 찍을 숏폼을 골라 드려요.'}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => nav.navigate('Create', { screen: 'PurposeSelect' })}
              style={({ pressed }) => [styles.recPrimary, pressTap(pressed, 'card')]}
            >
              <Camera size={18} strokeWidth={2} color={color.paper} />
              <Text style={styles.recPrimaryText}>바로 촬영하기</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => insights.refetch()}
              style={({ pressed }) => [styles.recSecondary, pressTap(pressed, 'card')]}
            >
              <RefreshCw size={16} strokeWidth={2} color={color.brand[600]} />
              <Text style={styles.recSecondaryText}>다른 추천 보기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  body: { paddingHorizontal: space[4], paddingBottom: space[8] },

  // 시안: grid-cols-2 gap-3
  // 카드 바깥으로 6씩 빼서 좌우 정렬을 유지합니다(안쪽 여백이 gap 12 를 대신).
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  kpiWrap: { width: '50%', padding: 6 },
  kpiCard: {
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    ...theme.elevation('card'),
  },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kpiLabel: { ...theme.text.label, fontFamily: theme.text.caption.fontFamily, fontWeight: theme.text.caption.fontWeight, color: color.ink[500] },
  kpiValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: space[2] },
  // 시안: 19·bold · tracking-tighter-title
  kpiValue: { ...theme.text.heading, fontSize: 19, lineHeight: 25, letterSpacing: -0.38 },
  kpiDelta: { ...theme.text.label, marginBottom: 2, fontFamily: theme.text.chipLabel.fontFamily, fontWeight: theme.text.chipLabel.fontWeight, color: color.done[500] },

  note: { ...theme.text.caption, marginTop: space[3], lineHeight: 20, color: color.ink[500] },

  card: {
    marginTop: space[4],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    ...theme.elevation('card'),
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[3],
  },
  cardTitle: { ...theme.text.subheading },
  sectionTitle: { marginTop: space[6], marginBottom: space[3] },

  // 차트 자리 — 데이터가 오면 LineChart 로 바뀝니다
  chartEmpty: { height: 132, alignItems: 'center', justifyContent: 'center' },
  chartEmptyText: { ...theme.text.caption, color: color.ink[400] },

  delta: { ...theme.text.label, fontFamily: theme.text.chipLabel.fontFamily, fontWeight: theme.text.chipLabel.fontWeight, color: color.done[500] },
  shareHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  shareLabel: { ...theme.text.caption, color: color.ink[700] },
  shareValue: { ...theme.text.caption, fontFamily: theme.text.bodyStrong.fontFamily, fontWeight: theme.text.bodyStrong.fontWeight, color: color.ink[900] },
  shareTrack: { height: 8, borderRadius: radius.pill, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  shareFill: { height: '100%', borderRadius: radius.pill },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: space[1] },
  moreText: { ...theme.text.caption, color: color.ink[500] },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  localTitle: { ...theme.text.bodyStrong },
  localBody: { ...theme.text.caption, lineHeight: 21, color: color.ink[700] },
  source: { ...theme.text.micro, color: color.ink[400] },

  recCard: {
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    overflow: 'hidden',
    ...theme.elevation('card'),
  },
  recMedia: { width: '100%', aspectRatio: 4 / 5, backgroundColor: color.ink[200] },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    height: 20,
    paddingHorizontal: space[2],
    borderRadius: radius.pill,
    backgroundColor: color.brand[50],
  },
  recBadgeText: { ...theme.text.micro, fontFamily: theme.text.chipLabel.fontFamily, fontWeight: theme.text.chipLabel.fontWeight, color: color.brand[600] },
  recTitle: { ...theme.text.bodyStrong, marginTop: space[2], lineHeight: 21 },
  recBody: { ...theme.text.caption, marginTop: space[1], lineHeight: 21, color: color.ink[500] },

  // 시안: h-11 rounded-xl · 14·semibold
  recPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    marginTop: space[4],
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
  },
  recPrimaryText: { ...theme.text.bodySmall, fontFamily: theme.text.bodyStrong.fontFamily, fontWeight: theme.text.bodyStrong.fontWeight, color: color.paper },
  recSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    marginTop: space[2],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
  },
  recSecondaryText: { ...theme.text.bodySmall, fontFamily: theme.text.bodyStrong.fontFamily, fontWeight: theme.text.bodyStrong.fontWeight, color: color.brand[600] },
});
