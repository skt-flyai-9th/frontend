/**
 * S16.1.1 공유 핸드오프 · 명세 16.2
 *
 * MVP 는 HANDOFF 만 씁니다. 앱이 대신 게시하지 않고 파일과 문구만 넘깁니다.
 * 계정 비밀번호나 게시 권한을 요구하지 않는다는 점을 화면에서 분명히 알립니다.
 */
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSaveToGallery } from '../../../lib/useSaveToGallery';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner } from '../../../ui/Feedback';
import { color, radius, space, text } from '../../../design/theme';
import { useOutputs, usePublish } from '../../../api/queries/edit';
import type { SnsPlatform } from '../../../api/schema/types';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'Publish'>;

const PLATFORMS: { key: SnsPlatform; label: string; scheme: string; steps: string[] }[] = [
  {
    key: 'INSTAGRAM',
    label: '인스타그램 릴스',
    scheme: 'instagram://',
    steps: ['음악 고르기', '커버·문구 확인', '공유 누르기'],
  },
  {
    key: 'YOUTUBE',
    label: '유튜브 쇼츠',
    scheme: 'youtube://',
    steps: ['영상 올리기', '제목·설명 붙여넣기', '공개로 바꾸기'],
  },
];

export default function PublishScreen({ navigation, route }: Props) {
  const { projectId, outputId } = route.params;
  const { data } = useOutputs(projectId);
  const publish = usePublish();
  const [copied, setCopied] = useState<string | null>(null);
  const { saving, saved, save } = useSaveToGallery();

  const kit = data?.publishKit;

  /**
   * 연동된 계정. 없어도 핸드오프는 됩니다.
   * MVP 에서는 OAuth 화면을 만들지 않아 항상 undefined 입니다.
   * (BE 확인항목 참고 — 연동 없이 성과 수집이 가능한지 확인 필요)
   */
  const connection = undefined as { id: number } | undefined;

  const copyCaption = async () => {
    if (!kit) return;
    await Clipboard.setStringAsync(`${kit.caption}\n\n${kit.hashtags.join(' ')}`);
    setCopied('done');
    setTimeout(() => setCopied(null), 2000);
  };

  /**
   * 완성 영상을 사진첩에 저장합니다. 로직은 lib/useSaveToGallery 에 있습니다
   * (완성 파일 화면과 공유 — 한쪽만 고쳐지는 사고를 막습니다).
   *
   * 핸드오프 방식이라 사장님이 인스타 앱에서 직접 영상을 골라야 하는데,
   * 사진첩에 없으면 고를 수가 없습니다. 이 버튼이 없으면 게시 자체가 막힙니다.
   */
  const saveToLibrary = () => {
    const output = data?.outputs.find((o) => o.id === outputId) ?? data?.outputs[0];
    return save(output?.videoUrl, outputId);
  };

  const openApp = async (p: (typeof PLATFORMS)[number]) => {
    publish.mutate(
      {
        outputId,
        platform: p.key,
        // MVP 는 핸드오프만 씁니다. 앱이 대신 게시하지 않습니다.
        publishMode: 'HANDOFF',
        // 명세 16.2 body. 연동 계정이 있으면 함께 보냅니다.
        // 핸드오프라도 서버가 어느 계정 게시물인지 알아야 성과를 붙일 수 있습니다.
        snsConnectionId: connection?.id,
        postCaption: kit?.caption,
        postHashtags: kit?.hashtags.join(' '),
      },
      {
        onSuccess: async (post) => {
          const can = await Linking.canOpenURL(p.scheme).catch(() => false);
          if (!can) {
            Alert.alert(
              `${p.label} 앱이 없습니다`,
              '영상을 사진첩에 저장해 두었습니다. 앱을 설치한 뒤 사진첩에서 올리시면 됩니다.'
            );
            return;
          }
          await Linking.openURL(p.scheme);
          // 명세: 핸드오프만으로 게시 완료 처리하지 않습니다.
          // 명세 16.2 는 sns_post_id 로 돌려줍니다 (16.3 조회의 id 와 키가 다릅니다)
          navigation.navigate('PostLink', { postId: post.snsPostId, platform: p.key });
        },
      }
    );
  };

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label={saved ? '사진첩에 저장했습니다' : '영상 사진첩에 저장하기'}
            variant="secondary"
            onPress={saveToLibrary}
            loading={saving}
            disabled={saved}
          />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="올리기" />

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>거의 다 됐습니다</Text>
        <Text style={text.bodySmall}>
          마지막 공유 버튼은 사장님이 직접 눌러야 합니다.
        </Text>
      </View>

      <Banner
        tone="info"
        title="Reals 가 대신 올리지 않습니다"
        description="계정 비밀번호나 게시 권한을 요구하지 않습니다. 앱을 열어 드리는 것까지만 합니다."
      />

      {kit && (
        <Card>
          <View style={styles.head}>
            <Text style={text.subheading}>같이 올릴 문구</Text>
            {copied && <Badge label="복사했습니다" tone="done" />}
          </View>
          <View style={styles.copyBlock}>
            <Text style={text.bodySmall}>{kit.caption}</Text>
            <Text style={[text.bodySmall, { color: color.brand[600] }]}>
              {kit.hashtags.join(' ')}
            </Text>
          </View>
          <Button label="문구 복사" variant="secondary" size="small" full={false} onPress={copyCaption} />
        </Card>
      )}

      {PLATFORMS.map((p) => (
        <Card key={p.key}>
          <Text style={text.subheading}>{p.label}</Text>
          <View style={{ gap: 2 }}>
            <Text style={text.micro}>여기서 하실 일</Text>
            {p.steps.map((s, i) => (
              <Text key={i} style={text.bodySmall}>
                {i + 1}. {s}
              </Text>
            ))}
          </View>
          <Button label="앱 열기" size="small" onPress={() => openApp(p)} loading={publish.isPending} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  copyBlock: { backgroundColor: color.ink[50], padding: space[4], borderRadius: radius.md, gap: space[1] },
});
