/**
 * FeedPage — 홈 피드의 **한 화면 = 영상 한 편**.
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 이렇게 만들었나 (2026-08-26, 사장님 지시)
 * ─────────────────────────────────────────────────────────────
 * 예전 홈은 카드를 세로로 쌓은 목록이었고 영상은 **정지 썸네일**이었습니다.
 * 유튜브 임베드 약관이 **한 화면에 자동재생 플레이어를 하나로** 제한하기 때문에,
 * 목록에 여러 개를 깔면 자동재생을 켤 수 없었습니다.
 *
 * 한 화면에 한 편만 두면 그 제한을 지키면서 자동재생이 됩니다. 지켜야 할 셋:
 *
 *   ① 자동재생 플레이어는 화면에 **하나** → 지금 보고 있는 쪽만 플레이어이고
 *      위아래는 썸네일입니다. 넘기면 자리를 바꿉니다.
 *   ② 플레이어 **최소 200×200** → 남는 세로 공간을 다 쓰므로 넉넉합니다.
 *   ③ 플레이어 **위에 아무것도 겹치지 않기** → 제목·해시태그·하트·촬영 버튼을
 *      전부 **영상 아래 띠**로 내렸습니다. 릴스처럼 영상 위에 얹으면 위반입니다.
 *
 * 소리는 꺼진 채로 시작합니다. 모바일은 소리 있는 자동재생을 막아서, `mute=1`
 * 이 없으면 재생 자체가 시작되지 않습니다. 소리는 플레이어 자체 컨트롤로 켭니다.
 *
 * ⚠️ 시안(V4·6차)의 홈은 카드 격자입니다. **일부러 다르게 만든 화면**입니다 —
 *    디자인 기조(색·모서리·타이포·간격 토큰)는 그대로 두고 배치만 바꿨습니다.
 */
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { GuidePlayer } from '../../ui/GuidePlayer';
import { VideoThumbnail } from '../../ui/VideoThumbnail';
import { SlateEditGlyph } from '../../ui/SlateEditGlyph';
import { CoachTarget, useCoach } from '../../ui/coach/CoachContext';
import { representativeVideoUrl } from '../../api/formatVideo';
import { pressTap } from '../../ui/press';
import { formatHashtags } from '../../lib/format';
import theme, { color, radius, space } from '../../design/theme';
import type { VideoFormat } from '../../api/schema/types';

/**
 * 점진 블러를 흉내 내는 띠들. 아래로 갈수록 겹쳐서 진해집니다.
 *
 * 시안은 `backdrop-filter: blur(12px)` 에 `mask-image` 를 씌워 위로 갈수록 블러가
 * 사라지게 합니다. RN 에는 마스크가 없어, **바닥에 붙은 길이가 다른 띠 네 장**을
 * 겹칩니다 — 아래쪽일수록 더 많이 겹쳐 자연히 진해집니다. `at` 은 스크림 높이 대비
 * 그 띠의 길이입니다.
 */
const BLUR_BANDS = [
  { at: 1, intensity: 8 },
  { at: 0.72, intensity: 8 },
  { at: 0.46, intensity: 10 },
  { at: 0.24, intensity: 12 },
] as const;

/**
 * 🔴 **안드로이드에서는 스크림 블러를 끕니다.**
 *
 * 두 가지 이유입니다.
 *   ① 흐릴 대상이 **재생 중인 유튜브 WebView** 입니다. 안드로이드 블러(Dimezis)는
 *      뷰 계층을 그려서 흐리는데 WebView 는 그 방식으로 잡히지 않습니다 — 켜도 안
 *      보일 가능성이 큽니다.
 *   ② 그런데 **비용은 그대로 듭니다.** 영상은 매 프레임 바뀌므로, 잡힌다면 그건
 *      초당 예순 번 흐리는 것입니다. 코치마크에서 같은 이유로 한참 고생했습니다.
 *
 * 흰 그라디언트가 시안 그림의 대부분을 만들기 때문에, 블러가 없어도 의도한 모습이
 * 나옵니다. 기기에서 켜 보고 싶으면 이 값만 `true` 로 두면 됩니다.
 */
const SCRIM_BLUR_ON = Platform.OS !== 'android';

export function FeedPage({
  format,
  height,
  width,
  active,
  onToggleFavorite,
  onCreate,
}: {
  format: VideoFormat;
  /** 이 한 장이 차지할 높이 (탭바·안전영역을 뺀 값) */
  height: number;
  width: number;
  /** 지금 보고 있는 장인지. **이 장만 영상을 재생합니다.** */
  active: boolean;
  onToggleFavorite: (f: VideoFormat) => void;
  onCreate: (f: VideoFormat) => void;
}) {
  const fav = !!format.isFavorite;

  /*
    🔴 **튜토리얼이 도는 동안 영상을 세웁니다** (2026-08-29 사장님 지적: 랙).

    코치마크는 화면을 덮습니다. 그 밑에서 유튜브가 계속 디코딩하는데, 홈은 탭을
    옮겨도 살아 있어서 **일곱 단계 내내** 돕니다. 안 보이는 영상에 그 값을 쓸
    이유가 없습니다. 끝나면 이어서 다시 틉니다 — 다시 받지 않습니다.
  */
  const coachRunning = useCoach()?.activeName != null;

  /*
    그라디언트 id 는 **카드마다 달라야** 합니다. 피드는 여러 장이 동시에 붙어 있어서
    같은 id 를 쓰면 서로 덮어씁니다(SVG 는 문서 전체에서 id 를 찾습니다).
  */
  const gradientId = `feedScrim-${format.id}`;

  // 세 태그의 규칙은 lib/format.ts 한 곳에 있습니다 (홈·관심목록·AI 추천 카드 공용)
  const tags = formatHashtags(format);

  /*
    🔴 **영상과 정보 띠를 물리적으로 나눕니다** (2026-08-29, 시안 `튜토리얼,홈UI,촬영화면UI.html`).

    시안 `ReelCard` 구조 — 세로 2단입니다.
      위  영상 전용. 가로 여백 0, 9:16 을 **세로만 잘라** 폭을 꽉 채웁니다.
          **위에 아무것도 얹지 않습니다** — 쇼츠 자체의 터치·재생·음소거를
          막지 않기 위해서라고 시안 주석에 적혀 있습니다(유튜브 약관과도 맞습니다).
      아래 메타·액션 패널 **96** 고정. 위쪽에 흰 실선(white/10) 한 줄.

    예전에는 영상을 안 자르고 폭을 줄여 좌우에 검은 여백을 뒀습니다. 시안은
    **폭을 꽉 채우고 위아래를 자릅니다** — 쇼츠는 원래 그렇게 봅니다.
  */
  /*
    🔴 **메타 패널을 없앴습니다** (2026-08-30 시안 `홈화면UI.html`).

    예전에는 영상 아래에 불투명한 띠(96)를 붙였습니다. 새 시안은 릴스처럼 **영상이
    화면을 다 쓰고**, 아래쪽에 흰 스크림을 얹은 뒤 그 위에 글자를 놓습니다.

    스크림 = 하단 38%. 흰색 네 스탑 그라디언트(0.92 → 0.62 → 0.18 → 투명)에
    블러 12 를 겹치고, 위로 갈수록 블러가 사라지게 마스크를 씌운 것이 원문입니다.
    글자·아이콘은 어두운 톤으로 뒤집습니다.
  */
  const scrimHeight = Math.round(height * 0.38);

  return (
    <View style={[styles.page, { height, width }]}>
      {/* 코치마크 2단계가 짚는 곳 — 시안 data-coach="video" */}
      <CoachTarget name="video" enabled={active} style={[styles.stage, { height, width }]}>
        {active ? (
          /*
           * 보고 있는 장만 진짜 플레이어입니다. 넘어가면 다시 썸네일로 돌아가
           * 화면에 자동재생 플레이어가 언제나 하나만 남습니다.
           */
          <GuidePlayer
            url={representativeVideoUrl(format)}
            width={width}
            portrait
            autoPlay
            paused={coachRunning}
          />
        ) : (
          <VideoThumbnail
            url={representativeVideoUrl(format)}
            platform={format.sourcePlatform}
            aspectRatio={9 / 16}
            style={{ width }}
          />
        )}

        {/*
          스크림 — 시안 원문의 두 겹을 그대로 옮긴 것입니다.
            ① 점진 블러 (아래로 갈수록 진해짐)
            ② 흰색 네 스탑 그라디언트

          ⚠️ `pointerEvents="none"` 입니다. 시안 주석대로 **쇼츠 자체 터치 조작을
             가리면 안 됩니다**(유튜브 약관 · 영상 위에 아무것도 얹지 않기).
        */}
        <View pointerEvents="none" style={[styles.scrim, { height: scrimHeight, width }]}>
          {SCRIM_BLUR_ON
            ? BLUR_BANDS.map((band) => (
                <BlurView
                  key={band.at}
                  intensity={band.intensity}
                  tint="light"
                  style={[styles.band, { height: Math.round(scrimHeight * band.at) }]}
                />
              ))
            : null}
          <Svg width={width} height={scrimHeight} style={StyleSheet.absoluteFill}>
            <Defs>
              {/* y1=1 이 아래쪽입니다 — 시안 `to top` 과 같은 방향. */}
              <LinearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor="#ffffff" stopOpacity={0.92} />
                <Stop offset="0.4" stopColor="#ffffff" stopOpacity={0.62} />
                <Stop offset="0.75" stopColor="#ffffff" stopOpacity={0.18} />
                <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={width} height={scrimHeight} fill={`url(#${gradientId})`} />
          </Svg>
        </View>

        {/*
          하단 오버레이 — 좌: 채널·제목·태그 / 우: 하트·촬영.
          **버튼만** 터치를 받습니다(`box-none`). 시안과 같습니다.
        */}
        <View pointerEvents="box-none" style={styles.overlay}>
          <View style={styles.left}>
            {/*
              시안은 채널 프로필 사진을 놓습니다. 5.1 에 avatar 필드가 없어
              **자리만** 둡니다 — 없는 사진을 지어내지 않습니다(CLAUDE.md §2).
            */}
            <View style={styles.avatar} />
            <View style={styles.texts}>
              <Text style={styles.title} numberOfLines={1}>
                {format.formatTitle}
              </Text>
              {tags.length > 0 ? (
                /*
                  🔴 태그를 **한 덩어리 글자에서 줄로** 바꿨습니다 (2026-08-30 지적:
                     "태그들이 너무 붙어 있다"). 시안은 `hashtags.join(" ")` 라 사이가
                     띄어쓰기 한 칸(≈3.5pt)뿐입니다. 사이를 8pt 로 벌립니다.
                */
                <View style={styles.tagRow}>
                  {tags.map((t) => (
                    <Text key={t} style={styles.tag} numberOfLines={1}>
                      {t}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fav ? '찜 해제' : '찜하기'}
              accessibilityState={{ selected: fav }}
              hitSlop={6}
              onPress={() => onToggleFavorite(format)}
              style={({ pressed }) => [styles.roundBtn, pressTap(pressed, 'icon')]}
            >
              <Heart
                size={20}
                strokeWidth={2}
                color={fav ? color.danger[500] : color.ink[700]}
                fill={fav ? color.danger[500] : 'transparent'}
              />
            </Pressable>

            {/* 코치마크 3단계가 짚는 곳 — 시안 data-coach="make" */}
            <CoachTarget name="make" enabled={active} style={styles.roundWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이 영상으로 촬영하기"
                hitSlop={6}
                onPress={() => onCreate(format)}
                style={({ pressed }) => [styles.roundBtn, pressTap(pressed, 'icon')]}
              >
                <SlateEditGlyph size={24} color={color.ink[700]} strokeWidth={1.7} />
              </Pressable>
            </CoachTarget>
          </View>
        </View>
      </CoachTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  /* 시안 `bg-ink` — 카드 전체가 어둡습니다. 쇼츠를 보는 화면이라 밝은 판이 눈을 찌릅니다. */
  page: { backgroundColor: color.ink[900] },
  /* 영상은 폭을 꽉 채우고 넘치는 높이를 잘라냅니다(시안 overflow-hidden). */
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: color.mediaBlack,
  },

  /* 스크림 — 카드 아래에 붙습니다. 높이는 화면의 38%(시안). */
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  /* 블러 띠는 전부 바닥에 붙고 길이만 다릅니다(BLUR_BANDS 주석). */
  band: { position: 'absolute', left: 0, right: 0, bottom: 0 },

  /* 시안: 좌우 16 · 아래 20 · 좌우 묶음을 끝에 맞춰 벌림 */
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingBottom: space[5],
  },

  left: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  /* 시안 h-9 w-9(36) + ring-1 ring-ink/15. 사진이 없어 옅은 원만 둡니다. */
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15,23,42,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.15)',
  },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  /* 시안: 14.5 semibold leading-snug 흰색 */
  title: {
    ...theme.text.bodySmall,
    fontSize: 14.5,
    lineHeight: 20,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    /* 시안 `text-ink` — 흰 스크림 위라 글자를 뒤집습니다. */
    color: color.ink[900],
  },
  /* 시안 `text-ink-3/75` = #334155 의 75% */
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: 2 },
  tag: { ...theme.text.label, lineHeight: 17, color: 'rgba(51,65,85,0.75)' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  /* 코치마크 이름표 상자 — 버튼 크기를 그대로 물려받습니다. */
  roundWrap: { width: 40, height: 40 },
  /*
    시안: 40 원형. **바닥판을 뺐습니다** — 새 시안은 흰 스크림 위에 아이콘만 놓습니다
    (원문 `className` 에 배경이 없습니다). 어두운 아이콘이라 그대로 읽힙니다.
  */
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
