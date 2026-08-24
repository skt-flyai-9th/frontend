/**
 * S16.7.1 게시물 연결 · 명세 16.3
 *
 * 왜 이 화면이 필요한가
 *   핸드오프 방식이라 앱이 대신 올리지 않습니다.
 *   그래서 "우리가 만든 영상"과 "실제 올라간 게시물"을 이어 줄 키가 없습니다.
 *   이게 없으면 성과 지표가 엉뚱한 영상에 붙거나 아예 안 붙습니다.
 *
 * ⚠️ external_post_id 는 URL 이 아니라 게시물 ID 입니다.
 *    명세 예시: "17998877665544332"
 *    사장님은 공유 버튼으로 URL 을 복사하므로 여기서 ID 를 뽑아 보냅니다.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Badge } from '../../../ui/Chip';
import { Banner } from '../../../ui/Feedback';
import { Field } from '../../../ui/Field';
import { color, radius, space, text } from '../../../design/theme';
import { extractPostId, useLinkPost, useSnsPost } from '../../../api/queries/edit';
import type { CreateStackParamList, RootStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'PostLink'>;

const LABEL = { INSTAGRAM: '인스타그램', YOUTUBE: '유튜브', NAVER: '네이버 클립' } as const;

const HOWTO: Record<string, string[]> = {
  INSTAGRAM: ['올린 릴스를 엽니다', '오른쪽 위 ⋯ 를 누릅니다', '"링크 복사"를 누릅니다'],
  YOUTUBE: ['올린 쇼츠를 엽니다', '공유를 누릅니다', '"링크 복사"를 누릅니다'],
  NAVER: ['올린 클립을 엽니다', '공유를 누릅니다', '"링크 복사"를 누릅니다'],
};

export default function PostLinkScreen({ route }: Props) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { postId, platform } = route.params;

  const { data: post } = useSnsPost(postId);
  const link = useLinkPost();

  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const postIdValue = url.trim() ? extractPostId(url) : '';
  const looksValid = postIdValue.length >= 5;
  const alreadyLinked = post?.postStatus === 'LINKED';

  const pasteFromClipboard = async () => {
    const v = await Clipboard.getStringAsync();
    if (v) {
      setUrl(v);
      setError(null);
    }
  };

  const submit = () => {
    if (!looksValid) {
      setError('주소가 짧습니다. 복사한 주소를 그대로 붙여넣어 주세요.');
      return;
    }
    link.mutate(
      { postId, externalPostId: postIdValue },
      {
        onSuccess: () => // 반응 보기는 마이 탭 하위로 이사했습니다 (2026-08-23 탭 재구성)
        nav.replace('Main', { screen: 'My', params: { screen: 'Performance' } }),
        onError: () => setError('연결하지 못했습니다. 주소를 확인하고 다시 시도해 주세요.'),
      }
    );
  };

  if (alreadyLinked) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button
              label="반응 보러 가기"
              onPress={() => // 반응 보기는 마이 탭 하위로 이사했습니다 (2026-08-23 탭 재구성)
        nav.replace('Main', { screen: 'My', params: { screen: 'Performance' } })}
            />
          </BottomAction>
        }
      >
        <AppBar title="올린 영상 연결" />
        <Banner
          tone="done"
          title="이미 연결돼 있습니다"
          description="조회수와 반응을 반응 보기 탭에서 확인할 수 있습니다."
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="연결하기"
            onPress={submit}
            disabled={!url.trim()}
            loading={link.isPending}
          />
          <Button
            label="아직 안 올렸어요"
            variant="quiet"
            size="small"
            onPress={() => nav.replace('Main', { screen: 'HomeFeed' })}
          />
        </BottomAction>
      }
    >
      <AppBar title="올린 영상 연결" />

      <View style={{ gap: space[2] }}>
        <View style={styles.head}>
          <Text style={text.title}>{LABEL[platform]}에 올리셨나요?</Text>
          {post?.postStatus === 'PENDING_LINK' && <Badge label="연결 대기" tone="warn" />}
        </View>
        <Text style={text.bodySmall}>
          주소를 붙여넣으면 조회수와 반응을 여기서 볼 수 있습니다.
        </Text>
      </View>

      <Banner
        tone="info"
        title="주소는 이렇게 가져옵니다"
        description={HOWTO[platform].map((s, i) => `${i + 1}. ${s}`).join('\n')}
      />

      <Field
        label="게시물 주소"
        value={url}
        onChangeText={(v) => {
          setUrl(v);
          setError(null);
        }}
        placeholder="https://"
        autoCapitalize="none"
        autoCorrect={false}
        error={error ?? undefined}
      />

      <Button
        label="복사한 주소 붙여넣기"
        variant="secondary"
        size="small"
        full={false}
        onPress={pasteFromClipboard}
      />

      {/* 뭘 보낼지 미리 보여줍니다. 잘못 붙여넣은 걸 바로 알 수 있습니다. */}
      {url.trim().length > 0 && (
        <View style={styles.previewBox}>
          <Text style={text.micro}>이 게시물로 연결합니다</Text>
          <Text style={[text.bodySmall, { fontFamily: 'monospace' }]}>{postIdValue}</Text>
          {!looksValid && (
            <Text style={[text.caption, { color: color.warn[500] }]}>
              주소가 맞는지 확인해 주세요.
            </Text>
          )}
        </View>
      )}

      <Text style={text.caption}>
        나중에 하셔도 됩니다. 반응 보기 탭에서 다시 연결할 수 있습니다.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[2] },
  previewBox: {
    backgroundColor: color.ink[50],
    padding: space[4],
    borderRadius: radius.md,
    gap: space[1],
  },
});
