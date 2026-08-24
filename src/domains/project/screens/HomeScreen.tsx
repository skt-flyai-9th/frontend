/**
 * 홈 — S03.6.1 카드뉴스 캐러셀 + S03.6.2 카드 기반 숏폼 시작 + S05.1.1 포맷 둘러보기
 *
 * 명세 S03.6.1: "카드뉴스 캐러셀, 출처·갱신시각·정보부족 CTA"
 *   → 인사이트를 가로 캐러셀로 보여주고, 각 카드에 출처와 갱신일을 답니다.
 *
 * 명세 S03.6.2: "각 카드의 제작 CTA와 캠페인 초안 프리필"
 *   → 카드마다 "이걸로 만들기" 버튼을 답니다.
 *
 * 명세 S05.1.1: "포맷 카드 피드, 썸네일/임베드"
 *   → 만들기 흐름에 들어가지 않아도 어떤 영상을 만들 수 있는지 미리 봅니다.
 *     사장님이 "뭘 만들 수 있는지" 감을 못 잡으면 첫 버튼을 누르지 못합니다.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Loading } from '../../../ui/Feedback';
import { VideoThumbnail } from '../../../ui/VideoThumbnail';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useInsights, useStore } from '../../../api/queries/store';
import { useDraft, useProjects, useVideoFormats } from '../../../api/queries/project';
import { useCurrentStore } from '../../../lib/appState';
import { formatDate, timeAgo } from '../../../api/schema/convert';
import { seconds } from '../../../lib/format';
import type { RootStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** 명세 insight_source 를 사실/추측으로 구분해 표시합니다. */
function sourceTone(src: string): { label: string; tone: 'neutral' | 'warn' } {
  return src === 'AI추론'
    ? { label: 'AI 추측', tone: 'warn' }
    : { label: '실제 데이터', tone: 'neutral' };
}

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useCurrentStore();
  const { width } = useWindowDimensions();

  const { data: store } = useStore(storeId);
  const { data: insights, isLoading: insightsLoading, isError: insightsError } = useInsights(storeId);
  const { data: projects } = useProjects(storeId);
  // 둘러보기용. 아직 프로젝트가 없어도 볼 수 있습니다.
  const { data: formats, isLoading: formatsLoading, isError: formatsError } = useVideoFormats({ sort: 'trending', period: '7d' });

  const inProgress = projects?.find(
    (p) => p.shortsStatus !== 'PUBLISHED' && p.shortsStatus !== 'READY'
  );

  // 어디까지 했는지 서버에서 받아옵니다 (명세 9.3).
  const { data: draft } = useDraft(inProgress?.id);

  /**
   * 저장된 단계로 돌려보냅니다.
   * 무조건 촬영 목록으로 보내면, 아직 방식도 안 고른 사장님이
   * 빈 촬영 목록을 보고 당황합니다.
   */
  const resumeScreen = (): { screen: string; label: string } => {
    switch (draft?.currentStep) {
      case 'SETUP':
        return { screen: 'TargetSelect', label: '설정하던 중' };
      case 'FORMAT':
        return { screen: 'PathChoice', label: '방식 고르던 중' };
      case 'PLANNING':
        return { screen: 'Storyboard', label: '대본 보던 중' };
      case 'EDITING':
        return { screen: 'EditResult', label: '편집 결과 보던 중' };
      case 'PUBLISH':
        return { screen: 'Outputs', label: '올리기 직전' };
      case 'SHOOTING':
      default:
        return { screen: 'TaskBoard', label: '촬영하던 중' };
    }
  };

  // 캐러셀 카드 폭 — 다음 카드가 살짝 보여야 옆으로 넘길 수 있다는 걸 압니다.
  const cardWidth = Math.min(300, width - space[5] * 2 - space[6]);

  return (
    <Screen padded={false} edges={['top']}>
      <View style={styles.pad}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={text.caption}>{store?.category}</Text>
            <Text style={text.title}>{store?.name ?? '우리 가게'}</Text>
          </View>
          <Text style={styles.wordmark}>Reals</Text>
        </View>

        {inProgress && (
          <Card
            onPress={() =>
              nav.navigate('Create', {
                // 저장된 단계로 돌아갑니다.
                screen: resumeScreen().screen as never,
                params: { projectId: inProgress.id } as never,
              })
            }
          >
            <View style={styles.rowBetween}>
              <Text style={text.subheading}>만들던 영상이 있습니다</Text>
              <Badge label="이어서" tone="brand" />
            </View>
            <Text style={text.bodySmall}>
              {inProgress.promotionPurpose} · {resumeScreen().label}
            </Text>
            <Text style={text.micro}>
              {timeAgo(draft?.lastSavedAt ?? inProgress.updatedAt)}에 저장했습니다
            </Text>
          </Card>
        )}

        <View style={styles.cta}>
          <Text style={[text.heading, { color: color.paper }]}>오늘 영상 하나 만들어 볼까요</Text>
          <Text style={[text.bodySmall, { color: 'rgba(255,255,255,0.86)' }]}>
            목적만 고르면 찍을 것부터 순서대로 알려드립니다.
          </Text>
          <Button
            label="숏폼 만들기"
            onPress={() => nav.navigate('Create', { screen: 'PurposeSelect' })}
            style={{ marginTop: space[2] }}
          />
        </View>
      </View>

      {/* ── 어떤 영상을 만들 수 있는지 미리 보기 ── */}
      <View style={[styles.pad, styles.sectionHead]}>
        <View style={{ flex: 1 }}>
          <Text style={text.subheading}>이런 영상을 만들 수 있어요</Text>
          <Text style={text.caption}>눌러서 어떤 영상인지 미리 볼 수 있습니다</Text>
        </View>
      </View>

      {formatsError ? (
        <View style={styles.pad}>
          <Text style={text.caption}>영상 예시를 불러오지 못했습니다. 만들기는 그대로 됩니다.</Text>
        </View>
      ) : formatsLoading ? (
        <View style={styles.pad}>
          <Loading label="불러오는 중" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          snapToInterval={cardWidth + space[3]}
          decelerationRate="fast"
        >
          {formats?.map((f, i) => (
            <Pressable
              key={f.id}
              accessibilityRole="button"
              onPress={() =>
                nav.navigate('Create', {
                  screen: 'FormatDetail',
                  // projectId 없이 둘러보기로 엽니다.
                  params: { formatId: f.id },
                })
              }
              style={({ pressed }) => [
                styles.formatCard,
                { width: cardWidth },
                pressed && { opacity: theme.opacity.pressed },
              ]}
            >
              {/*
                명세 5.1 응답에는 reference_url 이 없습니다(5.2 상세에만 있음).
                서버가 주면 썸네일을, 안 주면 종류·난이도가 보이는 카드를 그립니다.
                회색 빈 박스를 깔면 "고장난 화면"으로 보입니다.
              */}
              {f.referenceUrl ? (
                <VideoThumbnail
                  url={f.referenceUrl}
                   platform={f.sourcePlatform}
                  duration={seconds(f.expectedDurationSec)}
                  badge={i === 0 ? '추천' : undefined}
                />
              ) : (
                <View style={styles.formatPlaceholder}>
                  {i === 0 && <Badge label="추천" tone="brand" />}
                  <Text style={[text.heading, { color: color.paper }]}>{f.formatType}</Text>
                  <Text style={[text.caption, { color: 'rgba(255,255,255,0.8)' }]}>
                    {seconds(f.expectedDurationSec)} · 난이도 {f.shootingDifficulty}
                  </Text>
                </View>
              )}
              <View style={{ gap: 2, paddingHorizontal: space[1] }}>
                <Text style={text.bodyStrong} numberOfLines={1}>
                  {f.formatTitle}
                </Text>
                <Text style={text.caption} numberOfLines={1}>
                  {f.formatType} · 난이도 {f.shootingDifficulty} · 얼굴 {f.faceExposureLevel}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* ── 가게 카드뉴스 (S03.6.1 캐러셀) ── */}
      <View style={[styles.pad, styles.sectionHead]}>
        <View style={{ flex: 1 }}>
          <Text style={text.subheading}>우리 가게 분석</Text>
          <Text style={text.caption}>가게 정보와 리뷰에서 찾아낸 것들입니다</Text>
        </View>
      </View>

      {insightsError ? (
        <View style={styles.pad}>
          <Text style={text.caption}>분석 결과를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</Text>
        </View>
      ) : insightsLoading ? (
        <View style={styles.pad}>
          <Loading label="분석 결과를 불러오는 중" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          snapToInterval={cardWidth + space[3]}
          decelerationRate="fast"
        >
          {insights?.map((ins) => {
            const src = sourceTone(ins.insightSource);
            return (
              <View key={ins.id} style={[styles.insightCard, { width: cardWidth }]}>
                <View style={styles.rowBetween}>
                  <Badge label={ins.insightType} />
                  <Badge label={src.label} tone={src.tone} />
                </View>

                <Text style={text.subheading}>{ins.insightTitle}</Text>
                <Text style={[text.bodySmall, { flex: 1 }]}>{ins.insightContent}</Text>

                {/* 명세: 출처와 갱신시각을 반드시 함께 표시 */}
                <Text style={text.micro}>
                  {ins.insightSource} · {formatDate(ins.generatedAt)} 기준
                </Text>

                <Button
                  label="이걸로 영상 만들기"
                  variant="secondary"
                  size="small"
                  onPress={() => nav.navigate('Create', { screen: 'PurposeSelect' })}
                />
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.pad, { paddingBottom: space[6] }]}>
        <Text style={text.caption}>
          분석은 매주 갱신됩니다. 메뉴나 영업시간이 바뀌면 우리 가게 탭에서 고쳐 주세요.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space[5], gap: space[4] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  wordmark: {
    ...text.caption,
    color: color.brand[600],
    fontFamily: theme.text.bodyStrong.fontFamily,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[2],
  },
  cta: {
    backgroundColor: color.ink[900],
    borderRadius: radius.xl,
    padding: space[5],
    gap: space[3],
  },
  sectionHead: { marginTop: space[6], marginBottom: space[1] },
  carousel: { paddingHorizontal: space[5], gap: space[3], paddingVertical: space[1] },
  formatCard: { gap: space[2] },
  formatPlaceholder: {
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: color.ink[900],
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
  },
  insightCard: {
    gap: space[2],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
  },
});
