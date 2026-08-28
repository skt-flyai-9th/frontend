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
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import theme, { color, space } from '../design/theme';

/**
 * 선이 **왼쪽에서 오른쪽으로 그려집니다** — 시안 `draw-line 1s ease-in-out forwards`
 * (`strokeDasharray: 1000; strokeDashoffset: 1000` 을 0 으로 보내는 방식).
 *
 * ⚠️ `useNativeDriver` 는 **false 여야 합니다.** `strokeDashoffset` 은 transform·opacity 가
 *    아니라 SVG 속성이라 네이티브 드라이버가 다루지 못합니다. 한 번짜리 timing 이라
 *    `Animated.loop` 함정(CLAUDE.md §5-④)과는 무관합니다.
 */
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

  /*
    선 길이. 꼭짓점 사이 직선 거리의 합에 여유를 조금 얹습니다 — 베지어가 직선보다
    길어서 그대로 쓰면 끝부분이 안 그려진 채로 애니메이션이 끝납니다.
    시안은 1000 을 통으로 박았는데, 실제 길이에 맞추면 속도가 고르게 보입니다.
  */
  const length =
    points.reduce((sum, p, i) => {
      if (i === 0) return 0;
      const q = points[i - 1];
      return sum + Math.hypot(p.x - q.x, p.y - q.y);
    }, 0) * 1.15;

  return <Chart line={line} area={area} points={points} data={data} length={length} />;
}

function Chart({
  line,
  area,
  points,
  data,
  length,
}: {
  line: string;
  area: string;
  points: { x: number; y: number }[];
  data: LinePoint[];
  length: number;
}) {
  /** 0 → 1. 선이 그려지는 진행도이자 면·점이 떠오르는 진행도입니다. */
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    t.setValue(0);
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
    // 데이터가 바뀌면(플랫폼 토글) 처음부터 다시 그립니다 — 시안 `key={plat}` 과 같은 뜻입니다.
  }, [t, line]);

  const dashOffset = t.interpolate({ inputRange: [0, 1], outputRange: [length, 0] });
  /** 면과 점은 선이 절반쯤 지난 뒤 따라 올라옵니다. 선이 주인공입니다. */
  const follow = t.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0, 1] });

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color.brand[600]} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={color.brand[600]} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <AnimatedPath d={area} fill="url(#areaFill)" opacity={follow} />
        <AnimatedPath
          d={line}
          fill="none"
          stroke={color.brand[600]}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={dashOffset}
        />
        {points.map((p, i) => (
          <AnimatedCircle
            key={data[i].label}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={color.paper}
            stroke={color.brand[600]}
            strokeWidth={2}
            opacity={follow}
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
