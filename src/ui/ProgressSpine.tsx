import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import theme, { color, radius, sizing, space, text } from '../design/theme';

/**
 * 사릴스의 시그니처 요소 — 태스크 스파인.
 *
 * 이 앱의 핵심 주장은 "영상 한 편이 아니라, 짧은 촬영 여러 개"입니다.
 * 그 구조를 계속 눈에 보이게 만드는 세로 레일이 스파인입니다.
 * 촬영 흐름 전체에서 같은 형태로 반복 등장합니다.
 */

/**
 * 촬영 진행 상태.
 *
 * 명세 8.2 ENUM(DONE / IN_PROGRESS / NOT_STARTED / RETAKE_NEEDED)과 대응합니다.
 * 건너뛰기(SKIPPED)는 MVP 스코프에서 제외되어 없습니다.
 */
export type SpineStatus = 'done' | 'current' | 'todo' | 'retake';

export interface SpineItem {
  id: string;
  title: string;
  meta?: string;
  status: SpineStatus;
  required?: boolean;
}

const NODE = {
  done: { bg: color.done[500], fg: color.paper, glyph: 'check' },
  current: { bg: color.brand[600], fg: color.paper, glyph: 'dot' },
  todo: { bg: color.ink[100], fg: color.ink[400], glyph: '' },
  // 찍긴 했지만 AI 가 다시 찍기를 권한 상태. 그래도 편집은 진행됩니다.
  retake: { bg: color.warn[500], fg: color.paper, glyph: '!' },
} as const;

export function ProgressSpine({
  items,
  onPressItem,
}: {
  items: SpineItem[];
  onPressItem?: (item: SpineItem) => void;
}) {
  return (
    <View>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const node = NODE[item.status];
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${index + 1}번째 ${item.title}, ${statusLabel(item.status)}`}
            onPress={onPressItem ? () => onPressItem(item) : undefined}
            style={({ pressed }) => [styles.row, pressed && { opacity: theme.opacity.pressed }]}
          >
            <View style={styles.rail}>
              <View style={[styles.node, { backgroundColor: node.bg }]}>
                {/* 가이드라인 §4: 체크는 라인 아이콘, 현재 위치는 도형(점) */}
                {node.glyph === 'check' ? (
                  <Check size={16} strokeWidth={2.5} color={node.fg} />
                ) : node.glyph === 'dot' ? (
                  <View style={[styles.dot, { backgroundColor: node.fg }]} />
                ) : node.glyph ? (
                  <Text style={[styles.glyph, { color: node.fg }]}>{node.glyph}</Text>
                ) : (
                  <Text style={[styles.glyph, { color: node.fg }]}>{index + 1}</Text>
                )}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: item.status === 'done' ? color.done[500] : color.ink[100] },
                  ]}
                />
              )}
            </View>

            <View style={[styles.body, isLast && { paddingBottom: 0 }]}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    text.bodyStrong,
                    item.status === 'retake' && { color: color.warn[500] },
                  ]}
                >
                  {item.title}
                </Text>
                {item.required === false && <Text style={text.micro}>선택</Text>}
              </View>
              {item.meta ? <Text style={text.caption}>{item.meta}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function statusLabel(s: SpineStatus) {
  return {
    done: '완료',
    current: '지금 할 차례',
    todo: '아직 안 함',
    retake: '찍었지만 다시 찍는 게 좋음',
  }[s];
}

/** 카메라 화면 상단에 얹는 가로형 스파인 */
export function SpineStrip({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.strip} accessibilityLabel={`${total}개 중 ${current}번째 촬영`}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stripSeg,
            {
              backgroundColor:
                i < current - 1 ? color.done[500] : i === current - 1 ? color.brand[500] : 'rgba(255,255,255,0.32)',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[4] },
  rail: { alignItems: 'center', width: sizing.spineNode },
  node: {
    width: sizing.spineNode,
    height: sizing.spineNode,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  glyph: { fontSize: theme.font.size.caption, fontFamily: theme.text.bodyStrong.fontFamily, lineHeight: 18 },
  line: { width: sizing.spineRail, flex: 1, marginVertical: 2, borderRadius: 2 },
  body: { flex: 1, paddingBottom: space[6], gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  strip: { flexDirection: 'row', gap: 4 },
  stripSeg: { flex: 1, height: 4, borderRadius: 2 },
});
