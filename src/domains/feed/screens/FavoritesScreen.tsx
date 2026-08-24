/**
 * FavoritesScreen — 관심목록 탭. 시안 `SavedScreen` 대조 이식.
 *
 * API 5.3 (2026-08-23 신설). 찜은 계정 단위입니다 — 가게를 바꿔도 목록이 같습니다.
 *
 * 시안 대조 사항
 *   구조   카드 리스트가 아니라 **3열 그리드**(3:4 타일 · 간격 3px)입니다.
 *   헤더   중앙 "관심 목록" + 우측 "선택" 글자 버튼
 *   선택 모드 타일에 브랜드색 안쪽 링, 하단에 "좋아요 취소(N개)" 막대
 *
 * ⚠️ 시안은 타일을 누르면 곧장 촬영으로 갑니다. 우리는 FormatDetail 로 보냅니다 —
 *    시안에 없는 상세 화면이 우리에겐 있고, 거기서 참고 영상을 본 뒤
 *    "이 방법으로 만들기" 로 이어지기 때문입니다. 눌러서 도달하는 곳은 결국 같습니다.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { LoadGate } from '../../../ui/LoadGate';
import { StateBlock } from '../../../ui/Feedback';
import { VideoThumbnail } from '../../../ui/VideoThumbnail';
import { pressTap } from '../../../ui/press';
import { useFavorites, useToggleFavorite } from '../../../api/queries/project';
import theme, { color, radius, space, text } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** 시안 gap-[3px] — 타일 사이 3px */
const GAP = 3;
const COLS = 3;

export default function FavoritesScreen() {
  const nav = useNavigation<Nav>();
  const favorites = useFavorites();
  const toggle = useToggleFavorite();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  const items = useMemo(() => favorites.data ?? [], [favorites.data]);

  const exitSelect = () => {
    setSelectMode(false);
    setSelected([]);
  };
  const toggleSelect = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const removeSelected = () => {
    // 낙관적 토글이라 목록에서 즉시 빠집니다 (5.3 은 멱등).
    selected.forEach((id) => toggle.mutate({ formatId: id, next: false }));
    exitSelect();
  };

  return (
    <Screen padded={false} scroll={false} edges={['top']}>
      <AppBar
        title="관심 목록"
        right={
          items.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={selectMode ? '선택 마치기' : '선택 모드'}
              hitSlop={8}
              onPress={() => (selectMode ? exitSelect() : setSelectMode(true))}
              style={({ pressed }) => [pressTap(pressed, 'icon')]}
            >
              <Text style={styles.selectBtn}>{selectMode ? '완료' : '선택'}</Text>
            </Pressable>
          ) : undefined
        }
      />

      <LoadGate
        loading={favorites.isLoading}
        error={favorites.isError}
        // 빈 목록은 정상입니다(StateBlock 으로 처리). 응답 자체가 없을 때만 실패입니다.
        ready={favorites.data !== undefined}
        onRetry={favorites.refetch}
        loadingLabel="찜한 목록을 불러오고 있어요"
      >
        {items.length === 0 ? (
          <StateBlock
            icon={Heart}
            title="아직 담은 숏폼이 없어요"
            body="홈에서 마음에 드는 숏폼의 하트를 눌러보세요."
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(f) => String(f.id)}
            numColumns={COLS}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: GAP }}
            ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const on = selected.includes(item.id);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={
                    selectMode ? (on ? '선택 해제' : '선택') : `${item.formatTitle} 자세히 보기`
                  }
                  onPress={() =>
                    selectMode
                      ? toggleSelect(item.id)
                      : nav.navigate('Create', {
                          screen: 'FormatDetail',
                          params: { formatId: item.id },
                        })
                  }
                  style={({ pressed }) => [styles.cell, pressTap(pressed, 'card')]}
                >
                  <VideoThumbnail
                    url={item.referenceUrl}
                    platform={item.sourcePlatform}
                    aspectRatio={3 / 4}
                    style={styles.thumb}
                  />
                  {selectMode ? (
                    <View pointerEvents="none" style={[styles.ring, on && styles.ringOn]} />
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}
      </LoadGate>

      {selectMode && selected.length > 0 ? (
        <View style={styles.removeBar}>
          <Pressable
            accessibilityRole="button"
            onPress={removeSelected}
            style={({ pressed }) => [styles.removeBtn, pressTap(pressed, 'button')]}
          >
            <Text style={styles.removeText}>좋아요 취소({selected.length}개)</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  selectBtn: {
    ...text.body,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.brand[600],
  },
  grid: { padding: GAP, paddingBottom: space[8] },
  // numColumns 는 각 셀을 균등 분배합니다. flex:1 로 남는 폭을 나눠 갖게 합니다.
  cell: { flex: 1 / COLS, aspectRatio: 3 / 4 },
  thumb: { width: '100%', height: '100%', borderRadius: radius.tile },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.tile,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
  },
  ringOn: { borderWidth: 3, borderColor: color.brand[600] },
  removeBar: {
    borderTopWidth: theme.border.hairline,
    borderTopColor: color.ink[200],
    backgroundColor: color.canvas,
    paddingHorizontal: space[5],
    paddingVertical: space[3],
  },
  removeBtn: { alignItems: 'center', paddingVertical: space[2] },
  removeText: {
    ...text.subheading,
    color: color.danger[500],
  },
});
