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
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Clock, Gauge, Music4, Package, Users } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { Marquee } from '../../../ui/Marquee';
import { AppBar } from '../../../ui/AppBar';
import { Banner, Loading } from '../../../ui/Feedback';
import { GuidePlayer } from '../../../ui/GuidePlayer';
import { guideVideoUrl } from '../../../api/formatVideo';
import { VideoThumbnail } from '../../../ui/VideoThumbnail';
import {
  useCreatePlan,
  useProject,
  useScenes,
  useShootingSummary,
  useVideoFormat,
} from '../../../api/queries/project';
import { useTaskGuide, useTasks } from '../../../api/queries/shoot';
import theme, { color, radius, space, text } from '../../../design/theme';
import { shootTime } from '../../../lib/format';
import type { CreateStackParamList } from '../../../navigation/types';
import type { StoryboardScene } from '../../../api/schema/types';

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

/**
 * 안무 가이드 본문 — 시안 `최종-안무분기.html` 의 `DanceGuideBody`.
 *
 * 춤이 들어가는 영상은 컷 목록보다 **동작 순서**를 먼저 익혀야 합니다. 그래서 같은
 * 촬영 준비 화면이 제목·본문·버튼을 갈아 입습니다(별도 화면이 아닙니다 — 시안 구조 그대로).
 *
 * 시안 실측값
 *   배너      rounded-xl · bg-brand-tint · px-3.5 py-2.5 · music 14 + 13 semibold brand
 *   참고 영상  mt-4 · rounded-2xl · aspect 3/4 — **컷 구성 쪽과 달리 모서리가 둥글고 여백 안쪽**
 *   제목      "안무 순서" 16 semibold · mb-2 mt-5 pl-1
 *   순서 카드  rounded-xl · 테두리 hairline · bg-panel · px-3.5 py-3 · gap-2
 *             번호 원 28 브랜드틴트 13 bold · 제목 14 semibold · 설명 12.5 leading-relaxed slate
 *
 * ⚠️ **동작 설명("박수 두 번 후 오른손 웨이브")은 서버에 없습니다.**
 *    시안은 목업(`DANCE_GUIDE.steps`)이고, 실제로 가장 가까운 값은 7.2 콘티의 장면입니다.
 *    장면 설명을 제목으로, 대사가 있으면 아래 줄에 둡니다 — 없는 동작을 지어내지 않습니다
 *    (CLAUDE.md §2). 안무 전용 스텝이 필요해지면 그때 BE 에 요청합니다.
 */
function DanceGuideBody({
  videoUrl,
  scenes,
  loading,
}: {
  videoUrl?: string;
  scenes: StoryboardScene[];
  loading: boolean;
}) {
  return (
    <View style={styles.danceBody}>
      <View style={styles.danceBanner}>
        <Music4 size={14} strokeWidth={2} color={color.brand[600]} />
        <Text style={styles.danceBannerText}>촬영 전에 안무를 먼저 익혀볼게요</Text>
      </View>

      <View style={styles.danceVideo}>
        <GuidePlayer url={videoUrl} />
      </View>

      <Text style={styles.sectionTitle}>안무 순서</Text>

      {loading ? (
        <Loading label="안무 순서를 불러오는 중" />
      ) : scenes.length > 0 ? (
        <View style={styles.cuts}>
          {scenes.map((s, i) => {
            /*
              7.2 장면 설명은 **"할 일 — 어떻게"** 한 문장으로 옵니다 (실서버 확인).
                "첫 안무를 큰 동작으로 보여주기 — 팔과 상체를 크게 움직이는 첫 안무를 …"
              시안 순서 카드가 제목 + 설명 두 줄이라, 그 줄표에서 쪼갭니다.
              줄표가 없으면 통째로 제목이 됩니다(억지로 자르지 않습니다).

              ⚠️ 대사(`sceneDialogue`)는 안무에서 늘 빈 문자열로 옵니다 — 춤에는 할 말이
                 없기 때문입니다. 그래서 대사가 아니라 이 설명을 아랫줄로 씁니다.
            */
            const [title, ...rest] = (s.sceneDescription ?? '').split('—');
            const desc = rest.join('—').trim();
            return (
              <View key={s.id} style={styles.danceStep}>
                <View style={styles.danceNum}>
                  <Text style={styles.numText}>{i + 1}</Text>
                </View>
                <View style={styles.danceStepText}>
                  <Marquee style={styles.danceStepTitle}>{title.trim()}</Marquee>
                  {desc ? <Text style={styles.danceStepDesc}>{desc}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.empty}>촬영 준비를 시작하면 안무 순서가 만들어집니다.</Text>
      )}
    </View>
  );
}

export default function FormatDetailScreen({ navigation, route }: Props) {
  const { projectId, formatId } = route.params;
  const { data: format, isLoading, isError, refetch } = useVideoFormat(formatId);

  const createPlan = useCreatePlan(projectId ?? 0);
  const project = useProject(projectId);
  /** 화면을 다시 열어도 남는 값 — 7.2 조회에서 같은 요약을 봅니다. */
  const storedSummary = useShootingSummary(projectId);
  const { data: board, isLoading: tasksLoading } = useTasks(projectId);
  const tasks = board?.tasks ?? [];

  /**
   * 🔴 **안무 영상인지 가리는 값** (2026-08-28).
   *
   * 9.1 `guide_type` 이 유일한 정식 신호입니다 — 명세도 9.1 을 "구도 오버레이 /
   * **댄스 임베드** / B-roll 샷리스트 통합" 으로 정의합니다.
   *
   * ⚠️ **그런데 서버가 그 값을 채우지 않습니다.** 2026-08-28 실서버에서 직접 확인했습니다 —
   *    챌린지 포맷(id 49 "오츠카레 썸머 챌린지")으로 기획을 새로 돌려 컷 7개를 뽑았는데,
   *    제목이 "첫 안무를 큰 …" 인데도 **일곱 개 전부 `OVERLAY`** 였습니다.
   *    어제 만든 프로젝트(58)도 다시 찍어 같은 결과였습니다.
   *
   * 그래서 **`format_type === '챌린지'` 를 함께 봅니다.** 지금 카탈로그는 3건이고
   * (밈 · 정보형 · 챌린지) 챌린지는 하나뿐이며, 그 하나가 실제로 안무 컷을 만듭니다.
   *
   * ⚠️ **임시 기준입니다.** 춤이 아닌 챌린지 포맷이 생기면 그날 오판합니다.
   *    서버가 `DANCE` 를 주기 시작하면 위 조건이 먼저 맞으므로 그때 이 줄을 지우면 됩니다.
   *    BE 전달사항 §2-2 로 계속 밀고 있는 항목입니다.
   *
   * `EXPO_PUBLIC_QA_DANCE=1` 은 개발 중 화면 확인용입니다.
   *
   * 컷마다 붙는 값이지만 여기서는 **첫 컷 하나만** 봅니다. 한 기획 안에서 형식이
   * 섞이지 않고, 컷 수만큼 요청을 늘릴 이유도 없습니다.
   */
  const { data: firstGuide } = useTaskGuide(tasks[0]?.id);
  const isDance =
    process.env.EXPO_PUBLIC_QA_DANCE === '1' ||
    firstGuide?.guideType === 'DANCE' ||
    format?.formatType === '챌린지';

  /** 안무 순서로 쓸 7.2 콘티 장면 (`DanceGuideBody` 머리말 참고) */
  const { data: scenes, isLoading: scenesLoading } = useScenes(isDance ? projectId : undefined);

  /*
   * 들어오면 기획을 만듭니다. 이미 만들어 둔 프로젝트면 8.1 이 컷을 주므로
   * 다시 만들지 않습니다 — 같은 기획을 두 번 만들면 컷이 뒤바뀝니다.
   */
  /**
   * 🔴 **이미 요청한 조합을 기억합니다** (2026-08-28).
   *
   * 예전에는 `createPlan.isSuccess` 로 막았습니다. 그런데 **뮤테이션 상태는 화면이
   * 살아 있는 동안 남습니다.** 이 화면이 다시 마운트되지 않고 `projectId`·`formatId`
   * 만 바뀌면(같은 화면 이름으로 다시 이동하는 경우) 첫 번째 영상에서 켜진
   * `isSuccess` 가 그대로라 **두 번째 영상의 기획을 아예 안 만듭니다.**
   * 그러면 화면이 첫 번째 컷 구성에 머뭅니다.
   *
   * 프로젝트·포맷 **조합**을 기억하는 방식으로 바꿉니다. 조합이 달라지면 다시 만들고,
   * 같은 조합이면 두 번 만들지 않습니다(같은 기획을 두 번 만들면 컷이 뒤바뀝니다).
   */
  const planRequested = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    if (tasksLoading || project.isLoading) return;
    const matchesSelectedFormat = Number(project.data?.videoFormatId) === Number(formatId);
    if (tasks.length > 0 && matchesSelectedFormat) return;
    const combo = `${projectId}:${formatId}`;
    if (planRequested.current === combo) return;
    planRequested.current = combo;
    createPlan.mutate(formatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, formatId, tasksLoading, tasks.length, project.isLoading, project.data?.videoFormatId]);

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

  const selectedFormatMismatch =
    !!projectId && Number(project.data?.videoFormatId) !== Number(formatId);
  const preparing =
    !!projectId && (tasks.length === 0 || selectedFormatMismatch) && !createPlan.isError;

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
          {/* 카메라 아이콘은 뺐습니다 (2026-08-28 요청) — 글자만 둡니다 */}
          <Button
            label={
              !projectId
                ? '이 방식으로 만들기'
                : isDance
                  ? '안무 익혔어요, 촬영 시작'
                  : '가이드 촬영 시작하기'
            }
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
      <AppBar onBack={() => navigation.goBack()} title={isDance ? '안무 가이드' : '촬영 준비'} />

      {/*
        안무면 본문이 통째로 바뀝니다 — 참고 영상도 본문 안에서 둥근 모서리로 들어가므로
        아래 풀블리드 영상은 그리지 않습니다 (시안 `DanceGuideBody` / `ShotListBody` 구조).
      */}
      {isDance ? (
        <DanceGuideBody
          videoUrl={firstGuide?.referenceVideo?.referenceUrl ?? guideVideoUrl(format)}
          scenes={scenes ?? []}
          loading={preparing || scenesLoading}
        />
      ) : (
        <>

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
          촬영 요약(예상 촬영 시간·필요 인원·난이도·준비물)은 **뺐습니다** (2026-08-27).

          바로 위 카드의 해시태그가 이미 같은 말을 합니다 — `#촬영13초 #난이도중 #얼굴촬영X`.
          같은 값을 두 번 보여주느라 정작 중요한 "촬영 컷 구성" 이 아래로 밀렸습니다.
          사장님 지시로 걷어냈습니다. `shooting_summary` 자체는 7.1 이 계속 주고 있어,
          다시 살릴 일이 생기면 `summary` 변수를 그대로 쓰면 됩니다.
        */}

        <Text style={styles.sectionTitle}>촬영 컷 구성</Text>

        {createPlan.isError ? (
          <Banner
            tone="danger"
            title="촬영 컷을 만들지 못했습니다"
            description="잠시 후 다시 눌러 주세요."
          />
        ) : preparing ? (
          <Loading label="촬영 컷을 만드는 중" />
        ) : tasks.length > 0 && !selectedFormatMismatch ? (
          <View style={styles.cuts}>
            {tasks.map((t, i) => (
              <View key={t.id} style={styles.cut}>
                <View style={styles.num}>
                  <Text style={styles.numText}>{i + 1}</Text>
                </View>
                {/*
                  🔴 **컷 이름은 자르지 않습니다** (2026-08-28, 사장님 지시).

                  컷 이름은 AI 가 만들어서 길이를 우리가 못 정합니다. `slice(0, 9)` 로
                  자르면 표시 없이 끊기고, `numberOfLines` 로 두면 `…` 가 붙어
                  **지금 뭘 찍어야 하는지가 사라집니다.**

                  그래서 전광판(`Marquee`)으로 흘립니다 — 칸에 들어가면 가만히 있고,
                  넘칠 때만 오른쪽에서 왼쪽으로 흘러 전체를 다 보여 줍니다.
                  촬영 화면 컷 칩에서 같은 이유로 쓰던 컴포넌트입니다.
                */}
                <Marquee containerStyle={styles.cutLabelBox} style={styles.cutLabel}>
                  {t.taskTitle}
                </Marquee>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>
            촬영 준비를 시작하면 이 방식에 맞는 컷 구성이 만들어집니다.
          </Text>
        )}
      </View>
        </>
      )}
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
  // ── 안무 가이드 본문 (시안 DanceGuideBody) ──────────
  danceBody: { paddingHorizontal: space[5] },
  // 시안: rounded-xl · bg-brand-tint · px-3.5 py-2.5 · gap-1.5
  danceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space[4],
    paddingHorizontal: space['3.5'],
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: color.brand[50],
  },
  // 시안: 13 semibold brand · leading 없어 ×1.5
  danceBannerText: {
    ...theme.text.chipLabel,
    lineHeight: 19.5,
    flex: 1,
    minWidth: 0,
    color: color.brand[600],
  },
  /*
    시안: mt-4 · rounded-2xl · aspect 3/4.
    컷 구성 쪽 영상은 좌우 여백 없는 풀블리드지만, 안무는 **여백 안쪽 둥근 상자**입니다.
  */
  danceVideo: {
    marginTop: space[4],
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: color.ink[200],
  },
  // 시안: rounded-xl · 테두리 hairline · bg-panel · px-3.5 py-3 · items-start
  danceStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingHorizontal: space['3.5'],
    paddingVertical: space[3],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
  },
  // 번호 원은 컷 목록과 같은 28. 글자 위에 맞추려 2 내립니다(시안 mt-0.5)
  danceNum: {
    width: 28,
    height: 28,
    marginTop: 2,
    borderRadius: radius.pill,
    backgroundColor: color.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  danceStepText: { flex: 1, minWidth: 0, gap: 2 },
  // 시안: 14 semibold ink
  danceStepTitle: {
    ...text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
  },
  // 시안: 12.5 leading-relaxed slate → 12.5 × 1.625
  danceStepDesc: {
    ...theme.text.label,
    fontSize: 12.5,
    lineHeight: 20.3,
    color: color.ink[500],
  },
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
  /*
    전광판이 앉는 창 — **남는 폭을 전부** 차지해야 흐를 여지가 최대가 됩니다.
    `flexShrink: 1` 만 있던 때는 글자가 남는 폭을 안 가져가서, 한 줄에 들어갈
    제목까지 좁은 칸에 갇혀 잘렸습니다. 앱의 다른 행들과 같은 `flex: 1, minWidth: 0`
    입니다(`MenuManager.fields` · `FormatCard` · `SignUpVerifyScreen.targetText`).
  */
  cutLabelBox: { flex: 1, minWidth: 0 },
  cutLabel: {
    ...text.bodySmall,
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
