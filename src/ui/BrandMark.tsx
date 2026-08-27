/**
 * BrandMark — 시안 `PlaceMark` · `InstaMark` · `YoutubeMark` 대조 이식.
 *
 * ─────────────────────────────────────────────────────────────
 * 2026-08-27 — **시안이 쓰는 실제 브랜드 아이콘 PNG 로 교체했습니다**
 * ─────────────────────────────────────────────────────────────
 * 예전에는 인스타 그라디언트 사각형·유튜브 빨간 상자를 `react-native-svg` 로 **직접
 * 그렸습니다.** 시안 v3 의 도형 버전을 보고 옮긴 것인데, **시안 9차는 그리지 않고
 * 실제 아이콘 이미지를 씁니다** (`js/screens-my.jsx:6,8,74` — `window.__asset(
 * "icon-instagram.png" / "icon-youtube.png")`). 흉내 낸 도형은 실제 로고와 다릅니다 —
 * 인스타는 렌즈 원과 모서리 점이 없었고, 유튜브는 둥근 사각형이 아니라 원이었습니다.
 * 사장님이 실기기에서 잡아 주셨습니다.
 *
 * 번들의 원본을 그대로 가져왔습니다 → `assets/brand/icon-*.png` (167×167 · 167×125).
 *
 * 시안 원문 치수
 *   place+     h-18 · rounded · bg #5CA4F8 · px-1.5 · 10·bold · 흰 글자 (이건 계속 도형)
 *   instagram  `<img>` size 정사각 (마이페이지 18)
 *   youtube    `<img>` **22×16 고정** (마이페이지)
 *   boxed      `<img>` **(size + 14) 정사각** — 색 타일이 아니라 아이콘 그 자체입니다
 *
 * 전부 `object-contain` 이라 비율이 유지됩니다 (RN `resizeMode="contain"`).
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import theme, { color, radius } from '../design/theme';

/** 시안 번들 `assets/icon-*.png` 원본. */
const MARK = {
  instagram: require('../../assets/brand/icon-instagram.png'),
  youtube: require('../../assets/brand/icon-youtube.png'),
};
const LABEL = { instagram: '인스타그램', youtube: '유튜브' };

export type BrandKind = 'place' | 'instagram' | 'youtube';

export function BrandMark({
  kind,
  size = 18,
  boxed = false,
}: {
  kind: BrandKind;
  /** boxed 면 **심볼** 크기입니다 — 그려지는 아이콘은 시안대로 `size + 14` 가 됩니다. */
  size?: number;
  /**
   * 연동 화면(매장 정보 수정)용 큰 아이콘 — 시안 `BrandMark({ platform, size = 22 })`.
   * `size + 14` 정사각입니다. **색 타일을 깔지 않습니다** — 아이콘이 이미 브랜드 색입니다.
   */
  boxed?: boolean;
}) {
  if (kind === 'place') {
    return (
      <View style={styles.place}>
        <Text style={styles.placeText}>place+</Text>
      </View>
    );
  }

  /*
    시안 `BrandMark({ platform, size = 22 })` — 정사각 `size + 14`.
    색 타일을 깔지 않습니다. 아이콘 자체가 이미 브랜드 색을 갖고 있습니다.
  */
  if (boxed) {
    const tile = size + 14;
    return (
      <Image
        source={MARK[kind]}
        style={{ width: tile, height: tile }}
        resizeMode="contain"
        accessibilityLabel={LABEL[kind]}
      />
    );
  }

  // 시안 `YoutubeMark` 는 **22×16 고정**입니다 (size 를 받지 않습니다)
  const box =
    kind === 'youtube' ? { width: 22, height: 16 } : { width: size, height: size };
  return (
    <Image
      source={MARK[kind]}
      style={box}
      resizeMode="contain"
      accessibilityLabel={LABEL[kind]}
    />
  );
}

const styles = StyleSheet.create({
  place: {
    height: 18,
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: radius.xs,
    backgroundColor: '#5CA4F8',
  },
  placeText: {
    ...theme.text.nano,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
    color: color.paper,
  },
});
