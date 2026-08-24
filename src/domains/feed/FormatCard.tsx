/**
 * FormatCard — 홈 피드·관심목록 공용. **시안 ReelCard 구조** (2026-08-24 전면 교체).
 *
 * 시안 reel-card.tsx 대조 이식:
 *   풀블리드 섹션(테두리·라운드·그림자 없음, 화면폭) · 4:5 미디어(hairline 회색)
 *   중앙 Play 원 56 · SHORTS 배지(우하단 흰 rounded-md) · 하단 행: 제목 15·600
 *   + 해시태그 12·500(slate) 1줄 + Heart 36 + Send 36(brand)
 *
 * 아바타 36 (2026-08-26 시안 2차 대조로 복원)
 *   시안 카드에는 제목 왼쪽에 아바타가 있습니다. 예전에는 "5.1 응답에 avatar 필드가
 *   없다" 며 통째로 생략했는데, 그러면 카드 구성이 시안과 완전히 달라집니다.
 *   **영역은 살리고 값이 없으면 skeleton** 으로 둡니다 — 레이아웃은 시안과 같고,
 *   없는 데이터를 지어내지도 않습니다. 채널명 필드가 생기면 그때 글자만 채우면 됩니다.
 *
 * 결정 사항 (신규화면_인수인계 §6.1)
 *   - 목록에 YouTube 플레이어를 넣지 않습니다. 약관 위반 + 메모리 문제.
 *     썸네일만 보여주고, 재생은 상세(FormatDetail)에서 합니다.
 *   - `#1인촬영`(필요 인원)은 API 에 없는 값이라 뺐습니다. BE 미확정.
 *   - `expected_duration_sec` 는 **완성 영상 길이**입니다(확정).
 *     프로토타입의 "#촬영5분" 과 다른 값이므로 "완성 N초" 로 씁니다.
 *   - 하트는 낙관적 업데이트 — 5.3 이 멱등이라 안전합니다 (useToggleFavorite).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Clapperboard, Heart, Play } from 'lucide-react-native';

import { VideoThumbnail } from '../../ui/VideoThumbnail';
import { Skeleton } from '../../ui/Feedback';
import theme, { color, space, radius, sizing } from '../../design/theme';
import type { VideoFormat } from '../../api/schema/types';

type Props = {
  format: VideoFormat;
  /** 하트를 눌렀을 때. 부모가 useToggleFavorite 로 처리합니다. */
  onToggleFavorite: (format: VideoFormat) => void;
  /** 화살표(이걸로 만들기)를 눌렀을 때. */
  onCreate: (format: VideoFormat) => void;
  /** 썸네일을 눌렀을 때 (상세 보기). */
  onOpen?: (format: VideoFormat) => void;
};

export function FormatCard({ format, onToggleFavorite, onCreate, onOpen }: Props) {
  const fav = !!format.isFavorite;

  const tags = [
    `#완성${format.expectedDurationSec}초`,
    `#난이도${format.shootingDifficulty}`,
    format.faceExposureLevel === '낮음' ? '#얼굴노출없음' : `#얼굴노출${format.faceExposureLevel}`,
  ];

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={`${format.formatTitle} 자세히 보기`}
        onPress={onOpen ? () => onOpen(format) : undefined}
        style={styles.thumbWrap}
      >
        {/* 세로 숏폼 비율. 카드가 화면을 거의 채우는 프로토타입 느낌을 냅니다. */}
        <VideoThumbnail url={format.referenceUrl} platform={format.sourcePlatform} aspectRatio={4 / 5} />
        {format.sourcePlatform ? (
          // 가이드라인 §5.10: 흰 배지 + 빨간 Play + 대문자 라벨
          <View style={styles.platformBadge}>
            <Play size={12} strokeWidth={2.6} color={color.danger[500]} fill={color.danger[500]} />
            <Text style={styles.platformText}>
              {format.sourcePlatform === 'YOUTUBE' ? 'SHORTS' : format.sourcePlatform}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <View style={styles.meta}>
        {/* 시안: 아바타 36. 값이 없으면 자리만 유지합니다(가짜 이미지를 넣지 않습니다). */}
        <Skeleton style={styles.avatar} />

        <View style={{ flex: 1, minWidth: 0 }}>
          {/* 시안: 제목 15·600 한 줄 (formatType 배지는 제목 안이 아니라 태그줄 앞으로) */}
          <Text style={styles.title} numberOfLines={1}>
            {format.formatTitle}
          </Text>
          <Text style={styles.tagLine} numberOfLines={1}>
            {tags.join(' ')}
          </Text>
        </View>

        {/* 터치 영역 44px 이상 — 40~60대 손끝 기준 */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fav ? '찜 해제' : '찜하기'}
          accessibilityState={{ selected: fav }}
          onPress={() => onToggleFavorite(format)}
          hitSlop={6}
          style={({ pressed }) => [styles.iconBtn, pressed && { transform: [{ scale: 0.9 }] }]}
        >
          {/* 채움/비움으로 상태를 표현합니다 (가이드라인 §5.10) */}
          <Heart
            size={22}
            strokeWidth={fav ? 2 : 1.75}
            color={fav ? color.danger[500] : color.ink[700]}
            fill={fav ? color.danger[500] : 'transparent'}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이 방법으로 만들기"
          onPress={() => onCreate(format)}
          hitSlop={6}
          style={({ pressed }) => [styles.iconBtn, pressed && { transform: [{ scale: 0.9 }] }]}
        >
          {/* 시안 2차: 종이비행기 → 클래퍼보드 */}
          <Clapperboard size={20} strokeWidth={2} color={color.brand[600]} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 시안: 카드가 아니라 풀블리드 섹션 — 테두리·라운드·그림자 없음
  card: { backgroundColor: color.paper },
  thumbWrap: { position: 'relative', backgroundColor: color.ink[200] },
  platformBadge: {
    position: 'absolute',
    right: space[3],
    bottom: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    backgroundColor: color.paper,
    borderRadius: radius.sm,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    ...theme.elevation('card'),
  },
  // 시안: text-[11px] font-bold tracking-tight (자간을 벌리지 않습니다)
  platformText: {
    ...theme.text.micro,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
    color: color.ink[900],
    letterSpacing: -0.22,
  },
  // 시안: 제목 15·600 / 해시태그 12·500 slate-muted
  title: { ...theme.text.bodyStrong },
  tagLine: { ...theme.text.label, marginTop: 2, fontFamily: theme.text.body.fontFamily, fontWeight: theme.text.body.fontWeight },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingTop: 14,
    paddingBottom: space[4],
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  // 시안 ReelCard: h-9 w-9 rounded-full
  avatar: { width: sizing.avatar, height: sizing.avatar, borderRadius: radius.pill },
  iconBtn: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
