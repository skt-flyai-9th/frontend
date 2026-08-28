/**
 * MenuManager — 매장 정보 수정 안의 **매장 메뉴 관리**. 시안 8·9차 `MenuManager`.
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 필요한가
 * ─────────────────────────────────────────────────────────────
 * AI 추천 대화가 "어떤 메뉴를 홍보할까요?" 를 묻는데, 서버 자동 수집(2.3)이
 * **지금도 `PENDING` 이라 메뉴가 0개**입니다(BE §1-1). 사장님이 직접 넣는 길이
 * 유일한 해결이고, 그게 없으면 추천 대화가 그 자리에서 막힙니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 저장 시점 — **줄마다 그 자리에서 저장합니다**
 * ─────────────────────────────────────────────────────────────
 * 화면 아래 "저장하기" 는 매장 이름·업종만 보냅니다(3.1). 메뉴는 별도 API 라
 * 한 번에 묶어 보낼 방법이 없습니다. 그래서
 *
 *   추가   `+ 새 메뉴 추가하기` → POST 로 **바로 만들고** 목록에 들어옵니다
 *   수정   글자를 다 치고 **칸을 벗어날 때** PATCH (칠 때마다 부르지 않습니다)
 *   삭제   휴지통 → 물어보고 DELETE
 *
 * 사장님이 "저장하기" 를 안 누르고 나가도 메뉴는 이미 저장돼 있습니다. 반대로
 * 화면에 보이는 것과 서버가 다른 상태가 생기지 않습니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 시안과 다르게 한 것 둘
 * ─────────────────────────────────────────────────────────────
 * ① **순서 바꾸기(드래그)를 뺐습니다.** 시안에는 손잡이가 있지만 메뉴에
 *    `display_order` 가 **없습니다**(2.4 스키마: id·name·price·description·
 *    image_url·is_new_menu·is_event_menu·is_sold_out). 끌어서 옮겨도 서버에
 *    남길 자리가 없어, 화면을 나갔다 오면 원래대로 돌아옵니다. 되지 않는 손잡이를
 *    보여 주는 것이 더 나쁩니다.
 * ② **사진은 두 걸음입니다** — 메뉴에 파일을 직접 올리는 경로가 없어
 *    사진첩(3.3)에 올린 뒤 그 주소를 메뉴에 붙입니다(`useUploadMenuPhoto`).
 *
 * 시안 원문 수치
 *   머리 mb-1.5 pl-1 · "매장 메뉴 관리" 12 medium slate · "총 N개" 11 medium slate
 *   행   rounded-xl border-hairline bg-panel p-3 · gap-3 · 사이 gap-2
 *   사진 76 rounded-lg · 없을 때 점선 + image-plus 20 + "사진" 10
 *   이름 h9 rounded-lg 14 semibold · 가격 h9 + 우측 "원" 13
 *   추가 mt-2.5 · 점선 2px · py-3.5 · 14 semibold · plus 18
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Banner } from '../../../ui/Feedback';
import { pressTap } from '../../../ui/press';
import {
  useAddMenu,
  useDeleteMenu,
  useImportStatus,
  useMenus,
  useUpdateMenu,
  useUploadMenuPhoto,
} from '../../../api/queries/store';
import theme, { color, radius, space, text } from '../../../design/theme';
import type { Menu } from '../../../api/schema/types';

/** 가격 표시 — 저장은 숫자만, 보여줄 때만 천 단위 쉼표 (시안 `toLocaleString`). */
const priceText = (v?: number | null) =>
  typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString('ko-KR') : '';

function MenuRow({
  item,
  storeId,
  onBusy,
  onRequestDelete,
}: {
  item: Menu;
  storeId: number;
  onBusy: (busy: boolean) => void;
  /** 지우기는 목록이 물어보고 처리합니다 (아래 확인창 머리말). */
  onRequestDelete: () => void;
}) {
  const update = useUpdateMenu(storeId);
  const upload = useUploadMenuPhoto(storeId);

  /*
   * 칸 안의 글자는 화면이 들고 있다가 **칸을 벗어날 때** 서버로 보냅니다.
   * 한 글자마다 PATCH 를 치면 서버도 사장님 손도 힘듭니다.
   */
  const [name, setName] = useState(item.name ?? '');
  const [price, setPrice] = useState(priceText(item.price));

  // 서버 값이 바뀌면(다른 곳에서 고쳤거나 새로 받아왔거나) 따라갑니다.
  const editing = useRef(false);
  useEffect(() => {
    if (editing.current) return;
    setName(item.name ?? '');
    setPrice(priceText(item.price));
  }, [item.name, item.price]);

  const busy = update.isPending || upload.isPending;
  useEffect(() => onBusy(busy), [busy, onBusy]);

  const commit = (patch: Partial<Menu>) => {
    editing.current = false;
    update.mutate({ menuId: Number(item.id), ...patch });
  };

  const commitName = () => {
    const v = name.trim();
    // 이름은 비울 수 없습니다(2.4 required). 비우면 서버 값으로 되돌립니다.
    if (!v) {
      setName(item.name ?? '');
      editing.current = false;
      return;
    }
    if (v === item.name) {
      editing.current = false;
      return;
    }
    commit({ name: v });
  };

  const commitPrice = () => {
    const digits = price.replace(/\D/g, '');
    const v = digits ? Number(digits) : undefined;
    if (v === item.price || (v === undefined && item.price == null)) {
      editing.current = false;
      return;
    }
    commit({ price: v });
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('사진 권한이 필요합니다', '설정에서 사진 접근을 허용해 주세요.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    /*
      🔴 실패를 **조용히 삼키지 않습니다** (2026-08-27).

      여기서 실패해도 화면에는 아무 표시가 없었습니다. 사장님은 사진을 골랐는데
      자리가 그대로 비어 있으니 "왜 안 올라가지" 하고 같은 동작을 반복하십니다.

      ⚠️ 지금 이 경로는 **서버 쪽 제약으로 반드시 실패합니다**(BE 전달사항 §1-3).
         3.3 이 주는 주소는 서명이 붙어 1800자가 넘는데 메뉴 `image_url` 상한이
         255자입니다. 서명을 떼면 저장은 되지만 그 주소는 403 이라 사진이 안 보입니다
         (가게 로고는 서버가 읽을 때 다시 서명해 주는데, 메뉴 사진은 안 해 줍니다).
         BE 가 고치면 이 코드는 그대로 동작합니다.
    */
    upload.mutate(
      { menuId: Number(item.id), uri: res.assets[0].uri },
      {
        onError: () =>
          Alert.alert(
            '메뉴 사진을 붙이지 못했습니다',
            '사진은 올라갔는데 메뉴에 연결하는 데서 막혔습니다. 서버 쪽 확인이 필요한 문제라 잠시 뒤 다시 시도해 주세요.'
          ),
      }
    );
  };

  return (
    <View style={styles.row}>
      {/* 사진 76 */}
      <View style={styles.thumbWrap}>
        {item.imageUrl ? (
          <>
            <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="사진 지우기"
              hitSlop={6}
              onPress={() => commit({ imageUrl: undefined })}
              style={styles.thumbClear}
            >
              <X size={12} strokeWidth={2.5} color={color.paper} />
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name || '메뉴'} 사진 추가`}
            onPress={pickPhoto}
            style={({ pressed }) => [styles.thumbEmpty, pressTap(pressed, 'card')]}
          >
            {upload.isPending ? (
              <ActivityIndicator size="small" color={color.ink[500]} />
            ) : (
              <>
                <ImagePlus size={20} strokeWidth={2} color={color.ink[400]} />
                <Text style={styles.thumbLabel}>사진</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* 이름 · 가격 */}
      <View style={styles.fields}>
        <TextInput
          value={name}
          onChangeText={(v) => {
            editing.current = true;
            setName(v);
          }}
          onBlur={commitName}
          placeholder="메뉴명을 입력하세요"
          placeholderTextColor={color.ink[500]}
          accessibilityLabel="메뉴명"
          style={styles.nameInput}
        />
        <View style={styles.priceBox}>
          <TextInput
            value={price}
            onChangeText={(v) => {
              editing.current = true;
              const d = v.replace(/\D/g, '');
              setPrice(d ? Number(d).toLocaleString('ko-KR') : '');
            }}
            onBlur={commitPrice}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={color.ink[500]}
            accessibilityLabel="가격"
            style={styles.priceInput}
          />
          <Text style={styles.won}>원</Text>
        </View>
      </View>

      {/* 삭제 — 시안의 순서 손잡이는 뺐습니다(위 머리말 ①) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.name || '메뉴'} 삭제`}
        hitSlop={6}
        onPress={onRequestDelete}
        style={({ pressed }) => [styles.trash, pressTap(pressed, 'icon')]}
      >
        <Trash2 size={17} strokeWidth={2} color={color.ink[500]} />
      </Pressable>
    </View>
  );
}

export function MenuManager({ storeId }: { storeId?: number }) {
  const menus = useMenus(storeId);
  const add = useAddMenu(storeId ?? 0);
  const remove = useDeleteMenu(storeId ?? 0);
  const [rowError, setRowError] = useState(false);
  /**
   * 지우기 확인 — **앱 안 확인창**입니다. `Alert.alert` 을 쓰지 않습니다.
   *
   * react-native-web 의 Alert 는 `static alert() {}` — **빈 함수**입니다
   * (`node_modules/react-native-web/dist/exports/Alert/index.js`). 기기에서는
   * 동작하지만 웹에서는 **아무 일도 안 일어나서**, 되돌릴 수 없는 삭제를
   * 검증할 수가 없습니다(2026-08-26 실제로 겪었습니다 — 휴지통을 눌렀는데
   * DELETE 요청이 아예 안 나갔습니다).
   *
   * 앱 안 창으로 두면 기기·웹 어디서나 같고, 연동 실패 얼럿과 모양도 맞습니다.
   */
  const [confirming, setConfirming] = useState<Menu | null>(null);
  const list = menus.data ?? [];

  /**
   * 🔴 **메뉴는 매장 등록 뒤에 서버가 따로 긁어 옵니다** (2026-08-28 BE 회신).
   *
   * 2.2 등록 응답이 돌아온 뒤 **백그라운드로** 도는 작업이라, 등록 직후에 이 화면에
   * 들어오면 아직 0건입니다. 그때 "아직 등록된 메뉴가 없어요" 라고 적으면 사장님은
   * **수집이 끝난 줄 알고** 손으로 다 넣기 시작하십니다.
   *
   * 2.3 이 항목별 상태를 주므로(`기본정보`·`메뉴`·`사진`·`상권분석`) 그중 메뉴만 봅니다.
   * 훅이 1.2초 간격으로 묻고 **2분에서 멈추며**, 끝나면 메뉴 목록을 스스로 다시
   * 불러옵니다(`useImportStatus`). 서버를 동기로 붙잡아 등록을 느리게 만들 이유가
   * 없다는 판단입니다 — BE 회신 3번에 대한 답이기도 합니다.
   *
   * 이미 메뉴가 있으면 물어볼 이유가 없어 **목록이 빌 때만** 켭니다.
   */
  const importing = useImportStatus(list.length === 0 ? storeId : undefined);
  const menuImport = importing.data?.items.find((i) => i.field === '메뉴')?.status;
  const menuComing =
    !importing.timedOut && (menuImport === 'PENDING' || menuImport === 'IN_PROGRESS');

  const addMenu = () => {
    if (!storeId || add.isPending) return;
    /*
     * 2.4 는 `name` 이 필수(minLength 1)라 빈 메뉴를 만들 수 없습니다.
     * 자리표시자 이름으로 먼저 만들고, 사장님이 그 칸에서 고칩니다.
     */
    add.mutate({ name: '새 메뉴' });
  };

  return (
    <View>
      {/* 시안: mb-1.5 pl-1 · 12/11 medium slate */}
      <View style={styles.head}>
        <Text style={styles.headLabel}>매장 메뉴 관리</Text>
        <Text style={styles.headCount}>총 {list.length}개</Text>
      </View>

      {menus.isLoading ? (
        <Text style={styles.hint}>메뉴를 불러오는 중…</Text>
      ) : null}

      {menus.isError ? (
        <Banner
          tone="warn"
          title="메뉴를 불러오지 못했습니다"
          description="신호를 확인하고 화면을 다시 열어 주세요."
        />
      ) : null}

      {/*
        비어 있을 때. **아직 긁어 오는 중인지**를 먼저 말합니다 — "메뉴가 없다" 로만
        적으면 사장님이 수집이 끝난 줄 알고 손으로 다 넣기 시작하십니다.
      */}
      {!menus.isLoading && !menus.isError && list.length === 0 ? (
        <Text style={styles.hint}>
          {menuComing
            ? '매장 메뉴를 가져오고 있어요. 다 되면 여기 저절로 나타납니다.'
            : '아직 등록된 메뉴가 없어요. 아래에서 직접 추가하시면 AI 추천에 바로 쓰입니다.'}
        </Text>
      ) : null}

      <View style={styles.list}>
        {list.map((m) => (
          <MenuRow
            key={String(m.id)}
            item={m}
            storeId={storeId ?? 0}
            onBusy={setRowError}
            onRequestDelete={() => setConfirming(m)}
          />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !storeId || add.isPending }}
        disabled={!storeId || add.isPending}
        onPress={addMenu}
        style={({ pressed }) => [styles.addBtn, pressTap(pressed, 'card')]}
      >
        {add.isPending ? (
          <ActivityIndicator size="small" color={color.ink[500]} />
        ) : (
          <>
            <Plus size={18} strokeWidth={2} color={color.ink[500]} />
            <Text style={styles.addText}>새 메뉴 추가하기</Text>
          </>
        )}
      </Pressable>

      {add.isError ? (
        <View style={{ marginTop: space[2] }}>
          <Banner tone="danger" title="메뉴를 추가하지 못했습니다" description="다시 눌러 주세요." />
        </View>
      ) : null}
      {remove.isError ? (
        <View style={{ marginTop: space[2] }}>
          <Banner tone="danger" title="메뉴를 지우지 못했습니다" description="다시 시도해 주세요." />
        </View>
      ) : null}
      {rowError ? null : null}

      {/* 지우기 확인 — 되돌릴 수 없어서 반드시 한 번 묻습니다 */}
      <Modal
        visible={!!confirming}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirming(null)}
      >
        <View style={styles.scrim}>
          <View accessibilityViewIsModal accessibilityRole="alert" style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Trash2 size={22} strokeWidth={2} color={color.danger[500]} />
            </View>
            <Text style={styles.dialogTitle} numberOfLines={2}>
              {confirming?.name || '이 메뉴'}를{'\n'}지울까요?
            </Text>
            <Text style={styles.dialogSub}>지우면 되돌릴 수 없습니다.</Text>
            <View style={styles.dialogCta}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirming(null)}
                style={({ pressed }) => [styles.dialogGhost, pressTap(pressed, 'button')]}
              >
                <Text style={styles.dialogGhostText}>취소</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={remove.isPending}
                onPress={() => {
                  const target = confirming;
                  setConfirming(null);
                  if (target) remove.mutate(Number(target.id));
                }}
                style={({ pressed }) => [styles.dialogDanger, pressTap(pressed, 'button')]}
              >
                <Text style={styles.dialogDangerText}>지우기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * 🔴 안드로이드에서 **입력칸 글자 윗부분이 잘리던 것** (2026-08-28, 실기기 보고).
 *
 * 이 화면의 입력칸은 시안 `h-9` 라 **36** 입니다 — 앱에서 가장 낮은 입력칸입니다
 * (다른 곳은 전부 `sizing.inputHeight` = 52). 낮은 칸에서 아래 셋이 겹치면서
 * 글자 위쪽이 테두리에 잘렸습니다.
 *
 *   ① **세로 패딩을 0 으로 안 잡았습니다.** 안드로이드 `TextInput` 은 기본 세로 패딩이
 *      붙는데, `paddingHorizontal` 만 주면 그 기본값이 그대로 남습니다.
 *      `ui/AuthField.tsx` · `StoreSearchScreen` 의 입력칸은 전부 `padding: 0` 입니다 —
 *      52 짜리 칸은 여유가 30 이나 돼서 티가 안 났을 뿐, 같은 실수였습니다.
 *   ② **토큰을 펼치면서 `lineHeight` 까지 딸려 왔습니다** (bodySmall 21).
 *      안드로이드는 `TextInput` 에 줄높이가 있으면 첫 줄을 그만큼 위로 끌어올립니다.
 *      한 줄짜리 입력칸에 줄높이는 의미도 없습니다.
 *   ③ `includeFontPadding` 기본값(true)이 폰트 권장 여백을 더 얹습니다.
 *      21 + 기본 패딩 + 폰트 여백이 36 을 넘기면서 위가 잘렸습니다.
 *
 * 그래서 셋을 함께 끕니다. **높이 36 은 시안 값이라 그대로 둡니다** — 칸을 키워서
 * 가리는 게 아니라 글자를 칸 안에 제대로 앉히는 것이 맞습니다.
 * iOS 는 `includeFontPadding` · `textAlignVertical` 을 무시하므로 영향이 없습니다.
 *
 * ⚠️ 낮은 입력칸을 새로 만들면 이걸 같이 펴세요. 52 짜리는 여유가 있어 안 드러나지만
 *    같은 조합입니다.
 */
const INPUT_FIT = {
  /** 토큰에서 딸려 온 줄높이를 끕니다 (위 ②) */
  lineHeight: undefined,
  paddingVertical: 0,
  includeFontPadding: false,
  textAlignVertical: 'center',
} as const;

const styles = StyleSheet.create({
  // ── 지우기 확인창 (연동 실패 얼럿과 같은 규격) ──────────────
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  dialog: {
    width: 300,
    maxWidth: '100%',
    alignItems: 'center',
    paddingHorizontal: space[6],
    paddingTop: space[7],
    paddingBottom: space[5],
    borderRadius: radius.dialog,
    backgroundColor: color.canvas,
  },
  dialogIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  dialogTitle: {
    ...theme.text.subheading,
    fontSize: 17,
    lineHeight: 23,
    marginTop: space[4],
    textAlign: 'center',
    color: color.ink[900],
  },
  dialogSub: {
    ...text.caption,
    marginTop: space[2],
    lineHeight: 19,
    textAlign: 'center',
    color: color.ink[500],
  },
  dialogCta: { flexDirection: 'row', gap: 10, marginTop: space[6], alignSelf: 'stretch' },
  dialogGhost: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.canvas,
  },
  dialogGhostText: {
    ...text.button,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[800],
  },
  dialogDanger: {
    flex: 1.4,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: color.danger[500],
  },
  dialogDangerText: {
    ...text.button,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.paper,
  },

  // 시안: mb-1.5 flex items-center gap-2 pl-1
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: 6, paddingLeft: 4 },
  headLabel: { ...text.label, color: color.ink[500] },
  headCount: { ...theme.text.micro, color: color.ink[500] },

  hint: { ...text.caption, marginTop: space[2], paddingLeft: 4, lineHeight: 19, color: color.ink[500] },

  // 시안: flex flex-col gap-2
  list: { gap: space[2], marginTop: space[2] },

  // 시안: rounded-xl border-hairline bg-panel p-3 gap-3
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
  },

  // 시안: h-[76px] w-[76px] rounded-lg
  thumbWrap: { width: 76, height: 76, borderRadius: radius.md, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  thumbClear: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  // 시안: 점선 테두리 + image-plus + "사진"
  thumbEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.ink[300],
    borderRadius: radius.md,
  },
  thumbLabel: {
    ...theme.text.nano,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[400],
  },

  fields: { flex: 1, minWidth: 0, gap: space[2] },
  // 시안: h-9 rounded-lg 14 semibold
  nameInput: {
    ...text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    ...INPUT_FIT,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.canvas,
    color: color.ink[900],
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.canvas,
  },
  priceInput: {
    ...text.bodySmall,
    ...INPUT_FIT,
    flex: 1,
    minWidth: 0,
    padding: 0,
    color: color.ink[900],
  },
  won: { ...text.caption, color: color.ink[500] },

  trash: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },

  // 시안: mt-2.5 border-2 border-dashed py-3.5 · 14 semibold
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: color.ink[300],
  },
  addText: {
    ...text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[500],
  },
});
