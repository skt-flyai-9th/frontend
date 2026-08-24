/**
 * S09.2.1 촬영 가이드 + S10.1.* 안무 가이드 · 명세 9.1
 *
 * guide_type 이 무엇이 주된 안내인지 알려줍니다.
 * 세 종류를 같게 그리면, 정작 봐야 할 게 아래로 밀려납니다.
 *
 *   OVERLAY → 구도 지시문이 주역. 화면에 뭘 어디 둘지가 핵심
 *   DANCE   → 참고 영상이 주역. 동작을 눈으로 따라해야 함 (R10)
 *   BROLL   → 샷 정보가 주역. 카메라를 어떻게 잡을지가 핵심
 *
 * ⚠️ 재생 제어 (명세 9.1 → 2026-08-26 방침 변경)
 *    서버는 영상 링크·출처만 내려줍니다. 예전에는 그 위에 우리가 배속·구간반복
 *    버튼을 만들어 붙였는데 자주 안 먹어서, 지금은 **유튜브 자체 컨트롤**을 씁니다.
 *    진행바·일시정지·배속 전부 플레이어 안에 있습니다.
 *
 *    Instagram·TikTok 은 임베드 재생을 지원하지 않아 썸네일로 대체합니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { EmptyState, Loading } from '../../../ui/Feedback';
import { GuidePlayer } from '../../../ui/GuidePlayer';
import { VideoThumbnail } from '../../../ui/VideoThumbnail';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useTaskGuide, useTasks } from '../../../api/queries/shoot';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'TaskGuide'>;

export default function TaskGuideScreen({ navigation, route }: Props) {
  const { projectId, taskId } = route.params;
  const { data: guide, isLoading, isError, refetch } = useTaskGuide(taskId);
  const { data: board } = useTasks(projectId);

  const task = board?.tasks.find((t) => t.id === taskId);

  const instructions = guide?.overlay?.instructions ?? [];
  const video = guide?.referenceVideo;
  const hasVideo = Boolean(video?.referenceUrl);
  const shot = guide?.brollShot;

  /** guide_type 이 없으면 내용으로 추측합니다. 서버가 안 줄 수도 있습니다. */
  const kind = guide?.guideType ?? (hasVideo ? 'DANCE' : shot ? 'BROLL' : 'OVERLAY');

  // 재생 제어는 YouTube 에서만 됩니다.
  const playable = video?.sourcePlatform === 'YOUTUBE' || !video?.sourcePlatform;

  const 지시문 = instructions.length > 0 && (
    <Card>
      <View style={styles.head}>
        <Text style={text.subheading}>기억할 것</Text>
        {kind === 'OVERLAY' && <Badge label="가장 중요" tone="brand" />}
      </View>
      {instructions.map((ins, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.dot} />
          <Text style={[text.body, { flex: 1 }]}>{ins}</Text>
        </View>
      ))}
      <Text style={text.caption}>촬영 화면에도 계속 보여 드립니다.</Text>
    </Card>
  );

  const 참고영상 = hasVideo && (
    <View style={{ gap: space[2] }}>
      <View style={styles.head}>
        <Text style={text.subheading}>참고 영상</Text>
        {kind === 'DANCE' && <Badge label="가장 중요" tone="brand" />}
      </View>

      {playable ? (
        /* 재생·진행바·배속은 유튜브 플레이어 자체 컨트롤로 조작합니다 */
        <GuidePlayer url={video!.referenceUrl} />
      ) : (
        <>
          <VideoThumbnail url={video!.referenceUrl} platform={video!.sourcePlatform} />
          <Text style={text.caption}>
            이 영상은 여기서 바로 재생할 수 없습니다. 원본에서 확인해 주세요.
          </Text>
        </>
      )}
    </View>
  );

  const 샷정보 = shot && (
    <Card>
      <View style={styles.head}>
        <Text style={text.subheading}>카메라 잡는 법</Text>
        {kind === 'BROLL' && <Badge label="가장 중요" tone="brand" />}
      </View>
      <View style={styles.shotGrid}>
        <ShotItem label="화면 크기" value={shot.shotType} />
        <ShotItem label="거리" value={shot.distance} />
        <ShotItem label="각도" value={shot.angle} />
      </View>
      <Text style={text.caption}>
        {shot.distance === '근접'
          ? '휴대폰을 가까이 대고 초점이 맞을 때까지 기다리세요.'
          : '한 걸음 물러서서 전체가 들어오게 하세요.'}
      </Text>
    </Card>
  );

  if (isError) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => refetch()} />
            <Button
              label="가이드 없이 찍기"
              variant="quiet"
              size="small"
              onPress={() => navigation.navigate('Camera', { projectId, taskId })}
            />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} title="이렇게 찍으세요" />
        <EmptyState
          title="촬영 가이드를 불러오지 못했습니다"
          description="가이드 없이도 촬영은 할 수 있습니다."
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <BottomAction>
          {/*
            안무(DANCE) 태스크는 참고 영상을 보면서 찍는 화면이 기본입니다.
            단, Instagram·TikTok 은 재생 제어 API 가 없어 안무 카메라를 못 씁니다
            (YouTube 전용 — 인수인계 §6.8). 그 경우 일반 촬영만 보여줍니다.
          */}
          {kind === 'DANCE' && guide?.referenceVideo?.sourcePlatform === 'YOUTUBE' ? (
            <>
              <Button
                label="영상 보면서 찍기"
                onPress={() => navigation.navigate('DanceCamera', { projectId, taskId })}
              />
              <Button
                label="그냥 찍기"
                variant="quiet"
                size="small"
                onPress={() => navigation.navigate('Camera', { projectId, taskId })}
              />
            </>
          ) : (
            <Button
              label="촬영 시작"
              onPress={() => navigation.navigate('Camera', { projectId, taskId })}
            />
          )}
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="이렇게 찍으세요" />

      {isLoading && !guide && <Loading label="촬영 가이드를 불러오는 중" />}

      {task && (
        <View style={{ gap: space[2] }}>
          <Text style={text.title}>{task.taskTitle}</Text>
          <Text style={text.bodySmall}>
            {task.taskType === 'B-roll'
              ? '짧게 몇 초만 찍으면 됩니다. 말하지 않아도 됩니다.'
              : task.taskType === '영상촬영'
                ? '이 장면은 영상의 중심이 됩니다.'
                : '안내에 따라 담아 주세요.'}
          </Text>
        </View>
      )}

      {/* guide_type 이 가리키는 것을 맨 위에 둡니다 */}
      {kind === 'DANCE' ? (
        <>
          {참고영상}
          {지시문}
          {샷정보}
        </>
      ) : kind === 'BROLL' ? (
        <>
          {샷정보}
          {지시문}
          {참고영상}
        </>
      ) : (
        <>
          {지시문}
          {샷정보}
          {참고영상}
        </>
      )}
    </Screen>
  );
}

function ShotItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.shotItem}>
      <Text style={text.micro}>{label}</Text>
      <Text style={[text.bodySmall, { fontFamily: theme.text.bodyStrong.fontFamily }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  dot: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: color.brand[500], marginTop: 11 },
  shotGrid: {
    flexDirection: 'row',
    backgroundColor: color.ink[50],
    borderRadius: radius.md,
    paddingVertical: space[3],
  },
  shotItem: { flex: 1, alignItems: 'center', gap: 2 },
});
