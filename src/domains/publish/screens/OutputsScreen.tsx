/**
 * S15.4.1 최종 출력 + 게시자료 · 명세 15.1
 *
 * ⚠️ publish_kit 은 POST 응답에만 있습니다 (GET 에는 없음).
 *    캡션·해시태그는 이 앱이 사장님에게 주는 핵심 가치라
 *    캐시에서 사라지지 않도록 useCreateOutputs 가 setQueryData 로 저장합니다.
 *
 * 커버 이미지를 보여주는 이유
 *   릴스는 커버가 첫인상입니다. 어떤 장면이 썸네일이 될지 모르고 올리면
 *   엉뚱한 프레임이 대표 이미지가 됩니다.
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy, Download, Music2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import { OptionRow } from '../../../ui/Field';
import { clock } from '../../../lib/format';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useCreateOutputs, useOutputs } from '../../../api/queries/edit';
import { useAutoSave } from '../../../lib/useAutoSave';
import { useSaveToGallery } from '../../../lib/useSaveToGallery';
import type { TargetPlatform } from '../../../api/schema/types';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'Outputs'>;

const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: '인스타그램용',
  YOUTUBE: '유튜브용',
  NAVER: '네이버 클립용',
};

const CHOICES: { key: TargetPlatform; title: string; description: string }[] = [
  { key: 'INSTAGRAM', title: '인스타그램 릴스', description: '가장 많이 쓰는 곳입니다' },
  { key: 'YOUTUBE', title: '유튜브 쇼츠', description: '검색으로 오래 노출됩니다' },
];

export default function OutputsScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  useAutoSave({ projectId, step: 'PUBLISH' });

  const create = useCreateOutputs(projectId);
  const { data, isLoading } = useOutputs(projectId);

  // 명세 15.1 body 는 배열입니다. 어디에 올릴지 사장님이 고릅니다.
  const [platforms, setPlatforms] = useState<TargetPlatform[]>(['INSTAGRAM']);
  const [requested, setRequested] = useState(false);
  const [copied, setCopied] = useState<'caption' | 'track' | null>(null);
  // 저장 로직은 게시 화면과 공유합니다 (lib/useSaveToGallery).
  const { saving, saved, save } = useSaveToGallery();

  const outputs = data?.outputs ?? [];
  const kit = data?.publishKit;
  const ready = outputs.find((o) => o.renderStatus === 'COMPLETED');
  const pending = outputs.filter((o) => o.renderStatus !== 'COMPLETED');

  // 이미 만들어진 파일이 있으면 다시 만들지 않습니다.
  useEffect(() => {
    if (isLoading || requested || outputs.length > 0) return;
    setRequested(true);
    create.mutate(platforms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, outputs.length]);

  const toggle = (p: TargetPlatform) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  if (create.isError && outputs.length === 0) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => create.mutate(platforms)} />
          </BottomAction>
        }
      >
        <AppBar title="완성 파일" />
        <EmptyState
          title="파일을 만들지 못했습니다"
          description="영상은 그대로 있습니다. 다시 시도해 주세요."
        />
      </Screen>
    );
  }

  if ((isLoading || create.isPending) && outputs.length === 0) {
    return (
      <Screen>
        <AppBar title="완성 파일" />
        <Loading label="파일을 만드는 중" />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="올리러 가기"
            onPress={() => ready && navigation.navigate('Publish', { projectId, outputId: ready.id })}
            disabled={!ready}
          />
          {!ready && (
            // 막을 거면 이유를 씁니다. 눌러도 반응 없는 화면을 만들지 않습니다.
            <Text style={[text.caption, { textAlign: 'center', color: color.ink[500] }]}>
              영상이 다 만들어지면 올릴 수 있어요.
            </Text>
          )}
        </BottomAction>
      }
    >
      <AppBar title="내보내기" onBack={() => navigation.goBack()} />

      {/*
        완성본 미리보기.
        커버 이미지가 곧 릴스의 첫인상이라 크게 보여줍니다.
        재생은 하지 않습니다 — 여기서 영상을 틀면 아직 렌더 중인 파일을
        건드리게 되고, 사장님은 "다 됐나?" 만 확인하면 되기 때문입니다.
      */}
      <View style={styles.previewWrap}>
        {ready?.coverImageUrl ? (
          <Image source={{ uri: ready.coverImageUrl }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={[styles.preview, styles.previewEmpty]}>
            <Text style={[text.bodySmall, { color: color.ink[500] }]}>
              {ready ? '완성된 숏폼' : '영상을 만들고 있어요'}
            </Text>
          </View>
        )}
        {ready && (
          <View style={styles.doneBadge}>
            <Check size={14} strokeWidth={3} color={color.paper} />
            <Text style={[text.caption, { color: color.paper }]}>완성</Text>
          </View>
        )}
      </View>

      {/* 기기 저장 / 올리기 — 프로토타입과 같은 2버튼 구성 */}
      <View style={styles.actionRow}>
        <Button
          label={saved ? '저장됨' : '기기에 저장'}
          variant="secondary"
          onPress={() => save(ready?.videoUrl, ready?.id ?? projectId)}
          loading={saving}
          disabled={!ready}
          full={false}
          style={{ flex: 1 }}
        />
        <Button
          label="올리러 가기"
          onPress={() => ready && navigation.navigate('Publish', { projectId, outputId: ready.id })}
          disabled={!ready}
          full={false}
          style={{ flex: 1 }}
        />
      </View>

      {pending.length > 0 && (
        <Banner
          tone="info"
          title={`${pending.length}개를 아직 만들고 있습니다`}
          description="완성된 것부터 먼저 올리셔도 됩니다."
        />
      )}

      {outputs.map((o) => (
        <Card key={o.id}>
          <View style={styles.row}>
            {/* 커버 이미지 — 릴스의 첫인상입니다 */}
            {o.coverImageUrl ? (
              <Image source={{ uri: o.coverImageUrl }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={[styles.cover, styles.coverEmpty]}>
                <Text style={text.micro}>커버</Text>
              </View>
            )}

            <View style={{ flex: 1, gap: space[1] }}>
              <View style={styles.head}>
                <Text style={text.bodyStrong}>
                  {PLATFORM_LABEL[o.targetPlatform] ?? o.targetPlatform}
                </Text>
                <Badge
                  label={o.renderStatus === 'COMPLETED' ? '준비됨' : '만드는 중'}
                  tone={o.renderStatus === 'COMPLETED' ? 'done' : 'neutral'}
                />
              </View>

              {o.resolution ? <Text style={text.caption}>{o.resolution}</Text> : null}

              <Badge
                // 2026-08-24 확정: 배경음악은 안 입힙니다(항상 false). 현장음은 있으므로
                // '소리 없음' 은 거짓 — 올릴 때 음악을 붙인다는 사실을 라벨로 씁니다.
                label="음악은 올릴 때"
                tone={o.hasLicensedAudio ? 'brand' : 'neutral'}
              />
              <Text style={text.micro}>
                {o.hasLicensedAudio
                  ? '그대로 올려도 저작권 문제가 없습니다.'
                  : '플랫폼에서 직접 음악을 고를 때 쓰세요.'}
              </Text>
            </View>
          </View>
        </Card>
      ))}

      {/* 다른 플랫폼용도 추가로 만들 수 있게 */}
      <Card>
        <Text style={text.subheading}>다른 곳에도 올리시겠어요?</Text>
        <Text style={text.caption}>고른 곳의 규격으로 파일을 더 만듭니다.</Text>
        <View style={{ gap: space[3], marginTop: space[2] }}>
          {CHOICES.filter((c) => !outputs.some((o) => o.targetPlatform === c.key)).map((c) => (
            <OptionRow
              key={c.key}
              title={c.title}
              description={c.description}
              selected={platforms.includes(c.key)}
              onPress={() => toggle(c.key)}
            />
          ))}
        </View>
        {CHOICES.some((c) => !outputs.some((o) => o.targetPlatform === c.key)) && (
          <Button
            label="추가로 만들기"
            variant="secondary"
            size="small"
            onPress={() => create.mutate(platforms)}
            loading={create.isPending}
            disabled={platforms.length === 0}
          />
        )}
      </Card>

      {/*
        음원 카드 — 명세 15.1 track (2026-08-24 확정).

        저작권 때문에 배경음악은 영상에 입히지 않습니다(플랫폼 라이선스는 그 안에서만
        유효). 사장님이 올릴 때 직접 붙이고, 우리는 무슨 곡을 원곡 몇 초부터인지
        알려드립니다. ⚠️ 완성 영상이 무음은 아닙니다 — 현장음·목소리는 그대로 있어서
        음원 볼륨을 낮추라는 안내가 필요합니다.

        track 이 null 이거나 핵심 값이 비어 있으면 카드를 숨깁니다(명세 지시).
        실서버는 당분간 null 을 줍니다(곡명 식별 주체 확정 대기) — 그동안은
        카드가 안 보이는 게 정상입니다.
      */}
      {(() => {
        const track = kit?.track;
        const fixedOk = track?.mode === 'FIXED' && !!track.title;
        const suggestedOk = track?.mode === 'SUGGESTED' && !!track.mood;
        if (!fixedOk && !suggestedOk) return null;

        return (
          <Card>
            <View style={styles.cardHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <Music2 size={16} strokeWidth={2} color={color.ink[500]} />
                <Text style={text.subheading}>배경음악</Text>
              </View>
              {fixedOk && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="곡 검색어 복사"
                  onPress={async () => {
                    await Clipboard.setStringAsync(`${track!.title} ${track!.artist ?? ''}`.trim());
                    setCopied('track');
                    setTimeout(() => setCopied(null), 2000);
                  }}
                  style={({ pressed }) => [styles.copyBtn, pressed && { opacity: theme.opacity.pressed }]}
                >
                  {copied === 'track' ? (
                    <Check size={14} strokeWidth={2.5} color={color.brand[600]} />
                  ) : (
                    <Copy size={14} strokeWidth={2} color={color.brand[600]} />
                  )}
                  <Text style={[text.caption, { color: color.brand[600] }]}>
                    {copied === 'track' ? '복사됨' : '검색어 복사'}
                  </Text>
                </Pressable>
              )}
            </View>

            {fixedOk ? (
              <>
                <Text style={text.heading}>
                  {track!.title}
                  {track!.artist ? ` — ${track!.artist}` : ''}
                </Text>
                {track!.startSec != null && (
                  <>
                    <Text style={text.body}>
                      원곡 {clock(track!.startSec)}
                      {track!.endSec != null ? ` ~ ${clock(track!.endSec)}` : ''} 구간을 씁니다.
                    </Text>
                    {/* start_sec 은 원곡 위치입니다. 안 밀면 인트로만 깔려 전혀 다른 영상이 됩니다. */}
                    <Text style={[text.bodySmall, { color: color.brand[700] }]}>
                      음악을 붙일 때 시작점을 {clock(track!.startSec)} 로 밀어 주세요. 그대로 두면
                      노래 처음부터 깔려서 챌린지에서 듣던 부분이 안 나옵니다.
                    </Text>
                  </>
                )}
              </>
            ) : (
              <Text style={text.body}>
                이 영상에는 「{track!.mood}」 느낌의 음악이 어울립니다. 올릴 때 그 앱의 음악
                탭에서 골라 붙여 주세요.
              </Text>
            )}

            <Text style={[text.caption, { color: color.ink[500] }]}>
              영상에 현장 소리와 목소리가 들어 있어요. 음악 소리는 낮게 깔아야 말이 안 묻힙니다.
            </Text>
            {kit?.postNote ? (
              <Text style={[text.caption, { color: color.ink[400] }]}>{kit.postNote}</Text>
            ) : null}
          </Card>
        );
      })()}

      {kit && (
        <Card>
          <View style={styles.cardHead}>
            <Text style={text.subheading}>같이 올릴 문구</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="문구 복사"
              onPress={async () => {
                await Clipboard.setStringAsync(`${kit.caption}\n\n${kit.hashtags.join(' ')}`);
                setCopied('caption');
                setTimeout(() => setCopied(null), 2000);
              }}
              style={({ pressed }) => [styles.copyBtn, pressed && { opacity: theme.opacity.pressed }]}
            >
              {copied === 'caption' ? (
                <Check size={14} strokeWidth={2.5} color={color.brand[600]} />
              ) : (
                <Copy size={14} strokeWidth={2} color={color.brand[600]} />
              )}
              <Text style={[text.caption, { color: color.brand[600] }]}>
                {copied === 'caption' ? '복사됨' : '복사'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.copyBlock}>
            <Text style={text.bodySmall}>{kit.caption}</Text>
            <Text style={[text.bodySmall, { color: color.brand[600] }]}>
              {kit.hashtags.join(' ')}
            </Text>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3] },
  previewWrap: { position: 'relative' },
  preview: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: radius.lg,
    backgroundColor: color.ink[100],
  },
  previewEmpty: { alignItems: 'center', justifyContent: 'center' },
  doneBadge: {
    position: 'absolute',
    top: space[3],
    right: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    backgroundColor: color.done[500],
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  actionRow: { flexDirection: 'row', gap: space[3] },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    backgroundColor: color.brand[50],
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    minHeight: 40,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cover: {
    width: 72,
    aspectRatio: 9 / 16,
    borderRadius: radius.md,
    backgroundColor: color.ink[100],
  },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  copyBlock: { backgroundColor: color.ink[50], padding: space[4], borderRadius: radius.md, gap: space[1] },
});
