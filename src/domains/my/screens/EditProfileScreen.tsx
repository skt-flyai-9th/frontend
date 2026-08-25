/**
 * EditProfileScreen — **시안 v3 `edit-profile` 대조 이식** (2026-08-26).
 *
 * 시안 구조 (위에서부터, 이게 전부입니다)
 *   ① 아바타 96 + 링 · 우하단 카메라 버튼 32(흰 테두리 2) · "프로필 사진 변경" 13·semibold·brand
 *   ② 매장 이름 / 카테고리 — 라벨 13·semibold·slate + 입력 h48 rounded-xl bg-panel
 *   ③ Instagram / YouTube 계정
 *        라벨 13·semibold·slate + 브랜드 마크 14
 *        연동된 계정 행 h48: "@핸들" 15 + "연동됨" 배지(verified 10%) + 우측 해제 X 28
 *        아래 "+ {플랫폼} 계정 연동" — h48 **점선** 테두리 · brand 14·semibold
 *   ④ "저장하기" h48 브랜드 버튼 (화면 안쪽, 하단 고정 아님)
 *
 * ⚠️ "내 정보(이름·전화번호)" 는 **뺐습니다** (2026-08-26 확인).
 *    시안 v3 어디에도 없는 항목이라 사장님 확인을 받고 지웠습니다.
 *    1.5 PATCH /users/me 는 명세에 남아 있고 훅(useUpdateMe)도 그대로라,
 *    나중에 계정 화면이 생기면 거기서 그대로 쓰면 됩니다.
 *
 * ⚠️ 저장은 두 곳으로 갈립니다.
 *    매장 이름·카테고리 → 3.1 PATCH /stores/{id}   (실서버 스키마에 name·category 있음)
 *    SNS 연동/해제      → 16.1 (브라우저 OAuth 라 SnsConnect 화면으로 보냅니다)
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, Plus, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Field } from '../../../ui/Field';
import { Banner } from '../../../ui/Feedback';
import { BrandMark } from '../../../ui/BrandMark';
import { pressTap } from '../../../ui/press';
import { useAppState } from '../../../lib/appState';
import { useStore, useUpdateStore, useUploadLogo } from '../../../api/queries/store';
import { useDisconnectSns, useSnsConnections } from '../../../api/queries/edit';
import theme, { color, radius, space, text } from '../../../design/theme';
import type { MyStackParamList, RootStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList & MyStackParamList>;

const PLATFORMS = [
  { key: 'INSTAGRAM' as const, label: 'Instagram', mark: 'instagram' as const },
  { key: 'YOUTUBE' as const, label: 'YouTube', mark: 'youtube' as const },
];

export default function EditProfileScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);

  const { data: store } = useStore(storeId ?? undefined);
  const { data: connections } = useSnsConnections();

  const updateStore = useUpdateStore(storeId ?? 0);
  const uploadLogo = useUploadLogo(storeId ?? 0);
  const disconnect = useDisconnectSns();

  const [form, setForm] = useState({ name: '', category: '' });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // 서버 값이 오면 채웁니다. 사장님이 입력 중이면 덮지 않습니다.
  useEffect(() => {
    if (dirty) return;
    setForm({ name: store?.name ?? '', category: store?.category ?? '' });
  }, [store, dirty]);

  const set = (k: keyof typeof form) => (v: string) => {
    setDirty(true);
    setSaved(false);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('사진 권한이 필요합니다', '설정에서 사진 접근을 켜 주세요.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    uploadLogo.mutate(res.assets[0].uri);
  };

  const save = () => {
    updateStore.mutate({ name: form.name.trim(), category: form.category.trim() });
    setSaved(true);
    setDirty(false);
  };

  return (
    // Screen 기본 하단 여백(40)까지 붙으면 시안(pb-8=32)보다 아래가 비어 헛스크롤이 생깁니다.
    <Screen padded={false} contentStyle={{ paddingTop: 0, paddingBottom: 0, gap: 0 }}>
      <AppBar onBack={() => nav.goBack()} title="프로필 수정" />

      <View style={styles.body}>
        {/* ① 아바타 */}
        <View style={styles.avatarWrap}>
          <View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="프로필 사진 선택"
              onPress={pickImage}
              style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
            >
              {store?.logoUrl ? (
                <Image source={{ uri: store.logoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarEmpty]}>
                  <Text style={[text.caption, { color: color.ink[400] }]}>사진 없음</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="사진 변경"
              onPress={pickImage}
              style={({ pressed }) => [styles.cameraBtn, pressTap(pressed, 'icon')]}
            >
              <Camera size={16} strokeWidth={2} color={color.paper} />
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={pickImage} hitSlop={6}>
            <Text style={styles.changePhoto}>프로필 사진 변경</Text>
          </Pressable>
        </View>

        {uploadLogo.isError && (
          <View style={{ marginTop: space[4] }}>
            <Banner tone="danger" title="사진을 올리지 못했습니다" description="잠시 후 다시 시도해 주세요." />
          </View>
        )}

        {/* ② 매장 이름 · 카테고리 */}
        <View style={styles.fields}>
          {/* 시안: 라벨 mb-1.5(6) — 이 화면만 좁습니다 */}
          <Field
            label="매장 이름"
            labelGap={6}
            value={form.name}
            onChangeText={set('name')}
            placeholder="매장 이름"
            style={styles.input}
          />
          <Field
            label="카테고리"
            labelGap={6}
            value={form.category}
            onChangeText={set('category')}
            placeholder="예: 카페"
            style={styles.input}
          />
        </View>

        {/* ③ SNS 계정 */}
        <View style={styles.snsWrap}>
          {PLATFORMS.map((p) => {
            const linked = (connections ?? []).filter((c) => c.snsPlatform === p.key);
            return (
              <View key={p.key}>
                <View style={styles.snsLabelRow}>
                  <BrandMark kind={p.mark} size={14} boxed />
                  <Text style={styles.snsLabel}>{p.label} 계정</Text>
                </View>

                <View style={{ gap: space[2] }}>
                  {linked.map((c) => (
                    <View key={c.id} style={styles.account}>
                      <View style={styles.accountLeft}>
                        <Text style={styles.handle} numberOfLines={1}>
                          @{c.snsAccountName}
                        </Text>
                        <View style={styles.linkedBadge}>
                          <Check size={10} strokeWidth={3} color={color.done[500]} />
                          <Text style={styles.linkedText}>연동됨</Text>
                        </View>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${c.snsAccountName} 연동 해제`}
                        hitSlop={8}
                        onPress={() =>
                          Alert.alert('연결을 끊을까요?', '이 계정의 조회수와 반응을 더 이상 받아오지 못합니다.', [
                            { text: '취소', style: 'cancel' },
                            { text: '연결 끊기', style: 'destructive', onPress: () => disconnect.mutate(c.id) },
                          ])
                        }
                        style={({ pressed }) => [styles.removeBtn, pressTap(pressed, 'icon')]}
                      >
                        <X size={16} strokeWidth={2} color={color.ink[500]} />
                      </Pressable>
                    </View>
                  ))}

                  {/* 시안: 점선 테두리 + brand 글자 */}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      // 이 화면은 탭 밖(Root)이고 SnsConnect 는 마이 탭 안이라 경로를 짚어 줍니다.
                      nav.navigate('Main', { screen: 'My', params: { screen: 'SnsConnect' } })
                    }
                    style={({ pressed }) => [styles.addBtn, pressTap(pressed, 'card')]}
                  >
                    <Plus size={17} strokeWidth={2} color={color.brand[600]} />
                    <Text style={styles.addText}>{p.label} 계정 연동</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* ④ 저장 */}
        <Pressable
          accessibilityRole="button"
          onPress={save}
          style={({ pressed }) => [styles.saveBtn, pressTap(pressed, 'card')]}
        >
          <Text style={styles.saveText}>저장하기</Text>
        </Pressable>

        {saved && (
          <View style={{ marginTop: space[3] }}>
            <Banner tone="done" title="저장했습니다" />
          </View>
        )}

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 시안: px-5 pb-8
  body: { paddingHorizontal: space[5], paddingBottom: space[7] },

  avatarWrap: { alignItems: 'center' },
  // 시안: h-24 w-24 + ring-1 hairline
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.ink[100],
  },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  // 시안: -bottom-1 -right-1 · h-8 w-8 · border-2 canvas
  cameraBtn: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.canvas,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: {
    ...theme.text.caption,
    marginTop: space[3],
    fontFamily: theme.text.chipLabel.fontFamily,
    fontWeight: theme.text.chipLabel.fontWeight,
    color: color.brand[600],
  },

  // 시안: mt-6 gap-4
  fields: { marginTop: space[6], gap: space[4] },
  // 시안 입력: h-12 · bg-panel(흰색)
  input: { height: 48, backgroundColor: color.paper },

  // 시안: mt-7(28) gap-5(20). space 스케일에 28 이 없어 숫자로 둡니다.
  snsWrap: { marginTop: 28, gap: space[5] },
  snsLabelRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[2] },
  snsLabel: {
    ...theme.text.caption,
    fontFamily: theme.text.chipLabel.fontFamily,
    fontWeight: theme.text.chipLabel.fontWeight,
    color: color.ink[500],
  },

  // 시안: h-12 rounded-xl border-hairline bg-panel px-4
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
  },
  accountLeft: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1, minWidth: 0 },
  handle: { ...theme.text.body, flexShrink: 1 },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  linkedText: {
    ...theme.text.nano,
    fontFamily: theme.text.chipLabel.fontFamily,
    fontWeight: theme.text.chipLabel.fontWeight,
    color: color.done[500],
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 시안: 점선 테두리
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderStyle: 'dashed',
    borderColor: color.ink[200],
  },
  addText: {
    ...theme.text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.brand[600],
  },

  // 시안: mt-8 h-12 rounded-xl bg-brand
  saveBtn: {
    height: 48,
    marginTop: space[7],
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { ...theme.text.button, color: color.paper },

});
