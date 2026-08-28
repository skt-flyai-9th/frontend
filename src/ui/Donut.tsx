/**
 * Donut — 시안 `매장인사이트.html` 의 `Donut` · `DonutLegend` 이식.
 *
 * 소비층 구성(연령대·성별)을 비율 고리로 보여 줍니다.
 *
 * 시안 실측값
 *   뷰박스   100 x 100 · r 40 · strokeWidth 17
 *   시작점   **12시** — SVG 원은 3시에서 시작하므로 -90° 돌립니다
 *   방향     시계방향
 *   가운데   가장 큰 조각의 이름 (예: "20대")
 *   범례     점 8 + 12px 글자, 세로 나열
 *
 * 애니메이션 — 시안과 같은 리듬입니다.
 *   `DUR 1000ms` · `ease = x<0.5 ? 4x³ : 1-(-2x+2)³/2` (cubic in-out)
 *   고리가 12시에서 시계방향으로 **한 바퀴 쓸며** 나타납니다. 조각 경계는
 *   쓸린 길이가 그 조각에 닿을 때부터 보입니다 — 여러 조각이 한꺼번에
 *   커지는 게 아니라 **차례로** 채워집니다.
 *
 * ⚠️ 진행도를 `Animated` 가 아니라 **state 로 굴립니다.**
 *    조각마다 `strokeDasharray` 를 매 프레임 다시 계산해야 하는데, 그 값은
 *    앞 조각들이 얼마나 쓸렸는지에 따라 달라집니다. Animated 보간 하나로는
 *    표현할 수 없어 시안과 같은 방식(rAF + setState)을 씁니다. 진입할 때
 *    한 번, 1초짜리라 부담이 없습니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import theme, { color } from '../design/theme';

export interface DonutSeg {
  label: string;
  /** 비율. 합이 100 이 아니어도 됩니다 — 합으로 나눠 씁니다. */
  value: number;
  color: string;
}

const R = 40;
const CIRC = 2 * Math.PI * R;
const DURATION = 1000;

/** 시안 `x < 0.5 ? 4x³ : 1 - (-2x+2)³/2` */
const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

export function Donut({ segs, size = 80 }: { segs: DonutSeg[]; size?: number }) {
  const [t, setT] = useState(0);
  /** 프레임 루프를 멈출 때 쓰는 손잡이. 화면을 떠나면 바로 끊습니다. */
  const raf = useRef<number | null>(null);

  /** 조각 내용을 문자열로. 참조가 아니라 **값**으로 견주기 위한 것입니다. */
  const sig = segs.map((x) => `${x.label}:${x.value}`).join('|');

  useEffect(() => {
    setT(0);
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / DURATION);
      setT(easeInOutCubic(p));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
    /*
      🔴 **시안은 여기 의존성이 빈 배열입니다** — 도넛은 화면에 들어올 때 한 번만
         돌고, 탭을 바꿔도 다시 돌지 않습니다. 소비층 비율은 유튜브·인스타와
         **무관한 값**이라 플랫폼을 바꿨다고 다시 쓸 이유가 없습니다.
         (꺾은선과 숫자는 반대로 `key={plat}` 이 걸려 탭마다 다시 그려집니다.)

      ⚠️ 그렇다고 `[]` 로 두면 값이 늦게 도착했을 때(3.5 응답이 뒤에 오는 경우)
         이미 끝난 애니메이션 뒤에 조각만 툭 나타납니다. 그래서 **내용이 실제로
         바뀔 때만** 다시 돌도록 값으로 만든 문자열을 씁니다. 탭 전환은 내용이
         그대로라 다시 돌지 않습니다 — 시안과 같은 결과입니다.
    */
  }, [sig]);

  const total = segs.reduce((a, s) => a + s.value, 0) || 100;
  /** 지금까지 쓸린 길이. 1 바퀴가 CIRC 입니다. */
  const swept = CIRC * t;

  let acc = 0;
  const arcs = segs.map((s) => {
    const full = (CIRC * s.value) / total;
    // 이 조각이 실제로 보이는 길이 — 앞 조각들을 다 쓸고 남은 만큼입니다.
    const len = Math.max(0, Math.min(full, swept - acc));
    const el =
      len <= 0.01 ? null : (
        <Circle
          key={s.label}
          cx={50}
          cy={50}
          r={R}
          fill="none"
          stroke={s.color}
          strokeWidth={17}
          strokeDasharray={`${len} ${CIRC - len}`}
          strokeDashoffset={-acc}
        />
      );
    acc += full;
    return el;
  });

  /** 가운데 글자 — 가장 큰 조각입니다(시안 "20대" · "여성"). */
  const top = segs.reduce((a, s) => (s.value > a.value ? s : a), segs[0]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* SVG 원은 3시에서 시작합니다. **12시부터** 돌리려고 -90° 회전시킵니다. */}
        <G rotation={-90} origin="50, 50">
          {/* 아직 안 쓸린 자리 — 비어 보이지 않게 옅은 고리를 깔아 둡니다. */}
          <Circle cx={50} cy={50} r={R} fill="none" stroke={color.ink[100]} strokeWidth={17} />
          {arcs}
        </G>
      </Svg>
      {top ? (
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.centerText} numberOfLines={1}>
            {top.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** 시안 `DonutLegend` — 점 8 + 12px 글자, 세로 나열. */
export function DonutLegend({ segs }: { segs: DonutSeg[] }) {
  return (
    <View style={styles.legend}>
      {segs.map((s) => (
        <View key={s.label} style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: s.color }]} />
          <Text style={styles.legendText} numberOfLines={1}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  centerText: {
    ...theme.text.micro,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[900],
  },
  legend: { flex: 1, minWidth: 0, gap: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendText: { ...theme.text.label, flex: 1, minWidth: 0, color: color.ink[700] },
});
