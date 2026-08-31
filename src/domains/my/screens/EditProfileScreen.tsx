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
 *        동의: 제목 18 · 안내 13 · 요청 권한 카드 · **브랜드색** 버튼 52 · 취소
 *              (시안 8차에서 제목 위 마크 30 과 버튼 안 마크 12 가 빠졌습니다 — 2026-08-28 반영)
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
  TextInput,
  Alert,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, CircleAlert, Plus, ShieldCheck, X } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Field } from '../../../ui/Field';
import { Banner, Spinner } from '../../../ui/Feedback';
import { MenuManager } from '../components/MenuManager';
import {
  SnsConnectSheet,
  SNS_PLATFORMS,
  findSnsPlatform,
  type SnsPlatformMeta,
} from '../components/SnsConnectSheet';
import { BrandMark } from '../../../ui/BrandMark';
import { pressTap } from '../../../ui/press';
import { ApiError } from '../../../api/http';
import { useAppState } from '../../../lib/appState';
import { useStore, useUpdateStore, useUploadLogo } from '../../../api/queries/store';
import { useDisconnectSns, useSnsAuthorize, useSnsConnections } from '../../../api/queries/edit';
import type { SnsPlatform } from '../../../api/schema/types';
import theme, { color, radius, sizing, space, text } from '../../../design/theme';
import type { MyStackParamList, RootStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList & MyStackParamList>;

/**
 * 시안 `PLATFORM_META`.
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 `scope` 는 **서버가 실제로 요청하는 권한**입니다. 시안 문구가 아닙니다.
 * ─────────────────────────────────────────────────────────────
 * 시안에는 "게시물 업로드 권한" · "동영상 업로드 권한" 이라고 적혀 있었는데,
 * 2026-08-26 실서버 `GET /sns-connections/authorize` 가 주는 주소를 열어 보니
 * 요청 범위가 **전부 읽기 전용**이었습니다.
 *
 *   INSTAGRAM  instagram_business_basic · instagram_business_manage_insights
 *   YOUTUBE    yt-analytics.readonly · youtube.readonly
 *
 * 올리는 권한은 어디에도 없습니다. 그대로 뒀으면 **동의 화면이 사장님께 거짓을
 * 말하는 것**이 됩니다(CLAUDE.md §2 제1규칙). 실제 범위로 고쳤습니다.
 *
 * ⚠️ 범위는 서버가 정합니다. BE 가 scope 를 바꾸면 이 문구도 같이 고쳐야 합니다.
 *    확인 방법: authorize_url 의 `scope=` 파라미터를 그대로 읽으면 됩니다.
 *
 * `requires` 는 그 범위를 쓰려면 계정이 갖춰야 하는 조건입니다. 인스타그램
 * `instagram_business_*` 는 **개인 계정으로는 통과되지 않습니다** — 로그인까지는
 * 되고 마지막에 막혀서, 안내가 없으면 "앱이 고장났다" 로 읽힙니다.
 */
/** 연동 목록은 시트가 들고 있습니다 — 두 화면이 같은 것을 봐야 합니다. */
const PLATFORMS = SNS_PLATFORMS;


/**
 * 시안 8차 `SYNC_CATEGORIES` 원문 — 매장 등록(`StoreSearchScreen`)과 **같은 목록**입니다.
 *
 * 등록 화면은 칩으로 고르게 해 놓고 수정 화면만 자유 입력이었습니다. 업종은 AI 기획·추천에
 * 들어가는 값이라 "카페 / 까페 / 커피숍" 이 뒤섞이면 추천 품질이 흔들립니다.
 */
const CATEGORIES = [
  '카페',
  '식당',
  '미용',
  '운동',
  '의류',
  '꽃집',
  '반려동물',
  '공방',
  '학원',
  '직접입력',
] as const;

/**
 * 전화번호 표기 — 시안 `formatPhone` 과 같은 모양입니다 (02-1234-5678 / 010-1234-5678).
 * 서버에는 표기 그대로 보냅니다 (3.1 `phone` 은 문자열입니다).
 */
function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.startsWith('02')) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

export default function EditProfileScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'EditProfile'>>();
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

  const [form, setForm] = useState({ name: '', category: '', phone: '' });
  /**
   * 업종이 시안 목록에 없으면 칩은 '직접입력' 을 고른 상태로 두고 원문을 여기에 담습니다.
   * 서버가 준 값을 목록에 없다는 이유로 버리지 않습니다.
   */
  const [customCategory, setCustomCategory] = useState('');
  const [dirty, setDirty] = useState(false);

  /** 연동 시트를 열 플랫폼. null 이면 닫힘. 나머지는 시트가 알아서 합니다. */
  const [connecting, setConnecting] = useState<SnsPlatformMeta | null>(null);

  /**
   * 🔴 **마이페이지에서 넘어오면 바로 시트를 엽니다** (2026-08-28 지시).
   *
   * ⚠️ 2026-08-31 부터 마이페이지는 **이 화면으로 오지 않고 제자리에서** 시트를
   *    띄웁니다. 이 길은 다른 데서 `connect` 파라미터로 들어올 때를 위해 남깁니다.
   *
   * **한 번만** 엽니다 — 시트를 닫고 화면에 머무는데 다시 열리면 안 됩니다.
   */
  const autoOpened = useRef(false);
  useEffect(() => {
    const want = route.params?.connect;
    if (!want || autoOpened.current) return;
    const p = findSnsPlatform(want);
    if (!p) return;
    autoOpened.current = true;
    setConnecting(p);
  }, [route.params?.connect]);

  // 서버 값이 오면 채웁니다. 사장님이 입력 중이면 덮지 않습니다.
  useEffect(() => {
    if (dirty) return;
    const saved = store?.category ?? '';
    const known = (CATEGORIES as readonly string[]).includes(saved);
    setForm({
      name: store?.name ?? '',
      // 목록에 없는 업종이면 칩은 '직접입력' 을 켜고 원문은 아래 칸에 남깁니다.
      category: known ? saved : saved ? '직접입력' : '',
      phone: formatPhone(store?.phone ?? ''),
    });
    setCustomCategory(known ? '' : saved);
  }, [store, dirty]);

  /** 저장·표시에 쓰는 실제 업종. '직접입력' 이면 아래 칸의 글자가 값입니다. */
  const resolvedCategory =
    form.category === '직접입력' ? customCategory.trim() : form.category;

  const set = (k: keyof typeof form) => (v: string) => {
    setDirty(true);
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
          // 사장님께 할 말 + 진짜 원인. e.message 는 코드별 안내문이라 원인이 아닙니다
          `신호를 확인하고 다시 시도해 주세요.

(${e instanceof ApiError ? (e.serverMessage ?? e.code) : e instanceof Error ? e.message : String(e)})`
        ),
    });
  };

  /**
   * 저장 — **성공했을 때만** 넘어갑니다.
   *
   * ⚠️ 전에는 `mutate` 를 부르고 곧바로 "저장했습니다" 를 띄웠습니다. 응답을 기다리지
   *    않았고 `updateStore.isError` 를 화면 어디서도 보지 않아서, **PATCH 가 실패해도
   *    성공했다고 말했습니다.** 사장님은 저장된 줄 알고 나갑니다 — 우리 제1규칙
   *    ("저장은 상태를 실제로 바꾼다") 위반입니다. (2026-08-26 수정)
   *
   * 성공하면 이전 화면으로 돌아갑니다. 시안이 그렇게 합니다 — 확인 배너가 따로 없고
   * **화면이 닫히는 것 자체가 확인**입니다 (`screens-my.jsx` 의 `save()` → `navigate("mypage")`).
   * 실패하면 그 자리에 남아 이유를 보여 줍니다. 입력값은 그대로 있습니다.
   */
  const save = () => {
    if (updateStore.isPending) return;
    updateStore.mutate(
      {
        name: form.name.trim(),
        category: resolvedCategory,
        // 비워 두면 지운 것으로 봅니다 — 없는 번호를 남겨 두지 않습니다.
        phone: form.phone.trim(),
      },
      {
        onSuccess: () => {
          setDirty(false);
          nav.goBack();
        },
      }
    );
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
      <AppBar onBack={() => nav.goBack()} title="매장 정보 수정" />

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

          {/*
            업종 카테고리 — 시안 8차에서 자유 입력이 **칩 고르기**로 바뀌었습니다.
            목록은 매장 등록(`StoreSearchScreen`)이 쓰는 것과 같은 `CATEGORIES` 입니다.
            등록에서 골라 놓고 수정에서는 아무 글자나 받던 어긋남을 없앱니다.
          */}
          <View>
            <Text style={styles.fieldLabel}>업종 카테고리</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => {
                const on = form.category === c;
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      setDirty(true);
                      setForm((p) => ({ ...p, category: c }));
                      if (c !== '직접입력') setCustomCategory('');
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      on ? styles.chipOn : styles.chipOff,
                      pressTap(pressed, 'button'),
                    ]}
                  >
                    <Text style={[styles.chipText, on && { color: color.paper }]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
            {/* 시안: mt-2.5 — 칩에서 '직접입력' 을 골랐을 때만 열립니다 */}
            {form.category === '직접입력' && (
              <TextInput
                value={customCategory}
                onChangeText={(v) => {
                  setDirty(true);
                  setCustomCategory(v);
                }}
                placeholder="업종을 직접 입력해 주세요"
                placeholderTextColor={color.ink[500]}
                accessibilityLabel="업종 직접 입력"
                style={[styles.textInput, { marginTop: 10 }]}
              />
            )}
          </View>

          {/* 전화번호 — 시안 8차 신규. 3.1 `phone` 에 표기 그대로 들어갑니다 */}
          <View>
            <Text style={styles.fieldLabel}>전화번호</Text>
            <TextInput
              value={form.phone}
              onChangeText={(v) => {
                setDirty(true);
                setForm((p) => ({ ...p, phone: formatPhone(v) }));
              }}
              keyboardType="phone-pad"
              placeholder="0212345678"
              placeholderTextColor={color.ink[500]}
              accessibilityLabel="전화번호"
              style={[styles.textInput, styles.phoneInput]}
            />
          </View>
        </View>

        {/*
          ②-2 매장 메뉴 관리 (시안 8·9차).
          아래 "저장하기" 와 **저장 시점이 다릅니다** — 메뉴는 별도 API 라 줄마다
          그 자리에서 저장됩니다 (MenuManager 머리말).
        */}
        <View style={styles.menuWrap}>
          <MenuManager storeId={storeId ?? undefined} />
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
                        {/*
                          서버가 계정 이름을 비운 채 저장하는 경우가 있습니다(2026-08-28,
                          유튜브 연동 직후 500 이 뜬 건). 그대로 찍으면 "@" 한 글자만
                          남아 고장으로 보입니다. 이름이 없으면 이름 자리를 비웁니다 —
                          옆의 "연동됨" 배지가 이미 상태를 말하고 있습니다.
                        */}
                        {c.snsAccountName?.trim() ? (
                          <Text style={styles.handle} numberOfLines={1}>
                            @{c.snsAccountName.trim()}
                          </Text>
                        ) : (
                          <Text style={[styles.handle, { color: color.ink[500] }]} numberOfLines={1}>
                            계정 이름 없음
                          </Text>
                        )}
                        <View style={styles.linkedBadge}>
                          <Check size={10} strokeWidth={3} color={color.done[500]} />
                          <Text style={styles.linkedText}>연동됨</Text>
                        </View>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${c.snsAccountName?.trim() || p.label} 연동 해제`}
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
                    // 시안 V4: 바로 브라우저로 가지 않고 연동 시트를 먼저 띄웁니다.
                    onPress={() => setConnecting(p)}
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

        {/* ④ 저장 — 성공하면 이전 화면으로 돌아갑니다 (시안) */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: updateStore.isPending }}
          disabled={updateStore.isPending}
          onPress={save}
          style={({ pressed }) => [styles.saveBtn, pressTap(pressed, 'card')]}
        >
          {updateStore.isPending ? (
            <Spinner size={18} tint={color.paper} />
          ) : (
            <Text style={styles.saveText}>저장하기</Text>
          )}
        </Pressable>

        {/* 실패는 반드시 말합니다. 조용히 넘어가면 저장된 줄 알고 나갑니다. */}
        {updateStore.isError && (
          <View style={{ marginTop: space[3] }}>
            <Banner
              tone="danger"
              title="저장하지 못했습니다"
              description="입력하신 내용은 그대로 있습니다. 다시 눌러 주세요."
            />
          </View>
        )}

      </View>

      {/*
        ⑤ 연동 바텀시트 — **떼어냈습니다** (2026-08-31).
           마이페이지도 같은 시트를 자기 자리에서 띄웁니다(`SnsConnectSheet` 머리말).
      */}
      <SnsConnectSheet open={connecting} onClose={() => setConnecting(null)} />

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
  // 시안 8차: mt-6 · 블록 사이 gap-5(20). 예전 gap-4(16) 는 입력칸이 둘뿐일 때 값입니다.
  fields: { marginTop: space[6], gap: space[5] },

  // ── 업종 카테고리 · 전화번호 (시안 8차) ──────────────
  // 시안: mb-1.5(6) pl-1(4) · 12 medium slate
  fieldLabel: { ...text.label, marginBottom: 6, paddingLeft: 4, color: color.ink[500] },
  // 시안: flex-wrap gap-2(8)
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  // 시안: rounded-full border px-4 py-2 · 14 semibold
  chip: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
  },
  chipOn: { borderColor: color.brand[600], backgroundColor: color.brand[600] },
  chipOff: { borderColor: color.ink[200], backgroundColor: color.surface },
  chipText: {
    ...text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[800],
  },
  /*
   * 시안: h-[52px] rounded-xl border-hairline bg-surface px-4 · 15 medium.
   *
   * ⚠️ `lineHeight`·세로 패딩·`includeFontPadding` 을 끕니다 — 안드로이드에서 글자
   *    윗부분이 잘리던 것과 같은 조합입니다(`MenuManager` 의 `INPUT_FIT` 주석 참고).
   *    52 는 여유가 있어 지금 당장 잘리진 않지만, 같은 실수를 반복하지 않습니다.
   */
  textInput: {
    ...text.body,
    lineHeight: undefined,
    height: sizing.inputHeight,
    paddingVertical: 0,
    paddingHorizontal: space[4],
    includeFontPadding: false,
    textAlignVertical: 'center',
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
    color: color.ink[900],
  },
  // 시안: 전화번호만 tabular-nums — 자릿수가 흔들리지 않게
  phoneInput: { fontVariant: ['tabular-nums'] },

  // 매장 정보와 SNS 사이. 시안의 블록 간격(mt-6)과 같습니다.
  menuWrap: { marginTop: space[6] },
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






});
