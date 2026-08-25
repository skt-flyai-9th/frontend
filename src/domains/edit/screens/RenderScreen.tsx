/**
 * RenderScreen — **시안 v3 `editing` 대조 이식** (2026-08-26). 명세 14.1, 14.2.
 *
 * 시안 구조 (위에서부터, 이게 전부입니다)
 *   화면    앱바 없음 · bg-canvas · px-6(24) pt-6(24)
 *   ①      "AI 자동 편집" 18·bold + mt-1 "촬영본을 숏폼으로 만드는 중이에요." 14·slate
 *   ②      mt-6 미리보기 상자 — w190 · 9:16 · rounded-2xl · border hairline · bg-hairline
 *          가운데 "촬영된 영상" 13·medium·slate
 *          단계가 지나가면 그 단계가 넣는 것이 상자 위에 나타납니다(자막 칩 → 위치 칩)
 *   ③      mt-7(28) gap-2.5(10) 단계 목록 — 아이콘 22 + 라벨 15·semibold
 *            끝난 것 circle-check #10b981 / 하는 중 loader-circle #2563eb **회전** /
 *            남은 것 circle #cbd5e1 + 라벨 slate
 *   ④      mt-auto pb-8 — 편집 중에는 회색(track) "편집 중..." 비활성,
 *          끝나면 브랜드색 "완성된 영상 내보내기"
 *
 * ⚠️ "어디에 올리실 거예요?"(플랫폼 선택)를 **지웠습니다** (2026-08-26 확인).
 *    시안은 촬영이 끝나면 곧바로 편집이 돌아갑니다. 올릴 곳은 나중에
 *    내보내기(15.1 OutputsScreen)에서 고르므로 여기서 또 물을 이유가 없습니다.
 *    14.1 이 요구하는 target_platform 은 인스타그램으로 보냅니다 — 자막을 화면
 *    가운데로 올리는 쪽이라 유튜브에 올려도 UI 에 가리지 않습니다(그 반대는 가립니다).
 *    EditResultScreen 의 재렌더도 원래 이 값으로 넘어옵니다.
 *
 * ⚠️ 다 되면 **자동으로 넘어가지 않습니다**. 시안대로 버튼을 눌러야 넘어갑니다.
 *    편집이 끝나는 순간 화면이 혼자 바뀌면 사장님은 뭘 눌렀는지도 모른 채
 *    다음 화면에 가 있습니다.
 *
 * 실패(14.2 FAILED · 시간 초과 · 400 TASKS_INCOMPLETE)는 시안 EditingFailed 자리에
 * 기존 안내를 그대로 씁니다 — 촬영본은 남아 있고 다시 시도할 수 있다는 사실이 핵심입니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, CircleCheck, MapPin } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { Banner, Spinner } from '../../../ui/Feedback';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useEditResult, useStartEdit } from '../../../api/queries/edit';
import { useStore } from '../../../api/queries/store';
import { useAppState } from '../../../lib/appState';
import { ApiError } from '../../../api/http';
import type { IncompleteTask, TargetPlatform } from '../../../api/schema/types';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'Render'>;

/** 시안 STEPS 원문. 자막이 없는 안무 촬영도 자막 단계는 그대로 지나갑니다. */
const STEPS = ['컷 편집', '자막 입히기', '위치 태그 · 매장 브랜딩 삽입', '최종 렌더링'];

/**
 * 자막을 화면 가운데로 올리는 규격. 어느 쪽에 올려도 UI 에 안 가립니다.
 * 사장님께 묻지 않고 우리가 정하는 값이라 이유를 남겨 둡니다.
 */
const RENDER_PLATFORM: TargetPlatform = 'INSTAGRAM';

/** 렌더가 끝나지 않을 때를 대비한 상한 */
const TIMEOUT_MS = 180000;

export default function RenderScreen({ navigation, route }: Props) {
  const { projectId, platform } = route.params;
  const storeId = useAppState((s) => s.storeId);
  const { data: store } = useStore(storeId ?? undefined);

  const startEdit = useStartEdit(projectId);
  const [timedOut, setTimedOut] = useState(false);
  /** 진행률 조회는 편집을 건 뒤에만 합니다 — 걸기 전에는 서버에 결과가 없습니다. */
  const [started, setStarted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: result } = useEditResult(projectId, started);

  // 화면에 들어오는 순간 편집이 돌아갑니다. 물어볼 것이 없습니다.
  useEffect(() => {
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function begin() {
    setTimedOut(false);
    setStarted(true);
    startEdit.mutate(platform ?? RENDER_PLATFORM);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
  }

  /**
   * 명세 14.1: 촬영본이 빈 태스크가 있으면 400 TASKS_INCOMPLETE.
   * 어떤 장면인지 서버가 알려주므로 그대로 보여주고 촬영 목록으로 안내합니다.
   */
  const err = startEdit.error;
  const incomplete =
    err instanceof ApiError && err.code === 'TASKS_INCOMPLETE'
      ? ((err.detail?.incompleteTasks as IncompleteTask[] | undefined) ?? [])
      : null;

  const failed = result?.renderStatus === 'FAILED' || startEdit.isError || timedOut;
  const done = result?.renderStatus === 'COMPLETED';
  const percent = (result?.progressPercent ?? 0) / 100;
  /** 지금 돌고 있는 단계. 다 끝나면 목록 전체가 체크로 바뀝니다. */
  const stepIndex = done ? STEPS.length : Math.min(STEPS.length - 1, Math.floor(percent * STEPS.length));

  // ── 실패 ─────────────────────────────────────────────
  if (failed) {
    return (
      <Screen
        footer={
          <BottomAction>
            {incomplete ? (
              <Button
                label="남은 장면 찍으러 가기"
                onPress={() => navigation.replace('TaskBoard', { projectId })}
              />
            ) : (
              <>
                <Button label="다시 시도" onPress={begin} />
                <Button
                  label="촬영 목록으로"
                  variant="quiet"
                  size="small"
                  onPress={() => navigation.replace('TaskBoard', { projectId })}
                />
              </>
            )}
          </BottomAction>
        }
      >
        <View style={styles.head}>
          <Text style={text.heading}>AI 자동 편집</Text>
          <Text style={styles.sub}>편집을 멈췄습니다.</Text>
        </View>
        {incomplete ? (
          <Banner
            tone="warn"
            title={`아직 안 찍은 장면이 ${incomplete.length}개 있습니다`}
            description={
              incomplete.length > 0
                ? `${incomplete.map((t) => t.taskTitle).join(', ')}을(를) 찍으면 영상을 만들 수 있습니다.`
                : '촬영 목록에서 남은 장면을 확인해 주세요.'
            }
          />
        ) : (
          <Banner
            tone="danger"
            title={timedOut ? '시간이 너무 오래 걸립니다' : '영상을 만들지 못했습니다'}
            description="촬영본은 그대로 있습니다. 다시 시도하거나 잠시 뒤에 다시 오세요."
          />
        )}
      </Screen>
    );
  }

  // ── 편집 진행 ────────────────────────────────────────
  return (
    <Screen scroll={false} padded={false} contentStyle={{ paddingTop: 0, gap: 0 }}>
      <View style={styles.body}>
        {/* ① */}
        <View style={styles.head}>
          <Text style={text.heading}>AI 자동 편집</Text>
          <Text style={styles.sub}>
            {done ? '숏폼이 완성됐어요.' : '촬영본을 숏폼으로 만드는 중이에요.'}
          </Text>
        </View>

        {/* ② 미리보기 — 아직 완성본이 없으므로 자리만 잡습니다. */}
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>촬영된 영상</Text>
          {/*
            단계가 넣는 것을 상자 위에 얹어 보여줍니다. 완성본이 아니라 **예시**입니다 —
            실제 자막·위치 태그는 서버가 만든 결과물에 들어갑니다.
          */}
          {stepIndex >= 2 && (
            <View style={styles.captionChip}>
              <Text style={styles.captionText}>이 한 그릇, 30년입니다</Text>
            </View>
          )}
          {stepIndex >= 3 && (
            <View style={styles.placeChip}>
              <MapPin size={12} strokeWidth={2} color={color.paper} />
              <Text style={styles.placeText} numberOfLines={1}>
                {store?.name ?? '우리 가게'}
              </Text>
            </View>
          )}
        </View>

        {/* ③ 단계 */}
        <View style={styles.steps}>
          {STEPS.map((s, i) => {
            const state = i < stepIndex ? 'done' : i === stepIndex ? 'loading' : 'todo';
            return (
              <View key={s} style={styles.stepRow}>
                {state === 'done' ? (
                  <CircleCheck size={22} strokeWidth={2} color={color.done[500]} />
                ) : state === 'loading' ? (
                  <Spinner size={22} />
                ) : (
                  <Circle size={22} strokeWidth={2} color={color.ink[300]} />
                )}
                <Text style={[styles.stepLabel, state === 'todo' && { color: color.ink[500] }]}>
                  {s}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ④ 편집이 끝나야 넘어갑니다. */}
        <View style={styles.cta}>
          <Button
            label={done ? '완성된 영상 내보내기' : '편집 중...'}
            disabled={!done}
            onPress={() => navigation.replace('EditResult', { projectId })}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 시안: px-6 pt-6
  body: { flex: 1, paddingHorizontal: space[6], paddingTop: space[6] },

  head: { gap: space[1] }, // 시안 mt-1
  sub: { ...text.bodySmall, color: color.ink[500] },

  // 시안: mx-auto mt-6 · w-[190px] · aspect-[9/16] · rounded-2xl · bg-hairline
  preview: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space[6],
    width: 190,
    aspectRatio: 9 / 16,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.ink[200],
    overflow: 'hidden',
  },
  previewLabel: { ...text.caption, color: color.ink[500] },

  // 시안: bottom-14 가운데 · ink/70 · 12 bold white
  captionChip: {
    position: 'absolute',
    bottom: 56,
    paddingHorizontal: space[2],
    paddingVertical: 4,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(15,23,42,0.7)',
  },
  captionText: {
    ...text.label,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
    color: color.paper,
  },
  // 시안: bottom-3 left-3 · bg-brand · 11 semibold white
  placeChip: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    maxWidth: 190 - 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.brand[600],
  },
  placeText: {
    ...text.micro,
    fontFamily: theme.text.chipLabel.fontFamily,
    fontWeight: theme.text.chipLabel.fontWeight,
    flexShrink: 1,
    color: color.paper,
  },

  // 시안: mt-7(28) gap-2.5(10)
  steps: { marginTop: 28, gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  stepLabel: { ...theme.text.bodyStrong, flexShrink: 1 },

  // 시안: mt-auto pb-8(32)
  cta: { marginTop: 'auto', paddingBottom: space[7] },
});
