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
 *    ⚠️ 시안 6차 원문은 `const composerOpen = true` 로 입력창을 항상 열어 둡니다.
 *       실기기에서 써 보니 "빈 칸이 늘 떠 있으면 뭘 적으라는 건지 모르겠다" 는
 *       판단이 나와 **시안과 다르게** 닫아 두기로 했습니다. 되돌리려면
 *       `showInput` 을 `!!sessionId` 로 되돌리면 됩니다.
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
import { PlayTri } from '../../../ui/RealsLogo';
import { VideoThumbnail } from '../../../ui/VideoThumbnail';
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
function Thinking({ label }: { label: string }) {
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
      <View style={[styles.bubble, styles.ai, styles.thinking]}>
        <Text style={styles.bubbleText}>{label}</Text>
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
 * 원문 구성: 제목 · AI 한줄요약 · 해시태그 3개 · 숏츠 임베딩 · 바로 촬영하기.
 * 카드 안 여백은 `gap-3` 로 통일, 버튼은 `mt-auto` 로 바닥에 붙습니다.
 *
 * **해시태그·임베드는 2026-08-27 에 채웠습니다.** 그전까지는 채울 값이 없어 비워 둔
 * 자리였습니다(추천 응답에 포맷을 가리키는 값이 없었습니다). 6.2·6.3 에
 * `video_format_id` 가 생겨 5.2 로 포맷을 한 장 더 읽어 채웁니다.
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
  /*
    `video_format_id` 는 **required 이지만 값이 null 일 수 있습니다** — 아직 한 번도
    채택된 적 없는 편집 템플릿에는 짝이 되는 포맷이 없습니다(openapi 실측:
    `integer|null`). 그때는 쿼리가 아예 돌지 않고(`enabled`), 아래에서 태그줄과
    임베드를 **그리지 않습니다.** 빈 회색 상자를 깔면 "영상이 있는데 안 뜨는 것" 처럼
    보입니다 — 제1규칙.
  */
  const format = useVideoFormat(rec.videoFormatId ?? undefined).data;
  const tags = formatHashtags(format);
  const videoUrl = representativeVideoUrl(format);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {rec.title}
      </Text>
      {rec.concept ? <Text style={styles.cardConcept}>{rec.concept}</Text> : null}

      {/* 시안: 12 semibold leading-relaxed · brand — 앞의 세 개만 씁니다 */}
      {tags.length > 0 ? (
        <Text style={styles.cardTags} numberOfLines={1}>
          {tags.slice(0, 3).join(' ')}
        </Text>
      ) : null}

      {/*
        시안 `ShortsEmbed` — 9:16 슬롯. **플레이어가 아니라 썸네일입니다.**
        한 줄에 카드가 여러 장이라 플레이어를 깔면 YouTube 약관(한 화면에 하나)을
        어깁니다. 재생은 포맷 상세에서 합니다 (FormatCard 머리말 §6.1 과 같은 판단).
        카드에 보이는 건 **대표 영상**입니다 — 가이드 영상이 아닙니다(api/formatVideo.ts).
      */}
      {videoUrl ? (
        <View style={styles.embedWrap}>
          <View style={styles.embed}>
            <VideoThumbnail
              url={videoUrl}
              platform={format?.sourcePlatform}
              aspectRatio={EMBED_W / EMBED_H}
              playSize={44}
              // 부모가 8 로 자르므로 같은 값을 줍니다 (기본 12 면 모서리에 회색이 비칩니다)
              style={{ width: EMBED_W, height: EMBED_H, borderRadius: radius.sm }}
            />
            {/* 시안: 좌하단 흰 배지 + 빨간 삼각형 9 + 9px bold */}
            <View style={styles.embedBadge}>
              <PlayTri size={9} />
              <Text style={styles.embedBadgeText}>
                {format?.sourcePlatform && format.sourcePlatform !== 'YOUTUBE'
                  ? format.sourcePlatform
                  : 'SHORTS'}
              </Text>
            </View>
          </View>
        </View>
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
  const [hasMoreRecommendations, setHasMoreRecommendations] = useState(true);
  const [input, setInput] = useState('');
  /** 자유 입력창을 사장님이 직접 열었는지. 기본은 닫힘입니다. */
  const [freeInput, setFreeInput] = useState(false);
  /** "직접 입력" 을 눌러 연 칸에 커서를 넣어 키보드까지 함께 올립니다. */
  const inputRef = useRef<TextInput>(null);
  /** 세션 생성이 진행 중인지. 자동 시작과 새로고침이 겹쳐 세션을 두 개 만드는 것을 막습니다. */
  const starting = useRef(false);

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
      setHasMoreRecommendations(response.hasMoreRecommendations ?? true);
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
   * 입력창을 여는 조건 (2026-08-26 사장님 지시 — 시안과 다릅니다).
   *   · "직접 입력" 칩을 눌렀을 때
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
            "직접 입력" 도 **선택지와 같은 칩**입니다 (사장님 지시).
            누르면 아래 입력창이 올라오고 커서가 들어가 키보드까지 같이 뜹니다.
            선택지 줄 안에 들어가야 같은 높이로 나란히 서므로 위 블록과 한 몸입니다.
          */}
          {!pending && options.length > 0 && !freeInput && (
            <View style={styles.options}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="보기에 없는 답을 직접 입력"
                hitSlop={6}
                onPress={() => {
                  setFreeInput(true);
                  // 칸이 그려진 다음에 커서를 넣어야 키보드가 뜹니다.
                  setTimeout(() => inputRef.current?.focus(), 80);
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
                  style={({ pressed }) => [styles.freeLink, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.freeLinkText}>다른 추천 보기</Text>
                </Pressable>
              ) : (
                <Text style={styles.freeLinkText}>현재 조건의 추천을 모두 확인했어요</Text>
              )}
            </>
          )}
        </ScrollView>

        {/* 입력줄이 시스템 바에 덮이지 않게 안전영역만큼 더 띄웁니다 */}
        {showInput && (
          <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, space[4]) }]}>
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
  freeLink: { alignSelf: 'flex-start', marginLeft: 40, paddingVertical: space[2] },
  freeLinkText: { ...theme.text.caption, color: color.ink[500], textDecorationLine: 'underline' },

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
  // 시안: 13 leading-relaxed(1.625) · ink-3
  cardConcept: { ...theme.text.caption, lineHeight: 21, color: color.ink[700] },
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
  // 시안: `absolute bottom-1.5 left-1.5` 흰 배지
  embedBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: 6,
    paddingVertical: 2,
    // 시안 `rounded` = 4. 토큰에 4 가 없어(xs 6 · tile 2) 원문 값을 그대로 씁니다
    borderRadius: 4,
    backgroundColor: color.paper,
  },
  // 시안: 9px bold tracking-tight — 자간을 벌리지 않습니다
  embedBadgeText: {
    ...theme.text.nano,
    fontSize: 9,
    lineHeight: 12,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
    color: color.ink[900],
    letterSpacing: -0.18,
  },
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
