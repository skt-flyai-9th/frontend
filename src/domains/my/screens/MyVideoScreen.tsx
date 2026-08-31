/**
 * MyVideoScreen — 내 숏폼 전체화면 뷰어. 시안 `1_내숏폼목록.png`.
 *
 * 화면이 두 개인 구조입니다.
 *   마이페이지의 3열 그리드 → 썸네일 탭 → **이 화면**(전체화면 세로 재생)
 *   인스타그램 프로필과 같은 형태입니다. 탭바는 보이지 않습니다.
 *
 * API 15.2 `GET /stores/{storeId}/shorts` 의 항목을 그대로 받아 재생합니다.
 * 위아래로 넘겨 다음 영상으로 이동합니다.
 *
 * ✅ 하단 제목 (2026-08-26 해결)
 *    문의해 두었던 제목 컬럼이 15.2 응답에 `project_title` 로 추가됐습니다.
 *    AI 가 7.1 기획 때 지어주는 값이라 기획 전에는 null 이고, 그때는
 *    (2026-08-31 지시로 이 화면에서는 제목·가게 이름을 아예 걷어냈습니다 —
 *    자기 영상을 자기가 보는 자리라 다시 말해 줄 필요가 없습니다.)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator } from 'react-native';
import { ChevronLeft, Download, Upload } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { useSaveToGallery } from '../../../lib/useSaveToGallery';
import { useShareVideo } from '../../../lib/useShareVideo';
import { LoadGate } from '../../../ui/LoadGate';
import { EmptyState } from '../../../ui/Feedback';
import { useAppState } from '../../../lib/appState';
import { useStoreShorts } from '../../../api/queries/store';
import { color, radius, space, text } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';
import type { StoreShort } from '../../../api/schema/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MyVideo'>;

export default function MyVideoScreen({ route, navigation }: Props) {
  const startId = route.params?.videoOutputId;
  const storeId = useAppState((s) => s.storeId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const shorts = useStoreShorts(storeId ?? undefined);
  const items = shorts.data?.items ?? [];

  const startIndex = Math.max(
    0,
    items.findIndex((v) => v.videoOutputId === startId)
  );
  const [current, setCurrent] = useState(startIndex);

  return (
    <View style={[styles.fill, { backgroundColor: color.mediaBlack }]}>
      <LoadGate
        loading={shorts.isLoading}
        error={shorts.isError}
        ready={shorts.data !== undefined}
        onRetry={shorts.refetch}
        onBack={() => navigation.goBack()}
        loadingLabel="영상을 불러오는 중"
      >
        {items.length === 0 ? (
          <EmptyState
            title="아직 만든 숏폼이 없습니다"
            description="첫 영상을 만들면 여기에 모입니다."
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(v) => String(v.videoOutputId)}
            pagingEnabled
            initialScrollIndex={startIndex}
            getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
            showsVerticalScrollIndicator={false}
            /*
              🔴 **그리는 칸 수를 좁힙니다** (튕김 고침, 위 Reel 머리말 ②).
                 기본 21(앞뒤 10 장)이면 화면 밖 칸까지 잔뜩 살아 있습니다.
            */
            windowSize={3}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            removeClippedSubviews
            onMomentumScrollEnd={(e) =>
              setCurrent(Math.round(e.nativeEvent.contentOffset.y / height))
            }
            renderItem={({ item, index }) => (
              <Reel
                short={item}
                width={width}
                height={height}
                active={index === current}
                near={Math.abs(index - current) <= 1}
                bottomInset={insets.bottom}
              />
            )}
          />
        )}
      </LoadGate>

      {/*
        🔴 **뒤로가기 하나만 남겼습니다** (2026-08-31 지시: '그 위에 뒤로가기
           아이콘만. "내 숏폼" 삭제').

        어디서 눌러 들어왔는지 사장님이 알고 있는 자리라 제목이 할 일이 없습니다.
        영상 위에 얹히는 요소는 이제 이 버튼 하나뿐입니다(우리 파일이라 가능 —
        유튜브 임베드였다면 이것도 안 됩니다, CLAUDE.md §8-1).
      */}
      <View style={[styles.header, { top: insets.top }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.back}
        >
          <ChevronLeft size={24} strokeWidth={2} color={color.paper} />
        </Pressable>
      </View>
    </View>
  );
}

function Reel({
  short,
  width,
  height,
  active,
  near,
  bottomInset,
}: {
  short: StoreShort;
  width: number;
  height: number;
  /** 지금 보고 있는 칸인지 — 이 칸만 소리가 납니다 */
  active: boolean;
  /** 보고 있는 칸에서 한 장 안쪽인지. **여기까지만 플레이어를 만듭니다.** */
  near: boolean;
  bottomInset: number;
}) {
  /*
    🔴 **다 찍은 영상에도 저장 · 내보내기를 답니다** (2026-08-31 지시).

    내보내기 화면(`domains/edit/EditResultScreen`)에 있는 그 두 버튼과 **같은 것**
    입니다 — 같은 훅(`useSaveToGallery` · `useShareVideo`)을 씁니다. 여기서는
    올릴 문구(caption)가 없어서 저장 + 안내로만 떨어집니다.
  */
  /*
    무대 = **9:16 한 장.** 폭을 꽉 채우되, 버튼 칸이 모자라면 폭을 줄여 비율을 지킵니다.
      393×852 · 조작바 34  →  무대 393×699 · 흰 판 119
  */
  const full = Math.round((width * 16) / 9);
  /** 버튼 한 줄(48)과 위아래 최소 여백(16씩)은 남겨 둡니다. */
  const barMin = 48 + space[4] * 2;
  const stageH = Math.max(200, Math.min(full, height - bottomInset - barMin));
  const stageW = stageH >= full ? width : Math.round((stageH * 9) / 16);

  const { saving, saved, save } = useSaveToGallery();
  const { sharing, share } = useShareVideo();

  /*
    ─────────────────────────────────────────────────────────────
    🔴 **플레이어는 보고 있는 것 앞뒤 한 장까지만 만듭니다** (2026-08-31 지적:
       "마이페이지에서 숏폼 확인 중에 갑자기 앱 밖으로 나가진다")
    ─────────────────────────────────────────────────────────────
    예전에는 `useVideoPlayer` 가 **이 칸마다** 있었습니다. 훅이라 조건을 걸 수
    없어서, 목록이 그린 칸 수만큼 안드로이드 ExoPlayer 가 통째로 생겼습니다.
    FlatList 기본 `windowSize` 는 21 — 앞뒤 10 장씩입니다. 숏폼이 열댓 개만
    돼도 **디코더와 메모리가 동시에 열 몇 개씩** 잡힙니다.

    그 끝이 튕김입니다. 안드로이드는 이 상황에서 예외를 던지지 않고 **프로세스를
    그냥 죽입니다** — 그래서 오류 화면도 없이 "앱 밖으로 나가진" 것처럼 보입니다.
    자바스크립트 쪽에는 흔적이 안 남아 로그로도 안 잡힙니다.

    고침은 둘입니다.
      ① 영상을 자식(`ReelVideo`)으로 내려, **가까운 칸에만** 붙입니다.
         멀어지면 그 칸이 사라지면서 플레이어도 같이 풀립니다.
      ② 목록이 그리는 범위 자체를 좁힙니다 (`windowSize` 3).

    멀리 있는 칸은 표지 사진(`coverImageUrl`)만 남습니다 — 어차피 화면 밖이고,
    넘겨서 다가오면 그 전에 플레이어가 붙습니다.
  */

  return (
    <View style={{ width, height }}>
      {/*
        영상이 뜨기 전(또는 못 뜰 때) 검은 판만 남지 않게 커버 이미지를 깝니다.
        15.2 가 cover_image_url 을 주므로 지어내는 값이 아닙니다.
      */}
      {/*
        ─────────────────────────────────────────────────────────────
        🔴 **영상은 9:16 그대로, 화면 맨 위부터** (2026-08-31 지시:
           "상단 위에까지 세로로 긴 9:16 비율 유지한 채")
        ─────────────────────────────────────────────────────────────
        예전에는 영상이 화면 전체를 무대로 쓰고 `contain` 으로 들어가서, 위아래에
        **검은 띠**가 남았습니다. 이제 무대 자체를 9:16 으로 잘라 두므로 띠가
        생길 자리가 없습니다. 남는 세로는 전부 아래 흰 판이 가져갑니다.

        상태바 아래가 아니라 **화면 맨 위(y 0)** 에서 시작합니다 — 세로 영상을
        가장 크게 보여 주는 자리이고, 우리가 만든 파일이라 상태바가 겹쳐도
        괜찮습니다(유튜브 임베드였다면 안 됩니다 — CLAUDE.md §8-1).

        자리가 모자라면 **폭을 줄여** 비율을 지킵니다. 잘라서 맞추지 않습니다.
      */}
      <View style={[styles.stage, { height: stageH }]}>
        {/*
          영상이 뜨기 전(또는 못 뜰 때) 검은 판만 남지 않게 커버 이미지를 깝니다.
          15.2 가 cover_image_url 을 주므로 지어내는 값이 아닙니다.
        */}
        <View style={{ width: stageW, height: stageH }}>
          {short.coverImageUrl ? (
            <Image
              source={{ uri: short.coverImageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}

          {/*
            ⚠️ 주소가 비어 있을 수 있습니다 — 그때는 표지 사진만 남습니다
               (`StoreShort.videoUrl` 주석). 빈 주소로 플레이어를 만들면 죽습니다.
          */}
          {near && short.videoUrl ? <ReelVideo url={short.videoUrl} active={active} /> : null}
        </View>
      </View>

      {/*
        ─────────────────────────────────────────────────────────────
        🔴 **영상과 기기 조작바 사이의 흰 판. 버튼은 위아래 여백이 같습니다**
           (2026-08-31 지시)
        ─────────────────────────────────────────────────────────────
        `flex: 1` 로 남는 자리를 통째로 받고 `justifyContent: 'center'` 로 가운데에
        둡니다. 그러면 **위 여백과 아래 여백이 저절로 같습니다** — 숫자를 두 번
        적어 맞추면 화면 크기가 달라질 때마다 어긋납니다.

        아래 `paddingBottom` 은 그 "아래 여백" 을 재는 바닥을 **기기 조작바 위**로
        옮기는 것입니다. 이게 없으면 가운데 정렬의 기준이 화면 맨 아래가 되어
        버튼이 조작바 쪽으로 내려앉습니다.

        시스템 바를 숨기는 길도 있었지만 그러지 않았습니다 — 뒤로가기가 사라져
        사장님이 나갈 길을 잃습니다. 40~60대 사용자에게 제스처만 남기는 건 위험합니다.
      */}
      <View style={[styles.info, { paddingBottom: bottomInset }]}>
        {/* 내보내기 화면과 같은 두 개 — 저장이 먼저, 내보내기가 뒤 */}
        <View style={styles.actionRow}>
          <Button
            label={saved ? '저장됨' : '기기에 다운로드'}
            variant="secondary"
            icon={Download}
            loading={saving}
            disabled={!short.videoUrl}
            style={styles.actionBtn}
            onPress={() => short.videoUrl && save(short.videoUrl, short.videoOutputId)}
          />
          <Button
            label={sharing ? '준비 중…' : '내보내기'}
            icon={Upload}
            disabled={!short.videoUrl || sharing}
            style={styles.actionBtn}
            onPress={() =>
              short.videoUrl &&
              share({
                videoUrl: short.videoUrl,
                fileKey: short.videoOutputId,
                fallback: () => save(short.videoUrl, short.videoOutputId),
              })
            }
          />
        </View>
      </View>
    </View>
  );
}

/**
 * 영상 한 장. **가까운 칸에만 붙습니다** (위 Reel 머리말 참고).
 * 사라지면 `useVideoPlayer` 가 정리되면서 네이티브 플레이어도 같이 풀립니다.
 */
function ReelVideo({ url, active }: { url: string; active: boolean }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
  });
  const started = useRef(false);

  /**
   * 로드 상태를 화면에 드러냅니다.
   * 실기기(2026-08-24)에서 영상 URL 이 죽어 있을 때 아무 표시 없이 "0초" 로만
   * 보였습니다 — 조용한 실패 금지 원칙 위반입니다.
   */
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setLoadState('ready');
      else if (status === 'error') setLoadState('error');
      else if (status === 'loading') setLoadState('loading');
    });
    return () => sub.remove();
  }, [player]);

  // 보이는 영상만 재생합니다. 전부 틀면 소리가 겹치고 메모리도 터집니다.
  if (active && !started.current) {
    started.current = true;
    player.play();
  }
  if (!active && started.current) {
    started.current = false;
    player.pause();
  }

  return (
    <>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="contain"
        nativeControls={false}
      />
      {loadState === 'loading' && (
        <View style={styles.stateOverlay}>
          <ActivityIndicator color={color.paper} />
          <Text style={[text.bodySmall, { color: color.paper }]}>영상을 불러오는 중…</Text>
        </View>
      )}
      {loadState === 'error' && (
        <View style={styles.stateOverlay}>
          <Text style={[text.bodySmall, { color: color.paper, textAlign: 'center' }]}>
            영상을 불러오지 못했습니다.{'\n'}신호를 확인하고 다시 열어 주세요.
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // 시안: h-11(44) px-4 · 뒤로 36 · 제목 절대 중앙
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    zIndex: 20,
  },
  // 시안: -ml-1.5 · 36 원형
  back: {
    width: 36,
    height: 36,
    marginLeft: -6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* 시안 내보내기와 같은 줄 — h-12 두 개, 사이 12 */
  actionRow: { flexDirection: 'row', gap: space[3] },
  actionBtn: { flex: 1 },
  /*
    시안의 어두운 스크림 대신 **불투명 흰 판**입니다 (2026-08-31 지시).
    글자가 사라져 버튼만 남았으므로 위쪽 여백도 space[6](24) → space[4](16) 로
    줄입니다 — 안 줄이면 버튼 위에 빈 흰 띠만 남습니다.
  */
  /* 9:16 무대. 폭이 줄면 양옆은 영상과 같은 검정으로 채워 이음매를 감춥니다. */
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: color.mediaBlack,
  },
  /* 남는 자리를 전부 받아 버튼을 가운데 둡니다 — 위아래 여백이 저절로 같아집니다. */
  info: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[5],
    backgroundColor: color.paper,
  },
  stateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
  },
});
