/** S02.1.3 직접 입력·URL 보완 · 명세 2.2 */
import React, { useState } from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Banner } from '../../../ui/Feedback';
import { Field } from '../../../ui/Field';
import { text } from '../../../design/theme';
import { useCreateStore } from '../../../api/queries/store';
import type { StoreSetupStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<StoreSetupStackParamList, 'StoreManual'>;

export default function StoreManualScreen({ navigation }: Props) {
  const [form, setForm] = useState({ name: '', category: '', address: '', phone: '', url: '' });
  const createStore = useCreateStore();

  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  // 상호·업종은 필수, 주소 또는 온라인 채널 중 하나는 있어야 합니다.
  const valid = form.name.trim() && form.category.trim() && (form.address.trim() || form.url.trim());

  const save = () => {
    createStore.mutate(
      {
        name: form.name.trim(),
        category: form.category.trim(),
        address: form.address.trim(),
        phone: form.phone.trim() || undefined,
        infoSource: 'MANUAL',
        externalChannelUrl: form.url.trim() || undefined,
      },
      { onSuccess: (res) => navigation.replace('StoreConfirm', { storeId: res.id }) }
    );
  };

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="저장하고 계속"
            onPress={save}
            disabled={!valid}
            loading={createStore.isPending}
          />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="직접 입력" />
      <Text style={text.title}>가게 정보를 알려주세요</Text>

      <Banner
        tone="info"
        title="네이버플레이스 주소를 붙여넣으면 더 빨라집니다"
        description="주소를 못 읽어도 입력하신 내용은 그대로 저장됩니다."
      />

      <Field label="상호명" required value={form.name} onChangeText={set('name')} placeholder="난곡신사 손칼국수" />
      <Field label="업종" required value={form.category} onChangeText={set('category')} placeholder="한식" />
      <Field label="주소" value={form.address} onChangeText={set('address')} placeholder="서울 관악구 난곡로 42" />
      <Field label="전화번호" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="02-123-4567" />
      <Field
        label="네이버플레이스 · 카카오맵 주소"
        value={form.url}
        onChangeText={set('url')}
        placeholder="https://"
        autoCapitalize="none"
        hint="주소를 모르면 이것만 넣어도 됩니다."
      />
    </Screen>
  );
}
