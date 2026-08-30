/**
 * HomeFeedScreen — 홈 탭. **한 화면에 영상 한 편**을 틀고 세로로 넘겨 봅니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 2026-08-26 — 카드 목록에서 한 편씩 보는 피드로 바꿨습니다 (사장님 지시)
 * ─────────────────────────────────────────────────────────────
 * 예전에는 카드를 쌓은 목록이었고 영상은 **정지 썸네일**이었습니다. 유튜브 임베드
 * 약관이 한 화면에 자동재생 플레이어를 **하나로** 제한해서, 목록에서는 자동재생을
 * 켤 수 없었기 때문입니다.
 *
 * 한 화면에 한 편만 두면 그 제한 안에서 자동재생이 됩니다. **지금 보고 있는 장만**
 * 플레이어이고 위아래는 썸네일이라, 화면에 자동재생 플레이어는 언제나 하나입니다.
 * 제목·해시태그·하트·촬영 버튼은 전부 **영상 아래 띠**에 둡니다 — 영상 위에 얹으면
 * 약관 위반입니다. 자세한 근거는 `FeedPage` 머리말.
 *
 * ⚠️ 시안(V4·6차)의 홈은 카드 격자입니다. **일부러 다르게 만든 화면**이고,
 *    디자인 기조(색·모서리·타이포·간격 토큰)만 그대로 두었습니다.
 *
 * - API 5.1 GET /video-formats (sort=trending). 프로젝트 없이 둘러보는 피드라
 *   project_id 는 보내지 않습니다.
 * - 하트: 5.3 찜 토글 (낙관적, 멱등이라 안전)
 * - 화살표: BE 확정 흐름 — 포맷 선택 → 목적 선택 → 4.1 생성 → 7.1 기획.
 * - 썸네일 탭: FormatDetail 둘러보기 모드 (projectId 없이)
 *
 * 시안 대조 사항
 *   헤더    HomeHeader — 알림 벨(좌·안읽음 점) · 중앙 로고 22 · 메뉴(우)
 *   헤드라인 목록 **안쪽** 첫 카드 위. 스크롤하면 같이 올라갑니다.
 *   구분    카드 사이는 여백이 아니라 surface 색 8px 띠입니다.
 *   당겨서 새로고침 · 로딩은 스피너가 아니라 스켈레톤
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { LoadGate } from '../../../ui/LoadGate';
import { EmptyState, Skeleton } from '../../../ui/Feedback';
import { FeedPage } from '../FeedPage';
import { useChrome } from '../../../ui/ChromeContext';
import { useCoach } from '../../../ui/coach/CoachContext';
import { useVideoFormats, useToggleFavorite } from '../../../api/queries/project';
import { color, radius, sizing, space, text } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';
import type { VideoFormat } from '../../../api/schema/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/*
 * v3: 헤드라인 블록이 제거됐습니다.
 * 헤더 아래에서 카드가 바로 시작합니다 — 첫 화면에서 미디어가 차지하는 면적을
 * 최대로 두려는 의도입니다. 안내 문구는 기획서 9.6 에서 홈이 아니라
 * 빈 상태에서만 말하도록 정리됐습니다.
 */

/** 시안 FeedSkeleton — 카드 두 장 분량의 자리를 먼저 잡아 둡니다. */
function FeedSkeleton() {
  return (
    <View>
      {[0, 1].map((i) => (
        <View key={i} style={styles.skelCard}>
          <View style={styles.headline}>
            <Skeleton style={styles.skelTitle} />
            <Skeleton style={styles.skelSub} />
          </View>
          <Skeleton style={styles.skelMedia} />
          <View style={styles.skelMeta}>
            <View style={{ flex: 1, gap: space[2] }}>
              <Skeleton style={styles.skelLineWide} />
              <Skeleton style={styles.skelLineNarrow} />
            </View>
            <Skeleton style={styles.skelDot} />
            <Skeleton style={styles.skelDot} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function HomeFeedScreen() {
  const nav = useNavigation<Nav>();
  const formats = useVideoFormats({ sort: 'trending' });
  const toggle = useToggleFavorite();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  /** 지금 보고 있는 장. 이 값이 바뀌면 재생하는 플레이어도 옮겨갑니다. */
  const [index, setIndex] = useState(0);

  /*
    ─────────────────────────────────────────────────────────────
    🔴 **보는 동안은 앱바·탭바를 치웁니다** (2026-08-30 사장님 지시)
    ─────────────────────────────────────────────────────────────
    이유와 산수는 `ui/ChromeContext.tsx` 머리말에 다 적어 뒀습니다. 요지만:
    영상이 안 잘리려면 앱바 44 · 선반 56 · 탭바 49 중 **하나만** 남길 수 있고,
    촬영 버튼이 든 선반을 남겼습니다. 남는 둘이 치워지면 무대가 615 → 699 로
    커져 **잘림이 0** 이 됩니다.

    켜고 끄는 시점:
      · 손가락을 대면(스크롤 시작) 나타납니다 — 탭을 옮기려는 참일 테니까요.
      · 멈추고 잠깐 지나면 다시 치워집니다.
      · 홈을 벗어나면 즉시 되돌립니다 — 다른 탭에서 탭바가 없으면 안 됩니다.
      · 튜토리얼이 도는 동안은 잠급니다(코치마크가 탭바 아이콘을 짚습니다).
  */
  const chrome = useChrome();
  const focused = useIsFocused();
  const coachRunning = useCoach()?.activeName != null;
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showChrome = () => {
    if (settle.current) clearTimeout(settle.current);
    chrome.setHidden(false);
  };
  /** 멈춘 뒤 잠깐 두었다가 치웁니다 — 손을 떼자마자 사라지면 화들짝합니다. */
  const hideChromeSoon = () => {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => chrome.setHidden(true), 900);
  };

  // 홈에 있는 동안만 치웁니다. 나가면 바로 되돌리고 예약도 취소합니다.
  const feedReady = formats.data !== undefined;
  useEffect(() => {
    if (!focused) {
      if (settle.current) clearTimeout(settle.current);
      chrome.setHidden(false);
      return;
    }
    // 자료가 오기 전에 치우면 빈 화면에서 바만 사라져 고장 난 것처럼 보입니다.
    if (feedReady) hideChromeSoon();
    return () => {
      if (settle.current) clearTimeout(settle.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, feedReady]);

  // 튜토리얼이 도는 동안은 무조건 보입니다.
  useEffect(() => {
    chrome.setLocked(coachRunning);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachRunning]);

  /*
   * ⚠️ 이 둘은 **ref 로 고정해야 합니다.** FlatList 는 `viewabilityConfig` 와
   *    `onViewableItemsChanged` 가 렌더마다 새 객체로 바뀌면 예외를 냅니다
   *    ("Changing onViewableItemsChanged on the fly is not supported").
   */
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setIndex(first.index);
  });

  const onToggleFavorite = (f: VideoFormat) =>
    toggle.mutate({ formatId: f.id, next: !f.isFavorite });

  const onCreate = (f: VideoFormat) =>
    nav.navigate('Create', { screen: 'PurposeSelect', params: { formatId: f.id } });

  /*
    🔴 **접을 때 자리까지 비웁니다.** `height: 0` 이라 아래가 그만큼 올라옵니다.
       `position: absolute` 로 영상 **위에 띄우면 약관 위반**입니다 —
       근거는 `ui/ChromeContext.tsx` 머리말과 CLAUDE.md §8-1.
  */
  const header = chrome.hidden ? (
    <View style={{ height: 0, overflow: 'hidden' }} />
  ) : (
    <AppBar
      home={{
        /*
         * 벨(알림)은 **길을 닫아 뒀습니다** (2026-08-26, 사장님 지시).
         * 시안 6차에서 `notifications` 화면이 라우터·DEPTH·PUSH_SCREENS 에서 전부
         * 빠졌습니다. 화면 코드와 라우트는 **지우지 않고 남겨** 두고 들어가는 버튼만
         * 감춥니다. 되살리려면 여기에 `onBell` 을 돌려주고 설정 목록의 '알림' 을 풉니다.
         */
        // 설정은 시안에 탭바가 없어 탭 밖(Root)에 있습니다.
        onMenu: () => nav.navigate('Settings'),
      }}
    />
  );

  /*
   * 한 장의 높이 = 화면에서 상태바·앱바·탭바를 뺀 나머지.
   * 이 값이 정확해야 `pagingEnabled` 가 딱 한 장씩 멈춥니다 — 어긋나면 두 장이
   * 걸친 상태로 서고, 그러면 자동재생 플레이어가 화면에 둘 보이게 됩니다.
   */
  /*
    치워진 바는 빼지 않습니다 — 그만큼 한 장이 커집니다.
      바 있음 852 − 54 − 44 − 49 − 34 = 671
      바 없음 852 − 54 −  0 −  0 − 34 = 764   ← 영상 699 + 띠 65
  */
  const pageHeight = Math.max(
    320,
    height -
      insets.top -
      (chrome.hidden ? 0 : sizing.appBarHeight) -
      (chrome.hidden ? 0 : sizing.tabRowHeight) -
      insets.bottom
  );

  /*
    🔴 **한 장의 높이가 바뀌면 스크롤 위치를 같이 옮겨야 합니다.**

    `snapToInterval` 과 `getItemLayout` 이 이 값을 씁니다. 바뀐 값으로 다시
    계산되는데 스크롤 오프셋은 옛 값(index × 671)에 머물러 있으면, 목록이
    **두 장에 걸친 채로** 섭니다. 같은 장이 계속 맨 위에 오도록 밀어 줍니다.

    ✅ 걸쳐 있어도 자동재생 플레이어는 여전히 하나입니다 — 보고 있는 장만
       `active` 라 나머지는 썸네일입니다(FeedPage 머리말 ①). 약관은 안전합니다.
  */
  const listRef = useRef<FlatList<VideoFormat>>(null);
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: index * pageHeight, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageHeight]);

  // 첫 로딩은 스피너 대신 스켈레톤으로 — 무엇이 올지 미리 보입니다.
  if (formats.isLoading && !formats.data) {
    return (
      <Screen padded={false} scroll={false} edges={['top']}>
        {header}
        <FeedSkeleton />
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll={false} edges={['top']}>
      {header}

      <LoadGate
        loading={false}
        error={formats.isError}
        // 빈 목록은 정상입니다(EmptyState 로 처리). 응답 자체가 없을 때만 실패입니다.
        ready={formats.data !== undefined}
        onRetry={formats.refetch}
      >
        {(formats.data ?? []).length === 0 ? (
          /*
           * ⚠️ 예전 문구는 "가게 정보를 채우면 골라 드려요" 였습니다. 그런데 이 목록이
           *    비는 주된 이유는 **서버에 포맷이 아직 없어서**입니다. 그 상태에서 가게
           *    정보를 채우라고 하면 해도 소용없는 일을 시키는 겁니다.
           */
          <EmptyState
            title="아직 추천할 숏폼이 없습니다"
            description="준비되는 대로 여기에 채워집니다. 조금 뒤에 다시 열어 보세요."
            actionLabel="다시 불러오기"
            onAction={() => formats.refetch()}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={formats.data ?? []}
            keyExtractor={(f) => String(f.id)}
            showsVerticalScrollIndicator={false}
            // 손가락을 대면 바가 돌아오고, 멈추고 잠깐 지나면 다시 치워집니다.
            onScrollBeginDrag={showChrome}
            onScrollEndDrag={hideChromeSoon}
            onMomentumScrollEnd={hideChromeSoon}
            // 한 장씩 딱 멈춥니다 — 화면에 플레이어가 하나만 보이게 하는 핵심입니다.
            pagingEnabled
            snapToInterval={pageHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            getItemLayout={(_d, i) => ({
              length: pageHeight,
              offset: pageHeight * i,
              index: i,
            })}
            /*
             * 어느 장을 보고 있는지 판정. 60% 이상 보이면 그 장으로 봅니다 —
             * 손가락을 떼는 순간이 아니라 화면 점유로 재므로, 천천히 넘겨도 정확합니다.
             */
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged.current}
            refreshControl={
              <RefreshControl
                refreshing={formats.isFetching && !formats.isLoading}
                onRefresh={() => formats.refetch()}
                tintColor={color.brand[600]}
                colors={[color.brand[600]]}
              />
            }
            renderItem={({ item, index: i }) => (
              <FeedPage
                format={item}
                height={pageHeight}
                width={width}
                active={i === index}
                onToggleFavorite={onToggleFavorite}
                onCreate={onCreate}
              />
            )}
          />
        )}
      </LoadGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 시안: bg-canvas px-4 pt-4 pb-1
  headline: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[1],
    gap: space[1],
    backgroundColor: color.canvas,
  },
  listContent: { paddingBottom: space[6] },
  separator: { height: 8, backgroundColor: color.surface },

  skelCard: { paddingBottom: space[4], borderBottomWidth: 8, borderBottomColor: color.surface },
  skelTitle: { height: 18, width: 120, borderRadius: radius.xs },
  skelSub: { height: 13, width: 220, borderRadius: radius.xs },
  skelMedia: { width: '100%', aspectRatio: 4 / 5, marginTop: space[3], borderRadius: 0 },
  skelMeta: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingTop: 14 },
  skelLineWide: { height: 15, width: '55%', borderRadius: radius.xs },
  skelLineNarrow: { height: 12, width: '40%', borderRadius: radius.xs },
  skelDot: { width: 36, height: 36, borderRadius: radius.pill },
});
