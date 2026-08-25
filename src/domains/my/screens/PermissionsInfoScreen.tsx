/**
 * PermissionsInfoScreen — **시안 V4 `permissions` 대조 이식** (2026-08-26).
 *
 * 시안 구조 (위에서부터)
 *   헤더    뒤로가기만 (제목 없음)
 *   ①      방패 타일 64 rounded-2xl(브랜드 틴트) + 아이콘 30 · 가운데 정렬
 *          "약관 및 접근 권한 동의" 20·bold
 *          mt-1.5 "서비스 이용을 위해 아래 약관과 접근 권한에 동의해주세요." 14·slate (폭 280 상한)
 *   ②      mt-6 gap-2.5 권한 카드 3장 — 타일 44 rounded-xl + 제목 15·semibold + 설명 13·slate
 *   ③      mt-6 동의 상자 — "전체 동의"(체크 24) + 구분선 + 항목 4개(체크 22)
 *            [필수]은 브랜드색, [선택]은 slate. 약관 항목에는 우측 chevron
 *   ④      mt-6 "동의하고 계속하기" — 필수 3개를 다 체크해야 켜집니다
 *
 * ⚠️ "거절해도 괜찮습니다" 안내를 뺐습니다 (2026-08-26 확인). 시안에 없습니다.
 *
 * ⚠️ 이 화면은 동의만 받습니다. **권한을 실제로 요청하지는 않습니다.**
 *    기능명세: "권한을 한 번에 묶어 요청하지 않는다." 실제 요청은 각 기능을 처음
 *    쓸 때 그 자리에서 합니다(카메라 → CameraScreen, 갤러리 저장 → 완성된 영상).
 *    여기서 미리 다 요청하면 명세 위반이고, 사장님도 "왜 갑자기 다 달라고 하지" 가 됩니다.
 *
 * 선택 항목(마케팅)은 회원가입이 서버로 보내는 값이라 appState 로 넘깁니다.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Mic,
  ShieldCheck,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { Button } from '../../../ui/Button';
import { pressTap } from '../../../ui/press';
import { useAppState } from '../../../lib/appState';
import theme, { color, radius, space, text } from '../../../design/theme';
import type { RootStackParamList } from '../../../navigation/types';

/** 시안 PERMS 원문 */
const PERMS = [
  { Icon: Camera, title: '카메라', desc: '숏폼 촬영을 위해 필요해요' },
  { Icon: Mic, title: '마이크', desc: '현장음과 내레이션 녹음' },
  { Icon: ImageIcon, title: '앨범', desc: '촬영본 저장 및 불러오기' },
];

/** 시안 TERMS_LIST 원문. focus 는 약관 전문에서 어느 항목을 펼칠지입니다. */
const TERMS_LIST = [
  { key: 'service', label: '서비스 이용약관 동의', required: true, focus: 'terms' as const },
  { key: 'privacy', label: '개인정보 수집·이용 동의', required: true, focus: 'privacy' as const },
  // 권한 동의만 chevron 이 없습니다 — 읽을 전문이 없습니다(시안도 이 항목만 뺍니다).
  { key: 'permission', label: '카메라·마이크·앨범 접근 권한 동의', required: true, focus: null },
  { key: 'marketing', label: '마케팅 정보 수신 동의', required: false, focus: 'read' as const },
];

type Key = (typeof TERMS_LIST)[number]['key'];

export default function PermissionsInfoScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setMarketingAgreed = useAppState((s) => s.setMarketingAgreed);
  const signedIn = useAppState((s) => s.signedIn);
  const storeId = useAppState((s) => s.storeId);

  const [agreed, setAgreed] = useState<Record<Key, boolean>>({
    service: false,
    privacy: false,
    permission: false,
    marketing: false,
  });

  const allChecked = TERMS_LIST.every((t) => agreed[t.key]);
  const requiredMet = TERMS_LIST.filter((t) => t.required).every((t) => agreed[t.key]);

  const toggleAll = () => {
    const next = !allChecked;
    setAgreed({ service: next, privacy: next, permission: next, marketing: next });
  };
  const toggle = (k: Key) => setAgreed((a) => ({ ...a, [k]: !a[k] }));

  const goNext = () => {
    // 선택 동의는 회원가입(1.2)이 서버로 보내는 값이라 기기에 남겨 둡니다.
    setMarketingAgreed(agreed.marketing);
    if (!signedIn) nav.replace('Auth', { screen: 'SignIn' });
    else if (!storeId) nav.replace('StoreSetup', { screen: 'StoreSearch' });
    else nav.replace('Main', { screen: 'HomeFeed' });
  };

  return (
    /* 시안은 하단 안전영역을 따로 잡지 않습니다 — pb-8 이 그 몫까지 합니다. */
    <Screen padded={false} scroll={false} edges={['top']} contentStyle={{ paddingTop: 0, gap: 0 }}>
      {/* 시안 헤더: 뒤로가기 하나뿐입니다 (제목 없음) */}
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
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* ① */}
        <View style={styles.intro}>
          <View style={styles.shield}>
            <ShieldCheck size={30} strokeWidth={2} color={color.brand[600]} />
          </View>
          <Text style={styles.title}>약관 및 접근 권한 동의</Text>
          <Text style={styles.lead}>서비스 이용을 위해 아래 약관과 접근 권한에 동의해주세요.</Text>
        </View>

        {/* ② */}
        <View style={styles.perms}>
          {PERMS.map(({ Icon, title, desc }) => (
            <View key={title} style={styles.permCard}>
              <View style={styles.permTile}>
                <Icon size={22} strokeWidth={2} color={color.brand[600]} />
              </View>
              <View style={styles.flexMin}>
                <Text style={styles.permTitle}>{title}</Text>
                <Text style={styles.permDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ③ */}
        <View style={styles.agreeBox}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allChecked }}
            accessibilityLabel="전체 동의"
            onPress={toggleAll}
            style={({ pressed }) => [styles.allRow, pressTap(pressed, 'button')]}
          >
            <Box checked={allChecked} large />
            <Text style={styles.allText}>전체 동의</Text>
          </Pressable>

          <View style={styles.termList}>
            {TERMS_LIST.map((t) => (
              <View key={t.key} style={styles.termRow}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: agreed[t.key] }}
                  accessibilityLabel={`${t.required ? '필수' : '선택'} ${t.label}`}
                  onPress={() => toggle(t.key)}
                  style={({ pressed }) => [styles.termTap, pressTap(pressed, 'button')]}
                >
                  <Box checked={agreed[t.key]} />
                  <Text style={styles.termLabel}>
                    <Text style={t.required ? styles.tagRequired : styles.tagOptional}>
                      [{t.required ? '필수' : '선택'}]
                    </Text>{' '}
                    {t.label}
                  </Text>
                </Pressable>

                {t.key !== 'permission' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t.label} 전문 보기`}
                    hitSlop={8}
                    onPress={() =>
                      nav.navigate('Onboarding', {
                        screen: 'Terms',
                        params: {
                          mode: 'read',
                          // 마케팅은 전문이 따로 없어 약관 목록만 엽니다.
                          focus: t.focus === 'read' ? undefined : (t.focus ?? undefined),
                        },
                      })
                    }
                  >
                    <ChevronRight size={16} strokeWidth={2} color={color.ink[500]} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ④ */}
        <View style={styles.cta}>
          <Button label="동의하고 계속하기" disabled={!requiredMet} onPress={goNext} />
        </View>
      </ScrollView>
    </Screen>
  );
}

/** 시안 PermCheckbox — 동그란 체크. 켜지면 브랜드색으로 찹니다. */
function Box({ checked, large }: { checked: boolean; large?: boolean }) {
  const size = large ? 24 : 22;
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size },
        checked ? styles.boxOn : styles.boxOff,
      ]}
    >
      {checked && <Check size={large ? 15 : 13} strokeWidth={3} color={color.paper} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // 시안: h-11 px-4 · 뒤로가기 36 (-ml-1.5)
  header: { height: 44, justifyContent: 'center', paddingHorizontal: space[4] },
  backBtn: {
    width: 36,
    height: 36,
    marginLeft: -6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안: px-6 pb-8 pt-2
  body: { flexGrow: 1, paddingHorizontal: space[6], paddingTop: space[2], paddingBottom: space[8] },

  intro: { alignItems: 'center' },
  // 시안: h-16 w-16 rounded-2xl bg-brand-tint
  shield: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: color.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  /*
   * 시안 h2 는 20 이고 `leading-*` 이 없습니다 — leading 없는 시안 텍스트는
   * 줄상자가 글자크기 × 1.5 입니다(캡처 실측). 20 → 30.
   * 토큰(26)을 쓰면 여기서 4pt 를 잃고 그 아래가 통째로 올라옵니다.
   */
  title: { ...text.title, fontSize: 20, lineHeight: 30, marginTop: space[4] },
  // 시안: leading-relaxed = 14 × 1.625 = 22.75 (토큰 21 보다 큽니다)
  lead: {
    ...text.bodySmall,
    lineHeight: 22.75,
    marginTop: 6,
    maxWidth: 280,
    textAlign: 'center',
    color: color.ink[500],
  },

  // 시안: mt-6 gap-2.5
  perms: { marginTop: space[6], gap: 10 },
  // 시안: rounded-2xl border-hairline/80 bg-panel p-3.5 gap-3.5
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['3.5'],
    padding: space['3.5'],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
  },
  permTile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexMin: { flex: 1, minWidth: 0 },
  permTitle: { ...theme.text.bodyStrong },
  permDesc: { ...text.caption, color: color.ink[500] },

  // 시안: mt-6 rounded-2xl border-hairline bg-panel p-4
  agreeBox: {
    marginTop: space[6],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
  },
  // 시안: 전체 동의 행 — 아래 구분선 pb-3.5
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingBottom: space['3.5'],
    borderBottomWidth: theme.border.hairline,
    borderBottomColor: color.ink[200],
  },
  // 시안 15px 은 leading 이 없어 1.5 가 걸립니다
  allText: {
    ...text.body,
    lineHeight: 22.5,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
  },
  // 시안: mt-3.5 gap-3.5
  termList: { marginTop: space['3.5'], gap: space['3.5'] },
  termRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  termTap: { flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 },
  termLabel: { ...text.bodySmall, flexShrink: 1, color: color.ink[800] },
  tagRequired: { color: color.brand[600] },
  tagOptional: { color: color.ink[500] },

  box: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.brand[600] },
  boxOff: {
    backgroundColor: color.surface,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
  },

  cta: { marginTop: space[6] },
});
