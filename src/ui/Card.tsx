import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import theme, { color, radius, space, text } from '../design/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, onPress, selected, style, padded = true }: CardProps) {
  const body = (
    <View
      style={[
        styles.card,
        // 가이드라인 §5.4: 누를 수 있는 카드는 한 단계 진한 그림자로 "눌러도 된다"를 알립니다.
        onPress ? styles.raised : null,
        padded && { padding: space[4] },
        selected && styles.selected,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: theme.opacity.pressed }]}
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
    borderColor: color.ink[200],
    gap: space[3],
    ...theme.elevation('card'),
  },
  raised: theme.elevation('raised'),
  selected: {
    borderWidth: theme.border.thick,
    borderColor: color.brand[600],
    backgroundColor: color.brand[50],
  },
});
