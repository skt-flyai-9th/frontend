/**
 * HomeFeedScreen — 새 홈 탭. 시안 `HomeScreen` 대조 이식.
 *
 * "이 숏폼 어때요?" — AI 추천 포맷을 세로 카드로 넘겨 봅니다.
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
import React from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { LoadGate } from '../../../ui/LoadGate';
import { EmptyState, Skeleton } from '../../../ui/Feedback';
import { FormatCard } from '../FormatCard';
import { useVideoFormats, useToggleFavorite } from '../../../api/queries/project';
import { color, radius, space, text } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';
import type { VideoFormat } from '../../../api/schema/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** 시안 헤드라인 블록 — 목록 안쪽 첫 카드 위. */
function Headline() {
  return (
    <View style={styles.headline}>
      <Text style={text.heading}>이 숏폼 어때요?</Text>
      <Text style={[text.caption, { color: color.ink[500] }]}>
        마음에 드는 숏폼을 찾아 촬영하고 편집할 수 있어요.
      </Text>
    </View>
  );
}

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

  const onToggleFavorite = (f: VideoFormat) =>
    toggle.mutate({ formatId: f.id, next: !f.isFavorite });

  const onCreate = (f: VideoFormat) =>
    nav.navigate('Create', { screen: 'PurposeSelect', params: { formatId: f.id } });

  const onOpen = (f: VideoFormat) =>
    nav.navigate('Create', { screen: 'FormatDetail', params: { formatId: f.id } });

  const header = (
    <AppBar
      home={{
        onBell: () => nav.navigate('Notifications'),
        // 설정은 우리 IA 상 마이 탭 아래에 있습니다.
        onMenu: () => nav.navigate('Main', { screen: 'My', params: { screen: 'Settings' } }),
      }}
    />
  );

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
        <FlatList
          data={formats.data ?? []}
          keyExtractor={(f) => String(f.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={Headline}
          refreshControl={
            <RefreshControl
              refreshing={formats.isFetching && !formats.isLoading}
              onRefresh={() => formats.refetch()}
              tintColor={color.brand[600]}
              colors={[color.brand[600]]}
            />
          }
          renderItem={({ item }) => (
            <FormatCard
              format={item}
              onToggleFavorite={onToggleFavorite}
              onCreate={onCreate}
              onOpen={onOpen}
            />
          )}
          // 시안: 카드 사이는 빈 여백이 아니라 surface 색 8px 띠입니다.
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            /*
             * ⚠️ 예전 문구는 "가게 정보를 채우면 골라 드려요" 였습니다.
             *    그런데 이 목록이 비는 주된 이유는 **서버에 포맷이 아직 없어서**입니다
             *    (2026-08-26 실서버 확인: /video-formats 가 0건).
             *    그 상태에서 가게 정보를 채우라고 하면, 해도 소용없는 일을 시키는 겁니다.
             *    막을 거면 맞는 이유를 써야 합니다.
             */
            <EmptyState
              title="아직 추천할 숏폼이 없습니다"
              description="준비되는 대로 여기에 채워집니다. 조금 뒤에 다시 열어 보세요."
              actionLabel="다시 불러오기"
              onAction={() => formats.refetch()}
            />
          }
        />
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
