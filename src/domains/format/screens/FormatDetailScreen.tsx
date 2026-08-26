/**
 * FormatDetailScreen — **시안 V4 `format` 대조 이식** (2026-08-26). 명세 5.2, 7.1, 8.1.
 *
 * 시안 구조 (이게 전부입니다)
 *   화면    bg-surface · 헤더 뒤로가기 + **"촬영 준비"**
 *   ①      참고 영상 — **좌우 여백 없는 3:4 풀블리드**
 *   ②      px-5 · "촬영 컷 구성" 16·semibold · mt-5 mb-2 pl-1
 *          컷 카드 gap-2 — 번호 원 28(브랜드 틴트, 13·bold) + 라벨 14·semibold
 *   ③      하단 고정 — 상단 hairline · px-5 pb-8 pt-3 · "가이드 촬영 시작하기"(카메라 18)
 *
 * ⚠️ 시안에 없어 걷어낸 것: 포맷 제목, 소요·난이도·얼굴노출 배지,
 *    "그대로 따라 하지 않습니다" 안내, "영상이 어떻게 굴러가는지" 타임라인.
 *
 * ⚠️ 컷 목록은 어디서 오나 — VideoFormat 에는 컷 정보가 없습니다.
 *    컷을 만드는 건 7.1 기획이라, 이 화면에 들어오면 기획을 먼저 만들고
 *    8.1 로 그 컷 목록을 읽어 보여 줍니다. 시안이 "촬영 준비" 라고 이름 붙인 그대로,
 *    여기가 촬영 직전 준비 단계입니다.
 *    (기획은 한 번만 만듭니다 — 뒤로 갔다 와도 캐시가 남아 다시 만들지 않습니다)
 *
 * ⚠️ 프로젝트 없이 둘러보기로 들어오면 만들 기획이 없습니다.
 *    그때는 컷 자리에 안내를 두고, 버튼이 목적 선택부터 시작하게 보냅니다.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, Clock, Gauge, Package, Users } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Banner, Loading } from '../../../ui/Feedback';
import { GuidePlayer } from '../../../ui/GuidePlayer';
import { guideVideoUrl } from '../../../api/formatVideo';
import { VideoThumbnail } from '../../../ui/VideoThumbnail';
import { useCreatePlan, useShootingSummary, useVideoFormat } from '../../../api/queries/project';
import { useTasks } from '../../../api/queries/shoot';
import theme, { color, radius, space, text } from '../../../design/theme';
import { shootTime } from '../../../lib/format';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'FormatDetail'>;

/**
 * 촬영 요약 한 줄. 아이콘 + 라벨 + 값.
 * 값이 없는 항목은 화면에서 아예 빼므로 여기서는 항상 값이 있다고 봅니다.
 */
function SummaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Icon size={16} strokeWidth={2} color={color.brand[600]} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function FormatDetailScreen({ navigation, route }: Props) {
  const { projectId, formatId } = route.params;
  const { data: format, isLoading, isError, refetch } = useVideoFormat(formatId);

  const createPlan = useCreatePlan(projectId ?? 0);
  /** 화면을 다시 열어도 남는 값 — 7.2 조회에서 같은 요약을 봅니다. */
  const storedSummary = useShootingSummary(projectId);
  const { data: board, isLoading: tasksLoading } = useTasks(projectId);
  const tasks = board?.tasks ?? [];

  /*
   * 들어오면 기획을 만듭니다. 이미 만들어 둔 프로젝트면 8.1 이 컷을 주므로
   * 다시 만들지 않습니다 — 같은 기획을 두 번 만들면 컷이 뒤바뀝니다.
   */
  useEffect(() => {
    if (!projectId) return;
    if (tasksLoading || tasks.length > 0) return;
    if (createPlan.isPending || createPlan.isSuccess || createPlan.isError) return;
    createPlan.mutate(formatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, tasksLoading, tasks.length]);

  if (isError || (!isLoading && !format)) {
    return (
      <Screen>
        <AppBar onBack={() => navigation.goBack()} title="촬영 준비" />
        <Banner
          tone="danger"
          title="이 방식을 불러오지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
        />
        <Button label="다시 시도" onPress={() => refetch()} />
      </Screen>
    );
  }

  if (isLoading || !format) {
    return (
      <Screen>
        <AppBar onBack={() => navigation.goBack()} title="촬영 준비" />
        <Loading label="촬영 준비 중" />
      </Screen>
    );
  }

  const preparing = !!projectId && tasks.length === 0 && !createPlan.isError;

  /**
   * 7.1 이 준 촬영 요약. 화면을 다시 열면 mutation 결과가 없어지므로
   * 7.2(scenes)에도 같은 값이 들어 있는 것을 함께 봅니다 — 둘 중 있는 쪽을 씁니다.
   */
  const summary = createPlan.data?.shootingSummary ?? storedSummary.data ?? null;

  return (
    <Screen
      padded={false}
      background={color.surface}
      contentStyle={{ paddingTop: 0, paddingBottom: space[6], gap: 0 }}
      footer={
        /* 시안: 상단 hairline · px-5 pb-8 pt-3 */
        <View style={styles.footer}>
          <Button
            icon={projectId ? Camera : undefined}
            label={projectId ? '가이드 촬영 시작하기' : '이 방식으로 만들기'}
            disabled={!!projectId && preparing}
            onPress={() => {
              if (!projectId) {
                // 둘러보기로 들어왔으면 목적 선택부터 시작합니다.
                navigation.navigate('PurposeSelect', { formatId });
                return;
              }
              // 고른 포맷을 들고 갑니다 — 카메라 좌상단 참고 영상이 이 값을 씁니다.
              navigation.replace('Camera', { projectId, formatId });
            }}
          />
        </View>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="촬영 준비" />

      {/* ① 시안: 좌우 여백 없는 3:4 */}
      {!format.sourcePlatform || format.sourcePlatform === 'YOUTUBE' ? (
        /* 촬영 준비 화면이므로 **가이드 영상** 입니다 (홈 카드의 대표 영상 아님) */
        <GuidePlayer url={guideVideoUrl(format)} fullBleed />
      ) : (
        /*
         * ⚠️ 인스타그램·틱톡은 임베드 재생 자체를 지원하지 않아 썸네일로 대체합니다.
         *    명세상 현재 카탈로그는 전부 YouTube 라 실질 이슈는 없습니다.
         */
        <VideoThumbnail
          url={guideVideoUrl(format)}
          platform={format.sourcePlatform}
          aspectRatio={3 / 4}
        />
      )}

      {/* ② */}
      <View style={styles.body}>
        {/*
         * 촬영 요약 — 7.1 이 주는 `shooting_summary` 입니다 (2026-08-26).
         *
         * 🔴 여태 **읽지 않고 버리고 있었습니다.** `createPlan` 을 호출만 하고 응답을
         *    쓰지 않아, AI 가 계산한 예상 촬영 시간·인원·준비물·난이도가 화면에
         *    한 번도 안 나왔습니다. BE 가 "값은 정상으로 내려간다" 고 알려 주셔서
         *    확인해 보니 프론트가 안 읽는 쪽이 맞았습니다.
         *
         * ⚠️ `expected_duration_sec` 는 **찍는 데 걸리는 시간**입니다 — 완성 영상
         *    길이가 아닙니다. 실제로 1800(30분) 같은 값이 옵니다.
         *
         * 없는 항목은 줄을 만들지 않습니다(준비물이 빈 배열이면 그 칸이 빠집니다).
         */}
        {summary && (
          <View style={styles.summary}>
            {shootTime(summary.expectedDurationSec) ? (
              <SummaryItem
                icon={Clock}
                label="예상 촬영 시간"
                value={shootTime(summary.expectedDurationSec) as string}
              />
            ) : null}
            {summary.requiredPeople ? (
              <SummaryItem icon={Users} label="필요 인원" value={`${summary.requiredPeople}명`} />
            ) : null}
            {summary.difficulty ? (
              <SummaryItem icon={Gauge} label="난이도" value={summary.difficulty} />
            ) : null}
            {summary.props?.length ? (
              <SummaryItem icon={Package} label="준비물" value={summary.props.join(' · ')} />
            ) : null}
          </View>
        )}

        <Text style={styles.sectionTitle}>촬영 컷 구성</Text>

        {createPlan.isError ? (
          <Banner
            tone="danger"
            title="촬영 컷을 만들지 못했습니다"
            description="잠시 후 다시 눌러 주세요."
          />
        ) : preparing ? (
          <Loading label="촬영 컷을 만드는 중" />
        ) : tasks.length > 0 ? (
          <View style={styles.cuts}>
            {tasks.map((t, i) => (
              <View key={t.id} style={styles.cut}>
                <View style={styles.num}>
                  <Text style={styles.numText}>{i + 1}</Text>
                </View>
                <Text style={styles.cutLabel} numberOfLines={2}>
                  {t.taskTitle}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>
            촬영 준비를 시작하면 이 방식에 맞는 컷 구성이 만들어집니다.
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 촬영 요약 — 컷 목록 위에 놓이는 정보 묶음
  summary: {
    gap: space[2],
    marginBottom: space[5],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.brand[100],
    backgroundColor: color.brand[50],
  },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  summaryLabel: { ...theme.text.bodySmall, width: 88, color: color.ink[500] },
  summaryValue: {
    ...theme.text.bodySmall,
    flex: 1,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[900],
  },
  // 시안: px-5 · 제목 mt-5 mb-2 pl-1
  body: { paddingHorizontal: space[5] },
  sectionTitle: {
    ...text.subheading,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    marginTop: space[5],
    marginBottom: space[2],
    paddingLeft: 4,
  },

  // 시안: gap-2 · 카드 rounded-xl border-hairline/80 bg-panel px-3.5 py-3
  cuts: { gap: space[2] },
  cut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space['3.5'],
    paddingVertical: space[3],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
  },
  // 시안: h-7 w-7 rounded-full bg-brand-tint · 13 bold brand
  num: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: color.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    ...text.caption,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
    color: color.brand[600],
  },
  cutLabel: {
    ...text.bodySmall,
    flexShrink: 1,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
  },
  empty: { ...text.bodySmall, color: color.ink[500] },

  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[8],
    borderTopWidth: theme.border.hairline,
    borderTopColor: color.hairlineSoft,
    backgroundColor: color.canvas,
  },
});
