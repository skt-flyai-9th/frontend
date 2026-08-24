/**
 * S08.2.1 진행률·상태 · 명세 8.1, 8.2
 *
 * ⚠️ MVP 규칙 (BE 확인 완료, 2026-08-21)
 *
 *   - 건너뛰기·교체는 스코프에서 제외되었습니다. SKIPPED 상태값도 없습니다.
 *   - "주어진 태스크는 다 찍어야 편집 시작" 이 기본 전제입니다.
 *   - 다만 **전부 성공 촬영일 필요는 없습니다.**
 *     NOT_STARTED 만 아니면 다음 단계로 넘어갈 수 있습니다.
 *     즉 RETAKE_NEEDED(다시 찍는 게 좋음) 로 남아 있어도 편집이 돌아갑니다.
 *   - 진행률은 DONE + RETAKE_NEEDED 기준입니다.
 *
 * 재료가 떨어지거나 손님이 몰려서 지금 못 찍는 경우
 *   MVP 에서는 "나중에 이어서 촬영" 으로 처리합니다.
 *   프로젝트는 DRAFT 로 남고, 9.3 자동저장으로 돌아와 남은 태스크를 마저 찍습니다.
 *   그래서 화면에서도 "그만두면 없어진다" 가 아니라
 *   "여기까지 저장되니 나중에 이어서 하시면 된다" 를 분명히 알립니다.
 */
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Banner, EmptyState, JobProgress, Loading } from '../../../ui/Feedback';
import { ProgressSpine, type SpineItem } from '../../../ui/ProgressSpine';
import { color, space, text } from '../../../design/theme';
import { useTasks } from '../../../api/queries/shoot';
import { useAutoSave } from '../../../lib/useAutoSave';
import type { RootStackParamList, CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'TaskBoard'>;

export default function TaskBoardScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data, isLoading, isError, refetch } = useTasks(projectId);

  const tasks = data?.tasks ?? [];
  /**
   * 다음에 할 장면.
   *
   * IN_PROGRESS 도 포함합니다. 업로드가 중간에 끊긴 태스크는
   * 촬영본이 없으므로 다시 찍어야 하는데, 여기서 빼면
   * 버튼으로는 영영 도달할 수 없게 됩니다.
   */
  const next = tasks.find(
    (t) => t.taskStatus === 'NOT_STARTED' || t.taskStatus === 'IN_PROGRESS'
  );
  const retake = tasks.filter((t) => t.taskStatus === 'RETAKE_NEEDED');
  const done = tasks.filter((t) => t.taskStatus === 'DONE');

  /**
   * 명세 14.1: "모든 태스크가 footage_url IS NOT NULL 이어야 편집이 시작됩니다"
   *
   * 촬영본이 실제로 있는 상태는 DONE 과 RETAKE_NEEDED 뿐입니다.
   * IN_PROGRESS 는 업로드 중이라 아직 footage_url 이 없을 수 있어,
   * 이것까지 통과시키면 서버가 400(TASKS_INCOMPLETE)을 냅니다.
   */
  const submitted = tasks.filter(
    (t) => t.taskStatus === 'DONE' || t.taskStatus === 'RETAKE_NEEDED'
  );
  const remaining = tasks.length - submitted.length;
  const canFinish = tasks.length > 0 && remaining === 0;

  useAutoSave({
    projectId,
    step: 'SHOOTING',
    state: next ? { lastTaskId: next.id, progressRate: data?.progressRate ?? 0 } : undefined,
  });

  const items: SpineItem[] = tasks.map((t) => ({
    id: String(t.id),
    title: t.taskTitle,
    meta:
      t.taskStatus === 'DONE'
        ? '찍었습니다 · 눌러서 다시 찍기'
        : t.taskStatus === 'RETAKE_NEEDED'
          ? '다시 찍으면 더 좋아집니다'
          : t.taskStatus === 'IN_PROGRESS'
            ? '보내는 중'
            : t.taskType,
    status:
      t.taskStatus === 'DONE'
        ? 'done'
        : t.taskStatus === 'RETAKE_NEEDED'
          ? 'retake'
          : t.id === next?.id
            ? 'current'
            : 'todo',
  }));

  const onPressItem = (item: SpineItem) => {
    const task = tasks.find((t) => String(t.id) === item.id);
    if (!task) return;

    if (task.taskStatus === 'DONE') {
      Alert.alert('이 장면', '이미 찍은 장면입니다.', [
        { text: '닫기', style: 'cancel' },
        {
          text: '다시 찍기',
          onPress: () => navigation.navigate('TaskGuide', { projectId, taskId: task.id }),
        },
      ]);
      return;
    }

    if (task.taskStatus === 'RETAKE_NEEDED') {
      Alert.alert('다시 찍는 게 좋은 장면', '지금 그대로 두셔도 영상은 만들어집니다.', [
        { text: '그대로 두기', style: 'cancel' },
        {
          text: '다시 찍기',
          onPress: () => navigation.navigate('TaskGuide', { projectId, taskId: task.id }),
        },
      ]);
      return;
    }

    navigation.navigate('TaskGuide', { projectId, taskId: task.id });
  };

  /** 지금은 못 찍는 상황 — 프로젝트는 남고 나중에 이어서 합니다. */
  const pauseForNow = () => {
    Alert.alert(
      '나중에 이어서 하시겠어요?',
      '여기까지 찍은 것은 저장됩니다. 홈에서 "만들던 영상"을 눌러 이어서 하시면 됩니다.',
      [
        { text: '계속 찍기', style: 'cancel' },
        {
          text: '나중에 하기',
          onPress: () => rootNav.navigate('Main', { screen: 'HomeFeed' }),
        },
      ]
    );
  };

  return (
    <Screen
      footer={
        <BottomAction>
          {canFinish ? (
            <Button label="영상 만들기" onPress={() => navigation.navigate('Render', { projectId })} />
          ) : (
            <Button
              label={next ? `${next.taskTitle} 찍기` : '촬영 시작'}
              onPress={() => next && navigation.navigate('TaskGuide', { projectId, taskId: next.id })}
              disabled={!next}
            />
          )}
          {!canFinish && tasks.length > 0 && (
            <Button label="나중에 이어서 하기" variant="quiet" size="small" onPress={pauseForNow} />
          )}
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="찍을 순서" />

      {isLoading && !data && <Loading label="촬영 목록을 불러오는 중" />}

      {(isError || (!isLoading && tasks.length === 0)) && (
        <>
          <EmptyState
            title="촬영 목록을 불러오지 못했습니다"
            description="계획을 다시 만들거나 잠시 후 시도해 주세요."
            actionLabel="다시 시도"
            onAction={() => refetch()}
          />
          <Button label="처음으로" variant="quiet" size="small" onPress={() => navigation.goBack()} />
        </>
      )}

      {data && tasks.length > 0 && (
        <Card>
          <Text style={text.subheading}>
            {tasks.length}개 중 {done.length + retake.length}개 찍었습니다
          </Text>
          <JobProgress
            label="진행률"
            progress={data.progressRate / 100}
            eta={
              data.estimatedRemainingMin > 0
                ? `약 ${data.estimatedRemainingMin}분 남음`
                : undefined
            }
          />
        </Card>
      )}

      {canFinish && retake.length === 0 && (
        <Banner
          tone="done"
          title="필요한 장면을 다 찍었습니다"
          description="이제 영상 만들기를 누르면 자르기·자막까지 자동으로 만듭니다."
        />
      )}

      {/* RETAKE_NEEDED 가 있어도 편집은 됩니다. 막지 않고 알리기만 합니다. */}
      {canFinish && retake.length > 0 && (
        <Banner
          tone="warn"
          title={`${retake.length}개는 다시 찍으면 더 좋아집니다`}
          description={`${retake.map((t) => t.taskTitle).join(', ')} — 그대로 두셔도 영상은 만들어집니다.`}
        />
      )}

      {!canFinish && tasks.length > 0 && (
        <Banner
          tone="info"
          title={`${remaining}개 더 찍으면 영상을 만들 수 있습니다`}
          description="한 번에 다 안 하셔도 됩니다. 중간에 그만둬도 여기까지 저장됩니다."
        />
      )}

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>한 번에 하나씩</Text>
        <Text style={text.bodySmall}>순서대로 하나씩 안내해 드립니다.</Text>
      </View>

      <View style={styles.spine}>
        <ProgressSpine items={items} onPressItem={onPressItem} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spine: { paddingTop: space[2] },
});
