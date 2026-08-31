/**
 * PurposeSelectScreen — **시안 v3 `shoot-topic` 대조 이식** (2026-08-26).
 *
 * 시안 사양 (원문 수치 그대로)
 *   헤더   "촬영 준비" 중앙 · 진행바 없음
 *   제목   22·bold · leading-tight · tracking-tighter-title
 *   안내   lightbulb 15(brand) + 13·slate, 위로 mt-2 · gap-1.5
 *   타일   mt-6 · 2열 grid gap-3 · rounded-2xl p-4
 *          아이콘 타일 40 rounded-xl (활성 bg-brand + 흰 아이콘 / 비활성 bg-brand-tint + brand)
 *          라벨 15·bold · 설명 12·slate
 *          활성 border-brand + bg-brand-tint / 비활성 border-hairline + bg-surface
 *   입력   타일을 고르면 mt-6 에 나타남. 질문 15·semibold, 입력 h52 rounded-xl bg-surface
 *          매장홍보만 칩 4개가 먼저 나옵니다.
 *   버튼   "촬영 준비하기" — 주제와 내용이 모두 있어야 활성
 *
 * ⚠️ 시안 4종과 서버 enum 이 다릅니다.
 *    서버 PromotionPurpose = 메뉴소개 / 이벤트알리기 / 가게소개 / 고객늘리기 (실서버 확인)
 *    시안 TOPICS         = 신메뉴 / 기존메뉴 / 이벤트 / 매장홍보
 *
 *    시안의 신메뉴·기존메뉴는 우리 "메뉴소개" 를 둘로 쪼갠 것이라, 화면은 시안대로
 *    보여주고 서버로 보낼 때 아래 표대로 변환합니다. 고른 주제는 4.2 의
 *    detail_tag 로 이어져 다음 화면에서 다시 묻지 않습니다.
 *
 *    시안에 없는 "고객늘리기" 는 AI 추천 탭에 그대로 남아 있어 앱에서 사라지지 않습니다.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Coffee, Lightbulb, Sparkles, Store, Tag } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Banner } from '../../../ui/Feedback';
import { pressTap } from '../../../ui/press';
import theme, { color, radius, space, sizing, text } from '../../../design/theme';
import { useCreateProject } from '../../../api/queries/project';
import { useMenus } from '../../../api/queries/store';
import { useCurrentStore } from '../../../lib/appState';
import type {
  MenuDetailTag,
  PromotionDetail,
  PromotionPurpose,
  StoreElement,
} from '../../../api/schema/types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CreateStackParamList, RootStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'PurposeSelect'>;

interface Topic {
  id: string;
  label: string;
  icon: typeof Sparkles;
  prompt: string;
  placeholder: string;
  multiline?: boolean;
  chips?: string[];
  /** 서버 4.1 로 보낼 값 */
  purpose: PromotionPurpose;
  /** 메뉴소개일 때 4.2 로 이어질 세부 태그 */
  detailTag?: MenuDetailTag;
  /**
   * 등록된 메뉴를 골라 넣을 수 있는 주제인지.
   *
   * 🔴 **기존메뉴에만 켭니다** (2026-08-28). 예전에는 신메뉴에도 켜 두고
   *    `isNewMenu` 인 것만 추리되 **하나도 없으면 전체를 보여주는** 폴백이 있었습니다.
   *    서버가 그 표시를 안 채우는 바람에 신메뉴 탭에 등록된 메뉴가 통째로 깔렸고,
   *    바로 옆에 기존메뉴 탭이 따로 있는데 같은 목록이 두 번 나오는 꼴이었습니다.
   *    **신메뉴는 아직 등록되지 않은 메뉴라 고를 대상이 없습니다** — 직접 적습니다.
   */
  menuPick?: boolean;
}

/** 시안 TOPICS 원문 + 서버 값 매핑 */
const TOPICS: Topic[] = [
  {
    id: 'new',
    label: '신메뉴',
    icon: Sparkles,
    prompt: '어떤 신메뉴를 홍보할까요?',
    placeholder: '예: 흑임자 크림 라떼',
    purpose: '메뉴소개',
    detailTag: '신메뉴',
  },
  {
    id: 'existing',
    label: '기존메뉴',
    icon: Coffee,
    prompt: '어떤 메뉴를 소개할까요?',
    placeholder: '예: 시그니처 아메리카노',
    purpose: '메뉴소개',
    detailTag: '대표메뉴',
    menuPick: true,
  },
  {
    id: 'event',
    label: '이벤트',
    icon: Tag,
    prompt: '어떤 이벤트인가요?',
    placeholder: '예: 여름 아메리카노 3,500원 (8/31까지, 오후 2~5시 방문)',
    multiline: true,
    purpose: '이벤트알리기',
  },
  {
    id: 'store',
    label: '매장홍보',
    icon: Store,
    prompt: '무엇을 보여주고 싶으세요?',
    placeholder: '예: 통창으로 햇빛이 잘 드는 좌석',
    chips: ['매장 분위기', '인테리어', '뷰/전망', '편의시설'],
    purpose: '가게소개',
  },
];

export default function PurposeSelectScreen({ navigation, route }: Props) {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  /**
   * 홈 피드에서 포맷을 먼저 고른 흐름이면 formatId 가 들어옵니다.
   * (BE 확정: 포맷 선택 → 목적 선택 → 4.1 생성 → 7.1 기획)
   */
  const formatId = route.params?.formatId;
  const storeId = useCurrentStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const createProject = useCreateProject();

  const topic = TOPICS.find((t) => t.id === selected) ?? null;
  const canContinue = !!topic && value.trim().length > 0 && !!storeId;

  /*
   * 등록된 메뉴 고르기 (2026-08-26, 사장님 지시).
   *
   * **기존메뉴에서만** 3.2 에 등록된 메뉴가 목록으로 뜨고 눌러서 넣습니다.
   * 직접 적는 것도 그대로 됩니다 — 적으면 목록이 그 글자로 좁혀지고, 목록에 없는
   * 이름이면 적은 대로 나갑니다.
   *
   * ⚠️ **직접 적은 이름을 메뉴 목록에 추가하지 않습니다.** 메뉴 등록은 매장 관리에서
   *    사장님이 직접 하는 일입니다. 여기서 몰래 만들면 사진·가격 없는 메뉴가 쌓입니다.
   *
   * ⚠️ 신메뉴에는 목록을 띄우지 않습니다 (`Topic.menuPick` 주석 참고).
   */
  const { data: menus } = useMenus(topic?.menuPick ? storeId : undefined);
  const menuOptions = useMemo(() => {
    if (!topic?.menuPick || !menus) return [];
    const typed = value.trim();
    const narrowed = typed ? menus.filter((m) => m.name.includes(typed)) : menus;
    // 이미 그 메뉴를 정확히 골랐으면 목록을 접습니다.
    if (narrowed.length === 1 && narrowed[0].name === typed) return [];
    return narrowed;
  }, [menus, topic, value]);

  const next = () => {
    if (!topic || !storeId) return;
    /*
     * 시안 V4: 주제를 고르면 곧바로 포맷(촬영 방식)으로 갑니다.
     * 4.1 이 요구하는 값은 storeId·promotionPurpose 둘뿐이라 여기서 다 채워집니다.
     * 홍보 상세·타깃·촬영 조건을 따로 묻던 화면들은 시안에 없어 없앴습니다.
     */
    const go = (projectId: number) => {
      if (formatId) navigation.replace('FormatDetail', { projectId, formatId });
      // 시안 V4 에는 포맷 목록 화면이 따로 없습니다 — 홈 피드에서 고르고 들어옵니다.
      else rootNav.navigate('Main', { screen: 'HomeFeed' });
    };

    const answer = value.trim();
    const selectedMenu = menus?.find((menu) => menu.name === answer);
    const storeElement: StoreElement =
      answer === '편의시설' ? '서비스경험' : '공간';
    const promotionDetail: PromotionDetail =
      topic.purpose === '메뉴소개'
        ? { detailTag: topic.detailTag ?? '대표메뉴', menuName: answer }
        : topic.purpose === '이벤트알리기'
          ? { eventName: answer }
          : { elements: [storeElement], description: answer };

    createProject.mutate(
      {
        storeId,
        promotionPurpose: topic.purpose,
        settings: {
          menuId: topic.purpose === '메뉴소개' ? selectedMenu?.id ?? null : null,
          promotionDetail,
        },
      },
      { onSuccess: (p) => go(p.id) }
    );
  };

  return (
    <Screen
      padded={false}
      // 시안: 화면 맨 위에서 헤더까지 62 (= 상태바 54 + 8)
      contentStyle={{ paddingTop: space[2], gap: 0 }}
      footer={
        <BottomAction>
          <Button
            label="촬영 준비하기"
            onPress={next}
            disabled={!canContinue}
            loading={createProject.isPending}
          />
        </BottomAction>
      }
    >
      {/* 2026-08-31 지시 ④ — "촬영 준비" 를 "촬영 가이드" 로 */}
      <AppBar onBack={() => navigation.goBack()} title="촬영 가이드" />

      <View style={styles.body}>
        <Text style={styles.title}>어떤 주제를 찍고 싶으세요?</Text>

        {/* 시안: 전구 아이콘 + 두 줄 안내 */}
        <View style={styles.hint}>
          <Lightbulb size={15} strokeWidth={2} color={color.brand[600]} style={styles.hintIcon} />
          <Text style={styles.hintText}>
            홍보 목적을 알려주시면 AI가 그에 맞는 촬영 구성과 자막을 개인화해서 만들어 드려요.
          </Text>
        </View>

        {createProject.isError && (
          <View style={{ marginTop: space[4] }}>
            <Banner
              tone="danger"
              title="영상 만들기를 시작하지 못했습니다"
              description="잠시 후 다시 눌러 주세요."
            />
          </View>
        )}

        {!storeId && (
          <View style={{ marginTop: space[4] }}>
            <Banner
              tone="warn"
              title="가게 정보를 먼저 등록해 주세요"
              description="어느 가게 영상인지 알아야 대사와 촬영 순서를 만들 수 있습니다."
            />
          </View>
        )}

        {/* 시안: mt-6 · 2열 grid gap-3 */}
        <View style={styles.grid}>
          {TOPICS.map((t) => {
            const active = selected === t.id;
            const Icon = t.icon;
            return (
              <View key={t.id} style={styles.cell}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setSelected(t.id);
                    setValue('');
                  }}
                  style={({ pressed }) => [
                    styles.tile,
                    active ? styles.tileOn : styles.tileOff,
                    pressTap(pressed, 'card'),
                  ]}
                >
                  <View style={[styles.tileIcon, active ? styles.tileIconOn : styles.tileIconOff]}>
                    <Icon
                      size={20}
                      strokeWidth={2}
                      color={active ? color.paper : color.brand[600]}
                    />
                  </View>
                  <Text style={styles.tileLabel}>{t.label}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* 시안: 타일을 고르면 질문 + 입력이 나타납니다 */}
        {topic && (
          <View style={styles.answer}>
            <Text style={styles.prompt}>{topic.prompt}</Text>

            {topic.chips ? (
              <View style={styles.chips}>
                {topic.chips.map((c) => {
                  const on = value === c;
                  return (
                    <Pressable
                      key={c}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      hitSlop={6}
                      onPress={() => setValue(c)}
                      style={({ pressed }) => [
                        styles.chip,
                        on ? styles.chipOn : styles.chipOff,
                        pressTap(pressed, 'chip'),
                      ]}
                    >
                      <Text style={[styles.chipText, on && { color: color.paper }]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder={topic.menuPick ? '메뉴를 고르거나 직접 적어 주세요' : topic.placeholder}
              placeholderTextColor={color.ink[500]}
              accessibilityLabel={topic.prompt}
              multiline={topic.multiline}
              style={[styles.input, topic.multiline && styles.inputMulti]}
            />

            {/* 등록된 메뉴 목록 — 눌러서 넣습니다 */}
            {topic.menuPick && menuOptions.length > 0 && (
              <View style={styles.menuList}>
                {menuOptions.map((m, i) => (
                  <Pressable
                    key={m.id}
                    accessibilityRole="button"
                    accessibilityLabel={m.name}
                    onPress={() => setValue(m.name)}
                    style={({ pressed }) => [
                      styles.menuRow,
                      i < menuOptions.length - 1 && styles.menuDivider,
                      pressed && { backgroundColor: color.brand[50] },
                    ]}
                  >
                    {/* 찻잔 아이콘은 뺐습니다 (2026-08-28 요청) — 메뉴가 음료가 아닐 수도 있습니다 */}
                    <Text style={styles.menuName} numberOfLines={1}>
                      {m.name}
                    </Text>
                    {m.isNewMenu ? <Text style={styles.menuTag}>신메뉴</Text> : null}
                  </Pressable>
                ))}
              </View>
            )}

            {/* 메뉴를 아직 하나도 등록하지 않은 가게 */}
            {topic.menuPick && menus?.length === 0 && (
              <Text style={styles.menuEmpty}>
                등록된 메뉴가 없습니다. 위 칸에 직접 적어 주세요.
              </Text>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 시안: px-6
  body: { paddingHorizontal: space[6], paddingBottom: space[6] },

  // 등록된 메뉴 목록 — 매장 등록의 후보 목록과 같은 모양입니다
  menuList: {
    marginTop: space[2],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  menuDivider: { borderBottomWidth: theme.border.hairline, borderBottomColor: color.hairlineSoft },
  menuName: { ...theme.text.bodySmall, flex: 1, minWidth: 0, color: color.ink[900] },
  menuTag: { ...theme.text.nano, color: color.brand[600] },
  menuEmpty: { ...theme.text.caption, marginTop: space[2], paddingLeft: 4, color: color.ink[500] },

  // 시안: 22·bold · leading-tight
  title: { ...theme.text.title, lineHeight: 28 },

  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: space[2] },
  hintIcon: { marginTop: 2 },
  hintText: { ...theme.text.caption, flex: 1, lineHeight: 21, color: color.ink[500] },

  // 시안: mt-6 grid-cols-2 gap-3 — gap 대신 셀 안쪽 여백으로 2열을 고정합니다
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space[6], marginHorizontal: -6 },
  cell: { width: '50%', padding: 6 },
  tile: {
    alignItems: 'flex-start',
    gap: space[2],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
  },
  tileOn: { borderColor: color.brand[600], backgroundColor: color.brand[50] },
  tileOff: { borderColor: color.ink[200], backgroundColor: color.surface },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconOn: { backgroundColor: color.brand[600] },
  tileIconOff: { backgroundColor: color.brand[50] },
  tileLabel: { ...theme.text.bodyStrong, fontFamily: theme.text.heading.fontFamily, fontWeight: theme.text.heading.fontWeight },

  answer: { marginTop: space[6] },
  // 시안: mb-2 pl-1 · 15·semibold
  prompt: { ...theme.text.bodyStrong, marginBottom: space[2], paddingLeft: space[1] },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: space[2], borderRadius: radius.pill, borderWidth: theme.border.hairline },
  chipOn: { borderColor: color.brand[600], backgroundColor: color.brand[600] },
  chipOff: { borderColor: color.ink[200], backgroundColor: color.surface },
  chipText: { ...theme.text.chipLabel, color: color.ink[800] },

  // 시안: h52 rounded-xl border-hairline bg-surface px-4 · 15·medium
  input: {
    height: sizing.inputHeight,
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
    paddingHorizontal: space[4],
    ...theme.text.body,
    color: color.ink[900],
  },
  // 시안: rows=4 · py-3
  inputMulti: { height: 108, paddingTop: space[3], paddingBottom: space[3], textAlignVertical: 'top' },
});
