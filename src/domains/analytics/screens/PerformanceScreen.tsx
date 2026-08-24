/**
 * S17.2.1 성과 지표 + S17.3.1 비교 · 명세 17.1, 17.2
 *
 * 명세가 의도한 흐름
 *   17.2 compare 로 이 가게의 게시물 목록과 정규화 지표를 받고,
 *   그중 하나를 골라 17.1 metrics 로 자세히 봅니다.
 *   (게시물 목록 전용 API 가 따로 없습니다)
 *
 * 기능명세 규칙
 *   - 표본이 적으면 confidence 를 반드시 함께 보여준다
 *   - 영상 한 편으로 결론 내리지 않는다
 *   - 플랫폼이 안 주는 지표는 0 이 아니라 N/A 로 둔다
 *   - 언제 기준 데이터인지 밝힌다
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { Card } from '../../../ui/Card';
import { Badge, Chip } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import theme, { color, radius, space, text } from '../../../design/theme';
import {
  periodRange,
  useComparison,
  useMetrics,
  useSnsConnections,
  useSnsPost,
} from '../../../api/queries/edit';
import { Button } from '../../../ui/Button';
import { useCurrentStore } from '../../../lib/appState';
import { count } from '../../../lib/format';
import { timeAgo } from '../../../api/schema/convert';
import type { Confidence } from '../../../api/schema/types';
import type { RootStackParamList } from '../../../navigation/types';

/** 서버가 주는 metric_name 을 사장님 말로 바꿉니다. */
const METRIC_LABEL: Record<string, string> = {
  views: '조회',
  likes: '좋아요',
  saves: '저장',
  shares: '공유',
  comments: '댓글',
  reach: '도달',
  profileVisits: '프로필 방문',
  followsFromPost: '이 영상으로 팔로우',
  averageViewDuration: '평균 시청 시간',
  averageViewPercentage: '평균 시청률',
  subscribersGained: '늘어난 구독',
  watchTime: '총 시청 시간',
};

/** 명세 17.1 Param from·to */
const PERIODS = [
  { days: 7, label: '최근 7일' },
  { days: 30, label: '최근 30일' },
  { days: 90, label: '최근 3개월' },
];

/**
 * 명세 17.2 (2026-08-24): 플랫폼 탭은 하드코딩하지 않고
 * GET /sns-connections 응답으로 만듭니다. 연동 안 한 플랫폼 탭이
 * 빈 채로 남는 걸 막고, 플랫폼이 늘어도 화면을 안 고칩니다.
 * '전체' 탭은 두지 않습니다 — 혼합 조회는 유튜브 비율이 null 로 섞여
 * 표가 반쯤 비고, 절대 조회수 비교 금지 원칙(S17.3.1)과도 어긋납니다.
 */
const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: '인스타그램',
  YOUTUBE: '유튜브',
};

function confidenceTone(c: Confidence) {
  if (c === '높음') return { label: '근거 충분', tone: 'done' as const };
  if (c === '보통') return { label: '참고용', tone: 'neutral' as const };
  return { label: '자료 부족', tone: 'warn' as const };
}

export default function PerformanceScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const storeId = useCurrentStore();

  const [days, setDays] = useState(7);
  const [platform, setPlatform] = useState<string | undefined>();
  const [selected, setSelected] = useState<number | null>(null);

  // 17.2 로 게시물 목록과 정규화 지표를 받습니다.
  /**
   * 성과의 전제는 SNS 연동입니다 (BE 확답 2026-08-24: 지표는 연동 토큰으로
   * 플랫폼 API 를 불러 수집 — 연동 없이는 수집 자체가 없습니다).
   * 그래서 연동 확인이 이 화면의 최상단 분기입니다.
   */
  const { data: connections, isLoading: connLoading } = useSnsConnections();
  const linkedPlatforms = Array.from(new Set((connections ?? []).map((c) => c.snsPlatform)));

  const {
    data: comparison,
    isLoading: cmpLoading,
    isError: cmpError,
    refetch,
  } = useComparison(storeId, platform);

  // 목록의 첫 번째를 기본 선택합니다.
  const currentPostId = selected ?? comparison?.[0]?.snsPostId;

  // 17.1 로 선택한 게시물의 자세한 지표를 봅니다.
  const { from, to } = periodRange(days);
  const { data: metrics, isLoading: mLoading } = useMetrics(currentPostId, from, to);

  // 아직 주소를 연결하지 않은 게시물 안내
  const { data: pendingPost } = useSnsPost(901);
  const needsLink = pendingPost?.postStatus === 'PENDING_LINK';

  /**
   * 명세 17.1 (2026-08-24): 지표는 스냅샷으로 쌓여 collected_at 오름차순으로
   * 옵니다. 그리드는 지표별 **마지막(최신)** 값을 씁니다 — 첫 값을 쓰면
   * 며칠 전 숫자를 최신처럼 보여주는 거짓말이 됩니다.
   */
  const latestMetrics = useMemo(() => {
    const byName = new Map<string, (typeof metrics extends (infer T)[] | undefined ? T : never)>();
    for (const m of metrics ?? []) byName.set(m.metricName, m); // 오름차순이라 뒤가 이김
    return Array.from(byName.values());
  }, [metrics]);
  const latestCollectedAt = metrics?.length ? metrics[metrics.length - 1].collectedAt : undefined;

  if (!storeId) {
    return (
      <Screen edges={['top']}>
        <EmptyState title="가게를 먼저 등록해 주세요" />
      </Screen>
    );
  }

  if (connLoading) {
    return (
      <Screen edges={['top']}>
        <Text style={text.title}>올린 영상 반응</Text>
        <Loading label="연동 상태를 확인하는 중" />
      </Screen>
    );
  }

  if (linkedPlatforms.length === 0) {
    // 연동이 없으면 지표 수집 자체가 없습니다. 빈 표 대신 이유와 길을 보여줍니다.
    return (
      <Screen edges={['top']}>
        <Text style={text.title}>올린 영상 반응</Text>
        <EmptyState
          title="아직 반응을 모을 수 없습니다"
          description={
            '조회수와 좋아요는 인스타그램·유튜브 계정을 연결해야 가져올 수 있어요.\n연결하면 그때부터 자동으로 모입니다.'
          }
        />
        <Button label="계정 연결하러 가기" onPress={() => nav.navigate('SnsConnect' as never)} />
        <Text style={[text.caption, { color: color.ink[400] }]}>
          성과 분석은 인스타그램·유튜브만 지원합니다. NAVER Clip·TikTok에 올린 영상은 지표를
          가져올 방법이 없어 여기 나오지 않습니다.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <Text style={text.title}>올린 영상 반응</Text>

      {needsLink && (
        <Card
          onPress={() =>
            nav.navigate('Create', {
              screen: 'PostLink',
              params: { postId: pendingPost!.id, platform: pendingPost!.postPlatform },
            })
          }
        >
          <View style={styles.head}>
            <Text style={text.subheading}>연결하지 않은 영상이 있습니다</Text>
            <Badge label="연결 대기" tone="warn" />
          </View>
          <Text style={text.bodySmall}>
            올리신 게시물 주소를 넣으면 조회수와 반응을 볼 수 있습니다.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={[text.caption, { color: color.brand[600] }]}>지금 연결하기</Text>
            <ChevronRight size={14} strokeWidth={2} color={color.brand[600]} />
          </View>
        </Card>
      )}

      {/* 명세 17.2 platform 필터 */}
      <View style={styles.chips}>
        {linkedPlatforms.map((key) => (
          <Chip
            key={key}
            label={PLATFORM_LABEL[key] ?? key}
            selected={platform === key}
            onPress={() => {
              setPlatform(key);
              setSelected(null);
            }}
          />
        ))}
      </View>

      {cmpLoading && !comparison && <Loading label="불러오는 중" />}

      {cmpError && (
        <EmptyState
          title="반응을 불러오지 못했습니다"
          description="신호를 확인하고 다시 시도해 주세요."
          actionLabel="다시 시도"
          onAction={() => refetch()}
        />
      )}

      {!cmpLoading && !cmpError && (comparison?.length ?? 0) === 0 && (
        <EmptyState
          title="아직 연결한 영상이 없습니다"
          description="영상을 올린 뒤 게시물 주소를 연결하면 반응을 볼 수 있습니다."
          actionLabel="영상 만들러 가기"
          onAction={() => nav.navigate('Create', { screen: 'PurposeSelect' })}
        />
      )}

      {/* 게시물 고르기 — 두 개 이상일 때만 */}
      {(comparison?.length ?? 0) > 1 && (
        <View style={{ gap: space[2] }}>
          <Text style={text.micro}>어느 영상을 볼까요</Text>
          <View style={styles.chips}>
            {comparison?.map((c) => (
              <Chip
                key={c.snsPostId}
                label={`${c.daysSincePosted}일 전`}
                selected={currentPostId === c.snsPostId}
                onPress={() => setSelected(c.snsPostId)}
              />
            ))}
          </View>
        </View>
      )}

      {/* 명세 17.1 from·to */}
      {currentPostId && (
        <View style={{ gap: space[2] }}>
          <Text style={text.micro}>기간</Text>
          <View style={styles.chips}>
            {PERIODS.map((p) => (
              <Chip
                key={p.days}
                label={p.label}
                selected={days === p.days}
                onPress={() => setDays(p.days)}
              />
            ))}
          </View>
        </View>
      )}

      {mLoading && !metrics && <Loading label="지표를 불러오는 중" />}

      {metrics && metrics.length > 0 && (
        <Card>
          <View style={styles.head}>
            <Text style={text.subheading}>{PERIODS.find((p) => p.days === days)?.label}</Text>
            {platform && <Badge label={platform === 'INSTAGRAM' ? '인스타그램' : '유튜브'} />}
          </View>

          <View style={styles.grid}>
            {latestMetrics.map((m) => (
              <View key={m.metricName} style={styles.cell}>
                <Text style={text.micro}>{METRIC_LABEL[m.metricName] ?? m.metricName}</Text>
                <Text style={styles.value}>
                  {/* 평균 시청률(유튜브)은 % 지표라 개수 포맷을 쓰면 거짓이 됩니다 */}
                  {m.metricName === 'averageViewPercentage'
                    ? `${m.metricValue}%`
                    : count(m.metricValue)}
                </Text>
              </View>
            ))}
          </View>

          {/* 명세 규칙: 언제 기준 데이터인지 밝힙니다 */}
          {latestCollectedAt && (
            <Text style={text.micro}>{timeAgo(latestCollectedAt)}에 받은 값입니다.</Text>
          )}
          <Text style={text.micro}>
            플랫폼이 제공하지 않는 지표는 표시되지 않습니다. 0이 아니라 알 수 없음입니다.
          </Text>
        </Card>
      )}

      {!mLoading && currentPostId && metrics?.length === 0 && (
        <Banner
          tone="info"
          title="이 기간에는 자료가 없습니다"
          description="올린 지 얼마 안 됐다면 하루 이틀 뒤에 다시 보세요."
        />
      )}

      {comparison && comparison.length > 0 && (
        <>
          <Banner
            tone="warn"
            title="영상 한 편으로 결론 내리지 않습니다"
            description="아래 해석은 참고용입니다. 몇 편 더 쌓이면 훨씬 정확해집니다."
          />

          <Text style={text.subheading}>지난 영상과 비교</Text>
          {platform === 'YOUTUBE' && (
            <Text style={[text.caption, { color: color.ink[500] }]}>
              유튜브는 도달·저장 수를 제공하지 않아 비율 칸이 '—' 로 표시됩니다.
            </Text>
          )}
          {comparison.map((c) => {
            const conf = confidenceTone(c.confidence);
            const isCurrent = currentPostId === c.snsPostId;
            return (
              <Card
                key={c.snsPostId}
                selected={isCurrent}
                onPress={() => setSelected(c.snsPostId)}
              >
                <View style={styles.head}>
                  <Text style={text.bodyStrong}>{c.daysSincePosted}일 전 영상</Text>
                  <Badge label={conf.label} tone={conf.tone} />
                </View>
                <View style={styles.rateRow}>
                  {/* null = "계산할 수 없음". 0% 로 쓰면 거짓말입니다 (명세 17.2) */}
                  <Rate
                    label="끝까지 본 비율"
                    value={c.viewRate == null ? '—' : `${Math.round(c.viewRate * 100)}%`}
                  />
                  <Rate
                    label="저장 비율"
                    value={c.saveRate == null ? '—' : `${(c.saveRate * 100).toFixed(1)}%`}
                  />
                </View>
                {c.confidence === '낮음' && (
                  <Text style={text.micro}>
                    올린 지 {c.daysSincePosted}일밖에 안 돼서 아직 판단하기 이릅니다.
                  </Text>
                )}
              </Card>
            );
          })}

          <Text style={[text.caption, { color: color.ink[400] }]}>
            성과 분석은 인스타그램·유튜브만 지원합니다. NAVER Clip·TikTok 게시물은 지표를
            가져올 방법이 없어 이 목록에 나오지 않습니다.
          </Text>
        </>
      )}
    </Screen>
  );
}

function Rate({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={text.micro}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: color.ink[50],
    borderRadius: radius.md,
    paddingVertical: space[4],
  },
  cell: { width: '33.33%', alignItems: 'center', gap: 2, paddingVertical: space[2], flexGrow: 1 },
  rateRow: {
    flexDirection: 'row',
    backgroundColor: color.ink[50],
    borderRadius: radius.md,
    paddingVertical: space[3],
  },
  value: { ...text.subheading, fontFamily: theme.text.bodyStrong.fontFamily },
});
