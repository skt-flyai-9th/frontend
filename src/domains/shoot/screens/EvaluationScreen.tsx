/**
 * S13.1.1~S13.4.1 AI 촬영 평가 · 명세 13.1, 13.2
 *
 * 명세에 두 API 가 있고 주는 정보가 다릅니다.
 *
 *   13.1 POST /evaluate    → 요약. ai_eval_score, ai_is_usable, ai_eval_issues(문장 하나)
 *   13.2 GET  /evaluation  → 상세. must_retake_issues, fixable_by_editing, ok_reasons
 *
 * 13.2 가 실패해도 13.1 요약만으로 판단할 수 있어야 합니다.
 * 둘 다 없을 때만 "확인하지 못했습니다" 를 띄웁니다.
 *
 * 기능명세 규칙: "MVP 는 점수보다 수정사항 1개를 우선한다"
 *   → 총점을 크게 띄우지 않습니다. 다시 찍어야 할 이유 하나만 강조합니다.
 *   → 평가가 실패해도 촬영본은 저장돼 있으므로 다음으로 넘어갈 수 있습니다.
 *
 * ⚠️ 평가 결과와 task_status 의 관계 (BE 확인 완료, 2026-08-21)
 *   재촬영 판정이 나면 태스크가 RETAKE_NEEDED 로 남습니다.
 *   그 상태로도 편집은 진행됩니다 — NOT_STARTED 만 아니면 되기 때문입니다.
 *   다시 찍으면 DONE 으로 바뀝니다.
 *
 *   상태 전환은 **서버가 처리합니다.** 앱이 따로 PATCH 하지 않습니다.
 *   (13.1 평가 실행 시 서버가 판정 결과를 태스크에 반영)
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner, Loading } from '../../../ui/Feedback';
import { color, radius, space, text } from '../../../design/theme';
import { useEvaluate, useEvaluation, useTasks } from '../../../api/queries/shoot';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'Evaluation'>;

export default function EvaluationScreen({ navigation, route }: Props) {
  const { projectId, taskId } = route.params;

  const evaluate = useEvaluate();
  const [started, setStarted] = useState(false);
  const { data: detail, isLoading: detailLoading } = useEvaluation(taskId, started);
  const { data: board } = useTasks(projectId);

  useEffect(() => {
    evaluate.mutate(taskId, { onSuccess: () => setStarted(true) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const tasks = board?.tasks ?? [];
  const next = tasks.find((t) => t.taskStatus === 'NOT_STARTED');
  const allDone = tasks.length > 0 && !next;

  /** 13.1 요약. 13.2 가 실패해도 이건 남아 있습니다. */
  const summary = evaluate.data;
  const waiting = (evaluate.isPending || detailLoading) && !summary && !detail;
  const nothing = !waiting && !summary && !detail;

  // 13.2 가 있으면 상세를, 없으면 13.1 요약을 씁니다.
  const usable = detail?.isUsable ?? summary?.aiIsUsable;
  const mustRetake = detail?.mustRetakeIssues ?? [];
  const fixable = detail?.fixableByEditing ?? [];
  const okReasons = detail?.okReasons ?? [];

  const goNext = () => {
    if (allDone) navigation.replace('TaskBoard', { projectId });
    else if (next) navigation.replace('TaskGuide', { projectId, taskId: next.id });
    else navigation.replace('TaskBoard', { projectId });
  };

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label={
              allDone ? '다 찍었어요, 영상 만들기' : next ? `다음: ${next.taskTitle}` : '촬영 목록으로'
            }
            onPress={goNext}
            // 평가는 참고일 뿐입니다. 기다리는 중에도 넘어갈 수 있어야 합니다.
            disabled={false}
          />
          <Button
            label="이 장면 다시 찍기"
            variant="quiet"
            size="small"
            onPress={() => navigation.replace('Camera', { projectId, taskId })}
          />
        </BottomAction>
      }
    >
      {/* 시안 V4: 뒤로가기는 목적지를 정하지 않고 **직전 화면** 으로 갑니다 */}
      <AppBar onBack={() => navigation.goBack()} title="찍은 영상 확인" />

      {waiting && (
        <Card>
          <Text style={text.subheading}>영상을 보고 있습니다</Text>
          <Loading label="몇 초면 끝납니다" />
        </Card>
      )}

      {nothing && (
        <Banner
          tone="warn"
          title="영상을 확인하지 못했습니다"
          description="그래도 촬영은 저장됐습니다. 그냥 다음으로 넘어가도 괜찮습니다."
        />
      )}

      {(summary || detail) && (
        <>
          <Card>
            <View style={styles.head}>
              <Text style={text.heading}>
                {usable ? '쓸 수 있습니다' : '다시 찍는 게 좋습니다'}
              </Text>
              <Badge
                label={usable ? '사용 가능' : '재촬영 권장'}
                tone={usable ? 'done' : 'warn'}
              />
            </View>

            {/* 점수보다 수정사항 하나를 먼저 */}
            {mustRetake.length > 0 ? (
              <View style={styles.primaryBox}>
                <Text style={text.micro}>한 가지만 고친다면</Text>
                <Text style={text.body}>{mustRetake[0]}</Text>
              </View>
            ) : okReasons.length > 0 ? (
              <View style={styles.okBox}>
                <Text style={text.micro}>잘 나온 점</Text>
                <Text style={text.body}>{okReasons[0]}</Text>
              </View>
            ) : summary?.aiEvalIssues ? (
              /* 13.2 가 아직 안 왔거나 실패했을 때 13.1 요약을 씁니다 */
              <View style={styles.okBox}>
                <Text style={text.micro}>확인 결과</Text>
                <Text style={text.body}>{summary.aiEvalIssues}</Text>
              </View>
            ) : null}

            {/* 13.2 를 기다리는 중이면 알려 줍니다 */}
            {summary && !detail && detailLoading && (
              <Text style={text.caption}>자세한 내용을 불러오는 중입니다.</Text>
            )}
          </Card>

          {fixable.length > 0 && (
            <Card>
              <Text style={text.subheading}>편집에서 알아서 고칠 것</Text>
              {fixable.map((issue, i) => (
                <View key={i} style={styles.row}>
                  <Check size={16} strokeWidth={2.5} color={color.done[500]} />
                  <Text style={[text.bodySmall, { flex: 1 }]}>{issue}</Text>
                </View>
              ))}
              <Text style={text.caption}>이건 다시 안 찍어도 됩니다.</Text>
            </Card>
          )}

          {mustRetake.length > 1 && (
            <Card>
              <Text style={[text.subheading, { color: color.warn[500] }]}>그 밖에 아쉬운 점</Text>
              {mustRetake.slice(1).map((issue, i) => (
                <Text key={i} style={text.bodySmall}>
                  · {issue}
                </Text>
              ))}
            </Card>
          )}

          {/*
            재촬영을 권했는데 그냥 넘어가려 할 때를 위한 안내.
            막지 않습니다 — 명세상 RETAKE_NEEDED 로도 편집이 진행됩니다.
          */}
          {usable === false && (
            <Banner
              tone="info"
              title="그냥 넘어가셔도 됩니다"
              description="이 장면은 '다시 찍으면 좋음'으로 표시되고, 영상은 그대로 만들어집니다. 나중에 촬영 목록에서 다시 찍으실 수도 있습니다."
            />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  primaryBox: { backgroundColor: color.brand[50], padding: space[4], borderRadius: radius.md, gap: 2 },
  okBox: { backgroundColor: color.done[100], padding: space[4], borderRadius: radius.md, gap: 2 },
  row: { flexDirection: 'row', gap: space[2] },
});
