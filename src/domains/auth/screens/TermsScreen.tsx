/** S01.1.2 약관·개인정보·저작권 안내 · 명세 1.1 terms */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Check } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Banner } from '../../../ui/Feedback';
import { Loading } from '../../../ui/Feedback';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useOnboarding } from '../../../api/queries/auth';
import { useAppState } from '../../../lib/appState';
import type { OnboardingStackParamList, RootStackParamList } from '../../../navigation/types';

export default function TermsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'Terms'>>();

  /**
   * 설정에서 "이용약관" 을 눌러 들어온 경우입니다.
   *
   * 이때 동의 체크박스를 다시 보여주면 안 됩니다.
   * 이미 동의한 사용자에게 또 동의를 받는 것도 이상하고,
   * "동의하고 시작" 을 누르면 로그인 화면으로 튕겨 나갑니다.
   * (실제로 그렇게 만들어 두어 설정에서 나가지지 않는 문제가 있었습니다)
   */
  const readOnly = route.params?.mode === 'read';
  const { data, isLoading, isError } = useOnboarding();
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const signedIn = useAppState((s) => s.signedIn);
  const storeId = useAppState((s) => s.storeId);
  const setMarketingAgreed = useAppState((s) => s.setMarketingAgreed);

  if (isLoading && !data) {
    return (
      <Screen>
        <Loading label="약관을 불러오는 중" />
      </Screen>
    );
  }

  // 서버에서 못 받아도 필수 약관은 반드시 보여줘야 합니다.
  const terms = data?.terms ?? {
    version: '기본',
    required: ['이용약관', '개인정보 처리방침'],
    optional: ['마케팅 수신 동의'],
  };
  const required = terms.required;
  const optional = terms.optional;
  const all = [...required, ...optional];

  const allRequiredOk = required.every((t) => agreed[t]);
  const allOn = all.every((t) => agreed[t]);

  const toggleAll = () => {
    const next = !allOn;
    setAgreed(Object.fromEntries(all.map((t) => [t, next])));
  };

  return (
    <Screen
      footer={
        <BottomAction>
          {readOnly ? (
            <Button label="닫기" onPress={() => nav.goBack()} />
          ) : (
            <Button
              label="동의하고 시작"
              onPress={() => {
                /*
                 * 선택 동의는 여기서만 받습니다. 회원가입(1.2)이 서버로 보내는 값이라
                 * 기기에 남겨 두고 가입할 때 함께 보냅니다 (appState 주석 참고).
                 */
                setMarketingAgreed(optional.every((t) => agreed[t]));
                if (signedIn && storeId) nav.replace('Main', { screen: 'HomeFeed' });
                else if (signedIn) nav.replace('StoreSetup', { screen: 'StoreSearch' });
                else nav.replace('Auth', { screen: 'SignIn' });
              }}
              disabled={!allRequiredOk}
            />
          )}
        </BottomAction>
      }
    >
      <AppBar onBack={readOnly ? () => nav.goBack() : undefined} />
      <Text style={text.title}>
        {readOnly ? '약관 및 정책' : '시작 전에 확인해 주세요'}
      </Text>

      <Banner
        tone="info"
        title="촬영한 영상은 편집을 위해 서버로 올라갑니다"
        description="편집이 끝나면 정해진 기간 뒤 삭제됩니다. 손님 얼굴이 찍히면 앱이 미리 알려드립니다."
      />

      {!readOnly && (
        <Pressable onPress={toggleAll} style={[styles.row, styles.allRow]}>
          <Checkbox on={allOn} />
          <Text style={text.bodyStrong}>전체 동의</Text>
        </Pressable>
      )}

      {readOnly && (
        <Text style={text.bodySmall}>
          이미 동의하신 내용입니다. 전문은 아래 항목을 눌러 확인하실 수 있습니다.
        </Text>
      )}

      <View style={{ gap: space[1] }}>
        {all.map((title) => {
          const isRequired = required.includes(title);
          return (
            <Pressable
              key={title}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!agreed[title] }}
              onPress={() => !readOnly && setAgreed((p) => ({ ...p, [title]: !p[title] }))}
              style={styles.row}
            >
              {!readOnly && <Checkbox on={!!agreed[title]} />}
              <View style={{ flex: 1 }}>
                <Text style={text.body}>
                  <Text style={{ color: isRequired ? color.brand[600] : color.ink[400] }}>
                    {isRequired ? '[필수] ' : '[선택] '}
                  </Text>
                  {title}
                </Text>
                <Text style={text.micro}>버전 {terms.version}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={[text.caption, { color: color.ink[400] }]}>보기</Text>
            <ChevronRight size={14} strokeWidth={2} color={color.ink[400]} />
          </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

function Checkbox({ on }: { on: boolean }) {
  return (
    <View style={[styles.box, on && styles.boxOn]}>
      {on ? <Check size={16} strokeWidth={3} color={color.paper} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 56,
    paddingHorizontal: space[3],
  },
  allRow: {
    backgroundColor: color.paper,
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: theme.border.thick,
    borderColor: color.ink[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: color.brand[600], borderColor: color.brand[600] },
});
