/**
 * HomeFeedScreen — 새 홈 탭. 프로토타입 `01_홈피드.png`.
 *
 * "이 숏폼 어때요?" — AI 추천 포맷을 세로 카드로 넘겨 봅니다.
 *
 * - API 5.1 GET /video-formats (sort=trending). 프로젝트 없이 둘러보는 피드라
 *   project_id 는 보내지 않습니다.
 * - 하트: 5.3 찜 토글 (낙관적, 멱등이라 안전)
 * - 화살표: BE 확정 흐름 — 포맷 선택 → 목적 선택 → 4.1 생성 → 7.1 기획.
 *   기존 PurposeSelectScreen 을 formatId 파라미터로 재사용합니다.
 *   목적은 필수이고 생성 후 바꿀 수 없으므로(BE 확정) 반드시 목적부터 받습니다.
 * - 썸네일 탭: FormatDetail 둘러보기 모드 (projectId 없이)
 */
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { LoadGate } from '../../../ui/LoadGate';
import { EmptyState } from '../../../ui/Feedback';
import { FormatCard } from '../FormatCard';
import { useVideoFormats, useToggleFavorite } from '../../../api/queries/project';
import theme, { color, space, text } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';
import type { VideoFormat } from '../../../api/schema/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

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

  return (
    <Screen padded={false} scroll={false} edges={['top']}>
      {/* 상단 로고. 프로토타입의 햄버거 메뉴는 대응 화면이 없어 두지 않습니다. */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          Reals<Text style={{ color: color.danger[500] }}>.</Text>
        </Text>
      </View>

      <View style={styles.headline}>
        <Text style={text.title}>이 숏폼 어때요?</Text>
        <Text style={[text.bodySmall, { color: color.ink[500] }]}>
          사장님이 입력하신 정보를 바탕으로 AI가 추천하는 숏폼이에요.
        </Text>
      </View>

      <LoadGate
        loading={formats.isLoading}
        error={formats.isError}
        // 빈 목록은 정상입니다(EmptyState 로 처리). 응답 자체가 없을 때만 실패입니다.
        ready={formats.data !== undefined}
        onRetry={formats.refetch}
        loadingLabel="추천 숏폼을 찾고 있어요"
      >
        <FlatList
          data={formats.data ?? []}
          keyExtractor={(f) => String(f.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <FormatCard
              format={item}
              onToggleFavorite={onToggleFavorite}
              onCreate={onCreate}
              onOpen={onOpen}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: space[4] }} />}
          ListEmptyComponent={
            <EmptyState
              title="아직 보여드릴 추천이 없습니다"
              description="가게 정보를 채우면 딱 맞는 숏폼을 골라 드려요."
            />
          }
        />
      </LoadGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: space[3],
    borderBottomWidth: theme.border.hairline,
    borderBottomColor: color.ink[200],
  },
  // 가이드라인 §5.9: 18px bold, 자간 타이트. 점만 heart 색.
  logo: { ...theme.text.heading, letterSpacing: -0.4 },
  headline: {
    paddingHorizontal: space[5],
    paddingVertical: space[4],
    gap: space[1],
  },
  listContent: { paddingHorizontal: space[5], paddingBottom: space[6] },
});
