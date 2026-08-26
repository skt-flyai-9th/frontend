/**
 * AiChatScreen — AI 추천 탭. 백엔드 R06 **대화형 숏폼 Agent** 의 실제 세션을 씁니다.
 *
 * 흐름: 세션 생성 → 턴 주고받기(선택지/자유입력) → CONFIRM → 추천 → 채택 → 촬영
 *
 * ─────────────────────────────────────────────────────────────
 * 2026-08-26 — 시안(`image (1).png`) 반영 + 사장님 지시 세 가지
 * ─────────────────────────────────────────────────────────────
 * ① 추천은 **가로로 넘겨 보는 카드**입니다. 서버가 `recommendations` 를 **배열**로
 *    주므로 온 만큼 카드로 깝니다(시안이 세 장인 것도 이 배열을 전제한 그림입니다).
 *    이전 코드는 단수 `recommendation` 을 읽어 **항상 undefined** 였습니다.
 *
 * ② 답은 **객관식이 기본**입니다. 사장님이 40~60대라 빈 칸을 보면 무엇을 적어야
 *    할지 막막해집니다. 하단 입력창은 평소 닫혀 있고,
 *      · 서버가 선택지 없이 물어볼 때(열린 질문)
 *      · "보기에 없어요 · 직접 입력" 을 눌렀을 때
 *      · 추천을 받은 뒤("다시 추천받고 싶어요")
 *    에만 열립니다.
 *
 * ③ 기다리는 동안은 화면 바깥 스피너가 아니라 **말풍선 안에서** 점이 움직입니다.
 *
 * 키보드 대응은 공용 `ui/Screen` 이 합니다. 예전 KeyboardAvoidingView 는 안드로이드에서
 * `behavior` 가 undefined 라 아무 일도 하지 않았습니다 — 자세한 건 `ui/Screen.tsx` 머리말.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowUp, Camera as CameraIcon, RotateCcw, Sparkles } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '../../../ui/AppBar';
import { Banner } from '../../../ui/Feedback';
import { Screen } from '../../../ui/Screen';
import { pressTap } from '../../../ui/press';
import { useAppState } from '../../../lib/appState';
import {
  discardShortformSession,
  useAcceptShortformRecommendation,
  useCreateShortformSession,
  useNextShortformRecommendation,
  useSubmitShortformTurn,
} from '../../../api/queries/shortform';
import type {
  ShortformOption,
  ShortformRecommendation,
  ShortformTurnInput,
  ShortformTurnResponse,
} from '../../../api/schema/types';
import type { RootStackParamList } from '../../../navigation/types';
import theme, { color, radius, sizing, space, text } from '../../../design/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Bubble = { role: 'ai' | 'me'; content: string };

const CONFIRM_OPTIONS: ShortformOption[] = [
  { id: 'CONFIRM_TRUE', label: '이대로 추천받기' },
  { id: 'CONFIRM_FALSE', label: '내용 수정하기' },
];

/** 시안 실측: 카드 폭 176. 오른쪽 카드가 살짝 걸쳐 보이는 것이 "넘길 수 있다" 는 신호입니다. */
const CARD_W = 176;

/**
 * "생각하는 중" 말풍선.
 *
 * 값은 시안 원문 `@keyframes typing-dot` 그대로입니다 (V4·5차 동일).
 *
 * ```css
 * 0%,100% { opacity:.3; transform:translateY(0) }
 * 50%     { opacity:1;  transform:translateY(-3px) }
 * ```
 *
 * **투명도만이 아니라 위로 3px 튀어오릅니다.** 처음에는 투명도만 넣었는데
 * 시안을 다시 보니 튀어오르는 값이 있었습니다 — 그게 있어야 "말하는 중" 으로 읽힙니다.
 *
 * ⚠️ 점 하나하나의 지연(animation-delay)은 시안 원문에 없습니다. 키프레임만
 *    스타일에 들어 있고 붙이는 곳은 화면 코드 안이라, 5차 껍데기에는 안 옵니다.
 *    그래서 한 주기 1200ms 를 셋이 1/3 씩 나눠 갖는 방식으로 뒀습니다.
 *
 * ⚠️ `useNativeDriver: false` 입니다. `Animated.loop` 은 반복을 네이티브 모듈에 맡기는데
 *    웹에는 그 모듈이 없어 **한 바퀴만 돌고 멈춥니다** (CLAUDE.md §5-④).
 *    시계는 **하나**입니다 — 점마다 따로 돌리면 서로 어긋납니다.
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

  // 시안 원문값: 흐릴 때 0.3, 진할 때 1
  const dim = 0.3;
  const fade: number[][] = [
    [1, dim, dim, 1],
    [dim, 1, dim, dim],
    [dim, dim, 1, dim],
  ];
  // 진해지는 순간 위로 3px (시안 원문값)
  const lift: number[][] = [
    [-3, 0, 0, -3],
    [0, -3, 0, 0],
    [0, 0, -3, 0],
  ];

  return (
    <View style={styles.bubbleRow}>
      <View style={styles.avatar}>
        <Sparkles size={16} strokeWidth={2} color={color.paper} />
      </View>
      <View style={[styles.bubble, styles.ai, styles.thinking]}>
        <Text style={styles.bubbleText}>{label}</Text>
        <View style={styles.dots}>
          {fade.map((out, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: t.interpolate({ inputRange: [0, 1, 2, 3], outputRange: out }),
                  transform: [
                    {
                      translateY: t.interpolate({
                        inputRange: [0, 1, 2, 3],
                        outputRange: lift[i],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * 추천 카드 한 장 (시안 `image (1).png`).
 *
 * ⚠️ 시안에는 카드 안에 영상 자리(회색 상자)가 있지만 **넣지 않았습니다.**
 *    추천 응답에는 영상 주소도 포맷 번호도 없습니다 — 포맷은 채택(accept)한 뒤에야
 *    `video_format_id` 로 돌아옵니다. 채울 값이 없는 회색 상자는 자리만 먹습니다.
 *    추천에 포맷 번호를 실어 달라고 BE 에 요청해 둘 것.
 */
function RecCard({
  rec,
  busy,
  onShoot,
}: {
  rec: ShortformRecommendation;
  busy: boolean;
  onShoot: (rec: ShortformRecommendation) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {rec.title}
      </Text>
      {rec.concept ? (
        <Text style={styles.cardConcept} numberOfLines={4}>
          {rec.concept}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rec.title} 으로 바로 촬영하기`}
        disabled={busy}
        onPress={() => onShoot(rec)}
        style={({ pressed }) => [
          styles.cardBtn,
          busy && { opacity: 0.5 },
          pressTap(pressed, 'button'),
        ]}
      >
        <CameraIcon size={16} strokeWidth={2} color={color.paper} />
        <Text style={styles.cardBtnText}>{busy ? '준비 중…' : '바로 촬영하기'}</Text>
      </Pressable>
    </View>
  );
}

export default function AiChatScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const mounted = useRef(true);
  const [sessionId, setSessionId] = useState<number>();
  const [log, setLog] = useState<Bubble[]>([]);
  const [options, setOptions] = useState<ShortformOption[]>([]);
  /** 서버가 배열로 줍니다. 온 만큼 카드로 깝니다. */
  const [recommendations, setRecommendations] = useState<ShortformRecommendation[]>([]);
  const [input, setInput] = useState('');
  /** 자유 입력창을 사장님이 직접 열었는지. 기본은 닫힘입니다. */
  const [freeInput, setFreeInput] = useState(false);

  const createSession = useCreateShortformSession(storeId ?? undefined);
  const submitTurn = useSubmitShortformTurn(sessionId);
  const nextRecommendation = useNextShortformRecommendation(sessionId);
  const acceptRecommendation = useAcceptShortformRecommendation(sessionId);

  const append = useCallback((...bubbles: Bubble[]) => {
    setLog((previous) => [...previous, ...bubbles]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const applyResponse = useCallback(
    (response: ShortformTurnResponse) => {
      if (response.assistantMessage) append({ role: 'ai', content: response.assistantMessage });
      const recs = response.recommendations ?? [];
      setRecommendations(recs);
      setOptions(response.action === 'CONFIRM' ? CONFIRM_OPTIONS : (response.options ?? []));
      setFreeInput(false);
      if (recs.length) {
        append({
          role: 'ai',
          content: `매장 정보를 바탕으로 ${recs.length}가지를 추천해드릴게요.`,
        });
      }
    },
    [append]
  );

  const begin = useCallback(async () => {
    if (!storeId || createSession.isPending) return;
    const oldSessionId = sessionId;
    setSessionId(undefined);
    setRecommendations([]);
    setOptions([]);
    setLog([]);
    setInput('');
    setFreeInput(false);
    if (oldSessionId) {
      try {
        await discardShortformSession(oldSessionId);
      } catch {
        // 정리 실패가 새 대화 시작을 막아서는 안 됩니다.
      }
    }
    createSession.mutate(undefined, {
      onSuccess: (session) => {
        if (!mounted.current) return;
        setSessionId(Number(session.id));
        setOptions(session.options);
        setLog([
          { role: 'ai', content: session.assistantMessage ?? '오늘 어떤 영상을 찍을까요?' },
        ]);
      },
    });
  }, [createSession, sessionId, storeId]);

  useEffect(() => {
    mounted.current = true;
    if (storeId && !sessionId && log.length === 0 && !createSession.isPending) void begin();
    return () => {
      mounted.current = false;
    };
  }, [begin, createSession.isPending, log.length, sessionId, storeId]);

  const send = (inputValue: ShortformTurnInput, label: string) => {
    if (!sessionId || submitTurn.isPending) return;
    append({ role: 'me', content: label });
    setOptions([]);
    setRecommendations([]);
    setFreeInput(false);
    submitTurn.mutate(inputValue, { onSuccess: applyResponse });
  };

  const pickOption = (option: ShortformOption) => {
    if (option.id === 'CONFIRM_TRUE') send({ type: 'CONFIRM', value: true }, option.label);
    else if (option.id === 'CONFIRM_FALSE') send({ type: 'CONFIRM', value: false }, option.label);
    else send({ type: 'OPTION', optionId: option.id }, option.label);
  };

  const sendText = () => {
    const value = input.trim();
    if (!value) return;
    setInput('');
    /*
     * 추천을 받은 뒤 적으면 "이런 쪽으로 다시" 라는 뜻이므로 같은 세션에 이어 보냅니다.
     * 서버가 조건을 반영해 새 추천을 줍니다.
     */
    send({ type: 'TEXT', text: value }, value);
  };

  /**
   * 고른 추천으로 프로젝트를 만들고 촬영으로 넘어갑니다.
   *
   * 채택 응답의 `videoFormatId` 를 카메라까지 들고 갑니다 — 카메라 좌상단 참고 영상이
   * 그 값을 씁니다. 프로젝트를 다시 조회해 되짚으면 7.1 기획이 성공해야만 값이 붙는데,
   * 실서버 7.1 이 500 을 내는 동안 참고 영상 창이 통째로 사라집니다.
   */
  const accept = (rec: ShortformRecommendation) => {
    acceptRecommendation.mutate(rec.recommendationId, {
      onSuccess: (project) => {
        setSessionId(undefined);
        nav.navigate('Create', {
          screen: 'Camera',
          params: {
            projectId: Number(project.id),
            formatId: project.videoFormatId ? Number(project.videoFormatId) : undefined,
          },
        });
      },
    });
  };

  const tryNext = () => {
    setRecommendations([]);
    nextRecommendation.mutate(undefined, { onSuccess: applyResponse });
  };

  const pending = createSession.isPending || submitTurn.isPending || nextRecommendation.isPending;
  const hasError =
    createSession.isError ||
    submitTurn.isError ||
    nextRecommendation.isError ||
    acceptRecommendation.isError;
  const hasRecs = recommendations.length > 0;

  /**
   * 입력창을 여는 조건 — 객관식이 기본이라 평소에는 닫혀 있습니다.
   *   · 사장님이 직접 열었을 때
   *   · 추천을 받은 뒤 (조건을 적어 다시 받을 수 있게)
   *   · 서버가 **선택지 없이** 물어볼 때 (열린 질문이라 적는 수밖에 없습니다)
   *   · 오류가 났을 때 (선택지가 없으니 길이 막힙니다)
   */
  const openEnded = !!sessionId && !pending && options.length === 0 && !hasRecs;
  const showInput = !!sessionId && (freeInput || hasRecs || openEnded || hasError);

  return (
    <Screen padded={false} scroll={false} edges={['top']} background={color.surface}>
      <AppBar
        title="AI 숏폼 추천"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="대화 새로고침"
            hitSlop={6}
            onPress={() => void begin()}
            style={({ pressed }) => [styles.headerBtn, pressTap(pressed, 'icon')]}
          >
            <RotateCcw size={22} strokeWidth={2} color={color.ink[900]} />
          </Pressable>
        }
      />

      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.chat}
          keyboardShouldPersistTaps="handled"
        >
          {!storeId && (
            <Banner
              tone="warn"
              title="가게 정보가 필요합니다"
              description="가게를 먼저 등록해 주세요."
            />
          )}

          {log.map((bubble, index) => (
            <View
              key={`${bubble.role}-${index}`}
              style={[styles.bubbleRow, bubble.role === 'me' && styles.meRow]}
            >
              {bubble.role === 'ai' && (
                <View style={styles.avatar}>
                  <Sparkles size={16} strokeWidth={2} color={color.paper} />
                </View>
              )}
              <View style={[styles.bubble, bubble.role === 'me' ? styles.me : styles.ai]}>
                <Text style={[styles.bubbleText, bubble.role === 'me' && styles.meText]}>
                  {bubble.content}
                </Text>
              </View>
            </View>
          ))}

          {pending && <Thinking label="AI가 답변 준비하는 중" />}

          {hasError && (
            <Banner
              tone="warn"
              title="AI 추천을 이어가지 못했습니다"
              description="잠시 후 다시 시도하거나 오른쪽 위에서 새 대화를 시작해 주세요."
            />
          )}

          {!pending && options.length > 0 && (
            <View style={styles.options}>
              {options.map((option) => (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  onPress={() => pickOption(option)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/*
            "직접 입력" 은 선택지가 아니라 그 아래 **한 줄 링크**입니다.
            객관식이 기본이라는 것이 눈으로 보여야 합니다.
          */}
          {!pending && options.length > 0 && !freeInput && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setFreeInput(true)}
              hitSlop={6}
              style={({ pressed }) => [styles.freeLink, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.freeLinkText}>보기에 없어요 · 직접 입력</Text>
            </Pressable>
          )}

          {/* 추천 카드 — 시안 `image (1).png`. 가로로 넘겨 봅니다. */}
          {hasRecs && (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.cardStrip}
                contentContainerStyle={styles.cardStripInner}
              >
                {recommendations.map((rec) => (
                  <RecCard
                    key={rec.recommendationId}
                    rec={rec}
                    busy={acceptRecommendation.isPending}
                    onShoot={accept}
                  />
                ))}
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                onPress={tryNext}
                hitSlop={6}
                style={({ pressed }) => [styles.freeLink, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.freeLinkText}>다른 추천 보기</Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        {/* 입력줄이 시스템 바에 덮이지 않게 안전영역만큼 더 띄웁니다 */}
        {showInput && (
          <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, space[4]) }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              // 시안: 추천을 받은 뒤에는 "다시 추천받고 싶어요" 가 안내 문구입니다.
              placeholder={hasRecs ? '다시 추천받고 싶어요' : '직접 입력해 보세요'}
              placeholderTextColor={color.ink[300]}
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={sendText}
              editable={!pending}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="보내기"
              onPress={sendText}
              disabled={!input.trim() || pending}
              style={({ pressed }) => [
                styles.send,
                (!input.trim() || pending) && { opacity: 0.4 },
                pressed && input.trim() ? { transform: [{ scale: 0.9 }] } : null,
              ]}
            >
              <ArrowUp size={20} strokeWidth={2} color={color.paper} />
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chat: { paddingHorizontal: space[5], paddingTop: space[3], gap: space[3], paddingBottom: space[6] },
  bubbleRow: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
  meRow: { justifyContent: 'flex-end' },
  avatar: {
    width: 32,
    height: 32,
    marginTop: 2,
    borderRadius: radius.pill,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  ai: { backgroundColor: color.paper, borderTopLeftRadius: radius.xs, ...theme.elevation('bubble') },
  me: { backgroundColor: color.brand[600], borderTopRightRadius: radius.xs },
  bubbleText: { ...text.body, lineHeight: 21 },
  meText: { color: color.paper },

  // 생각 중 말풍선 — 글자와 점이 한 줄에 나란히 섭니다
  thinking: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: color.ink[400] },

  headerBtn: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    marginRight: -6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안 ml-10 — 칩이 아바타(32)+간격(8) 만큼 들어가 말풍선과 줄이 맞습니다
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginLeft: 40 },
  option: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[4],
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
    borderColor: color.brand[300],
    backgroundColor: color.canvas,
  },
  optionText: { ...theme.text.bodySmall, fontWeight: '600', color: color.brand[600] },

  // 객관식보다 약하게 보여야 하는 보조 동선(직접 입력 · 다른 추천)
  freeLink: { alignSelf: 'flex-start', marginLeft: 40, paddingVertical: space[2] },
  freeLinkText: { ...theme.text.caption, color: color.ink[500], textDecorationLine: 'underline' },

  // ── 추천 카드 (시안 image (1).png) ──────────────────
  cardStrip: { marginHorizontal: -space[5] },
  cardStripInner: { paddingHorizontal: space[5], gap: space[3], paddingVertical: space[1] },
  card: {
    width: CARD_W,
    gap: space[2],
    padding: space[3],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.brand[100],
    backgroundColor: color.brand[50],
  },
  cardTitle: { ...theme.text.bodySmall, fontWeight: '600', color: color.ink[900] },
  cardConcept: { ...theme.text.caption, color: color.ink[500] },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    marginTop: space[1],
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
  },
  cardBtnText: { ...theme.text.bodySmall, fontWeight: '600', color: color.paper },

  inputRow: {
    flexDirection: 'row',
    gap: space[2],
    padding: space[4],
    borderTopWidth: theme.border.hairline,
    borderTopColor: color.hairlineSoft,
    backgroundColor: color.canvas,
  },
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
