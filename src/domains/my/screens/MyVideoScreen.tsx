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
 *    `promotion_purpose` 로 대체합니다 — 그 분기는 lib/format 의 projectLabel 이 담당합니다.
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
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { LoadGate } from '../../../ui/LoadGate';
import { EmptyState } from '../../../ui/Feedback';
import { useAppState } from '../../../lib/appState';
import { useStore } from '../../../api/queries/store';
import { useStoreShorts } from '../../../api/queries/store';
import { projectLabel } from '../../../lib/format';
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
  const { data: store } = useStore(storeId ?? undefined);
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
            onMomentumScrollEnd={(e) =>
              setCurrent(Math.round(e.nativeEvent.contentOffset.y / height))
            }
            renderItem={({ item, index }) => (
              <Reel
                short={item}
                width={width}
                height={height}
                active={index === current}
                storeName={store?.name ?? '우리 가게'}
                logoUrl={store?.logoUrl}
                bottomInset={insets.bottom}
              />
            )}
          />
        )}
      </LoadGate>

      {/* 뒤로가기 — 영상 위에 얹히는 유일한 요소입니다 (유튜브 임베드가 아니라 우리 파일) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="뒤로"
        onPress={() => navigation.goBack()}
        hitSlop={12}
        style={[styles.back, { top: insets.top + space[2] }]}
      >
        <ChevronLeft size={26} strokeWidth={2} color={color.paper} />
      </Pressable>
    </View>
  );
}

function Reel({
  short,
  width,
  height,
  active,
  storeName,
  logoUrl,
  bottomInset,
}: {
  short: StoreShort;
  width: number;
  height: number;
  active: boolean;
  storeName: string;
  logoUrl?: string;
  bottomInset: number;
}) {
  const player = useVideoPlayer(short.videoUrl, (p) => {
    p.loop = true;
  });
  const started = useRef(false);

  /**
   * 로드 상태를 화면에 드러냅니다.
   * 실기기(2026-08-24)에서 영상 URL 이 죽어 있을 때 아무 표시 없이 "0초" 로만
   * 보였습니다 — 조용한 실패 금지 원칙 위반입니다. 이제 로딩 중엔 스피너,
   * 실패면 이유가 글자로 뜹니다.
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
    <View style={{ width, height }}>
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

      {/* 하단 정보. 글자가 영상에 묻히지 않도록 어두운 판 위에 올립니다. */}
      <View style={[styles.info, { paddingBottom: Math.max(bottomInset, space[4]) }]}>
        <View style={styles.storeRow}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]} />
          )}
          <Text style={[text.bodySmall, { color: color.paper }]} numberOfLines={1}>
            {storeName}
          </Text>
        </View>
        {/* 명세 15.2 project_title (2026-08-26). 7.1 전이면 null 이라 목적으로 대체됩니다. */}
        <Text style={[text.subheading, { color: color.paper }]} numberOfLines={2}>
          {projectLabel(short)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: {
    position: 'absolute',
    left: space[3],
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space[2],
    paddingHorizontal: space[5],
    paddingTop: space[6],
    backgroundColor: color.overlay.scrim,
  },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
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
  avatar: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: color.ink[300] },
  avatarEmpty: { opacity: 0.5 },
});
