/**
 * FeasibilityBadges — 시안 components/ui/FeasibilityBadges.jsx 이식.
 * 캡슐: radius pill · padding 4/10 · 글자 11·600 · 아이콘 13
 * onDark: 미디어 위(반투명 ink65+흰글자) / 밝은 바탕(surface+slate)
 * ⚠️ 유튜브 플레이어 "위"에는 올리지 않습니다(약관) — 상세 화면에선 플레이어 아래 행으로.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Clock, EyeOff, Mic, User } from 'lucide-react-native';
import { color, radius, space } from '../design/theme';

const ICONS = { clock: Clock, user: User, eyeOff: EyeOff, mic: Mic } as const;
export type FeasibilityTag = { icon: keyof typeof ICONS; label: string };

export function FeasibilityBadges({ tags, onDark = false }: { tags: FeasibilityTag[]; onDark?: boolean }) {
  return (
    <View style={styles.row}>
      {tags.map((t) => {
        const Icon = ICONS[t.icon];
        return (
          <View key={t.label} style={[styles.pill, onDark ? styles.dark : styles.light]}>
            <Icon size={13} strokeWidth={2} color={onDark ? color.paper : color.ink[500]} />
            <Text style={[styles.label, { color: onDark ? color.paper : color.ink[500] }]}>{t.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  dark: { backgroundColor: 'rgba(15,23,42,0.65)' },
  light: { backgroundColor: color.surface },
  label: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
});
