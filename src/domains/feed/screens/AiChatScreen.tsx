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
 *    할지 막막해집니다. 선택지 칩이 먼저 눈에 들어오고, **"직접 입력" 도 같은 모양의
 *    칩**입니다 — 누르면 그때 아래 입력창이 올라오고 키보드가 함께 뜹니다
 *    (2026-08-26 사장님 지시).
 *
 *    ⚠️ **입력창은 늘 열어 둡니다** (2026-08-30 지시 ③④). 한동안 "직접 입력" 을
 *       눌러야만 열리게 두었는데(2026-08-26 판단), 실기기에서 두 가지가 걸렸습니다 —
 *       창이 아예 안 뜨는 것으로 보이고, 눌러서 열면 그 자리에 **빈 여백**이 남았습니다.
 *       시안 6차 원문(`composerOpen = true`)으로 되돌립니다.
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
import { HScroll } from '../../../ui/HScroll';
import { GuidePlayer } from '../../../ui/GuidePlayer';
import { pressTap } from '../../../ui/press';
import { representativeVideoUrl } from '../../../api/formatVideo';
import { useVideoFormat } from '../../../api/queries/project';
import { formatHashtags } from '../../../lib/format';
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

/**
 * 시안 6차 원문: `w-[248px] shrink-0 snap-start`, 카드 사이 `gap-3`(12),
 * 줄 컨테이너는 `-mr-5 … pr-5` 로 오른쪽 카드가 화면 끝에 걸쳐 보입니다.
 * (5차까지는 껍데기만 와서 176 으로 어림했었습니다 — 6차에서 실제값 확인)
 */
const CARD_W = 248;

/** 시안 `ShortsEmbed` 의 9:16 슬롯 — 원문 `h-[224px] w-[126px]`. */
const EMBED_W = 126;
const EMBED_H = 224;

/** 추천 API 응답 뒤 결과 카드가 나타나기까지 유지할 생각 중 시간. */
const RECOMMENDATION_RESULT_DELAY_MS = 5_000;

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
 * 붙이는 값도 6차 화면 코드에서 확인했습니다 (5차 껍데기에는 없었습니다):
 *   `animation: typing-dot .9s ${d * 0.15}s infinite` · 점 크기 `h-2 w-2`(8)
 * → **한 주기 900ms, 점마다 150ms 씩 밀림.** 900/150 = 6 이라 시계를 0→6 으로 두고
 *   점 i 는 t=i 에서 가장 흐리고 t=i+3 에서 가장 진합니다. 시계는 여전히 하나입니다.
 *
 * ⚠️ `useNativeDriver: false` 입니다. `Animated.loop` 은 반복을 네이티브 모듈에 맡기는데
 *    웹에는 그 모듈이 없어 **한 바퀴만 돌고 멈춥니다** (CLAUDE.md §5-④).
 *    시계는 **하나**입니다 — 점마다 따로 돌리면 서로 어긋납니다.
 */
function Thinking() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(t, {
        toValue: 6,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [t]);

  /*
   * 시안 원문값: 흐릴 때 0.3, 진할 때 1 · 진할 때 위로 3px.
   * 점 i 는 t=i 에서 흐리고 t=i+3 에서 진합니다(150ms = 시계 1칸).
   * 한 바퀴가 6칸이라, t=0 시점의 값은 각 점이 이미 지나온 위치에서 읽습니다.
   */
  const dim = 0.3;
  const at = (frac: number) => dim + (1 - dim) * frac;
  const fade: { input: number[]; output: number[] }[] = [
    { input: [0, 3, 6], output: [dim, 1, dim] },
    { input: [0, 1, 4, 6], output: [at(1 / 3), dim, 1, at(1 / 3)] },
    { input: [0, 2, 5, 6], output: [at(2 / 3), dim, 1, at(2 / 3)] },
  ];
  const lift: { input: number[]; output: number[] }[] = [
    { input: [0, 3, 6], output: [0, -3, 0] },
    { input: [0, 1, 4, 6], output: [-1, 0, -3, -1] },
    { input: [0, 2, 5, 6], output: [-2, 0, -3, -2] },
  ];

  return (
    <View style={styles.bubbleRow}>
      <View style={styles.avatar}>
        <Sparkles size={16} strokeWidth={2} color={color.paper} />
      </View>
      {/*
        🔴 **글자 없이 점만 띄웁니다** (2026-08-28 사장님 지시).
           "AI가 답변 준비하는 중" 을 같이 적었더니 말풍선이 두 배로 커지고,
           점이 이미 같은 말을 하고 있어 군더더기였습니다.

        ⚠️ 대신 `accessibilityLabel` 로 남깁니다. 점 세 개는 눈으로 보면 뜻이
           통하지만 화면 낭독기에는 아무 소리도 안 납니다 — 눈이 불편한 분에게는
           화면이 그냥 멈춘 것으로 들립니다.
      */}
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="AI가 답변을 준비하고 있습니다"
        style={[styles.bubble, styles.ai, styles.thinking]}
      >
        <View style={styles.dots}>
          {fade.map((f, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: t.interpolate({ inputRange: f.input, outputRange: f.output }),
                  transform: [
                    {
                      translateY: t.interpolate({
                        inputRange: lift[i].input,
                        outputRange: lift[i].output,
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
 * 추천 카드 한 장. 시안 6차 `RecoCard` (`js/screens-chat.jsx`).
 *
 * 원문 구성: 제목 · 해시태그 3개 · 숏츠 임베딩 · 바로 촬영하기.
 * 카드 안 여백은 `gap-3` 로 통일, 버튼은 `mt-auto` 로 바닥에 붙습니다.
 *
 * 추천 응답의 원본 영상 URL을 즉시 임베드하고, 포맷 상세는 해시태그를 보강하는 데
 * 사용합니다. 영상 URL이 없으면 촬영 진입을 막아 빈 가이드 화면으로 넘어가지 않습니다.
 *
 * ⚠️ 태그 가운데는 시안이 `#1인촬영`(인원)인데 **API 에 인원이 없어 난이도**입니다 —
 * 홈 피드 카드가 이미 그렇게 하고 있어 문구를 맞췄습니다(`lib/format.ts`).
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
  const format = useVideoFormat(rec.videoFormatId ?? undefined).data;
  const tags = formatHashtags(format);
  const videoUrl = rec.referenceUrl ?? representativeVideoUrl(format);
  const mediaReady = !!videoUrl;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {rec.title}
      </Text>

      {/* 시안: 12 semibold leading-relaxed · brand — 앞의 세 개만 씁니다 */}
      {tags.length > 0 ? (
        <Text style={styles.cardTags} numberOfLines={1}>
          {tags.slice(0, 3).join(' ')}
        </Text>
      ) : null}

      {/* 세 플레이어 모두 수동 재생이므로 한 화면에 함께 둘 수 있습니다. */}
      {videoUrl ? (
        <View style={styles.embedWrap}>
          <View style={styles.embed}>
            <GuidePlayer
              url={videoUrl}
              width={EMBED_W}
              portrait
            />
          </View>
        </View>
      ) : (
        <Text style={styles.mediaUnavailable}>추천 영상을 불러오지 못했습니다.</Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rec.title} 으로 바로 촬영하기`}
        disabled={busy || !mediaReady}
        onPress={() => mediaReady && onShoot(rec)}
        style={({ pressed }) => [
          styles.cardBtn,
          (busy || !mediaReady) && { opacity: 0.5 },
          pressTap(pressed, 'button'),
        ]}
      >
        <CameraIcon size={16} strokeWidth={2} color={color.paper} />
        <Text style={styles.cardBtnText}>
          {busy ? '준비 중…' : mediaReady ? '바로 촬영하기' : '영상 확인 필요'}
        </Text>
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
  const [recommendationDelayPending, setRecommendationDelayPending] = useState(false);
  const [hasMoreRecommendations, setHasMoreRecommendations] = useState(true);
  const [input, setInput] = useState('');
  /** 자유 입력창을 사장님이 직접 열었는지. 기본은 닫힘입니다. */
  const [freeInput, setFreeInput] = useState(false);
  /** "직접 입력" 을 눌러 연 칸에 커서를 넣어 키보드까지 함께 올립니다. */
  const inputRef = useRef<TextInput>(null);
  /** 세션 생성이 진행 중인지. 자동 시작과 새로고침이 겹쳐 세션을 두 개 만드는 것을 막습니다. */
  const starting = useRef(false);
  const recommendationDelayTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const createSession = useCreateShortformSession(storeId ?? undefined);
  const submitTurn = useSubmitShortformTurn(sessionId);
  const nextRecommendation = useNextShortformRecommendation(sessionId);
  const acceptRecommendation = useAcceptShortformRecommendation(sessionId);

  const append = useCallback((...bubbles: Bubble[]) => {
    setLog((previous) => [...previous, ...bubbles]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const cancelRecommendationDelay = useCallback(() => {
    if (recommendationDelayTimer.current) {
      clearTimeout(recommendationDelayTimer.current);
      recommendationDelayTimer.current = undefined;
    }
    setRecommendationDelayPending(false);
  }, []);

  const applyResponse = useCallback(
    (response: ShortformTurnResponse) => {
      const recs = response.recommendations ?? [];
      setHasMoreRecommendations(response.hasMoreRecommendations ?? true);
      setOptions(response.action === 'CONFIRM' ? CONFIRM_OPTIONS : (response.options ?? []));
      setFreeInput(false);
      cancelRecommendationDelay();

      if (!recs.length) {
        setRecommendations([]);
        if (response.assistantMessage) append({ role: 'ai', content: response.assistantMessage });
        return;
      }

      setRecommendations([]);
      setRecommendationDelayPending(true);
      recommendationDelayTimer.current = setTimeout(() => {
        if (!mounted.current) return;
        if (response.assistantMessage) append({ role: 'ai', content: response.assistantMessage });
        append({
          role: 'ai',
          content: `매장 정보를 바탕으로 ${recs.length}가지를 추천해드릴게요.`,
        });
        setRecommendations(recs);
        setRecommendationDelayPending(false);
        recommendationDelayTimer.current = undefined;
      }, RECOMMENDATION_RESULT_DELAY_MS);
    },
    [append, cancelRecommendationDelay]
  );

  /**
   * 대화를 처음부터 시작합니다 — 화면 진입과 상단 새로고침이 같이 씁니다.
   *
   * ⚠️ `createSession.isPending` 만으로는 중복을 못 막습니다 (2026-08-26 실측).
   *    새로고침을 누르면 이 함수가 **먼저 상태를 비우고**(sessionId·log) 옛 세션을
   *    지우려 `await` 합니다. 그 사이 자동 시작 effect 가 "세션도 없고 대화도
   *    비었네" 하고 다시 들어오는데, `mutate` 는 아직 안 불렸으니 isPending 은
   *    false 라 그대로 통과합니다. **한 번 눌렀는데 세션이 두 개 생겼습니다**
   *    (`201 /stores/21/shortform-sessions` 가 두 번 찍혔습니다).
   *
   *    ref 는 렌더를 기다리지 않고 그 자리에서 바뀌므로 이 틈을 막습니다.
   *    RenderScreen 의 14.1 중복 호출과 같은 종류의 버그입니다.
   */
  const begin = useCallback(async () => {
    if (!storeId || createSession.isPending || starting.current) return;
    starting.current = true;
    cancelRecommendationDelay();
    const oldSessionId = sessionId;
    setSessionId(undefined);
    setRecommendations([]);
    setHasMoreRecommendations(true);
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
      // 실패해도 반드시 풀어 줍니다 — 안 그러면 다시 시작할 길이 막힙니다.
      onSettled: () => {
        starting.current = false;
      },
    });
  }, [cancelRecommendationDelay, createSession, sessionId, storeId]);

  /*
    ─────────────────────────────────────────────────────────────
    🔴 **실패하면 멈춥니다 — 저절로 다시 걸지 않습니다** (2026-08-31 지적:
       "숏폼 추천 화면에서 에러메세지 계속 뜨는 버그")
    ─────────────────────────────────────────────────────────────
    이 자리가 **끝없는 되풀이**였습니다.

      대화 만들기 실패
        → `isPending` 이 true → false 로 바뀜
        → 이 effect 가 다시 돎 (`isPending` 이 의존값이라)
        → 아직 `sessionId` 없고 기록도 비었으니 조건이 **다시 참**
        → `begin()` 이 또 불림 → 또 실패 → …

    서버가 잠깐 느리거나 신호가 끊긴 동안 요청이 초당 몇 번씩 나갔고, 실패할
    때마다 경고가 다시 떠서 **계속 뜨는 것처럼** 보였습니다.

    `isError` 를 조건에 넣어 **한 번 실패하면 거기서 섭니다.** 다시 거는 길은
    두 가지로 이미 열려 있습니다 — 아래 경고의 안내대로 오른쪽 위 **새 대화**
    버튼(:507)이거나, 화면을 다시 여는 것입니다. `begin()` 이 `mutate` 를 부르는
    순간 `isError` 가 풀리므로 이 조건이 다시 막지 않습니다.
  */
  useEffect(() => {
    mounted.current = true;
    if (
      storeId &&
      !sessionId &&
      log.length === 0 &&
      !createSession.isPending &&
      !createSession.isError
    ) {
      void begin();
    }
    return () => {
      mounted.current = false;
    };
  }, [begin, createSession.isError, createSession.isPending, log.length, sessionId, storeId]);

  useEffect(
    () => () => {
      if (recommendationDelayTimer.current) clearTimeout(recommendationDelayTimer.current);
    },
    []
  );

  const send = (inputValue: ShortformTurnInput, label: string) => {
    if (!sessionId || submitTurn.isPending) return;
    cancelRecommendationDelay();
    append({ role: 'me', content: label });
    setOptions([]);
    setRecommendations([]);
    setFreeInput(false);
    submitTurn.mutate(inputValue, { onSuccess: applyResponse });
  };

  /**
   * 선택지를 눌렀을 때 **무엇으로 보낼지** 정합니다.
   *
   * 🔴 **확인 단계는 `OPTION` 이 아니라 `CONFIRM` 으로 보내야 합니다**
   *    (2026-08-30 사장님 지적: "같은 대화가 반복된다").
   *
   *    "이대로 추천받기 / 수정하기" 가 나오는 차례에서 `OPTION` 으로 보내면 서버가
   *    **같은 질문을 다시 합니다.** 실서버로 열 번을 이어 봤는데 끝없이 되풀이됐고,
   *    같은 자리에서 `CONFIRM` 을 보내자 **곧바로 추천 3 개**가 왔습니다
   *    (`action: RECOMMEND`). 프론트 문제였습니다.
   *
   *    원인은 **id 를 하나만 보고 있던 것**입니다. 예전에는 `CONFIRM_TRUE` 만
   *    걸렀는데, 서버가 실제로 주는 id 는 **`confirm` · `edit`** 입니다. 그래서
   *    그 가지에 한 번도 안 걸렸습니다.
   *
   *    ⚠️ 서버가 이름을 또 바꿀 수 있으니 **아는 이름을 모아** 두고 대소문자도
   *       무시합니다. 모르는 이름이 오면 예전처럼 `OPTION` 으로 보냅니다 —
   *       확인 단계가 아닌 선택지를 CONFIRM 으로 보내면 그게 더 큰 사고입니다.
   */
  const CONFIRM_YES = ['confirm', 'confirm_true', 'yes', 'true'];
  const CONFIRM_NO = ['edit', 'confirm_false', 'no', 'false'];

  const pickOption = (option: ShortformOption) => {
    const id = option.id.trim().toLowerCase();
    if (CONFIRM_YES.includes(id)) send({ type: 'CONFIRM', value: true }, option.label);
    else if (CONFIRM_NO.includes(id)) send({ type: 'CONFIRM', value: false }, option.label);
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
        /*
          🔴 **촬영 준비를 거쳐서 갑니다** (2026-08-28).

          예전에는 여기서 곧장 카메라로 보냈습니다. 홈 피드에서 포맷을 고른 흐름은
          촬영 준비(컷 구성·안무 가이드)를 보고 시작하는데, **추천으로 들어온 사장님만
          아무 안내 없이 카메라가 켜졌습니다.** 같은 자리에서 같은 화면을 보게 맞춥니다.

          ⚠️ `formatId` 가 없으면 촬영 준비가 그릴 것이 없습니다. 그때만 예외로
             카메라로 보냅니다 — 7.1 기획이 실패하면 `video_format_id` 가 null 로 옵니다.
        */
        const projectId = Number(project.id);
        const formatId = project.videoFormatId ? Number(project.videoFormatId) : undefined;
        if (formatId) {
          nav.navigate('Create', { screen: 'FormatDetail', params: { projectId, formatId } });
        } else {
          nav.navigate('Create', { screen: 'Camera', params: { projectId } });
        }
      },
    });
  };

  const tryNext = () => {
    cancelRecommendationDelay();
    setRecommendations([]);
    nextRecommendation.mutate(undefined, { onSuccess: applyResponse });
  };

  const pending =
    createSession.isPending ||
    submitTurn.isPending ||
    nextRecommendation.isPending ||
    recommendationDelayPending;
  const hasError =
    createSession.isError ||
    submitTurn.isError ||
    nextRecommendation.isError ||
    acceptRecommendation.isError;
  const hasRecs = recommendations.length > 0;

  /**
   * 입력창을 여는 조건 (2026-08-26 사장님 지시 — 시안과 다릅니다).
   *   · "직접 입력" 칩을 눌렀을 때
   *   · 추천을 받은 뒤 (조건을 적어 다시 받을 수 있게)
   *   · 서버가 **선택지 없이** 물어볼 때 (열린 질문이라 적는 수밖에 없습니다)
   *   · 오류가 났을 때 (선택지가 없으니 길이 막힙니다)
   */
  /**
   * 🔴 **서버 선택지에서 "직접 적으라" 는 칩을 걷어냅니다** (2026-08-28 사장님 지시).
   *
   * 그 아래에 같은 일을 하는 회색 칩을 우리가 이미 그리고 있어서, 파랑·회색 두 개가
   * 나란히 서 있었습니다.
   *
   * ⚠️ **id 로만 거르면 첫 차례밖에 못 막습니다.** 처음에 `FREE_INPUT` 하나만 걸렀는데
   *    사장님이 "선택지를 누를 때마다 또 나온다" 고 하셨습니다. 대화를 끝까지 밟아 보니
   *    **차례마다 id 가 다릅니다.**
   *
   *      1차  FREE_INPUT               "직접 입력하기"
   *      3차  representative_menu_none "메뉴명 직접 입력"
   *      4차  manual_menu              "메뉴명 직접 입력"
   *
   *    (실측: 세션 278, store 21. 2·5·6차에는 아예 없었습니다.)
   *    id 목록을 늘려 봐야 다음에 또 새 이름이 나옵니다. 그래서 **문구로도** 봅니다.
   *
   * 남기는 쪽은 **회색**입니다. 파란 칩은 눌러도 서버에 한 번 갔다 와서 "그럼 적어
   * 주세요" 라는 차례를 하나 더 거치지만, 회색 칩은 그 자리에서 입력창을 열고 커서까지
   * 넣습니다. 적어 낸 값은 어느 쪽이든 `TEXT` 로 가고 서버가 똑같이 받습니다
   * (실측: 메뉴를 묻는 차례에 "수제버거" 를 TEXT 로 보내니 `SAVE_AND_ASK` 로 넘어갔습니다).
   */
  const isFreeInputOption = (o: ShortformOption) =>
    o.id === 'FREE_INPUT' || o.label.replace(/\s/g, '').includes('직접입력');

  const choices = options.filter((o) => !isFreeInputOption(o));

  const openEnded = !!sessionId && !pending && options.length === 0 && !hasRecs;
  /* 입력창은 대화가 열려 있으면 **늘** 보입니다 (머리말 ②의 ⚠️). */
  const showInput = !!sessionId;

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

          {pending && <Thinking />}

          {/*
            선택지와 "직접 입력" 을 **한 줄 묶음**에 넣습니다 (2026-08-30 지시 ⑫:
            "윗줄에 충분한 여백이 있으면 굳이 아랫줄 말고 윗줄에 나란히").

            예전에는 둘을 다른 상자에 담아 "직접 입력" 이 **언제나 새 줄**로 내려갔습니다.
            한 상자에 담으면 자리가 남을 때 옆에 붙고, 모자랄 때만 다음 줄로 갑니다.

            ⚠️ 조건이 `choices` 가 아니라 **`options`** 인 것은 일부러입니다. 서버가
               `FREE_INPUT` **하나만** 보내는 차례에는 걸러낸 목록이 비는데, 그때
               `choices` 로 재면 "직접 입력" 까지 같이 사라져 길이 막힙니다.
          */}
          {!pending && options.length > 0 && (
            <View style={styles.options}>
              {choices.map((option) => (
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

              {/* 같은 칩이되 색만 물러납니다 — 객관식이 먼저 눈에 들어와야 합니다. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="보기에 없는 답을 직접 입력"
                hitSlop={6}
                onPress={() => {
                  setFreeInput(true);
                  // 입력창은 늘 떠 있으므로 커서만 넣어 키보드를 올립니다.
                  inputRef.current?.focus();
                }}
                style={({ pressed }) => [styles.option, styles.optionGhost, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.optionText, { color: color.ink[500] }]}>직접 입력</Text>
              </Pressable>
            </View>
          )}

          {/* 추천 카드 — 시안 `image (1).png`. 가로로 넘겨 봅니다. */}
          {hasRecs && (
            <>
              {/*
                ⚠️ 일반 ScrollView 를 쓰면 안 됩니다. 탭 트랙이 가로 ScrollView 라
                   카드를 넘기려는 손가락을 바깥이 먼저 먹어 **마이페이지로 넘어갑니다.**
                   `HScroll` 이 손가락이 안에 있는 동안 탭 넘김을 잠급니다.
              */}
              <HScroll
                style={styles.cardStrip}
                contentContainerStyle={styles.cardStripInner}
                snapToInterval={CARD_W + space[3]}
                snapToAlignment="start"
              >
                {recommendations.map((rec) => (
                  <RecCard
                    key={rec.recommendationId}
                    rec={rec}
                    busy={acceptRecommendation.isPending}
                    onShoot={accept}
                  />
                ))}
              </HScroll>
              {hasMoreRecommendations ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={tryNext}
                  hitSlop={6}
                  style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.moreBtnText}>다른 추천 보기</Text>
                </Pressable>
              ) : (
                <Text style={styles.moreDone}>현재 조건의 추천을 모두 확인했어요</Text>
              )}
            </>
          )}
        </ScrollView>

        {hasError && (
          /*
            🔴 **오류 알림은 대화 **아래**에 답니다** (2026-08-31 지시: "하단으로 내려").

            예전에는 스크롤 안, 말풍선 뒤에 뒀습니다. 그런데 `begin()` 이 새 대화를
            시작하며 **말풍선을 먼저 비우기** 때문에, 세션 만들기가 실패하면 빈 목록의
            맨 위 — 곧 **화면 상단** — 에 떴습니다. 그게 지적하신 자리입니다.

            스크롤 **밖**, 입력줄 바로 위에 두면 말풍선이 몇 개든 언제나 아래에 있고
            내용에 밀려 올라가지도 않습니다. 문구·색·아이콘은 그대로입니다
            (2026-08-30 지시 ⑬ — 아이콘 없이 "중단되었습니다").
          */
          <View style={styles.errorDock}>
            <Banner
              tone="warn"
              showIcon={false}
              title="AI 숏폼 추천 대화가 중단되었습니다"
              description="잠시 후 다시 시도하거나 오른쪽 위에서 새 대화를 시작해 주세요."
            />
          </View>
        )}

        {/* 입력줄이 시스템 바에 덮이지 않게 안전영역만큼 더 띄웁니다 */}
        {showInput && (
          /*
            🔴 **하단 안전영역을 여기서 또 주면 안 됩니다** (2026-08-30 지적: "하단 바랑
               안 붙고 그 위에 하얀 선마냥 여백이 있다").

            이 화면은 **탭 안**에 있습니다. 홈 인디케이터 자리는 아래 탭바가 이미
            먹고 있는데, 여기서 `insets.bottom`(34) 을 한 번 더 주고 있었습니다.
            그만큼이 입력창과 탭바 사이에 흰 띠로 남았습니다. 탭 밖 화면이라면
            필요하지만 여기서는 아닙니다.
          */
          <View style={[styles.inputRow, { paddingBottom: space[3] }]}>
            <TextInput
              ref={inputRef}
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
  /* 대화 아래, 입력줄 위. 좌우 여백은 말풍선과 같은 줄에 맞춥니다. */
  errorDock: { paddingHorizontal: space[5], paddingBottom: space[3] },
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
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // 시안 h-2 w-2(8) · bg-slate-muted
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.ink[500] },

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
  // "직접 입력" — 같은 칩이되 색만 물러납니다. 객관식이 먼저 눈에 들어와야 합니다.
  optionGhost: { borderColor: color.ink[200], backgroundColor: color.surface },

  // 객관식보다 약하게 보여야 하는 보조 동선(직접 입력 · 다른 추천)
  /*
    "다른 추천 보기" — **밑줄 글자에서 테두리 칩으로** (2026-08-30 지시 ⑤).
    밑줄만 있으면 눌러도 되는 자리인지 안 보였습니다. 카드 아래 가운데에 둡니다.
  */
  moreBtn: {
    alignSelf: 'center',
    marginTop: space[3],
    height: 38,
    paddingHorizontal: space[5],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtnText: {
    ...theme.text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[700],
  },
  moreDone: { ...theme.text.caption, alignSelf: 'center', marginTop: space[3], color: color.ink[500] },

  // ── 추천 카드 (시안 image (1).png) ──────────────────
  cardStrip: { marginHorizontal: -space[5] },
  cardStripInner: { paddingHorizontal: space[5], gap: space[3], paddingVertical: space[1] },
  // 시안 6차: rounded-2xl · border-brand-border · bg-canvas · p-4 · gap-3
  card: {
    width: CARD_W,
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.brand[300],
    backgroundColor: color.canvas,
  },
  // 시안: 15 bold leading-snug(1.375)
  cardTitle: { ...theme.text.body, fontWeight: '700', lineHeight: 20.6, color: color.ink[900] },
  // 시안: 12 semibold leading-relaxed(1.625 → 19.5) · brand
  cardTags: {
    ...theme.text.label,
    fontWeight: '600',
    lineHeight: 19.5,
    color: color.brand[600],
  },
  // 시안 ShortsEmbed 바깥: `rounded-xl bg-surface py-3` + 가운데 정렬
  embedWrap: {
    alignItems: 'center',
    paddingVertical: space[3],
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  // 시안 안쪽 슬롯: 126×224 `rounded-lg`(8) — 바깥 `rounded-xl`(12) 보다 한 단계 작습니다
  embed: {
    width: EMBED_W,
    height: EMBED_H,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: color.ink[100],
  },
  mediaUnavailable: { ...theme.text.caption, color: color.danger[500], textAlign: 'center' },
  // 시안: h-11(44) rounded-xl(12) · 14 semibold · mt-auto
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    marginTop: 'auto',
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
