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
 *    지번은 API 에 없어 넣지 않습니다 — 없는 값을 지어내지 않습니다.
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
import { phoneText, shortCategory } from '../../../lib/format';
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

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<PlaceResult | null>(null);
  /** 후보를 몇 개까지 펼쳤는지. "더보기" 를 누르면 전부 보여 줍니다. */
  const [nameAll, setNameAll] = useState(false);
  const [addrAll, setAddrAll] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  /**
   * 확인 시트에 올라와 있는 후보. **아직 고른 것이 아닙니다** — "이 매장으로 선택"
   * 을 눌러야 `picked` 로 넘어갑니다 (StorePreviewSheet 머리말).
   */
  const [preview, setPreview] = useState<PlaceResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const createStore = useCreateStore();

  // 주소 검색 — 글자마다 서버를 부르지 않도록 350ms 늦춥니다.
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setKeyword(query), 350);
    setAddrAll(false);
    return () => clearTimeout(t);
  }, [query]);
  const { data: results, isFetching, isError } = useStoreSearch(keyword);

  // 이미 고른 주소를 그대로 다시 후보로 보여 주지 않습니다.
  const candidates = useMemo(
    () => (picked && picked.address === query ? [] : (results ?? [])),
    [results, picked, query]
  );
  const shownCandidates = addrAll ? candidates : candidates.slice(0, PAGE);

  /*
   * 매장 이름 후보 (2026-08-26).
   *
   * 사장님이 자기 가게 이름을 치면 **그 이름으로 찾은 가게들을 아래에 쭉** 보여 주고,
   * 눌러서 확정하게 합니다. 고르면 업종·주소·좌표가 함께 채워져 아래 지도에 찍힙니다.
   *
   * 왜 필요했나 — 지금까지 이름으로 찾는 건 위쪽 연동 버튼뿐이었는데, 그 버튼은
   * 찾은 결과 중 **첫 번째를 말없이** 골랐습니다. 같은 이름의 가게가 여럿이면
   * (체인점·비슷한 상호) 엉뚱한 가게가 조용히 등록됩니다.
   *
   * 개수를 자르지 않습니다 — 목록 안에 또 스크롤을 만들지 않고 화면이 그만큼
   * 길어지게 두는 쪽이 사장님 손에 편합니다(바깥 스크롤 하나로 끝).
   */
  const [nameKeyword, setNameKeyword] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setNameKeyword(name), 350);
    // 검색어가 바뀌면 펼친 것을 다시 접습니다 — 새 결과는 처음부터 봅니다.
    setNameAll(false);
    return () => clearTimeout(t);
  }, [name]);
  const { data: nameHits, isFetching: nameFetching } = useStoreSearch(nameKeyword);

  // 이미 확정한 가게면 목록을 접습니다. 이름을 다시 고치면 그때 또 뜹니다.
  const nameCandidates = useMemo(
    () => (picked && picked.name === name ? [] : (nameHits ?? [])),
    [nameHits, picked, name]
  );
  const shownNames = nameAll ? nameCandidates : nameCandidates.slice(0, PAGE);

  /** 후보를 눌러 가게를 확정합니다. 이름·업종·주소·좌표가 한 번에 들어옵니다. */
  const pickStore = (r: PlaceResult) => {
    const known = CATEGORIES.includes(r.category);
    setName(r.name);
    setCategory(known ? r.category : '직접입력');
    setCustomCategory(known ? '' : r.category);
    setPicked(r);
    setQuery(r.address);
    setNotice(null);
    // 외부 목록에서 그대로 가져온 값이라 출처가 MANUAL 이 아닙니다(2.2 info_source).
    setSynced(true);
  };

  // 연동으로 채우기 — 이름으로 2.1 을 찾아 첫 후보를 그대로 씁니다.
  const { data: syncHits } = useStoreSearch(syncing ? name.trim() : '');
  useEffect(() => {
    if (!syncing || syncHits === undefined) return;
    const hit = syncHits[0];
    setSyncing(false);
    if (!hit) {
      setNotice('그 이름으로 찾지 못했습니다. 직접 입력해 주세요.');
      return;
    }
    setName(hit.name);
    setCategory(CATEGORIES.includes(hit.category) ? hit.category : '직접입력');
    if (!CATEGORIES.includes(hit.category)) setCustomCategory(hit.category);
    setPicked(hit);
    setQuery(hit.address);
    setSynced(true);
  }, [syncing, syncHits]);

  const startSync = () => {
    setNotice(null);
    if (name.trim().length < 2) {
      setNotice('매장 이름을 먼저 적어 주세요. 그 이름으로 찾아 채웁니다.');
      return;
    }
    setSyncing(true);
  };

  const resolvedCategory = category === '직접입력' ? customCategory.trim() : category;
  const complete = !!name.trim() && !!resolvedCategory && !!picked;

  const submit = () => {
    if (!picked) return;
    createStore.mutate(
      {
        name: name.trim(),
        category: resolvedCategory,
        address: picked.address,
        phone: picked.phone,
        // 연동으로 채웠으면 그 출처를, 직접 적었으면 MANUAL 입니다.
        infoSource: synced ? picked.source : 'MANUAL',
        externalChannelUrl: picked.externalChannelUrl,
        // 2.2 (2026-08-23): 검색이 준 좌표를 버리지 않고 그대로 저장시킵니다.
        latitude: picked.latitude,
        longitude: picked.longitude,
        // 2.2 (2026-08-25): 카카오 후보면 값이 있고 네이버면 null 입니다.
        kakaoPlaceId: picked.kakaoPlaceId,
      },
      {
        onSuccess: (res) => {
          setStoreId(res.id);
          rootNav.replace('Main', { screen: 'HomeFeed' });
        },
      }
    );
  };

  return (
    /*
     * 시안은 이 화면에서 하단 안전영역을 따로 잡지 않습니다 — pb-6 이 그 몫까지 합니다.
     * bottom edge 까지 켜면 34 를 더 먹어 "시작하기" 가 그만큼 위로 뜹니다.
     */
    <Screen padded={false} scroll={false} edges={['top']} contentStyle={{ paddingTop: 0, gap: 0 }}>
      <AppBar onBack={() => navigation.goBack()} title="매장 등록" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.body, { paddingBottom: Math.max(insets.bottom, space[6]) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ① */}
        <Text style={text.title}>매장 정보를 등록해 주세요</Text>
        <Text style={styles.lead}>네이버 스마트플레이스를 연동하거나 직접 입력할 수 있어요.</Text>

        {/* ② 시안: h56 rounded-full · 네이버 초록 */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: syncing }}
          disabled={syncing}
          onPress={startSync}
          style={({ pressed }) => [styles.syncBtn, pressTap(pressed, 'button')]}
        >
          {syncing ? (
            <Spinner size={20} tint={color.paper} />
          ) : synced ? (
            <Check size={20} strokeWidth={2.5} color={color.paper} />
          ) : (
            <Link2 size={20} strokeWidth={2} color={color.paper} />
          )}
          <Text style={styles.syncText}>
            {synced ? '연동 완료' : syncing ? '불러오는 중...' : '네이버 스마트플레이스 연동으로 채우기'}
          </Text>
        </Pressable>

        {notice ? (
          <View style={{ marginTop: space[3] }}>
            <Banner tone="warn" title={notice} />
          </View>
        ) : null}

        {/* ③ */}
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>또는 직접 입력</Text>
          <View style={styles.line} />
        </View>

        {/* ④ */}
        <View style={styles.fields}>
          <View>
            <Text style={styles.label}>매장 이름</Text>
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                setSynced(false);
                setNotice(null);
              }}
              placeholder="매장 이름을 입력해 주세요"
              placeholderTextColor={color.ink[500]}
              accessibilityLabel="매장 이름"
              style={styles.input}
            />

            {/* 이름 후보 — 눌러서 내 가게를 확정합니다 */}
            {nameFetching && nameCandidates.length === 0 && nameKeyword.trim().length >= 2 ? (
              <Text style={styles.hint}>찾는 중…</Text>
            ) : null}

            {nameCandidates.length > 0 && (
              <>
                <Text style={styles.hint}>내 가게를 눌러 주세요</Text>
                <View style={styles.results}>
                  {shownNames.map((r, i) => (
                    <DropIn key={`${r.name}-${r.address}`} index={i}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${r.name} ${r.address}`}
                      onPress={() => setPreview(r)}
                      style={({ pressed }) => [
                        styles.resultRow,
                        i < shownNames.length - 1 && styles.resultDivider,
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
                  {!nameAll && nameCandidates.length > PAGE && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setNameAll(true)}
                      style={({ pressed }) => [
                        styles.moreRow,
                        styles.resultDivider,
                        pressed && { backgroundColor: color.paper },
                      ]}
                    >
                      <Text style={styles.moreText}>
                        더보기 ({nameCandidates.length - PAGE}곳 더)
                      </Text>
                      <ChevronDown size={16} strokeWidth={2} color={color.brand[600]} />
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>

          <View>
            <Text style={styles.label}>업종 카테고리</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => {
                const on = category === c;
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      setCategory(c);
                      if (c !== '직접입력') setCustomCategory('');
                    }}
                    style={({ pressed }) => [styles.chip, on && styles.chipOn, pressTap(pressed, 'button')]}
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
                style={[styles.input, { marginTop: 10 }]}
              />
            )}
          </View>

          <View>
            <Text style={styles.label}>지역 / 주소</Text>
            <View style={styles.searchBox}>
              <Search size={18} strokeWidth={2} color={color.ink[500]} />
              <TextInput
                value={query}
                onChangeText={(v) => {
                  setQuery(v);
                  setPicked(null);
                }}
                placeholder="도로명 · 지번으로 검색 (예: 테헤란로)"
                placeholderTextColor={color.ink[500]}
                accessibilityLabel="주소 검색"
                style={styles.searchInput}
              />
              {query.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="검색어 지우기"
                  hitSlop={8}
                  onPress={() => {
                    setQuery('');
                    setPicked(null);
                  }}
                >
                  <X size={16} strokeWidth={2} color={color.ink[500]} />
                </Pressable>
              )}
            </View>

            {isError && !picked ? (
              <Text style={styles.hint}>주소를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.</Text>
            ) : null}
            {isFetching && candidates.length === 0 && !picked ? (
              <Text style={styles.hint}>찾는 중…</Text>
            ) : null}

            {candidates.length > 0 && (
              <View style={styles.results}>
                {shownCandidates.map((r, i) => (
                  <DropIn key={`${r.name}-${r.address}`} index={i}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setPicked(r);
                      setQuery(r.address);
                      if (!name.trim()) setName(r.name);
                    }}
                    style={({ pressed }) => [
                      styles.resultRow,
                      i < shownCandidates.length - 1 && styles.resultDivider,
                      pressed && { backgroundColor: color.paper },
                    ]}
                  >
                    <MapPin size={16} strokeWidth={2} color={color.brand[600]} style={styles.pinIcon} />
                    <View style={styles.flexMin}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {r.address}
                      </Text>
                      <Text style={styles.resultSub} numberOfLines={1}>
                        {r.name}
                      </Text>
                    </View>
                  </Pressable>
                  </DropIn>
                ))}
                {!addrAll && candidates.length > PAGE && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAddrAll(true)}
                    style={({ pressed }) => [
                      styles.moreRow,
                      styles.resultDivider,
                      pressed && { backgroundColor: color.paper },
                    ]}
                  >
                    <Text style={styles.moreText}>더보기 ({candidates.length - PAGE}곳 더)</Text>
                    <ChevronDown size={16} strokeWidth={2} color={color.brand[600]} />
                  </Pressable>
                )}
              </View>
            )}

            {picked && (
              <DropIn style={styles.mapCard}>
                <MapPreview latitude={picked.latitude} longitude={picked.longitude} />
                <View style={styles.mapAddr}>
                  <MapPin size={16} strokeWidth={2} color={color.brand[600]} style={styles.pinIcon} />
                  <View style={styles.flexMin}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {picked.address}
                    </Text>
                    <Text style={styles.resultSub} numberOfLines={1}>
                      {picked.name}
                    </Text>
                  </View>
                </View>
              </DropIn>
            )}
          </View>
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

        {/* ⑤ */}
        <View style={styles.cta}>
          <Button
            label="시작하기"
            disabled={!complete}
            loading={createStore.isPending}
            onPress={submit}
          />
        </View>
      </ScrollView>

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
 * ⚠️ **지번 주소는 그리지 않습니다.** 시안에는 "지번 신대방동 395-69" 줄이 있지만
 *    그건 시안 목업(`STORE_DB`)의 값입니다. 실서버 2.1 응답 필드는
 *    `source·name·address·phone·latitude·longitude·category·distance_m·
 *    external_channel_url` 뿐이라 **지번이 없습니다.** 없는 값을 지어내지 않습니다
 *    (CLAUDE.md §2). BE 에 요청해 두고, 내려오면 이 자리에 한 줄 더 넣으면 됩니다.
 *
 * ⚠️ **전화도 자주 `null` 입니다** (스타벅스 한국프레스센터점 실측). 값이 있을 때만
 *    그 줄을 그립니다 — 빈 줄을 남기면 번호가 있는데 안 나온 것처럼 보입니다.
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
  const category = shortCategory(store.category);

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
              <Text style={styles.sheetAddr}>{store.address}</Text>
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

  // 시안: mt-6 · h56 · rounded-full · 네이버 초록
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    height: 56,
    marginTop: space[6],
    borderRadius: radius.pill,
    backgroundColor: color.naver,
  },
  syncText: { ...text.button, color: color.paper },

  // 시안: mt-6 · 양옆 hairline 선 + 12 문구
  divider: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[6] },
  line: { flex: 1, height: theme.border.hairline, backgroundColor: color.ink[200] },
  dividerText: { ...text.label, color: color.ink[500] },

  // 시안: mt-5 gap-5
  fields: { marginTop: space[5], gap: space[5] },
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
  // 시안: 14 semibold ink
  sheetAddr: {
    ...text.bodySmall,
    flex: 1,
    minWidth: 0,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[900],
  },
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
