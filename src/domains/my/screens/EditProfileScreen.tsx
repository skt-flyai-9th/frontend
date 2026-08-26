/**
 * EditProfileScreen — **시안 V4 `19_edit-profile` 대조 이식**.
 *
 * 시안 구조 (위에서부터, 이게 전부입니다)
 *   ① 아바타 96 + 링 · 우하단 카메라 버튼 32(흰 테두리 2) · "프로필 사진 변경" 13·semibold·brand
 *   ② 매장 이름 / 카테고리 — 라벨 13·semibold·slate + 입력 h48 rounded-xl bg-panel
 *   ③ Instagram / YouTube 계정
 *        라벨 13·semibold·slate + 브랜드 마크 14
 *        연동된 계정 행 h48: "@핸들" 15 + "연동됨" 배지(verified 10%) + 우측 해제 X 28
 *        아래 "+ {플랫폼} 계정 연동" — h48 **점선** 테두리 · brand 14·semibold
 *   ④ "저장하기" h48 브랜드 버튼 (화면 안쪽, 하단 고정 아님)
 *   ⑤ **연동 바텀시트** — 계정 연동을 누르면 뜹니다 (V4 에서 추가된 부분)
 *        동의: 브랜드 마크 30 · 제목 18 · 안내 13 · 요청 권한 카드 · 플랫폼색 버튼 52 · 취소
 *        연결 중: 회전 아이콘 34 · "연결 중..." 15 · "잠시만 기다려 주세요" 13
 *
 * ⚠️ "내 정보(이름·전화번호)" 는 **뺐습니다** (2026-08-26 확인).
 *    시안 어디에도 없는 항목이라 사장님 확인을 받고 지웠습니다.
 *    1.5 PATCH /users/me 는 명세에 남아 있고 훅(useUpdateMe)도 그대로라,
 *    나중에 계정 화면이 생기면 거기서 그대로 쓰면 됩니다.
 *
 * ⚠️ 저장은 두 곳으로 갈립니다.
 *    매장 이름·카테고리 → 3.1 PATCH /stores/{id}   (실서버 스키마에 name·category 있음)
 *    SNS 연동/해제      → 16.1
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, Plus, ShieldCheck, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Field } from '../../../ui/Field';
import { Banner, Spinner } from '../../../ui/Feedback';
import { BrandMark } from '../../../ui/BrandMark';
import { pressTap } from '../../../ui/press';
import { useAppState } from '../../../lib/appState';
import { useStore, useUpdateStore, useUploadLogo } from '../../../api/queries/store';
import { useDisconnectSns, useSnsAuthorize, useSnsConnections } from '../../../api/queries/edit';
import type { SnsPlatform } from '../../../api/schema/types';
import theme, { color, radius, space, text } from '../../../design/theme';
import type { MyStackParamList, RootStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList & MyStackParamList>;

/**
 * 시안 `PLATFORM_META`.
 *
 * ⚠️ `scope` 는 시안이 준 문구 그대로입니다. 실제 OAuth 범위는 **서버가 정합니다**
 *    (16.1 A방식 — 앱은 authorize_url 을 열기만 합니다). 사장님께 보여 주는 동의 문구라
 *    실제 범위와 어긋나면 안 되어 BE 확인 요청 목록에 올려 뒀습니다.
 */
const PLATFORMS = [
  {
    key: 'INSTAGRAM' as const,
    label: 'Instagram',
    mark: 'instagram' as const,
    // 시안: PLATFORM_META.Instagram.color
    brandColor: '#E1306C',
    scope: '프로필 정보 · 게시물 업로드 권한',
  },
  {
    key: 'YOUTUBE' as const,
    label: 'YouTube',
    mark: 'youtube' as const,
    brandColor: '#FF0000',
    scope: '채널 정보 · 동영상 업로드 권한',
  },
];

type Platform = (typeof PLATFORMS)[number];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);

  const { data: store } = useStore(storeId ?? undefined);
  const connectionsQuery = useSnsConnections();
  const connections = connectionsQuery.data;

  const updateStore = useUpdateStore(storeId ?? 0);
  const uploadLogo = useUploadLogo(storeId ?? 0);
  const disconnect = useDisconnectSns();
  const authorize = useSnsAuthorize();

  const [form, setForm] = useState({ name: '', category: '' });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  /** 연동 시트. null 이면 닫힘. */
  const [connecting, setConnecting] = useState<Platform | null>(null);
  /** 시안의 connectState — 'consent'(동의) / 'loading'(연결 중) */
  const [phase, setPhase] = useState<'consent' | 'loading'>('consent');
  /** 브라우저로 정말 나갔다 왔는지. 이게 없이는 첫 'active' 를 복귀로 오인합니다. */
  const leftApp = useRef(false);
  /** 나가기 직전의 연동 개수. 돌아와서 늘었는지로 성공을 판단합니다. */
  const beforeCount = useRef(0);
  /** 돌아왔는데 연동이 안 됐을 때 띄우는 안내. 플랫폼 이름입니다. */
  const [connectNotice, setConnectNotice] = useState<string | null>(null);

  const closeSheet = () => {
    setConnecting(null);
    setPhase('consent');
    leftApp.current = false;
    authorize.reset();
  };

  /**
   * 16.1 A방식 — 앱이 하는 일은 두 가지뿐입니다 (api/queries/edit.ts 머리말).
   *   ① authorize_url 을 받아 브라우저로 연다
   *   ② 브라우저에서 돌아오면 목록을 다시 조회해 결과를 확인한다
   */
  const startConnect = (p: Platform) => {
    setPhase('loading');
    setConnectNotice(null);
    beforeCount.current = (connections ?? []).filter((c) => c.snsPlatform === p.key).length;
    authorize.mutate(p.key as SnsPlatform, {
      onSuccess: ({ authorizeUrl }) => {
        Linking.openURL(authorizeUrl).catch(() => setPhase('consent'));
      },
      // 발급 자체가 실패할 수 있습니다 (BE Q6-b). 동의 화면으로 돌려 이유를 보여 줍니다.
      onError: () => setPhase('consent'),
    });
  };

  /*
   * ② 복귀 감지. 동의하지 않고 그냥 닫고 와도 똑같이 복귀로 잡히므로,
   *    목록을 다시 받아 **개수가 늘었는지**로만 판단합니다.
   *
   *    늘지 않았을 때 "거절하셨습니다" 라고 쓰지 않습니다. 창을 닫으신 건지,
   *    서버 콜백이 늦은 건지 우리는 알 수 없습니다 (BE Q6-a 답변 대기).
   *    아는 사실 하나 — 아직 연동되지 않았다 — 만 말합니다.
   */
  useEffect(() => {
    if (!connecting || phase !== 'loading') return;
    const platform = connecting;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        leftApp.current = true;
        return;
      }
      if (!leftApp.current) return;
      closeSheet();
      void connectionsQuery.refetch().then((res) => {
        const after = (res.data ?? []).filter((c) => c.snsPlatform === platform.key).length;
        // 늘었으면 목록에 계정이 뜹니다 — 그게 곧 안내라 따로 말하지 않습니다.
        if (after <= beforeCount.current) setConnectNotice(platform.label);
      });
    });
    return () => sub.remove();
  }, [connecting, phase]);

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

  /**
   * 프로필 사진 고르기 → 3.6 업로드.
   *
   * 🔴 2026-08-26 — "사진이 안 바뀐다" 는 보고
   *
   *    서버는 정상입니다. 실서버에 직접 올려 **200 과 `logo_url`** 을 받았습니다
   *    (multipart 필드명 `file` 이 맞고, 다른 이름은 422 입니다).
   *
   *    코드에서 찾은 구멍은 **가게가 없을 때**입니다. `useUploadLogo(storeId ?? 0)` 라
   *    가게를 아직 등록하지 않았으면 `/stores/0/logo` 로 나가 무조건 실패합니다.
   *    화면에는 "사진을 올리지 못했습니다" 만 떠서 원인을 알 수 없었습니다.
   *    → 가게가 없으면 아예 시도하지 않고 그 사실을 말해 줍니다.
   *
   *    함께 손본 것
   *      · 실패 사유를 Alert 에 그대로 띄웁니다 — 그 문구가 다음 진단입니다
   *      · 권한을 아예 거부해 둔 경우 설정으로 가는 길
   */
  const pickImage = async () => {
    if (!storeId) {
      Alert.alert(
        '가게 정보를 먼저 등록해 주세요',
        '프로필 사진은 가게에 붙는 값이라, 가게를 등록해야 올릴 수 있습니다.'
      );
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        '사진 권한이 필요합니다',
        perm.canAskAgain
          ? '프로필 사진을 고르려면 사진 접근을 허용해 주세요.'
          : '전에 거부하셔서 앱에서는 켤 수 없습니다. 설정에서 허용해 주세요.',
        [{ text: '닫기' }, { text: '설정 열기', onPress: () => Linking.openSettings() }]
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    uploadLogo.mutate(res.assets[0].uri, {
      onError: (e) =>
        Alert.alert(
          '사진을 올리지 못했습니다',
          `신호를 확인하고 다시 시도해 주세요.

(${e instanceof Error ? e.message : String(e)})`
        ),
    });
  };

  const save = () => {
    updateStore.mutate({ name: form.name.trim(), category: form.category.trim() });
    setSaved(true);
    setDirty(false);
  };

  return (
    /*
     * ⚠️ `edges={['top']}` 이 필요합니다.
     *    footer 가 없으면 `Screen` 의 SafeAreaView 가 하단 안전영역(34)을 먹는데,
     *    여기에 body 의 `paddingBottom: 32` 가 더해져 **66** 이 됐습니다
     *    (시안은 pb-8 = 32. 스크롤 하단 캡처 실측으로 확인).
     *    안전영역은 여기서 직접 다뤄야 저장하기 버튼 아래가 시안만큼만 남습니다.
     */
    <Screen
      padded={false}
      scroll
      edges={['top']}
      contentStyle={{ paddingTop: 0, paddingBottom: 0, gap: 0 }}
    >
      <AppBar onBack={() => nav.goBack()} title="프로필 수정" />

      <View style={[styles.body, { paddingBottom: Math.max(insets.bottom, space[8]) }]}>
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
          {connectNotice && (
            <Banner
              tone="danger"
              title={`${connectNotice} 계정이 연동되지 않았습니다`}
              description="다시 시도해 주세요."
            />
          )}

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
                    onPress={() => {
                      // 시안 V4: 바로 브라우저로 가지 않고 연동 시트를 먼저 띄웁니다.
                      setConnecting(p);
                      setPhase('consent');
                      leftApp.current = false;
                      authorize.reset();
                    }}
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

      {/*
        ⑤ 시안 연동 바텀시트.
        Screen 의 본문은 ScrollView 라 여기에 absolute 로 띄우면 같이 스크롤됩니다.
        화면 전체(앱바 포함)를 덮어야 해서 Modal 로 올립니다.
      */}
      <Modal
        visible={!!connecting}
        transparent
        animationType="fade"
        // 안드로이드 뒤로가기. 시안에는 없지만 연결 중에 갇히지 않을 유일한 출구입니다.
        onRequestClose={closeSheet}
      >
        {connecting && (
          <View style={styles.sheetScrim}>
            {/* 시안: 동의 단계에서만 바깥을 눌러 닫을 수 있습니다 */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              style={styles.scrimTouch}
              onPress={phase === 'consent' ? closeSheet : undefined}
            />

            {/* 시안: rounded-t-[28px] · px-6 · pt-5 · pb-8 */}
            <View style={styles.sheet}>
              {/* 시안: mx-auto mb-5 h-1 w-10 rounded-full bg-hairline */}
              <View style={styles.grip} />

              {phase === 'consent' ? (
                <View style={styles.consent}>
                  <BrandMark kind={connecting.mark} size={30} boxed />
                  {/* 시안: mt-4 18 bold */}
                  <Text style={styles.connectTitle}>{connecting.label} 계정으로 연동</Text>
                  {/* 시안: mt-1.5 13 slate */}
                  <Text style={styles.connectSub}>
                    Reals.가 {connecting.label} 계정에 안전하게 연결됩니다.
                  </Text>

                  {/* 시안: mt-5 rounded-2xl bg-surface p-4 gap-2.5 · 좌측 정렬 */}
                  <View style={styles.scopeCard}>
                    <ShieldCheck size={18} strokeWidth={2} color={color.done[500]} />
                    <View style={styles.scopeText}>
                      <Text style={styles.scopeTitle}>요청 권한</Text>
                      <Text style={styles.scopeBody}>{connecting.scope}</Text>
                    </View>
                  </View>

                  {authorize.isError && (
                    <View style={styles.errorWrap}>
                      <Banner
                        tone="danger"
                        title="연동을 시작하지 못했습니다"
                        description="잠시 후 다시 시도해 주세요."
                      />
                    </View>
                  )}

                  {/* 시안: mt-5 h-52 rounded-xl · 배경은 플랫폼색 · 마크 12 + 15 semibold 흰 글자 */}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => startConnect(connecting)}
                    style={({ pressed }) => [
                      styles.connectBtn,
                      { backgroundColor: connecting.brandColor },
                      pressTap(pressed, 'button'),
                    ]}
                  >
                    <BrandMark kind={connecting.mark} size={12} boxed />
                    <Text style={styles.connectBtnText}>
                      {connecting.label} 계정으로 계속하기
                    </Text>
                  </Pressable>

                  {/* 시안: mt-3 14 medium slate */}
                  <Pressable accessibilityRole="button" onPress={closeSheet} hitSlop={8}>
                    <Text style={styles.cancelText}>취소</Text>
                  </Pressable>
                </View>
              ) : (
                // 시안: py-6 · loader-circle 34 brand 회전 · 15 semibold · 13 slate
                <View style={styles.loadingWrap}>
                  <Spinner size={34} />
                  <Text style={styles.loadingTitle}>
                    {connecting.label} 계정에 연결 중...
                  </Text>
                  <Text style={styles.loadingSub}>잠시만 기다려 주세요</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 시안: px-5 pb-8. 하단 여백은 화면에서 안전영역과 함께 계산합니다(위 주석).
  body: { paddingHorizontal: space[5] },

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

  // 시안: mt-7(28) gap-5(20)
  snsWrap: { marginTop: space[7], gap: space[5] },
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
    marginTop: space[8],
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { ...theme.text.button, color: color.paper },

  // ── ⑤ 연동 바텀시트 ─────────────────────────────────
  // 시안: bg-[rgba(15,23,42,0.6)]
  sheetScrim: { flex: 1, backgroundColor: color.overlay.scrim, justifyContent: 'flex-end' },
  scrimTouch: { flex: 1 },
  // 시안: rounded-t-[28px] px-6 pb-8 pt-5
  sheet: {
    paddingHorizontal: space[6],
    paddingTop: space[5],
    paddingBottom: space[8],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.canvas,
  },
  // 시안: h-1(4) w-10(40) · mb-5
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: space[5],
    borderRadius: radius.pill,
    backgroundColor: color.ink[200],
  },

  consent: { alignItems: 'center' },
  // 시안: mt-4 · 18 bold
  connectTitle: { ...theme.text.heading, marginTop: space[4], textAlign: 'center' },
  // 시안: mt-1.5(6) · 13 slate · leading-relaxed
  connectSub: { ...theme.text.caption, marginTop: 6, textAlign: 'center' },

  // 시안: mt-5 · rounded-2xl(16) · bg-surface · p-4 · gap-2.5 · items-start
  scopeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    width: '100%',
    marginTop: space[5],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  scopeText: { flex: 1, gap: 2 },
  // 시안: 13 semibold ink
  scopeTitle: { ...theme.text.chipLabel, color: color.ink[900] },
  // 시안: 12 slate · leading-snug
  scopeBody: {
    ...theme.text.label,
    fontFamily: theme.text.caption.fontFamily,
    fontWeight: theme.text.caption.fontWeight,
    color: color.ink[500],
  },

  errorWrap: { width: '100%', marginTop: space[4] },

  // 시안: mt-5 · height 52 · rounded-xl · gap-2 · 배경은 플랫폼색
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    width: '100%',
    height: 52,
    marginTop: space[5],
    borderRadius: radius.md,
  },
  connectBtnText: { ...theme.text.button, color: color.paper },
  // 시안: mt-3 · 14 medium slate
  cancelText: { ...theme.text.bodySmall, marginTop: space[3], color: color.ink[500] },

  // 시안: py-6 가운데 정렬
  loadingWrap: { alignItems: 'center', paddingVertical: space[6] },
  // 시안: mt-4 15 semibold ink
  loadingTitle: { ...theme.text.bodyStrong, marginTop: space[4], textAlign: 'center' },
  // 시안: mt-1 13 slate
  loadingSub: { ...theme.text.caption, marginTop: space[1], textAlign: 'center' },
});
