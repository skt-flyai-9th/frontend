/**
 * 갈림길 — 질문형과 직접 고르기.
 *
 * 왜 이 화면이 따로 있는가:
 *   포맷 피드는 "밈", "정보형" 같은 말을 이미 아는 사람을 전제로 합니다.
 *   현장조사 타깃(릴스 경험이 적은 40~60대)에게는 그 화면 자체가 벽입니다.
 *   그래서 용어 없이 질문만으로 같은 결과에 닿는 길을 나란히 둡니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { color, space, text } from '../../../design/theme';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'PathChoice'>;

export default function PathChoiceScreen({ navigation, route }: Props) {
  const { projectId } = route.params;

  return (
    <Screen>
      <AppBar onBack={() => navigation.goBack()} title="어떻게 정할까요" />

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>만드는 방식을{'\n'}어떻게 정하시겠어요?</Text>
        <Text style={text.bodySmall}>둘 중 아무거나 고르셔도 결과는 같습니다.</Text>
      </View>

      <Card onPress={() => navigation.navigate('Quiz', { projectId })}>
        <View style={styles.head}>
          <Text style={text.subheading}>몇 가지 물어봐 주세요</Text>
          <Badge label="쉬움" tone="brand" />
        </View>
        <Text style={text.bodySmall}>
          어려운 말은 하나도 안 나옵니다. 5~6가지만 답하시면 가장 쉬운 방법을 골라 드립니다.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={[text.caption, { color: color.brand[600] }]}>질문으로 찾기</Text>
            <ChevronRight size={14} strokeWidth={2} color={color.brand[600]} />
          </View>
      </Card>

      <Card onPress={() => navigation.navigate('FormatFeed', { projectId })}>
        <Text style={text.subheading}>제가 직접 고를게요</Text>
        <Text style={text.bodySmall}>
          여러 방식을 둘러보고 마음에 드는 걸 고릅니다. 촬영 시간과 난이도를 함께 보여드립니다.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={[text.caption, { color: color.brand[600] }]}>목록 보기</Text>
            <ChevronRight size={14} strokeWidth={2} color={color.brand[600]} />
          </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
