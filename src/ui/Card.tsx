/**
 * Card — 시안 `ui/reals.tsx` Card 대조 이식.
 *
 * 시안 사양: rounded-2xl(16) · border-hairline/80 · bg-panel · shadow-card
 *   시안에는 "누를 수 있는 카드" 전용 그림자가 **없습니다** — 카드 그림자는 한 종류이고,
 *   눌린다는 신호는 축소(active:scale-[0.97])로 줍니다. 그래서 raised 를 떼고
 *   pressTap 으로 바꿨습니다.
 *
 * 선택 상태는 시안 그대로 border-brand + bg-brand-tint 입니다(테두리는 1px 유지).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import theme, { color, radius, space, text } from '../design/theme';
import { pressTap } from './press';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, onPress, selected, style, padded = true }: CardProps) {
  const body = (
    <View style={[styles.card, padded && { padding: space[4] }, selected && styles.selected, style]}>
      {children}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [pressTap(pressed, 'card')]}
    >
      {body}
    </Pressable>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={text.subheading}>{children}</Text>;
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <Text style={text.bodySmall}>{children}</Text>;
}

/** 출처·수집시각 표기 (S02.2.1, S03.6.1 규칙: 카드마다 출처와 갱신 시각을 표시) */
export function SourceNote({ source, updatedAt }: { source: string; updatedAt?: string }) {
  return (
    <Text style={text.micro}>
      출처 {source}
      {updatedAt ? ` · ${updatedAt} 기준` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.paper,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    // 시안 --card-border: hairline 80%
    borderColor: color.cardBorder,
    gap: space[3],
    ...theme.elevation('card'),
  },
  selected: {
    borderColor: color.brand[600],
    backgroundColor: color.brand[50],
  },
});
