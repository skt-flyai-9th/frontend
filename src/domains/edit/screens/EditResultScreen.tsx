/**
 * S14.7.1 편집 결과 · 명세 14.2 · 15.1  — 시안 V4 `17_export` (ExportScreen)
 *
 * 시안에서 이 화면은 "내보내기" 입니다. 만들어진 영상을 보고, 받거나 공유하고,
 * 올릴 때 쓸 문구·음원 정보를 복사해 가는 것으로 제작이 끝납니다.
 *
 * 시안에 없어 걷어낸 것 (2026-08-26)
 *   · 수정 요청(14.3 quick_button·natural_language) — ⚠️ 기능이 사라집니다. 인수인계 참고
 *   · 타임라인 요약("이렇게 이어 붙였습니다")
 *   · 길이·비율·완성 배지 줄
 *
 * 시안이 TopHeader 를 쓰지 않습니다 — 이 화면만 좌측 정렬 헤더입니다.
 *   시안: <header className="flex items-center gap-2 px-4 pb-3 pt-[62px]">
 *   공용 AppBar 는 타이틀이 절대 중앙이라 여기서는 쓰지 않고 화면 안에서 그립니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Clipboard from 'expo-clipboard';
import { Check, ChevronLeft, Clock, Copy, Download, Info, Music2, Upload } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { Card } from '../../../ui/Card';
import { EmptyState, Loading } from '../../../ui/Feedback';
import { pressTap } from '../../../ui/press';
import { useCreateOutputs, useEditResult, useOutputs } from '../../../api/queries/edit';
import { useSaveToGallery } from '../../../lib/useSaveToGallery';
import { useShareVideo } from '../../../lib/useShareVideo';
import { useAutoSave } from '../../../lib/useAutoSave';
import { clock } from '../../../lib/format';
import theme, { color, radius, space, text } from '../../../design/theme';
import type { CreateStackParamList, RootStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'EditResult'>;

/**
 * 시안 헤더 — 뒤로가기 + 좌측 타이틀.
 * 시안: pt-[62px] px-4 pb-3 gap-2 / chevron 24 · 36 원형 / h1 18 bold
 * pt-62 중 54 는 상태바 몫(SafeAreaView top)이고 나머지 8 만 여기서 줍니다.
 */
function ExportHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="뒤로가기"
        hitSlop={6}
        onPress={onBack}
        style={({ pressed }) => [styles.headerBack, pressTap(pressed, 'icon')]}
      >
        <ChevronLeft size={24} strokeWidth={2} color={color.ink[900]} />
      </Pressable>
      <Text style={text.heading}>내보내기</Text>
    </View>
  );
}

/**
 * 시안 CopyBtn — h-8 · rounded-lg · bg-[#F1F5F9] · px-2.5 · 12 semibold brand.
 * 누르면 1.4초 동안 "복사됨" 으로 바뀝니다(시안과 같은 시간).
 */
function CopyBtn({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 복사 직후 화면을 벗어나면 타이머가 사라진 화면을 건드립니다.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onPress = () => {
    Clipboard.setStringAsync(value).catch(() => {});
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} 복사`}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.copyBtn, pressTap(pressed, 'chip')]}
    >
      {copied ? (
        <Check size={14} strokeWidth={2} color={color.brand[600]} />
      ) : (
        <Copy size={14} strokeWidth={2} color={color.brand[600]} />
      )}
      <Text style={styles.copyLabel}>{copied ? '복사됨' : '복사'}</Text>
    </Pressable>
  );
}

/** 시안 카드 머리 — 아이콘 14 + 12 semibold 라벨 (음원 카드용) */
function CardLabel({ icon: Icon, children }: { icon?: typeof Clock; children: React.ReactNode }) {
  return (
    <View style={styles.labelRow}>
      {Icon ? <Icon size={14} strokeWidth={2} color={color.ink[500]} /> : null}
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

export default function EditResultScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { projectId } = route.params;
  useAutoSave({ projectId, step: 'EDITING' });

  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: result, isLoading, isError, refetch } = useEditResult(projectId);

  /*
   * 시안 V4: 내보내기가 이 화면에서 끝납니다(옛 Outputs·게시 화면 없음).
   * 15.1 파일은 편집이 끝나면 바로 만들어 두고, 사장님은 받거나 공유하기만 합니다.
   */
  const createOutputs = useCreateOutputs(projectId);
  const { data: outputs } = useOutputs(projectId);
  const { saving, saved, save } = useSaveToGallery();

  /**
   * "내보내기" — 완성 영상을 인스타·유튜브 등 다른 앱으로 보냅니다.
   *
   * 🔴 2026-08-26 — 눌러도 아무 일이 없던 원인
   *    `Share.share({ message, url })` 을 쓰고 있었는데 **안드로이드의 RN Share 는
   *    `url` 을 통째로 무시합니다.** 글자만 공유되고 영상은 안 갑니다. 게다가 캡션이
   *    비어 있으면 `message` 가 빈 문자열이라 Share 가 예외를 던지는데
   *    `.catch(() => {})` 로 삼켜서 **정말 아무 일도 일어나지 않았습니다.**
   *
   * ✅ 2026-08-27 — `expo-sharing` 을 넣고 **파일째 넘기도록** 고쳤습니다(빌드 1.0.1).
   *    자세한 내용은 `lib/useShareVideo.ts` 머리말에 있습니다.
   *
   * 공유가 불가능한 환경(웹 QA · 공유 대상이 없는 기기)이면 아래 `fallback` 으로
   * 떨어집니다 — 사장님이 실제로 밟던 순서를 대신 해 주는 것입니다.
   *
   *   ① 사진첩에 저장하고
   *   ② 올릴 문구를 클립보드에 복사한 뒤
   *   ③ 어디서 이어서 하면 되는지 알립니다
   *
   * 조용히 실패하지 않는 것이 핵심입니다 — 저장이 안 되면 그 이유가 그대로 뜹니다.
   */
  const { sharing, share } = useShareVideo();
  const exportToApps = async (videoUrl?: string | null, fileKey?: string | number) => {
    const caption = [postTitle, postBody].filter(Boolean).join('\n\n');
    await share({
      videoUrl,
      fileKey,
      caption,
      // 공유가 불가능한 환경이면 예전 길로 — 저장 + 문구 복사 + 안내
      fallback: async () => {
        await save(videoUrl, fileKey);
        if (caption) await Clipboard.setStringAsync(caption);
        Alert.alert(
          '사진첩에 저장했습니다',
          caption
            ? '올릴 문구도 복사해 두었습니다.\n인스타그램·유튜브 앱에서 사진첩의 영상을 고르고 문구를 붙여넣어 주세요.'
            : '인스타그램·유튜브 앱에서 사진첩의 영상을 골라 올려 주세요.'
        );
      },
    });
  };

  const ready = outputs?.outputs?.find((o) => o.renderStatus === 'COMPLETED');
  const kit = outputs?.publishKit;
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current || !result || (outputs?.outputs?.length ?? 0) > 0) return;
    requested.current = true;
    createOutputs.mutate(['INSTAGRAM']);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, outputs?.outputs?.length]);

  /** 제목과 본문은 서버 계약에서 분리해 받으며, 수정값은 기기에만 남습니다. */
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !kit) return;
    seeded.current = true;
    const tags = (kit.hashtags ?? []).map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
    setPostTitle(kit.title ?? '');
    setPostBody([kit.caption?.trim(), tags].filter(Boolean).join('\n\n'));
  }, [kit]);

  // 명세 14.2 preview_video_url — 완성본을 직접 보여줍니다.
  const player = useVideoPlayer(result?.previewVideoUrl ?? null, (p) => {
    p.loop = true;
  });

  const goHome = () => rootNav.navigate('Main', { screen: 'HomeFeed' });
  /*
   * 시안은 뒤로가기가 편집 화면으로 갑니다. 우리는 Render 가 이 화면으로 replace 되어
   * 스택에 남아 있지 않습니다 — 되돌리면 렌더를 처음부터 다시 돌리게 되므로
   * 스택에 있는 이전 화면으로 가고, 없으면 홈으로 보냅니다.
   */
  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : goHome());

  if (isError || (!isLoading && !result)) {
    return (
      <Screen scroll={false} padded={false} edges={['top']} background={color.surface}>
        <ExportHeader onBack={goBack} />
        <View style={styles.stateBody}>
          <EmptyState
            title="영상 정보를 불러오지 못했습니다"
            description="촬영본은 그대로 있습니다."
          />
          <Button label="다시 시도" onPress={() => refetch()} />
          <Button
            label="다시 만들기"
            variant="quiet"
            size="small"
            onPress={() => navigation.replace('Render', { projectId })}
          />
        </View>
      </Screen>
    );
  }

  if (isLoading || !result) {
    return (
      <Screen scroll={false} padded={false} edges={['top']} background={color.surface}>
        <ExportHeader onBack={goBack} />
        <Loading label="영상을 불러오는 중" />
      </Screen>
    );
  }

  /**
   * 음원 정보 (명세 15.1 `publish_kit.track`).
   *
   * 🔴 2026-08-26 — "음원 정보가 안 보인다" 는 지적
   *    곡명(`title`)이 있을 때만 카드를 그리고 있었습니다. 그런데 `track.mode` 가
   *    **SUGGESTED** 면 곡이 정해진 게 아니라 **분위기(`mood`)만** 옵니다 —
   *    그 경우 title 이 null 이라 카드가 통째로 사라졌습니다.
   *    실제로 서버 스키마(`TrackInfo`)는 `mode · title · artist · start_sec ·
   *    end_sec · mood` 를 주고, 챌린지가 아닌 포맷은 mood 만 채웁니다.
   *
   *    → **있는 것을 있는 만큼** 보여줍니다.
   *         FIXED     곡명 - 아티스트  (+ 구간이 있으면 구간 카드)
   *         SUGGESTED "이런 분위기의 음원" + mood
   *       그래도 아무 값이 없으면 카드를 만들지 않습니다(지어내지 않습니다).
   *
   *    `post_note`(음원 붙이는 절차 안내)도 있으면 함께 보여줍니다. 저작권 때문에
   *    배경음악을 영상에 입히지 않으므로, 사장님이 플랫폼에서 직접 붙일 때
   *    그 안내가 실제로 필요한 값입니다.
   */
  const track = kit?.track ?? null;
  const trackName = track ? [track.title, track.artist].filter(Boolean).join(' - ') : '';
  const trackSearchKeyword = track?.searchKeyword ?? '';
  const trackMood = track && !trackName ? (track.mood ?? '') : '';
  const trackSegment =
    track && track.startSec !== null && track.endSec !== null
      ? `${clock(track.startSec)} ~ ${clock(track.endSec)} 구간 사용`
      : '';
  const postNote = kit?.postNote ?? '';

  return (
    <Screen scroll={false} padded={false} edges={['top']} background={color.surface}>
      <ExportHeader onBack={goBack} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          // 시안 pb-10(40). 안전영역이 더 크면 그쪽을 씁니다 — Screen 이 먹으면 40 위에 34 가 더 붙습니다.
          { paddingBottom: Math.max(insets.bottom, space[10]) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/*
          시안: mx-auto mb-5 aspect-[9/16] w-[62%] rounded-[20px]
                border-hairline/80 bg-hairline shadow-[0_12px_36px_-8px_rgba(15,23,42,.28)]
          시안은 자리표시자지만 우리는 실제 완성본을 보여줍니다 — 뭐가 만들어졌는지
          모르고 올리면 안 되기 때문입니다(명세 14.2 가 preview_video_url 을 주는 이유).
        */}
        <View style={styles.preview}>
          {result.previewVideoUrl ? (
            <VideoView
              style={StyleSheet.absoluteFill}
              player={player}
              contentFit="contain"
              nativeControls
            />
          ) : (
            <Text style={styles.previewText}>완성된 숏폼</Text>
          )}
        </View>

        {/* 시안: mb-6 flex gap-3 — 미리보기 바로 아래, h-12 두 개 */}
        <View style={styles.actionRow}>
          <Button
            label={saved ? '저장됨' : '기기에 다운로드'}
            variant="secondary"
            icon={Download}
            loading={saving}
            disabled={!ready}
            style={styles.actionBtn}
            onPress={() => ready && save(ready.videoUrl, ready.id)}
          />
          <Button
            label={sharing ? '준비 중…' : '내보내기'}
            icon={Upload}
            disabled={!ready || sharing}
            style={styles.actionBtn}
            onPress={() => ready && exportToApps(ready.videoUrl, ready.id)}
          />
        </View>

        {/* 시안: space-y-3 카드 묶음 */}
        <View style={styles.cards}>
          {/* 곡이 정해진 포맷 — 시안: ♪ 음원 정보 + [복사] */}
          {trackName ? (
            <Card style={styles.card}>
              <CardLabel icon={Music2}>음원 정보</CardLabel>
              <View style={styles.trackRow}>
                <Text style={styles.value}>{trackName}</Text>
                <CopyBtn value={trackName} label="음원 정보" />
              </View>
            </Card>
          ) : null}

          {trackSearchKeyword ? (
            <Card style={styles.card}>
              <CardLabel icon={Music2}>음원 검색 키워드</CardLabel>
              <View style={styles.trackRow}>
                <Text style={styles.value}>{trackSearchKeyword}</Text>
                <CopyBtn value={trackSearchKeyword} label="음원 검색 키워드" />
              </View>
            </Card>
          ) : null}

          {/* 곡 대신 분위기만 오는 포맷(SUGGESTED) — 예전에는 이 경우 카드가 통째로 없었습니다 */}
          {trackMood ? (
            <Card style={styles.card}>
              <CardLabel icon={Music2}>어울리는 음원</CardLabel>
              <View style={styles.trackRow}>
                <Text style={styles.value}>{trackMood}</Text>
                <CopyBtn value={trackMood} label="어울리는 음원" />
              </View>
            </Card>
          ) : null}

          {trackSegment ? (
            <Card style={styles.card}>
              <CardLabel icon={Clock}>음원 사용 구간</CardLabel>
              <Text style={styles.value}>{trackSegment}</Text>
              {/* 원곡 기준 위치라는 것을 짚어 줍니다 — 안 그러면 완성 영상 기준으로 읽습니다 */}
              <Text style={styles.hint}>원곡에서의 위치입니다. 올릴 때 이 지점으로 맞춰 주세요.</Text>
            </Card>
          ) : null}

          {/* 음원을 붙이는 절차 안내 (15.1 post_note) */}
          {postNote ? (
            <Card style={styles.card}>
              <CardLabel icon={Info}>음원 넣는 법</CardLabel>
              <Text style={styles.value}>{postNote}</Text>
            </Card>
          ) : null}

          <Card style={styles.card}>
            <View style={styles.labelBetween}>
              <Text style={styles.label}>AI 게시글 제목</Text>
              <CopyBtn value={postTitle} label="AI 게시글 제목" />
            </View>
            {/* 시안: textarea rows=2 — 14px · leading-relaxed(21) · p-3 */}
            <TextInput
              value={postTitle}
              onChangeText={setPostTitle}
              multiline
              style={[styles.textArea, styles.textAreaTitle]}
              accessibilityLabel="AI 게시글 제목"
            />
          </Card>

          <Card style={styles.card}>
            <View style={styles.labelBetween}>
              <Text style={styles.label}>AI 게시글 내용</Text>
              <CopyBtn value={postBody} label="AI 게시글 내용" />
            </View>
            {/* 시안: textarea rows=9 */}
            <TextInput
              value={postBody}
              onChangeText={setPostBody}
              multiline
              style={[styles.textArea, styles.textAreaBody]}
              accessibilityLabel="AI 게시글 내용"
            />
          </Card>
        </View>

        {/* 시안: mt-6 w-full py-2 · 14 semibold · slate-muted */}
        <Pressable
          accessibilityRole="button"
          onPress={goHome}
          style={({ pressed }) => [styles.homeBtn, pressTap(pressed, 'button')]}
        >
          <Text style={styles.homeLabel}>홈으로 돌아가기</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 값 아래 붙는 한 줄 설명 (음원 구간이 원곡 기준이라는 것 등)
  hint: { ...theme.text.caption, marginTop: space[1], color: color.ink[500] },
  flex: { flex: 1 },

  // 시안 header: px-4 pb-3 pt-[62px] gap-2 (62 - 상태바 54 = 8)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[2],
    paddingBottom: space[3],
  },
  // 시안: -ml-1.5 로 아이콘 광학 정렬 (36 원형 안의 chevron)
  headerBack: {
    width: 36,
    height: 36,
    // 시안에 음수 여백 없음 — 제목이 뒤로가기 옆에 붙는 헤더입니다 (FaqScreen 헤더 규칙 주석 참고)
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 시안 스크롤 영역: px-4 pb-10
  // 시안: px-4 pb-10 (하단은 화면에서 안전영역과 함께 계산)
  scroll: { paddingHorizontal: space[4] },

  preview: {
    alignSelf: 'center',
    width: '62%',
    aspectRatio: 9 / 16,
    marginBottom: space[5],
    borderRadius: radius.xl,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    // 시안 bg-hairline
    backgroundColor: color.ink[200],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.elevation('export'),
  },
  // 시안: 13px medium · slate-muted · 가운데
  previewText: { ...text.caption, paddingHorizontal: space[6], textAlign: 'center' },

  actionRow: { flexDirection: 'row', gap: space[3], marginBottom: space[6] },
  // 시안 flex-1. 문구가 길어 기본 좌우 패딩(20)이면 잘립니다.
  actionBtn: { flex: 1, paddingHorizontal: space[2] },

  cards: { gap: space[3] },
  // 시안 카드 내부 간격은 mb-2. Card 기본 gap(12)보다 좁습니다.
  card: { gap: space[2] },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },
  labelBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // 시안: 12 semibold · slate-muted
  label: text.label,
  // 시안: 14 medium · text-ink · leading-relaxed
  value: { ...text.bodySmall, flex: 1, color: color.ink[900] },
  trackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },

  // 시안 CopyBtn: h-8 rounded-lg bg-[#F1F5F9] px-2.5 gap-1
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: 32,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    // 시안 #F1F5F9. 토큰에 없어 가장 가까운 surface(#F8FAFC)를 씁니다.
    backgroundColor: color.surface,
  },
  copyLabel: { ...text.label, color: color.brand[600] },

  // 시안 textarea: bg-surface rounded-xl p-3 · 14 · leading-relaxed
  textArea: {
    ...text.bodySmall,
    color: color.ink[900],
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space[3],
    textAlignVertical: 'top',
  },
  // rows=2 · rows=9 → 줄높이 21 × 줄수 + 상하 패딩 24
  textAreaTitle: { minHeight: 21 * 2 + space[3] * 2 },
  textAreaBody: { minHeight: 21 * 9 + space[3] * 2 },

  homeBtn: { marginTop: space[6], paddingVertical: space[2] },
  homeLabel: { ...text.bodySmall, color: color.ink[500], textAlign: 'center', fontWeight: '600' },

  // 불러오기 실패 화면 — 시안에 없는 상태라 앱 기본 배치를 씁니다.
  stateBody: { flex: 1, justifyContent: 'center', paddingHorizontal: space[5], gap: space[3] },
});
