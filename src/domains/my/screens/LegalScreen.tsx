/**
 * LegalScreen — 약관·정책 목록. 시안 `screens/legal` 대응.
 * 행을 누르면 기존 Terms 뷰어를 읽기 모드로 엽니다 (동의 다시 안 받음).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import theme, { color, radius, sizing, space, text } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';

const ROWS = [
  { key: 'terms' as const, label: '서비스 이용약관' },
  { key: 'privacy' as const, label: '개인정보 처리방침' },
];

export default function LegalScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Screen>
      <AppBar onBack={() => nav.goBack()} title="약관 및 정책" />
      <View style={styles.group}>
        {ROWS.map((r, i) => (
          <Pressable
            key={r.key}
            accessibilityRole="button"
            onPress={() => nav.navigate('Onboarding', { screen: 'Terms', params: { mode: 'read', focus: r.key } })}
            style={({ pressed }) => [
              styles.row,
              i < ROWS.length - 1 && styles.divider,
              pressed && { backgroundColor: color.surface },
            ]}
          >
            <Text style={text.body}>{r.label}</Text>
            <ChevronRight size={20} strokeWidth={2} color={color.ink[300]} />
          </Pressable>
        ))}
      </View>
      <Text style={[text.caption, { color: color.ink[400] }]}>
        문의: yeoljeong2team@gmail.com
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
    overflow: 'hidden',
  },
  row: {
    minHeight: sizing.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
  },
  divider: { borderBottomWidth: theme.border.hairline, borderBottomColor: color.ink[100] },
});
