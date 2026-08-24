/** S02.2.1 기본정보 자동 채움 + S02.2.3 가져오기 진행상태 · 명세 2.3, 3.1, 3.2 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner, JobProgress, Loading } from '../../../ui/Feedback';
import { color, space, text } from '../../../design/theme';
import { useImportStatus, useMenus, useStore } from '../../../api/queries/store';
import { won } from '../../../lib/format';
import { formatDate } from '../../../api/schema/convert';
import { useAppState } from '../../../lib/appState';
import type { RootStackParamList, StoreSetupStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<StoreSetupStackParamList, 'StoreConfirm'>;

export default function StoreConfirmScreen({ route }: Props) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { storeId } = route.params;

  const { data: store, isLoading } = useStore(storeId);
  const { data: menus } = useMenus(storeId);
  const { data: importStatus, timedOut } = useImportStatus(storeId);
  const setStoreId = useAppState((s) => s.setStoreId);

  const importing =
    importStatus?.overallStatus === 'IN_PROGRESS' || importStatus?.overallStatus === 'PENDING';
  const doneCount = importStatus?.items.filter((i) => i.status === 'SUCCESS').length ?? 0;
  const totalCount = importStatus?.items.length ?? 0;
  const failed = importStatus?.items.filter((i) => i.status === 'FAILED') ?? [];

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="이 정보가 맞아요"
            onPress={() => {
              // 이 값이 없으면 이후 모든 화면이 가게를 못 찾습니다.
              setStoreId(storeId);
              nav.replace('Main', { screen: 'HomeFeed' });
            }}
            disabled={!store}
          />
        </BottomAction>
      }
    >
      <AppBar title="가게 정보 확인" />

      <Banner
        tone="info"
        title="사장님이 확인한 값이 항상 우선입니다"
        description="자동으로 가져온 정보가 실제와 다르면 언제든 고칠 수 있습니다."
      />

      {importing && (
        <Card>
          <Text style={text.subheading}>가게 정보를 모으는 중</Text>
          <JobProgress
            label={`${totalCount}개 중 ${doneCount}개 완료`}
            progress={totalCount ? doneCount / totalCount : 0}
          />
          <View style={styles.badgeRow}>
            {importStatus?.items.map((item) => (
              <Badge
                key={item.field}
                label={item.field}
                tone={
                  item.status === 'SUCCESS' ? 'done' : item.status === 'FAILED' ? 'danger' : 'neutral'
                }
              />
            ))}
          </View>
          <Text style={text.caption}>완료된 것부터 아래에서 확인할 수 있습니다.</Text>
        </Card>
      )}

      {timedOut && (
        <Banner
          tone="warn"
          title="정보를 가져오는 데 시간이 오래 걸립니다"
          description="지금까지 받은 내용으로 진행하셔도 됩니다. 나머지는 나중에 채울 수 있습니다."
        />
      )}

      {/* 명세: 한 소스가 실패해도 전체가 막히지 않습니다 */}
      {failed.length > 0 && (
        <Banner
          tone="warn"
          title={`${failed.map((f) => f.field).join(', ')} 정보를 못 가져왔습니다`}
          description="나머지는 정상이니 그대로 진행하셔도 됩니다. 나중에 직접 채울 수 있습니다."
        />
      )}

      {isLoading && <Loading />}

      {store && (
        <>
          <Card>
            <View style={styles.head}>
              <Text style={text.heading}>{store.name}</Text>
              <Badge label="확인 전" tone="warn" />
            </View>
            <Row label="업종" value={store.subCategory ? `${store.category} · ${store.subCategory}` : store.category} />
            <Row label="주소" value={store.address} />
            <Row label="전화" value={store.phone ?? '없음'} />
            <Row label="영업시간" value={store.businessHours ?? '없음'} />
            {store.brandTone ? <Row label="가게 느낌" value={store.brandTone} /> : null}
            <Text style={text.micro}>
              출처 {store.infoSource} · {formatDate(store.updatedAt)} 기준
            </Text>
          </Card>

          <Card>
            <View style={styles.head}>
              <Text style={text.subheading}>대표 메뉴 {menus?.length ?? 0}개</Text>
              {(menus?.length ?? 0) === 0 && <Badge label="필요" tone="warn" />}
            </View>
            {(menus?.length ?? 0) === 0 ? (
              <Text style={text.bodySmall}>
                최소 1개는 있어야 영상을 만들 수 있습니다. 나중에 추가해도 됩니다.
              </Text>
            ) : (
              menus?.map((m) => (
                <View key={m.id} style={{ gap: 2 }}>
                  <View style={styles.menuRow}>
                    <Text style={text.bodyStrong}>{m.name}</Text>
                    {m.isNewMenu ? <Badge label="신메뉴" tone="brand" /> : null}
                    {m.isSoldOut ? <Badge label="품절" tone="neutral" /> : null}
                  </View>
                  <Text style={text.caption}>
                    {won(m.price) || '가격 미정'}
                    {m.description ? ` · ${m.description}` : ''}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space[3] }}>
      <Text style={[text.bodySmall, { width: 76, color: color.ink[400] }]}>{label}</Text>
      <Text style={[text.bodySmall, { flex: 1 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  menuRow: { flexDirection: 'row', gap: space[2], alignItems: 'center' },
});
