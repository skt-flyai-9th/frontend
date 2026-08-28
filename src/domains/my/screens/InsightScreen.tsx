/**
 * InsightScreen — **시안 V4 `insight` 대조 이식** (2026-08-26).
 *
 * V4 재대조에서 고친 것 (비교 이미지 @2x 픽셀 측정):
 *   · KPI 그리드가 위아래로 6 씩 더 벌어져 있었습니다 → kpiGrid marginVertical
 *   · KPI 카드가 5 낮았습니다(78 vs 83) → kpiHead minHeight · kpiValue lineHeight
 *   헤더(제목 밴드 143–174)와 상권 카드 시작점(1096)은 원래 시안과 같습니다.
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
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, Text, Pressable, StyleSheet, type ViewStyle, ScrollView } from 'react-native';
import {
  Bookmark,
  Camera,
  ChevronDown,
  ChevronLeft,
  MapPin,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

/**
 * 시안 `rise-in` — `@keyframes rise{from{opacity:0;transform:translateY(14px)}}`
 * `.3s cubic-bezier(.16,1,.3,1)`. KPI 카드는 `animationDelay: 0.05×i` 로 계단식입니다.
 *
 * 숫자가 한꺼번에 튀어나오면 어디를 봐야 할지 모릅니다. 왼쪽 위부터 차례로
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

/**
 * 상권 막대 — 시안 `transition: width .6s ease-out`, 지연 `0.2 + 0.1×i` 초.
 *
 * ⚠️ width 는 레이아웃 속성이라 **네이티브 드라이버를 못 씁니다**.
 *    scaleX 로 바꾸면 네이티브로 돌릴 수 있지만, pill 막대라 자라는 동안
 *    양 끝 둥근 모서리가 눌려 보입니다. 시안이 쓰는 값이 width 이기도 해서
 *    그대로 두고 JS 스레드로 돌립니다 — 진입 때 한 번, 막대 3개뿐입니다.
 */
function ShareBar({ value, tint, index }: { value: number; tint: string; index: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 600,
      delay: 200 + index * 100,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [t, index]);

  return (
    // 시안: h-2 pill · 트랙 #F1F5F9
    <View style={styles.shareTrack}>
      <Animated.View
        style={[
          styles.shareFill,
          {
            backgroundColor: tint,
            width: t.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${value}%`] }),
          },
        ]}
      />
    </View>
  );
}

export default function InsightScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);
  const insights = useInsights(storeId ?? undefined);
  const metrics = useInsightMetrics();
  const [showLocalText, setShowLocalText] = useState(false);

  const list = insights.data ?? [];
  const local = list.find((i) => i.insightType === '상권분석');
  const next = list.find((i) => i.insightType === '다음숏폼추천');
  /*
   * 비율 막대가 있을 때만 문장형 분석을 접습니다.
   * 막대가 없으면(집계 없는 실서버) 카드에 남는 게 문장뿐이라 접을 이유가 없고,
   * 접으면 카드가 제목만 남아 빈 상자로 보입니다.
   */
  const hasShares = (metrics.data?.local.length ?? 0) > 0;
  const foldable = !!local && hasShares;

  return (
    /*
     * ⚠️ `scroll={false}` + 안쪽 ScrollView 입니다.
     *    시안은 헤더가 스크롤 영역 **밖**에 있어 내려도 제자리입니다
     *    (`<header>` 다음에 `overflow-y-auto` 인 div 가 따로 옵니다).
     *    `Screen` 에 스크롤을 맡기면 헤더가 같이 밀려 올라갑니다 —
     *    스크롤 하단 캡처에서 앱만 제목이 사라져 있었습니다.
     */
    <Screen
      background={color.surface}
      padded={false}
      scroll={false}
      // 하단 안전영역은 아래 ScrollView 가 직접 다룹니다 (여기서 먹으면 40 위에 34 가 더 붙습니다)
      edges={['top']}
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

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.body,
          // 시안 pb-10(40). 안전영역이 더 크면 그쪽을 씁니다(기기 홈 인디케이터).
          { paddingBottom: Math.max(insets.bottom, space[10]) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ② KPI 2열 그리드 */}
        <View style={styles.kpiGrid}>
          {(metrics.data?.kpis ?? []).map((kpi, i) => {
            const Icon = KPI_ICONS[kpi.icon] ?? TrendingUp;
            return (
              <View key={kpi.label} style={styles.kpiWrap}>
                {/* 시안: rise-in · animationDelay 0.05×i */}
                <RiseIn delay={50 * i} style={styles.kpiCard}>
                  <View style={styles.kpiHead}>
                    <Icon size={16} strokeWidth={2} color={color.ink[500]} />
                    <Text style={styles.kpiLabel}>{kpi.label}</Text>
                  </View>
                  <View style={styles.kpiValueRow}>
                    <Text style={styles.kpiValue}>{kpi.value ?? '—'}</Text>
                    {kpi.delta ? <Text style={styles.kpiDelta}>{kpi.delta}</Text> : null}
                  </View>
                </RiseIn>
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
          {/*
            3.5 문장형 분석은 시안에 없는 요소입니다. 지우면 닿을 길이 사라지므로
            **제목 줄 오른쪽 끝의 chevron** 으로 접어 둡니다 (2026-08-26 결정).
            제목 줄 안이라 카드 높이가 시안과 같습니다 — 별도 행으로 두었을 때는
            카드가 38 커져서 아래 "다음 숏폼 추천" 이 통째로 밀렸습니다.

            카드 전체를 누르게 하지 않은 이유: 막대를 짚어 보려다 접힙니다.
          */}
          {foldable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="지역 상권 분석 자세한 설명"
              accessibilityState={{ expanded: showLocalText }}
              hitSlop={6}
              onPress={() => setShowLocalText((v) => !v)}
              style={({ pressed }) => [styles.localHead, pressTap(pressed, 'card')]}
            >
              <Text style={styles.cardTitle}>지역 상권 분석</Text>
              <ChevronDown
                size={16}
                strokeWidth={2}
                color={color.ink[500]}
                style={showLocalText ? styles.chevronOpen : undefined}
              />
            </Pressable>
          ) : (
            <Text style={[styles.cardTitle, { marginBottom: space[4] }]}>지역 상권 분석</Text>
          )}
          <LoadGate
            loading={insights.isLoading}
            error={insights.isError}
            ready={insights.data !== undefined}
            onRetry={insights.refetch}
            loadingLabel="분석을 불러오고 있어요"
          >
            {hasShares ? (
              <View style={{ gap: 14 }}>
                {metrics.data!.local.map((item, i) => (
                  <View key={item.label}>
                    <View style={styles.shareHead}>
                      <Text style={styles.shareLabel}>{item.label}</Text>
                      <Text style={styles.shareValue}>{item.value}%</Text>
                    </View>
                    <ShareBar value={item.value} tint={item.color} index={i} />
                  </View>
                ))}
                {/* 제목 줄 chevron 으로 펼칩니다. 접혀 있으면 카드 높이가 시안과 같습니다. */}
                {foldable && showLocalText ? (
                  <View style={{ gap: space[1] }}>
                    <Text style={styles.localBody}>{local.insightContent}</Text>
                    <Text style={styles.source}>출처 {local.insightSource}</Text>
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
            {/* 시안 8차에서 배지 안 sparkles 아이콘이 빠졌습니다 (gap-1 도 함께) */}
            <View style={styles.recBadge}>
              <Text style={styles.recBadgeText}>인사이트 분석 기반</Text>
            </View>
            {/*
              시안은 추천이 바뀔 때 `key={recIdx}` 로 다시 그려 rise-in 을 태웁니다.
              우리는 3.5 를 다시 불러오므로 제목을 key 로 씁니다 — 내용이 바뀌면
              다시 올라옵니다. 눌렀는데 아무 움직임이 없으면 바뀐 줄 모릅니다.
            */}
            <RiseIn key={next?.insightTitle ?? 'empty'}>
              <Text style={styles.recTitle}>
                {next?.insightTitle ?? '추천을 준비하고 있습니다'}
              </Text>
              <Text style={styles.recBody}>
                {next?.insightContent ?? '가게 정보가 쌓이면 다음에 찍을 숏폼을 골라 드려요.'}
              </Text>
            </RiseIn>

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
      </ScrollView>
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
    // 시안에 음수 여백 없음 — 제목이 뒤로가기 옆에 붙는 헤더입니다 (FaqScreen 헤더 규칙 주석 참고)
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  // 시안: px-4 pb-10 (하단은 화면에서 안전영역과 함께 계산)
  body: { paddingHorizontal: space[4] },

  /*
   * 시안: grid-cols-2 gap-3.
   * 칸마다 6 씩 안쪽 여백을 주고 바깥으로 6 을 빼서 gap 12 를 만듭니다.
   *
   * ⚠️ marginVertical 도 같이 빼야 합니다 (2026-08-26, 비교 이미지 측정).
   *    가로만 상쇄하면 첫 줄 **위**와 마지막 줄 **아래**에 6 씩 남습니다.
   *    시안 grid 는 칸 사이에만 간격이 있고 바깥에는 없어서, 그 6 이
   *    KPI 를 6 내리고 아래 차트 카드까지 6 더 밀었습니다
   *    (@2x 측정: 카드 상단 시안 222 / 앱 234, 그리드→차트 간격 시안 37 / 앱 49).
   */
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginVertical: -6 },
  kpiWrap: { width: '50%', padding: 6 },
  kpiCard: {
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    ...theme.elevation('card'),
  },
  /*
   * 시안 라벨 줄은 18 입니다 — 아이콘 16 이 아니라 12px 라벨의 줄높이가 잡습니다.
   * 비워 두면 아이콘 16 이 줄 높이가 되어 카드가 2 낮아집니다.
   */
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 18 },
  kpiLabel: { ...theme.text.label, lineHeight: 18, fontFamily: theme.text.caption.fontFamily, fontWeight: theme.text.caption.fontWeight, color: color.ink[500] },
  kpiValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: space[2] },
  /*
   * 시안: 19·bold · tracking-tighter-title.
   * 줄높이 29 는 시안 카드 높이에서 역산한 값입니다 —
   * p-3.5(14) + 라벨줄(18) + mt-2(8) + 값줄(29) + p-3.5(14) = 83.
   * 25 로 두면 카드가 78 이라 시안보다 5 낮고, 두 줄이라 아래가 10 밀립니다
   * (@2x 측정: 카드 높이 시안 166 / 앱 156).
   */
  kpiValue: { ...theme.text.heading, fontSize: 19, lineHeight: 28.5, letterSpacing: -0.38 },
  kpiDelta: { ...theme.text.label, lineHeight: 18, marginBottom: 2, fontFamily: theme.text.chipLabel.fontFamily, fontWeight: theme.text.chipLabel.fontWeight, color: color.done[500] },

  /*
   * 그리드가 marginVertical -6 으로 아래 6 을 당겨 가므로 여기서 6 을 되돌립니다.
   * 그래야 카드와의 간격이 원래대로 12 입니다.
   */
  note: { ...theme.text.caption, marginTop: space[3] + 6, lineHeight: 20, color: color.ink[500] },

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
  // 시안 16 은 leading 이 없어 1.5 가 걸립니다 (토큰 22 → 24)
  cardTitle: { ...theme.text.subheading, lineHeight: 24 },
  sectionTitle: { marginTop: space[6], marginBottom: space[3] },

  // 차트 자리 — 데이터가 오면 LineChart 로 바뀝니다
  chartEmpty: { height: 132, alignItems: 'center', justifyContent: 'center' },
  chartEmptyText: { ...theme.text.caption, color: color.ink[400] },

  delta: { ...theme.text.label, lineHeight: 18, fontFamily: theme.text.chipLabel.fontFamily, fontWeight: theme.text.chipLabel.fontWeight, color: color.done[500] },
  shareHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  shareLabel: { ...theme.text.caption, lineHeight: 19.5, color: color.ink[700] },
  shareValue: { ...theme.text.caption, lineHeight: 19.5, fontFamily: theme.text.bodyStrong.fontFamily, fontWeight: theme.text.bodyStrong.fontWeight, color: color.ink[900] },
  shareTrack: { height: 8, borderRadius: radius.pill, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  shareFill: { height: '100%', borderRadius: radius.pill },
  /* 시안 제목 줄(mb-4)에 chevron 만 얹습니다 — 16 은 제목 줄높이 안이라 높이가 안 늘어납니다. */
  localHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[4],
  },
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
  // 시안 8차: 아이콘이 빠지면서 gap-1 도 함께 없어졌습니다 (글자만 남는 배지)
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: 20,
    paddingHorizontal: space[2],
    borderRadius: radius.pill,
    backgroundColor: color.brand[50],
  },
  recBadgeText: { ...theme.text.micro, fontFamily: theme.text.chipLabel.fontFamily, fontWeight: theme.text.chipLabel.fontWeight, color: color.brand[600] },
  recTitle: { ...theme.text.bodyStrong, marginTop: space[2], lineHeight: 20.6 },
  recBody: { ...theme.text.caption, marginTop: space[1], lineHeight: 21.1, color: color.ink[500] },

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
