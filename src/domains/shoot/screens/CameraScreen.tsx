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
import {
  Animated,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  CAMERA_IS_PLACEHOLDER,
  CameraPreview,
  type CameraPreviewHandle,
} from '../../../ui/CameraPreview';
import { Check, ChevronLeft, SwitchCamera } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { PipGuide } from '../../../ui/PipGuide';
import { guideVideoUrl } from '../../../api/formatVideo';
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
import { useProject, useScenes, useVideoFormat } from '../../../api/queries/project';
import { useAppState } from '../../../lib/appState';
import type { CreateStackParamList } from '../../../navigation/types';
import type { Id, ShootTask } from '../../../api/schema/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'Camera'>;

/**
 * 시안 `촬영부분수정` — 셔터 위 세로 목록을 **하단 가로 클립 스트립**으로 바꿉니다.
 *
 * 11차의 "테스크 보기" 토글 + 세로 카드는 이 시안에서 폐기됐습니다. 컷이 늘어도
 * 화면을 덜 가리고, 지금 어느 컷을 찍는지가 한 줄에 다 보입니다. 화면 밖으로
 * 넘치면 **가로로 밀어서** 넘깁니다.
 *
 * 시안 실측값 (템플릿 인라인 `ClipStrip`)
 *   스트립  bottom 156 · px 20 · pt 28 · pb 4 · gap 10 · 가로 스크롤
 *   클립    56×72 · radius 12
 *           미촬영  bg rgba(20,20,30,.65) · 테두리 1 white/28 · 가운데 번호 15 bold
 *           활성    테두리 2 #3200F9 · scale 1.05 · 그림자 0 0 14 rgba(50,0,249,.55)
 *           완료    bg #0F172A + 촬영본 첫 프레임
 *   재촬영  완료이면서 활성일 때 클립 위 -21 · #3200F9 · 10 semibold
 *
 * ⚠️ **완료 칸 그림은 이번에 찍은 컷만 진짜입니다.**
 *    서버가 촬영본 썸네일을 주지 않고(`/tasks/{id}/footage` 는 영상 URL 뿐),
 *    영상에서 첫 프레임을 뽑으려면 `expo-video-thumbnails` 네이티브 패키지가 필요해
 *    APK 를 새로 구워야 합니다. 그래서 **이 화면에서 찍어 기기에 파일이 남은 컷**은
 *    전부 첫 프레임으로 그리고, 앞서 찍어 둔 컷(앱을 다시 켜거나 지난번 촬영)은
 *    브랜드색 채움 + 체크로 둡니다 — 없는 그림을 지어내지 않습니다 (CLAUDE.md §2).
 *
 * ⚠️ `#3200F9` 는 이 스트립 전용입니다. `--brand` 는 시안에서도 `#2563EB` 그대로라
 *    `theme.ts` 에 올리지 않습니다.
 */
const CLIP_ACTIVE = '#3200F9';
const CLIP_GLASS = 'rgba(20, 20, 30, 0.65)';
const CLIP_DONE_BG = '#0F172A';

/**
 * 녹화 표시 점 — 시안 `@keyframes rec-blink{0%,49%{opacity:1}50%,100%{opacity:.12}}`.
 *
 * `steps(1, end)` 이라 **부드럽게 흐려지는 게 아니라 1 ↔ .12 로 딱딱 바뀝니다**(1초 주기).
 * 그래서 애니메이션 드라이버를 쓰지 않고 0.5초마다 값을 직접 넣습니다 —
 * `Animated.loop` 은 웹에서 한 바퀴 뒤 굳어 캡처가 매번 달라집니다(CLAUDE.md §5-④).
 * 값만 바꾸므로 리렌더도 없고 웹·기기에서 똑같이 돕니다.
 */
function RecDot() {
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let on = true;
    const t = setInterval(() => {
      on = !on;
      o.setValue(on ? 1 : 0.12);
    }, 500);
    return () => {
      clearInterval(t);
      o.setValue(1);
    };
  }, [o]);
  return <Animated.View style={[styles.recDot, { opacity: o }]} />;
}

function ClipCell({
  label,
  index,
  done,
  active,
  stillUri,
  disabled,
  onPress,
}: {
  label: string;
  index: number;
  done: boolean;
  active: boolean;
  /** 있으면 이 영상의 첫 프레임을 깝니다 (방금 찍은 칸) */
  stillUri?: string;
  disabled: boolean;
  onPress: () => void;
}) {
  /*
    재생하지 않고 첫 프레임만 세워 둡니다 — `MyShortCell` 과 같은 방식입니다.
    uri 가 없으면 플레이어를 아예 만들지 않습니다(빈 칸에 디코더를 붙이지 않습니다).
  */
  const player = useVideoPlayer(stillUri ?? null, (p) => {
    p.muted = true;
  });

  return (
    <View style={styles.clipWrap}>
      {done && active && (
        <View style={styles.retake} pointerEvents="none">
          <Text style={styles.retakeText}>재촬영 ↺</Text>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${index + 1}. ${label}${done ? ' (찍음)' : ''}`}
        disabled={disabled}
        onPress={onPress}
        style={[styles.clip, done ? styles.clipDone : styles.clipTodo, active && styles.clipActive]}
      >
        {stillUri ? (
          <VideoView
            player={player}
            style={styles.clipFill}
            contentFit="cover"
            nativeControls={false}
          />
        ) : done ? (
          /* 썸네일을 못 얻는 칸 — 찍었다는 사실만 색과 체크로 말합니다 */
          <View style={[styles.clipFill, styles.clipCheck]}>
            <Check size={20} strokeWidth={3} color={color.paper} />
          </View>
        ) : (
          <Text style={styles.clipIndex}>{index + 1}</Text>
        )}
      </Pressable>
    </View>
  );
}

function ClipStrip({
  tasks,
  taskId,
  isShot,
  disabled,
  shotUris,
  onSelectTask,
}: {
  tasks: ShootTask[];
  taskId?: Id;
  isShot: (t: ShootTask) => boolean;
  disabled: boolean;
  /** 이번에 찍어서 기기에 파일이 남아 있는 컷 — `{ 태스크id: uri }` */
  shotUris: Record<number, string>;
  onSelectTask: (id: Id) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.stripContent}
    >
      {tasks.map((t, i) => (
        <ClipCell
          key={t.id}
          label={t.taskTitle}
          index={i}
          done={isShot(t)}
          active={t.id === taskId}
          stillUri={shotUris[Number(t.id)]}
          disabled={disabled}
          onPress={() => onSelectTask(t.id)}
        />
      ))}
    </ScrollView>
  );
}


export default function CameraScreen({ navigation, route }: Props) {
  const { projectId, taskId: firstTaskId, formatId: pickedFormatId } = route.params;
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

  /**
   * 🔴 **이미 전부 찍은 채로 들어온 경우** (2026-08-27).
   *
   * 위 한 줄의 마지막 `?? tasks[0]?.id` 가 함정이었습니다. 남은 컷이 없으면 **첫 컷으로
   * 되돌아가** 이미 찍은 컷을 또 찍으라고 내밀었습니다. 편집이 실패한 뒤 "촬영부터 다시
   * 하기" 로 들어오면 항상 이 꼴이 됩니다 — 사장님이 10컷을 다 찍고 편집이 깨진 뒤
   * 겪으신 그 화면입니다(칩이 전부 초록인데 셔터가 떠 있었습니다).
   *
   * 자동으로 편집으로 보내지 않습니다 — 서버가 `TASKS_INCOMPLETE` 를 주는 상태면
   * 편집 화면이 다시 여기로 보내 **무한 왕복**이 됩니다. 사장님이 고르게 합니다.
   */

  const { data: guide } = useTaskGuide(taskId);

  /*
   * 좌상단 참고 영상(시안 PipGuide).
   * 컷마다 참고 영상이 붙는 건 안무형(9.1 reference_video)뿐이라, 없으면
   * 이 프로젝트가 고른 포맷의 참고 영상을 씁니다 — 촬영 준비 화면에서 본
   * 그 영상입니다. 둘 다 없으면 창을 띄우지 않습니다(빈 창을 만들지 않습니다).
   */
  const { data: project } = useProject(projectId);
  /*
   * 포맷은 **route 로 받은 것이 먼저**입니다 (2026-08-26).
   * 프로젝트의 video_format_id 는 7.1 기획 생성이 성공해야 붙는데, 실서버 7.1 이
   * 500 을 내는 동안 계속 null 이라 참고 영상 창이 아예 안 떴습니다.
   * route 값은 사장님이 촬영 준비에서 직접 고른 그 포맷이라 지어낸 값이 아닙니다.
   */
  const { data: format } = useVideoFormat(pickedFormatId ?? project?.videoFormatId ?? undefined);
  /*
   * 촬영 중에 따라 보는 화면이라 **가이드 영상** 입니다.
   * 9.1 이 주는 값이 먼저고, 없으면 포맷의 가이드 영상으로 떨어집니다
   * (그마저 없으면 대표 영상 — `api/formatVideo.ts`).
   */
  const pipUrl = guide?.referenceVideo?.referenceUrl ?? guideVideoUrl(format);

  /*
   * 안무 컷(9.1 DANCE)은 참고 영상을 보면서 찍어야 해서 전용 화면이 따로 있습니다.
   * 촬영 목록 화면을 없애면서 그리로 가는 길이 끊겨 있었습니다 — 여기서 잇습니다.
   */
  const goingToDance = guide?.guideType === 'DANCE';
  useEffect(() => {
    if (!taskId || !goingToDance) return;
    navigation.replace('DanceCamera', { projectId, taskId, formatId: pickedFormatId });
  }, [taskId, goingToDance, navigation, projectId, pickedFormatId]);

  const guideVisible = useAppState((s) => s.guideVisible);
  const guideOpacity = useAppState((s) => s.guideOpacity);
  const task = tasks.find((t) => t.id === taskId);

  const [camPermission, requestCam] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  /**
   * 컷을 고릅니다. 스트립의 칸을 누르는 것이 유일한 경로입니다.
   * 녹화 중이거나 검수 시트가 떠 있으면 바꾸지 않습니다(옛 칩 줄의 조건 그대로).
   */
  const onSelectTask = (id: Id) => {
    if (recording || take) return;
    setTaskId(id);
  };

  /**
   * 상단 카운트다운의 최대 시간 — **7.2 콘티의 `targetDurationSec`** 입니다.
   *
   * 8.1 `ShootTask` 에는 길이가 없지만 `sceneId` 가 있고, 7.2 장면이 그 장면의
   * 목표 길이를 줍니다. 두 값을 이어 쓰면 지어내지 않고 실제 초를 씁니다.
   *
   * ⚠️ 기획(7.1)이 실패했거나 장면이 아직 없으면 **길이를 모릅니다.** 그때는
   *    카운트다운 대신 지금까지 찍은 시간을 셉니다 — 없는 제한 시간을 만들어
   *    사장님을 재촉하지 않습니다 (CLAUDE.md §2).
   */
  const { data: scenes } = useScenes(projectId);
  const targetSec = scenes?.find((s) => s.id === task?.sceneId)?.targetDurationSec ?? null;
  /** 남은 초. null 이면 길이를 모르는 것이라 카운트다운을 하지 않습니다. */
  const [left, setLeft] = useState<number | null>(null);

  /**
   * 이번에 찍은 촬영본의 기기 경로 — `{ 태스크id: uri }`.
   *
   * 업로드가 끝나도 기기의 파일은 남아 있어, **이 화면에서 찍은 컷은 전부**
   * 스트립에 첫 프레임으로 보여 줍니다.
   *
   * ⚠️ 앱을 껐다 켜거나 이전에 찍어 둔 컷은 여기 없습니다. 서버가 촬영본 썸네일을
   *    주지 않아서(`/tasks/{id}/footage` 는 영상 URL 뿐) 그림을 얻을 데가 없습니다.
   *    그런 칸은 브랜드색 채움 + 체크로 둡니다 — 없는 그림을 지어내지 않습니다.
   */
  const [shotUris, setShotUris] = useState<Record<number, string>>({});

  /** 대사가 없는 B-roll 은 마이크 권한을 요구하지 않습니다. */
  const needsMic = task?.taskType === '영상촬영' || task?.taskType === '음성녹음';

  // 백그라운드 전환 / 전화 수신 시 안전 중단
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

  /** 컷을 바꾸거나 장면 길이를 알게 되면 남은 시간을 그 값으로 되돌립니다. */
  useEffect(() => {
    setLeft(targetSec);
  }, [targetSec, taskId]);

  /**
   * 카운트다운. 0 이 되면 **녹화를 스스로 끝냅니다** — 시안이 그렇게 동작합니다.
   * 카메라에도 `maxDuration` 으로 같은 값을 넘겨 두 시계가 어긋나지 않게 합니다.
   */
  useEffect(() => {
    if (!recording || left == null) return;
    if (left <= 0) {
      cameraRef.current?.stopRecording();
      setRecording(false);
      return;
    }
    const t = setTimeout(() => setLeft((s) => (s == null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [recording, left]);

  const beginRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    setLeft(targetSec);
    setRecording(true);
    try {
      // 장면 길이를 알면 그만큼만, 모르면 예전처럼 30초를 상한으로 둡니다.
      const video = await cameraRef.current.recordAsync({ maxDuration: targetSec ?? 30 });
      setRecording(false);
      // 지어낸 5초 대신 실제로 흐른 시간을 씁니다(1초 미만도 그대로).
      if (video?.uri) setTake({ uri: video.uri, durationSec: Math.max(1, elapsed) });
    } catch (e) {
      setRecording(false);
      console.warn('[camera] 녹화 실패', e);
    }
  }, [elapsed, targetSec]);

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
          // 스트립의 이 칸을 정지 프레임으로 바꿉니다 (기기에 파일이 남아 있습니다)
          if (taskId != null) setShotUris((m) => ({ ...m, [Number(taskId)]: take.uri }));
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

  /*
    권한은 **안내 화면 없이 OS 창으로 바로** 묻습니다 (2026-08-28 지시 —
    무엇에 쓰는지는 약관에 있어 화면에서 다시 설명하지 않습니다).
    명세 규칙대로 카메라를 먼저 묻고, 마이크는 소리가 필요한 컷에서만 묻습니다.
  */
  useEffect(() => {
    if (CAMERA_IS_PLACEHOLDER) return;
    if (camPermission && !camPermission.granted && camPermission.canAskAgain) void requestCam();
  }, [camPermission, requestCam]);

  useEffect(() => {
    if (CAMERA_IS_PLACEHOLDER || !needsMic) return;
    if (micPermission && !micPermission.granted && micPermission.canAskAgain) void requestMic();
  }, [needsMic, micPermission, requestMic]);

  /**
   * 마이크가 없으면 **소리 없이 찍습니다.** 예전에는 "소리 없이 찍기" 를 눌러 고르게
   * 했는데 그 화면을 없앴으므로, 거부된 상태에서 막지 않고 그대로 진행합니다 —
   * 여기서 막으면 촬영 자체를 못 합니다.
   */
  const canRecordAudio = needsMic && (CAMERA_IS_PLACEHOLDER || !!micPermission?.granted);

  // 안무 컷으로 넘어가는 사이에 이 화면이 한 프레임 스쳐 보이지 않게 검은 판만 둡니다.
  if (goingToDance) return <View style={styles.black} />;

  /*
    🔴 **이미 다 찍었을 때 화면을 막지 않습니다** (2026-08-28, 실기기 보고).

    2026-08-27 에는 여기서 "이미 다 찍었어요 / 편집으로 가기" 전체 화면을 띄웠습니다.
    그때는 컷 목록이 셔터 위 칩 줄이라, 다 찍은 채로 카메라가 열리면 "칩이 전부
    초록인데 셔터가 떠 있는" 꼴이 돼서 막는 게 맞았습니다.

    지금은 **클립 스트립이 그 일을 대신합니다** — 어느 칸이 찍혔는지 한 줄에 다
    보이고, 아무 칸이나 눌러 다시 찍을 수 있습니다. 그런데 이 전체 화면이 스트립을
    가려 버려서, 편집이 끝난 프로젝트로 들어오면 **촬영 자체가 막혔습니다.**

    그래서 막지 않고, 다 찍은 상태면 스트립 위에 "편집으로 가기" 버튼을 띄웁니다
    자동으로 편집으로 보내지도 않습니다 — 서버가
    `TASKS_INCOMPLETE` 를 주는 상태면 편집 화면이 다시 여기로 보내 무한 왕복이 됩니다.
  */

  /*
    ── 권한 ────────────────────────────────────────────
    2026-08-28 지시로 **안내 화면 두 개를 없앴습니다.**
    ("카메라를 켜야 찍을 수 있습니다" · "이 장면은 소리도 담습니다")
    무엇에 쓰는지는 약관에 있어 화면에서 다시 설명하지 않습니다.
    이제 이 화면에 들어오면 위 `useEffect` 가 **OS 권한창을 바로 띄웁니다.**

    명세 규칙은 그대로입니다 — 카메라 먼저, 마이크는 필요한 컷에서만 묻습니다.

    ⚠️ **되돌릴 수 없게 거부된 경우만** 화면을 남깁니다. 그 상태에서는 앱이 다시
       물을 수 없어(`canAskAgain: false`), 아무것도 안 그리면 검은 화면에 갇힙니다.
       안내가 아니라 **빠져나갈 길**이라 지우지 않았습니다.
  */
  if (!CAMERA_IS_PLACEHOLDER && !camPermission) return <View style={styles.black} />;

  if (!CAMERA_IS_PLACEHOLDER && !camPermission?.granted && !camPermission?.canAskAgain) {
    return (
      <SafeAreaView style={styles.permWrap}>
        <View style={styles.permBody}>
          <Text style={text.title}>설정에서 카메라를 켜 주세요</Text>
        </View>
        <View style={{ gap: space[2] }}>
          <Button label="설정 열기" onPress={() => Linking.openSettings()} />
          <Button label="나중에 하기" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  // 권한창이 떠 있는 동안은 검은 판만 둡니다 (카메라를 열 수 없는 상태입니다).
  if (!CAMERA_IS_PLACEHOLDER && !camPermission?.granted) return <View style={styles.black} />;

  return (
    <View style={styles.black}>
      {/* 프리뷰. 오버레이는 이 컴포넌트 바깥 형제 노드입니다. */}
      <CameraPreview
        ref={cameraRef}
        facing={facing}
        mute={!canRecordAudio}
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

      {/*
        상단 카운트다운 — 시안 top-[62px] · 빨간 점 9(깜빡임) + 숫자 18 bold tabular.

        장면 길이를 알면 **남은 초가 줄어들고**, 모르면 지금까지 찍은 초가 늘어납니다
        (위 `targetSec` 주석). 어느 쪽이든 실제 시간이라 지어낸 값이 아닙니다.

        점은 녹화 중에만 뜨고 1초 주기로 깜빡입니다 (`RecDot` 주석 참고).
      */}
      {!take && (
        <View style={styles.countdown} pointerEvents="none">
          {recording && <RecDot />}
          <Text style={styles.countdownText}>{left != null ? Math.max(0, left) : elapsed}</Text>
        </View>
      )}

      {/* 그 아래 지금 찍을 컷 이름 — 시안 top-[92px] · 유리질 pill · 12.5 semibold */}
      {!take && task && (
        <View style={styles.takeLabelWrap} pointerEvents="none">
          <Text style={styles.takeLabel} numberOfLines={1}>
            {task.taskTitle}
          </Text>
        </View>
      )}

      {!take && tasks.length > 0 && (
        <ClipStrip
          tasks={tasks}
          taskId={taskId}
          isShot={shot}
          disabled={recording}
          shotUris={shotUris}
          onSelectTask={onSelectTask}
        />
      )}

      <SafeAreaView style={styles.bottomLayer} edges={['bottom']} pointerEvents="box-none">
        {/*
          시안: 셔터 영역 h150 가운데 셔터, 오른쪽 26 에 전환 버튼 52.
          가이드 밝기·불빛 버튼은 시안에 없어 걷어냈습니다.
        */}
        <View style={styles.controls}>
          <Shutter
            recording={recording}
            disabled={!ready}
            /*
              🔴 2026-08-27: 누르면 **바로 찍습니다.** 예전에는 3·2·1 을 세고 시작했습니다.
                 사장님 지시로 뺐습니다 — 준비는 이미 화면 보면서 하시고, 세 박자를
                 기다리는 동안 놓치는 순간이 생깁니다.
            */
            onPress={
              recording
                ? () => {
                    cameraRef.current?.stopRecording();
                    setRecording(false);
                  }
                : () => void beginRecording()
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
  // ── 시안 `촬영부분수정` 상단 표시 · 하단 클립 스트립 ──────────
  //
  // 줄높이는 시안 값(글자크기 × 1.5)으로 덮었습니다 — 토큰이 그보다 짧습니다
  // (CLAUDE.md §5-①). 12.5 → 18.75 · 15 → 22.5

  // 카운트다운: 시안 top-[62px] · 가운데 · 점 9 + 숫자 18 bold tabular
  countdown: {
    position: 'absolute',
    top: 62,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  recDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: color.danger[500],
  },
  countdownText: {
    ...text.heading,
    fontSize: 18,
    lineHeight: 18,
    color: color.paper,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // 컷 이름 배지: 시안 top-[92px] · px-3.5 py-1.5 · 12.5 semibold · 유리질
  takeLabelWrap: {
    position: 'absolute',
    top: 92,
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: 'center',
    paddingHorizontal: space[6],
  },
  takeLabel: {
    ...text.chipLabel,
    fontSize: 12.5,
    lineHeight: 18.75,
    maxWidth: '100%',
    paddingHorizontal: space['3.5'],
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: CLIP_GLASS,
    color: color.paper,
    overflow: 'hidden',
  },

  // 스트립: 시안 bottom-[156px] · px-5 · pt-7 · pb-1 · gap-2.5
  // 높이 = 클립 72 + 위 28 + 아래 4. 위 28 은 "재촬영" 배지가 들어갈 자리입니다.
  strip: { position: 'absolute', left: 0, right: 0, bottom: 156, zIndex: 30, height: 104 },
  stripContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: space[5],
    paddingTop: 28,
    paddingBottom: 4,
  },
  clipWrap: { width: 56 },
  // 클립: 56×72 · rounded-xl
  clip: {
    width: 56,
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipTodo: {
    backgroundColor: CLIP_GLASS,
    borderWidth: theme.border.hairline,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  clipDone: { backgroundColor: CLIP_DONE_BG, borderWidth: theme.border.hairline, borderColor: 'rgba(255,255,255,0.28)' },
  // 활성: 테두리 2 · scale 1.05 · 글로우. RN 은 그림자 색을 안드로이드에서 못 써서
  // elevation 대신 테두리와 확대로 강조합니다(시안 boxShadow 의 역할).
  clipActive: {
    borderWidth: 2,
    borderColor: CLIP_ACTIVE,
    transform: [{ scale: 1.05 }],
  },
  clipFill: { width: '100%', height: '100%' },
  clipCheck: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.brand[600] },
  clipIndex: { ...text.chipLabel, fontSize: 15, lineHeight: 15, color: color.paper },
  // 재촬영 배지: 시안 -top-[21px] · 가운데 · px-2 py-[3px] · 10 semibold
  retake: {
    position: 'absolute',
    top: -21,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  retakeText: {
    ...text.nano,
    lineHeight: 12,
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: CLIP_ACTIVE,
    color: color.paper,
    overflow: 'hidden',
  },

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
