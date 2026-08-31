/**
 * FeedShelf — 홈 영상 **아래** 정보 띠.
 *
 * 🔴 **목록 밖에 있습니다** (2026-08-31, "탭바랑 선반 전환 시 영상이 깜빡인다").
 *
 * 원래는 `FeedPage` 안, 그러니까 **넘기는 장 한 장 한 장에** 들어 있었습니다.
 * 그래서 선반이 뜨고 지는 것이 곧 장 높이가 764 ↔ 699 로 바뀌는 일이었고,
 * 목록 전체가 다시 계산되며 플레이어가 내려갔다 올라왔습니다.
 *
 * 지금은 **탭바와 같은 자리**입니다 — 목록 아래 한 줄. 장 높이는 늘 그대로고,
 * 바뀌는 건 이 줄이 탭바로 바뀌는 것뿐입니다. 사장님 말대로 "진짜 바를 바꾸는" 꼴.
 *
 * 넘기는 중에는 선반이 뜨지 않으므로(넘기면 탭바로 바뀌고, 2초 머물러야 선반)
 * 밖으로 나와도 **보이는 것은 하나도 달라지지 않습니다.**
 *
 * ⚠️ 영상 **위**가 아니라 아래입니다. 유튜브 임베드 위에는 아무것도 얹지
 *    않습니다 (CLAUDE.md §8-1).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';

import { SlateEditGlyph } from '../../ui/SlateEditGlyph';
import { CoachTarget } from '../../ui/coach/CoachContext';
import { pressTap } from '../../ui/press';
import { formatHashtags } from '../../lib/format';
import theme, { color, radius, space } from '../../design/theme';
import type { VideoFormat } from '../../api/schema/types';

export function FeedShelf({
  format,
  height,
  onToggleFavorite,
  onCreate,
}: {
  format: VideoFormat;
  /** 바 한 줄의 높이 — 탭바와 같은 값입니다 (`homeBarHeightFor`) */
  height: number;
  onToggleFavorite: (f: VideoFormat) => void;
  onCreate: (f: VideoFormat) => void;
}) {
  const fav = !!format.isFavorite;
  const tags = formatHashtags(format);

  return (
    <View style={[styles.shelf, { height }]}>
      <View style={[styles.infoRow, { height }]}>
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
                태그를 한 덩어리 글자에서 **줄로** 바꿨습니다 (2026-08-30 지적:
                "태그들이 너무 붙어 있다"). 시안은 join(" ") 이라 사이가 ≈3.5pt 뿐.
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
            🔴 **촬영 아이콘** — 슬레이트 + 연필(`SlateEditGlyph`). 재생 삼각형은
               "영상을 튼다" 로 읽혀서 촬영 준비로 간다는 게 안 보였습니다 (2026-08-29).

            코치마크 3단계가 짚는 곳입니다. 선반이 밖으로 나오면서 **늘 보고 있는
            영상의 버튼**이 되었습니다 — 예전처럼 어느 장의 것인지 따질 필요가 없습니다.
          */}
          <CoachTarget name="make" enabled style={styles.roundWrap}>
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
  );
}

const styles = StyleSheet.create({
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
  /* 시안: 14.5 semibold leading-snug */
  title: {
    ...theme.text.bodySmall,
    fontSize: 14.5,
    lineHeight: 20,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[900],
  },
  /* 시안: 12 medium */
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  tags: { ...theme.text.label, lineHeight: 17, color: 'rgba(51,65,85,0.75)' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  /* 코치마크 이름표 상자 — 버튼 크기를 그대로 물려받습니다. */
  roundWrap: { width: 40, height: 40 },
  /* 시안: 40 원형 */
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
