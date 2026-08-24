/**
 * S14.6.2 렌더 진행률·실패 복구 · 명세 14.1, 14.2
 *
 * 명세 14.1 body 의 target_platform 은 편집 규격을 정합니다.
 * 인스타그램과 유튜브는 자막 위치와 안전 영역이 달라서,
 * 한쪽 기준으로 만든 영상을 다른 쪽에 올리면 자막이 UI 에 가려집니다.
 *
 * 그래서 시작 전에 어디에 올릴지 먼저 묻습니다.
 * (여러 플랫폼용 파일은 15.1 에서 한꺼번에 만듭니다)
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Banner, JobProgress } from '../../../ui/Feedback';
import { OptionRow } from '../../../ui/Field';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useEditResult, useStartEdit } from '../../../api/queries/edit';
import { ApiError } from '../../../api/http';
import type { IncompleteTask, TargetPlatform } from '../../../api/schema/types';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'Render'>;

const STEPS = ['촬영본 정리', '좋은 부분 고르기', '자막 만들기', '마무리'];

const PLATFORMS: { key: TargetPlatform; title: string; description: string }[] = [
  {
    key: 'INSTAGRAM',
    title: '인스타그램 릴스',
    description: '자막을 화면 가운데로 올려 UI에 안 가리게 만듭니다',
  },
  {
    key: 'YOUTUBE',
    title: '유튜브 쇼츠',
    description: '제목과 설명을 함께 만들고 자막을 아래쪽에 둡니다',
  },
];

/** 렌더가 끝나지 않을 때를 대비한 상한 */
const TIMEOUT_MS = 180000;

export default function RenderScreen({ navigation, route }: Props) {
  const { projectId, platform } = route.params;

  const startEdit = useStartEdit(projectId);
  const [chosen, setChosen] = useState<TargetPlatform | null>(platform ?? null);
  const [started, setStarted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: result } = useEditResult(projectId, started);

  // 파라미터로 플랫폼이 오면 바로 시작합니다(수정 후 재렌더 등).
  useEffect(() => {
    if (platform && !started) begin(platform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  useEffect(() => {
    if (result?.renderStatus === 'COMPLETED') {
      navigation.replace('EditResult', { projectId });
    }
  }, [result?.renderStatus, navigation, projectId]);

  function begin(p: TargetPlatform) {
    setChosen(p);
    setTimedOut(false);
    setStarted(true);
    startEdit.mutate(p);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
  }

  /**
   * 명세 14.1: 촬영본이 빈 태스크가 있으면 400 TASKS_INCOMPLETE.
   * 어떤 장면인지 서버가 알려주므로 그대로 보여주고 촬영 목록으로 안내합니다.
   */
  const err = startEdit.error;
  const incomplete =
    err instanceof ApiError && err.code === 'TASKS_INCOMPLETE'
      ? ((err.detail?.incompleteTasks as IncompleteTask[] | undefined) ?? [])
      : null;

  const failed = result?.renderStatus === 'FAILED' || startEdit.isError || timedOut;
  const percent = (result?.progressPercent ?? 0) / 100;
  const stepIndex = Math.min(STEPS.length - 1, Math.floor(percent * STEPS.length));

  // ── 플랫폼 선택 ──────────────────────────────────────
  if (!started) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button
              label="영상 만들기"
              onPress={() => chosen && begin(chosen)}
              disabled={!chosen}
            />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} title="영상 만들기" />

        <View style={{ gap: space[2] }}>
          <Text style={text.title}>어디에 올리실 거예요?</Text>
          <Text style={text.bodySmall}>
            올리는 곳에 따라 자막 위치가 달라집니다. 나중에 다른 곳에 올릴 파일도 만들 수 있습니다.
          </Text>
        </View>

        <View style={{ gap: space[3] }}>
          {PLATFORMS.map((p) => (
            <OptionRow
              key={p.key}
              title={p.title}
              description={p.description}
              selected={chosen === p.key}
              onPress={() => setChosen(p.key)}
            />
          ))}
        </View>
      </Screen>
    );
  }

  // ── 렌더 진행 ────────────────────────────────────────
  return (
    <Screen
      scroll={false}
      footer={
        failed ? (
          <BottomAction>
            {incomplete ? (
              <Button
                label="남은 장면 찍으러 가기"
                onPress={() => navigation.replace('TaskBoard', { projectId })}
              />
            ) : (
              <>
                <Button label="다시 시도" onPress={() => chosen && begin(chosen)} />
                <Button
                  label="촬영 목록으로"
                  variant="quiet"
                  size="small"
                  onPress={() => navigation.replace('TaskBoard', { projectId })}
                />
              </>
            )}
          </BottomAction>
        ) : undefined
      }
    >
      <View style={styles.wrap}>
        <View style={{ gap: space[2] }}>
          <Text style={text.title}>영상을 만들고 있습니다</Text>
          <Text style={text.bodySmall}>앱을 닫아도 계속 만들어집니다. 다 되면 알려드립니다.</Text>
        </View>

        {incomplete ? (
          <Banner
            tone="warn"
            title={`아직 안 찍은 장면이 ${incomplete.length}개 있습니다`}
            description={
              incomplete.length > 0
                ? `${incomplete.map((t) => t.taskTitle).join(', ')}을(를) 찍으면 영상을 만들 수 있습니다.`
                : '촬영 목록에서 남은 장면을 확인해 주세요.'
            }
          />
        ) : failed ? (
          <Banner
            tone="danger"
            title={timedOut ? '시간이 너무 오래 걸립니다' : '영상을 만들지 못했습니다'}
            description="촬영본은 그대로 있습니다. 다시 시도하거나 잠시 뒤에 다시 오세요."
          />
        ) : (
          <>
            <JobProgress label={`${result?.progressPercent ?? 0}%`} progress={percent} />
            <View style={styles.steps}>
              {STEPS.map((s, i) => (
                <View key={s} style={styles.stepRow}>
                  <View
                    style={[
                      styles.dot,
                      i < stepIndex && { backgroundColor: color.done[500] },
                      i === stepIndex && { backgroundColor: color.brand[600] },
                    ]}
                  />
                  <Text
                    style={[
                      text.body,
                      i > stepIndex && { color: color.ink[300] },
                      i === stepIndex && { fontFamily: theme.text.bodyStrong.fontFamily },
                    ]}
                  >
                    {s}
                  </Text>
                </View>
              ))}
            </View>
            {chosen && (
              <Text style={text.caption}>
                {chosen === 'INSTAGRAM' ? '인스타그램 릴스' : '유튜브 쇼츠'} 규격으로 만듭니다.
              </Text>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: space[6] },
  steps: { gap: space[4] },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  dot: { width: 12, height: 12, borderRadius: radius.pill, backgroundColor: color.ink[200] },
});
