/** S04.2.1 타깃 선택 · 명세 3.4, 4.2 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import { space, text } from '../../../design/theme';
import { useTargetCustomers, visibleTargets } from '../../../api/queries/store';
import { useUpdateProject } from '../../../api/queries/project';
import { useCurrentStore } from '../../../lib/appState';
import type { Confidence } from '../../../api/schema/types';
import { useAutoSave } from '../../../lib/useAutoSave';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'TargetSelect'>;

/** 명세 ai_confidence: 높음/보통/낮음 → 화면 문구 */
function confidenceLabel(c?: Confidence) {
  if (c === '높음') return { label: '근거 충분', tone: 'done' as const };
  if (c === '보통') return { label: '참고용', tone: 'neutral' as const };
  return { label: '자료 부족', tone: 'warn' as const };
}

export default function TargetSelectScreen({ navigation, route }: Props) {
  const { projectId } = route.params;

  // 진행 상황을 서버에 남깁니다. 앱을 꺼도 이어서 할 수 있습니다.
  useAutoSave({ projectId, step: 'SETUP' });
  const storeId = useCurrentStore();
  const { data, isLoading, isError, refetch } = useTargetCustomers(storeId);
  // 명세 3.4: 목록에는 HIDDEN 도 내려옵니다. 선택 화면에서는 보이면 안 됩니다.
  const targets = visibleTargets(data);
  const updateProject = useUpdateProject(projectId);
  const [selected, setSelected] = useState<number | null>(null);

  const next = () => {
    updateProject.mutate(
      { storeTargetCustomerId: selected ?? undefined },
      { onSuccess: () => navigation.navigate('ShootCondition', { projectId, formatId: route.params.formatId }) }
    );
  };

  const hasLowConfidence = targets?.some((t) => t.aiConfidence === '낮음');

  return (
    <Screen
      footer={
        <BottomAction>
          <Button label="다음" onPress={next} disabled={!selected} loading={updateProject.isPending} />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="숏폼 만들기" step={{ current: 3, total: 4 }} />
      <View style={{ gap: space[2] }}>
        <Text style={text.title}>이번엔 누구에게{'\n'}보여줄까요?</Text>
        <Text style={text.bodySmall}>
          여기서 고른 손님은 이번 영상에만 적용됩니다. 가게 기본 정보는 그대로입니다.
        </Text>
      </View>

      {hasLowConfidence && (
        <Banner
          tone="warn"
          title="아직 자료가 적어 추측이 섞여 있습니다"
          description="현장과 다르면 무시하셔도 됩니다. 사장님이 아는 게 더 정확합니다."
        />
      )}

      {isLoading && !targets && <Loading label="손님 정보을 불러오는 중" />}

      {isError && (
        <EmptyState
          title="손님 정보을 불러오지 못했습니다"
          description="신호를 확인하고 다시 시도해 주세요."
          actionLabel="다시 시도"
          onAction={() => refetch()}
        />
      )}

      {targets?.map((t) => {
        const conf = confidenceLabel(t.aiConfidence);
        return (
          <Card key={t.id} selected={selected === t.id} onPress={() => setSelected(t.id)}>
            <View style={styles.head}>
              <Badge label={`${t.targetType} 손님`} tone={t.targetType === '주' ? 'brand' : 'neutral'} />
              <View style={{ flexDirection: 'row', gap: space[2] }}>
                {t.status === 'SUGGESTED' && <Badge label="AI 추천" tone="warn" />}
                <Badge label={conf.label} tone={conf.tone} />
              </View>
            </View>
            <Text style={text.body}>{t.targetDescription}</Text>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[2] },
});
