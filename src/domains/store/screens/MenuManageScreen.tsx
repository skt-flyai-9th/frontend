/**
 * S03.1.2 대표 메뉴 등록·수정·삭제 · 명세 3.2
 *
 * 메뉴는 이 앱에서 가장 자주 바뀌는 정보입니다.
 * 품절, 가격 인상, 신메뉴 — 이게 실제와 다르면 영상 자막에 틀린 가격이 나갑니다.
 * 그래서 목록에서 바로 고칠 수 있게 만듭니다.
 */
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import { Field } from '../../../ui/Field';
import { color, radius, space, text } from '../../../design/theme';
import {
  useAddMenu,
  useDeleteMenu,
  useMenus,
  useUpdateMenu,
} from '../../../api/queries/store';
import { useCurrentStore } from '../../../lib/appState';
import { won } from '../../../lib/format';
import type { Menu } from '../../../api/schema/types';
import type { StoreStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<StoreStackParamList, 'MenuManage'>;

interface Draft {
  name: string;
  price: string;
  description: string;
  isNewMenu: boolean;
}

const EMPTY: Draft = { name: '', price: '', description: '', isNewMenu: false };

export default function MenuManageScreen({ navigation }: Props) {
  const storeId = useCurrentStore();
  const { data: menus, isLoading, isError, refetch } = useMenus(storeId);

  const addMenu = useAddMenu(storeId ?? 0);
  const updateMenu = useUpdateMenu(storeId ?? 0);
  const deleteMenu = useDeleteMenu(storeId ?? 0);

  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const set = (k: keyof Draft) => (v: string | boolean) =>
    setDraft((p) => ({ ...p, [k]: v }));

  const startAdd = () => {
    setDraft(EMPTY);
    setEditingId('new');
  };

  const startEdit = (m: Menu) => {
    setDraft({
      name: m.name,
      price: m.price ? String(m.price) : '',
      description: m.description ?? '',
      isNewMenu: Boolean(m.isNewMenu),
    });
    setEditingId(m.id);
  };

  const save = () => {
    const body = {
      name: draft.name.trim(),
      price: draft.price ? Number(draft.price.replace(/\D/g, '')) : undefined,
      description: draft.description.trim() || undefined,
      isNewMenu: draft.isNewMenu,
    };
    if (!body.name) return;

    if (editingId === 'new') {
      addMenu.mutate(body, { onSuccess: () => setEditingId(null) });
    } else if (typeof editingId === 'number') {
      updateMenu.mutate({ menuId: editingId, ...body }, { onSuccess: () => setEditingId(null) });
    }
  };

  const remove = (m: Menu) => {
    Alert.alert(`${m.name}을(를) 지울까요?`, '지운 메뉴는 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () => deleteMenu.mutate(m.id),
      },
    ]);
  };

  const toggleSoldOut = (m: Menu) => {
    updateMenu.mutate({ menuId: m.id, isSoldOut: !m.isSoldOut });
  };

  const saving = addMenu.isPending || updateMenu.isPending;

  if (isError) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => refetch()} />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} title="메뉴 관리" />
        <EmptyState title="메뉴를 불러오지 못했습니다" />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        editingId ? (
          <BottomAction>
            <Button
              label={editingId === 'new' ? '메뉴 추가' : '고친 내용 저장'}
              onPress={save}
              disabled={!draft.name.trim()}
              loading={saving}
            />
            <Button
              label="취소"
              variant="quiet"
              size="small"
              onPress={() => setEditingId(null)}
            />
          </BottomAction>
        ) : (
          <BottomAction>
            <Button label="메뉴 추가하기" onPress={startAdd} />
          </BottomAction>
        )
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="메뉴 관리" />

      {(addMenu.isError || updateMenu.isError || deleteMenu.isError) && (
        <Banner tone="danger" title="저장하지 못했습니다" description="잠시 후 다시 시도해 주세요." />
      )}

      {editingId ? (
        <>
          <Text style={text.title}>{editingId === 'new' ? '새 메뉴' : '메뉴 고치기'}</Text>
          <Field
            label="메뉴 이름"
            required
            value={draft.name}
            onChangeText={set('name') as (v: string) => void}
            placeholder="예: 바지락 손칼국수"
          />
          <Field
            label="가격"
            value={draft.price}
            onChangeText={set('price') as (v: string) => void}
            keyboardType="number-pad"
            placeholder="9000"
            hint="숫자만 넣으시면 됩니다."
          />
          <Field
            label="설명"
            value={draft.description}
            onChangeText={set('description') as (v: string) => void}
            placeholder="예: 매일 아침 미는 생면과 바지락 육수"
          />
          <Card onPress={() => set('isNewMenu')(!draft.isNewMenu)} selected={draft.isNewMenu}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={text.bodyStrong}>신메뉴로 표시</Text>
                <Text style={text.caption}>영상에서 "새로 나온" 이라고 소개합니다</Text>
              </View>
              {draft.isNewMenu && <Badge label="켜짐" tone="brand" />}
            </View>
          </Card>
        </>
      ) : (
        <>
          <View style={{ gap: space[2] }}>
            <Text style={text.title}>우리 가게 메뉴</Text>
            <Text style={text.bodySmall}>
              영상 자막에 그대로 나갑니다. 가격이 바뀌면 꼭 고쳐 주세요.
            </Text>
          </View>

          {isLoading && !menus && <Loading label="메뉴를 불러오는 중" />}

          {!isLoading && (menus?.length ?? 0) === 0 && (
            <EmptyState
              title="등록된 메뉴가 없습니다"
              description="최소 1개는 있어야 영상을 만들 수 있습니다."
              actionLabel="메뉴 추가하기"
              onAction={startAdd}
            />
          )}

          {menus?.map((m) => (
            <Card key={m.id}>
              <View style={styles.row}>
                {/* 명세 3.2 image_url — 있으면 보여줍니다. 사장님이 어느 메뉴인지 바로 압니다. */}
                {m.imageUrl ? (
                  <Image source={{ uri: m.imageUrl }} style={styles.thumb} resizeMode="cover" />
                ) : null}
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.tagRow}>
                    <Text style={[text.bodyStrong, m.isSoldOut && styles.soldOut]}>{m.name}</Text>
                    {m.isNewMenu ? <Badge label="신메뉴" tone="brand" /> : null}
                    {m.isEventMenu ? <Badge label="행사중" tone="brand" /> : null}
                    {m.isSoldOut ? <Badge label="품절" tone="warn" /> : null}
                  </View>
                  <Text style={text.caption}>
                    {won(m.price) || '가격 미정'}
                    {m.description ? ` · ${m.description}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Button
                  label={m.isSoldOut ? '판매 재개' : '오늘 품절'}
                  variant="secondary"
                  size="small"
                  full={false}
                  onPress={() => toggleSoldOut(m)}
                />
                <Button
                  label="고치기"
                  variant="secondary"
                  size="small"
                  full={false}
                  onPress={() => startEdit(m)}
                />
                <Button
                  label="지우기"
                  variant="danger"
                  size="small"
                  full={false}
                  onPress={() => remove(m)}
                />
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  actions: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  soldOut: { color: color.ink[400], textDecorationLine: 'line-through' },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: color.ink[100] },
});
