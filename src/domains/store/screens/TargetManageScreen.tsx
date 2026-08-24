/**
 * S03.5.2 타깃 확인·수정·신뢰도 · 명세 3.4
 *
 * 명세 규칙: AI 가 만든 가설과 실제 데이터를 구분해 보여주고,
 * 사장님이 확인·수정할 수 있어야 합니다.
 *
 * 자료가 적어 추측이 섞이는 게 정상입니다.
 * 중요한 건 그걸 숨기지 않고 "이건 추측입니다"라고 말하는 것입니다.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import { Field } from '../../../ui/Field';
import { space, text } from '../../../design/theme';
import { useConfirmTarget, useTargetCustomers } from '../../../api/queries/store';
import { useCurrentStore } from '../../../lib/appState';
import type { Confidence, TargetCustomer } from '../../../api/schema/types';
import type { StoreStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<StoreStackParamList, 'TargetManage'>;

function confidenceLabel(c?: Confidence) {
  if (c === '높음') return { label: '근거 충분', tone: 'done' as const };
  if (c === '보통') return { label: '참고용', tone: 'neutral' as const };
  return { label: '자료 부족', tone: 'warn' as const };
}

export default function TargetManageScreen({ navigation }: Props) {
  const storeId = useCurrentStore();
  const { data: targets, isLoading, isError, refetch } = useTargetCustomers(storeId);
  const confirmTarget = useConfirmTarget(storeId ?? 0);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  const startEdit = (t: TargetCustomer) => {
    setDraft(t.targetDescription);
    setEditingId(t.id);
  };

  const saveEdit = () => {
    if (!editingId || !draft.trim()) return;
    confirmTarget.mutate(
      { targetId: editingId, targetDescription: draft.trim(), status: 'CONFIRMED' },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const confirm = (t: TargetCustomer) => {
    confirmTarget.mutate({ targetId: t.id, status: 'CONFIRMED' });
  };

  /** 명세 3.4 (2026-08-23): 숨김은 { status: "HIDDEN" } 만 보내면 됩니다. */
  const hide = (t: TargetCustomer) => {
    confirmTarget.mutate({ targetId: t.id, status: 'HIDDEN' });
  };

  /**
   * 되살리면 SUGGESTED 로 돌립니다.
   * 숨기기 전에 CONFIRMED 였는지는 서버가 기억하지 않으므로(status 필드 하나뿐),
   * "사장님이 확인했다" 고 단정하는 대신 다시 확인을 받는 쪽을 택했습니다.
   */
  const unhide = (t: TargetCustomer) => {
    confirmTarget.mutate({ targetId: t.id, status: 'SUGGESTED' });
  };

  if (isError) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => refetch()} />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} title="손님 정보" />
        <EmptyState title="손님 정보를 불러오지 못했습니다" />
      </Screen>
    );
  }

  // 명세 3.4: 목록에는 숨김 타깃도 내려옵니다. 화면에서 나눕니다.
  const visible = targets?.filter((t) => t.status !== 'HIDDEN') ?? [];
  const hidden = targets?.filter((t) => t.status === 'HIDDEN') ?? [];
  const suggested = visible.filter((t) => t.status === 'SUGGESTED');
  const [showHidden, setShowHidden] = useState(false);

  return (
    <Screen
      footer={
        editingId ? (
          <BottomAction>
            <Button
              label="고친 내용 저장"
              onPress={saveEdit}
              disabled={!draft.trim()}
              loading={confirmTarget.isPending}
            />
            <Button label="취소" variant="quiet" size="small" onPress={() => setEditingId(null)} />
          </BottomAction>
        ) : undefined
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="손님 정보" />

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>우리 가게에 오는 손님</Text>
        <Text style={text.bodySmall}>
          영상을 누구에게 보여줄지 정하는 데 씁니다. 사장님이 아는 게 더 정확합니다.
        </Text>
      </View>

      {suggested.length > 0 && (
        <Banner
          tone="warn"
          title={`아직 확인 안 한 항목이 ${suggested.length}개 있습니다`}
          description="맞으면 확인을, 다르면 고쳐 주세요. 그냥 두셔도 됩니다."
        />
      )}

      {isLoading && !targets && <Loading label="불러오는 중" />}

      {visible.map((t) => {
        const conf = confidenceLabel(t.aiConfidence);
        const editing = editingId === t.id;

        return (
          <Card key={t.id}>
            <View style={styles.head}>
              <Badge
                label={`${t.targetType} 손님`}
                tone={t.targetType === '주' ? 'brand' : 'neutral'}
              />
              <View style={styles.tagRow}>
                {t.status === 'SUGGESTED' && <Badge label="AI 추천" tone="warn" />}
                {t.status === 'CONFIRMED' && <Badge label="확인함" tone="done" />}
                <Badge label={conf.label} tone={conf.tone} />
              </View>
            </View>

            {editing ? (
              <Field
                label="어떤 손님인가요"
                value={draft}
                onChangeText={setDraft}
                autoFocus
                placeholder="예: 점심에 혼자 오는 40-60대 근처 주민"
              />
            ) : (
              <Text style={text.body}>{t.targetDescription}</Text>
            )}

            {!editing && (
              <View style={styles.actions}>
                {t.status === 'SUGGESTED' && (
                  <Button
                    label="맞아요"
                    size="small"
                    full={false}
                    onPress={() => confirm(t)}
                    loading={confirmTarget.isPending}
                  />
                )}
                <Button
                  label="고치기"
                  variant="secondary"
                  size="small"
                  full={false}
                  onPress={() => startEdit(t)}
                />
                <Button
                  label="숨기기"
                  variant="quiet"
                  size="small"
                  full={false}
                  onPress={() => hide(t)}
                />
              </View>
            )}
          </Card>
        );
      })}

      {visible.length === 0 && !isLoading && (
        <EmptyState
          title="보이는 손님 정보가 없습니다"
          description={hidden.length > 0 ? '숨긴 항목을 되살리거나, 새로 만들 수 있습니다.' : undefined}
        />
      )}

      {/* ── 숨긴 항목. 삭제가 아니므로 되살릴 길을 항상 둡니다. ── */}
      {hidden.length > 0 && (
        <View style={{ gap: space[3] }}>
          <Button
            label={showHidden ? '숨긴 항목 접기' : `숨긴 항목 ${hidden.length}개 보기`}
            variant="quiet"
            size="small"
            onPress={() => setShowHidden((v) => !v)}
          />
          {showHidden &&
            hidden.map((t) => (
              <Card key={t.id}>
                <View style={styles.head}>
                  <Badge label={`${t.targetType} 손님`} tone="neutral" />
                  <Badge label="숨김" tone="neutral" />
                </View>
                <Text style={[text.body, styles.hiddenText]}>{t.targetDescription}</Text>
                <View style={styles.actions}>
                  <Button
                    label="다시 보이기"
                    variant="secondary"
                    size="small"
                    full={false}
                    onPress={() => unhide(t)}
                    loading={confirmTarget.isPending}
                  />
                </View>
              </Card>
            ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[2] },
  tagRow: { flexDirection: 'row', gap: space[2] },
  actions: { flexDirection: 'row', gap: space[2] },
  hiddenText: { opacity: 0.55 },
});
