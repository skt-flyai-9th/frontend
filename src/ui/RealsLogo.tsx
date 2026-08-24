/**
 * RealsLogo — 시안 `RealsLogo.jsx` / `PlayTri` 대조 이식.
 *
 * 시안 원문
 *   const play = Math.round(size * 0.31);
 *   <span className="inline-flex items-baseline font-semibold tracking-tighter-title" style={{fontSize:size}}>
 *     Reals<PlayTri size={play} style={{marginLeft:"0.06em", transform:"translateY(0.12em)"}} />
 *   </span>
 *   PlayTri: <path d="M6 3 20 12 6 21Z" fill="#ef4444" />  (24 박스 안의 삼각형)
 *
 * 모든 수치가 글자 크기에 비례합니다. 그래서 size 하나만 받고 나머지는 계산합니다 —
 * 앱바(18·22)·스플래시(34)가 같은 비율로 커집니다.
 *
 * 삼각형은 border 트릭 대신 SVG 로 그립니다. 시안의 path 를 그대로 쓸 수 있어
 * 브랜드 마크의 각도가 크기마다 달라지지 않습니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import theme, { color, font } from '../design/theme';

/** 시안 PlayTri — 24 뷰박스 안의 재생 삼각형. 기본색은 하트 빨강입니다. */
export function PlayTri({ size = 12, fill = color.danger[500] }: { size?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 3 20 12 6 21Z" fill={fill} />
    </Svg>
  );
}

export function RealsLogo({ size = 18, tint }: { size?: number; tint?: string }) {
  const play = Math.round(size * 0.31);
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Reals">
      <Text
        style={[
          styles.word,
          {
            fontSize: size,
            lineHeight: Math.round(size * 1.18),
            letterSpacing: size * font.letterSpacing.titleEm,
            color: tint ?? color.ink[900],
          },
        ]}
      >
        Reals
      </Text>
      {/*
        시안은 baseline 정렬 + translateY(0.12em) 입니다. RN 에서 View 의 baseline 은
        아래 모서리라, flex-end 로 붙이고 같은 비율만큼만 띄웁니다.
      */}
      <View style={{ marginLeft: size * 0.06, marginBottom: size * 0.1 }}>
        <PlayTri size={play} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  word: { fontFamily: theme.text.bodyStrong.fontFamily, fontWeight: theme.text.bodyStrong.fontWeight },
});
