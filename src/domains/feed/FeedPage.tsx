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
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';

import { GuidePlayer } from '../../ui/GuidePlayer';
import { VideoThumbnail } from '../../ui/VideoThumbnail';
import { SlateEditGlyph } from '../../ui/SlateEditGlyph';
import { CoachTarget } from '../../ui/coach/CoachContext';
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
  const infoHeight = 96;
  const stageHeight = Math.max(200, height - infoHeight);

  return (
    <View style={[styles.page, { height, width }]}>
      {/* 코치마크 2단계가 짚는 곳 — 시안 data-coach="video" */}
      <CoachTarget name="video" style={[styles.stage, { height: stageHeight }]}>
        {active ? (
          /*
           * 보고 있는 장만 진짜 플레이어입니다. 넘어가면 다시 썸네일로 돌아가
           * 화면에 자동재생 플레이어가 언제나 하나만 남습니다.
           *
           * 폭을 꽉 채우면 9:16 높이가 무대보다 큽니다 — 넘치는 만큼 위아래가
           * 잘리게 두는 것이 시안입니다(`overflow-hidden` + 세로 가운데).
           */
          <GuidePlayer url={representativeVideoUrl(format)} width={width} portrait autoPlay />
        ) : (
          <VideoThumbnail
            url={representativeVideoUrl(format)}
            platform={format.sourcePlatform}
            aspectRatio={9 / 16}
            style={{ width }}
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
      <View style={[styles.info, { height: infoHeight }]}>
        <View style={styles.infoRow}>
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
                <Text style={styles.tags} numberOfLines={1}>
                  {tags.join(' ')}
                </Text>
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
                color={fav ? color.danger[500] : color.paper}
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
            <CoachTarget name="make" style={styles.roundWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이 영상으로 촬영하기"
                hitSlop={6}
                onPress={() => onCreate(format)}
                style={({ pressed }) => [styles.roundBtn, pressTap(pressed, 'icon')]}
              >
                <SlateEditGlyph size={24} color={color.paper} strokeWidth={1.7} />
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

  /* 시안: 높이 96 · 위쪽 white/10 실선 · px-4 · 세로 가운데 */
  info: {
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderTopWidth: theme.border.hairline,
    borderTopColor: 'rgba(255,255,255,0.10)',
    backgroundColor: color.ink[900],
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  left: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  /* 시안 h-9 w-9(36). 사진이 없어 옅은 원만 둡니다. */
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  /* 시안: 14.5 semibold leading-snug 흰색 */
  title: {
    ...theme.text.bodySmall,
    fontSize: 14.5,
    lineHeight: 20,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.paper,
  },
  /* 시안: 12 medium white/55 */
  tags: { ...theme.text.label, lineHeight: 17, color: 'rgba(255,255,255,0.55)' },

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
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
});
