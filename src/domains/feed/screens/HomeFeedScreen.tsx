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
import { showsAppBar, showsShelf, useChrome } from '../../../ui/ChromeContext';
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
    🔴 **바는 한 번에 하나만** (2026-08-31, 사장님 안)
    ─────────────────────────────────────────────────────────────
    영상이 폭을 꽉 채우면서 안 잘리려면 무대가 699 여야 하는데, 바에 줄 수 있는
    예산은 65 뿐입니다. 앱바 44 · 선반 56 · 탭바 49 는 **하나씩이면** 다 들어가고
    둘만 겹쳐도 넘칩니다. 산수는 `ui/ChromeContext.tsx` 머리말.

    어느 모드에서든 영상은 **393×699 · 잘림 0 · 옆 여백 0** 입니다.

    무엇으로 바꾸나 — **새 손짓을 만들지 않았습니다.** 이미 있는 손짓에 얹습니다.
    영상 위에는 터치 판을 못 놓기 때문입니다(약관: 쇼츠 자체 조작을 막게 됩니다).

    규칙은 한 줄입니다 — **손짓 방향 = 바가 있는 쪽.**

      멈춰서 보고 있으면          선반    촬영 버튼이 늘 손에 있습니다
      위로 밀면 (다음 영상)       앱바    앱바는 **위**에 있습니다
      아래로 당기면 (이전 영상)   탭바    탭바는 **아래**에 있습니다

    ⚠️ 예전에는 "넘기면 탭바 · 맨 위에서 당기면 앱바" 였습니다(2026-08-31 오전).
       그러면 **앱바를 맨 첫 영상에서만** 부를 수 있고, 방향과 바 위치도 어긋납니다.
       방향으로 가르면 피드 어디서든 둘 다 부를 수 있고 외우기도 쉽습니다
       (사장님 지적).

    ⚠️ **모드는 목록이 서 있을 때만 바꿉니다.** 끄는 도중에 바꾸면 한 장의 높이가
       손가락 밑에서 변해 페이징이 어긋납니다. 그래서 넘김이 **끝난 뒤**
       (`onMomentumScrollEnd`) 와, 맨 위에서 더 당길 때(오프셋 0 이라 높이가 바뀌어도
       자리가 안 틀어짐)에만 겁니다.
  */
  const chrome = useChrome();
  const focused = useIsFocused();
  const coachRunning = useCoach()?.activeName != null;
  const back = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
    ⚠️ **`onMomentumScrollEnd` 하나에 걸면 웹에서 확인이 안 됩니다.**
       react-native-web 의 ScrollView 는 `onScroll` 만 부르고
       `onMomentumScrollEnd`·`onScrollBeginDrag`·`onScrollEndDrag` 는 **발화하지
       않습니다** (`node_modules/react-native-web/dist/exports/ScrollView/ScrollViewBase.js`
       의 `handleScroll`/`handleScrollEnd` — onScroll 만 부릅니다).
       그래서 방향과 멈춤을 **`onScroll` 만으로** 판정합니다. 기기·웹 어느 쪽에서나
       똑같이 돕니다. 끌기 여부는 네이티브에만 오는 두 이벤트로 **잠그기만** 합니다.
  */
  /** 직전 스크롤 위치 */
  const lastY = useRef(0);
  /** 마지막으로 움직인 방향이 가리키는 바 */
  const dirBar = useRef<'tabs' | 'appbar'>('tabs');
  /** 스크롤이 멎었는지 재는 시계 */
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 손가락이 아직 닿아 있는지 (네이티브에만 옵니다. 웹은 늘 false) */
  const dragging = useRef(false);

  /** 잠깐 다른 바를 보여 줬다가 선반으로 돌아옵니다. */
  const flash = (m: 'tabs' | 'appbar') => {
    if (back.current) clearTimeout(back.current);
    chrome.setMode(m);
    back.current = setTimeout(() => chrome.setMode('shelf'), 1600);
  };

  // 홈에 있는 동안만 바를 갈아 끼웁니다. 나가면 원래대로 돌려놓습니다.
  useEffect(() => {
    if (!focused) {
      if (back.current) clearTimeout(back.current);
      chrome.setMode('all');
      return;
    }
    chrome.setMode('shelf');
    return () => {
      if (back.current) clearTimeout(back.current);
      if (settle.current) clearTimeout(settle.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  // 튜토리얼이 도는 동안은 셋 다 보입니다 — 코치마크가 탭바와 선반을 같이 짚습니다.
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
  const header = !showsAppBar(chrome.mode) ? (
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
      (showsAppBar(chrome.mode) ? sizing.appBarHeight : 0) -
      (chrome.mode === 'tabs' || chrome.mode === 'all' ? sizing.tabRowHeight : 0) -
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
    const offset = index * pageHeight;
    listRef.current?.scrollToOffset({ offset, animated: false });
    /*
      🔴 **내가 옮긴 것을 손짓으로 오인하면 안 됩니다** (2026-08-31).

      이 보정도 스크롤 이벤트를 냅니다. 그걸 방향 판정이 그대로 먹으면
      `모드 바뀜 → 높이 바뀜 → 보정 → 또 모드 바뀜` 으로 **고리가 돕니다.**
      실제로 그렇게 나왔습니다 — 위로 밀었는데 앱바(720)로 갔다가 그 보정이
      아래 방향으로 읽혀 탭바(715)로 튕기고 거기서 굳었습니다.

      기준점을 보정한 자리로 미리 옮겨 두면 다음 이벤트의 차이가 0 이 되어
      판정이 안 걸립니다. 예약된 판정도 함께 취소합니다.
    */
    lastY.current = offset;
    if (settle.current) clearTimeout(settle.current);
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
            /*
              **손짓 방향 = 바가 있는 쪽** (위 주석).
                위로 밀어 다음 영상   → 앱바(위)
                아래로 당겨 이전 영상 → 탭바(아래)
              방향은 **끌기 시작한 자리와 끝난 자리를 비교**해서 봅니다. 넘김이 끝난
              뒤에만 바꾸므로 페이징이 어긋나지 않습니다.
            */
            /* 손가락이 닿아 있는 동안에는 안 바꿉니다 — 웹에서는 안 오는 이벤트라 잠금만 합니다. */
            onScrollBeginDrag={() => {
              dragging.current = true;
            }}
            onScrollEndDrag={() => {
              dragging.current = false;
            }}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              // 첫 영상에서 더 당기면 목록은 안 움직입니다. 방향은 아래이니 탭바입니다.
              if (y < -12) {
                flash('tabs');
                return;
              }
              const dy = y - lastY.current;
              lastY.current = y;
              if (Math.abs(dy) < 2) return;
              // 값이 커진다 = 위로 밀었다 = 다음 영상 → 앱바(위)
              dirBar.current = dy > 0 ? 'appbar' : 'tabs';
              if (settle.current) clearTimeout(settle.current);
              // 120ms 동안 더 안 움직이면 멎은 것으로 봅니다.
              settle.current = setTimeout(() => {
                if (!dragging.current) flash(dirBar.current);
              }, 120);
            }}
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
                showShelf={showsShelf(chrome.mode)}
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
