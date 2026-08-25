/**
 * FaqScreen — **시안 V4 `24_faq` 대조 이식**.
 *
 * 시안 사양 (`FaqScreen` 원문 수치 그대로)
 *   배경     bg-surface
 *   헤더     px-4 pb-3 gap-2 · 뒤로가기 36 + 타이틀 18·bold **좌측 정렬** · 탭바 없음
 *   목록     px-4 · 카드 사이 gap-2.5(10)
 *   카드     rounded-2xl(16) · border-hairline/80 · bg-white · shadow-card
 *   질문 행  px-4 py-4 · 15·semibold · 우측 chevron-down 18 (#94a3b8)
 *   펼침     chevron 180° 회전 · 본문 px-4 pb-4 · 14 · leading-relaxed · #475569
 *   동작     **한 번에 하나만 열립니다** (open === i, 다시 누르면 닫힘)
 *
 * ⚠️ 이전 구현과 달라진 점
 *   · 하단 탭바가 보이던 것 → 이 화면은 탭 밖(Root)이라 탭바가 없습니다
 *   · 카드가 한 덩어리로 붙어 있던 것 → 카드마다 떨어뜨리고 모서리를 둥글게
 *   · 여러 개가 동시에 열리던 것 → 하나만 열립니다
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../../ui/Screen';
import { pressTap } from '../../../ui/press';
import theme, { color, space, radius, text } from '../../../design/theme';

/** 시안 FAQS 원문 그대로입니다. */
const FAQS: { q: string; a: string }[] = [
  {
    q: '영상은 어떻게 만들어지나요?',
    a: '사장님이 입력하신 매장 정보와 촬영한 컷을 바탕으로 AI가 자동으로 편집·자막·음원을 입혀 숏폼을 완성해요. 촬영만 하면 나머지는 Reals.가 처리합니다.',
  },
  {
    q: '촬영 장비가 따로 필요한가요?',
    a: '스마트폰 하나면 충분해요. 앱이 안내하는 가이드에 따라 촬영하면 되고, 삼각대가 있으면 더 안정적인 촬영이 가능합니다.',
  },
  {
    q: '만든 영상은 어디에 올릴 수 있나요?',
    a: '인스타그램 릴스, 유튜브 쇼츠 등 원하는 채널에 자유롭게 올릴 수 있어요. 내보내기 화면에서 제목과 게시글 내용도 함께 제공됩니다.',
  },
  {
    q: '무료로 몇 개까지 만들 수 있나요?',
    a: 'Free 플랜은 매달 3개까지 제작할 수 있어요. 더 많은 영상과 고급 기능이 필요하면 Pro 플랜으로 업그레이드하세요.',
  },
  {
    q: '음원 저작권은 괜찮나요?',
    a: '각 플랫폼의 공식 음원 정보를 함께 제공해 드려요. 안내된 음원을 사용하면 저작권 걱정 없이 업로드할 수 있습니다.',
  },
];

export default function FaqScreen() {
  const nav = useNavigation();
  /** 시안: 처음에 첫 항목이 열려 있고, 한 번에 하나만 열립니다. */
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen
      background={color.surface}
      padded={false}
      /**
       * 시안은 화면 맨 위에서 헤더까지 **62px** 입니다(= 상태바 54 + 8).
       * Screen 의 기본값(상단 16 · 자식 간격 16)을 그대로 쓰면 안전영역 위에
       * 16 이 더해져 헤더가 8px 내려가고, 헤더와 카드 사이도 시안의 12 보다 벌어집니다.
       * 이 화면은 간격을 직접 정하므로 기본값을 끕니다.
       */
      contentStyle={{ paddingTop: space[2], gap: 0 }}
    >
      {/* 시안: 뒤로가기 바로 옆에 타이틀 (중앙 정렬 아님) */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={6}
          onPress={() => nav.goBack()}
          style={({ pressed }) => [styles.backBtn, pressTap(pressed, 'icon')]}
        >
          <ChevronLeft size={24} strokeWidth={2} color={color.ink[900]} />
        </Pressable>
        <Text style={text.heading}>자주 묻는 질문</Text>
      </View>

      <View style={styles.list}>
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <View key={item.q} style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                // 열려 있으면 닫고, 아니면 이것만 엽니다 (나머지는 자동으로 접힘).
                onPress={() => setOpen(isOpen ? null : i)}
                style={({ pressed }) => [styles.qRow, pressed && { backgroundColor: color.surface }]}
              >
                <Text style={styles.q}>{item.q}</Text>
                {/* 시안: 펼치면 180° 회전 */}
                <View style={isOpen ? styles.chevronOpen : undefined}>
                  <ChevronDown size={18} strokeWidth={2} color={color.ink[400]} />
                </View>
              </Pressable>

              {isOpen ? (
                <View style={styles.aWrap}>
                  <Text style={styles.a}>{item.a}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 시안: px-4 pb-3 · gap-2
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingBottom: space[3],
  },
  /**
   * ⚠️ 여기에는 `marginLeft: -6` 이 없습니다. 시안 헤더는 **세 종류**입니다
   *    (시안 원문의 `aria-label="뒤로가기"` 를 전수 조사한 결과입니다).
   *
   *   ① 뒤로가기가 홀로 있는 h-11 헤더  → `-ml-1.5`(-6) **있음**
   *      TopHeader(제목 가운데) · 07_권한 안내(제목 없음) · 20_내 숏폼(제목이 절대 중앙)
   *   ② 제목이 뒤로가기 바로 옆에 좌측 정렬 → 음수 여백 **없음**
   *      17·21·22·23·24·27·28
   *   ③ 어두운 오버레이 헤더            → 없음 (13·14·15)
   *
   * 가르는 건 "자체 헤더냐" 가 아니라 **버튼이 홀로 있느냐**입니다.
   * 홀로 있으면 광학 정렬로 6 을 당기고, 옆에 제목이 붙으면 당기지 않습니다.
   * `ui/AppBar` 의 -6 은 ① 이라 맞습니다 — 일관성을 이유로 지우지 마세요.
   */
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 시안: px-4 · 카드 사이 gap-2.5(10)
  list: { paddingHorizontal: space[4], paddingBottom: space[10], gap: 10 },

  card: {
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    overflow: 'hidden',
    ...theme.elevation('card'),
  },

  // 시안: px-4 py-4 · 질문과 chevron 사이 gap-3
  qRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[4],
  },
  /*
   * 시안 질문은 `text-[15px] font-semibold` 뿐 — **줄높이를 지정하지 않습니다.**
   * 그래서 폰트 고유 metrics 의 normal(≈1.63)이 걸려 줄상자가 24.5 가 됩니다.
   * 우리 `bodyStrong` 토큰은 22 라 카드가 매번 2.5 씩 짧아지고, 다섯 번째 카드에서
   * 9pt 어긋납니다(캡처 실측). 토큰은 다른 38개 화면이 함께 쓰므로
   * 이 화면에서만 시안이 실제로 쓰는 값으로 덮습니다.
   */
  q: { ...theme.text.bodyStrong, flex: 1, lineHeight: 24.5 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },

  // 시안: px-4 pb-4 · 14 · leading-relaxed · #475569
  aWrap: { paddingHorizontal: space[4], paddingBottom: space[4] },
  a: { ...theme.text.bodySmall, lineHeight: 23, color: '#475569' },
});
