/**
 * TermsScreen — **시안 V4 `27_terms` / `28_privacy` (LegalScreen) 대조 이식** (2026-08-26).
 *
 * 시안과 마찬가지로 **한 컴포넌트가 두 문서를 그립니다**(시안 `LegalScreen({variant})`).
 * 별도로 있던 `my/screens/LegalScreen.tsx` 는 같은 문구가 두 벌이 되어 지웠습니다 —
 * 법무 확정본으로 갈아끼울 때 한쪽을 빠뜨리는 게 이 화면에서 가장 위험한 실수입니다.
 *
 * 🔴🔴🔴 아래 `LEGAL_SECTIONS` 의 약관 문구는 **시안 목업이며 실제 약관이 아닙니다.** 🔴🔴🔴
 *
 *   배포 전 반드시 법무 확정본으로 교체해야 합니다. 이 화면은 사장님이 동의하는
 *   법적 문서를 보여주는 자리라, 목업이 그대로 나가면 효력 없는 약관을 보여준 게 됩니다.
 *   명세 1.1 `terms` 는 **제목 목록만**(version·required·optional) 주고 전문이 없어서,
 *   지금은 서버에서 받아올 방법이 없습니다. BE 에 "약관 전문 API 또는 확정본" 요청 중입니다.
 *   전문이 내려오기 시작하면 이 상수를 지우고 그 값을 쓰면 됩니다 — 화면 구조는 그대로입니다.
 *
 * 시안 구조 (LegalScreen({ variant }) 하나로 두 화면을 그립니다)
 *   bg-surface / 헤더 좌측 정렬 pt-[62px] pb-3 px-4 · 뒤로 36 · 제목 18 bold
 *   본문 px-4 pb-10 · 맨 위 "시행일 …" 12 · #94A3B8 · mb-4
 *   조항 gap-5 — 헤딩 15 bold / 본문 mt-1.5 · 14 · leading-relaxed · #475569
 *
 * 시안 캡처 실측(27_terms.png · pt): 헤더 바닥 110 · 시행일 글자 113.5 · 첫 헤딩 148
 *   본문 줄 간격 22.75(leading-relaxed) · 조항 사이 20
 *
 * ⚠️ 이 화면은 **읽기 전용**입니다 (2026-08-26).
 *    예전에는 동의까지 여기서 받았지만, 시안 V4 는 가입 직후 `07_permissions`
 *    (PermissionsInfoScreen)에서 약관·권한 동의를 한 번에 받습니다. 같은 동의를
 *    두 곳에서 받지 않도록 여기서는 전문만 보여줍니다.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { pressTap } from '../../../ui/press';
import { color, radius, space, text } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';

/** 🔴 시안 목업 문구입니다. 실제 약관이 아닙니다 — 파일 머리말 참고. */
const LEGAL_SECTIONS = {
  terms: {
    title: '서비스 이용약관',
    sections: [
      {
        heading: '제1조 (목적)',
        body: "본 약관은 Reals.(이하 '회사')가 제공하는 매장 숏폼 제작 서비스(이하 '서비스')의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.",
      },
      {
        heading: '제2조 (정의)',
        body: "'이용자'란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 매장 사업자를 말합니다. '콘텐츠'란 이용자가 서비스를 통해 제작한 영상 및 관련 자료를 의미합니다.",
      },
      {
        heading: '제3조 (서비스의 제공)',
        body: '회사는 AI 기반 숏폼 추천, 촬영 가이드, 자동 편집, 내보내기 기능을 제공합니다. 회사는 서비스의 품질 향상을 위해 기능을 추가하거나 변경할 수 있습니다.',
      },
      {
        heading: '제4조 (이용자의 의무)',
        body: '이용자는 서비스를 통해 제작한 콘텐츠가 제3자의 권리를 침해하지 않도록 하여야 하며, 관련 법령과 본 약관을 준수하여야 합니다.',
      },
      {
        heading: '제5조 (콘텐츠의 권리)',
        body: '이용자가 제작한 콘텐츠의 저작권은 이용자에게 귀속됩니다. 회사는 서비스 홍보 목적으로 이용자의 사전 동의를 받아 콘텐츠를 활용할 수 있습니다.',
      },
    ],
  },
  privacy: {
    title: '개인정보 처리방침',
    sections: [
      {
        heading: '1. 수집하는 개인정보 항목',
        body: '회사는 회원가입 및 서비스 제공을 위해 아이디, 비밀번호, 이메일 주소, 휴대폰 번호, 매장 정보(매장명·업종·주소)를 수집합니다.',
      },
      {
        heading: '2. 개인정보의 이용 목적',
        body: '수집한 개인정보는 회원 관리, 매장 맞춤형 숏폼 추천, 서비스 제공 및 고객 지원, 서비스 개선을 위해 이용됩니다.',
      },
      {
        heading: '3. 개인정보의 보유 및 이용 기간',
        body: '이용자의 개인정보는 회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.',
      },
      {
        heading: '4. 개인정보의 제3자 제공',
        body: '회사는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 다만 법령에 근거가 있는 경우는 예외로 합니다.',
      },
      {
        heading: '5. 이용자의 권리',
        body: '이용자는 언제든지 자신의 개인정보를 조회·수정하거나 삭제를 요청할 수 있으며, 개인정보 처리에 대한 동의를 철회할 수 있습니다.',
      },
    ],
  },
} as const;

/** 🔴 시안 목업. 확정본 시행일로 바꿔야 합니다. */
const EFFECTIVE_DATE = '시행일 2026년 1월 1일';

export default function TermsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  /*
   * 시안 LegalScreen 의 variant 자리입니다. 이 컴포넌트는 두 경로에 걸려 있습니다.
   *   Onboarding/Terms  — 설정·권한 화면의 "서비스 이용약관"
   *   Root/Legal        — 설정의 "개인정보 처리방침" (initialParams 로 focus 를 줍니다)
   */
  const route = useRoute<RouteProp<RootStackParamList, 'Legal'>>();

  /**
   * 시안 LegalScreen 의 variant 에 해당합니다.
   * 지정이 없으면 이용약관을 보여줍니다(PermissionsInfo 의 마케팅 항목처럼
   * 전문이 따로 없는 곳에서 focus 없이 들어옵니다).
   */
  const doc = LEGAL_SECTIONS[route.params?.focus === 'privacy' ? 'privacy' : 'terms'];

  /*
   * 로그아웃 상태에서는 이 화면이 앱의 첫 화면이라(RootNavigator initial='Onboarding')
   * 돌아갈 곳이 없습니다. 그때 갇히지 않도록 로그인으로 보냅니다.
   * ⚠️ 원래는 initial 이 'Auth' 여야 맞습니다 — 시안 V4 는 splash 다음이 02_auth 입니다.
   *    RootNavigator 는 이 담당의 파일이 아니라 인수인계에 적었습니다.
   */
  const goBack = () =>
    nav.canGoBack() ? nav.goBack() : nav.replace('Auth', { screen: 'SignIn' });

  return (
    <Screen scroll={false} padded={false} background={color.surface}>
      {/* 시안: px-4 pb-3 pt-[62px] — 62 중 54 는 상태바(SafeAreaView)가 먹습니다 */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={6}
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, pressTap(pressed, 'icon')]}
        >
          <ChevronLeft size={24} strokeWidth={2} color={color.ink[900]} />
        </Pressable>
        <Text style={text.heading}>{doc.title}</Text>
      </View>

      {/* 시안: px-4 pb-10 */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 시안: mb-4 · 12 · #94A3B8 */}
        <Text style={styles.effective}>{EFFECTIVE_DATE}</Text>

        {/* 시안: flex-col gap-5 */}
        <View style={styles.sections}>
          {doc.sections.map((s) => (
            <View key={s.heading}>
              <Text style={styles.heading}>{s.heading}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // 시안: px-4 pb-3 pt-[62px] · gap-2 · 뒤로가기 36 (음수 여백 없음 — FaqScreen 의 헤더 규칙 주석 참고)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[2],
    paddingBottom: space[3],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: space[4], paddingBottom: space[10] },

  // 시안: text-[12px] text-[#94A3B8] mb-4 (leading-normal 18)
  effective: { ...text.micro, fontSize: 12, lineHeight: 18, color: color.ink[400], marginBottom: space[4] },

  sections: { gap: space[5] },
  // 시안: 15 bold. 우리 15 계열 중 가장 굵은 것이 bodyStrong(semibold)입니다.
  heading: text.bodyStrong,
  /*
   * 시안: mt-1.5 · 14 · leading-relaxed · #475569
   * leading-relaxed = 14 × 1.625 = 22.75. 실측 줄 간격도 22.75 라 토큰(21) 대신 그 값을 씁니다.
   * #475569 는 토큰에 없어 가장 가까운 ink[700](#334155)을 씁니다.
   */
  body: { ...text.bodySmall, lineHeight: 22.75, color: color.ink[700], marginTop: space[1.5] },
});
