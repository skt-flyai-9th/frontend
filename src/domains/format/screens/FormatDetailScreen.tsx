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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Banner, Loading } from '../../../ui/Feedback';
import { TaskPager } from '../components/TaskPager';
import { guideVideoUrl } from '../../../api/formatVideo';
import {
  useCreatePlan,
  useProject,
  useScenes,
  useVideoFormat,
} from '../../../api/queries/project';
import { useTaskGuide, useTasks } from '../../../api/queries/shoot';
import theme, { color, space } from '../../../design/theme';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'FormatDetail'>;

export default function FormatDetailScreen({ navigation, route }: Props) {
  const { projectId, formatId } = route.params;
  const { data: format, isLoading, isError, refetch } = useVideoFormat(formatId);

  const createPlan = useCreatePlan(projectId ?? 0);
  const project = useProject(projectId);
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
  /*
    7.2 콘티 장면 — 컷 한 장에 붙는 **설명**이 여기 있습니다.
    예전에는 안무일 때만 불렀는데, 이제 정보형도 같은 카드를 쓰므로 항상 부릅니다.
  */
  const { data: scenes, isLoading: scenesLoading } = useScenes(projectId);

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
        <AppBar onBack={() => navigation.goBack()} title="촬영 가이드" />
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
        <AppBar onBack={() => navigation.goBack()} title="촬영 가이드" />
        <Loading label="촬영 가이드 준비 중" />
      </Screen>
    );
  }

  const selectedFormatMismatch =
    !!projectId && Number(project.data?.videoFormatId) !== Number(formatId);
  const preparing =
    !!projectId && (tasks.length === 0 || selectedFormatMismatch) && !createPlan.isError;

  return (
    <Screen
      padded={false}
      background={color.surface}
      contentStyle={{ paddingTop: 0, paddingBottom: space[6], gap: 0 }}
      footer={
        /* 시안: 상단 hairline · px-5 pb-8 pt-3 */
        <View style={styles.footer}>
          {/*
            카메라 아이콘 — 2026-08-28 에 뺐다가 **2026-08-29 에 되살렸습니다.**
            새 시안(`테스크가로변경점.png`)에 다시 붙어 있어 시안을 따릅니다.
            둘러보기(프로젝트 없음)일 때는 촬영으로 바로 가는 게 아니라 목적 선택부터
            시작하므로 아이콘을 달지 않습니다.
          */}
          <Button
            /* 아이콘 없이 글자만 (2026-08-30 지시 ⑩: "촬영시작 버튼 앞에 이모티콘 삭제"). */
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
      {/* 2026-08-31 지시 ④ — "촬영 준비" 를 "촬영 가이드" 로 바꿉니다 */}
      <AppBar onBack={() => navigation.goBack()} title={isDance ? '안무 가이드' : '촬영 가이드'} />

      {/*
        🔴 **컷을 한 장씩 옆으로 넘겨 봅니다** (2026-08-29, 시안 `테스크가로변경점.png`).

        예전에는 두 갈래였습니다 — 안무는 참고 영상 + 순서 목록, 정보형은 풀블리드 영상 +
        세로 컷 목록. **이제 둘 다 같은 모양**입니다.

        바꾼 이유는 컷 수입니다. 정보형 기획이 컷을 **23개**까지 줍니다(2026-08-28 실측).
        세로로 늘어놓으면 사장님이 스크롤만 하다 끝나고 지금 뭘 찍어야 하는지가 묻힙니다.
        한 장에 하나씩이면 "지금 이거 하나" 가 분명하고, 넘길 때마다 **그 컷의 참고 영상
        구간**이 함께 바뀝니다.

        ⚠️ 화면(기획 생성·포맷 조회·안무 판정·버튼 이동)은 그대로 두고 **본문만**
           갈아끼웠습니다. 저 로직들은 디자인과 무관하게 계속 필요합니다.
      */}
      <TaskPager
        tasks={selectedFormatMismatch ? [] : tasks}
        scenes={scenes}
        videoUrl={firstGuide?.referenceVideo?.referenceUrl ?? guideVideoUrl(format)}
        loading={preparing || scenesLoading}
      />

      {createPlan.isError ? (
        <View style={styles.errorWrap}>
          <Banner
            tone="danger"
            title="촬영 컷을 만들지 못했습니다"
            description="잠시 후 다시 눌러 주세요."
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* 기획 실패 배너가 앉는 자리 — 본문은 TaskPager 가 직접 여백을 잡습니다. */
  errorWrap: { paddingHorizontal: space[5], paddingTop: space[4] },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[8],
    borderTopWidth: theme.border.hairline,
    borderTopColor: color.hairlineSoft,
    backgroundColor: color.canvas,
  },
});
