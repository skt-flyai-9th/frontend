/**
 * StoreSearchScreen — **시안 V4 `store-sync` 대조 이식** (2026-08-26). 명세 2.1, 2.2.
 *
 * 시안 구조 (위에서부터)
 *   헤더    뒤로가기 + "매장 등록"
 *   ①      "매장 정보를 등록해 주세요" 22·bold + mt-2 안내 14·slate
 *   ②      mt-6 초록 버튼 h56 rounded-full "네이버 스마트플레이스 연동으로 채우기"
 *            누르면 불러오는 중 → 연동 완료 (아이콘도 loader → check)
 *   ③      mt-6 구분선 "또는 직접 입력"
 *   ④      mt-5 gap-5 — 매장 이름(h52) / 업종 카테고리 칩 10개 / 지역·주소
 *            주소는 검색창(h52) + 후보 목록 + 고르면 지도와 주소 카드
 *   ⑤      mt-auto pt-8 "시작하기" (셋 다 채워야 켜집니다)
 *
 * ⚠️ 시안의 연동 버튼은 1.5초 뒤 값이 채워지는 목업입니다.
 *    우리는 2.1 검색이 그 일을 합니다 — 매장 이름으로 찾아 첫 후보의 이름·업종·주소·좌표를
 *    그대로 채웁니다. 이름을 안 적었으면 무엇으로 찾을지 알 수 없으므로 먼저 적어 달라고 합니다.
 *
 * ⚠️ 시안 주소 검색은 도로명·지번을 가진 자체 목록입니다. 우리 2.1 은 가게를 찾아
 *    이름·주소·좌표를 주므로, 후보에는 주소를 크게 이름을 작게 보여 줍니다.
 *    **후보 목록에는 도로명만** 씁니다 — 한 줄짜리 행이라 지번까지 넣으면 넘칩니다.
 *    지번은 확인 시트에서 보여 줍니다(StorePreviewSheet 머리말).
 *
 * ⚠️ **시안에 없는 것을 하나 더했습니다 — 매장 이름 후보 목록** (2026-08-26, 사장님 지시).
 *    시안 ④ 의 이름 칸은 글자만 받지만, 우리는 치는 대로 2.1 로 찾아 후보를 아래에
 *    쭉 깔고 눌러서 확정하게 합니다. 시안의 연동 버튼이 목업(1.5초 뒤 값이 채워짐)이라
 *    실제 데이터로 만들려면 어차피 시안과 달라져야 하는 자리입니다.
 *    이 블록이 생기면서 06_store-sync 의 시안 대조 세로 위치는 그만큼 밀립니다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Check, ChevronDown, Link2, MapPin, Phone, Search, Store, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Banner, Spinner } from '../../../ui/Feedback';
import { MapPreview } from '../../../ui/MapPreview';
import { DropIn } from '../../../ui/DropIn';
import { pressTap } from '../../../ui/press';
import { categoryHint, jibunText, matchCategory, phoneText } from '../../../lib/format';
import { useAppState } from '../../../lib/appState';
import { useCreateStore, useStoreSearch } from '../../../api/queries/store';
import theme, { color, radius, sizing, space, text } from '../../../design/theme';
import type { PlaceResult } from '../../../api/schema/types';
import type { RootStackParamList, StoreSetupStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<StoreSetupStackParamList, 'StoreSearch'>;

/**
 * 한 번에 보여줄 후보 개수. 넘으면 "더보기" 를 붙입니다 (2026-08-26 사장님 지시).
 *
 * 시안은 `.slice(0, 5)` 로 다섯 개에서 끊고 더 볼 방법이 없습니다. 이름을 짧게 치면
 * 후보가 훨씬 많은데 나머지를 아예 못 봅니다. 그래서 10개까지 깔고, 더 있으면
 * 버튼을 붙여 눌렀을 때 나머지를 펼칩니다(버튼은 그때 사라집니다).
 * 행 모양은 시안 그대로입니다.
 */
const PAGE = 10;

/** 시안 SYNC_CATEGORIES 원문 */
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
];

export default function StoreSearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const setStoreId = useAppState((st) => st.setStoreId);
  // 등록이 끝나면 이 스택을 통째로 벗어나므로 루트 내비게이션을 씁니다.
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  /** 1 = 매장 찾기 · 2 = 업종 확인. 시안 8차가 나눈 그대로입니다. */
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [picked, setPicked] = useState<PlaceResult | null>(null);
  /** 후보를 몇 개까지 펼쳤는지. "더보기" 를 누르면 전부 보여 줍니다. */
  const [nameAll, setNameAll] = useState(false);
  /**
   * 확인 시트에 올라와 있는 후보. **아직 고른 것이 아닙니다** — "이 매장으로 선택"
   * 을 눌러야 `picked` 로 넘어갑니다 (StorePreviewSheet 머리말).
   */
  const [preview, setPreview] = useState<PlaceResult | null>(null);

  const createStore = useCreateStore();

  // 글자마다 서버를 부르지 않도록 350ms 늦춥니다.
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setKeyword(name), 350);
    // 검색어가 바뀌면 펼친 것을 다시 접습니다 — 새 결과는 처음부터 봅니다.
    setNameAll(false);
    return () => clearTimeout(t);
  }, [name]);
  const { data: hits, isFetching, isError } = useStoreSearch(picked ? '' : keyword);

  const candidates = hits ?? [];
  const shown = nameAll ? candidates : candidates.slice(0, PAGE);

  /**
   * 시트에서 확정했을 때. 이름·업종·주소·전화·좌표가 한 번에 들어옵니다.
   *
   * 업종은 **경로 전체를 키워드로 훑어** 우리 칩으로 보냅니다 (`matchCategory`).
   * 맨 뒤 조각을 떼는 방식은 `음식점>카페,디저트` 를 "디저트" 로, `...>미용실>준오헤어`
   * 를 "준오헤어" 로 만들어 버립니다 — `lib/format.ts` 머리말에 근거가 있습니다.
   *
   * 칩에 없는 업종(약국·편의점·세탁소 등)은 `직접입력` 으로 보내되, 그 칸에
   * 원문의 가장 좁은 조각을 **미리 채워** 둡니다. 사장님이 지우고 쓸 필요가 없습니다.
   */
  const pickStore = (r: PlaceResult) => {
    const chip = matchCategory(r.category);
    setName(r.name);
    setCategory(chip ?? '직접입력');
    setCustomCategory(chip ? '' : categoryHint(r.category));
    setPicked(r);
  };

  /** 다시 찾기 — 고른 것을 지우고 검색으로 돌아갑니다. */
  const clearPick = () => {
    setPicked(null);
    setName('');
    setCategory('');
    setCustomCategory('');
  };

  const resolvedCategory = category === '직접입력' ? customCategory.trim() : category;

  const submit = () => {
    if (!picked) return;
    createStore.mutate(
      {
        name: name.trim(),
        category: resolvedCategory,
        address: picked.address,
        phone: picked.phone,
        // 이제 매장은 검색 결과에서만 고릅니다 — 출처는 언제나 그 결과의 것입니다.
        infoSource: picked.source,
        externalChannelUrl: picked.externalChannelUrl,
        // 2.2 (2026-08-23): 검색이 준 좌표를 버리지 않고 그대로 저장시킵니다.
        latitude: picked.latitude,
        longitude: picked.longitude,
        /*
          2.2 (2026-08-26): 카카오 후보의 place_id 를 **그대로 돌려보냅니다.**

          ⚠️ 타입(`CreateStoreBody.kakaoPlaceId`)에는 2026-08-25 부터 있었는데
             여기서 싣는 줄이 빠져 있었습니다 — 매장 등록을 2단계로 나눌 때
             누락된 것으로 보입니다. 그동안 서버도 값을 안 내려줘서 아무도 몰랐고,
             오늘 BE 가 배포하면서 드러났습니다 (BE_전달사항.md §0-1).

          BE 는 이 값으로 대표메뉴 자동 수집을 겁니다. 저장되는 값이 아니라
          트리거일 뿐이라 화면에는 보이지 않습니다. NAVER 후보에는 없으므로
          그때는 `undefined` 로 나가고, 없어도 등록 자체는 됩니다.
        */
        kakaoPlaceId: picked.kakaoPlaceId ?? undefined,
      },
      {
        onSuccess: (store) => {
          setStoreId(Number(store.id));
          rootNav.reset({ index: 0, routes: [{ name: 'Main' }] });
        },
      }
    );
  };

  const phone = phoneText(picked?.phone);

  return (
    <Screen padded={false} scroll={false} edges={['top']} contentStyle={{ paddingTop: 0, gap: 0 }}>
      <AppBar
        onBack={() => (step === 2 ? setStep(1) : navigation.goBack())}
        title="매장 정보 등록하기"
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 ? (
          <>
            <Text style={text.title}>매장 정보를 등록해 주세요</Text>
            <Text style={styles.lead}>
              매장 이름을 검색해 선택하면 주소와 전화번호가 자동으로 채워져요.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>매장 이름</Text>
              {/* 시안: 돋보기가 칸 **안**에 들어갑니다 */}
              <View style={styles.searchBox}>
                <Search size={18} strokeWidth={2} color={color.ink[500]} />
                <TextInput
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    if (picked) setPicked(null);
                  }}
                  placeholder="매장 이름을 검색해 주세요"
                  placeholderTextColor={color.ink[500]}
                  accessibilityLabel="매장 이름 검색"
                  style={styles.searchInput}
                />
                {name.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="검색어 지우기"
                    hitSlop={8}
                    onPress={clearPick}
                  >
                    <X size={17} strokeWidth={2} color={color.ink[500]} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* 고르기 전 — 후보 목록 */}
            {!picked && (
              <>
                {isFetching && candidates.length === 0 && keyword.trim().length >= 2 ? (
                  <Text style={styles.hint}>찾는 중…</Text>
                ) : null}
                {isError ? (
                  <View style={{ marginTop: space[3] }}>
                    <Banner
                      tone="warn"
                      title="매장을 찾지 못했습니다"
                      description="신호를 확인하고 다시 검색해 주세요."
                    />
                  </View>
                ) : null}
                {!isFetching && !isError && keyword.trim().length >= 2 && candidates.length === 0 ? (
                  <Text style={styles.hint}>검색 결과가 없어요. 매장 이름을 다시 확인해 주세요.</Text>
                ) : null}

                {candidates.length > 0 && (
                  <View style={styles.results}>
                    {shown.map((r, i) => (
                      <DropIn key={`${r.name}-${r.address}`} index={i}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${r.name} ${r.address}`}
                          onPress={() => setPreview(r)}
                          style={({ pressed }) => [
                            styles.resultRow,
                            i < shown.length - 1 && styles.resultDivider,
                            pressed && { backgroundColor: color.paper },
                          ]}
                        >
                          <Store size={16} strokeWidth={2} color={color.brand[600]} style={styles.pinIcon} />
                          <View style={styles.flexMin}>
                            <Text style={styles.resultTitle} numberOfLines={1}>
                              {r.name}
                            </Text>
                            <Text style={styles.resultSub} numberOfLines={1}>
                              {r.address}
                            </Text>
                          </View>
                        </Pressable>
                      </DropIn>
                    ))}

                    {!nameAll && candidates.length > PAGE && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setNameAll(true)}
                        style={({ pressed }) => [styles.moreRow, pressed && { opacity: 0.6 }]}
                      >
                        <Text style={styles.moreText}>더보기 ({candidates.length - PAGE}곳 더)</Text>
                        <ChevronDown size={16} strokeWidth={2} color={color.brand[600]} />
                      </Pressable>
                    )}
                  </View>
                )}
              </>
            )}

            {/* 고른 뒤 — 무엇이 채워졌는지 그대로 보여 줍니다 */}
            {picked && (
              <DropIn style={styles.pickedCard}>
                <View style={styles.pickedHead}>
                  <View style={styles.flexMin}>
                    <Text style={styles.pickedName} numberOfLines={1}>
                      {picked.name}
                    </Text>
                  </View>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={clearPick}>
                    <Text style={styles.changeText}>변경</Text>
                  </Pressable>
                </View>

                <MapPreview
                  latitude={picked.latitude}
                  longitude={picked.longitude}
                  width={windowWidth - space[6] * 2}
                  zoomable
                />

                <View style={styles.pickedRows}>
                  <View style={styles.pickedRow}>
                    <MapPin size={16} strokeWidth={2} color={color.brand[600]} style={styles.rowIcon} />
                    <Text style={styles.pickedAddr}>{picked.address}</Text>
                  </View>
                  {phone ? (
                    <View style={styles.pickedRow}>
                      <Phone size={16} strokeWidth={2} color={color.brand[600]} />
                      <Text style={styles.pickedPhone}>{phone}</Text>
                    </View>
                  ) : null}
                </View>
              </DropIn>
            )}
          </>
        ) : (
          <>
            <Text style={text.title} numberOfLines={2}>
              {picked?.name}
            </Text>
            {/*
              시안은 "업종과 **메뉴 정보를** 자동으로 채웠어요" 라고 적지만, 우리는
              메뉴를 자동으로 채우지 않습니다 — 2.1 검색 응답에 메뉴가 없고,
              `/stores/{id}/menus` 는 매장이 만들어진 **뒤**에야 부를 수 있습니다.
              하지도 않을 일을 적으면 사장님이 기다립니다. 사실대로 적습니다.
            */}
            <Text style={styles.lead}>업종을 확인해 주세요. 다르면 고칠 수 있어요.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>업종 카테고리</Text>
              <View style={styles.chips}>
                {CATEGORIES.map((c) => {
                  const on = category === c;
                  return (
                    <Pressable
                      key={c}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        setCategory(c);
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
              {category === '직접입력' && (
                <TextInput
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="업종을 직접 입력해 주세요"
                  placeholderTextColor={color.ink[500]}
                  accessibilityLabel="업종 직접 입력"
                  style={[styles.input, { marginTop: space[3] }]}
                />
              )}
            </View>

            {createStore.isError && (
              <View style={{ marginTop: space[4] }}>
                <Banner
                  tone="danger"
                  title="가게를 등록하지 못했습니다"
                  description="입력하신 내용은 그대로 있습니다. 다시 눌러 주세요."
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/*
        시안: 버튼이 화면 **아래에 붙어** 있습니다. 스크롤 안에 두면 후보가 길어질 때
        한참 내려야 나옵니다 — 무엇을 눌러야 다음으로 가는지 항상 보이게 둡니다.
      */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space[6]) }]}>
        {step === 1 ? (
          <Button label="다음" disabled={!picked} onPress={() => setStep(2)} />
        ) : (
          <Button
            label="매장 등록 완료"
            disabled={!resolvedCategory}
            loading={createStore.isPending}
            onPress={submit}
          />
        )}
      </View>

      {/*
        확인 시트. ScrollView **밖**이라 화면 전체를 덮습니다 — 안에 두면 스크롤을
        따라 올라가고 가림막이 화면을 다 못 가립니다.
      */}
      {preview && (
        <StorePreviewSheet
          store={preview}
          width={windowWidth}
          onCancel={() => setPreview(null)}
          onConfirm={() => {
            pickStore(preview);
            setPreview(null);
          }}
        />
      )}
    </Screen>
  );
}

/**
 * StorePreviewSheet — 후보를 누르면 올라오는 **매장 확인 시트**.
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 시트인가 (시안 8차 · `매장조회지도.jpg`)
 * ─────────────────────────────────────────────────────────────
 * 예전에는 후보를 누르면 **곧바로** 폼에 값이 박혔습니다. 같은 이름의 가게가
 * 여럿인 동네에서는 옆 가게를 등록해 놓고도 모릅니다. 그래서 시안이 확인 단계를
 * 넣었습니다 — 지도와 주소·전화를 보고 **"이 매장으로 선택"** 을 눌러야 확정됩니다.
 *
 * 시안 원문 수치
 *   가림막 rgba(15,23,42,0.45) · 시트 rounded-t-[28px] bg-canvas
 *   지도 196 · 본문 px-6 pt-5 pb-8
 *   이름 19 bold · 업종 칩 11 semibold (bg-surface, rounded-full)
 *   주소 줄 map-pin 17 brand + 도로명 14 semibold + 지번 12 slate
 *   전화 줄 phone 17 brand + 14 medium
 *   버튼 h52 · [다시 검색] flex 1 · [이 매장으로 선택] flex 1.6
 *
 * ✅ **지번 주소를 넣었습니다** (2026-08-26). BE 에 요청해 둔 `jibun_address` 가
 *    배포됐습니다 — 실측 98건 전부 채워집니다(NAVER 후보 포함). 시안의
 *    "지번 신대방동 395-69" 줄이 이제 진짜 값으로 그려집니다.
 *
 *    도로명과 겹치는 앞부분은 `jibunText()` 가 덜어냅니다. 두 주소가 시·군·구까지
 *    같아서 그대로 두면 "서울특별시 중구" 가 위아래로 두 번 읽힙니다.
 *
 * ⚠️ **전화는 NAVER 후보에서 `null` 입니다** (KAKAO 후보 15/15 는 옵니다 — 2026-08-26
 *    실측). 값이 있을 때만 그 줄을 그립니다 — 빈 줄을 남기면 번호가 있는데 안 나온
 *    것처럼 보입니다. 지번도 같은 규칙입니다(없으면 줄 자체가 없습니다).
 */
function StorePreviewSheet({
  store,
  width,
  onCancel,
  onConfirm,
}: {
  store: PlaceResult;
  width: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 한 번짜리라 네이티브 드라이버를 그대로 씁니다 (CLAUDE.md §5-④ 는 loop 얘기입니다).
    Animated.timing(rise, {
      toValue: 1,
      duration: 260,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [rise]);

  const phone = phoneText(store.phone);
  const jibun = jibunText(store.address, store.jibunAddress);
  /*
    시트 칩에도 **저장될 값**을 그대로 보여 줍니다. 여기서 원문 조각("디저트")을
    보여주고 실제로는 "카페" 로 저장하면, 사장님이 본 것과 저장된 것이 달라집니다.
  */
  const category = matchCategory(store.category) ?? categoryHint(store.category);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* 가림막을 누르면 닫힙니다 — 시안과 같습니다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={onCancel}
        style={[StyleSheet.absoluteFill, styles.scrim]}
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, space[8]),
            transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) }],
          },
        ]}
      >
        {/*
          지도는 시트 맨 위에 꽉 채웁니다. 손가락으로 확대·축소할 수 있고
          **핀은 언제나 한가운데 고정**입니다 (MapPreview 머리말).
        */}
        <MapPreview
          latitude={store.latitude}
          longitude={store.longitude}
          width={width}
          height={196}
          zoomable
        />

        <View style={styles.sheetBody}>
          <Text style={styles.sheetName}>{store.name}</Text>
          {category ? (
            <View style={styles.catChip}>
              <Text style={styles.catText}>{category}</Text>
            </View>
          ) : null}

          <View style={styles.sheetRows}>
            <View style={styles.sheetRow}>
              <MapPin size={17} strokeWidth={2} color={color.brand[600]} style={styles.rowIcon} />
              {/* 시안: 도로명 아래에 지번이 들여쓰기 없이 붙습니다(아이콘 옆 한 칸). */}
              <View style={styles.sheetAddrCol}>
                <Text style={styles.sheetAddr}>{store.address}</Text>
                {jibun ? <Text style={styles.sheetJibun}>지번 {jibun}</Text> : null}
              </View>
            </View>
            {phone ? (
              <View style={styles.sheetRow}>
                <Phone size={17} strokeWidth={2} color={color.brand[600]} />
                <Text style={styles.sheetPhone}>{phone}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sheetCta}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.ghostBtn, pressTap(pressed, 'button')]}
            >
              <Text style={styles.ghostText}>다시 검색</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [styles.pickBtn, pressTap(pressed, 'button')]}
            >
              <Text style={styles.pickText}>이 매장으로 선택</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // 시안: px-6 pb-6
  // paddingBottom 은 화면에서 안전영역과 함께 계산합니다 — 시안 pb-6 만으로는
  // 제스처 내비게이션 폰에서 시작하기 버튼이 시스템 바에 덮입니다.
  body: { flexGrow: 1, paddingHorizontal: space[6], paddingTop: space[3] },

  lead: { ...text.bodySmall, marginTop: space[2], color: color.ink[500] },

  // 시안: mt-5 (제목 아래 첫 칸)
  field: { marginTop: space[5] },
  // 시안: mb-1.5 pl-1 · 12 · slate
  label: { ...text.label, marginBottom: 6, paddingLeft: 4, color: color.ink[500] },
  input: {
    ...text.body,
    height: sizing.inputHeight,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
    color: color.ink[900],
  },

  // 시안: 칩 rounded-full px-4 py-2 · 14 semibold
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
  },
  chipOn: { borderColor: color.brand[600], backgroundColor: color.brand[600] },
  chipOff: { borderColor: color.ink[200], backgroundColor: color.surface },
  chipText: {
    ...text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[800],
  },

  // 시안: h52 검색창 (아이콘 + 입력 + 지우기)
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: sizing.inputHeight,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
  },
  searchInput: { ...text.body, flex: 1, height: '100%', color: color.ink[900], padding: 0 },
  hint: { ...text.caption, marginTop: space[2], paddingLeft: 4, color: color.ink[500] },

  // 시안: mt-2 후보 목록 (rounded-xl · 행마다 hairline)
  results: {
    marginTop: space[2],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  resultDivider: { borderBottomWidth: theme.border.hairline, borderBottomColor: color.hairlineSoft },
  // 후보 행과 같은 높이·여백. 목록의 마지막 줄로 자연스럽게 이어집니다.
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: 0,
  },
  moreText: {
    ...theme.text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.brand[600],
  },
  pinIcon: { marginTop: 2 },
  flexMin: { flex: 1, minWidth: 0 },
  resultTitle: {
    ...text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
  },
  resultSub: { ...text.label, color: color.ink[500] },

  // 시안: mt-3 rounded-2xl · 지도 + 주소
  mapCard: {
    marginTop: space[3],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    overflow: 'hidden',
  },
  mapAddr: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: color.surface,
  },

  // 시안: mt-auto pt-8
  cta: { marginTop: 'auto', paddingTop: space[8] },
  // ── 고른 매장 카드 (시안 8차 StorePickedDetail) ──────────────────
  pickedCard: {
    marginTop: space[5],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  pickedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  pickedName: {
    ...text.body,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[900],
  },
  // 시안: 12 semibold brand
  changeText: {
    ...text.label,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.brand[600],
  },
  pickedRows: { gap: 10, paddingHorizontal: space[4], paddingVertical: space[4] },
  pickedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickedAddr: { ...text.bodySmall, flex: 1, minWidth: 0, color: color.ink[900] },
  pickedPhone: { ...text.bodySmall, color: color.ink[800] },

  /*
   * 하단 고정 버튼. 시안은 화면 아래에 붙여 두고 위쪽만 스크롤합니다 —
   * 후보가 길어져도 "다음" 이 늘 보입니다 (CLAUDE.md §5-③-1 과 같은 이유).
   */
  footer: {
    paddingHorizontal: space[6],
    paddingTop: space[3],
    borderTopWidth: theme.border.hairline,
    borderTopColor: color.ink[200],
    backgroundColor: color.canvas,
  },

  // ── 매장 확인 시트 (시안 8차 · 매장조회지도.jpg) ──────────────────
  // 시안: bg-[rgba(15,23,42,0.45)]
  scrim: { backgroundColor: 'rgba(15,23,42,0.45)' },
  // 시안: inset-x-0 bottom-0 rounded-t-[28px] bg-canvas
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.canvas,
    overflow: 'hidden',
  },
  // 시안: px-6 pt-5 pb-8 (pb 는 안전영역과 큰 쪽으로)
  sheetBody: { paddingHorizontal: space[6], paddingTop: space[5] },
  // 시안: 19 bold tracking-tighter-title
  sheetName: { ...theme.text.heading, fontSize: 19, lineHeight: 25, color: color.ink[900] },
  // 시안: mt-1 rounded-full bg-surface px-2 py-0.5 · 11 semibold
  catChip: {
    alignSelf: 'flex-start',
    marginTop: space[1],
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
  },
  catText: {
    ...theme.text.micro,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[500],
  },
  // 시안: mt-4 gap-2.5
  sheetRows: { marginTop: space[4], gap: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // 아이콘 윗변을 글자 첫 줄에 맞춥니다 (주소가 두 줄로 감길 수 있습니다).
  rowIcon: { marginTop: 2, alignSelf: 'flex-start' },
  // 도로명 + 지번을 한 칸에 세로로 담습니다.
  sheetAddrCol: { flex: 1, minWidth: 0, gap: 1 },
  // 시안: 14 semibold ink
  sheetAddr: {
    ...text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[900],
  },
  /*
    시안: 지번 12 slate. 시트는 높이가 내용으로 정해지므로 줄높이는 ×1.5 = 18 입니다
    (CLAUDE.md §5-①). caption 토큰(13/19)을 이 화면에서만 덮습니다.
  */
  sheetJibun: { ...text.caption, fontSize: 12, lineHeight: 18, color: color.ink[500] },
  // 시안: 14 medium ink-2
  sheetPhone: { ...text.bodySmall, color: color.ink[800] },
  // 시안: mt-6 gap-2.5 · h52
  sheetCta: { flexDirection: 'row', gap: 10, marginTop: space[6] },
  ghostBtn: {
    flex: 1,
    height: sizing.inputHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.canvas,
  },
  ghostText: {
    ...text.button,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[800],
  },
  // 시안: flex-[1.6] — 무엇이 기본 동작인지 크기로 말합니다
  pickBtn: {
    flex: 1.6,
    height: sizing.inputHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
  },
  pickText: {
    ...text.button,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.paper,
  },
});
