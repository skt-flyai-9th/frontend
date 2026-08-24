/** S06.2.1 추천 결과 + S06.2.2 대안 재생성 · 명세 6.2, 6.3 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge, Chip } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import theme, { color, radius, space, text } from '../../../design/theme';
import {
  useQuizAlternatives,
  useQuizResult,
  useUpdateProject,
  useVideoFormat,
} from '../../../api/queries/project';
import { seconds } from '../../../lib/format';
import type { QuizAlternative } from '../../../api/schema/types';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'QuizResult'>;

/** 명세 6.3 body.condition — 조건을 바꿔 다시 만들기 */
const CONDITIONS = ['얼굴 없이', '더 짧게', '더 재미있게', '더 정보 위주로'];

export default function QuizResultScreen({ navigation, route }: Props) {
  const { projectId } = route.params;

  /**
   * 앞 화면(QuizScreen)이 제출하면서 캐시에 넣어둔 결과를 읽습니다.
   *
   * ⚠️ 예전에는 여기서 useSubmitQuiz().data 를 읽었는데,
   *    mutation 의 data 는 그 훅 인스턴스에만 남아서 화면이 바뀌면 사라집니다.
   *    그래서 항상 undefined 가 되고 무한 로딩에 빠졌습니다.
   */
  const { data: quizData } = useQuizResult(projectId);
  const recommended = quizData?.recommendedFormat;
  const { data: format } = useVideoFormat(recommended?.videoFormatId);

  const alternatives = useQuizAlternatives(projectId);
  const [alts, setAlts] = useState<QuizAlternative[] | null>(null);
  const [condition, setCondition] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  const chosenId = picked ?? recommended?.videoFormatId;

  const regenerate = () => {
    if (!condition) return;
    alternatives.mutate(condition, { onSuccess: (r) => setAlts(r.alternatives) });
  };

  // 캐시가 비어 있으면(앱 재시작 등) 로딩이 아니라 되돌아갈 길을 줍니다.
  // 끝나지 않는 로딩은 사용자가 앱이 죽었다고 판단하게 만듭니다.
  if (!recommended) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="질문 다시 답하기" onPress={() => navigation.replace('Quiz', { projectId })} />
            <Button
              label="직접 고를게요"
              variant="quiet"
              size="small"
              onPress={() => navigation.replace('FormatFeed', { projectId })}
            />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} title="추천 결과" />
        <EmptyState
          title="추천 결과를 불러오지 못했습니다"
          description="질문에 다시 답하시면 바로 찾아 드립니다."
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="이 방법으로 만들기"
            onPress={() => {
              if (!chosenId) return;
              /**
               * 명세 확정 (2026-08-23): 포맷 저장 경로는 7.1 POST /plan 하나뿐입니다.
               * 4.2 PATCH 로 video_format_id 를 보내던 코드는 제거했습니다 —
               * 4.2 body 에 그 필드가 없어 서버가 400 을 줍니다.
               * "껐다 켰을 때 서버가 기억하는가"는 7.1 이 콘티와 함께 저장하므로
               * PlanSummary 진입 시점에 해결됩니다.
               */
              navigation.navigate('PlanSummary', { projectId, formatId: chosenId });
            }}
            disabled={!chosenId}
          />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="추천 결과" />

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>이렇게 만들면 됩니다</Text>
        <Text style={text.bodySmall}>
          사장님이 답하신 조건에서 가장 무리 없이 끝낼 수 있는 방법입니다.
        </Text>
      </View>

      <Card
        selected={chosenId === recommended.videoFormatId}
        onPress={() => setPicked(recommended.videoFormatId)}
      >
        <Badge label="가장 잘 맞습니다" tone="brand" />
        <Text style={text.heading}>{format?.formatTitle ?? recommended.formatType}</Text>

        <View style={styles.specRow}>
          <Spec label="완성 길이" value={seconds(recommended.expectedDurationSec)} />
          <Spec label="종류" value={recommended.formatType} />
          {format && <Spec label="난이도" value={format.shootingDifficulty} />}
          {format && <Spec label="얼굴" value={format.faceExposureLevel} />}
        </View>

        <View style={styles.reason}>
          <Text style={text.micro}>왜 이 방법인가</Text>
          <Text style={text.body}>{recommended.reason}</Text>
        </View>

        <Button
          label="어떤 영상인지 보기"
          variant="secondary"
          size="small"
          full={false}
          onPress={() =>
            navigation.navigate('FormatDetail', {
              projectId,
              formatId: recommended.videoFormatId,
            })
          }
        />
      </Card>

      {/* 명세 규칙: 하나의 정답처럼 보이지 않게 한다 */}
      <Banner
        tone="info"
        title="이게 유일한 정답은 아닙니다"
        description="아래에서 조건을 바꿔 다른 방법도 볼 수 있습니다."
      />

      <Card>
        <Text style={text.subheading}>조건을 바꿔서 다시 찾기</Text>
        <Text style={text.caption}>고른 조건만 바뀝니다. 나머지 답은 그대로 씁니다.</Text>
        <View style={styles.chips}>
          {CONDITIONS.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={condition === c}
              onPress={() => setCondition(condition === c ? null : c)}
            />
          ))}
        </View>
        <Button
          label="다시 찾아 주세요"
          variant="secondary"
          size="small"
          onPress={regenerate}
          disabled={!condition}
          loading={alternatives.isPending}
        />
      </Card>

      {/*
        명세 6.3 (2026-08-21): 길이·난이도·얼굴노출이 응답에 추가되어
        카드만 보고도 고를 수 있습니다. BE 배포 전 응답에 필드가 없으면
        칸을 비우는 대신 상세 보기 버튼이 그 역할을 대신합니다.
      */}
      {alts?.map((a) => (
        <Card
          key={a.videoFormatId}
          selected={chosenId === a.videoFormatId}
          onPress={() => setPicked(a.videoFormatId)}
        >
          <Badge label={a.formatType} />
          {(a.expectedDurationSec || a.shootingDifficulty || a.faceExposureLevel) && (
            <View style={styles.specRow}>
              {a.expectedDurationSec != null && (
                <Spec label="완성 길이" value={seconds(a.expectedDurationSec)} />
              )}
              {a.shootingDifficulty && <Spec label="난이도" value={a.shootingDifficulty} />}
              {a.faceExposureLevel && <Spec label="얼굴" value={a.faceExposureLevel} />}
            </View>
          )}
          <Text style={text.body}>{a.reason}</Text>
          <Button
            label="어떤 영상인지 보기"
            variant="secondary"
            size="small"
            full={false}
            onPress={() =>
              navigation.navigate('FormatDetail', { projectId, formatId: a.videoFormatId })
            }
          />
        </Card>
      ))}
    </Screen>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.spec}>
      <Text style={text.micro}>{label}</Text>
      <Text style={[text.bodySmall, { fontFamily: theme.text.bodyStrong.fontFamily }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  specRow: {
    flexDirection: 'row',
    backgroundColor: color.ink[50],
    borderRadius: radius.md,
    paddingVertical: space[3],
  },
  spec: { flex: 1, alignItems: 'center', gap: 2 },
  reason: { backgroundColor: color.brand[50], padding: space[4], borderRadius: radius.md, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
