/** S04.3.1 얼굴 노출 모드 + S04.3.3 촬영 조건 · 명세 4.2 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Chip } from '../../../ui/Chip';
import { Banner } from '../../../ui/Feedback';
import { OptionRow } from '../../../ui/Field';
import { space, text } from '../../../design/theme';
import { useUpdateProject } from '../../../api/queries/project';
import type { FaceExposureMode } from '../../../api/schema/types';
import { useAutoSave } from '../../../lib/useAutoSave';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'ShootCondition'>;

/** 명세 face_exposure_mode 값과 정확히 일치 */
const FACE_MODES: { key: FaceExposureMode; title: string; description: string }[] = [
  { key: '비노출', title: '얼굴 안 나오게', description: '손, 상품, 공간 위주로 만듭니다' },
  { key: '일부노출', title: '일부만', description: '뒷모습이나 손, 옆모습 정도는 괜찮습니다' },
  { key: '전체노출', title: '얼굴 나와도 괜찮음', description: '직접 등장하는 장면을 넣습니다' },
];

const TIMES = [5, 10, 20];

export default function ShootConditionScreen({ navigation, route }: Props) {
  const { projectId } = route.params;

  // 진행 상황을 서버에 남깁니다. 앱을 꺼도 이어서 할 수 있습니다.
  useAutoSave({ projectId, step: 'SETUP' });
  const updateProject = useUpdateProject(projectId);

  const [faceMode, setFaceMode] = useState<FaceExposureMode>('비노출');
  const [solo, setSolo] = useState(true);
  const [minutes, setMinutes] = useState(10);

  const next = () => {
    // 명세 shooting_condition 은 자유 문자열입니다.
    const condition = `${solo ? '혼자 촬영' : '촬영 도와줄 사람 있음'}, 약 ${minutes}분 가능`;
    const formatId = route.params.formatId;
    updateProject.mutate(
      { faceExposureMode: faceMode, shootingCondition: condition },
      {
        onSuccess: () => {
          // 홈 피드에서 이미 포맷을 골랐으면 갈림길(질문/피드)이 필요 없습니다.
          // BE 확정 흐름대로 곧장 7.1 기획으로 갑니다.
          if (formatId) navigation.navigate('PlanSummary', { projectId, formatId });
          else navigation.navigate('PathChoice', { projectId });
        },
      }
    );
  };

  return (
    <Screen
      footer={
        <BottomAction>
          <Button label="다음" onPress={next} loading={updateProject.isPending} />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="숏폼 만들기" step={{ current: 4, total: 4 }} />
      <View style={{ gap: space[2] }}>
        <Text style={text.title}>어떻게 찍을 수 있으세요?</Text>
        <Text style={text.bodySmall}>실제로 찍을 수 있는 방식만 추천하기 위해 물어봅니다.</Text>
      </View>

      <Text style={text.subheading}>얼굴</Text>
      <View style={{ gap: space[3] }}>
        {FACE_MODES.map((m) => (
          <OptionRow
            key={m.key}
            title={m.title}
            description={m.description}
            selected={faceMode === m.key}
            onPress={() => setFaceMode(m.key)}
          />
        ))}
      </View>

      {faceMode === '비노출' && (
        <Banner
          tone="info"
          title="얼굴 없이도 충분히 만들 수 있습니다"
          description="손, 조리 과정, 상품, 공간 위주로 구성하고 설명은 자막으로 넣습니다."
        />
      )}

      <Text style={text.subheading}>찍어줄 사람</Text>
      <View style={{ gap: space[3] }}>
        <OptionRow
          title="혼자 찍습니다"
          description="휴대폰을 세워두고 찍는 방식으로 안내합니다"
          selected={solo}
          onPress={() => setSolo(true)}
        />
        <OptionRow
          title="찍어줄 사람이 있습니다"
          description="움직이는 장면까지 넣을 수 있습니다"
          selected={!solo}
          onPress={() => setSolo(false)}
        />
      </View>

      <Text style={text.subheading}>쓸 수 있는 시간</Text>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {TIMES.map((m) => (
          <Chip key={m} label={`${m}분`} selected={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </View>
      <Text style={text.caption}>
        {minutes <= 5
          ? '5분이면 찍을 장면을 3개 이하로 줄여 드립니다.'
          : '장면 수를 시간에 맞춰 자동으로 조정합니다.'}
      </Text>
    </Screen>
  );
}
