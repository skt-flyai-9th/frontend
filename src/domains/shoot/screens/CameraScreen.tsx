/**
 * S09.1.1 앱 카메라 + S09.2.1 구도 오버레이 · 명세 9.2
 *
 * 기능명세 규칙을 구조로 지킵니다.
 *   - 세로 촬영 기본
 *   - 전화 수신·백그라운드 전환 시 안전하게 중단  → AppState
 *   - 가이드는 최종 촬영 파일에 포함되지 않는다   → 오버레이를 CameraView 형제 노드로
 *   - 권한을 한 번에 묶어 요청하지 않는다          → 카메라 먼저, 마이크는 필요할 때만
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import {
  CAMERA_IS_PLACEHOLDER,
  CameraPreview,
  type CameraPreviewHandle,
} from '../../../ui/CameraPreview';
import { Check, ChevronLeft, SwitchCamera } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { PipGuide } from '../../../ui/PipGuide';
import { Shutter } from '../../../ui/Shutter';
import { pressTap } from '../../../ui/press';
import theme, { color, radius, sizing, space, text } from '../../../design/theme';
import { JobProgress } from '../../../ui/Feedback';
import {
  useTaskGuide,
  useTasks,
  useUpdateTask,
  useUploadFootage,
} from '../../../api/queries/shoot';
import { useProject, useVideoFormat } from '../../../api/queries/project';
import { useAppState } from '../../../lib/appState';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'Camera'>;

const COUNTDOWN_FROM = 3;

export default function CameraScreen({ navigation, route }: Props) {
  const { projectId, taskId: firstTaskId } = route.params;
  /**
   * 시안 V4: 촬영은 **한 화면에서 컷을 전부** 끝냅니다.
   * 컷 목록(옛 TaskBoard)은 아래 칩 줄로, 검수(옛 TakeReview)는 바텀시트로
   * 이 화면 안에 들어왔습니다. 다 찍으면 곧바로 편집으로 넘어갑니다.
   */
  const [pickedTaskId, setPickedTaskId] = useState(firstTaskId);
  /** 방금 찍은 것. 값이 있으면 검수 시트가 뜹니다. */
  const [take, setTake] = useState<{ uri: string; durationSec: number } | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const cameraRef = useRef<CameraPreviewHandle>(null);

  const { data: board } = useTasks(projectId);

  const tasks = board?.tasks ?? [];
  const shot = (t: { taskStatus?: string }) =>
    t.taskStatus === 'DONE' || t.taskStatus === 'RETAKE_NEEDED';
  /** 고른 컷이 없으면 아직 안 찍은 첫 컷부터 (시안 V4: 카메라가 목록을 갖습니다) */
  const taskId = pickedTaskId ?? tasks.find((t) => !shot(t))?.id ?? tasks[0]?.id;
  const setTaskId = setPickedTaskId;

  const { data: guide } = useTaskGuide(taskId);

  /*
   * 좌상단 참고 영상(시안 PipGuide).
   * 컷마다 참고 영상이 붙는 건 안무형(9.1 reference_video)뿐이라, 없으면
   * 이 프로젝트가 고른 포맷의 참고 영상을 씁니다 — 촬영 준비 화면에서 본
   * 그 영상입니다. 둘 다 없으면 창을 띄우지 않습니다(빈 창을 만들지 않습니다).
   */
  const { data: project } = useProject(projectId);
  const { data: format } = useVideoFormat(project?.videoFormatId ?? undefined);
  const pipUrl = guide?.referenceVideo?.referenceUrl ?? format?.referenceUrl;

  /*
   * 안무 컷(9.1 DANCE)은 참고 영상을 보면서 찍어야 해서 전용 화면이 따로 있습니다.
   * 촬영 목록 화면을 없애면서 그리로 가는 길이 끊겨 있었습니다 — 여기서 잇습니다.
   */
  const goingToDance = guide?.guideType === 'DANCE';
  useEffect(() => {
    if (!taskId || !goingToDance) return;
    navigation.replace('DanceCamera', { projectId, taskId });
  }, [taskId, goingToDance, navigation, projectId]);

  const guideVisible = useAppState((s) => s.guideVisible);
  const guideOpacity = useAppState((s) => s.guideOpacity);
  const task = tasks.find((t) => t.id === taskId);

  const [camPermission, requestCam] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  /** 대사가 없는 B-roll 은 마이크 권한을 요구하지 않습니다. */
  const needsMic = task?.taskType === '영상촬영' || task?.taskType === '음성녹음';

  // 백그라운드 전환 / 전화 수신 시 안전 중단
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && recording) {
        cameraRef.current?.stopRecording();
        setRecording(false);
        setCountdown(null);
      }
    });
    return () => sub.remove();
  }, [recording]);

  useEffect(() => {
    if (!recording) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const beginRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    setRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 30 });
      setRecording(false);
      // 지어낸 5초 대신 실제로 흐른 시간을 씁니다(1초 미만도 그대로).
      if (video?.uri) setTake({ uri: video.uri, durationSec: Math.max(1, elapsed) });
    } catch (e) {
      setRecording(false);
      console.warn('[camera] 녹화 실패', e);
    }
  }, [elapsed]);

  const upload = useUploadFootage(projectId);
  const markTask = useUpdateTask(projectId);

  /** 찍은 컷을 올리고, 남은 컷이 있으면 그리로, 없으면 편집으로 갑니다. */
  const useTake = () => {
    if (!take) return;
    setUploadPct(0);
    // 명세 8.2: 신호가 약해 오래 걸려도 "아직 안 함" 으로 보이지 않게 먼저 알립니다.
    markTask.mutate({ taskId, taskStatus: 'IN_PROGRESS' });
    upload.mutate(
      { taskId, uri: take.uri, durationSec: take.durationSec, onProgress: setUploadPct },
      {
        onSuccess: () => {
          setTake(null);
          const rest = tasks.filter((t) => t.id !== taskId && !shot(t));
          if (rest.length > 0) setTaskId(rest[0].id);
          else navigation.replace('Render', { projectId });
        },
      }
    );
  };

  // 화면을 벗어나면 업로드를 정리합니다. 안 하면 백그라운드에서 계속 돕니다.
  useEffect(() => () => upload.cancel(), []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      void beginRecording();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, beginRecording]);

  // 안무 컷으로 넘어가는 사이에 이 화면이 한 프레임 스쳐 보이지 않게 검은 판만 둡니다.
  if (goingToDance) return <View style={styles.black} />;

  // ── 권한 게이트 ──────────────────────────────────────
  // 웹 자리표시자에서는 권한을 물을 대상이 없어 건너뜁니다(디자인 대조용).
  if (!CAMERA_IS_PLACEHOLDER && !camPermission) return <View style={styles.black} />;

  if (!CAMERA_IS_PLACEHOLDER && !camPermission?.granted) {
    const blocked = !camPermission?.canAskAgain;
    return (
      <SafeAreaView style={styles.permWrap}>
        <View style={styles.permBody}>
          <Text style={text.title}>카메라를 켜야 찍을 수 있습니다</Text>
          <Text style={text.body}>
            {blocked
              ? '전에 거부하셔서 앱에서는 켤 수 없습니다. 설정에서 카메라를 켜 주세요.'
              : '영상을 찍기 위해서만 씁니다. 사진첩 전체를 보지 않습니다.'}
          </Text>
        </View>
        <View style={{ gap: space[2] }}>
          <Button
            label={blocked ? '설정 열기' : '카메라 켜기'}
            onPress={blocked ? () => Linking.openSettings() : requestCam}
          />
          <Button label="나중에 하기" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  if (!CAMERA_IS_PLACEHOLDER && needsMic && micPermission && !micPermission.granted) {
    return (
      <SafeAreaView style={styles.permWrap}>
        <View style={styles.permBody}>
          <Text style={text.title}>이 장면은 소리도 담습니다</Text>
          <Text style={text.body}>말소리를 쓰지 않는 장면이라면 소리 없이 찍어도 됩니다.</Text>
        </View>
        <View style={{ gap: space[2] }}>
          <Button label="마이크 켜기" onPress={requestMic} />
          <Button label="소리 없이 찍기" variant="secondary" onPress={() => setReady(true)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.black}>
      {/* 프리뷰. 오버레이는 이 컴포넌트 바깥 형제 노드입니다. */}
      <CameraPreview
        ref={cameraRef}
        facing={facing}
        mute={!needsMic}
        onReady={() => setReady(true)}
      />

      {/*
        시안 카메라 위에 있는 건 참고 영상 작은 창(PiP) 하나입니다.
        구도 오버레이(9.1 overlay 지시문)는 시안에 없어 걷어냈습니다 —
        지시문은 촬영 준비 화면의 컷 목록이 대신 말해 줍니다.
      */}
      <PipGuide url={pipUrl} />

      <SafeAreaView style={styles.topLayer} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBar}>
          {/* 시안 카메라 상단에는 뒤로가기 하나뿐입니다. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="촬영 그만두기"
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.chromeButton}
          >
            <ChevronLeft size={24} strokeWidth={2} color={color.paper} />
          </Pressable>
        </View>
      </SafeAreaView>

      {countdown !== null && (
        <View style={styles.countdownLayer} pointerEvents="none">
          <Text style={styles.countdownText}>{countdown === 0 ? '시작' : countdown}</Text>
        </View>
      )}

      {recording && (
        <View style={styles.recPill} pointerEvents="none">
          <View style={styles.recDot} />
          <Text style={styles.recText}>{elapsed}초</Text>
        </View>
      )}

      {/* 시안: 셔터 위 bottom-[190] 자리. 찍은 컷은 초록 체크. */}
        <View style={styles.chipRow}>
          {tasks.map((t) => {
            const done = shot(t);
            const active = t.id === taskId;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${t.taskTitle}${done ? ' (찍음)' : ''}`}
                disabled={recording || !!take}
                onPress={() => setTaskId(t.id)}
                style={[styles.chip, done && styles.chipDone, !done && active && styles.chipActive]}
              >
                {done && <Check size={13} strokeWidth={3} color={color.paper} />}
                <Text
                  style={[
                    styles.chipText,
                    done && { color: color.paper },
                    !done && active && { color: color.ink[900] },
                  ]}
                  numberOfLines={1}
                >
                  {t.taskTitle}
                </Text>
              </Pressable>
            );
          })}
        </View>

      <SafeAreaView style={styles.bottomLayer} edges={['bottom']} pointerEvents="box-none">
        {/*
          시안: 셔터 영역 h150 가운데 셔터, 오른쪽 26 에 전환 버튼 52.
          가이드 밝기·불빛 버튼은 시안에 없어 걷어냈습니다.
        */}
        <View style={styles.controls}>
          <Shutter
            recording={recording}
            disabled={!ready || countdown !== null}
            onPress={
              recording
                ? () => {
                    cameraRef.current?.stopRecording();
                    setRecording(false);
                  }
                : () => setCountdown(COUNTDOWN_FROM)
            }
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="앞뒤 카메라 바꾸기"
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            style={({ pressed }) => [styles.flipBtn, pressTap(pressed, 'icon')]}
            disabled={recording}
          >
            <SwitchCamera size={23} strokeWidth={2} color={color.paper} />
          </Pressable>
        </View>

      </SafeAreaView>

      {/*
        시안 V4 ReviewSheet — 찍자마자 이 자리에서 결정합니다.
        업로드는 실패하기 쉬운 지점이라(가게 안은 신호가 약합니다) 진행률과
        재시도를 그대로 보여 줍니다. 촬영본은 실패해도 사라지지 않습니다.
      */}
      {take && (
        <View style={styles.sheetScrim}>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <Text style={styles.sheetTitle}>{task?.taskTitle} 촬영 완료</Text>
            <Text style={styles.sheetSub}>
              {take.durationSec < 3
                ? '3초보다 짧습니다. 다시 찍는 편이 좋습니다.'
                : '찍은 컷을 확인하고 결정하세요'}
            </Text>

            {upload.isPending ? (
              <View style={{ gap: space[2] }}>
                <JobProgress label={`올리는 중 ${Math.round(uploadPct * 100)}%`} progress={uploadPct} />
                <Button label="취소" variant="quiet" size="small" onPress={() => upload.cancel()} />
              </View>
            ) : (
              <View style={styles.sheetBtns}>
                <Button
                  label="다시 찍기"
                  variant="secondary"
                  onPress={() => {
                    setTake(null);
                    setUploadPct(0);
                  }}
                />
                <Button label={upload.isError ? '다시 올리기' : '사용하기'} onPress={useTake} />
              </View>
            )}

            {upload.isError && (
              <Text style={styles.sheetError}>
                올리지 못했습니다. 촬영본은 그대로 있으니 다시 시도해 주세요.
              </Text>
            )}
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const CHROME = color.overlay.cameraChrome;

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: color.mediaBlack },

  // 시안: 셔터 위 컷 칩 줄 (rounded-full · 12 semibold · 완료 verified)
  // 시안: 셔터 영역 오른쪽 26 · 52 원 · ink 45%
  flipBtn: {
    position: 'absolute',
    right: 26,
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CHROME,
  },
  // 시안: absolute bottom-[190] · 가운데 정렬
  chipRow: {
    position: 'absolute',
    bottom: 190,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingBottom: space[3],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 150,
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: CHROME,
  },
  chipActive: { backgroundColor: color.paper },
  chipDone: { backgroundColor: color.done[500] },
  chipText: { ...text.label, color: 'rgba(255,255,255,0.8)', flexShrink: 1 },

  // 시안 ReviewSheet
  sheetScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.overlay.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    gap: space[3],
    paddingHorizontal: space[5],
    paddingTop: space[5],
    paddingBottom: space[5],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.canvas,
  },
  sheetGrip: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.pill, backgroundColor: color.ink[200] },
  sheetTitle: { ...text.heading },
  sheetSub: { ...text.bodySmall, color: color.ink[500] },
  sheetBtns: { flexDirection: 'row', gap: space[3] },
  sheetError: { ...text.caption, color: color.danger[500] },
  permWrap: { flex: 1, backgroundColor: color.paper, padding: space[5], justifyContent: 'space-between' },
  permBody: { flex: 1, justifyContent: 'center', gap: space[3] },

  topLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingTop: space[2],
    gap: space[3],
  },
  // 시안: 배경 없는 36 버튼. 카메라 위라 아이콘만 흰색으로 둡니다.
  chromeButton: {
    width: 36,
    height: 36,
    // 시안에 음수 여백 없음 — 어두운 오버레이 헤더입니다 (FaqScreen 헤더 규칙 주석 참고)
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskLabel: { flex: 1, alignItems: 'center', gap: 2 },
  taskOrder: { ...text.micro, color: 'rgba(255,255,255,0.78)' },
  taskTitle: { ...text.bodyStrong, color: color.paper },
  stripWrap: { paddingHorizontal: space[5], paddingTop: space[3] },

  countdownLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: theme.font.size.countdown,
    lineHeight: theme.font.lineHeight.countdown,
    color: color.paper,
    fontFamily: theme.text.display.fontFamily,
  },

  recPill: {
    position: 'absolute',
    top: '16%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: 'rgba(217,62,18,0.9)',
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
  },
  recDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: color.paper },
  recText: { ...text.bodySmall, color: color.paper },

  // 시안: 셔터 밴드는 h150 (칩 줄은 그 위 bottom-[190] 에 따로 있습니다)
  bottomLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: space[5],
  },
  sideButton: { width: 64, alignItems: 'center', gap: 2 },
  sideLabel: { ...text.micro, color: 'rgba(255,255,255,0.8)' },


});
