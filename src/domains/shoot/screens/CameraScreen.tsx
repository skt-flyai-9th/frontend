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
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { X, Check, Eye, EyeOff, SunMedium, RotateCcw } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { CameraGuideOverlay, type GuideShape } from '../../../ui/CameraGuideOverlay';
import { SpineStrip } from '../../../ui/ProgressSpine';
import { Shutter } from '../../../ui/Shutter';
import theme, { color, radius, sizing, space, text } from '../../../design/theme';
import { JobProgress } from '../../../ui/Feedback';
import {
  useTaskGuide,
  useTasks,
  useUpdateTask,
  useUploadFootage,
} from '../../../api/queries/shoot';
import { useAppState } from '../../../lib/appState';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'Camera'>;

const COUNTDOWN_FROM = 3;

/** 명세 broll_shot.shot_type 을 오버레이 모양으로 옮깁니다. */
function shapeFor(shotType?: string): GuideShape {
  if (!shotType) return 'wideSpace';
  if (shotType.includes('클로즈')) return 'productLowerThird';
  if (shotType.includes('풀')) return 'fullBody';
  if (shotType.includes('미디엄') || shotType.includes('상반신')) return 'upperBody';
  return 'wideSpace';
}

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
  const cameraRef = useRef<CameraView>(null);

  const { data: board } = useTasks(projectId);

  const tasks = board?.tasks ?? [];
  const shot = (t: { taskStatus?: string }) =>
    t.taskStatus === 'DONE' || t.taskStatus === 'RETAKE_NEEDED';
  /** 고른 컷이 없으면 아직 안 찍은 첫 컷부터 (시안 V4: 카메라가 목록을 갖습니다) */
  const taskId = pickedTaskId ?? tasks.find((t) => !shot(t))?.id ?? tasks[0]?.id;
  const setTaskId = setPickedTaskId;

  const { data: guide } = useTaskGuide(taskId);

  const guideVisible = useAppState((s) => s.guideVisible);
  const guideOpacity = useAppState((s) => s.guideOpacity);
  const toggleGuide = useAppState((s) => s.toggleGuide);
  const setGuideOpacity = useAppState((s) => s.setGuideOpacity);
  const task = tasks.find((t) => t.id === taskId);
  const orderIndex = task ? tasks.findIndex((t) => t.id === taskId) + 1 : 1;

  const [camPermission, requestCam] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
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
      if (video?.uri) setTake({ uri: video.uri, durationSec: elapsed || 5 });
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

  // ── 권한 게이트 ──────────────────────────────────────
  if (!camPermission) return <View style={styles.black} />;

  if (!camPermission.granted) {
    const blocked = !camPermission.canAskAgain;
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

  if (needsMic && micPermission && !micPermission.granted) {
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

  const instruction = guide?.overlay?.instructions?.[0] ?? task?.taskTitle ?? '';

  return (
    <View style={styles.black}>
      {/* 프리뷰. 오버레이는 이 컴포넌트 바깥 형제 노드입니다. */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
        enableTorch={torch}
        videoQuality="1080p"
        mute={!needsMic}
        onCameraReady={() => setReady(true)}
      />

      {/* 촬영 파일에 합성되지 않습니다 */}
      <CameraGuideOverlay
        spec={{
          shape: shapeFor(guide?.brollShot?.shotType),
          instruction,
          faceOut: guide?.overlay?.instructions?.some((i) => i.includes('얼굴')),
        }}
        opacity={guideOpacity}
        visible={guideVisible && countdown === null}
      />

      <SafeAreaView style={styles.topLayer} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="촬영 그만두기"
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.chromeButton}
          >
            <X size={22} strokeWidth={2} color={color.paper} />
          </Pressable>

          <View style={styles.taskLabel}>
            <Text style={styles.taskOrder}>
              {orderIndex}번째 · {tasks.length}개 중
            </Text>
            <Text style={styles.taskTitle}>{task?.taskTitle}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={guideVisible ? '가이드 숨기기' : '가이드 보이기'}
            onPress={toggleGuide}
            hitSlop={12}
            style={styles.chromeButton}
          >
            {guideVisible ? (
              <Eye size={22} strokeWidth={2} color={color.paper} />
            ) : (
              <EyeOff size={22} strokeWidth={2} color={color.paper} />
            )}
          </Pressable>
        </View>

        <View style={styles.stripWrap}>
          <SpineStrip total={tasks.length} current={orderIndex} />
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

      <SafeAreaView style={styles.bottomLayer} edges={['bottom']} pointerEvents="box-none">
        {/* 시안 V4: 컷 목록이 화면 안에 있습니다. 찍은 컷은 초록 체크. */}
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

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="가이드 진하기 조절"
            onPress={() => setGuideOpacity(guideOpacity > 0.5 ? 0.35 : 0.9)}
            style={styles.sideButton}
            disabled={recording}
          >
            <SunMedium size={24} strokeWidth={2} color={color.paper} />
            <Text style={styles.sideLabel}>가이드</Text>
          </Pressable>

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
            style={styles.sideButton}
            disabled={recording}
          >
            <RotateCcw size={24} strokeWidth={2} color={color.paper} />
            <Text style={styles.sideLabel}>전환</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setTorch((t) => !t)} style={styles.torchRow} disabled={recording}>
          <Text style={styles.torchText}>{torch ? '불빛 끄기' : '어두우면 불빛 켜기'}</Text>
        </Pressable>
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
  chipRow: {
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
  chromeButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: CHROME,
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

  bottomLayer: { position: 'absolute', bottom: 0, left: 0, right: 0, gap: space[4], paddingBottom: space[3] },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: space[5],
  },
  sideButton: { width: 64, alignItems: 'center', gap: 2 },
  sideLabel: { ...text.micro, color: 'rgba(255,255,255,0.8)' },


  torchRow: { alignSelf: 'center', paddingVertical: space[2], paddingHorizontal: space[4] },
  torchText: { ...text.bodySmall, color: 'rgba(255,255,255,0.85)' },
});
