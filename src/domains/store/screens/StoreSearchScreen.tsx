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
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Link2, MapPin, Search, Store, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Banner, Spinner } from '../../../ui/Feedback';
import { MapPreview } from '../../../ui/MapPreview';
import { DropIn } from '../../../ui/DropIn';
import { pressTap } from '../../../ui/press';
import { useAppState } from '../../../lib/appState';
import { useCreateStore, useStoreSearch } from '../../../api/queries/store';
import theme, { color, radius, sizing, space, text } from '../../../design/theme';
import type { PlaceResult } from '../../../api/schema/types';
import type { RootStackParamList, StoreSetupStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<StoreSetupStackParamList, 'StoreSearch'>;

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
  const setStoreId = useAppState((st) => st.setStoreId);
  // 등록이 끝나면 이 스택을 통째로 벗어나므로 루트 내비게이션을 씁니다.
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<PlaceResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const createStore = useCreateStore();

  // 주소 검색 — 글자마다 서버를 부르지 않도록 350ms 늦춥니다.
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setKeyword(query), 350);
    return () => clearTimeout(t);
  }, [query]);
  const { data: results, isFetching, isError } = useStoreSearch(keyword);

  // 이미 고른 주소를 그대로 다시 후보로 보여 주지 않습니다.
  const candidates = useMemo(
    () => (picked && picked.address === query ? [] : (results ?? [])),
    [results, picked, query]
  );

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
    return () => clearTimeout(t);
  }, [name]);
  const { data: nameHits, isFetching: nameFetching } = useStoreSearch(nameKeyword);

  // 이미 확정한 가게면 목록을 접습니다. 이름을 다시 고치면 그때 또 뜹니다.
  const nameCandidates = useMemo(
    () => (picked && picked.name === name ? [] : (nameHits ?? [])),
    [nameHits, picked, name]
  );

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
        contentContainerStyle={styles.body}
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
                  {nameCandidates.map((r, i) => (
                    <DropIn key={`${r.name}-${r.address}`} index={i}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${r.name} ${r.address}`}
                      onPress={() => pickStore(r)}
                      style={({ pressed }) => [
                        styles.resultRow,
                        i < nameCandidates.length - 1 && styles.resultDivider,
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
                {candidates.map((r, i) => (
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
                      i < candidates.length - 1 && styles.resultDivider,
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // 시안: px-6 pb-6
  body: { flexGrow: 1, paddingHorizontal: space[6], paddingBottom: space[6], paddingTop: space[3] },

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
});
