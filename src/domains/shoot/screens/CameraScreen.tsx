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
import { X, Eye, EyeOff, SunMedium, RotateCcw } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { CameraGuideOverlay, type GuideShape } from '../../../ui/CameraGuideOverlay';
import { SpineStrip } from '../../../ui/ProgressSpine';
import theme, { color, radius, sizing, space, text } from '../../../design/theme';
import { useTaskGuide, useTasks } from '../../../api/queries/shoot';
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
  const { projectId, taskId } = route.params;
  const cameraRef = useRef<CameraView>(null);

  const { data: board } = useTasks(projectId);
  const { data: guide } = useTaskGuide(taskId);

  const guideVisible = useAppState((s) => s.guideVisible);
  const guideOpacity = useAppState((s) => s.guideOpacity);
  const toggleGuide = useAppState((s) => s.toggleGuide);
  const setGuideOpacity = useAppState((s) => s.setGuideOpacity);

  const tasks = board?.tasks ?? [];
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
      if (video?.uri) {
        navigation.replace('TakeReview', {
          projectId,
          taskId,
          uri: video.uri,
          durationSec: elapsed || 5,
        });
      }
    } catch (e) {
      setRecording(false);
      console.warn('[camera] 녹화 실패', e);
    }
  }, [elapsed, navigation, projectId, taskId]);

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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={recording ? '녹화 멈추기' : '녹화 시작'}
            onPress={
              recording
                ? () => {
                    cameraRef.current?.stopRecording();
                    setRecording(false);
                  }
                : () => setCountdown(COUNTDOWN_FROM)
            }
            disabled={!ready || countdown !== null}
            style={({ pressed }) => [
              styles.shutterOuter,
              // 시안 camera.tsx: 녹화 중엔 바깥 링이 빨강으로
              recording && { borderColor: color.danger[500] },
              pressed && { transform: [{ scale: 0.94 }] },
            ]}
          >
            <View style={[styles.shutterInner, recording && styles.shutterStop]} />
          </Pressable>

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
    </View>
  );
}

const CHROME = color.overlay.cameraChrome;

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: color.mediaBlack },
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

  shutterOuter: {
    width: sizing.shutterOuter,
    height: sizing.shutterOuter,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: sizing.shutterInner,
    height: sizing.shutterInner,
    borderRadius: radius.pill,
    backgroundColor: color.brand[500],
  },
  shutterStop: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: color.paper },

  torchRow: { alignSelf: 'center', paddingVertical: space[2], paddingHorizontal: space[4] },
  torchText: { ...text.bodySmall, color: 'rgba(255,255,255,0.85)' },
});
