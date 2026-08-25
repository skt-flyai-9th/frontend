/**
 * S07.1.1 공식 임베드 + S07.2.1 핵심 포인트 · 명세 5.2
 *
 * 영상 위에는 아무것도 올리지 않습니다(YouTube 약관).
 * 재생·진행바·배속은 **유튜브 자체 컨트롤**을 씁니다 (2026-08-26 전환) —
 * 우리가 만든 바깥 버튼은 자주 안 먹어서 걷어냈습니다. ui/GuidePlayer 머리말 참고.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import { FeasibilityBadges } from '../../../ui/FeasibilityBadges';
import { GuidePlayer } from '../../../ui/GuidePlayer';
import { VideoThumbnail } from '../../../ui/VideoThumbnail';
import theme, { space, text } from '../../../design/theme';
import { useVideoFormat } from '../../../api/queries/project';
import { seconds } from '../../../lib/format';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'FormatDetail'>;

/** S07.2.1: 구간별 중요도를 "꼭 지키기 / 바꿔도 됨"으로 표시 */
const TIMELINE = [
  { at: '0–3초', role: '첫 장면', note: '간판이나 가장 눈에 띄는 것', keep: '꼭 지키기' },
  { at: '3–8초', role: '만드는 과정', note: '손이 움직이는 장면', keep: '가게에 맞춰 변경' },
  { at: '8–16초', role: '상품 공개', note: '완성된 메뉴가 나오는 순간', keep: '꼭 지키기' },
  { at: '16–20초', role: '마무리 안내', note: '가격·위치·영업시간', keep: '바꿔도 됨' },
];

export default function FormatDetailScreen({ navigation, route }: Props) {
  const { projectId, formatId } = route.params;
  const { data: format, isLoading, isError, refetch } = useVideoFormat(formatId);

  if (isError || (!isLoading && !format)) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => refetch()} />
            <Button label="목록으로" variant="quiet" size="small" onPress={() => navigation.goBack()} />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} />
        <EmptyState title="이 방식을 불러오지 못했습니다" description="다른 방식을 골라도 됩니다." />
      </Screen>
    );
  }

  if (isLoading || !format) {
    return (
      <Screen>
        <AppBar onBack={() => navigation.goBack()} />
        <Loading label="불러오는 중" />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="이 방식으로 만들기"
            onPress={() => {
              if (!projectId) {
                // 둘러보기로 들어왔으면 목적 선택부터 시작합니다.
                navigation.navigate('PurposeSelect');
                return;
              }
              // 명세 확정 (2026-08-23): 포맷 저장은 7.1 POST /plan 이 유일한 경로입니다.
              // 4.2 PATCH video_format_id 는 명세에서 빠졌습니다.
              navigation.navigate('PlanSummary', { projectId, formatId });
            }}
          />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="이 방식 살펴보기" />

      <Text style={text.title}>{format.formatTitle}</Text>

      {/*
        참고 영상. 위에 겹치는 요소 없음 (YouTube 약관).

        ⚠️ GuidePlayer 는 YouTube 전용입니다.
           Instagram·TikTok 은 임베드 재생 자체를 지원하지 않아 썸네일로 대체합니다.
           명세상 현재 카탈로그는 전부 YouTube 라 실질 이슈는 없지만,
           다른 플랫폼이 오면 썸네일과 원본 링크만 보여줍니다.
      */}
      {!format.sourcePlatform || format.sourcePlatform === 'YOUTUBE' ? (
        <GuidePlayer url={format.referenceUrl} fullBleed />
      ) : (
        <>
          <VideoThumbnail
            url={format.referenceUrl}
            platform={format.sourcePlatform}
            duration={seconds(format.expectedDurationSec)}
          />
          <Text style={text.caption}>
            이 영상은 {format.sourcePlatform === 'INSTAGRAM' ? '인스타그램' : '틱톡'}에 있어
            여기서 바로 재생할 수 없습니다. 원본에서 확인해 주세요.
          </Text>
        </>
      )}

      {/* 시안 FeasibilityBadges — 약관상 플레이어 "위"가 아니라 바로 아래 행에 */}
      <FeasibilityBadges
        tags={[
          { icon: 'clock', label: `${format.expectedDurationSec}초` },
          { icon: 'user', label: `난이도 ${format.shootingDifficulty}` },
          ...(format.faceExposureLevel === '낮음'
            ? ([{ icon: 'eyeOff' as const, label: '얼굴 노출 없음' }])
            : []),
        ]}
      />

      <Banner
        tone="info"
        title="그대로 따라 하지 않습니다"
        description="구조만 참고하고, 대사와 장면은 우리 가게 메뉴에 맞게 새로 만듭니다."
      />

      <Text style={text.subheading}>영상이 어떻게 굴러가는지</Text>
      <Card>
        {TIMELINE.map((t, i) => (
          <View key={i} style={styles.tlRow}>
            <Text style={[text.micro, styles.tlTime]}>{t.at}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.tlHead}>
                <Text style={text.bodyStrong}>{t.role}</Text>
                <Badge label={t.keep} tone={t.keep === '꼭 지키기' ? 'brand' : 'neutral'} />
              </View>
              <Text style={text.bodySmall}>{t.note}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Text style={text.subheading}>촬영 준비</Text>
      <Card>
        <PrepRow label="완성 길이" value={seconds(format.expectedDurationSec)} />
        <PrepRow label="난이도" value={format.shootingDifficulty} />
        <PrepRow label="얼굴 노출" value={format.faceExposureLevel} />
        <PrepRow label="종류" value={format.formatType} />
        <Text style={text.caption}>삼각대가 없으면 컵이나 소금통에 기대 세워도 됩니다.</Text>
      </Card>
    </Screen>
  );
}

function PrepRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.prepRow}>
      <Text style={text.bodySmall}>{label}</Text>
      <Text style={[text.bodySmall, { fontFamily: theme.text.bodyStrong.fontFamily }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tlRow: { flexDirection: 'row', gap: space[3], paddingVertical: space[2] },
  tlTime: { width: 60, paddingTop: 4 },
  tlHead: { flexDirection: 'row', gap: space[2], alignItems: 'center' },
  prepRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
