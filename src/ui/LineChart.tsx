/**
 * LineChart — 시안 v3 `LineChart` 대조 이식.
 *
 * 시안 원문 수치
 *   뷰박스 329 x 132 · pad 8
 *   곡선   각 구간의 중간 x 를 제어점으로 쓰는 부드러운 베지어
 *          `C (prev.x+p.x)/2, prev.y  (prev.x+p.x)/2, p.y  p.x, p.y`
 *   선     #2563EB · 2.5 · linecap round
 *   면     같은 색 위 0.18 → 아래 0 그라디언트
 *   점     r3 · 흰 채움 · 브랜드 테두리 2
 *   축     아래 11px slate 요일 라벨 (mt-1.5 · px-1 · space-between)
 *
 * 데이터가 비면 아무것도 그리지 않습니다 — 없는 추이를 지어내지 않기 위해서입니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import theme, { color, space } from '../design/theme';

export interface LinePoint {
  /** 축에 찍히는 라벨. 예: '월' */
  label: string;
  value: number;
}

const W = 329;
const H = 132;
const PAD = 8;

export function LineChart({ data }: { data: LinePoint[] }) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const stepX = (W - PAD * 2) / (data.length - 1);

  const points = data.map((d, i) => ({
    x: PAD + i * stepX,
    // 값이 전부 같으면 0 으로 나누게 되므로 1 로 막습니다(시안과 동일).
    y: PAD + (1 - (d.value - min) / (max - min || 1)) * (H - PAD * 2),
  }));

  const line = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`;
    })
    .join(' ');

  const area = `${line} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color.brand[600]} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={color.brand[600]} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#areaFill)" />
        <Path d={line} fill="none" stroke={color.brand[600]} strokeWidth={2.5} strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle
            key={data[i].label}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={color.paper}
            stroke={color.brand[600]}
            strokeWidth={2}
          />
        ))}
      </Svg>

      {/* 시안: mt-1.5 · px-1 · justify-between · 11px slate */}
      <View style={styles.axis}>
        {data.map((d) => (
          <Text key={d.label} style={styles.axisLabel}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: space[1],
  },
  axisLabel: { ...theme.text.micro, color: color.ink[500] },
});
