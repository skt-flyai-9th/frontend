/**
 * FavoritesScreen — 관심목록 탭. 프로토타입 `02_관심목록.png`.
 *
 * API 5.3 (2026-08-23 신설). 응답이 5.1 과 완전히 같아서
 * 홈 피드의 FormatCard 를 그대로 재사용합니다 (인수인계 §6.2).
 * 찜은 계정 단위입니다 — 가게를 바꿔도 목록이 같습니다.
 */
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { LoadGate } from '../../../ui/LoadGate';
import { EmptyState } from '../../../ui/Feedback';
import { FormatCard } from '../FormatCard';
import { useFavorites, useToggleFavorite } from '../../../api/queries/project';
import { color, space, text } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';
import type { VideoFormat } from '../../../api/schema/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function FavoritesScreen() {
  const nav = useNavigation<Nav>();
  const favorites = useFavorites();
  const toggle = useToggleFavorite();

  return (
    <Screen padded={false} scroll={false} edges={['top']}>
      <View style={styles.header}>
        <Text style={text.title}>관심목록</Text>
        <Text style={[text.bodySmall, { color: color.ink[500] }]}>
          하트를 눌러 모아둔 숏폼입니다. 나중에 천천히 골라 만드세요.
        </Text>
      </View>

      <LoadGate
        loading={favorites.isLoading}
        error={favorites.isError}
        // 빈 목록은 정상입니다(EmptyState 로 처리). 응답 자체가 없을 때만 실패입니다.
        ready={favorites.data !== undefined}
        onRetry={favorites.refetch}
        loadingLabel="찜한 목록을 불러오고 있어요"
      >
        <FlatList
          data={favorites.data ?? []}
          keyExtractor={(f) => String(f.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <FormatCard
              format={item}
              onToggleFavorite={(f: VideoFormat) =>
                // 관심목록에서 하트를 끄면 = 해제. 낙관적으로 즉시 목록에서 빠집니다.
                toggle.mutate({ formatId: f.id, next: !f.isFavorite })
              }
              onCreate={(f) =>
                nav.navigate('Create', { screen: 'PurposeSelect', params: { formatId: f.id } })
              }
              onOpen={(f) =>
                nav.navigate('Create', { screen: 'FormatDetail', params: { formatId: f.id } })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: space[4] }} />}
          ListEmptyComponent={
            <EmptyState
              title="아직 찜한 숏폼이 없습니다"
              description="홈에서 마음에 드는 카드의 하트를 눌러 보세요."
            />
          }
        />
      </LoadGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space[5], paddingVertical: space[4], gap: space[1] },
  listContent: { paddingHorizontal: space[5], paddingBottom: space[6] },
});
