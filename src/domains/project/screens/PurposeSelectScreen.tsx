/** S04.0.2 홍보 목적 선택 · 명세 4.1 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { OptionRow } from '../../../ui/Field';
import { Banner } from '../../../ui/Feedback';
import { space, text } from '../../../design/theme';
import { useCreateProject, useProjects } from '../../../api/queries/project';
import { useCurrentStore } from '../../../lib/appState';
import type { PromotionPurpose } from '../../../api/schema/types';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'PurposeSelect'>;

/** 명세 promotion_purpose 값과 정확히 일치해야 합니다. */
const PURPOSES: { key: PromotionPurpose; title: string; description: string }[] = [
  { key: '메뉴소개', title: '메뉴 소개', description: '대표 메뉴나 신메뉴, 만드는 과정을 보여줍니다' },
  { key: '이벤트알리기', title: '이벤트 알리기', description: '할인, 기간 한정, 오픈 소식을 정확히 전합니다' },
  { key: '가게소개', title: '가게 소개', description: '공간과 분위기, 찾아오는 길을 알려줍니다' },
  { key: '고객늘리기', title: '손님 늘리기', description: '새 손님, 재방문, 한가한 시간대를 노립니다' },
];

export default function PurposeSelectScreen({ navigation, route }: Props) {
  /**
   * 홈 피드에서 포맷을 먼저 고른 흐름이면 formatId 가 들어옵니다.
   * (BE 확정: 포맷 선택 → 목적 선택 → 4.1 생성 → 7.1 기획)
   * 설정 화면들을 그대로 지나되 마지막에 PathChoice 대신 기획으로 갑니다.
   */
  const formatId = route.params?.formatId;
  const storeId = useCurrentStore();
  const [purpose, setPurpose] = useState<PromotionPurpose | null>(null);
  const createProject = useCreateProject();

  /**
   * 명세 확정 (2026-08-23): 목적은 4.1 생성 때 정해지고, **만든 뒤 바꿀 수 없습니다.**
   * 4.2 PATCH body 에서 promotion_purpose 가 빠졌습니다.
   *
   * 그래서 재사용 규칙이 바뀌었습니다.
   *   - 지금 고른 목적과 **같은** DRAFT 가 있으면 → PATCH 없이 그대로 이어 씁니다.
   *   - 다른 목적이면 → 새 프로젝트를 만듭니다. (바꾸려면 새로 만드는 수밖에 없음)
   * 다른 목적의 DRAFT 가 남는 건 이 확정의 귀결입니다. 마이의 "만들던 영상"
   * 목록에 남아 이어하거나 버려집니다.
   */
  const { data: projects } = useProjects(storeId, 'DRAFT');

  const next = () => {
    if (!purpose || !storeId) return;

    const reusable = projects?.find((d) => d.promotionPurpose === purpose);
    if (reusable) {
      // 같은 목적 — 서버에 손대지 않고 이어 씁니다.
      navigation.replace('PromotionDetail', { projectId: reusable.id, formatId });
      return;
    }

    createProject.mutate(
      { storeId, promotionPurpose: purpose },
      // 명세 4.2 개정으로 목적별 상세를 먼저 받습니다.
      { onSuccess: (p) => navigation.replace('PromotionDetail', { projectId: p.id, formatId }) }
    );
    // 실패는 아래 Banner 로 표시됩니다. 조용히 넘어가지 않습니다.
  };

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="다음"
            onPress={next}
            disabled={!purpose || !storeId}
            loading={createProject.isPending}
          />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="숏폼 만들기" step={{ current: 1, total: 4 }} />
      <View style={{ gap: space[2] }}>
        <Text style={text.title}>이번 영상으로{'\n'}무엇을 하고 싶으세요?</Text>
        <Text style={text.bodySmall}>목적에 따라 찍는 방식이 완전히 달라집니다.</Text>
      </View>

      {/* 버튼이 조용히 안 눌리는 대신 이유를 보여줍니다 */}
      {createProject.isError && (
        <Banner
          tone="danger"
          title="영상 만들기를 시작하지 못했습니다"
          description="잠시 후 다시 눌러 주세요."
        />
      )}

      {!storeId && (
        <Banner
          tone="warn"
          title="가게 정보를 먼저 등록해 주세요"
          description="어느 가게 영상인지 알아야 대사와 촬영 순서를 만들 수 있습니다."
        />
      )}

      <View style={{ gap: space[3] }}>
        {PURPOSES.map((p) => (
          <OptionRow
            key={p.key}
            title={p.title}
            description={p.description}
            selected={purpose === p.key}
            onPress={() => setPurpose(p.key)}
          />
        ))}
      </View>
    </Screen>
  );
}
