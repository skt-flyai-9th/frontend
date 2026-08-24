import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { color, space } from '../design/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  /** 하단 고정 버튼 영역 */
  footer?: React.ReactNode;
  padded?: boolean;
  background?: string;
  edges?: readonly Edge[];
  contentStyle?: ViewStyle;
}

export function Screen({
  children,
  scroll = true,
  footer,
  padded = true,
  background = color.canvas,
  edges,
  contentStyle,
}: ScreenProps) {
  const inner = padded ? { paddingHorizontal: space[5] } : null;

  /**
   * footer 가 있으면 하단 안전영역을 SafeAreaView 가 먹지 않습니다.
   * BottomAction 이 직접 처리해야 버튼 배경이 화면 끝까지 이어집니다.
   */
  const resolvedEdges: readonly Edge[] = edges ?? (footer ? ['top'] : ['top', 'bottom']);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={resolvedEdges}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, inner, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, inner, contentStyle]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingTop: space[4], paddingBottom: space[8], gap: space[4] },
});
