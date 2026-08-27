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
import { View, Text, FlatList, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { LoadGate } from '../../../ui/LoadGate';
import { VideoThumbnail } from '../../../ui/VideoThumbnail';
import { representativeVideoUrl } from '../../../api/formatVideo';
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
  const { width } = useWindowDimensions();
  /**
   * 타일 폭을 직접 계산합니다.
   *
   * flex: 1/3 으로 두면 **그 줄에 몇 개가 있느냐**에 따라 폭이 달라집니다.
   * flex 는 남은 공간의 비율이라, 마지막 줄에 두 개만 있으면 둘이 절반씩
   * 나눠 가져 타일이 커집니다(그래서 화면이 시안보다 컸습니다).
   * 시안은 CSS grid 라 개수와 무관하게 항상 1/3 입니다.
   */
  const cellWidth = (width - GAP * 2 - GAP * (COLS - 1)) / COLS;
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
    /*
     * 시안은 헤더가 absolute 라 그리드가 **헤더 밑으로 파고듭니다**
     * (grid 는 pt-[86px] 인데 헤더는 98 높이 — 첫 줄 위 12 가 헤더에 가립니다).
     * 그래야 스크롤할 때 타일이 반투명 헤더 아래로 지나갑니다.
     * Screen 은 첫 자식이 AppBar 일 때만 위로 빼내므로, 여기서는 일부러
     * 마지막에 두고 직접 덮어 씌웁니다.
     */
    <Screen padded={false} scroll={false} edges={['top']}>
      <View style={styles.stack}>
        {renderBody()}
        <View style={styles.headerLayer}>
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
        </View>
      </View>

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

  function renderBody() {
    return (
      <LoadGate
        loading={favorites.isLoading}
        error={favorites.isError}
        // 빈 목록은 정상입니다(StateBlock 으로 처리). 응답 자체가 없을 때만 실패입니다.
        ready={favorites.data !== undefined}
        onRetry={favorites.refetch}
        loadingLabel="찜한 목록을 불러오고 있어요"
      >
        {items.length === 0 ? (
          /*
            시안 9차 원문 (`js/screens-tabs.jsx:76`)

              <div className="flex flex-col items-center gap-4 px-6 pt-24 text-center">
                <div className="h-14 w-14 rounded-2xl bg-brand-tint">하트 26</div>
                <p className="text-[15px] font-medium leading-relaxed text-slate-muted">
                  아직 담은 콘텐츠가 없어요.<br />홈에서 마음에 드는 숏폼에 좋아요를 눌러보세요.</p>
              </div>

            공용 `StateBlock` 을 쓰지 않습니다 — 그건 제목을 18·bold 로 굵게 뽑는데
            **시안에는 굵은 제목이 없습니다.** 15 medium 회색 두 줄이 전부입니다.
          */
          <View style={styles.empty}>
            <View style={styles.emptyTile}>
              <Heart size={26} strokeWidth={1.75} color={color.brand[600]} />
            </View>
            <Text style={styles.emptyText}>
              {'아직 담은 콘텐츠가 없어요.\n홈에서 마음에 드는 숏폼에 좋아요를 눌러보세요.'}
            </Text>
          </View>
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
                  style={({ pressed }) => [
                    styles.cell,
                    { width: cellWidth },
                    pressTap(pressed, 'card'),
                  ]}
                >
                  <VideoThumbnail
                    url={representativeVideoUrl(item)}
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
    );
  }
}

const styles = StyleSheet.create({
  selectBtn: {
    ...text.body,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.brand[600],
  },
  stack: { flex: 1 },
  // 시안 header 는 absolute inset-x-0 top-0 z-30 입니다.
  headerLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 },
  /**
   * 시안 9차: 스크롤 컨테이너 `pt-[104px]` + 그리드 자체 `pt-[3px]` → **첫 줄 top 107**.
   * 헤더 바닥이 98(안전영역 54 + h-11 44)이므로 **9 가 비는 것이 맞습니다.**
   *
   * 🔴 2026-08-27 정정: 32(= 바깥 기준 86)이 들어가 있었습니다. 6차 시절의 `pt-[86px]`
   *    을 그대로 둔 값인데, 그러면 첫 줄 위 12 가 헤더 **아래로 파고들어 타일 윗부분이
   *    잘려 보입니다.** 사장님이 실기기에서 잡아 주셨습니다.
   *    안전영역(54) 안쪽 기준 = 107 - 54 = **53**.
   */
  grid: { paddingTop: 53, paddingHorizontal: GAP, paddingBottom: space[10] },
  /**
   * 빈 목록 — 시안은 헤더에서 **102 아래**에서 시작합니다.
   *
   * 시안: 스크롤 컨테이너 `pt-[104px]` + 빈 상태 `pt-24`(96) → 아이콘 top 200.
   *       헤더 바닥이 98 이므로 200 - 98 = **102**.
   * 우리: 이 영역은 안전영역 안쪽이고 헤더가 위 44 를 덮으므로 44 + 102 = **146**.
   *
   * 🔴 2026-08-27: 전에는 위 여백이 없어 하트와 글자가 헤더에 거의 붙어 있었습니다
   *    (사장님 지적). 공용 StateBlock 의 위아래 여백 40 이 전부였습니다.
   */
  empty: { alignItems: 'center', gap: space[4], paddingHorizontal: space[6], paddingTop: 146 },
  // 시안: h-14 w-14(56) · rounded-2xl(16) · bg-brand-tint
  emptyTile: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.brand[50],
  },
  // 시안: 15 · font-medium · leading-relaxed(1.625 → 24.4) · slate-muted · 가운데
  emptyText: {
    ...text.body,
    lineHeight: 24.4,
    color: color.ink[500],
    textAlign: 'center',
  },
  // 폭은 화면에서 계산해 넣습니다(위 cellWidth 주석 참고). 시안 aspect-[3/4].
  cell: { aspectRatio: 3 / 4 },
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
