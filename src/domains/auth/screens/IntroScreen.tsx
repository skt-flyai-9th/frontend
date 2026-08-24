/** S01.1.1 스플래시 및 서비스 가치 안내 · 명세 1.1 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { StepBar } from '../../../ui/AppBar';
import { Loading } from '../../../ui/Feedback';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useOnboarding } from '../../../api/queries/auth';
import type { OnboardingStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Intro'>;

export default function IntroScreen({ navigation }: Props) {
  const { data, isLoading, isError } = useOnboarding();
  const [index, setIndex] = useState(0);

  const steps = data?.onboardingSteps ?? [];
  const last = index >= steps.length - 1;
  const current = steps[index];

  // 온보딩 문구는 안내일 뿐입니다. 못 받아도 앱을 막지 않고 다음으로 보냅니다.
  if (isError || (!isLoading && steps.length === 0)) {
    return (
      <Screen
        scroll={false}
        background={color.paper}
        footer={
          <BottomAction>
            <Button label="시작하기" onPress={() => navigation.replace('Terms')} />
          </BottomAction>
        }
      >
        <View style={styles.wrap}>
          <View style={styles.brandRow}>
            <Text style={styles.wordmark}>Reals</Text>
            <Text style={text.caption}>사장님의 숏폼</Text>
          </View>
          <Text style={text.display}>가게 홍보 영상을{'\n'}대신 만들어 드립니다</Text>
          <Text style={[text.body, { color: color.ink[700] }]}>
            찍을 것부터 순서대로 알려드리고, 편집은 자동으로 합니다.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading || !current) {
    return (
      <Screen scroll={false} background={color.paper}>
        <Loading label="준비하는 중" />
      </Screen>
    );
  }

  return (
    <Screen
      scroll={false}
      background={color.paper}
      footer={
        <BottomAction>
          <Button
            label={last ? '시작하기' : '다음'}
            onPress={() => (last ? navigation.replace('Terms') : setIndex(index + 1))}
          />
          {!last && (
            <Button
              label="건너뛰기"
              variant="quiet"
              size="small"
              onPress={() => navigation.replace('Terms')}
            />
          )}
        </BottomAction>
      }
    >
      <View style={styles.wrap}>
        <StepBar current={index + 1} total={steps.length} />

        <View style={styles.brandRow}>
          <Text style={styles.wordmark}>Reals</Text>
          <Text style={text.caption}>사장님의 숏폼</Text>
        </View>

        <View style={styles.mark}>
          <Text style={styles.markNum}>{current.order}</Text>
        </View>

        <Text style={text.display}>{current.title}</Text>
        <Text style={[text.body, { color: color.ink[700] }]}>{current.description}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: space[5], gap: space[5] },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  wordmark: { ...text.heading, color: color.brand[600], letterSpacing: -1 },
  mark: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: color.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space[6],
  },
  markNum: { ...text.display, color: color.brand[600] },
});
