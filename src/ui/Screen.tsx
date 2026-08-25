/**
 * Screen — 화면 공통 껍데기.
 *
 * ⚠️ 앱바를 콘텐츠 패딩 밖으로 꺼냅니다 (2026-08-25).
 *
 * 시안의 TopHeader 는 `absolute inset-x-0 top-0` 입니다 — **화면 폭을 꽉 채우고
 * 스크롤해도 제자리**입니다. 그런데 우리 화면 38개가 `<Screen><AppBar/>…</Screen>`
 * 처럼 앱바를 스크롤 콘텐츠의 첫 자식으로 두고 있었습니다. 그러면
 *   · 좌우 20px 패딩이 앱바에도 걸려 하단 구분선이 화면 끝까지 닿지 않고
 *   · 스크롤하면 앱바가 같이 밀려 올라갑니다.
 *
 * 38개 화면을 각각 고치는 대신 여기서 한 번에 처리합니다. 첫 자식이 AppBar 면
 * 스크롤 영역 **바깥 위쪽**에 따로 그립니다. 화면 코드는 하나도 바꿀 필요가 없고,
 * 앱바를 첫 자식으로 두지 않은 화면은 지금 동작 그대로입니다.
 */
import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { color, space } from '../design/theme';
import { AppBar } from './AppBar';

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

  // 첫 자식이 앱바면 떼어내 스크롤 밖에 고정합니다.
  const kids = React.Children.toArray(children);
  const first = kids[0];
  const hasBar = React.isValidElement(first) && first.type === AppBar;
  const bar = hasBar ? first : null;
  const body = hasBar ? kids.slice(1) : kids;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={resolvedEdges}>
      {bar}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, inner, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.flex, inner, contentStyle]}>{body}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingTop: space[4], paddingBottom: space[10], gap: space[4] },
});
