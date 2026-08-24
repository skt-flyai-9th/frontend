/**
 * DanceCameraScreen — 프로토타입 `13_안무카메라.png`.
 *
 * 참고 영상(위)과 카메라 프리뷰(아래)를 **위아래로 나눠** 동시에 봅니다.
 * 안무·동작 따라하기 태스크(9.1 guide_type: "DANCE") 전용입니다.
 *
 * ⚠️ YouTube 약관 (인수인계 §6.8 — 반드시 지켜야 합니다)
 *   "You must not display overlays, frames, or other visual elements
 *    in front of any part of a YouTube embedded player."
 *   - 플레이어 위에 카메라 프리뷰·버튼·카운트다운을 **절대 겹치지 않습니다.**
 *     그래서 화면을 위(플레이어)/아래(카메라)로 물리적으로 나눴습니다.
 *   - 배속·구간반복 컨트롤은 GuidePlayer 가 이미 플레이어 바깥에 둡니다.
 *   - Instagram·TikTok 참고 영상은 재생 제어 API 가 없어 이 화면을 못 씁니다.
 *     그 경우 TaskGuide 가 이 화면으로 보내지 않습니다 (YouTube 전용).
 *
 * 녹화 로직은 CameraScreen 과 같은 패턴입니다:
 *   recordAsync → TakeReview 로 교체 이동. 백그라운드 전환 시 안전 중단.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, AppState, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { RotateCcw } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { GuidePlayer } from '../../../ui/GuidePlayer';
import { Loading } from '../../../ui/Feedback';
import { useTaskGuide } from '../../../api/queries/shoot';
import { color, space, radius, text, sizing } from '../../../design/theme';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'DanceCamera'>;

export default function DanceCameraScreen({ route, navigation }: Props) {
  const { projectId, taskId } = route.params;
  const insets = useSafeAreaInsets();

  const { data: guide, isLoading } = useTaskGuide(taskId);
  const refUrl = guide?.referenceVideo?.referenceUrl;

  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [camPermission, requestCam] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // 백그라운드 전환 / 전화 수신 시 안전 중단 (CameraScreen 과 동일 규칙)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && recording) {
        cameraRef.current?.stopRecording();
        setRecording(false);
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
      const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
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
      console.warn('[dance-camera] 녹화 실패', e);
    }
  }, [elapsed, navigation, projectId, taskId]);

  // ── 권한: 이 화면에서 필요할 때 즉석 요청 (한 번에 묶어 요청하지 않음) ──
  if (!camPermission || !micPermission || isLoading) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Loading label="준비하는 중" />
      </View>
    );
  }
  if (!camPermission.granted || !micPermission.granted) {
    return (
      <View style={[styles.fill, styles.center, { padding: space[6], gap: space[3] }]}>
        <Text style={text.subheading}>카메라와 마이크가 필요합니다</Text>
        <Text style={[text.body, { textAlign: 'center', color: color.ink[500] }]}>
          참고 영상을 보면서 따라 찍으려면 카메라와 마이크를 허용해 주세요.
        </Text>
        <Button
          label="허용하기"
          onPress={async () => {
            if (!camPermission.granted) await requestCam();
            if (!micPermission.granted) await requestMic();
          }}
        />
        <Button label="돌아가기" variant="quiet" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top, backgroundColor: color.canvas }]}>
      {/* 위: 참고 영상. 플레이어 위에는 아무것도 올리지 않습니다 (YouTube 약관). */}
      <View style={styles.playerArea}>
        {refUrl ? (
          <GuidePlayer url={refUrl} compact />
        ) : (
          // 실패해도 빠져나갈 길 — 참고 영상이 없으면 그냥 찍을 수 있게 합니다.
          <View style={[styles.center, { padding: space[4] }]}>
            <Text style={text.bodySmall}>참고 영상이 없습니다. 그냥 찍으셔도 됩니다.</Text>
          </View>
        )}
      </View>

      {/* 아래: 카메라 프리뷰 + 촬영 버튼 (플레이어와 완전히 분리된 영역) */}
      <View style={styles.cameraArea}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="video"
          videoQuality="1080p"
        />

        {/*
          앞/뒤 전환 — 실기기(2026-08-24): 전환 버튼이 없어 전면만 쓸 수 있었음.
          안무는 셀프(전면)가 기본이지만, 남이 찍어주는 경우 후면이 필요합니다.
          녹화 중 전환은 영상이 끊기는 기기가 있어 막습니다.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="앞뒤 카메라 바꾸기"
          disabled={recording}
          onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
          style={({ pressed }) => [
            styles.flipBtn,
            (pressed || recording) && { opacity: recording ? 0.35 : 0.7 },
          ]}
        >
          <RotateCcw size={22} strokeWidth={2} color={color.paper} />
        </Pressable>
        {recording && (
          <View style={styles.recBadge}>
            <View style={styles.recDot} />
            <Text style={[text.bodySmall, { color: color.paper }]}>{elapsed}초</Text>
          </View>
        )}
        <View style={[styles.shutterRow, { paddingBottom: Math.max(insets.bottom, space[4]) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={recording ? '촬영 끝내기' : '촬영 시작'}
            onPress={() => {
              if (recording) cameraRef.current?.stopRecording();
              else void beginRecording();
            }}
            style={({ pressed }) => [styles.shutterOuter, pressed && { opacity: 0.8 }]}
          >
            <View style={[styles.shutterInner, recording && styles.shutterStop]} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  // compact 플레이어가 넘치지 않게 상한. 카메라가 항상 화면의 절반 이상을 가집니다.
  playerArea: { backgroundColor: color.canvas, maxHeight: 380 },
  cameraArea: { flex: 1, minHeight: 260, backgroundColor: color.mediaBlack },
  flipBtn: {
    position: 'absolute',
    top: space[3],
    right: space[3],
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.overlay.cameraChrome,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recBadge: {
    position: 'absolute',
    top: space[3],
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: color.overlay.cameraChrome,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  recDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: color.danger[500] },
  shutterRow: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  shutterOuter: {
    width: sizing.shutterOuter,
    height: sizing.shutterOuter,
    borderRadius: sizing.shutterOuter / 2,
    borderWidth: 4,
    borderColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: sizing.shutterInner,
    height: sizing.shutterInner,
    borderRadius: sizing.shutterInner / 2,
    backgroundColor: color.danger[500],
  },
  shutterStop: { borderRadius: radius.sm, width: 34, height: 34 },
});
