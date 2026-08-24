/**
 * S06.1.1~S06.1.3 질문형 흐름 · 명세 6.1, 6.2
 *
 * ⚠️ 명세 6.2 body 구조에 주의
 *   {
 *     "answers": [{"question_id": "q1", "answer": "대표메뉴"}],
 *     "free_text": "이번 주말 딸기 케이크 신메뉴 홍보하고 싶어요"
 *   }
 *
 *   free_text 는 answers 배열과 **분리된 별도 필드**입니다.
 *   자유입력 질문의 답을 answers 에도 넣으면 서버가 같은 내용을 두 번 받습니다.
 *   그래서 아래에서 free_text 타입 질문은 answers 에서 제외합니다.
 *
 * multi_choice
 *   명세 6.1 의 type 에 multi_choice 가 올 수 있습니다.
 *   단일 선택으로만 처리하면 답이 하나만 전송됩니다.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Badge } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import { OptionRow } from '../../../ui/Field';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useQuizQuestions, useSubmitQuiz } from '../../../api/queries/project';
import { useAutoSave } from '../../../lib/useAutoSave';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'Quiz'>;

/** 복수 선택은 배열로, 나머지는 문자열로 보관합니다. */
type AnswerValue = string | string[];

export default function QuizScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  useAutoSave({ projectId, step: 'FORMAT' });

  const { data: questions, isLoading, isError, refetch } = useQuizQuestions(projectId);
  const submit = useSubmitQuiz(projectId);

  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});

  if (isError || (!isLoading && (questions?.length ?? 0) === 0)) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => refetch()} />
            <Button
              label="직접 고를게요"
              variant="quiet"
              size="small"
              onPress={() => navigation.replace('FormatFeed', { projectId })}
            />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} />
        <EmptyState
          title="질문을 불러오지 못했습니다"
          description="목록에서 직접 고르셔도 됩니다."
        />
      </Screen>
    );
  }

  if (isLoading || !questions?.length) {
    return (
      <Screen>
        <AppBar onBack={() => navigation.goBack()} />
        <Loading label="질문을 준비하는 중" />
      </Screen>
    );
  }

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const value = values[current.id];

  const isMulti = current.type === 'multi_choice';
  const isFree = current.type === 'free_text';
  const selected = Array.isArray(value) ? value : value ? [value] : [];

  // 자유입력만 건너뛸 수 있습니다.
  const canNext = isFree || selected.length > 0;

  const pick = (opt: string) => {
    if (isMulti) {
      setValues((p) => {
        const cur = Array.isArray(p[current.id]) ? (p[current.id] as string[]) : [];
        return {
          ...p,
          [current.id]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt],
        };
      });
    } else {
      setValues((p) => ({ ...p, [current.id]: opt }));
    }
  };

  const next = () => {
    if (!isLast) {
      setIndex(index + 1);
      return;
    }

    // 명세 6.2: free_text 는 answers 에 넣지 않습니다.
    const answers = questions
      .filter((q) => q.type !== 'free_text' && values[q.id])
      .map((q) => {
        const v = values[q.id];
        return {
          questionId: q.id,
          // 복수 선택은 쉼표로 이어 보냅니다. 서버가 문자열 하나를 받기 때문입니다.
          answer: Array.isArray(v) ? v.join(', ') : v,
        };
      });

    const freeQ = questions.find((q) => q.type === 'free_text');
    const freeValue = freeQ ? values[freeQ.id] : undefined;

    submit.mutate(
      {
        answers,
        freeText: typeof freeValue === 'string' && freeValue.trim() ? freeValue.trim() : undefined,
      },
      { onSuccess: () => navigation.replace('QuizResult', { projectId }) }
    );
  };

  /** 되돌아보기에 보여줄 답 문자열 */
  const answerText = (id: string) => {
    const v = values[id];
    if (!v) return '건너뜀';
    return Array.isArray(v) ? v.join(', ') : v;
  };

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label={isLast ? '이대로 방법 찾기' : '다음'}
            onPress={next}
            disabled={!canNext}
            loading={submit.isPending}
          />
          {isFree && selected.length === 0 && !value && (
            <Button label="이 질문 건너뛰기" variant="quiet" size="small" onPress={next} />
          )}
        </BottomAction>
      }
    >
      <AppBar
        onBack={() => (index === 0 ? navigation.goBack() : setIndex(index - 1))}
        title={`${index + 1} / ${questions.length}`}
        step={{ current: index + 1, total: questions.length }}
      />

      {submit.isError && (
        <Banner
          tone="danger"
          title="추천을 받지 못했습니다"
          description="잠시 후 다시 눌러 주세요."
        />
      )}

      <View style={{ gap: space[2], paddingTop: space[4] }}>
        <Badge
          label={isFree ? '안 해도 됩니다' : isMulti ? '여러 개 고를 수 있어요' : '꼭 답해 주세요'}
          tone={isFree ? 'neutral' : 'brand'}
        />
        <Text style={text.title}>{current.question}</Text>
      </View>

      {isFree ? (
        <TextInput
          value={typeof value === 'string' ? value : ''}
          onChangeText={(v) => setValues((p) => ({ ...p, [current.id]: v }))}
          multiline
          style={styles.textArea}
          placeholder="예: 이번 주말까지만 들깨 칼국수 합니다"
          placeholderTextColor={color.ink[300]}
          accessibilityLabel={current.question}
        />
      ) : (
        <View style={{ gap: space[3] }}>
          {current.options?.map((opt) => (
            <OptionRow
              key={opt}
              title={opt}
              selected={selected.includes(opt)}
              onPress={() => pick(opt)}
            />
          ))}
        </View>
      )}

      {index > 0 && (
        <View style={styles.recap}>
          <Text style={text.micro}>지금까지 답하신 것</Text>
          {questions.slice(0, index).map((q) => (
            <View key={q.id} style={styles.recapRow}>
              <Text style={[text.caption, { flex: 1 }]}>{q.question}</Text>
              <Text style={text.caption}>{answerText(q.id)}</Text>
            </View>
          ))}
          <Button
            label="앞의 답 고치기"
            variant="quiet"
            size="small"
            full={false}
            onPress={() => setIndex(0)}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  textArea: {
    ...text.body,
    minHeight: 120,
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
    padding: space[4],
    textAlignVertical: 'top',
  },
  recap: {
    marginTop: space[4],
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    gap: space[2],
  },
  recapRow: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
});
