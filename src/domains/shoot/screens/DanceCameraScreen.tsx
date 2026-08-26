/**
 * DanceCameraScreen — 시안 V4 `15_dance-camera`.
 *
 * 카메라를 화면 전체로 두고, 참고 영상을 그 위에 뜬 작은 창(PipGuide)으로 곁눈질하며
 * 따라 찍습니다. 안무·동작 따라하기 태스크(9.1 guide_type: "DANCE") 전용입니다.
 *
 * ⚠️ YouTube 약관 (인수인계 §6.8)
 *   "You must not display overlays, frames, or other visual elements
 *    in front of any part of a YouTube embedded player."
 *   - 참고 영상 **앞을 가리는 요소를 두지 않습니다.** 그래서 이 화면이 그리는 것들
 *     (옅은 막·헤더·셔터·검수 시트)은 전부 PipGuide 보다 **먼저** 놓입니다 —
 *     PipGuide 가 항상 맨 위라 플레이어 앞에 아무것도 오지 않습니다.
 *   - 재생·일시정지·배속은 유튜브 자체 컨트롤입니다(플레이어 안). 우리가 얹는 건 없습니다.
 *     확대/축소 버튼도 PipGuide 가 영상 **바깥 띠**에 그립니다.
 *   - Instagram·TikTok 참고 영상은 재생 제어 API 가 없어 이 화면을 못 씁니다.
 *
 * 2026-08-25: 상하 분할에서 시안 PiP 로 전환했습니다(사장님 확정).
 *   이전에는 약관 때문에 화면을 위(플레이어)/아래(카메라)로 갈라 뒀습니다. 떠 있는 배치
 *   자체는 약관 위반이 아니고, 위반은 플레이어 **위에 얹는 컨트롤**뿐이라는 것이
 *   정리되어 시안 배치를 되찾았습니다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, AppState, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { ChevronLeft, SwitchCamera, RotateCcw, Check } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import {
  CAMERA_IS_PLACEHOLDER,
  CameraPreview,
  type CameraPreviewHandle,
} from '../../../ui/CameraPreview';
import { PipGuide } from '../../../ui/PipGuide';
import { guideVideoUrl } from '../../../api/formatVideo';
import { Loading, JobProgress } from '../../../ui/Feedback';
import { Shutter } from '../../../ui/Shutter';
import {
  useTaskGuide,
  useTasks,
  useUpdateTask,
  useUploadFootage,
} from '../../../api/queries/shoot';
import { useProject, useVideoFormat } from '../../../api/queries/project';
import { color, space, radius, text, sizing } from '../../../design/theme';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'DanceCamera'>;

/** 시안 Shutter: 하단 밴드 h-[150px]. 셔터가 그 안에 세로 가운데로 놓입니다. */
const SHUTTER_BAND = 150;

export default function DanceCameraScreen({ route, navigation }: Props) {
  const { projectId, taskId, formatId: pickedFormatId } = route.params;
  const upload = useUploadFootage(projectId);
  const markTask = useUpdateTask(projectId);
  const insets = useSafeAreaInsets();

  const { data: guide, isLoading } = useTaskGuide(taskId);
  // 9.1 이 참고 영상을 안 줄 때를 대비해 포맷의 가이드 영상을 확보해 둡니다.
  const { data: project } = useProject(projectId);
  /*
   * 카메라 화면과 같은 이유로 **route 로 받은 포맷이 먼저**입니다 (2026-08-26).
   * 프로젝트의 video_format_id 는 7.1 이 성공해야 붙는데 실서버가 500 을 냅니다.
   */
  const { data: format } = useVideoFormat(pickedFormatId ?? project?.videoFormatId ?? undefined);

  /** 남은 컷이 있는지 보고 다음 갈 곳을 정합니다 (시안 CameraScreen.accept 와 같은 규칙). */
  const { data: board } = useTasks(projectId);

  const cameraRef = useRef<CameraPreviewHandle>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [camPermission, requestCam] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  /** 방금 찍은 것. 값이 있으면 시안 ReviewSheet 가 뜹니다. */
  const [take, setTake] = useState<{ uri: string; durationSec: number } | null>(null);
  const [uploadPct, setUploadPct] = useState(0);

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

  // 화면을 벗어나면 업로드를 정리합니다. 안 하면 백그라운드에서 계속 돕니다.
  useEffect(() => () => upload.cancel(), []);

  const beginRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    setRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
      setRecording(false);
      /*
       * 시안: 녹화를 멈추면 그 자리에서 ReviewSheet 로 결정합니다.
       * 길이는 우리가 센 초입니다 — recordAsync 는 uri 만 줍니다.
       */
      if (video?.uri) setTake({ uri: video.uri, durationSec: Math.max(1, elapsed) });
    } catch (e) {
      setRecording(false);
      console.warn('[dance-camera] 녹화 실패', e);
    }
  }, [elapsed]);

  /**
   * 찍은 영상을 올립니다.
   * 시안은 곧바로 editing 으로 가지만, 우리 안무 컷은 프로젝트의 여러 태스크 중 하나입니다.
   * 그래서 시안 CameraScreen.accept 와 같이 **남은 컷이 있으면 촬영으로, 없으면 편집으로** 갑니다.
   * (안무가 유일한 컷이면 시안과 똑같이 곧장 편집으로 갑니다)
   */
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
          const rest = (board?.tasks ?? []).filter(
            (t) => t.id !== taskId && t.taskStatus !== 'DONE' && t.taskStatus !== 'RETAKE_NEEDED'
          );
          if (rest.length > 0)
            navigation.replace('Camera', { projectId, taskId: rest[0].id, formatId: pickedFormatId });
          else navigation.replace('Render', { projectId });
        },
      }
    );
  };

  // ── 권한: 이 화면에서 필요할 때 즉석 요청 (한 번에 묶어 요청하지 않음) ──
  // 웹 대체본은 진짜 카메라가 아니라 권한을 묻지 않습니다 (디자인 QA 캡처용).
  if (isLoading || (!CAMERA_IS_PLACEHOLDER && (!camPermission || !micPermission))) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Loading label="준비하는 중" />
      </View>
    );
  }
  if (!CAMERA_IS_PLACEHOLDER && (!camPermission?.granted || !micPermission?.granted)) {
    return (
      <View style={[styles.fill, styles.center, { padding: space[6], gap: space[3] }]}>
        <Text style={text.subheading}>카메라와 마이크가 필요합니다</Text>
        <Text style={[text.body, { textAlign: 'center', color: color.ink[500] }]}>
          참고 영상을 보면서 따라 찍으려면 카메라와 마이크를 허용해 주세요.
        </Text>
        <Button
          label="허용하기"
          onPress={async () => {
            if (!camPermission?.granted) await requestCam();
            if (!micPermission?.granted) await requestMic();
          }}
        />
        <Button label="돌아가기" variant="quiet" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.black}>
      <CameraPreview ref={cameraRef} facing={facing} />

      {/*
        시안: 카메라 위 아주 옅은 막(bg-ink/10). 흰 글자·아이콘이 밝은 배경에서도 읽힙니다.
        토큰에 0.10 이 없어 값을 직접 씁니다 (overlay.media 는 0.25 로 시안보다 진합니다).
        ⚠️ PipGuide 보다 **먼저** 놓입니다 — 플레이어 앞을 가리면 약관 위반입니다.
      */}
      <View style={styles.dim} pointerEvents="none" />

      {/* 시안: 행 44(h-11) · 좌우 16(px-4) · 뒤로 36(h-9 w-9) · chevron-left 24 흰색 */}
      <SafeAreaView style={styles.topLayer} edges={['top']} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            // 녹화 중에는 제스처 뒤로가기도 막혀 있습니다(navigator). 실수로 나가는 것을 막습니다.
            disabled={recording}
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, (pressed || recording) && { opacity: 0.5 }]}
          >
            <ChevronLeft size={24} strokeWidth={2} color={color.paper} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/*
        참고 영상. 시안은 이 화면에서 width 110 을 씁니다(카메라 화면은 98).
        ⚠️ 이 아래로는 아무것도 그리지 않습니다. 플레이어가 항상 맨 위여야 합니다.
      */}
      {/* 시안: 안무 카메라의 PiP 는 110 입니다(카메라는 98) */}
      {/* 안무를 따라 추는 화면이라 **가이드 영상** 입니다 (api/formatVideo.ts) */}
      <PipGuide url={guide?.referenceVideo?.referenceUrl ?? guideVideoUrl(format)} width={110} />

      {/*
        시안 Shutter: 하단 밴드 150. 셔터 76 은 가운데, 전환 버튼은 오른쪽 26 에
        52×52 rounded-full bg-ink/45. 검수 시트가 뜨면 시안처럼 밴드를 통째로 감춥니다.
      */}
      {!take && (
        <View
          style={[
            styles.shutterBand,
            { height: SHUTTER_BAND + insets.bottom, paddingBottom: insets.bottom },
          ]}
        >
          <Shutter
            recording={recording}
            onPress={() => {
              if (recording) cameraRef.current?.stopRecording();
              else void beginRecording();
            }}
          />

          {/*
            앞/뒤 전환 — 실기기(2026-08-24): 전환 버튼이 없어 전면만 쓸 수 있었음.
            안무는 셀프(전면)가 기본이지만, 남이 찍어주는 경우 후면이 필요합니다.
            녹화 중 전환은 영상이 끊기는 기기가 있어 막습니다 (시안은 막지 않습니다).
          */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={facing === 'front' ? '후면 카메라로 전환' : '전면 카메라로 전환'}
            disabled={recording}
            onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
            style={({ pressed }) => [
              styles.flipBtn,
              (pressed || recording) && { opacity: recording ? 0.35 : 0.7 },
            ]}
          >
            {/*
              시안: 전면일 때 아이콘을 좌우 반전 (scaleX(-1)).
              반전은 감싸는 View 가 겁니다 — SVG 자체에 걸면 웹에서 아이콘이 사라집니다.
            */}
            <View style={{ transform: [{ scaleX: facing === 'front' ? -1 : 1 }] }}>
              <SwitchCamera size={23} strokeWidth={2} color={color.paper} />
            </View>
          </Pressable>
        </View>
      )}

      {/*
        시안 ReviewSheet — rounded-t-28 · px-5 · pt-5 · pb-8 · 미리보기 150 (9:16).
        업로드는 실패하기 쉬운 지점이라(가게 안은 신호가 약합니다) 진행률과 재시도를
        그대로 보여 줍니다. 촬영본은 실패해도 사라지지 않습니다.
      */}
      {take && (
        <View style={styles.sheetScrim}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space[8]) }]}>
            {/*
              시안은 회색 자리표시자입니다. 우리는 지어낼 값이 없어 같은 자리표시자를 두되,
              실제로 아는 것 하나(촬영 길이)만 적습니다.
            */}
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>{take.durationSec}초 촬영됨</Text>
            </View>

            <Text style={styles.sheetTitle}>안무 촬영 완료</Text>
            <Text style={styles.sheetSub}>촬영한 영상을 확인하고 결정하세요</Text>

            {upload.isPending ? (
              <View style={{ gap: space[2] }}>
                <JobProgress
                  label={`올리는 중 ${Math.round(uploadPct * 100)}%`}
                  progress={uploadPct}
                />
                <Button label="취소" variant="quiet" size="small" onPress={() => upload.cancel()} />
              </View>
            ) : (
              // 시안: mt-4 gap-2.5 · 각 버튼 h-12 flex-1
              <View style={styles.sheetBtns}>
                <Button
                  label="다시 촬영"
                  variant="secondary"
                  icon={RotateCcw}
                  style={styles.sheetBtn}
                  onPress={() => {
                    setTake(null);
                    setUploadPct(0);
                  }}
                />
                <Button
                  label={upload.isError ? '다시 올리기' : '사용하기'}
                  icon={Check}
                  style={styles.sheetBtn}
                  onPress={useTake}
                />
              </View>
            )}

            {upload.isError && (
              <Text style={styles.sheetError}>
                올리지 못했습니다. 촬영본은 그대로 있으니 다시 시도해 주세요.
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  black: { flex: 1, backgroundColor: color.mediaBlack },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },

  // 시안: bg-ink/10
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.10)',
  },

  topLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  // 시안: h-11(44) · px-4 · 뒤로 h-9 w-9(36)
  header: {
    height: sizing.appBarHeight,
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  backBtn: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 시안 Shutter: inset-x-0 bottom-0 h-[150px] · 가운데 정렬
  shutterBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안: right-[26px] · 52×52 · rounded-full · bg-ink/45
  flipBtn: {
    position: 'absolute',
    right: 26,
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.overlay.cameraChrome,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 시안 ReviewSheet
  sheetScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: color.overlay.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    // 시안: rounded-t-[28px] · px-5 · pt-5
    paddingHorizontal: space[5],
    paddingTop: space[5],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.canvas,
  },
  // 시안: w-[150px] · aspect-[9/16] · rounded-2xl(16) · border hairline · mb-4
  preview: {
    alignSelf: 'center',
    width: 150,
    aspectRatio: 9 / 16,
    marginBottom: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.ink[200],
    backgroundColor: color.ink[100],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewLabel: { ...text.bodySmall, color: color.ink[500] },
  // 시안: 15 semibold 가운데 / 13 slate-muted 가운데 mt-1
  sheetTitle: { ...text.bodyStrong, textAlign: 'center' },
  sheetSub: { ...text.bodySmall, color: color.ink[500], textAlign: 'center', marginTop: space[1] },
  // 시안 gap-2.5(10) — 토큰에 10 이 없어 가장 가까운 space[3](12) 을 씁니다.
  sheetBtns: { flexDirection: 'row', gap: space[3], marginTop: space[4] },
  sheetBtn: { flex: 1 },
  sheetError: { ...text.caption, color: color.danger[500], marginTop: space[3] },
});
