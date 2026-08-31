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
import {
  bottomInsetFor,
  showsShelf,
  showsTabs,
  tabSlackFor,
  useChrome,
} from '../../../ui/ChromeContext';
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

    ⚠️ **홈 앱바(리얼스 로고 · 햄버거)를 뺐습니다** (2026-08-31 사장님 지시).
       그래서 위에 띄울 것이 없고, 모드가 **둘**로 줄었습니다.

    🔴 **선반과 탭바는 둘 중 하나만 뜹니다** (사장님 지시: "검은 줄 안 생기게").
       같이 띄우면 56 + 49 = 105 로 예산 65 를 넘겨 영상이 370 으로 줄고 옆에
       여백이 생깁니다. 하나만 띄우면 **두 상태 다 393×699** 로 꽉 찹니다.

      2초간 가만히 보고 있으면   선반만   촬영 버튼이 손에 옵니다
      끌면 · 다른 탭에서 오면    탭바만   탭으로 옮기려는 참일 테니까요

    설정은 **마이페이지**로 들어갑니다 — 햄버거가 없어졌어도 길은 막히지 않습니다.

    🔴 **방향은 스크롤 변화량이 아니라 "몇 번째 영상인가" 로 봅니다** (2026-08-31).
       페이징은 손을 뗀 뒤 스냅 지점으로 되돌아가며 멈추는데, 그 **마지막 되돌아오는
       움직임의 부호가 손짓과 반대**입니다. 장 번호는 그런 흔들림이 없습니다.

    ⚠️ **모드는 번호가 확정된 뒤에만 바뀝니다.** 끄는 도중에 바꾸면 한 장의 높이가
       손가락 밑에서 변해 페이징이 어긋납니다.
  */
  const chrome = useChrome();
  const focused = useIsFocused();
  /** 코치마크가 지금 짚고 있는 곳. 단계마다 필요한 바가 달라 이 값으로 가릅니다. */
  const coachName = useCoach()?.activeName ?? null;
  const coachRunning = coachName != null;
  const back = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 직전에 보고 있던 장. 번호가 오르면 다음 장(위로 밈), 내리면 이전 장(아래로 당김). */
  const prevIndex = useRef(0);

  /**
   * 잠깐 다른 바를 보여 줬다가 선반으로 돌아옵니다.
   * 1.6초로 뒀다가 **3초로 늘렸습니다** (2026-08-31 지적: "좀 짧은 것 같다").
   */
  /** 영상을 2초간 가만히 보면 선반으로 돌아옵니다 (사장님 지시). */
  const BACK_TO_SHELF_MS = 2000;
  const flash = (m: 'tabs') => {
    if (back.current) clearTimeout(back.current);
    chrome.setMode(m);
    back.current = setTimeout(() => chrome.setMode('shelf'), BACK_TO_SHELF_MS);
  };

  /*
    🔴 **홈을 벗어나면 `tabs` 로 둡니다 — `all` 이 아니라** (2026-08-31 지적:
       "위 아래가 중복돼서 보일 때가 있다").

       탭은 가로 트랙이라 옆 탭으로 미는 **동안 홈이 아직 화면에 남아 있습니다.**
       그때 `all` 로 바꾸면 홈에 앱바와 탭바가 **같이** 그려져 위아래가 겹쳐 보입니다.
       다른 탭 화면들은 자기 헤더를 따로 그리므로 홈의 앱바는 필요 없고, 탭바만
       있으면 됩니다.

    🔴 **다른 탭에서 홈으로 오면 탭바를 먼저 띄웁니다** (사장님 지시).
       방금 탭을 쓰던 참이라 탭바가 그대로 이어지는 게 자연스럽습니다.
       3초 뒤 선반으로 돌아옵니다.
  */
  useEffect(() => {
    if (!focused) {
      if (back.current) clearTimeout(back.current);
      chrome.setMode('tabs');
      return;
    }
    flash('tabs');
    return () => {
      if (back.current) clearTimeout(back.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  /*
    🔴 **튜토리얼은 단계가 원하는 바 하나만 띄웁니다** (2026-08-31 지시:
       "실제 화면과 가장 닮도록", "3/7 화면은 탭바가 아닌 선반만").

    홈은 평소 선반과 탭바 중 하나만 띄웁니다. 튜토리얼에서 둘을 같이 띄우면
    **실제로는 없는 화면**을 가르치는 셈이 됩니다. 그래서 짚는 곳에 맞춰 하나만.

      촬영 버튼(`make`) 을 짚을 때  →  선반만
      그 밖(탭 아이콘 · 영상)       →  탭바만
  */
  useEffect(() => {
    chrome.setLock(coachName == null ? null : coachName === 'make' ? 'shelf' : 'tabs');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachName]);

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
    🔴 **홈 앱바를 통째로 뺐습니다** (2026-08-31 사장님 지시:
       "위에 리얼스 로고랑 햄버거바 빼고").

    로고와 햄버거뿐이던 줄이라 빼도 잃는 게 없습니다. **설정은 마이페이지**로
    들어갑니다(`MyPageScreen`) — 길이 막히지 않습니다. 되살리려면 여기에
    `<AppBar home={{ onMenu: () => nav.navigate('Settings') }} />` 를 돌려주고
    아래 `pageHeight` 에서 `sizing.appBarHeight` 를 다시 빼면 됩니다.

    덤 — 앱바가 사라진 44pt 가 그대로 영상 몫이 됩니다.
  */
  /*
   * 한 장의 높이 = 화면에서 상태바·앱바·탭바를 뺀 나머지.
   * 이 값이 정확해야 `pagingEnabled` 가 딱 한 장씩 멈춥니다 — 어긋나면 두 장이
   * 걸친 상태로 서고, 그러면 자동재생 플레이어가 화면에 둘 보이게 됩니다.
   */
  /*
    두 모드 다 영상이 **393×699** 가 되도록 맞춥니다.
      선반만  852 − 54 −      0 − 34 = 764   ← 영상 699 + 선반 65
      탭바만  852 − 54 − (49+16) − 34 = 699   ← 영상 699 + 선반 0
  */
  const pageHeight = Math.max(
    320,
    height -
      insets.top -
      (showsTabs(chrome.mode)
        ? sizing.tabRowHeight + tabSlackFor(chrome.mode, width, height, insets.top, insets.bottom)
        : 0) -
      /*
        🔴 **탭바가 쓰는 값과 같아야 합니다.** 탭바는 접혀 있어도 아래 안전영역만큼은
           자리를 차지합니다(`bottomInsetFor`). 여기서 `insets.bottom` 을 그대로 빼면
           그 차이만큼 한 장이 화면보다 커져 **아래에 다음 영상이 삐져나옵니다.**
      */
      bottomInsetFor(insets.bottom)
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
  /** 보정하는 동안은 방향 판정을 쉽니다 (보정도 장 번호를 흔들 수 있습니다). */
  const correcting = useRef(false);

  useEffect(() => {
    /*
      🔴 **맨 아래에서만 깨지던 것** (2026-08-31 지적: "제일 하단이야, 중간은 괜찮아").

      모드가 바뀌면 한 장의 높이가 달라져 목록 전체 길이도 달라집니다. 그런데
      `scrollToOffset` 은 **그 순간의 길이** 기준으로 잘립니다(clamp). 목록 중간에서는
      아래로 남은 여유가 많아 티가 안 나는데, **맨 끝 장에는 여유가 0** 이라
      옮기려던 자리에 못 가고 잘린 채로 섭니다. 그래서 화면에 바로 위 영상의
      꼬리와 지금 장의 머리가 같이 보여 "깨진 영상" 이 됩니다.

      고침 둘.
        ① `scrollToOffset`(절대 좌표) 대신 **`scrollToIndex`**(몇 번째 장) 를 씁니다.
           목록이 자기 최신 길이로 자리를 다시 계산합니다.
        ② 렌더가 끝난 **다음 프레임**에 부릅니다. 같은 프레임에 부르면 목록은 아직
           옛 길이를 들고 있어 또 잘립니다. 두 프레임에 걸쳐 두 번 겁니다.
    */
    correcting.current = true;
    let raf2 = 0;
    const put = () => {
      try {
        listRef.current?.scrollToIndex({ index, animated: false });
      } catch {
        /* 아직 그려지지 않은 장이면 조용히 넘깁니다 — onScrollToIndexFailed 가 받습니다 */
      }
    };
    const raf1 = requestAnimationFrame(() => {
      put();
      raf2 = requestAnimationFrame(() => {
        put();
        correcting.current = false;
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      correcting.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageHeight]);

  // 장이 바뀌면 그 방향에 있는 바를 잠깐 띄웁니다.
  useEffect(() => {
    const step = index - prevIndex.current;
    prevIndex.current = index;
    if (step === 0 || correcting.current) return;
    flash('tabs');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // 첫 로딩은 스피너 대신 스켈레톤으로 — 무엇이 올지 미리 보입니다.
  if (formats.isLoading && !formats.data) {
    return (
      <Screen padded={false} scroll={false} edges={['top']}>
        <FeedSkeleton />
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll={false} edges={['top']}>

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
            /*
              첫 영상에서 더 당기면 장 번호가 안 바뀌어 위 효과가 안 돕니다.
              방향은 아래이니 탭바를 띄웁니다.
            */
            scrollEventThrottle={32}
            onScroll={(e) => {
              if (e.nativeEvent.contentOffset.y < -12) flash('tabs');
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
              한 장의 높이가 막 바뀐 순간에는 목록이 아직 그 장을 안 그렸을 수 있습니다.
              그때 조용히 다시 겁니다 — 안 그러면 맨 끝에서 어긋난 채로 섭니다.
            */
            onScrollToIndexFailed={({ index: i }) => {
              requestAnimationFrame(() => {
                try {
                  listRef.current?.scrollToOffset({ offset: i * pageHeight, animated: false });
                } catch {
                  /* 여기서도 실패하면 다음 스크롤이 자연히 맞춰 줍니다 */
                }
              });
            }}
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
