/**
 * S07.4.1 가게 맞춤 기획 · 명세 7.1 (2026-08-21 개정)
 *
 * 개정 내용: scenes_preview 에 id 와 scene_dialogue 가 추가됐습니다.
 * 그래서 이 화면에서 대사를 바로 확인하고 고칠 수 있습니다.
 *
 * 수정은 7.2 의 PATCH /scenes 를 그대로 재사용합니다.
 * 자막(scene_subtitle)은 여기 없습니다 — 콘티 화면(S07.4.2)의 몫입니다.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Wand2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { VideoThumbnail } from '../../../ui/VideoThumbnail';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import theme, { color, radius, space, text } from '../../../design/theme';
import {
  useCreatePlan,
  usePlan,
  useScenes,
  useUpdateScenes,
  useVideoFormat,
} from '../../../api/queries/project';
import { minutes, seconds } from '../../../lib/format';
import { useAutoSave } from '../../../lib/useAutoSave';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'PlanSummary'>;

/** 한국어는 초당 6~7자 정도가 편하게 들리고 읽힙니다. */
const CHARS_PER_SEC = 6.5;

export default function PlanSummaryScreen({ navigation, route }: Props) {
  const { projectId, formatId } = route.params;
  const createPlan = useCreatePlan(projectId);
  const updateScenes = useUpdateScenes(projectId);
  // 원본 참고 영상 (5.2). 없으면 그 칸만 빠집니다.
  const { data: format } = useVideoFormat(formatId);

  const [edits, setEdits] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [partialSave, setPartialSave] = useState<number | null>(null);

  /**
   * ⚠️ 7.1 을 함부로 다시 부르면 안 됩니다.
   *
   * 서버는 POST /plan 을 받으면 콘티를 새로 만듭니다.
   * 사장님이 대사를 고쳐 놓은 뒤 앱을 껐다가 이어하기로 돌아오면,
   * 메모리 캐시는 비어 있으므로 7.1 이 다시 호출되고 고친 내용이 전부 날아갑니다.
   *
   * 그래서 먼저 7.2 로 이미 만들어진 콘티가 있는지 확인합니다.
   * 있으면 그걸 쓰고, 없을 때만 7.1 로 새로 만듭니다.
   */
  const { data: cachedPlan } = usePlan(projectId);
  const { data: existingScenes, isLoading: scenesLoading } = useScenes(projectId);

  useEffect(() => {
    // 콘티 조회가 끝나기 전에는 판단하지 않습니다.
    if (scenesLoading) return;
    if (cachedPlan) return;
    // 이미 콘티가 있으면 새로 만들지 않습니다.
    if ((existingScenes?.length ?? 0) > 0) return;
    if (createPlan.isPending || createPlan.isError || createPlan.data) return;

    createPlan.mutate(formatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId, cachedPlan, existingScenes, scenesLoading]);

  /**
   * 표시할 기획.
   * 서버에 이미 콘티가 있으면 그걸 7.1 응답 모양으로 변환해 씁니다.
   */
  /**
   * 폴백 여부.
   *
   * 7.1 응답의 shooting_summary.expected_duration_sec 는 **촬영에 걸리는 시간**입니다.
   * 반면 7.2 콘티에는 shooting_summary 가 없어서(2026-08-23 명세 재확인),
   * 이어하기로 들어오면 장면 길이 합 = **완성 영상 길이**만 계산할 수 있습니다.
   * 둘은 완전히 다른 값입니다 (완성 25초짜리를 찍는 데 8분이 걸림).
   *
   * 이전 코드는 이 폴백 값을 "걸리는 시간"으로 표시해서
   * minutes(25/60) → "약 0분" 이 나오는 버그가 있었습니다.
   * 폴백일 때는 라벨을 "완성 길이"로 바꾸고, 모르는 값(인원·난이도·준비물)은
   * 지어내지 않고 숨깁니다 (N/A 원칙 — 1명·하 라고 단정할 근거가 없습니다).
   */
  const isFallback = !cachedPlan && !createPlan.data && (existingScenes?.length ?? 0) > 0;

  const plan =
    cachedPlan ??
    createPlan.data ??
    ((existingScenes?.length ?? 0) > 0
      ? {
          shootingSummary: {
            // ⚠️ 폴백에서 이 값은 촬영 소요가 아니라 **완성 영상 길이**입니다.
            expectedDurationSec: existingScenes!.reduce((a, b) => a + b.targetDurationSec, 0),
            requiredPeople: 0,
            props: [],
            difficulty: '하' as const,
          },
          scenesPreview: existingScenes!.map((sc) => ({
            id: sc.id,
            sceneOrder: sc.sceneOrder,
            sceneDescription: sc.sceneDescription,
            sceneDialogue: sc.sceneDialogue,
            targetDurationSec: sc.targetDurationSec,
          })),
        }
      : undefined);

  const next = () => {
    const changed = Object.entries(edits).map(([id, sceneDialogue]) => ({
      id: Number(id),
      sceneDialogue,
    }));

    if (changed.length === 0) {
      navigation.navigate('Storyboard', { projectId });
      return;
    }
    // 명세: 대사 수정은 7.2 PATCH /scenes 를 재사용합니다.
    updateScenes.mutate(changed, {
      onSuccess: (res) => {
        // 명세 응답의 updated_count 로 실제 저장 건수를 확인합니다.
        // 보낸 개수와 다르면 일부가 저장되지 않은 것이므로 알려야 합니다.
        if (typeof res?.updatedCount === 'number' && res.updatedCount < changed.length) {
          setPartialSave(changed.length - res.updatedCount);
          return;
        }
        navigation.navigate('Storyboard', { projectId });
      },
    });
  };

  // 실패했으면 로딩을 계속 돌리지 않고 다시 시도할 길을 줍니다.
  if (createPlan.isError && !plan) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => createPlan.mutate(formatId)} />
            <Button
              label="다른 방식 고르기"
              variant="quiet"
              size="small"
              onPress={() => navigation.goBack()}
            />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} title="촬영 계획" />
        <EmptyState
          title="촬영 계획을 만들지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
        />
      </Screen>
    );
  }

  if (!plan) {
    return (
      <Screen>
        <AppBar onBack={() => navigation.goBack()} title="촬영 계획" />
        <Loading label={scenesLoading ? '불러오는 중' : '우리 가게에 맞게 짜는 중'} />
      </Screen>
    );
  }

  const s = plan.shootingSummary;
  const editedCount = Object.keys(edits).length;

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label={editedCount > 0 ? `${editedCount}군데 고치고 계속` : '가이드 촬영 시작하기'}
            onPress={next}
            loading={updateScenes.isPending}
          />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="촬영 준비" />

      {/*
        "이 영상을 우리 가게 버전으로 바꿨다"를 먼저 알립니다.
        사장님 입장에서 남의 영상이 왜 내 촬영 목록이 됐는지 이해하는 지점입니다.
      */}
      <View style={styles.convertBanner}>
        <Wand2 size={16} strokeWidth={2} color={color.brand[600]} />
        <Text style={[text.bodySmall, { color: color.brand[700], flex: 1 }]}>
          우리 매장에 맞게 바꾸었어요
        </Text>
      </View>

      {/*
        원본 참고 영상.
        ⚠️ 프로토타입에는 오른쪽에 "AI 변환 미리보기" 패널이 있지만,
           변환 결과 이미지를 주는 API 가 없습니다(15.1 cover_image_url 은 완성본).
           가짜 미리보기를 만드는 대신, 변환 결과는 아래 컷 목록이 대신합니다.
      */}
      {format?.referenceUrl ? (
        <View style={{ gap: space[2] }}>
          <Text style={text.micro}>원본</Text>
          <VideoThumbnail
            url={format.referenceUrl}
            platform={format.sourcePlatform}
            aspectRatio={16 / 9}
          />
        </View>
      ) : null}

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>촬영 컷 구성 ({plan.scenesPreview.length}컷)</Text>
        <Text style={text.bodySmall}>순서대로 찍습니다. 한 번에 다 안 해도 됩니다.</Text>
      </View>

      <Card>
        <View style={styles.summaryRow}>
          {isFallback ? (
            // 콘티 합계는 완성 영상 길이입니다. 촬영 소요로 표시하면 거짓말입니다.
            <Item label="완성 길이" value={seconds(s.expectedDurationSec)} />
          ) : (
            <Item label="걸리는 시간" value={minutes(s.expectedDurationSec / 60)} />
          )}
          {!isFallback && <Item label="필요한 사람" value={`${s.requiredPeople}명`} />}
          {!isFallback && <Item label="난이도" value={s.difficulty} />}
        </View>
        {s.props.length > 0 && (
          <View style={{ gap: 2 }}>
            <Text style={text.micro}>준비물</Text>
            <Text style={text.bodySmall}>{s.props.join(' · ')}</Text>
          </View>
        )}
      </Card>

      <Banner
        tone="info"
        title="어색한 말은 지금 고쳐도 됩니다"
        description="사장님이 평소 쓰는 말로 바꾸면 훨씬 자연스럽습니다."
      />

      {plan.scenesPreview.map((sc) => {
        const dialogue = edits[sc.id] ?? sc.sceneDialogue;
        const maxChars = Math.floor(sc.targetDurationSec * CHARS_PER_SEC);
        const tooLong = dialogue.length > maxChars;
        const editing = editingId === sc.id;

        return (
          <Card key={sc.id}>
            <View style={styles.head}>
              <View style={styles.sceneRow}>
                <View style={styles.numBox}>
                  <Text style={styles.num}>{sc.sceneOrder}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={text.bodyStrong}>{sc.sceneDescription}</Text>
                  <Text style={text.micro}>{seconds(sc.targetDurationSec)}</Text>
                </View>
              </View>
              <Badge
                label={`${dialogue.length}/${maxChars}자`}
                tone={tooLong ? 'warn' : 'neutral'}
              />
            </View>

            {editing ? (
              <View style={{ gap: space[2] }}>
                <TextInput
                  value={dialogue}
                  onChangeText={(v) => setEdits((p) => ({ ...p, [sc.id]: v }))}
                  multiline
                  autoFocus
                  style={styles.input}
                  accessibilityLabel="대사 고치기"
                />
                <Button
                  label="다 고쳤어요"
                  size="small"
                  full={false}
                  onPress={() => setEditingId(null)}
                />
              </View>
            ) : (
              <Pressable onPress={() => setEditingId(sc.id)} accessibilityRole="button">
                <View style={styles.dialogueBox}>
                  <Text style={text.micro}>할 말</Text>
                  <Text style={text.body}>“{dialogue}”</Text>
                </View>
              </Pressable>
            )}

            {tooLong && (
              <Text style={[text.caption, { color: color.warn[500] }]}>
                {seconds(sc.targetDurationSec)} 안에 말하기엔 조금 깁니다.
              </Text>
            )}

            {!editing && (
              <Button
                label="고치기"
                variant="secondary"
                size="small"
                full={false}
                onPress={() => setEditingId(sc.id)}
              />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.item}>
      <Text style={text.micro}>{label}</Text>
      <Text style={text.bodyStrong}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  convertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: color.brand[50],
    borderRadius: radius.lg,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: color.ink[50],
    borderRadius: radius.md,
    paddingVertical: space[4],
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[2],
  },
  sceneRow: { flexDirection: 'row', gap: space[3], alignItems: 'center', flex: 1 },
  numBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: color.ink[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { ...text.bodySmall, color: color.paper, fontFamily: theme.text.bodyStrong.fontFamily },
  dialogueBox: {
    backgroundColor: color.brand[50],
    padding: space[4],
    borderRadius: radius.md,
    gap: 2,
  },
  input: {
    ...text.body,
    minHeight: 80,
    borderRadius: radius.md,
    borderWidth: theme.border.thick,
    borderColor: color.brand[600],
    backgroundColor: color.paper,
    padding: space[4],
    textAlignVertical: 'top',
  },
});
