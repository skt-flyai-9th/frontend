/**
 * FormatCard — 홈 피드·관심목록 공용 숏폼 카드.
 *
 * 프로토타입 `01_홈피드.png` 기준:
 *   큰 썸네일 + SHORTS 배지 + 제목 + 태그 + 하트 + 화살표.
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
import { Heart, Play, Send } from 'lucide-react-native';

import { Badge } from '../../ui/Chip';
import { VideoThumbnail } from '../../ui/VideoThumbnail';
import theme, { color, space, radius, text, sizing } from '../../design/theme';
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
        <View style={{ flex: 1, gap: space[1] }}>
          <View style={styles.titleRow}>
            <Badge label={format.formatType} />
            <Text style={[text.subheading, { flexShrink: 1 }]} numberOfLines={1}>
              {format.formatTitle}
            </Text>
          </View>
          <Text style={[text.caption, { color: color.ink[500] }]} numberOfLines={1}>
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
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
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
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Send size={20} strokeWidth={2} color={color.brand[600]} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.paper,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    overflow: 'hidden',
    ...theme.elevation('card'),
  },
  thumbWrap: { position: 'relative' },
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
  platformText: { ...theme.text.micro, color: color.ink[900], letterSpacing: 1 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  iconBtn: {
    minWidth: sizing.touchTargetMin,
    minHeight: sizing.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  pressed: { opacity: 0.6 },
});
