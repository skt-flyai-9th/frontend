/** S07.4.2 대본·콘티 · 명세 7.2 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../../../ui/Feedback';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner, Loading } from '../../../ui/Feedback';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useScenes } from '../../../api/queries/project';
import { seconds } from '../../../lib/format';
import { useAutoSave } from '../../../lib/useAutoSave';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'Storyboard'>;

export default function StoryboardScreen({ navigation, route }: Props) {
  const { projectId } = route.params;

  // 진행 상황을 서버에 남깁니다. 앱을 꺼도 이어서 할 수 있습니다.
  useAutoSave({ projectId, step: 'PLANNING' });
  const { data: scenes, isLoading, isError, refetch } = useScenes(projectId);

  const total = scenes?.reduce((sum, s) => sum + s.targetDurationSec, 0) ?? 0;

  return (
    <Screen
      footer={
        <BottomAction>
          <Button label="자막 확인하기" onPress={() => navigation.navigate('SubtitleEdit', { projectId })} />
          <Button
            label="바로 찍으러 가기"
            variant="quiet"
            size="small"
            onPress={() => navigation.navigate('TaskBoard', { projectId })}
          />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="완성될 영상" />

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>이런 영상이 나옵니다</Text>
        <Text style={text.bodySmall}>
          전체 {seconds(total)} · 장면 {scenes?.length ?? 0}개
        </Text>
      </View>

      <Banner
        tone="info"
        title="지금 다 외우지 않아도 됩니다"
        description="촬영할 때 한 장면씩 따로 안내해 드립니다."
      />

      {isLoading && <Loading label="대본을 만드는 중" />}

      {scenes?.map((s) => (
        <Card key={s.id}>
          <View style={styles.head}>
            <View style={styles.numBox}>
              <Text style={styles.num}>{s.sceneOrder}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={text.bodyStrong}>{s.sceneDescription}</Text>
              <Text style={text.micro}>
                {seconds(s.targetDurationSec)} · {s.shotType}
              </Text>
            </View>
            <Badge label={s.shotType} />
          </View>

          <View style={styles.subtitleBlock}>
            <Text style={text.micro}>화면에 뜰 자막</Text>
            <Text style={[text.body, { color: color.ink[900] }]}>{s.sceneSubtitle}</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: space[3], alignItems: 'center' },
  numBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: color.ink[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { ...text.bodySmall, color: color.paper, fontFamily: theme.text.bodyStrong.fontFamily },
  subtitleBlock: {
    backgroundColor: color.brand[50],
    padding: space[4],
    borderRadius: radius.md,
    gap: 2,
  },
});
