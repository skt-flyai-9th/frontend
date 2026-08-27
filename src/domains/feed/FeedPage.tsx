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
import { Camera, Heart } from 'lucide-react-native';

import { GuidePlayer } from '../../ui/GuidePlayer';
import { Marquee } from '../../ui/Marquee';
import { VideoThumbnail } from '../../ui/VideoThumbnail';
import { representativeVideoUrl } from '../../api/formatVideo';
import { pressTap } from '../../ui/press';
import { formatHashtags } from '../../lib/format';
import theme, { color, radius, space, text } from '../../design/theme';
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
   * 영상 자리와 정보 띠를 나눕니다.
   * 세로 영상(9:16)이라 폭보다 높이가 먼저 모자랍니다 — 남는 높이에 맞춰 폭을
   * 되돌려 잡고 가운데 둡니다. 잘라내지 않습니다(잘리면 자막이 사라집니다).
   */
  const infoHeight = 128;
  const stageHeight = Math.max(200, height - infoHeight);
  const playerWidth = Math.min(width, Math.round((stageHeight * 9) / 16));

  return (
    <View style={[styles.page, { height, width }]}>
      <View style={[styles.stage, { height: stageHeight }]}>
        {active ? (
          /*
           * 보고 있는 장만 진짜 플레이어입니다. 넘어가면 다시 썸네일로 돌아가
           * 화면에 자동재생 플레이어가 언제나 하나만 남습니다.
           */
          <GuidePlayer url={representativeVideoUrl(format)} width={playerWidth} portrait autoPlay />
        ) : (
          <VideoThumbnail
            url={representativeVideoUrl(format)}
            platform={format.sourcePlatform}
            aspectRatio={9 / 16}
            style={{ width: playerWidth }}
          />
        )}
      </View>

      {/*
        정보는 **영상 아래**입니다. 위에 얹으면 유튜브 약관 위반입니다.
        제목이 버튼과 자리를 다투면 "문 열고 들어오는 시…" 처럼 잘리므로,
        제목은 **한 줄 전체**를 쓰고 태그만 버튼과 나눠 씁니다.
      */}
      <View style={[styles.info, { height: infoHeight }]}>
        <Text style={styles.title} numberOfLines={2}>
          {format.formatTitle}
        </Text>

        <View style={styles.metaRow}>
          {tags.length > 0 ? (
            /*
              태그는 하트·촬영 버튼과 한 줄을 나눠 쓰느라 자리가 좁습니다.
              `#촬영30초 #난이도하 #얼…` 로 잘리면 **얼굴이 나와야 하는지**가 사라지는데,
              그건 찍기 전에 꼭 알아야 하는 값입니다. 잘리는 대신 흘려보냅니다.
            */
            <Marquee style={styles.tags} containerStyle={styles.tagsBox}>
              {tags.join(' ')}
            </Marquee>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fav ? '찜 해제' : '찜하기'}
            accessibilityState={{ selected: fav }}
            hitSlop={8}
            onPress={() => onToggleFavorite(format)}
            style={({ pressed }) => [styles.heartBtn, pressTap(pressed, 'icon')]}
          >
            <Heart
              size={22}
              strokeWidth={2}
              color={fav ? color.danger[500] : color.ink[500]}
              fill={fav ? color.danger[500] : 'transparent'}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${format.formatTitle} 이 방식으로 만들기`}
            onPress={() => onCreate(format)}
            style={({ pressed }) => [styles.createBtn, pressTap(pressed, 'button')]}
          >
            <Camera size={16} strokeWidth={2} color={color.paper} />
              <Text style={styles.createText}>이 방식으로 찍기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: color.canvas },
  // 영상 뒤는 검정입니다 — 세로 영상 좌우로 남는 자리가 화면과 섞이지 않게.
  stage: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.mediaBlack },

  info: {
    justifyContent: 'center',
    gap: space[2],
    paddingHorizontal: space[5],
    backgroundColor: color.canvas,
  },
  title: { ...theme.text.subheading, color: color.ink[900] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  tagsBox: { flex: 1, minWidth: 0 },
  tags: { ...theme.text.caption, color: color.brand[600] },

  actions: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  heartBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    backgroundColor: color.brand[600],
  },
  createText: {
    ...text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.paper,
  },
});
