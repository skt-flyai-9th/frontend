/**
 * FaqScreen — 프로토타입 `08_자주묻는질문.png`. API 불필요(정적).
 *
 * 답변은 40~60대 사장님 기준으로 씁니다 — 어려운 용어 금지.
 * "렌더링" 대신 "영상 만드는 중" 같은 말을 씁니다 (인수인계 §7).
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import theme, { color, space, radius, text, sizing } from '../../../design/theme';

const FAQS: { q: string; a: string }[] = [
  {
    q: '영상을 만드는 데 얼마나 걸리나요?',
    a: '촬영은 보통 10~20분이면 됩니다. 촬영이 끝나면 AI가 영상을 만드는 데 몇 분 정도 걸려요. 그동안 앱을 닫아도 됩니다.',
  },
  {
    q: '얼굴을 꼭 내보내야 하나요?',
    a: '아니요. 처음에 "얼굴 안 나오게"를 고르면 음식과 가게만 나오는 방법을 추천해 드립니다.',
  },
  {
    q: '만들다가 그만두면 처음부터 다시 해야 하나요?',
    a: '아니요. 하던 데까지 자동으로 저장됩니다. 마이 화면의 "만들던 영상"에서 이어서 할 수 있어요.',
  },
  {
    q: '홍보 목적을 잘못 골랐어요. 바꿀 수 있나요?',
    a: '만든 뒤에는 목적을 바꿀 수 없습니다. 새로 만들기를 눌러 다시 시작해 주세요. 이미 찍은 영상은 갤러리에 남아 있습니다.',
  },
  {
    q: '영상에 음악은 어떻게 넣나요?',
    a: '완성본을 인스타그램이나 유튜브에 올릴 때, 그 앱 안에서 유행하는 음악을 고르는 방법을 알려드립니다. 저작권 걱정 없이 쓰는 방법이에요.',
  },
  {
    q: '올린 영상 반응은 어디서 보나요?',
    a: '마이 → 반응 보기에서 조회수와 좋아요를 볼 수 있습니다. 아직 숫자가 없으면 "없음"으로 표시됩니다.',
  },
];

export default function FaqScreen() {
  const nav = useNavigation();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen>
      <AppBar onBack={() => nav.goBack()} title="자주 묻는 질문" />
      <View style={styles.list}>
        {FAQS.map((f, i) => {
          const on = open === i;
          return (
            <View key={i} style={styles.item}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                onPress={() => setOpen(on ? null : i)}
                style={({ pressed }) => [styles.q, // canvas 는 흰색이라 누름이 안 보입니다. 섹션용 surface 를 씁니다.
        pressed && { backgroundColor: color.surface }]}
              >
                <Text style={[text.body, { flex: 1 }]}>{f.q}</Text>
                {on ? (
                  <ChevronUp size={20} strokeWidth={2} color={color.ink[500]} />
                ) : (
                  <ChevronDown size={20} strokeWidth={2} color={color.ink[500]} />
                )}
              </Pressable>
              {on && (
                <View style={styles.a}>
                  <Text style={[text.body, { color: color.ink[700] }]}>{f.a}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: color.paper,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    overflow: 'hidden',
    ...theme.elevation('card'),
  },
  item: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.ink[200] },
  q: {
    minHeight: sizing.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  a: { paddingHorizontal: space[4], paddingBottom: space[4] },
});
