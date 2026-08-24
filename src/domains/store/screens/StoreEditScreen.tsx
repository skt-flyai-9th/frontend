/**
 * S03.1.1 가게 기본정보 확인·수정 + S03.1.3 브랜드 말투 · 명세 3.1
 *
 * 명세 규칙: "사장님이 확인한 값이 항상 우선한다"
 * 자동으로 가져온 정보가 실제와 다를 때 고칠 수 있어야 합니다.
 * 영업시간이 틀리면 손님이 헛걸음합니다.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import { Field } from '../../../ui/Field';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useStore, useUpdateStore } from '../../../api/queries/store';
import { useCurrentStore } from '../../../lib/appState';
import type { StoreStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<StoreStackParamList, 'StoreEdit'>;

/** 자막에 얹었을 때 흰 글자가 읽히는 색만 골랐습니다. */
// 가게 색 후보는 토큰에서 옵니다 (화면에 hex 를 두지 않습니다).
const BRAND_COLORS = color.storePalette;

export default function StoreEditScreen({ navigation }: Props) {
  const storeId = useCurrentStore();
  const { data: store, isLoading, isError, refetch } = useStore(storeId);
  const updateStore = useUpdateStore(storeId ?? 0);

  const [form, setForm] = useState({
    name: '',
    category: '',
    address: '',
    phone: '',
    businessHours: '',
    brandTone: '',
    brandColor: '',
  });
  const [dirty, setDirty] = useState(false);

  // 서버 값이 오면 폼을 채웁니다. 사장님이 고치기 시작한 뒤엔 덮어쓰지 않습니다.
  useEffect(() => {
    if (!store || dirty) return;
    setForm({
      name: store.name ?? '',
      category: store.category ?? '',
      address: store.address ?? '',
      phone: store.phone ?? '',
      businessHours: store.businessHours ?? '',
      brandTone: store.brandTone ?? '',
      brandColor: store.brandColor ?? '',
    });
  }, [store, dirty]);

  const set = (k: keyof typeof form) => (v: string) => {
    setDirty(true);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const save = () => {
    updateStore.mutate(
      {
        name: form.name.trim(),
        category: form.category.trim(),
        address: form.address.trim(),
        phone: form.phone.trim() || undefined,
        businessHours: form.businessHours.trim() || undefined,
        brandTone: form.brandTone.trim() || undefined,
        brandColor: form.brandColor || undefined,
      },
      { onSuccess: () => navigation.goBack() }
    );
  };

  if (isError) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => refetch()} />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} title="가게 정보" />
        <EmptyState title="가게 정보를 불러오지 못했습니다" />
      </Screen>
    );
  }

  if (isLoading && !store) {
    return (
      <Screen>
        <AppBar onBack={() => navigation.goBack()} title="가게 정보" />
        <Loading label="불러오는 중" />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="저장하기"
            onPress={save}
            disabled={!form.name.trim() || !dirty}
            loading={updateStore.isPending}
          />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="가게 정보 고치기" />

      {updateStore.isError && (
        <Banner tone="danger" title="저장하지 못했습니다" description="잠시 후 다시 시도해 주세요." />
      )}

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>우리 가게 정보</Text>
        <Text style={text.bodySmall}>여기 적은 내용이 영상 자막과 안내에 그대로 쓰입니다.</Text>
      </View>

      <Field label="상호명" required value={form.name} onChangeText={set('name')} />
      <Field label="업종" value={form.category} onChangeText={set('category')} placeholder="한식" />
      <Field label="주소" value={form.address} onChangeText={set('address')} />
      <Field
        label="전화번호"
        value={form.phone}
        onChangeText={set('phone')}
        keyboardType="phone-pad"
      />
      <Field
        label="영업시간"
        value={form.businessHours}
        onChangeText={set('businessHours')}
        placeholder="평일 10:00-20:30 (일요일 휴무)"
        hint="영상 마지막 안내에 나갑니다. 정확히 적어 주세요."
      />
      <Field
        label="가게 느낌"
        value={form.brandTone}
        onChangeText={set('brandTone')}
        placeholder="30년 손맛, 정직하고 푸근한 동네 국숫집"
        hint="대사의 말투를 정하는 데 씁니다."
      />

      {/* 명세 3.1 brand_color — 자막 색과 강조 색에 씁니다 */}
      <View style={{ gap: space[2] }}>
        <Text style={text.bodySmall}>가게 색</Text>
        <Text style={text.caption}>영상 자막과 강조 색에 씁니다.</Text>
        <View style={styles.swatchRow}>
          {BRAND_COLORS.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`색 ${c}`}
              accessibilityState={{ selected: form.brandColor === c }}
              onPress={() => set('brandColor')(c)}
              style={({ pressed }) => [
                styles.swatch,
                { backgroundColor: c },
                form.brandColor === c && styles.swatchOn,
                pressed && { opacity: theme.opacity.pressed },
              ]}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: theme.border.thick,
    borderColor: 'transparent',
  },
  swatchOn: { borderColor: color.ink[900] },
});
