/**
 * S09.1.2 재촬영 확인 · 명세 9.2 업로드
 *
 * 업로드는 실패하기 쉬운 지점입니다. 가게 안은 신호가 약할 때가 많고,
 * 30초 영상도 수십 MB 입니다. 그래서 세 가지를 반드시 보여줍니다.
 *   1. 실제 진행률 (가짜 값이 아니라 전송된 바이트)
 *   2. 취소 버튼 (기다리기 싫을 때 빠져나갈 길)
 *   3. 실패 시 재시도 (촬영본은 그대로 있다는 안내)
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { JobProgress } from '../../../ui/Feedback';
import { color, radius, space, text } from '../../../design/theme';
import { useUpdateTask, useUploadFootage } from '../../../api/queries/shoot';
import { seconds } from '../../../lib/format';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'TakeReview'>;

export default function TakeReviewScreen({ navigation, route }: Props) {
  const { projectId, taskId, uri, durationSec } = route.params;
  const upload = useUploadFootage(projectId);
  const markTask = useUpdateTask(projectId);
  const [progress, setProgress] = useState(0);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  // 화면을 벗어나면 업로드를 정리합니다. 안 하면 백그라운드에서 계속 돕니다.
  useEffect(() => () => upload.cancel(), []);

  const start = () => {
    setProgress(0);

    /**
     * 명세 8.2: 업로드를 시작했다고 서버에 알립니다.
     *
     * 이걸 안 하면 신호가 약해 오래 걸리는 동안 앱을 껐다 켰을 때
     * 그 장면이 "아직 안 함"으로 보입니다. 실패해도 업로드는 그대로 진행합니다.
     */
    markTask.mutate({ taskId, taskStatus: 'IN_PROGRESS' });

    upload.mutate(
      { taskId, uri, durationSec, onProgress: setProgress },
      { onSuccess: () => navigation.replace('Evaluation', { projectId, taskId }) }
    );
  };

  const uploading = upload.isPending;
  const failed = upload.isError;
  const tooShort = durationSec < 3;

  // 100% 에 도달했지만 서버 응답을 기다리는 중
  const finishing = uploading && progress >= 1;

  return (
    <Screen scroll={false} background={color.mediaBlack} padded={false} edges={['bottom']}>
      <View style={styles.videoWrap}>
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{seconds(durationSec)}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        {uploading ? (
          <>
            <Text style={[text.subheading, { color: color.paper }]}>
              {finishing ? '거의 다 됐습니다' : '영상을 보내는 중'}
            </Text>
            <Text style={[text.bodySmall, { color: 'rgba(255,255,255,0.75)' }]}>
              {finishing
                ? '서버에서 확인하고 있습니다.'
                : '신호가 약하면 조금 걸릴 수 있습니다. 앱을 켜두세요.'}
            </Text>
            <JobProgress label={`${Math.round(progress * 100)}%`} progress={progress} />
            <Button
              label="그만두기"
              variant="secondary"
              onPress={() => {
                upload.cancel();
                setProgress(0);
              }}
            />
          </>
        ) : failed ? (
          <>
            <Text style={[text.subheading, { color: color.paper }]}>보내지 못했습니다</Text>
            <Text style={[text.bodySmall, { color: 'rgba(255,255,255,0.75)' }]}>
              찍은 영상은 그대로 있습니다. 신호를 확인하고 다시 보내 주세요.
            </Text>
            <View style={styles.actions}>
              <Button
                label="다시 찍기"
                variant="secondary"
                onPress={() => navigation.replace('Camera', { projectId, taskId })}
              />
              <Button label="다시 보내기" onPress={start} />
            </View>
          </>
        ) : (
          <>
            <Text style={[text.subheading, { color: color.paper }]}>이 영상 쓰시겠어요?</Text>
            <Text style={[text.bodySmall, { color: 'rgba(255,255,255,0.75)' }]}>
              {tooShort
                ? '조금 짧습니다. 다시 찍으면 더 좋아집니다.'
                : '괜찮아 보입니다. 마음에 안 들면 바로 다시 찍어도 됩니다.'}
            </Text>
            <View style={styles.actions}>
              <Button
                label="다시 찍기"
                variant="secondary"
                onPress={() => navigation.replace('Camera', { projectId, taskId })}
              />
              <Button label="이걸로 쓸게요" onPress={start} />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  videoWrap: { flex: 1, backgroundColor: color.mediaBlack },
  badge: {
    position: 'absolute',
    top: space[9],
    alignSelf: 'center',
    backgroundColor: color.overlay.cameraChrome,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
  },
  badgeText: { ...text.bodySmall, color: color.paper },
  panel: { padding: space[5], gap: space[3], backgroundColor: color.ink[900] },
  actions: { flexDirection: 'row', gap: space[3], marginTop: space[2] },
});
