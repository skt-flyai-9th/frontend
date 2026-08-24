/**
 * InsightScreen — 프로토타입 `06_인사이트.png`.
 *
 * API 3.5 GET /stores/{id}/insights 를 type 별로 보여줍니다.
 * (상권분석 / 카드뉴스 / 다음숏폼추천 — 카드뉴스는 기존 홈에서 옮겨온 것)
 *
 * 표시 규칙 — 기능명세 요구사항 (인수인계 §6.5). 어기면 사장님을 속이는 겁니다.
 *   - 없는 지표는 N/A. 0 으로 쓰지 않습니다 (0 은 "실제로 0" 이라는 주장).
 *   - insight_source 가 'AI추론' 이면 "AI 추측" 배지, 아니면 "실제 데이터".
 *   - confidence 낮음이면 그대로 알립니다. 감추지 않습니다.
 *   - 언제 기준 데이터인지(generated_at) 표시합니다.
 *
 * 주간 조회수 추이는 17.1 이 게시물 단위라 계정 합산이 불가합니다.
 * 가짜 그래프를 그리는 대신 '반응 보기'로 안내합니다.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card, SourceNote } from '../../../ui/Card';
import { Badge, Chip } from '../../../ui/Chip';
import { LoadGate } from '../../../ui/LoadGate';
import { EmptyState } from '../../../ui/Feedback';
import { Button } from '../../../ui/Button';
import { useAppState } from '../../../lib/appState';
import { useInsights } from '../../../api/queries/store';
import { color, space, text } from '../../../design/theme';
import type { MyStackParamList } from '../../../navigation/types';
import type { InsightType } from '../../../api/schema/types';

type Nav = NativeStackNavigationProp<MyStackParamList>;

const TYPES: InsightType[] = ['상권분석', '카드뉴스', '다음숏폼추천'];

export default function InsightScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);
  const [type, setType] = useState<InsightType>('상권분석');
  const insights = useInsights(storeId ?? undefined, type);

  return (
    <Screen>
      <AppBar onBack={() => nav.goBack()} title="인사이트" />

      <View style={styles.chips}>
        {TYPES.map((t) => (
          <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
        ))}
      </View>

      <LoadGate
        loading={insights.isLoading}
        error={insights.isError}
        // 빈 목록은 정상입니다(EmptyState 로 처리). 응답 자체가 없을 때만 실패입니다.
        ready={insights.data !== undefined}
        onRetry={insights.refetch}
        loadingLabel="분석을 불러오고 있어요"
      >
        {(insights.data ?? []).length === 0 ? (
          <EmptyState
            title="아직 분석이 없습니다"
            description="가게 정보가 채워지면 분석이 만들어져요. 지표가 없을 때는 0이 아니라 '없음'으로 보여드립니다."
          />
        ) : (
          (insights.data ?? []).map((ins) => (
            <Card key={ins.id}>
              <View style={styles.badges}>
                {/* AI 추측인지 실제 데이터인지 반드시 구분해서 보여줍니다 */}
                <Badge
                  label={ins.insightSource === 'AI추론' ? 'AI 추측' : '실제 데이터'}
                  tone={ins.insightSource === 'AI추론' ? 'neutral' : 'done'}
                />
              </View>
              <Text style={text.subheading}>{ins.insightTitle}</Text>
              <Text style={text.body}>{ins.insightContent}</Text>
              {ins.insightSource === 'AI추론' && (
                <Text style={[text.caption, { color: color.ink[500] }]}>
                  참고만 해 주세요. 실제 데이터가 아니라 AI 추측이 섞여 있습니다.
                </Text>
              )}
              {/* 언제 기준 데이터인지 — 감추지 않습니다 */}
              <SourceNote source={ins.insightSource || 'N/A'} updatedAt={ins.generatedAt?.slice(0, 10)} />
            </Card>
          ))
        )}
      </LoadGate>

      {/* 주간 조회수: 계정 합산 API 가 없어 가짜 그래프를 그리지 않습니다 */}
      <Card>
        <Text style={text.subheading}>게시한 숏폼 반응</Text>
        <Text style={[text.bodySmall, { color: color.ink[500] }]}>
          조회수·좋아요 같은 반응은 게시물별로 확인할 수 있어요.
        </Text>
        <Button
          label="반응 보기로 이동"
          variant="secondary"
          size="small"
          full={false}
          onPress={() => nav.navigate('Performance')}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  badges: { flexDirection: 'row', gap: space[2] },
});
