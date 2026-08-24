/**
 * VideoThumbnail.tsx — 참고 영상 썸네일 (S05.1.1 "썸네일/임베드")
 *
 * ⚠️ 왜 플레이어가 아니라 썸네일인가
 *
 * YouTube 약관(Required Minimum Functionality, 2026-04-28)에 이런 제약이 있습니다.
 *   - 임베드 플레이어는 최소 200x200px 뷰포트가 필요합니다
 *   - 한 화면에 자동재생되는 플레이어는 하나뿐이어야 합니다
 *   - 플레이어 위에는 아무것도 겹칠 수 없습니다
 *
 * 목록에 플레이어를 여러 개 깔면 이 세 가지를 전부 어깁니다.
 * 게다가 플레이어 하나가 WebView 하나라 목록을 스크롤하면 메모리가 급격히 늘어납니다.
 *
 * 반면 썸네일은
 *   - 최소 120x70px 이면 되고 (약관이 따로 정한 완화된 기준)
 *   - 그냥 이미지라 위에 재생시간·배지를 얹어도 제약이 없고
 *   - 수십 개를 스크롤해도 가볍습니다
 *
 * 실제 재생은 상세 화면에서 GuidePlayer 하나로만 합니다.
 *
 * 썸네일 주소는 API 키 없이 누구나 쓸 수 있는 공개 경로입니다.
 */
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { PlayTri } from './RealsLogo';
import theme, { color, radius, space, text } from '../design/theme';

/** YouTube URL 에서 videoId 만 뽑습니다. */
export function extractVideoId(url?: string | null): string | null {
  if (!url) return null;
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/\/embed\/([\w-]{11})/) ||
    url.match(/\/shorts\/([\w-]{11})/);
  return m ? m[1] : null;
}

/**
 * maxresdefault 는 업로더가 고화질 썸네일을 안 올렸으면 404 입니다.
 * hqdefault 는 항상 있으므로 이걸 기본으로 씁니다.
 */
export function thumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

interface Props {
  url?: string | null;
  /**
   * 명세 5.1·5.2 source_platform.
   *
   * 썸네일 URL 을 만드는 방식이 플랫폼마다 다릅니다.
   * YouTube 가 아닌데 YouTube 규칙으로 만들면 깨진 이미지가 나옵니다.
   * 명세: "YouTube 외 값의 썸네일 처리 방식은 아직 미정" — 그때까지는 폴백을 보여줍니다.
   */
  platform?: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
  /** 우하단에 표시할 길이. 예: "24초" */
  duration?: string;
  /** 좌상단 배지. 예: "추천" */
  badge?: string;
  aspectRatio?: number;
  style?: ViewStyle;
}

export function VideoThumbnail({
  url,
  platform,
  duration,
  badge,
  aspectRatio = 16 / 9,
  style,
}: Props) {
  // 명세 확정 (2026-08-24): 포맷은 YouTube 에서만 가져옵니다. 다른 값이 오면
  // 데이터 오류이니 BE 에 알려야 합니다 (화면은 조용히 placeholder 로 처리).
  if (platform && platform !== 'YOUTUBE') {
    console.warn(`[VideoThumbnail] source_platform=${platform} — 명세상 YOUTUBE 만 옵니다. BE 확인 필요`);
  }
  const [failed, setFailed] = useState(false);

  // platform 이 없으면 URL 로 판단합니다. 서버가 안 줄 수도 있습니다.
  const isYoutube = platform ? platform === 'YOUTUBE' : /youtu\.?be|youtube\.com/.test(url ?? '');
  const videoId = isYoutube ? extractVideoId(url) : null;

  if (!videoId || failed) {
    return (
      <View style={[styles.wrap, styles.fallback, { aspectRatio }, style]}>
        <Text style={[text.caption, { color: color.ink[400] }]}>참고 영상</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { aspectRatio }, style]}>
      <Image
        source={{ uri: thumbnailUrl(videoId) }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onError={() => setFailed(true)}
        accessibilityLabel="참고 영상 미리보기"
      />

      {/* 썸네일 위 오버레이는 약관 제약이 없습니다. 플레이어가 아니기 때문입니다. */}
      <View style={styles.playMark}>
        <View style={styles.playCircle}>
          {/* 시안: 흰 재생 삼각형 24 (아이콘이 아니라 도형) */}
          <PlayTri size={24} fill={color.paper} />
        </View>
      </View>

      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}

      {duration ? (
        <View style={styles.duration}>
          <Text style={styles.durationText}>{duration}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.ink[100],
  },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  // 가이드라인 §5.10: 재생 표시는 반투명 검정 원 + 흰 아이콘
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    // 시안 ReelCard: bg-ink/25 + blur. RN 은 부분 blur 가 없어 농도만 맞춥니다.
    backgroundColor: color.overlay.media,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playMark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: space[2],
    left: space[2],
    backgroundColor: color.brand[600],
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: { ...text.micro, color: color.paper, fontFamily: theme.text.bodyStrong.fontFamily },
  duration: {
    position: 'absolute',
    bottom: space[2],
    right: space[2],
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  durationText: { ...text.micro, color: color.paper },
});
