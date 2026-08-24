/**
 * S05.1.1 포맷 탐색 + S05.1.2 AI 추천 + S05.2.1 정렬 + S05.2.2 필터 + S05.4.1 키워드검색
 * 명세 5.1
 *
 * ⚠️ 5.1 응답에는 reference_url 이 없습니다 (5.2 상세에만 있음).
 *    그래서 목록에서는 썸네일을 그릴 수 없는 게 정상입니다.
 *    억지로 회색 박스를 깔면 화면만 지저분해지므로,
 *    영상이 있는 항목만 썸네일을 보여주고 없으면 글자 카드로 둡니다.
 *
 * 명세 S05.2.2 "선택값 세션 유지" — 필터를 화면 밖(appState)에 둡니다.
 * 매번 처음부터 다시 고르게 하면 사장님이 탐색을 포기합니다.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Check } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge, Chip } from '../../../ui/Chip';
import { EmptyState, Loading } from '../../../ui/Feedback';
import { Field } from '../../../ui/Field';
import { VideoThumbnail } from '../../../ui/VideoThumbnail';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useVideoFormats } from '../../../api/queries/project';
import { useAppState } from '../../../lib/appState';
import { seconds } from '../../../lib/format';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'FormatFeed'>;

const TYPES = ['밈', '잔잔한 소개', '정보형', '챌린지'] as const;

/**
 * 명세 5.1 sort·period 조합. 사장님 말로 바꿔 보여줍니다.
 *
 * ⚠️ 서버 FormatSort enum 은 trending / views / latest 뿐입니다 (2026-08-26 실서버 대조).
 *    '쉬운 순' 은 서버에 없는 값이라 예전처럼 sort=easy 로 보내면 422 입니다.
 *    사장님에게 가장 쓸모 있는 정렬이라 없애지 않고, **서버에는 trending 을 보내고
 *    받은 목록을 화면에서 난이도순으로 정렬**합니다. clientSort 가 그 표시입니다.
 */
const SORTS: { key: string; period: string; label: string; clientSort?: 'easy' }[] = [
  { key: 'trending', period: '7d', label: '요즘 뜨는' },
  { key: 'views', period: '30d', label: '많이 본' },
  { key: 'latest', period: '30d', label: '최신순' },
  { key: 'easy', period: '7d', label: '쉬운 순', clientSort: 'easy' },
];

/** 촬영 난이도 하 → 상 순. 서버가 정렬해 주지 않는 값이라 여기서 정렬합니다. */
const DIFFICULTY_ORDER: Record<string, number> = { 하: 0, 중: 1, 상: 2 };

export default function FormatFeedScreen({ navigation, route }: Props) {
  const { projectId } = route.params;

  const filters = useAppState((s) => s.formatFilters);
  const setFilters = useAppState((s) => s.setFormatFilters);
  const resetFilters = useAppState((s) => s.resetFormatFilters);

  // 검색어는 타이핑마다 서버를 부르지 않도록 따로 둡니다.
  const [input, setInput] = useState(filters.keyword);
  useEffect(() => {
    const t = setTimeout(() => setFilters({ keyword: input }), 350);
    return () => clearTimeout(t);
  }, [input, setFilters]);

  /** 화면에서만 쓰는 정렬('쉬운 순')이면 서버에는 서버가 아는 값을 보냅니다. */
  const activeSort = SORTS.find((s) => s.key === filters.sort);
  const serverSort = activeSort?.clientSort ? 'trending' : filters.sort;

  const { data, isLoading, isError, refetch } = useVideoFormats({
    projectId,
    formatType: filters.formatType,
    faceExposureLevel: filters.faceExposureLevel,
    sort: serverSort,
    period: filters.period,
    keyword: filters.keyword || undefined,
  });

  /** '쉬운 순'일 때만 화면에서 한 번 더 정렬합니다. 그 외에는 서버 순서를 그대로 씁니다. */
  const formats = useMemo(() => {
    if (!data || activeSort?.clientSort !== 'easy') return data;
    return [...data].sort(
      (a, b) =>
        (DIFFICULTY_ORDER[a.shootingDifficulty] ?? 9) -
        (DIFFICULTY_ORDER[b.shootingDifficulty] ?? 9)
    );
  }, [data, activeSort?.clientSort]);

  const activeCount =
    (filters.formatType ? 1 : 0) +
    (filters.faceExposureLevel ? 1 : 0) +
    (filters.keyword ? 1 : 0);

  return (
    <Screen>
      <AppBar onBack={() => navigation.goBack()} title="어떻게 만들까요" />

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>사장님 조건에 맞는 방식</Text>
        <Text style={text.bodySmall}>조회수보다 지금 찍을 수 있는지를 먼저 봤습니다.</Text>
      </View>

      {/* 명세 S05.4.1 키워드 검색 */}
      <Field
        label="찾는 게 있으세요?"
        value={input}
        onChangeText={setInput}
        placeholder="예: 만드는 과정, 신메뉴"
        autoCorrect={false}
        returnKeyType="search"
      />

      {/* 명세 S05.2.1 정렬 */}
      <View style={{ gap: space[2] }}>
        <Text style={text.micro}>정렬</Text>
        <View style={styles.chips}>
          {SORTS.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              selected={filters.sort === s.key}
              onPress={() => setFilters({ sort: s.key, period: s.period })}
            />
          ))}
        </View>
      </View>

      {/* 명세 S05.2.2 필터 */}
      <View style={{ gap: space[2] }}>
        <Text style={text.micro}>조건</Text>
        <View style={styles.chips}>
          <Chip
            label="얼굴 없이"
            selected={filters.faceExposureLevel === '낮음'}
            onPress={() =>
              setFilters({
                faceExposureLevel: filters.faceExposureLevel === '낮음' ? undefined : '낮음',
              })
            }
          />
          <Chip
            label="전체"
            selected={!filters.formatType}
            onPress={() => setFilters({ formatType: undefined })}
          />
          {TYPES.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={filters.formatType === t}
              onPress={() => setFilters({ formatType: t })}
            />
          ))}
        </View>
        {activeCount > 0 && (
          <Chip
            label={`조건 ${activeCount}개 지우기`}
            onPress={() => {
              resetFilters();
              setInput('');
            }}
          />
        )}
      </View>

      {/* 고르기 어려울 때의 우회로 */}
      <Card onPress={() => navigation.navigate('Quiz', { projectId })}>
        <Text style={text.bodyStrong}>고르기가 어려우세요?</Text>
        <Text style={text.bodySmall}>몇 가지만 답하시면 가장 쉬운 방법을 대신 골라 드립니다.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={[text.caption, { color: color.brand[600] }]}>질문으로 찾기</Text>
            <ChevronRight size={14} strokeWidth={2} color={color.brand[600]} />
          </View>
      </Card>

      {isLoading && !data && <Loading label="가게에 맞는 방식을 고르는 중" />}

      {isError && (
        <EmptyState
          title="목록을 불러오지 못했습니다"
          description="신호를 확인하고 다시 시도해 주세요."
          actionLabel="다시 시도"
          onAction={() => refetch()}
        />
      )}

      {/* 명세 S05.2.1 "결과 0건 시 조건 완화 제안" */}
      {!isLoading && !isError && formats?.length === 0 && (
        <EmptyState
          title="조건에 맞는 방식이 없습니다"
          description={
            activeCount > 0
              ? '조건을 지우면 더 많이 보입니다.'
              : // 조건이 없는데도 0건이면 목록 자체가 비어 있는 것입니다.
                '지금은 목록이 비어 있습니다. 조금 뒤에 다시 열어 보세요.'
          }
          actionLabel={activeCount > 0 ? '조건 지우기' : '질문으로 찾기'}
          onAction={() => {
            if (activeCount > 0) {
              resetFilters();
              setInput('');
            } else {
              navigation.navigate('Quiz', { projectId });
            }
          }}
        />
      )}

      {formats?.map((f, i) => (
        <Card
          key={f.id}
          onPress={() => navigation.navigate('FormatDetail', { projectId, formatId: f.id })}
        >
          {/*
            명세 5.1 응답에는 reference_url 이 없습니다.
            서버가 주는 경우에만 썸네일을 그리고, 없으면 글자 카드로 둡니다.
          */}
          {f.referenceUrl ? (
            <VideoThumbnail
              url={f.referenceUrl}
               platform={f.sourcePlatform}
              duration={seconds(f.expectedDurationSec)}
              badge={i === 0 ? '가장 잘 맞습니다' : undefined}
            />
          ) : (
            i === 0 && <Badge label="가장 잘 맞습니다" tone="brand" />
          )}

          <Text style={text.subheading}>{f.formatTitle}</Text>

          <View style={styles.metaRow}>
            <Meta label="종류" value={f.formatType} />
            <Meta label="길이" value={seconds(f.expectedDurationSec)} />
            <Meta label="난이도" value={f.shootingDifficulty} />
            <Meta label="얼굴" value={f.faceExposureLevel} />
          </View>

          {/* 명세 규칙: 점수가 아니라 이유를 보여줍니다 */}
          {f.recommendReasons?.map((r, idx) => (
            <View key={idx} style={styles.reasonRow}>
              <Check size={16} strokeWidth={2.5} color={color.done[500]} />
              <Text style={[text.bodySmall, { flex: 1 }]}>{r}</Text>
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={text.micro}>{label}</Text>
      <Text style={[text.bodySmall, { fontFamily: theme.text.bodyStrong.fontFamily }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: color.ink[50],
    borderRadius: radius.md,
    paddingVertical: space[3],
  },
  meta: { flex: 1, alignItems: 'center', gap: 2 },
  reasonRow: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
});
