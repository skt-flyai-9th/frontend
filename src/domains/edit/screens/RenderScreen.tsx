/**
 * RenderScreen — **시안 V4 `editing` 대조 이식** (2026-08-26). 명세 14.1, 14.2.
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
 * ⚠️ 하단 안전영역을 **두 번 먹던 것을 고쳤습니다** (2026-08-26, 비교 이미지 측정).
 *    시안 대비 버튼만 34 만큼 위에 떠 있었습니다. Screen 은 footer 가 없으면
 *    edges 가 ['top','bottom'] 이라 SafeAreaView 가 하단 inset(기기 34)을 먹는데,
 *    그 안에서 pb-8(32)을 또 줘서 시안 32 자리에 66 이 들어가 있었습니다.
 *    이 화면은 버튼이 footer 가 아니라 본문 흐름(mt-auto)에 있어 BottomAction 을
 *    쓸 수 없으므로, edges 를 ['top'] 으로 내리고 여백을 여기서 직접 잡습니다.
 *    (측정: 시안 버튼 위 여백 258px @2x, 앱 202px → 차이 28 design px + 버튼 위치 6px)
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Circle, CircleCheck, MapPin, TriangleAlert } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { Spinner, StateBlock } from '../../../ui/Feedback';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useEditResult, useStartEdit } from '../../../api/queries/edit';
import { useStore } from '../../../api/queries/store';
import { useAppState } from '../../../lib/appState';
import { ApiError } from '../../../api/http';
import type { IncompleteTask, TargetPlatform } from '../../../api/schema/types';
import type { CreateStackParamList, RootStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'Render'>;

/** 시안 STEPS 원문. 자막이 없는 안무 촬영도 자막 단계는 그대로 지나갑니다. */
const STEPS = ['컷 편집', '자막 입히기', '위치 태그 · 매장 브랜딩 삽입', '최종 렌더링'];

/**
 * 자막을 화면 가운데로 올리는 규격. 어느 쪽에 올려도 UI 에 안 가립니다.
 * 사장님께 묻지 않고 우리가 정하는 값이라 이유를 남겨 둡니다.
 */
const RENDER_PLATFORM: TargetPlatform = 'INSTAGRAM';

/**
 * 렌더가 끝나지 않을 때를 대비한 상한 — **15분**입니다 (2026-08-26, 사장님 지시).
 *
 * 진행률(14.2)은 1초마다 조회하고, 상태가 PENDING·PROCESSING 인 동안만 돕니다
 * (`api/queries/edit.ts`). 이 상한은 그 조회와 별개로 **화면에 들어온 순간부터
 * 벽시계**를 재는 것입니다 — "이만큼 응답이 없으면" 이 아니라, 진행률이 잘
 * 올라오고 있어도 시간이 다 되면 실패 화면으로 넘깁니다.
 *
 * 처음에는 3분이었습니다. 실제 렌더가 얼마나 걸리는지 실측치가 없이 잡은 값이라,
 * 서버가 그보다 오래 걸리면 **멀쩡히 만들어지고 있는 영상을 "실패" 로** 보여주게
 * 됩니다. AI 렌더는 몇 분씩 걸리는 게 보통이라 넉넉하게 15분으로 올렸습니다.
 *
 * ⚠️ 이 값은 "여기서 더 기다려도 소용없다" 는 선일 뿐, 성능 목표가 아닙니다.
 *    실서버 렌더 시간이 측정되면 그 값에 맞춰 다시 조이세요
 *    (지금은 7.1 기획 생성이 500 이라 촬영→편집까지 못 가서 측정이 막혀 있습니다).
 */
const TIMEOUT_MS = 900000;

/**
 * 미리보기 칩의 등장 효과 — 시안 `rise-in` / `pop-in` 을 그대로 옮겼습니다.
 *   rise  @keyframes rise{from{opacity:0;translateY(14px)}}  .3s cubic-bezier(.16,1,.3,1)
 *   pop   @keyframes pop {from{opacity:0;scale(.6)}}         .3s cubic-bezier(.34,1.4,.64,1)
 *
 * 단계가 지나갈 때 뭐가 더해졌는지 눈에 걸려야 진행이 읽힙니다. 그냥 나타나면
 * 사장님은 방금 무엇이 바뀌었는지 못 봅니다.
 */
function ChipIn({ mode, style, children }: { mode: 'rise' | 'pop'; style: object; children: React.ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 300,
      easing:
        mode === 'rise' ? Easing.bezier(0.16, 1, 0.3, 1) : Easing.bezier(0.34, 1.4, 0.64, 1),
      useNativeDriver: true,
    }).start();
  }, [t, mode]);

  const transform =
    mode === 'rise'
      ? [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }]
      : [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }];

  return <Animated.View style={[style, { opacity: t, transform }]}>{children}</Animated.View>;
}

export default function RenderScreen({ navigation, route }: Props) {
  const { projectId, platform } = route.params;
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const storeId = useAppState((s) => s.storeId);
  const { data: store } = useStore(storeId ?? undefined);

  const startEdit = useStartEdit(projectId);
  const [timedOut, setTimedOut] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 🔴 2026-08-26 — 화면에 들어올 때마다 편집을 **다시 걸던 것**
   *
   * 예전에는 마운트되자마자 무조건 14.1 을 불렀습니다. 사장님이 편집 화면을 벗어났다
   * 돌아오면 그때마다 렌더가 새로 걸립니다. 앞으로 편집이 10분씩 걸리고 "앱을 꺼도
   * 된다" 가 되면, 돌아오는 일이 잦아져 같은 프로젝트를 몇 번씩 렌더하게 됩니다.
   *
   * 그래서 **먼저 물어보고 없을 때만 겁니다.**
   *   14.2 에 결과가 있고 PENDING·PROCESSING·COMPLETED  → 그대로 붙습니다(다시 안 걸어요)
   *   결과가 없거나(404) FAILED                          → 그때 새로 겁니다
   *
   * ⚠️ 서버가 "이미 도는 중인데 또 부르면" 어떻게 하는지는 아직 답을 못 받았습니다
   *    (BE_전달사항 §2-4). 답이 오기 전까지는 프론트에서 안 부르는 쪽으로 막아 둡니다.
   */
  const editResult = useEditResult(projectId);
  const result = editResult.data;
  /** 이 화면에서 우리가 편집을 걸었는지 (상한 타이머를 걸 시점 판단용) */
  const [started, setStarted] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    // 아직 물어보는 중이면 기다립니다 — 모르는 채로 걸면 중복이 됩니다.
    if (editResult.isLoading) return;

    const s = result?.renderStatus;
    if (s === 'PENDING' || s === 'PROCESSING' || s === 'COMPLETED') {
      // 이미 돌고 있거나 끝났습니다. 붙기만 합니다.
      decided.current = true;
      setStarted(true);
      armTimeout();
      return;
    }
    decided.current = true;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editResult.isLoading, result?.renderStatus]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  /**
   * 끝났으면 상한 타이머를 끕니다 (2026-08-26).
   *
   * ⚠️ 이게 없으면 **완성된 화면이 상한 시각에 실패 화면으로 뒤집힙니다.**
   *    렌더가 40초에 끝나도 이 화면은 자동으로 넘어가지 않고 "숏폼이 완성됐어요" 로
   *    기다립니다. 사장님이 바로 안 누르고 상한(TIMEOUT_MS)이 지나면 타이머가 터져
   *    `timedOut` 이 켜지고, 아래 `failed` 가 참이 되어 실패 화면이 뜹니다.
   *    다 만들어 놓고 실패했다고 말하는 셈입니다.
   */
  const renderStatus = result?.renderStatus;
  useEffect(() => {
    if (renderStatus !== 'COMPLETED' && renderStatus !== 'FAILED') return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, [renderStatus]);

  /** 상한 타이머를 겁니다. 이미 걸려 있으면 다시 겁니다. */
  function armTimeout() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
  }

  function begin() {
    setTimedOut(false);
    setStarted(true);
    startEdit.mutate(platform ?? RENDER_PLATFORM);
    armTimeout();
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

  const done = result?.renderStatus === 'COMPLETED';
  // 이미 완성됐으면 상한에 걸려도 실패가 아닙니다 (위 타이머 정리와 짝입니다).
  const failed = result?.renderStatus === 'FAILED' || startEdit.isError || (timedOut && !done);
  const percent = (result?.progressPercent ?? 0) / 100;
  /** 지금 돌고 있는 단계. 다 끝나면 목록 전체가 체크로 바뀝니다. */
  const stepIndex = done ? STEPS.length : Math.min(STEPS.length - 1, Math.floor(percent * STEPS.length));

  // ── 실패 (시안 EditingFailed) ─────────────────────────
  /*
   * 시안: flex-1 justify-center · px-2 · pb-16(64) · StateBlock 한 덩어리 +
   *       그 아래 가운데 밑줄 링크.
   * 시안에 없는 "연결이 끊겼나요? 오류 화면 보기" 는 프로토타입 데모용이라 뺐습니다.
   */
  if (failed) {
    return (
      <Screen scroll={false} padded={false} edges={['top']} contentStyle={{ paddingTop: 0, gap: 0 }}>
        <View style={styles.failBody}>
          {incomplete ? (
            /*
             * 시안에는 없는 갈래입니다 — 서버가 실제로 주는 400 이라 남깁니다.
             * 망가진 게 아니라 아직 안 찍은 것이므로 heart(빨강) 대신 brand 를 씁니다.
             */
            <StateBlock
              icon={TriangleAlert}
              tone="brand"
              title={`아직 안 찍은 장면이 ${incomplete.length}개 있습니다`}
              body={
                incomplete.length > 0
                  ? `${incomplete.map((t) => t.taskTitle).join(', ')}을(를) 찍으면 영상을 만들 수 있습니다.`
                  : '촬영 목록에서 남은 장면을 확인해 주세요.'
              }
              primaryLabel="남은 컷 찍으러 가기"
              onPrimary={() => navigation.replace('Camera', { projectId })}
            />
          ) : (
            <StateBlock
              icon={TriangleAlert}
              tone="heart"
              title={timedOut ? '편집이 너무 오래 걸려요' : '편집을 끝내지 못했어요'}
              body="촬영본은 그대로 있으니 다시 시도해도 처음부터 찍지 않아도 돼요."
              primaryLabel="편집 다시 시도"
              onPrimary={begin}
              secondaryLabel="촬영부터 다시 하기"
              onSecondary={() => navigation.replace('Camera', { projectId })}
            />
          )}

          {/* 시안: mx-auto mt-6 py-2 · 13 medium slate · 밑줄 */}
          <Pressable
            accessibilityRole="button"
            onPress={() => rootNav.navigate('Main', { screen: 'HomeFeed' })}
            style={styles.laterLink}
          >
            <Text style={styles.laterText}>나중에 하기</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // ── 편집 진행 ────────────────────────────────────────
  return (
    <Screen scroll={false} padded={false} edges={['top']} contentStyle={{ paddingTop: 0, gap: 0 }}>
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
            <ChipIn mode="rise" style={styles.captionChip}>
              <Text style={styles.captionText}>이 한 그릇, 30년입니다</Text>
            </ChipIn>
          )}
          {stepIndex >= 3 && (
            <ChipIn mode="pop" style={styles.placeChip}>
              <MapPin size={12} strokeWidth={2} color={color.paper} />
              <Text style={styles.placeText} numberOfLines={1}>
                {store?.name ?? '우리 가게'}
              </Text>
            </ChipIn>
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
        <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, space[8]) }]}>
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
  steps: { marginTop: space[7], gap: 10 },
  /*
   * 시안 한 줄 높이는 24 입니다 — 아이콘 22 가 아니라 15px 글자의 줄높이가 잡습니다.
   * 비워 두면 우리 bodyStrong 줄높이대로 23 이 되어 줄마다 1 씩, 네 줄에서 3 이
   * 밀립니다 (비교 이미지 @2x 에서 단계 간격 시안 68 / 앱 66 으로 측정).
   */
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 24 },
  stepLabel: { ...theme.text.bodyStrong, flexShrink: 1 },

  /*
   * 시안: mt-auto pb-8(32).
   * pb 는 인라인에서 max(안전영역, 32) 로 잡습니다 — Screen 이 edges=['top'] 이라
   * 하단 inset 이 여기 말고는 갈 데가 없습니다. 기기에서는 34(제스처 바)라
   * 시안보다 2 큽니다. 32 로 고정하면 홈 인디케이터에 버튼이 깔립니다.
   */
  cta: { marginTop: 'auto' },

  // 시안 EditingFailed: justify-center · px-2(8) · pb-16(64)
  failBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[2],
    paddingBottom: space[16],
  },
  // 시안: mx-auto mt-6 py-2
  laterLink: { alignSelf: 'center', marginTop: space[6], paddingVertical: space[2] },
  laterText: {
    ...text.caption,
    color: color.ink[500],
    textDecorationLine: 'underline',
  },
});
