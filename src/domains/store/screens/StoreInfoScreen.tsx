/** S03.1.1 가게 정보 + S03.2 메뉴 + S03.4 타깃 · 명세 3.1~3.4 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../../ui/Screen';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Button } from '../../../ui/Button';
import { EmptyState, Loading } from '../../../ui/Feedback';
import { color, space, text } from '../../../design/theme';
import { useMenus, usePhotos, useStore, useTargetCustomers, visibleTargets } from '../../../api/queries/store';
import { useCurrentStore } from '../../../lib/appState';
import { won } from '../../../lib/format';
import type { StoreStackParamList } from '../../../navigation/types';

export default function StoreInfoScreen() {
  const nav = useNavigation<NativeStackNavigationProp<StoreStackParamList>>();
  const storeId = useCurrentStore();
  const { data: store, isLoading } = useStore(storeId);
  const { data: menus } = useMenus(storeId);
  const { data: photos } = usePhotos(storeId);
  const { data: targetData } = useTargetCustomers(storeId);
  // 명세 3.4: HIDDEN 은 관리 화면에서만 다룹니다. 요약 화면에서는 거릅니다.
  const targets = visibleTargets(targetData);

  if (!storeId) return <Screen edges={['top']}><EmptyState title="가게를 먼저 등록해 주세요" /></Screen>;
  if (isLoading) return <Screen edges={['top']}><Loading /></Screen>;

  return (
    <Screen edges={['top']}>
      <Text style={text.title}>우리 가게</Text>

      {store && (
        <Card>
          <Text style={text.heading}>{store.name}</Text>
          <Row label="업종" value={store.subCategory ? `${store.category} · ${store.subCategory}` : store.category} />
          <Row label="주소" value={store.address} />
          <Row label="전화" value={store.phone ?? '없음'} />
          <Row label="영업시간" value={store.businessHours ?? '없음'} />
          {store.brandTone ? <Row label="가게 느낌" value={store.brandTone} /> : null}
          <Button
            label="고치기"
            variant="secondary"
            size="small"
            full={false}
            onPress={() => nav.navigate('StoreEdit')}
          />
        </Card>
      )}

      <Card>
        <View style={styles.head}>
          <Text style={text.subheading}>메뉴 {menus?.length ?? 0}개</Text>
          <Button
            label="관리"
            variant="secondary"
            size="small"
            full={false}
            onPress={() => nav.navigate('MenuManage')}
          />
        </View>
        {menus?.map((m) => (
          <View key={m.id} style={{ gap: 2 }}>
            <View style={styles.menuRow}>
              <Text style={text.bodyStrong}>{m.name}</Text>
              {m.isNewMenu ? <Badge label="신메뉴" tone="brand" /> : null}
              {m.isEventMenu ? <Badge label="행사중" tone="brand" /> : null}
              {m.isSoldOut ? <Badge label="품절" /> : null}
            </View>
            <Text style={text.caption}>
              {won(m.price)}
              {m.description ? ` · ${m.description}` : ''}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <View style={styles.head}>
          <Text style={text.subheading}>사진 {photos?.length ?? 0}장</Text>
          <Button
            label="관리"
            variant="secondary"
            size="small"
            full={false}
            onPress={() => nav.navigate('PhotoManage')}
          />
        </View>
        <View style={styles.photoRow}>
          {photos?.map((p) => (
            <Badge key={p.id} label={p.category} />
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.head}>
          <Text style={text.subheading}>손님 {targets?.length ?? 0}종류</Text>
          <Button
            label="확인·수정"
            variant="secondary"
            size="small"
            full={false}
            onPress={() => nav.navigate('TargetManage')}
          />
        </View>
        {targets?.map((t) => (
          <View key={t.id} style={{ gap: 2 }}>
            <View style={styles.menuRow}>
              <Badge label={`${t.targetType} 손님`} tone={t.targetType === '주' ? 'brand' : 'neutral'} />
              {t.status === 'SUGGESTED' && <Badge label="AI 추천" tone="warn" />}
            </View>
            <Text style={text.bodySmall}>{t.targetDescription}</Text>
          </View>
        ))}
      </Card>
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
  menuRow: { flexDirection: 'row', gap: space[2], alignItems: 'center' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
