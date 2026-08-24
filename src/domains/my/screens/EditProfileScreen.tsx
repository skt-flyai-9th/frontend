/**
 * EditProfileScreen — 프로필 수정. 시안 `2_프로필수정.png`.
 *
 * 이 화면은 **네 개의 API 를 한 화면에 모읍니다.** 시안의 블록 순서 그대로입니다.
 *
 *   프로필 사진        → 3.6 POST /stores/{id}/logo   (multipart, 가게당 1장)
 *   매장 이름·카테고리  → 3.1 PATCH /stores/{id}
 *   Instagram·YouTube → 16.1 (연동은 SnsConnect 화면으로 보냄. 여기선 상태만)
 *   내 이름·전화번호    → 1.5 PATCH /users/me
 *
 * 왜 사용자 정보(1.5)까지 여기 있나
 *   명세 1.5 가 이렇게 안내합니다 — "가게 정보를 고치는 것이면 3.1,
 *   사용자 계정 정보면 1.5". 사장님 입장에서 '내 정보'는 한 곳이어야 해서
 *   화면은 하나로 두고 저장할 때만 갈라 보냅니다.
 *
 * ⚠️ 3.1 PATCH 로 name·category 를 바꿀 수 있는지 BE 확인 중입니다.
 *    명세 Body 예시에는 business_hours·brand_tone·brand_color 만 있습니다.
 *    400 이 나면 이 블록만 읽기 전용으로 바꾸면 됩니다.
 *
 * ⚠️ SNS 계정 추가/삭제는 여기서 하지 않습니다.
 *    OAuth 는 브라우저를 열고 돌아오는 흐름이라 폼 화면과 섞으면
 *    작성 중이던 입력이 날아갑니다. 연동 화면으로 보냅니다.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronRight, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { BottomAction, Button } from '../../../ui/Button';
import { Field } from '../../../ui/Field';
import { Banner } from '../../../ui/Feedback';
import { useAppState } from '../../../lib/appState';
import { useStore, useUpdateStore, useUploadLogo } from '../../../api/queries/store';
import { useMe, useUpdateMe } from '../../../api/queries/auth';
import { useSnsConnections } from '../../../api/queries/edit';
import theme, { color, radius, space, text, sizing } from '../../../design/theme';
import type { MyStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<MyStackParamList>;

export default function EditProfileScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);

  const { data: store } = useStore(storeId ?? undefined);
  const { data: me } = useMe();
  const { data: connections } = useSnsConnections();

  const updateStore = useUpdateStore(storeId ?? 0);
  const updateMe = useUpdateMe();
  const uploadLogo = useUploadLogo(storeId ?? 0);

  const [form, setForm] = useState({ name: '', category: '', myName: '', phone: '' });
  const [saved, setSaved] = useState(false);

  // 서버 값이 오면 폼을 채웁니다. 사장님이 입력 중이면 덮지 않습니다.
  useEffect(() => {
    if (store) setForm((p) => (p.name ? p : { ...p, name: store.name, category: store.category }));
  }, [store]);
  useEffect(() => {
    if (me) setForm((p) => (p.myName ? p : { ...p, myName: me.name, phone: me.phone ?? '' }));
  }, [me]);

  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  /** 사진 권한은 이 버튼을 누른 순간에만 요청합니다 (묶어 요청하지 않음). */
  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('사진 권한이 필요합니다', '사진을 고르려면 설정에서 권한을 켜 주세요.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;
    uploadLogo.mutate(res.assets[0].uri);
  };

  const save = () => {
    if (!storeId) return;
    setSaved(false);

    // 가게 정보와 계정 정보는 다른 API 입니다. 바뀐 쪽만 보냅니다.
    const storeChanged =
      form.name.trim() !== (store?.name ?? '') || form.category.trim() !== (store?.category ?? '');
    const meChanged =
      form.myName.trim() !== (me?.name ?? '') || form.phone.trim() !== (me?.phone ?? '');

    if (storeChanged) {
      updateStore.mutate({ name: form.name.trim(), category: form.category.trim() });
    }
    if (meChanged) {
      updateMe.mutate({ name: form.myName.trim(), phone: form.phone.trim() || undefined });
    }
    if (!storeChanged && !meChanged) {
      setSaved(true);
      return;
    }
    setSaved(true);
  };

  const busy = updateStore.isPending || updateMe.isPending;
  const failed = updateStore.isError || updateMe.isError;

  return (
    <Screen
      footer={
        <BottomAction>
          <Button label="저장하기" onPress={save} loading={busy} />
        </BottomAction>
      }
    >
      <AppBar onBack={() => nav.goBack()} title="프로필 수정" />

      {failed && (
        <Banner
          tone="warn"
          title="저장하지 못했습니다"
          description="신호를 확인하고 다시 시도해 주세요."
        />
      )}
      {saved && !busy && !failed && (
        <Banner tone="done" title="저장했습니다" description="바뀐 내용이 반영됐어요." />
      )}

      {/* ── 프로필 사진 (3.6) ── */}
      <View style={styles.photoWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="프로필 사진 변경"
          onPress={pickLogo}
          style={({ pressed }) => [pressed && { opacity: theme.opacity.pressed }]}
        >
          {store?.logoUrl ? (
            <Image source={{ uri: store.logoUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoEmpty]}>
              <Text style={[text.caption, { color: color.ink[400] }]}>사진 없음</Text>
            </View>
          )}
          <View style={styles.cameraDot}>
            <Camera size={16} strokeWidth={2} color={color.paper} />
          </View>
        </Pressable>
        <Pressable onPress={pickLogo} accessibilityRole="button">
          <Text style={[text.bodySmall, { color: color.brand[600] }]}>
            {uploadLogo.isPending ? '올리는 중…' : '프로필 사진 변경'}
          </Text>
        </Pressable>
        {uploadLogo.isError && (
          <Text style={[text.caption, { color: color.danger[500] }]}>
            사진을 올리지 못했습니다. 다시 시도해 주세요.
          </Text>
        )}
      </View>

      {/* ── 가게 정보 (3.1) ── */}
      <Field label="매장 이름" value={form.name} onChangeText={set('name')} />
      <Field label="카테고리" value={form.category} onChangeText={set('category')} />

      {/* ── SNS 계정 (16.1) — 상태만 보여주고 연동은 전용 화면에서 ── */}
      {(['INSTAGRAM', 'YOUTUBE'] as const).map((platform) => {
        const linked = connections?.find((c) => c.snsPlatform === platform);
        return (
          <View key={platform} style={{ gap: space[2] }}>
            <Text style={text.micro}>{platform === 'INSTAGRAM' ? 'Instagram' : 'YouTube'} 계정</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => nav.navigate('SnsConnect')}
              style={({ pressed }) => [styles.snsRow, pressed && { backgroundColor: color.surface }]}
            >
              {linked ? (
                <Text style={[text.body, { flex: 1 }]}>{linked.snsAccountName}</Text>
              ) : (
                <View style={styles.addRow}>
                  <Plus size={16} strokeWidth={2} color={color.brand[600]} />
                  <Text style={[text.body, { color: color.brand[600] }]}>계정 추가</Text>
                </View>
              )}
              <ChevronRight size={20} strokeWidth={2} color={color.ink[300]} />
            </Pressable>
          </View>
        );
      })}

      {/* ── 내 계정 정보 (1.5) ── */}
      <Text style={[text.micro, { marginTop: space[3] }]}>내 정보</Text>
      <Field label="이름" value={form.myName} onChangeText={set('myName')} />
      <Field
        label="전화번호"
        value={form.phone}
        onChangeText={set('phone')}
        keyboardType="phone-pad"
        hint="숫자만 입력해 주세요"
      />
      <Text style={[text.caption, { color: color.ink[400] }]}>
        이메일{me?.email ? ` (${me.email})` : ''}은 로그인에 쓰는 값이라 바꿀 수 없습니다.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoWrap: { alignItems: 'center', gap: space[2] },
  photo: { width: 92, height: 92, borderRadius: radius.pill, backgroundColor: color.ink[100] },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  cameraDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.paper,
  },
  snsRow: {
    minHeight: sizing.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space[1], flex: 1 },
});
