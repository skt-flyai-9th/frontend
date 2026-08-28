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
const PLATFORMS = [
  {
    key: 'INSTAGRAM' as const,
    label: 'Instagram',
    mark: 'instagram' as const,
    scope: '프로필 정보 · 게시물 성과(조회수·저장수) 읽기',
    requires: '비즈니스 또는 크리에이터 계정이어야 하고, 페이스북 페이지가 연결돼 있어야 해요.',
  },
  {
    key: 'YOUTUBE' as const,
    label: 'YouTube',
    mark: 'youtube' as const,
    scope: '채널 정보 · 영상 성과(조회수·시청 시간) 읽기',
    requires: null,
  },
];

type Platform = (typeof PLATFORMS)[number];

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

  /** 연동 시트. null 이면 닫힘. */
  const [connecting, setConnecting] = useState<Platform | null>(null);
  /** 시안의 connectState — 'consent'(동의) / 'loading'(연결 중) */
  const [phase, setPhase] = useState<'consent' | 'loading'>('consent');
  /** 브라우저로 정말 나갔다 왔는지. 이게 없이는 첫 'active' 를 복귀로 오인합니다. */
  const leftApp = useRef(false);
  /** 나가기 직전의 연동 개수. 돌아와서 늘었는지로 성공을 판단합니다. */
  const beforeCount = useRef(0);
  /**
   * 돌아왔는데 연동이 안 됐을 때 띄우는 **얼럿**. 플랫폼 자체를 들고 있습니다 —
   * "다시 시도" 가 같은 플랫폼으로 시트를 다시 열어야 하기 때문입니다.
   *
   * 시안 8차에서 화면 안쪽 배너 → **정중앙 얼럿**으로 바뀌었습니다. 배너는 목록
   * 위에 조용히 얹혀서, 브라우저에서 돌아온 사장님이 못 보고 지나칩니다.
   * 오늘 인스타 연동이 실제로 실패하는 자리라(BE §0-2 — 2026-08-27 에 서버가 고쳤습니다) 놓치면 안 됩니다.
   */
  const [failed, setFailed] = useState<Platform | null>(null);

  /** 얼럿의 "다시 시도" — 같은 플랫폼으로 동의 시트를 다시 엽니다 (시안 `retry`). */
  const retryConnect = () => {
    const p = failed;
    setFailed(null);
    if (!p) return;
    setConnecting(p);
    setPhase('consent');
  };

  /**
   * 🔴 **마이페이지에서 바로 연동 시트를 엽니다** (2026-08-28 사장님 지시).
   *
   * 예전에는 마이페이지 SNS 줄에서 아직 연동 안 된 쪽을 누르면 이 화면만 띄우고
   * 끝났습니다. 사장님은 여기서 다시 아래로 내려 그 플랫폼을 찾아 눌러야 했습니다.
   * 갈 곳이 뻔한데 한 단계를 더 걷게 한 셈입니다.
   *
   * `connect` 파라미터가 있으면 그 플랫폼의 동의 시트까지 열어 줍니다.
   * **한 번만** 엽니다 — 시트를 닫고 화면에 머무는데 다시 열리면 안 됩니다.
   */
  const autoOpened = useRef(false);
  useEffect(() => {
    const want = route.params?.connect;
    if (!want || autoOpened.current) return;
    const p = PLATFORMS.find((x) => x.key === want);
    if (!p) return;
    autoOpened.current = true;
    setConnecting(p);
    setPhase('consent');
  }, [route.params?.connect]);

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
    setFailed(null);
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
        if (after <= beforeCount.current) setFailed(platform);
      });
    });
    return () => sub.remove();
  }, [connecting, phase]);

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
                  {/*
                    시안 8차에서 **제목 위 브랜드 마크(30)가 빠졌습니다.**
                    버튼 안 마크(12)도 함께 빠지고 버튼색이 플랫폼색에서 브랜드색으로
                    바뀌었습니다 — 어느 플랫폼이든 같은 모양이 됩니다.
                    2026-08-28 에 반영했습니다. 시트가 약 46pt 짧아집니다(마크 30 + 여백 16).
                  */}
                  {/* 시안: 시트 맨 위 · 18 bold (마크가 없어져 위 여백도 없습니다) */}
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
                      {/*
                        계정 조건은 **막히기 전에** 말해야 합니다. 인스타그램은 개인
                        계정으로 로그인까지 되고 마지막에 거절돼서, 안내가 없으면
                        앱이 고장난 것으로 읽힙니다.
                      */}
                      {connecting.requires ? (
                        <Text style={styles.scopeNote}>{connecting.requires}</Text>
                      ) : null}
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

                  {/* 시안 8차: mt-5 h-52 rounded-xl · **bg-brand** · 15 semibold 흰 글자 (마크 없음) */}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => startConnect(connecting)}
                    style={({ pressed }) => [styles.connectBtn, pressTap(pressed, 'button')]}
                  >
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

      {/*
        ⑥ 연동 실패 얼럿 (시안 8차 신규).
        시트와 마찬가지로 Modal 로 올립니다 — 화면 전체를 덮어야 사장님이 놓치지
        않습니다. 브라우저에서 돌아온 직후라 화면 어딘가의 배너로는 안 보입니다.
      */}
      <Modal visible={!!failed} transparent animationType="fade" onRequestClose={() => setFailed(null)}>
        <View style={styles.alertScrim}>
          <View accessibilityViewIsModal accessibilityRole="alert" style={styles.alertBox}>
            {/* 시안: h-12 w-12 rounded-2xl bg-heart/10 · circle-alert 24 */}
            <View style={styles.alertIcon}>
              <CircleAlert size={24} strokeWidth={2} color={color.danger[500]} />
            </View>
            {/* 시안: mt-4 · 17 bold leading-snug · 두 줄로 끊어 씁니다 */}
            <Text style={styles.alertTitle}>
              {failed?.label} 계정이{'\n'}연동되지 않았어요
            </Text>
            <Text style={styles.alertSub}>다시 시도해 주세요.</Text>
            {/* 시안: mt-6 gap-2.5 · h48 · 닫기 flex 1 / 다시 시도 flex 1.4 */}
            <View style={styles.alertCta}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFailed(null)}
                style={({ pressed }) => [styles.alertGhost, pressTap(pressed, 'button')]}
              >
                <Text style={styles.alertGhostText}>닫기</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={retryConnect}
                style={({ pressed }) => [styles.alertPrimary, pressTap(pressed, 'button')]}
              >
                <Text style={styles.alertPrimaryText}>다시 시도</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── 연동 실패 얼럿 (시안 8차) ──────────────────────────────
  // 시안: bg-[rgba(15,23,42,0.6)] — 연동 시트와 같은 농도입니다
  alertScrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  // 시안: w-[300px] rounded-3xl px-6 pt-7 pb-5 · 가운데 정렬
  alertBox: {
    width: 300,
    maxWidth: '100%',
    alignItems: 'center',
    paddingHorizontal: space[6],
    paddingTop: space[7],
    paddingBottom: space[5],
    borderRadius: radius.dialog,
    backgroundColor: color.canvas,
  },
  alertIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    // 시안 bg-heart/10 — 위험색을 10% 로 깔았습니다
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  alertTitle: {
    ...theme.text.subheading,
    fontSize: 17,
    lineHeight: 23,
    marginTop: space[4],
    textAlign: 'center',
    color: color.ink[900],
  },
  alertSub: {
    ...text.caption,
    marginTop: space[2],
    lineHeight: 19,
    textAlign: 'center',
    color: color.ink[500],
  },
  alertCta: { flexDirection: 'row', gap: 10, marginTop: space[6], alignSelf: 'stretch' },
  alertGhost: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.canvas,
  },
  alertGhostText: {
    ...text.button,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[800],
  },
  // 시안 flex-[1.4] — 무엇이 기본 동작인지 크기로 말합니다
  alertPrimary: {
    flex: 1.4,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
  },
  alertPrimaryText: {
    ...text.button,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.paper,
  },

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
  /*
   * 시트 안 줄높이는 시안 클래스 그대로 잡았습니다 (CLAUDE.md §5-①).
   * 토큰 줄높이가 더 짧아 그냥 두면 블록마다 짧아지고 그게 쌓입니다.
   *   제목    18, leading 없음        → ×1.5   = 27      (토큰 24)
   *   부제    13, leading-relaxed     → ×1.625 = 21.125  (토큰 19)
   *   요청권한 13, leading 없음        → ×1.5   = 19.5    (토큰 18)
   *   권한내용 12, leading-snug        → ×1.375 = 16.5    (토큰 17)
   */
  // 시안: 시트 맨 위 · 18 bold (마크가 빠져 위 여백 없음)
  connectTitle: { ...theme.text.heading, lineHeight: 27, textAlign: 'center' },
  // 시안: mt-1.5(6) · 13 slate · leading-relaxed
  connectSub: { ...theme.text.caption, marginTop: 6, lineHeight: 21.125, textAlign: 'center' },

  // 시안: mt-5 · rounded-2xl(16) · bg-surface · p-4 · gap-2.5(10) · items-start
  scopeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
    marginTop: space[5],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  scopeText: { flex: 1, gap: 2 },
  // 시안: 13 semibold ink
  scopeTitle: { ...theme.text.chipLabel, lineHeight: 19.5, color: color.ink[900] },
  /*
   * 시안: 12 slate · leading-snug. 굵기 지정이 없어 400 이지만 토큰에 12-regular 이
   * 없고 `family()` 를 우회하면 폰트 미로딩 때 깨지므로 medium 으로 둡니다 —
   * 크기·줄높이는 시안과 같고 굵기 한 단계만 다릅니다.
   */
  scopeBody: {
    ...theme.text.label,
    fontFamily: theme.text.caption.fontFamily,
    fontWeight: theme.text.caption.fontWeight,
    lineHeight: 16.5,
    color: color.ink[500],
  },
  /*
   * 계정 조건. 시안에 없는 줄이라 권한 문구보다 한 단계 눌러 둡니다 —
   * 읽어야 하는 값이지만 "요청 권한" 자리를 뺏으면 안 됩니다.
   * (개인 계정으로 로그인까지 되고 마지막에 거절돼서, 안내가 없으면 고장으로 읽힙니다)
   */
  scopeNote: {
    ...theme.text.label,
    fontFamily: theme.text.caption.fontFamily,
    fontWeight: theme.text.caption.fontWeight,
    lineHeight: 16.5,
    marginTop: 4,
    color: color.ink[400],
  },

  errorWrap: { width: '100%', marginTop: space[4] },

  // 시안 8차: mt-5 · height 52 · rounded-xl · **bg-brand** (마크가 빠져 gap 도 없습니다)
  connectBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    marginTop: space[5],
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
  },
  connectBtnText: { ...theme.text.button, lineHeight: 22.5, color: color.paper },
  // 시안: mt-3 · 14 medium slate
  cancelText: { ...theme.text.bodySmall, marginTop: space[3], color: color.ink[500] },

  // 시안: py-6 가운데 정렬
  loadingWrap: { alignItems: 'center', paddingVertical: space[6] },
  // 시안: mt-4 15 semibold ink
  loadingTitle: { ...theme.text.bodyStrong, marginTop: space[4], textAlign: 'center' },
  // 시안: mt-1 13 slate
  loadingSub: { ...theme.text.caption, marginTop: space[1], textAlign: 'center' },
});
