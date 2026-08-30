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
 *
 * ───────────────────────────────────────────────────────────
 * 🔴 **영상 위에 스크림·글자를 얹는 시안은 넣으면 안 됩니다** (2026-08-30)
 * ───────────────────────────────────────────────────────────
 * `홈화면UI.html` 시안이 릴스처럼 **영상 하단 38% 위에** 흰 스크림과 제목·태그·
 * 하트·촬영 버튼을 얹는 구조로 왔고, 한 번 그대로 넣었다가 되돌렸습니다
 * (사장님 지적). 유튜브 약관이 정면으로 금지합니다.
 *
 *   "You must not display overlays, frames, or other visual elements in front of
 *    any part of a YouTube embedded player, including player controls."
 *   "You must not use overlays, frames or other visual elements to obscure any
 *    part of an embedded player, including player controls."
 *      — YouTube API Services · Required Minimum Functionality · Overlays and frames
 *
 * **"터치를 안 막으면 된다" 가 아닙니다.** 시안 주석은 `pointer-events: none` 이라
 * 쇼츠 조작을 가리지 않는다고 적었는데, 약관이 막는 건 **눈으로 가리는 것**입니다.
 * 게다가 쇼츠의 자체 조작부(재생·음소거·진행바)가 바로 그 하단에 있습니다.
 *
 * 그래서 정보는 **영상 아래 띄**에 둡니다.
 *
 * ✅ **다만 시안의 그림은 띄 안에서 그대로 살렸습니다** (2026-08-30 사장님 지시:
 *    "유튜브 자리 안 겹치게만 해서 주고, 디자인은 얘가 바꾸자고 한 대로").
 *
 *    · 흰 스크림 · 어두운 글자 · 바닥판 없는 아이콘 · 아바타 테두리 — 전부 시안대로
 *    · 다른 것은 **놓이는 자리 하나**입니다. 영상 위가 아니라 영상 **아래**입니다.
 *
 * ⚠️ **그라디언트를 투명으로 보내면 검은 띄가 생깁니다.** 시안은 영상 위에서
 *    사라지므로 투명해지는 게 곳 영상입니다. 우리 띄는 영상 **밖**이라 투명해지면
 *    그 뒤의 카드 검정이 드러나, 영상과 띄 사이에 검은 띄가 끯깁니다(실제로 그렇게
 *    나왔습니다). 그래서 **불투명한 밝은 선반**으로 두고, 그라디언트는 흰색에서
 *    열은 회색으로만 올라갑니다 — 깊이는 남기고 검은 띄는 안 생깁니다.
 *    아래 탭바도 흰색이라 밝은 선반이 오히려 매끄럽게 이어집니다.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';

import { GuidePlayer } from '../../ui/GuidePlayer';
import { VideoThumbnail } from '../../ui/VideoThumbnail';
import { SlateEditGlyph } from '../../ui/SlateEditGlyph';
import { CoachTarget, useCoach } from '../../ui/coach/CoachContext';
import { representativeVideoUrl } from '../../api/formatVideo';
import { pressTap } from '../../ui/press';
import { formatHashtags } from '../../lib/format';
import theme, { color, radius, space } from '../../design/theme';
import type { VideoFormat } from '../../api/schema/types';

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
    코치마크가 도는지. 원래는 랙 때문에 **세우기만** 했는데(2026-08-29 지적),
    약관 재검토에서 세우는 걸로는 모자라다는 게 드러나 아래에서 아예 걷어냅니다.
  */
  const coachRunning = useCoach()?.activeName != null;

  /*
    ─────────────────────────────────────────────────────────────
    🔴 **튜토리얼이 도는 동안엔 플레이어를 걷어냅니다** (2026-08-30, 약관 재검토)
    ─────────────────────────────────────────────────────────────
    예전에는 세워 두기만 했습니다(`paused`). 그런데 코치마크는 **화면 전체에 막을
    덮고** 2단계에서 영상 자리에 구멍을 냅니다. 세워 뒀어도 임베드 플레이어는
    그대로 살아 있으니, 그 막은 **플레이어 앞을 가리는 것**입니다.

      "You must not display overlays, frames, or other visual elements in front of
       any part of a YouTube embedded player, including player controls."
         — Required Minimum Functionality · Overlays and frames

    막을 안 덮을 수는 없습니다(그게 튜토리얼입니다). 그래서 **덮는 동안 플레이어를
    없앱니다** — 이웃 장과 똑같이 썸네일로 바꿉니다. 가릴 플레이어가 없으면 위반할
    것도 없습니다. 끝나면 다시 붙습니다(그때 한 번 다시 불러옵니다 — 튜토리얼은
    드물게 도는 일이라 그만한 값은 치를 만합니다).

    덤 — 디코딩이 완전히 멈추므로 예전에 지적하신 **랙에도 더 좋습니다.**
  */
  const showPlayer = active && !coachRunning;

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
    🔴 **띠를 96 → 56 으로 조였습니다** (2026-08-30 지적: "하단 공간이 너무 크다").

    안에 들어가는 것 중 가장 큰 게 **원형 버튼 40** 입니다(하트·촬영). 글자 묶음은
    제목 20 + 태그 17 + 사이 2 = 39 라 버튼보다 작습니다. 그래서 40 + 위아래 8 씩 = 56 이
    **더 줄일 수 없는 값**입니다. 여기서 더 줄이면 버튼이 눌리기 어려워집니다.

    덤 — 띠가 줄어든 만큼 영상이 커져 **잘리는 양도 줄어듭니다**
    (실측 393×852: 무대 575 → 615, 잘림 124 → 84 · 17.7% → 12.0%).
  */
  /*
    🔴 **자리가 남으면 띠가 가져갑니다** (2026-08-30, 앱바·탭바 치우기와 한 쌍).

    앱바와 탭바가 치워지면 이 장이 671 → 764 로 커집니다. 그런데 영상은 폭이
    정해져 있어 아무리 커져도 **699** 를 넘지 않습니다. 남는 65 를 무대에 그냥
    주면 영상 위아래에 `mediaBlack` 이 드러나 **검은 띠**가 생깁니다 — 지난번
    검은 줄과 같은 사고입니다.

    그래서 무대는 "영상이 딱 들어갈 만큼" 에서 멈추고, 남는 건 띠가 먹습니다.
      바 있음 (height 671) → 무대 615, 띠 56   ← 84pt 잘림
      바 없음 (height 764) → 무대 699, 띠 65   ← **안 잘림**
  */
  const SHELF_MIN = 56;
  /** 폭을 꽉 채운 9:16 높이. 무대가 이보다 커질 이유가 없습니다. */
  const videoHeight = Math.ceil((width * 16) / 9);
  const stageHeight = Math.max(200, Math.min(height - SHELF_MIN, videoHeight));
  const shelfHeight = Math.max(SHELF_MIN, height - stageHeight);
  /*
    ─────────────────────────────────────────────────────────────
    🔴 **영상을 자르지 않습니다** (2026-08-30, 약관 재검토 결과)
    ─────────────────────────────────────────────────────────────
    한동안 폭을 꽉 채우고 넘치는 높이를 잘라 냈습니다(무대 615 · 영상 699 →
    위아래 42pt 씩 84pt 잘림). 디자인 요청("검은 테두리 빼 달라")을 따른 것인데,
    **유튜브 약관에 걸립니다.** 원문 두 곳입니다.

      "Similarly, you must not use overlays, frames or other visual elements to
       obscure any part of an embedded player, including player controls."
         — Required Minimum Functionality · Overlays and frames

      "If the player displays controls, it must be large enough to fully display
       the controls without shrinking the viewport below the minimum size."
         — Required Minimum Functionality · Embedded YouTube Player size

      "modify, build upon, or block any portion or functionality of a YouTube player"
         — Developer Policies III.I.6

    자르는 건 "덮는 것" 이 아니라고 볼 여지가 있지만, **III.I.6 의 "block any
    portion" 에는 그대로 걸립니다.** 게다가 잘려 나가는 아래 42pt 가 하필
    **쇼츠 자체 조작부**(재생·음소거·진행바)가 있는 자리입니다 — 위 두 번째
    문장이 정확히 그걸 금지합니다.

    그래서 **무대에 다 안 들어가면 폭을 줄여 맞춥니다.** 어느 순간에도 플레이어의
    어느 부분도 가려지지 않습니다.

      바 접힘 (무대 699) → 폭 393. 딱 맞습니다. **옆 여백 0**
      바 열림 (무대 615) → 폭 345. 옆에 24pt 씩 남습니다

    바를 접은 쪽이 **기본 상태**라, 보는 시간의 대부분은 폭이 꽉 찹니다.
    옆 여백은 바를 부른 잠깐 동안만 생깁니다.
  */
  const playerWidth = Math.min(width, Math.floor((stageHeight * 9) / 16));

  return (
    <View style={[styles.page, { height, width }]}>
      {/* 코치마크 2단계가 짚는 곳 — 시안 data-coach="video" */}
      <CoachTarget name="video" enabled={active} style={[styles.stage, { height: stageHeight }]}>
        {showPlayer ? (
          /*
           * 보고 있는 장만 진짜 플레이어입니다. 넘어가면 다시 썸네일로 돌아가
           * 화면에 자동재생 플레이어가 언제나 하나만 남습니다.
           */
          <GuidePlayer
            url={representativeVideoUrl(format)}
            width={playerWidth}
            portrait
            /*
              🔴 **모서리를 각지게 둡니다** (2026-08-30).

              `GuidePlayer` 는 기본이 `radius.md` 둥근 모서리입니다. 지금까지는
              영상(699)이 무대(615)보다 커서 위아래 모서리가 **잘려 나가 안 보였습니다.**
              바를 치워 무대가 699 로 딱 맞자 네 모서리가 드러나고, 그 뒤의
              `mediaBlack` 이 검은 조각으로 비쳤습니다(실제로 그렇게 나왔습니다).
              화면 끝까지 붙는 자리이므로 둥글릴 이유가 없습니다.
            */
            fullBleed
            autoPlay
          />
        ) : (
          /*
            이웃 장과 튜토리얼 중에 보이는 그림. **플레이어와 같은 폭**을 씁니다 —
            썸네일만 화면 폭(393)을 쓰면 넘기는 동안 이웃 장만 잘려서
            지금 장과 크기가 어긋나 보입니다.
          */
          <VideoThumbnail
            url={representativeVideoUrl(format)}
            platform={format.sourcePlatform}
            aspectRatio={9 / 16}
            style={{ width: playerWidth }}
          />
        )}
      </CoachTarget>

      {/*
        시안 메타 패널 — **한 줄**입니다.
          왼쪽  아바타 36 + [제목 14.5 semibold] / [해시태그 12] 세로 2단
          오른쪽 하트 40 · 촬영 40

        예전에는 제목이 한 행을 통째로 쓰고 그 아래 태그+버튼이 또 한 행이었습니다.
        시안은 왼쪽 묶음과 오른쪽 버튼이 **같은 줄**을 나눠 씁니다 — 그래서 96 에
        들어갑니다(사장님이 "구성 배치가 중요하다" 고 짚으신 부분).
      */}
      <View style={[styles.shelf, { height: shelfHeight }]}>
        <View style={[styles.infoRow, { height: shelfHeight }]}>
          <View style={styles.left}>
            {/*
              시안은 채널 프로필 사진을 놓습니다. 5.1 에 avatar 필드가 없어
              **자리만** 둡니다 — 없는 사진을 지어내지 않습니다(CLAUDE.md §2).
              값이 생기면 여기에 <Image> 를 넣으면 됩니다.
            */}
            <View style={styles.avatar} />
            <View style={styles.texts}>
              <Text style={styles.title} numberOfLines={1}>
                {format.formatTitle}
              </Text>
              {tags.length > 0 ? (
                /*
                  태그를 **한 덩어리 글자에서 줄로** 바꿨습니다 (2026-08-30 지적:
                  "태그들이 너무 붙어 있다"). 시안은 `hashtags.join(" ")` 라 사이가
                  띄어쓰기 한 칸(≈3.5pt)뿐입니다. 사이를 8pt 로 벌립니다.
                */
                <View style={styles.tagRow}>
                  {tags.map((t) => (
                    <Text key={t} style={styles.tags} numberOfLines={1}>
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

            {/*
              🔴 **촬영 아이콘이 바뀌었습니다** (2026-08-29 시안).
                 재생 삼각형 → **슬레이트 + 연필**(`SlateEditGlyph`).
                 삼각형은 "영상을 튼다" 로 읽혀서, 누르면 촬영 준비로 간다는 게
                 안 보였습니다.
            */}
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
      </View>
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

  /*
    아래 띄. **바탕은 카드 색 그대로** 두고 그 위에 흰 그라디언트만 얹습니다 —
    그래야 위쪽에서 영상 쪽 검정으로 자연스럽게 넘어갑니다. 예전의 흰 실선(white/10)은
    뻐습니다 — 번지는 구간이 그 역할을 대신합니다.
  */
  /*
    아래 띠. **단색 흰색**입니다 (2026-08-30 디자인 요청: "그라데이션이랑 기타 효과
    다 빼도 된다"). 한동안 흰색→옅은 회색 기울기를 줬는데, 영상이 폭을 꽉 채우면서
    옆 띠가 사라져 이어 붙일 대상도 없어졌습니다.
  */
  shelf: { justifyContent: 'flex-end', backgroundColor: color.paper },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  left: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  /* 시안 h-9 w-9(36). 사진이 없어 옅은 원만 둡니다. */
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
    color: color.ink[900],
  },
  /* 시안: 12 medium white/55 */
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  tags: { ...theme.text.label, lineHeight: 17, color: 'rgba(51,65,85,0.75)' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  /* 코치마크 이름표 상자 — 버튼 크기를 그대로 물려받습니다. */
  roundWrap: { width: 40, height: 40 },
  /* 시안: 40 원형. 어두운 바닥이라 유리질 배경을 깔아 아이콘이 뜹니다. */
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
