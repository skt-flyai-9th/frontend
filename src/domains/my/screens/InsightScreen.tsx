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
import { Camera, ChevronLeft, Eye, Heart, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { LineChart } from '../../../ui/LineChart';
import { Donut, DonutLegend, type DonutSeg } from '../../../ui/Donut';
import { LoadGate } from '../../../ui/LoadGate';
import { pressTap } from '../../../ui/press';
import { useAppState } from '../../../lib/appState';
import { useInsights, useStore } from '../../../api/queries/store';
import { useInsightMetrics } from '../../../api/queries/insightMetrics';
import theme, { color, radius, space, text } from '../../../design/theme';
import type { RootStackParamList, MyStackParamList } from '../../../navigation/types';
import type { SnsPlatform } from '../../../api/schema/types';

type Nav = NativeStackNavigationProp<RootStackParamList & MyStackParamList>;

/**
 * 시안 소비층 도넛 색 — 진한 브랜드에서 옅은 쪽으로.
 *
 * ⚠️ **순서가 아니라 비중으로 나눠 줍니다.** 시안 `AGE_MIX` 를 보면
 *    10대(8%) 가 가장 옅고 20대(42%) 가 브랜드색입니다 — 목록 순서가 아니라
 *    **큰 조각일수록 진한 색**입니다. 순서대로 주면 8% 짜리가 가장 진해져
 *    무엇이 주 고객인지 거꾸로 읽힙니다.
 *
 *    시안 값을 비중 순으로 세우면 정확히 이 배열이 됩니다:
 *    42→#2563eb · 27→#60a5fa · 15→#93c5fd · 8→#dbeafe · 8→#cbd5e1
 */
const MIX_COLORS = ['#2563eb', '#60a5fa', '#93c5fd', '#dbeafe', '#cbd5e1'];

/**
 * 3.5 `insight_data` 에서 소비층 비율을 꺼냅니다.
 *
 * ✅ **서버가 주는 모양을 2026-08-30 에 확인했습니다** (새 매장을 등록해 실측).
 *    그전에는 3.5 가 빈 배열이라 한 번도 못 봤고, 목업으로 짐작한 배열 모양
 *    (`age_mix: [{label, value}]`)을 읽고 있었습니다 — 실제와 다릅니다.
 *
 *    "insight_data": {
 *      "age_distribution":    { "10s": 11, "20s": 16, "30s": 21, "40s": 21, "50s_plus": 31 },
 *      "gender_distribution": { "male": 44, "female": 56 }
 *    }
 *
 * **이름표가 아니라 키가 뜻을 담고 있습니다.** 그래서 키를 사람 말로 바꿔 줍니다.
 * 모르는 키는 **버립니다** — 억지로 해석해 엉뚱한 비율을 그리는 것보다 빈 칸이 낫습니다.
 * 순서는 아래 표 순서를 따릅니다(10대부터 시계방향이 읽기 좋습니다).
 */
const MIX_LABELS = {
  age: [
    ['10s', '10대'],
    ['20s', '20대'],
    ['30s', '30대'],
    ['40s', '40대'],
    ['50sPlus', '50대 이상'],
    ['60s', '60대'],
  ],
  gender: [
    ['male', '남성'],
    ['female', '여성'],
  ],
} as const;

function readMix(data: unknown, kind: 'age' | 'gender'): DonutSeg[] | null {
  if (!data || typeof data !== 'object') return null;
  const key = kind === 'age' ? 'ageDistribution' : 'genderDistribution';
  const raw = (data as Record<string, unknown>)[key];
  if (!raw || typeof raw !== 'object') return null;

  const src = raw as Record<string, unknown>;
  const items: { label: string; value: number }[] = [];
  for (const [k, label] of MIX_LABELS[kind]) {
    const v = src[k];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) items.push({ label, value: v });
  }
  if (items.length === 0) return null;

  // 비중이 큰 순으로 색을 나눠 줍니다(위 MIX_COLORS 머리말). 그리는 **순서는
  // 위 표 순서대로** 둡니다 — 도넛은 10대부터 시계방향으로 도는 게 읽기 좋습니다.
  const rank = new Map<number, number>();
  [...items.keys()]
    .sort((a, b) => items[b].value - items[a].value)
    .forEach((idx, place) => rank.set(idx, place));

  return items.map((r, i) => ({
    label: r.label,
    value: r.value,
    color: MIX_COLORS[rank.get(i) ?? 0] ?? MIX_COLORS[MIX_COLORS.length - 1],
  }));
}

/**
 * 지역 상권 칩에 찍을 이름 — 시안 `지역 상권 분석  [보라매 상권]`.
 *
 * **시안이 어디서 가져왔는지 원문에서 확인했습니다.** 시안 매장이
 * `열정커피 보라매점 · 서울 동작구 보라매로 87` 입니다 — 칩의 "보라매" 는
 * **그 매장 주소의 길 이름**입니다(`STORE_DB`, 시안 번들 `535ddecc`).
 * 지어낸 값이 아니라 우리도 2.1·3.1 로 갖고 있는 데이터입니다.
 *
 * 그래서 같은 규칙으로 뽑습니다 — 도로명에서 `로 / 대로 / 길` 을 떼고 "OO 상권".
 * 길 이름을 못 읽으면 `구 / 시 / 군` 으로 물러섭니다.
 *
 *   서울 동작구 보라매로 87        → 보라매 상권   (시안과 일치)
 *   서울 관악구 난곡로 42          → 난곡 상권
 *   서울 은평구 대서문길 24-11     → 대서문 상권
 *   서울특별시 중구 세종대로 124   → 세종 상권
 *
 * ⚠️ **이건 주소에서 뽑은 이름이지 서버가 분류한 상권명이 아닙니다.** 실제 상권
 *    이름과 다를 수 있어 BE 에 필드를 요청해 뒀습니다. 값이 오면 그쪽을 씁니다.
 */
function areaLabel(address?: string | null): string | null {
  if (!address) return null;
  // 괄호 안 법정동(예: "(태평로1가)")은 도로명과 섞이면 잘못 읽힙니다.
  const parts = String(address).replace(/\([^)]*\)/g, ' ').trim().split(/\s+/);
  const road = parts.find((t) => /(대로|로|길)$/.test(t) && t.length >= 3);
  if (road) {
    const stem = road.replace(/(대로|로|길)$/, '');
    if (stem.length >= 2) return `${stem} 상권`;
  }
  const gu = parts.find((t) => /(구|시|군)$/.test(t) && t.length >= 3);
  return gu ? `${gu} 상권` : null;
}

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


export default function InsightScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);
  /** 상권 칩 이름을 주소에서 뽑습니다 — 다른 값은 쓰지 않습니다. */
  const { data: store } = useStore(storeId ?? undefined);
  const insights = useInsights(storeId ?? undefined);
  /** 17.3 — 플랫폼별 주간 조회수·좋아요·7일 추이 */
  const metrics = useInsightMetrics(storeId ?? undefined);

  const platforms = metrics.data ?? [];
  /** 고른 플랫폼. 처음에는 시안 순서대로 유튜브가 잡힙니다. */
  const [plat, setPlat] = useState<SnsPlatform | null>(null);
  const cur = platforms.find((p) => p.platform === plat) ?? platforms[0];

  const list = insights.data ?? [];
  const local = list.find((i) => i.insightType === '상권분석');
  const next = list.find((i) => i.insightType === '다음숏폼추천');

  /**
   * 시안은 제목 옆에 **"보라매 상권" 같은 짧은 지역 이름**을 칩으로 답니다.
   *
   * ✅ **2026-08-30 에 서버가 그걸 주기 시작했습니다.** 예전 `insight_title` 은
   *    "주거 밀집 생활형 골목상권, 점심 시간대 집중" 처럼 문장이라 칩에 못 넣었는데,
   *    새로 등록한 매장에서는 **"압구정로데오·도산공원"** 처럼 상권 이름이 옵니다.
   *
   * 다만 옛 매장에는 문장이 그대로 남아 있을 수 있어 **길이를 보고 가릅니다.**
   *   짧으면(20자 이하) 칩에 넣고, 길면 예전처럼 요약 줄에 두고 칩은 주소에서 뽑습니다.
   */
  const rawTitle = local?.insightTitle?.trim() || null;
  const titleIsName = !!rawTitle && rawTitle.length <= 20;

  /** 시안 칩 — 서버가 준 상권 이름, 없으면 매장 주소에서(위 `areaLabel` 머리말). */
  const areaName = titleIsName ? rawTitle : areaLabel(store?.address);
  /** 한 줄 요약 — 제목을 칩으로 썼으면 여기서는 반복하지 않습니다. */
  const areaSummary = titleIsName ? null : rawTitle;

  /** 소비층 도넛 두 개. 값이 없으면 null 이고 화면은 빈 칸을 그립니다. */
  const mixes: { label: string; segs: DonutSeg[] | null }[] = [
    { label: '연령대', segs: readMix(local?.insightData, 'age') },
    { label: '성별', segs: readMix(local?.insightData, 'gender') },
  ];

  /** 두 플랫폼 모두 0 이면 아직 올린 영상이 없는 것입니다. */
  const noPosts = platforms.length > 0 && platforms.every((p) => p.week.every((d) => d.value === 0));

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
        {/*
          ① 플랫폼 토글 — 시안 `PlatformTabs`.
             mb-3 · bg #F1F5F9 · p-0.5 · 버튼 h-7 · 11 semibold
             고른 쪽만 흰 배경 + 브랜드색, 나머지는 회색 글자입니다.

          17.3 이 주는 플랫폼만 그립니다. 한 쪽만 오면 토글이 한 칸이 되고,
          아예 없으면 줄 자체가 사라집니다 — 없는 플랫폼을 만들지 않습니다.
        */}
        {platforms.length > 1 ? (
          <View style={styles.tabs}>
            {platforms.map((p) => {
              // ⚠️ `plat` 이 아니라 **지금 그리는 플랫폼**과 견줍니다. 처음에는 고른 적이
              //    없어 `plat` 이 null 인데, 화면은 첫 번째 것을 이미 그리고 있습니다.
              //    null 로 견주면 **아무 탭도 안 켜진 채** 숫자만 나옵니다.
              const on = p.platform === cur?.platform;
              return (
                <Pressable
                  key={p.platform}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setPlat(p.platform)}
                  style={({ pressed }) => [
                    styles.tab,
                    on && styles.tabOn,
                    pressTap(pressed, 'icon'),
                  ]}
                >
                  <Text style={[styles.tabText, on && styles.tabTextOn]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/*
          ② 조회수·좋아요 2열 — 시안 rounded-2xl · p-3.5 · 아이콘 16 + 12 라벨,
             값 19 bold tabular · 증감 12 semibold(초록).

          ⚠️ **좋아요에는 증감이 없습니다.** 서버가 주는 증감률은 조회수 것
             (`views_change_rate`) 하나뿐입니다. 시안에는 `+9%` 가 붙어 있지만
             지어내지 않습니다 (CLAUDE.md §2).
        */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiWrap}>
            {/*
              시안은 숫자에 `key={"v" + plat}` 를 걸어 **탭을 바꿀 때마다 다시 떠오르게**
              합니다. key 가 바뀌면 React 가 새로 붙이므로 rise-in 이 다시 돕니다.
              값이 바뀐 걸 눈으로 알아채라고 두는 장치입니다 — 숫자만 슬쩍 갈리면
              바뀐 줄 모릅니다.
            */}
            <RiseIn key={`v${cur?.platform ?? ''}`} style={styles.kpiCard}>
              <View style={styles.kpiHead}>
                <Eye size={16} strokeWidth={2} color={color.ink[500]} />
                <Text style={styles.kpiLabel}>총 조회수</Text>
              </View>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiValue}>{cur?.views ?? '—'}</Text>
                {cur?.viewsDelta ? <Text style={styles.kpiDelta}>{cur.viewsDelta}</Text> : null}
              </View>
            </RiseIn>
          </View>
          <View style={styles.kpiWrap}>
            <RiseIn key={`l${cur?.platform ?? ''}`} delay={50} style={styles.kpiCard}>
              <View style={styles.kpiHead}>
                <Heart size={16} strokeWidth={1.75} color={color.ink[500]} />
                <Text style={styles.kpiLabel}>좋아요 수</Text>
              </View>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiValue}>{cur?.likes ?? '—'}</Text>
              </View>
            </RiseIn>
          </View>
        </View>

        {/* 아직 게시한 숏폼이 없으면 0 만 늘어서 고장으로 보입니다. 이유를 밝힙니다. */}
        {noPosts ? (
          <Text style={styles.note}>
            아직 게시한 숏폼이 없어요. 영상을 올리면 조회수와 좋아요가 여기 쌓입니다.
          </Text>
        ) : null}

        {/* ③ 주간 조회수 추이 — 시안 mt-3 · p-4 */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>주간 조회수 추이</Text>
            {cur?.viewsDelta ? <Text style={styles.delta}>{cur.viewsDelta}</Text> : null}
          </View>
          {(cur?.week.length ?? 0) >= 2 ? (
            <LineChart
              // 플랫폼을 바꾸면 선을 다시 그립니다(시안 key={plat}).
              key={plat}
              data={cur!.week.map((d) => ({ label: d.day, value: d.value }))}
            />
          ) : (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>주간 집계가 쌓이면 여기에 표시됩니다</Text>
            </View>
          )}
        </View>

        {/*
          ④ 지역 상권 분석 — 시안 mt-6.
             제목 16 옆에 **지역 이름 칩**(h-6 · brand-tint · 12 semibold),
             그 아래 한 줄 요약 pill(sparkles 13 + 12 medium).

          둘 다 3.5 가 줍니다. 지역 이름은 `insight_title`, 요약은 `insight_content`
          입니다. 값이 없으면 칩과 pill 을 **그리지 않습니다** — "— 상권" 같은
          빈 칩을 두면 고장으로 보입니다.
        */}
        <View style={styles.localWrap}>
          <View style={styles.localHead}>
            <Text style={styles.cardTitle}>지역 상권 분석</Text>
            {areaName ? (
              <View style={styles.areaChip}>
                <Text style={styles.areaChipText}>{areaName}</Text>
              </View>
            ) : null}
          </View>

          <LoadGate
            loading={insights.isLoading}
            error={insights.isError}
            ready={insights.data !== undefined}
            onRetry={insights.refetch}
            loadingLabel="분석을 불러오고 있어요"
          >
            {areaSummary || local?.insightContent ? (
              <View style={{ gap: space[2] }}>
                {areaSummary ? (
                  <View style={styles.summaryPill}>
                    <Sparkles size={13} strokeWidth={2} color={color.brand[600]} />
                    <Text style={styles.summaryText} numberOfLines={2}>
                      {areaSummary}
                    </Text>
                  </View>
                ) : null}
                {local?.insightContent ? (
                  <Text style={styles.localBody}>{local.insightContent}</Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.localBody}>아직 상권 분석이 준비되지 않았습니다.</Text>
            )}
          </LoadGate>
        </View>

        {/*
          ⑤ 소비층 구성 — 시안 mt-6 · 2열 · 도넛 80 + 범례.

          🔴 **자리만 만들어 둡니다** (2026-08-28 사장님 지시).
             시안은 연령대(10대~50+)와 성별 비율을 도넛 두 개로 보여 주는데,
             **그 값을 주는 필드를 아직 모릅니다.** 3.5 `insight_data` 안에 올 것으로
             보이지만 지금 insights 가 빈 배열이라 형태를 확인할 수 없었습니다
             (실측: store 21·67 둘 다 `{"insights": []}`).

             비율을 지어내면 사장님이 그 숫자를 보고 영상을 만드십니다. 그래서
             칸만 두고 왜 비었는지 밝힙니다 — 값이 오면 여기에 도넛을 넣습니다.
        */}
        <Text style={[styles.cardTitle, styles.sectionTitle]}>소비층 구성</Text>
        <View style={styles.mixGrid}>
          {mixes.map(({ label, segs }) => (
            <View key={label} style={styles.mixWrap}>
              <View style={styles.mixCard}>
                {segs ? (
                  <>
                    {/* 12시부터 시계방향으로 1초에 걸쳐 쓸립니다 (`Donut` 머리말) */}
                    <Donut segs={segs} size={80} />
                    <DonutLegend segs={segs} />
                  </>
                ) : (
                  <>
                    <View style={styles.mixDonut} />
                    <View style={styles.mixTextWrap}>
                      <Text style={styles.mixLabel}>{label}</Text>
                      <Text style={styles.mixEmpty}>집계 준비 중</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          ))}
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

            {/*
              🔴 **추천이 없으면 버튼도 없습니다** (2026-08-28 사장님 지시).

              3.5 가 아직 값을 안 줄 때 이 자리에는 "추천을 준비하고 있습니다" 만
              떠 있습니다. 그 상태에서 "바로 촬영하기" 를 눌러 봐야 **추천과 아무
              상관 없는 빈 촬영**이 시작됩니다 — 사장님은 추천대로 찍는 줄 아시고요.
              할 수 있는 게 없으면 버튼을 내는 것이 맞습니다.

              ⚠️ "다른 추천 보기" 는 **시안에 없어 걷어냈습니다**(같은 지시).
                 3.5 를 다시 불러도 서버가 같은 값을 주므로 눌러도 그대로였습니다.
            */}
            {next ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => nav.navigate('Create', { screen: 'PurposeSelect' })}
                style={({ pressed }) => [styles.recPrimary, pressTap(pressed, 'card')]}
              >
                <Camera size={18} strokeWidth={2} color={color.paper} />
                <Text style={styles.recPrimaryText}>바로 촬영하기</Text>
              </Pressable>
            ) : null}
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
  /* ── 플랫폼 토글 (시안 PlatformTabs) ────────────────
     mb-3 · rounded-lg · bg #F1F5F9 · p-0.5 · gap-0.5 */
  tabs: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: space[3],
    padding: 2,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
  },
  /* 시안: h-7(28) · flex-1 · rounded-md · 11 semibold */
  tab: { flex: 1, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: color.paper, ...theme.elevation('bubble') },
  tabText: { ...theme.text.micro, fontFamily: theme.text.chipLabel.fontFamily, fontWeight: theme.text.chipLabel.fontWeight, color: color.ink[500] },
  tabTextOn: { color: color.brand[600] },

  /* ── 지역 상권 분석 (시안 mt-6) ──────────────────── */
  localWrap: { marginTop: space[6], gap: space[2] },
  /* 제목 옆에 지역 칩이 붙습니다 — 시안 gap-2 */
  localHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  /* 시안: h-6 · rounded-full · bg-brand-tint · px-2.5 · 12 semibold brand */
  areaChip: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: color.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaChipText: { ...theme.text.label, fontFamily: theme.text.chipLabel.fontFamily, fontWeight: theme.text.chipLabel.fontWeight, color: color.brand[600] },
  /* 시안: 한 줄 요약 pill — rounded-full · 테두리 hairline · px-3 py-2 · 12 medium */
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    ...theme.elevation('card'),
  },
  summaryText: { ...theme.text.label, lineHeight: 18, flex: 1, minWidth: 0, color: color.ink[700] },
  localBody: { ...theme.text.caption, lineHeight: 21, color: color.ink[700] },

  /* ── 소비층 구성 (시안 grid-cols-2 gap-3 · 도넛 80) ──
     ⚠️ **두 카드는 같은 높이여야 합니다.** 범례 줄 수가 연령대 5줄 · 성별 2줄로
        달라서, 그냥 두면 카드 높이가 따로 놉니다. 시안은 CSS grid 라 자동으로
        같아지는데 우리는 flex 라 `alignItems: 'stretch'` + 카드 `flex: 1` 로
        높은 쪽에 맞춥니다. `flexWrap` 은 뺐습니다 — 두 장뿐이라 줄바꿈이 없고,
        wrap 이 붙어 있으면 줄 단위 정렬이 끼어들어 stretch 가 안 먹습니다. */
  mixGrid: { flexDirection: 'row', alignItems: 'stretch', gap: space[3] },
  mixWrap: { flex: 1 },
  mixCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    ...theme.elevation('card'),
  },
  /* 도넛이 앉을 자리. 값이 오면 여기에 그립니다 — 지금은 비어 있음을 색으로만 말합니다. */
  mixDonut: { width: 64, height: 64, borderRadius: 32, borderWidth: 12, borderColor: '#F1F5F9' },
  mixTextWrap: { flex: 1, minWidth: 0, gap: 2 },
  mixLabel: { ...theme.text.label, fontFamily: theme.text.bodyStrong.fontFamily, fontWeight: theme.text.bodyStrong.fontWeight, color: color.ink[700] },
  mixEmpty: { ...theme.text.micro, color: color.ink[400] },

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
});
