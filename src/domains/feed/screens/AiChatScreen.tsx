/**
 * AiChatScreen — AI 추천 탭. 프로토타입 `03_AI추천_채팅.png`.
 *
 * 기존 QuizScreen(질문 카드 6장)과 같은 6.1/6.2 API 를 쓰되,
 * 화면만 말풍선 대화로 바꿨습니다. 제출 로직은 QuizScreen 의 것을
 * 그대로 옮겨왔습니다 (인수인계 §6.3 "로직은 가져다 쓰세요").
 *
 * 왜 대화가 목적 선택부터 시작하나
 *   6.1 GET /quiz-questions 는 프로젝트 단위 API 라 projectId 가 먼저
 *   필요합니다. 그리고 4.1 프로젝트 생성에는 목적이 필수이고,
 *   생성 후에는 바꿀 수 없습니다(BE 확정). 그래서 대화 순서가
 *     들어가기(정적) → 목적(정적) → 4.1 생성 → 6.1 질문들 → 6.2 제출
 *   이 됩니다. 목적을 나중에 물으면 프로젝트를 만들 수 없습니다.
 *
 * DRAFT 재사용
 *   같은 목적의 DRAFT 가 있으면 재사용합니다(쌓임 방지 — PurposeSelect 와
 *   같은 이유). 목적이 다르면 재사용하지 않습니다. 목적 변경이 금지라
 *   PATCH 로 바꿀 수 없기 때문입니다.
 *
 * ⚠️ 6.2 body: free_text 는 answers 와 별개 필드입니다.
 *    자유입력을 answers 에도 넣으면 중복 전송입니다 (인수인계 §6.3).
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Send, Sparkles } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { Banner, Loading } from '../../../ui/Feedback';
import { useAppState } from '../../../lib/appState';
import {
  useProjects,
  useCreateProject,
  useQuizQuestions,
  useSubmitQuiz,
} from '../../../api/queries/project';
import theme, { color, space, radius, text, sizing } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';
import type { PromotionPurpose, QuizQuestion } from '../../../api/schema/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Bubble = { role: 'ai' | 'me'; content: string };

const PURPOSES: PromotionPurpose[] = ['메뉴소개', '이벤트알리기', '가게소개', '고객늘리기'];

const INTRO_OPTIONS = [
  '어떤 걸 찍을지 막막해요',
  '홍보하고 싶은 주제가 있어요',
  '직접 아이디어 입력하기',
] as const;

export default function AiChatScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);

  // ── 대화 상태 ──
  const [log, setLog] = useState<Bubble[]>([
    { role: 'ai', content: '오늘 어떤 영상을 찍을까요?' },
  ]);
  const [step, setStep] = useState<'intro' | 'purpose' | 'questions' | 'submitting'>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [freeText, setFreeText] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ── 서버 ──
  const { data: drafts } = useProjects(storeId ?? undefined, 'DRAFT');
  const createProject = useCreateProject();
  const questionsQuery = useQuizQuestions(projectId ?? undefined);
  const submit = useSubmitQuiz(projectId ?? 0);

  // free_text 타입 질문은 하단 입력창이 대신하므로 대화 단계에서 뺍니다.
  const questions = useMemo(
    () => (questionsQuery.data ?? []).filter((q) => q.type !== 'free_text'),
    [questionsQuery.data]
  );
  const current: QuizQuestion | undefined = step === 'questions' ? questions[qIndex] : undefined;

  const say = (bubbles: Bubble[]) => {
    setLog((prev) => [...prev, ...bubbles]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  // ── 단계 진행 ──

  const pickIntro = (opt: (typeof INTRO_OPTIONS)[number]) => {
    say([{ role: 'me', content: opt }]);
    if (opt === '직접 아이디어 입력하기') {
      say([
        {
          role: 'ai',
          content: '좋아요! 아래 입력창에 아이디어를 적어 주세요. 함께 추천에 반영할게요.',
        },
        { role: 'ai', content: '먼저, 이번 영상의 목적을 골라 주세요. 만든 뒤에는 바꿀 수 없어요.' },
      ]);
    } else {
      say([
        { role: 'ai', content: '먼저, 이번 영상의 목적을 골라 주세요. 만든 뒤에는 바꿀 수 없어요.' },
      ]);
    }
    setStep('purpose');
  };

  const pickPurpose = (purpose: PromotionPurpose) => {
    if (!storeId) return;
    say([{ role: 'me', content: purpose }]);

    // 같은 목적의 DRAFT 는 재사용 — 목적이 다르면 새로 만듭니다(변경 금지).
    const reusable = drafts?.find((d) => d.promotionPurpose === purpose);
    if (reusable) {
      setProjectId(reusable.id);
      afterProject();
      return;
    }
    createProject.mutate(
      { storeId, promotionPurpose: purpose },
      {
        onSuccess: (p) => {
          setProjectId(p.id);
          afterProject();
        },
        // 실패는 아래 Banner 로 표시됩니다. 조용히 넘어가지 않습니다.
      }
    );
  };

  const afterProject = () => {
    say([{ role: 'ai', content: '몇 가지만 더 여쭤볼게요.' }]);
    setStep('questions');
    setQIndex(0);
  };

  const pickAnswer = (q: QuizQuestion, opt: string) => {
    if (q.type === 'multi_choice') {
      // 복수 선택: 누를 때마다 토글, "다음" 으로 넘어갑니다.
      setAnswers((p) => {
        const cur = Array.isArray(p[q.id]) ? (p[q.id] as string[]) : [];
        return { ...p, [q.id]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
      });
      return;
    }
    setAnswers((p) => ({ ...p, [q.id]: opt }));
    say([{ role: 'me', content: opt }]);
    advance(q, opt);
  };

  const confirmMulti = (q: QuizQuestion) => {
    const v = answers[q.id];
    const picked = Array.isArray(v) ? v : [];
    if (picked.length === 0) return;
    say([{ role: 'me', content: picked.join(', ') }]);
    advance(q, picked.join(', '));
  };

  const advance = (q: QuizQuestion, _answer: string) => {
    const nextIndex = questions.findIndex((x) => x.id === q.id) + 1;
    if (nextIndex < questions.length) {
      setQIndex(nextIndex);
      return;
    }
    doSubmit();
  };

  const doSubmit = () => {
    if (!projectId) return;
    setStep('submitting');
    say([{ role: 'ai', content: '알겠어요. 딱 맞는 숏폼을 찾고 있어요…' }]);

    // 명세 6.2: free_text 는 answers 에 넣지 않습니다 (별개 필드).
    const body = {
      answers: questions
        .filter((q) => answers[q.id])
        .map((q) => {
          const v = answers[q.id];
          return { questionId: q.id, answer: Array.isArray(v) ? v.join(', ') : (v as string) };
        }),
      freeText,
    };
    submit.mutate(body, {
      onSuccess: () =>
        nav.navigate('Create', { screen: 'QuizResult', params: { projectId } }),
      onError: () => {
        // 빠져나갈 길을 둡니다 — 다시 시도할 수 있게 질문 단계로 되돌립니다.
        setStep('questions');
        say([{ role: 'ai', content: '앗, 잠시 문제가 있었어요. 마지막 질문을 다시 눌러 주세요.' }]);
      },
    });
  };

  const sendFree = () => {
    const t = input.trim();
    if (!t) return;
    setInput('');
    say([{ role: 'me', content: t }]);
    // 자유입력은 6.2 의 free_text 필드로만 갑니다.
    setFreeText((prev) => (prev ? `${prev}\n${t}` : t));
    say([{ role: 'ai', content: '메모했어요! 추천에 함께 반영할게요.' }]);
  };

  // ── 현재 단계의 선택지 ──
  const options: string[] =
    step === 'intro'
      ? [...INTRO_OPTIONS]
      : step === 'purpose'
        ? PURPOSES
        : current?.options ?? [];

  const multiPicked = current && Array.isArray(answers[current.id])
    ? (answers[current.id] as string[])
    : [];

  return (
    <Screen padded={false} scroll={false} edges={['top']}>
      <View style={styles.header}>
        <Text style={text.title}>AI 숏폼 추천</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.chat}
          keyboardShouldPersistTaps="handled"
        >
          {log.map((b, i) => (
            <View
              key={i}
              style={[styles.bubbleRow, b.role === 'me' && { justifyContent: 'flex-end' }]}
            >
              {b.role === 'ai' && (
                <View style={styles.avatar}>
                  <Sparkles size={18} strokeWidth={2} color={color.paper} />
                </View>
              )}
              <View style={[styles.bubble, b.role === 'me' ? styles.me : styles.ai]}>
                <Text style={[text.body, b.role === 'me' && { color: color.paper }]}>
                  {b.content}
                </Text>
              </View>
            </View>
          ))}

          {/* 질문 로딩 — 조용히 기다리게 두지 않습니다 */}
          {step === 'questions' && questionsQuery.isLoading && (
            <Loading label="질문을 준비하는 중" />
          )}
          {step === 'questions' && questionsQuery.isError && (
            <Banner
              tone="warn"
              title="질문을 불러오지 못했습니다"
              description="아래 입력창에 하고 싶은 이야기를 적어 주셔도 됩니다."
            />
          )}
          {createProject.isError && (
            <Banner tone="warn" title="시작하지 못했습니다" description="목적을 다시 골라 주세요." />
          )}

          {/* 현재 질문 말풍선 */}
          {current && (
            <View style={styles.bubbleRow}>
              <View style={styles.avatar}>
                <Sparkles size={18} strokeWidth={2} color={color.paper} />
              </View>
              <View style={[styles.bubble, styles.ai]}>
                <Text style={text.body}>{current.question}</Text>
                {current.type === 'multi_choice' && (
                  <Text style={[text.micro, { color: color.ink[400] }]}>여러 개 고를 수 있어요</Text>
                )}
              </View>
            </View>
          )}

          {/* 선택지 버튼 — 터치 영역 넉넉하게 */}
          {step !== 'submitting' && options.length > 0 && (
            <View style={styles.options}>
              {options.map((opt) => {
                const selected = current?.type === 'multi_choice' && multiPicked.includes(opt);
                return (
                  <Pressable
                    key={opt}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      if (step === 'intro') pickIntro(opt as (typeof INTRO_OPTIONS)[number]);
                      else if (step === 'purpose') pickPurpose(opt as PromotionPurpose);
                      else if (current) pickAnswer(current, opt);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionOn,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[text.body, selected && { color: color.brand[700] }]}>{opt}</Text>
                  </Pressable>
                );
              })}
              {current?.type === 'multi_choice' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => confirmMulti(current)}
                  style={({ pressed }) => [
                    styles.option,
                    styles.confirm,
                    multiPicked.length === 0 && { opacity: 0.4 },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[text.body, { color: color.paper }]}>
                    {multiPicked.length > 0 ? `${multiPicked.length}개 골랐어요, 다음` : '골라 주세요'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {step === 'submitting' && <Loading label="추천을 만드는 중" />}
        </ScrollView>

        {/* 하단 자유 입력 — 언제든 쓸 수 있고, 6.2 free_text 로 갑니다 */}
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="직접 입력해 보세요"
            placeholderTextColor={color.ink[300]}
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={sendFree}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="보내기"
            onPress={sendFree}
            style={({ pressed }) => [styles.send, pressed && { opacity: 0.7 }]}
          >
            <Send size={20} strokeWidth={2} color={color.paper} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: space[3],
    borderBottomWidth: theme.border.hairline,
    borderBottomColor: color.ink[200],
  },
  chat: { padding: space[5], gap: space[3], paddingBottom: space[6] },
  bubbleRow: { flexDirection: 'row', gap: space[2], alignItems: 'flex-end' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 가이드라인 §5.6: 최대 78%, 꼬리쪽 모서리만 8, AI 말풍선에만 그림자
  bubble: { maxWidth: '78%', paddingHorizontal: space[4], paddingVertical: space[3], borderRadius: radius.lg },
  ai: {
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.sm,
    ...theme.elevation('bubble'),
  },
  me: { backgroundColor: color.brand[600], borderTopRightRadius: radius.sm },
  options: { gap: space[2], marginTop: space[2] },
  option: {
    minHeight: sizing.touchTargetMin,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    // 가이드라인 §3.1: 버튼류는 12
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
    ...theme.elevation('bubble'),
  },
  optionOn: { borderColor: color.brand[300], backgroundColor: color.brand[50] },
  confirm: { backgroundColor: color.brand[600], borderColor: color.brand[600], alignItems: 'center' },
  inputRow: {
    flexDirection: 'row',
    gap: space[2],
    padding: space[4],
    borderTopWidth: theme.border.hairline,
    borderTopColor: color.ink[200],
    backgroundColor: color.paper,
  },
  input: {
    flex: 1,
    minHeight: sizing.touchTargetMin,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    borderRadius: radius.pill,
    paddingHorizontal: space[4],
    ...theme.text.body,
  },
  send: {
    width: sizing.touchTargetMin,
    height: sizing.touchTargetMin,
    borderRadius: radius.pill,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
