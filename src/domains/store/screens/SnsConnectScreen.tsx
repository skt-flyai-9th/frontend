/**
 * S16.1.1 SNS 계정 연동 / 해제 · 명세 16.1
 *
 * 연동이 왜 필요한가
 *   앱이 대신 게시하지는 않습니다(핸드오프). 그런데도 계정을 연결하는 이유는
 *   **성과 지표를 받아오기 위해서**입니다. 연동이 없으면 조회수·저장수를
 *   플랫폼에서 가져올 수 없어 "반응 보기" 탭이 비어 있게 됩니다.
 *
 * 사장님에게 분명히 알려야 할 것
 *   - 비밀번호를 우리가 보관하지 않습니다
 *   - 우리가 대신 글을 올리지 않습니다
 *   - 언제든 연결을 끊을 수 있습니다
 *
 * OAuth — A 방식 (2026-08-23 명세 개정, 🔴 POST /sns-connections 제거)
 *
 *   ① GET /sns-connections/authorize?platform=  →  { authorize_url }
 *   ② 앱이 그 URL 을 브라우저로 엽니다
 *   ③ 사장님 동의 → 플랫폼이 **서버** 콜백으로 리다이렉트. 토큰 교환·저장은 서버 몫
 *   ④ 앱이 브라우저에서 돌아온 것을 감지 → GET /sns-connections 재조회로 확인
 *
 * 앱에 App Secret 이 들어가지 않게 하려는 구조라, 앱은 URL 을 열고
 * 결과를 다시 물어보는 것 외에 아무것도 하지 않습니다.
 *
 * ⚠️ 딥링크는 쓰지 않습니다(기기·브라우저별 실패 가능성 때문에 양쪽 합의).
 *    그래서 "동의하고 왔는지" 를 앱이 알 방법이 없습니다. 포그라운드 복귀만
 *    감지해 목록을 다시 물어보고, 늘어났으면 성공으로 봅니다.
 *    동의하지 않고 닫고 온 경우도 복귀로 잡히므로, 그때는 목록이 그대로여서
 *    "연결되지 않았습니다" 안내가 나갑니다. (BE 확인 중 — 중간 상태 존재 여부)
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner } from '../../../ui/Feedback';
import { color, space, text } from '../../../design/theme';
import { ApiError } from '../../../api/http';
import { useSnsAuthorize, useDisconnectSns, useSnsConnections } from '../../../api/queries/edit';
import { formatDate } from '../../../api/schema/convert';
import type { SnsConnection, SnsPlatform } from '../../../api/schema/types';
import type { StoreStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<StoreStackParamList, 'SnsConnect'>;

const PLATFORMS: { key: SnsPlatform; title: string; description: string }[] = [
  {
    key: 'INSTAGRAM',
    title: '인스타그램',
    description: '릴스 조회수와 저장수를 받아옵니다',
  },
  {
    key: 'YOUTUBE',
    title: '유튜브',
    description: '쇼츠 조회수와 시청 시간을 받아옵니다',
  },
];

export default function SnsConnectScreen({ navigation }: Props) {
  const authorize = useSnsAuthorize();
  const disconnect = useDisconnectSns();

  /**
   * 명세 16.1 GET (2026-08-21 신설) — 연동 목록을 서버에서 받아옵니다.
   * 이전에는 목록 API 가 없어 화면 메모리(useState)에 들고 있었고,
   * 앱을 껐다 켜면 연동 상태가 사라졌습니다. 이제 서버가 진실입니다.
   * 성공/해제 반영은 훅의 invalidate 가 처리하므로 화면은 콜백에서
   * 상태를 직접 만지지 않습니다.
   */
  const { data: connections, isLoading: loadingConnections, refetch } = useSnsConnections();

  /**
   * 브라우저에 다녀왔는지 판단하기 위한 표시.
   * 연결 버튼을 눌러 브라우저를 연 순간에만 켜지고, 돌아와 확인하면 꺼집니다.
   */
  const waitingRef = useRef<SnsPlatform | null>(null);
  const [result, setResult] = useState<'ok' | 'none' | null>(null);

  // 포그라운드 복귀 감지 → 서버에 결과를 다시 물어봅니다.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || !waitingRef.current) return;
      const before = connections?.length ?? 0;
      const after = await refetch();
      const now = after.data?.length ?? 0;
      // 목록이 늘었으면 성공. 그대로면 동의하지 않고 닫고 온 것으로 봅니다.
      setResult(now > before ? 'ok' : 'none');
      waitingRef.current = null;
    });
    return () => sub.remove();
  }, [connections?.length, refetch]);

  const doConnect = (platform: SnsPlatform) => {
    Alert.alert(
      `${platform === 'INSTAGRAM' ? '인스타그램' : '유튜브'}에 연결할까요?`,
      '인터넷 창이 열립니다. 로그인하고 "허용"을 누른 뒤, 이 앱으로 돌아와 주세요.\n비밀번호는 우리가 보관하지 않습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '연결하기',
          onPress: () => {
            setResult(null);
            authorize.mutate(platform, {
              onSuccess: async (res) => {
                const can = await Linking.canOpenURL(res.authorizeUrl).catch(() => false);
                if (!can) {
                  // 조용히 실패하지 않습니다.
                  Alert.alert('인터넷 창을 열지 못했습니다', '잠시 후 다시 시도해 주세요.');
                  return;
                }
                // 여기서부터 복귀를 기다립니다.
                waitingRef.current = platform;
                await Linking.openURL(res.authorizeUrl);
              },
              // 실패는 아래 Banner 로 표시됩니다.
            });
          },
        },
      ]
    );
  };

  const doDisconnect = (c: SnsConnection) => {
    Alert.alert(
      '연결을 끊을까요?',
      '끊으면 이 계정의 조회수와 반응을 더 이상 받아오지 못합니다. 올린 영상은 그대로 남습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '연결 끊기',
          style: 'destructive',
          onPress: () =>
            disconnect.mutate(c.id),
        },
      ]
    );
  };

  return (
    <Screen
      footer={
        <BottomAction>
          <Button label="다 했어요" onPress={() => navigation.goBack()} />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="SNS 계정 연결" />

      {result === 'ok' && (
        <Banner
          tone="done"
          title="연결됐습니다"
          description="이제 이 계정의 조회수와 반응을 받아올 수 있습니다."
        />
      )}
      {result === 'none' && (
        <Banner
          tone="warn"
          title="아직 연결되지 않았습니다"
          description="인터넷 창에서 '허용'까지 누르셔야 연결됩니다. 다시 시도해 주세요."
        />
      )}

      {(authorize.isError || disconnect.isError) && (
        <Banner
          tone="danger"
          title={
            authorize.error instanceof ApiError &&
            (authorize.error.code === 'UNSUPPORTED_PLATFORM' ||
              authorize.error.code === 'SNS_NOT_CONFIGURED')
              ? '지금은 연동할 수 없습니다'
              : '처리하지 못했습니다'
          }
          description={
            /*
             * 명세 16.1 (2026-08-24): 400 UNSUPPORTED_PLATFORM / 503 SNS_NOT_CONFIGURED.
             * 둘 다 서버 쪽 설정 문제라 사장님이 뭘 해도 해결되지 않습니다(BE 확답).
             * 재시도 안내만 하고 다른 조치는 권하지 않습니다.
             */
            authorize.error instanceof ApiError && authorize.error.code === 'SNS_NOT_CONFIGURED'
              ? '준비가 덜 된 부분이 있어요. 잠시 후 다시 시도해 주세요.'
              : '잠시 후 다시 시도해 주세요.'
          }
        />
      )}

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>계정을 연결하면{'\n'}반응을 볼 수 있습니다</Text>
        <Text style={text.bodySmall}>
          조회수와 저장수를 자동으로 가져옵니다. 연결하지 않으셔도 영상은 만들 수 있습니다.
        </Text>
      </View>

      <Banner
        tone="info"
        title="비밀번호는 우리가 보관하지 않습니다"
        description="각 앱에서 직접 로그인하시고, 우리는 조회수만 받아옵니다. 대신 글을 올리지 않습니다."
      />

      {PLATFORMS.map((p) => {
        const linked = connections?.find((c) => c.snsPlatform === p.key);
        return (
          <Card key={p.key}>
            <View style={styles.head}>
              <Text style={text.subheading}>{p.title}</Text>
              {linked ? (
                <Badge label="연결됨" tone="done" />
              ) : loadingConnections ? (
                // 목록을 받기 전에 "연결 안 됨" 이라고 단정하지 않습니다.
                <Badge label="확인 중" />
              ) : (
                <Badge label="연결 안 됨" />
              )}
            </View>

            {linked ? (
              <>
                <Text style={text.bodySmall}>{linked.snsAccountName}</Text>
                <Text style={text.micro}>
                  {formatDate(linked.tokenExpiresAt)}까지 유효합니다
                </Text>
                <Button
                  label="연결 끊기"
                  variant="danger"
                  size="small"
                  full={false}
                  onPress={() => doDisconnect(linked)}
                  loading={disconnect.isPending}
                />
              </>
            ) : (
              <>
                <Text style={text.bodySmall}>{p.description}</Text>
                <Button
                  label="연결하기"
                  variant="secondary"
                  size="small"
                  full={false}
                  onPress={() => doConnect(p.key)}
                  loading={authorize.isPending}
                />
              </>
            )}
          </Card>
        );
      })}

      <Text style={[text.caption, { color: color.ink[400] }]}>
        연결은 언제든 끊을 수 있습니다. 끊어도 이미 올린 영상은 그대로 남습니다.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
