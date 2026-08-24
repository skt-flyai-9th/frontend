/**
 * S14.7.1 편집 결과 + S14.7.2 수정 요청 · 명세 14.2, 14.3
 *
 * 이 화면의 핵심은 "완성된 영상을 직접 보는 것" 입니다.
 * 명세 14.2 가 preview_video_url 을 주는 이유가 그것입니다.
 * 회색 상자만 보여주면 사장님은 뭐가 만들어졌는지 모르고 올리게 됩니다.
 *
 * 명세 14.3 은 두 가지 수정 방식을 지원합니다.
 *   quick_button → 미리 정한 버튼 (오작동 위험이 적음)
 *   free_text    → 사장님이 직접 말로 설명
 *
 * 둘 다 제공합니다. 버튼으로 안 되는 요청이 반드시 나오기 때문입니다.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge, Chip } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useEditResult, useRevise } from '../../../api/queries/edit';
import { useAutoSave } from '../../../lib/useAutoSave';
import { seconds } from '../../../lib/format';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'EditResult'>;

/** 명세 14.3 quick_button 의 action 값 */
const QUICK_EDITS = ['자막 크게', '더 천천히', '메뉴 더 오래', '마지막 화면 바꾸기'];

export default function EditResultScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  useAutoSave({ projectId, step: 'EDITING' });

  const { data: result, isLoading, isError, refetch } = useEditResult(projectId);
  const revise = useRevise(projectId);

  const [picked, setPicked] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [writing, setWriting] = useState(false);

  // 명세 14.2 preview_video_url — 완성본을 직접 보여줍니다.
  const player = useVideoPlayer(result?.previewVideoUrl ?? null, (p) => {
    p.loop = true;
  });

  const toggle = (label: string) =>
    setPicked((p) => (p.includes(label) ? p.filter((x) => x !== label) : [...p, label]));

  const applyEdits = () => {
    if (!result?.videoOutputId) return;

    // 자연어가 있으면 그걸 우선합니다. 더 구체적인 요청이기 때문입니다.
    const useFree = writing && freeText.trim().length > 0;
    if (!useFree && picked.length === 0) return;

    revise.mutate(
      {
        outputId: result.videoOutputId,
        // ⚠️ 자연어 값은 'natural_language' 입니다. 'free_text' 로 보내면 422 (2026-08-26 실서버 대조).
        requestType: useFree ? 'natural_language' : 'quick_button',
        action: useFree ? freeText.trim() : picked.join(', '),
      },
      {
        onSuccess: () => {
          setPicked([]);
          setFreeText('');
          setWriting(false);
          // 수정 후 재렌더는 같은 플랫폼 규격을 유지해야 합니다.
          navigation.replace('Render', { projectId, platform: 'INSTAGRAM' });
        },
      }
    );
  };

  if (isError || (!isLoading && !result)) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => refetch()} />
            <Button
              label="다시 만들기"
              variant="quiet"
              size="small"
              onPress={() => navigation.replace('Render', { projectId })}
            />
          </BottomAction>
        }
      >
        <AppBar title="완성된 영상" />
        <EmptyState
          title="영상 정보를 불러오지 못했습니다"
          description="촬영본은 그대로 있습니다."
        />
      </Screen>
    );
  }

  if (isLoading || !result) {
    return (
      <Screen>
        <AppBar title="완성된 영상" />
        <Loading label="영상을 불러오는 중" />
      </Screen>
    );
  }

  const total = result.timelineSummary?.reduce((s, t) => s + t.durationSec, 0) ?? 0;
  const hasRequest = (writing && freeText.trim().length > 0) || picked.length > 0;

  return (
    <Screen
      footer={
        <BottomAction>
          {hasRequest ? (
            <Button
              label="고쳐서 다시 만들기"
              onPress={applyEdits}
              loading={revise.isPending}
            />
          ) : (
            <Button
              label="이대로 올리러 가기"
              onPress={() => navigation.navigate('Outputs', { projectId })}
            />
          )}
        </BottomAction>
      }
    >
      <AppBar title="완성된 영상" />

      {revise.isError && (
        <Banner
          tone="danger"
          title="수정 요청을 보내지 못했습니다"
          description="지금 영상은 그대로 있습니다. 다시 눌러 주세요."
        />
      )}

      {/* 완성본 미리보기 */}
      {result.previewVideoUrl ? (
        <View style={styles.previewWrap}>
          <VideoView
            style={StyleSheet.absoluteFill}
            player={player}
            contentFit="contain"
            nativeControls
          />
        </View>
      ) : (
        <View style={styles.previewFallback}>
          <Text style={[text.bodySmall, { color: color.paper }]}>미리보기를 준비 중입니다</Text>
          <Text style={[text.micro, { color: 'rgba(255,255,255,0.7)' }]}>
            {seconds(total)} · 세로 9:16
          </Text>
        </View>
      )}

      <View style={styles.metaRow}>
        <Badge label={`${seconds(total)}`} />
        <Badge label="세로 9:16" />
        {result.renderStatus === 'COMPLETED' && <Badge label="완성" tone="done" />}
      </View>

      {result.timelineSummary && result.timelineSummary.length > 0 && (
        <Card>
          <Text style={text.subheading}>이렇게 이어 붙였습니다</Text>
          {result.timelineSummary.map((t) => (
            <View key={t.sceneOrder} style={styles.tlRow}>
              <Text style={[text.micro, { width: 28 }]}>{t.sceneOrder}</Text>
              <Text style={[text.bodySmall, { flex: 1 }]}>{t.effect}</Text>
              <Text style={text.micro}>{seconds(t.durationSec)}</Text>
            </View>
          ))}
        </Card>
      )}

      <Text style={[text.subheading, { marginTop: space[2] }]}>고치고 싶은 게 있으세요?</Text>

      {!writing ? (
        <>
          <View style={styles.chips}>
            {QUICK_EDITS.map((e) => (
              <Chip key={e} label={e} selected={picked.includes(e)} onPress={() => toggle(e)} />
            ))}
          </View>
          <Button
            label="직접 말로 설명할게요"
            variant="secondary"
            size="small"
            full={false}
            onPress={() => {
              setWriting(true);
              setPicked([]);
            }}
          />
          <Text style={text.caption}>고를 게 없으면 그냥 다음으로 넘어가세요.</Text>
        </>
      ) : (
        <>
          {/* 명세 14.3 request_type: free_text */}
          <TextInput
            value={freeText}
            onChangeText={setFreeText}
            multiline
            autoFocus
            style={styles.textArea}
            placeholder="예: 국물 붓는 장면을 더 길게 보여주세요"
            placeholderTextColor={color.ink[300]}
            accessibilityLabel="고치고 싶은 내용"
          />
          <Text style={text.caption}>
            어떤 장면을 어떻게 바꾸고 싶은지 적어 주세요. 다 못 고칠 수도 있습니다.
          </Text>
          <Button
            label="버튼으로 고를게요"
            variant="quiet"
            size="small"
            full={false}
            onPress={() => {
              setWriting(false);
              setFreeText('');
            }}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  previewWrap: {
    aspectRatio: 9 / 14,
    backgroundColor: color.mediaBlack,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewFallback: {
    aspectRatio: 9 / 14,
    backgroundColor: color.ink[900],
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  metaRow: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  textArea: {
    ...text.body,
    minHeight: 100,
    borderRadius: radius.md,
    borderWidth: theme.border.thick,
    borderColor: color.brand[600],
    backgroundColor: color.paper,
    padding: space[4],
    textAlignVertical: 'top',
  },
});
