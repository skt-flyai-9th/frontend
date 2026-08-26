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
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ArrowUp, Camera as CameraIcon, RotateCcw, Sparkles } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { VideoThumbnail } from '../../../ui/VideoThumbnail';
import { representativeVideoUrl } from '../../../api/formatVideo';
import { AppBar } from '../../../ui/AppBar';
import { pressTap } from '../../../ui/press';
import { Banner } from '../../../ui/Feedback';
import { useAppState } from '../../../lib/appState';
import {
  useProjects,
  useCreateProject,
  useQuizAlternatives,
  useQuizQuestions,
  useSubmitQuiz,
  useVideoFormat,
} from '../../../api/queries/project';
import theme, { color, space, radius, text, sizing } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';
import type { Id, PromotionPurpose, QuizQuestion } from '../../../api/schema/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Bubble = { role: 'ai' | 'me'; content: string };

/**
 * "생각하는 중" 말풍선 (2026-08-26).
 *
 * 예전에는 채팅 흐름 **바깥**에 공용 `Loading` 을 띄웠습니다. 대화 화면에서는
 * 상대가 말을 만들고 있다는 느낌이 나야 하므로 **말풍선 안**으로 옮기고 점을 움직입니다.
 *
 * ⚠️ `useNativeDriver: false` 입니다. `Animated.loop` 은 반복을 네이티브 모듈에
 *    맡기는데 웹에는 그 모듈이 없어 **한 바퀴만 돌고 멈춥니다** (CLAUDE.md §5-④).
 *    실제로 튜토리얼 삽화가 그 문제로 비어 있던 적이 있습니다.
 *
 * 시계는 **하나**입니다. 점마다 따로 돌리면 서로 어긋납니다 — 값 하나(0→3)를
 * 점 세 개가 각자 다른 구간에서 읽습니다.
 */
function Thinking({ label }: { label: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(t, {
        toValue: 3,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [t]);

  // 0→3 을 한 바퀴로 보고, 점 i 는 t 가 i 근처일 때 진해집니다.
  const dim = 0.25;
  const ranges: number[][] = [
    [1, dim, dim, 1],
    [dim, 1, dim, dim],
    [dim, dim, 1, dim],
  ];

  return (
    <View style={styles.bubbleRow}>
      <View style={styles.avatar}>
        <Sparkles size={16} strokeWidth={2} color={color.paper} />
      </View>
      <View style={[styles.bubble, styles.ai, styles.thinking]}>
        <Text style={styles.bubbleText}>{label}</Text>
        <View style={styles.dots}>
          {ranges.map((out, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { opacity: t.interpolate({ inputRange: [0, 1, 2, 3], outputRange: out }) },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * 추천 결과 한 건. 6.2 가 주는 추천 1건과 6.3 이 주는 대안들이 같은 모양으로 들어옵니다.
 */
type Rec = { videoFormatId: Id; reason?: string };

/**
 * 추천 카드 (시안 `image (1).png`, 2026-08-26).
 *
 * 대화 안에서 **가로로 넘겨 보는 카드**입니다. 시안 실측:
 *   카드 폭 176 · 제목 2줄 · 해시태그 1줄 · 이유 · 영상 자리(4:5) · "바로 촬영하기"
 * 카드가 화면 폭보다 좁아 오른쪽 카드가 살짝 걸쳐 보이는 것이 "넘길 수 있다" 는 신호입니다.
 *
 * ⚠️ 해시태그는 **서버가 준 값이 있을 때만** 붙입니다.
 *    지금 실서버 5.1 은 `expected_duration_sec`·`shooting_difficulty`·`requires_face` 가
 *    전부 null 로 옵니다. 시안에 "#1인촬영" 이 그려져 있다고 지어내면, 사장님이
 *    그 값을 믿고 촬영 계획을 세웁니다. 없으면 태그 줄이 통째로 빠집니다.
 */
const CARD_W = 176;

function RecCard({ rec, onShoot }: { rec: Rec; onShoot: (formatId: number) => void }) {
  const formatId = Number(rec.videoFormatId);
  const { data: f } = useVideoFormat(formatId);

  const tags: string[] = [];
  if (f?.expectedDurationSec) {
    const sec = f.expectedDurationSec;
    tags.push(sec >= 60 ? `#촬영시간${Math.round(sec / 60)}분` : `#촬영시간${sec}초`);
  }
  if (f?.shootingDifficulty) tags.push(`#난이도${f.shootingDifficulty}`);
  if (f?.requiresFace === false) tags.push('#얼굴미노출');
  else if (f?.requiresFace === true) tags.push('#얼굴필요');
  else if (f?.faceExposureLevel) tags.push(`#얼굴노출${f.faceExposureLevel}`);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {f?.formatTitle ?? '추천 영상'}
      </Text>
      {tags.length > 0 && (
        <Text style={styles.cardTags} numberOfLines={1}>
          {tags.join(' ')}
        </Text>
      )}
      {rec.reason ? (
        <Text style={styles.cardReason} numberOfLines={2}>
          {rec.reason}
        </Text>
      ) : null}

      {/*
        카드 안에서는 플레이어가 아니라 **썸네일**입니다. 유튜브 약관상 한 화면에
        자동재생 플레이어는 하나뿐이고 최소 200x200 이 필요합니다 (VideoThumbnail 머리말).
      */}
      <VideoThumbnail
        url={representativeVideoUrl(f)}
        platform={f?.sourcePlatform}
        aspectRatio={4 / 5}
        style={styles.cardThumb}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${f?.formatTitle ?? '이 방식'}으로 바로 촬영하기`}
        onPress={() => onShoot(formatId)}
        style={({ pressed }) => [styles.cardBtn, pressTap(pressed, 'button')]}
      >
        <CameraIcon size={16} strokeWidth={2} color={color.paper} />
        <Text style={styles.cardBtnText}>바로 촬영하기</Text>
      </Pressable>
    </View>
  );
}

const PURPOSES: PromotionPurpose[] = ['메뉴소개', '이벤트알리기', '가게소개', '고객늘리기'];

/**
 * 시안 v3 root 노드의 선택지 **그대로** 입니다.
 *   { label: "홍보하고 싶은 게 있어요" } / { label: "직접 입력하기" }
 * v1·v2 에 있던 "어떤 걸 찍을지 막막해요" 는 v3 에서 사라졌습니다.
 */
const INTRO_OPTIONS = ['홍보하고 싶은 게 있어요', '직접 입력하기'] as const;

export default function AiChatScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);

  // ── 대화 상태 ──
  const [log, setLog] = useState<Bubble[]>([
    { role: 'ai', content: '오늘 어떤 영상을 찍을까요?' },
  ]);
  const [step, setStep] = useState<'intro' | 'purpose' | 'questions' | 'submitting' | 'result'>(
    'intro'
  );
  /** 마지막에 보여줄 추천 카드들 (6.2 추천 1건 + 6.3 대안). */
  const [recs, setRecs] = useState<Rec[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [freeText, setFreeText] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  /**
   * 자유 입력창은 **기본이 닫힘**입니다 (2026-08-26, 사장님 지시).
   *
   * 사장님이 40~60대라 빈 칸을 보면 무엇을 적어야 할지 막막해집니다. 그래서 답은
   * **객관식이 기본**이고, 필요할 때만 "직접 입력" 을 눌러 칸을 엽니다.
   *
   *   'memo'   들어가기에서 "직접 입력하기" — 6.2 free_text 로 갑니다(질문의 답이 아님)
   *   'answer' 질문에서 "직접 입력" — 그 질문의 답이 됩니다
   */
  const [freeMode, setFreeMode] = useState<'off' | 'memo' | 'answer'>('off');
  const scrollRef = useRef<ScrollView>(null);

  /** 시안 헤더 우측의 대화 새로고침. 처음 질문으로 되돌립니다. */
  const resetChat = () => {
    setLog([{ role: 'ai', content: '오늘 어떤 영상을 찍을까요?' }]);
    setStep('intro');
    setQIndex(0);
    setAnswers({});
    setFreeText(undefined);
    setInput('');
    setProjectId(null);
    setFreeMode('off');
    setRecs([]);
  };

  // ── 서버 ──
  const { data: drafts } = useProjects(storeId ?? undefined, 'DRAFT');
  const createProject = useCreateProject();
  const questionsQuery = useQuizQuestions(projectId ?? undefined);
  const submit = useSubmitQuiz(projectId ?? 0);
  const alternatives = useQuizAlternatives(projectId ?? 0);

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
    if (opt === '직접 입력하기') {
      setFreeMode('memo');
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
    setFreeMode('off');
    const nextIndex = questions.findIndex((x) => x.id === q.id) + 1;
    if (nextIndex < questions.length) {
      setQIndex(nextIndex);
      return;
    }
    doSubmit();
  };

  /**
   * 6.3 대안 요청. 두 곳에서 씁니다.
   *   · 제출 직후 — 카드를 시안처럼 여러 장으로 채우려고
   *   · "다시 추천받고 싶어요" 에 조건을 적었을 때 — 그 조건으로 다시
   *
   * `condition` 은 명세상 필수라, 제출 직후처럼 사장님이 따로 말한 조건이 없으면
   * 적어 주신 자유입력을 그대로 씁니다. 그것도 없으면 "비슷한 다른 방식" 입니다 —
   * 화면에 보이는 값이 아니라 서버에 보내는 요청 문구입니다.
   */
  const askAlternatives = (base: Rec[], condition?: string) => {
    if (!projectId) return;
    alternatives.mutate(condition?.trim() || '비슷한 다른 방식', {
      onSuccess: (res) => {
        const more: Rec[] = (res.alternatives ?? []).map((a) => ({
          videoFormatId: a.videoFormatId,
          reason: a.reason,
        }));
        // 같은 포맷이 추천과 대안에 겹쳐 오면 한 번만 보여 줍니다.
        const seen = new Set(base.map((r) => String(r.videoFormatId)));
        const merged = [...base, ...more.filter((r) => !seen.has(String(r.videoFormatId)))];
        setRecs(merged);
        say([
          {
            role: 'ai',
            content: merged.length
              ? `매장 정보를 바탕으로 ${merged.length}가지를 추천해드릴게요.`
              : '지금은 추천할 방식을 찾지 못했어요. 조건을 조금 바꿔 적어 주세요.',
          },
        ]);
      },
      onError: () => {
        // 대안을 못 받아도 추천 한 건은 이미 있습니다. 그것만 보여 줍니다.
        say([
          {
            role: 'ai',
            content: base.length
              ? '매장 정보를 바탕으로 1가지를 추천해드릴게요.'
              : '지금은 추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
          },
        ]);
      },
    });
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
      /*
       * 시안(`image (1).png`): 추천 결과는 **대화 안에서 카드로** 보여 줍니다.
       * 예전에는 곧바로 홈 피드로 보냈는데, 그러면 방금 대화한 결과가 아니라
       * 그냥 인기 목록이 뜹니다 — 사장님이 "추천이 안 된다" 고 느끼는 지점이었습니다.
       *
       * 6.2 는 추천을 **한 건** 줍니다. 시안은 세 장이므로 6.3(대안)을 이어서 불러
       * 채웁니다. 몇 장이 오든 있는 만큼만 말합니다 — 세 장이라고 미리 못 박지 않습니다.
       */
      onSuccess: (data) => {
        const first = data?.recommendedFormat;
        const base: Rec[] = first
          ? [{ videoFormatId: first.videoFormatId, reason: first.reason }]
          : [];
        setRecs(base);
        setStep('result');
        askAlternatives(base, freeText);
      },
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

    // 추천을 받은 뒤 "다시 추천받고 싶어요" — 적어 주신 조건으로 6.3 을 다시 부릅니다.
    if (step === 'result') {
      say([{ role: 'me', content: t }]);
      askAlternatives([], t);
      return;
    }

    // 질문에 직접 답한 경우 — 그 질문의 답으로 넣고 다음으로 넘어갑니다.
    if (freeMode === 'answer' && current) {
      setAnswers((p) => ({ ...p, [current.id]: t }));
      say([{ role: 'me', content: t }]);
      advance(current, t);
      return;
    }

    // 그 밖의 자유입력은 6.2 의 free_text 필드로만 갑니다 (질문의 답이 아닙니다).
    say([{ role: 'me', content: t }]);
    setFreeText((prev) => (prev ? `${prev}\n${t}` : t));
    say([{ role: 'ai', content: '메모했어요! 추천에 함께 반영할게요.' }]);
    setFreeMode('off');
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
    <Screen padded={false} scroll={false} edges={['top']} background={color.surface}>
      <AppBar
        title="AI 숏폼 추천"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="대화 새로고침"
            hitSlop={6}
            onPress={resetChat}
            style={({ pressed }) => [styles.headerBtn, pressTap(pressed, 'icon')]}
          >
            <RotateCcw size={22} strokeWidth={2} color={color.ink[900]} />
          </Pressable>
        }
      />

      {/*
        키보드 대응은 공용 `Screen` 이 합니다 (2026-08-26).
        여기 있던 KeyboardAvoidingView 는 안드로이드에서 `behavior` 가 undefined 라
        아무 일도 하지 않았습니다 — 창이 알아서 줄던 시절의 설정입니다.
        지금은 창이 안 줄어서 입력줄이 키보드에 덮였습니다. 자세한 건 `ui/Screen.tsx` 머리말.
      */}
      <View style={{ flex: 1 }}>
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
                  <Sparkles size={16} strokeWidth={2} color={color.paper} />
                </View>
              )}
              <View style={[styles.bubble, b.role === 'me' ? styles.me : styles.ai]}>
                <Text style={[styles.bubbleText, b.role === 'me' && { color: color.paper }]}>
                  {b.content}
                </Text>
              </View>
            </View>
          ))}

          {/*
            준비 중 — 조용히 기다리게 두지 않습니다.
            대화 화면이므로 화면 바깥 스피너가 아니라 **말풍선 안**에서 점이 움직입니다.
          */}
          {step === 'questions' && questionsQuery.isLoading && (
            <Thinking label="AI가 답변 준비하는 중" />
          )}
          {createProject.isPending && <Thinking label="AI가 답변 준비하는 중" />}
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
                <Sparkles size={16} strokeWidth={2} color={color.paper} />
              </View>
              <View style={[styles.bubble, styles.ai]}>
                <Text style={styles.bubbleText}>{current.question}</Text>
                {current.type === 'multi_choice' && (
                  <Text style={[text.micro, { color: color.ink[400] }]}>여러 개 고를 수 있어요</Text>
                )}
              </View>
            </View>
          )}

          {/* 선택지 버튼 — 터치 영역 넉넉하게 */}
          {/* 프로젝트를 만드는 동안에는 방금 고른 선택지를 감춥니다 — 두 번 누르는 걸 막습니다 */}
          {step !== 'submitting' && !createProject.isPending && options.length > 0 && (
            <View style={styles.options}>
              {options.map((opt) => {
                const selected = current?.type === 'multi_choice' && multiPicked.includes(opt);
                return (
                  <Pressable
                    key={opt}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    hitSlop={6}
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
                    <Text style={[styles.optionText, selected && { color: color.brand[700] }]}>{opt}</Text>
                  </Pressable>
                );
              })}
              {/*
                직접 입력은 **눈에 덜 띄는 곳에 한 줄**로 둡니다 (2026-08-26).
                객관식이 기본이고, 보기에 없는 답을 해야 할 때만 칸이 열립니다.
                들어가기 단계에는 이미 "직접 입력하기" 선택지가 있어 넣지 않습니다.
              */}
              {step === 'questions' && current && freeMode !== 'answer' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFreeMode('answer')}
                  hitSlop={6}
                  style={({ pressed }) => [styles.freeLink, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.freeLinkText}>보기에 없어요 · 직접 입력</Text>
                </Pressable>
              )}
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

          {step === 'submitting' && <Thinking label="추천을 만드는 중" />}
          {step === 'result' && alternatives.isPending && <Thinking label="AI가 답변 준비하는 중" />}

          {/*
            추천 카드 — 시안 `image (1).png`.
            가로로 넘겨 보고, "바로 촬영하기" 를 누르면 그 포맷의 촬영 준비로 들어갑니다.
            말풍선 폭(80%)에 갇히면 카드가 눌리므로 **스크롤 영역 폭 전체**를 씁니다.
          */}
          {step === 'result' && recs.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.cardStrip}
              contentContainerStyle={styles.cardStripInner}
            >
              {recs.map((r) => (
                <RecCard
                  key={String(r.videoFormatId)}
                  rec={r}
                  onShoot={(formatId) => {
                    if (!projectId) return;
                    nav.navigate('Create', {
                      screen: 'FormatDetail',
                      params: { projectId, formatId },
                    });
                  }}
                />
              ))}
            </ScrollView>
          )}
        </ScrollView>

        {/*
          하단 자유 입력 — **기본은 닫혀 있습니다** (2026-08-26).
          "직접 입력" 을 눌렀을 때, 또는 질문을 못 불러와서 객관식이 아예 없을 때만 엽니다.
        */}
        {(freeMode !== 'off' ||
          step === 'result' ||
          (step === 'questions' && questionsQuery.isError)) && (
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            // 시안: 추천을 받은 뒤에는 "다시 추천받고 싶어요" 가 안내 문구입니다.
            placeholder={step === 'result' ? '다시 추천받고 싶어요' : '직접 입력해 보세요'}
            placeholderTextColor={color.ink[300]}
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={sendFree}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="보내기"
            onPress={sendFree}
            disabled={!input.trim()}
            style={({ pressed }) => [
              styles.send,
              // 시안: disabled:opacity-40 · active:scale-90
              !input.trim() && { opacity: 0.4 },
              pressed && input.trim() ? { transform: [{ scale: 0.9 }] } : null,
            ]}
          >
            {/* 시안 v3: 종이비행기가 아니라 위쪽 화살표입니다 */}
            <ArrowUp size={20} strokeWidth={2} color={color.paper} />
          </Pressable>
        </View>
        )}
      </View>
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
  /*
   * 시안: px-5 pt-[110px] · 말풍선 사이 gap-3.
   * 시안 헤더는 화면 위에 겹쳐 있고(absolute) 그 아래 110 에서 내용이 시작합니다.
   * 우리 AppBar 는 흐름 안에 있어 안전영역(54)+헤더(44)=98 을 이미 먹으므로
   * 남은 12 만 여기서 더합니다. 20 을 주면 첫 말풍선이 8pt 내려갑니다.
   */
  chat: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[3],
    paddingBottom: space[6],
  },
  // 시안: items-start — 아바타가 말풍선 위쪽에 붙습니다(아래가 아닙니다)
  bubbleRow: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    marginTop: 2, // 시안 mt-0.5
    borderRadius: radius.pill,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 가이드라인 §5.6: 최대 78%, 꼬리쪽 모서리만 8, AI 말풍선에만 그림자
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  ai: {
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.xs,
    ...theme.elevation('bubble'),
  },
  me: { backgroundColor: color.brand[600], borderTopRightRadius: radius.xs },

  // 생각 중 말풍선 — 글자와 점이 한 줄에 나란히 섭니다
  thinking: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: color.ink[400] },

  // "직접 입력" 은 선택지가 아니라 그 아래 한 줄 링크입니다 — 객관식보다 약하게 보여야 합니다
  freeLink: { alignSelf: 'flex-start', paddingVertical: space[2], paddingHorizontal: space[1] },
  freeLinkText: { ...theme.text.caption, color: color.ink[500], textDecorationLine: 'underline' },

  // ── 추천 카드 (시안 image (1).png) ──────────────────
  // 카드가 화면 폭보다 좁아 오른쪽 것이 살짝 걸쳐 보입니다 — 넘길 수 있다는 신호입니다.
  cardStrip: { marginHorizontal: -space[4] },
  cardStripInner: { paddingHorizontal: space[4], gap: space[3], paddingVertical: space[1] },
  card: {
    width: CARD_W,
    gap: 6,
    padding: space[3],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.brand[100],
    backgroundColor: color.brand[50],
  },
  cardTitle: { ...theme.text.bodySmall, fontWeight: theme.text.bodyStrong.fontWeight, color: color.ink[900] },
  cardTags: { ...theme.text.micro, color: color.brand[600] },
  cardReason: { ...theme.text.caption, color: color.ink[500] },
  cardThumb: { borderRadius: radius.md, backgroundColor: color.ink[100] },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
  },
  cardBtnText: { ...theme.text.bodySmall, fontWeight: theme.text.bodyStrong.fontWeight, color: color.paper },
  // 시안: 15 · font-medium · leading-snug(1.375) = 20.6
  bubbleText: { ...text.body, lineHeight: 20.6 },
  headerBtn: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    marginRight: -6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * 시안: flex flex-wrap gap-2 — 칩이 **가로로 나란히** 놓이고 넘치면 줄바꿈합니다.
   * flexDirection 을 안 주면 세로로 쌓이며 전체 폭으로 늘어나, 대화가 아니라
   * 목록처럼 보입니다(이전 상태).
   */
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    // 시안 ml-10 — 칩이 아바타(32)+간격(8) 만큼 들어가 말풍선과 줄이 맞습니다
    marginLeft: 40,
  },
  /**
   * 시안 answerChip — rounded-full · border-brand-border · bg-canvas · px-4 py-2.5.
   * 사각 카드가 아니라 알약입니다. 대화 안에서 "고르는 말" 로 읽히게 하는 형태라
   * 카드로 그리면 대화가 아니라 목록처럼 보입니다.
   */
  option: {
    // 시안: px-4 py-2.5 — 높이를 고정하지 않고 내용에 맞춥니다. 터치는 hitSlop 으로 보전.
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: space[4],
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
    borderColor: color.brand[300],
    backgroundColor: color.canvas,
  },
  // 시안: text-[14px] font-semibold text-brand
  optionText: {
    ...theme.text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.brand[600],
  },
  optionOn: { borderColor: color.brand[600], backgroundColor: color.brand[50] },
  confirm: { backgroundColor: color.brand[600], borderColor: color.brand[600], alignItems: 'center' },
  inputRow: {
    flexDirection: 'row',
    gap: space[2],
    padding: space[4],
    borderTopWidth: theme.border.hairline,
    borderTopColor: color.hairlineSoft,
    backgroundColor: color.canvas,
  },
  // 시안 v3: h-11(44) · rounded-full · border-hairline · **bg-panel(흰색)**
  input: {
    flex: 1,
    height: sizing.touchTargetMin,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    borderRadius: radius.pill,
    backgroundColor: color.paper,
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
