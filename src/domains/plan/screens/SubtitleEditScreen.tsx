/**
 * SubtitleEditScreen — 영상에 들어갈 자막 확인·수정 (S07.4.2 / S14.4.1 기반)
 *
 * TTS 를 쓰지 않기로 하면서 이 화면이 "말"을 다루는 유일한 곳이 됐습니다.
 * 소리 없이 보는 사람이 많으므로 자막이 사실상 유일한 설명 수단입니다.
 *
 * 살려둔 규칙
 *   - 가격·기간·위치는 가게 정보와 교차 확인한다 (S11.1.1)
 *     → 틀린 가격이 자막으로 박혀 나가는 게 이 앱에서 가장 위험한 실패입니다.
 *   - 자막 길이를 장면 길이에 맞춘다
 *     → 4초 장면에 30자를 넣으면 읽을 수 없습니다.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useScenes, useUpdateScenes } from '../../../api/queries/project';
import { useMenus, useStore } from '../../../api/queries/store';
import { useCurrentStore } from '../../../lib/appState';
import { seconds } from '../../../lib/format';
import { useAutoSave } from '../../../lib/useAutoSave';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'SubtitleEdit'>;

/** 한국어 자막은 초당 6~7자 정도가 편하게 읽힙니다. */
const CHARS_PER_SEC = 6.5;

interface FactIssue {
  kind: 'price' | 'hours';
  message: string;
}

/**
 * 자막에 든 숫자를 가게 정보와 대조합니다.
 * 서버가 해줄 일이지만, 명세에 교차검증 응답 필드가 없어 화면에서 한 번 더 봅니다.
 */
function checkFacts(
  subtitle: string,
  menuPrices: number[],
  businessHours?: string
): FactIssue | null {
  // "9,000원" / "9000원" 형태를 찾습니다.
  const priceMatch = subtitle.match(/([\d,]+)\s*원/);
  if (priceMatch) {
    const written = Number(priceMatch[1].replace(/,/g, ''));
    if (menuPrices.length > 0 && !menuPrices.includes(written)) {
      const closest = menuPrices.reduce((a, b) =>
        Math.abs(b - written) < Math.abs(a - written) ? b : a
      );
      return {
        kind: 'price',
        message: `가게 정보에 ${written.toLocaleString()}원짜리 메뉴가 없습니다. ${closest.toLocaleString()}원이 맞나요?`,
      };
    }
  }

  // 휴무 표기가 가게 영업시간과 다른 경우
  const dayMatch = subtitle.match(/([월화수목금토일])요일\s*(휴무|쉽니다|휴업)/);
  if (dayMatch && businessHours && !businessHours.includes(dayMatch[1])) {
    return {
      kind: 'hours',
      message: `가게 정보의 영업시간과 다릅니다. (${businessHours})`,
    };
  }

  return null;
}

export default function SubtitleEditScreen({ navigation, route }: Props) {
  const { projectId } = route.params;

  // 진행 상황을 서버에 남깁니다. 앱을 꺼도 이어서 할 수 있습니다.
  useAutoSave({ projectId, step: 'PLANNING' });
  const storeId = useCurrentStore();

  const { data: scenes, isLoading, isError, refetch } = useScenes(projectId);
  const { data: menus } = useMenus(storeId);
  const { data: store } = useStore(storeId);
  const updateScenes = useUpdateScenes(projectId);

  const [edits, setEdits] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [partialSave, setPartialSave] = useState<number | null>(null);

  const menuPrices = useMemo(
    () => (menus ?? []).map((m) => m.price).filter((p): p is number => typeof p === 'number'),
    [menus]
  );

  const rows = useMemo(
    () =>
      (scenes ?? []).map((s) => {
        const subtitle = edits[s.id] ?? s.sceneSubtitle;
        const maxChars = Math.floor(s.targetDurationSec * CHARS_PER_SEC);
        return {
          scene: s,
          subtitle,
          tooLong: subtitle.length > maxChars,
          maxChars,
          fact: checkFacts(subtitle, menuPrices, store?.businessHours),
        };
      }),
    [scenes, edits, menuPrices, store?.businessHours]
  );

  const factIssues = rows.filter((r) => r.fact);
  const longIssues = rows.filter((r) => r.tooLong);

  const save = () => {
    const changed = Object.entries(edits).map(([id, sceneSubtitle]) => ({
      id: Number(id),
      sceneSubtitle,
    }));
    if (changed.length === 0) {
      navigation.navigate('TaskBoard', { projectId });
      return;
    }
    updateScenes.mutate(changed, {
      onSuccess: (res) => {
        // 명세 7.2 응답의 updated_count 로 실제 저장 건수를 확인합니다.
        if (typeof res?.updatedCount === 'number' && res.updatedCount < changed.length) {
          setPartialSave(changed.length - res.updatedCount);
          return;
        }
        navigation.navigate('TaskBoard', { projectId });
      },
    });
  };

  if (isError || (!isLoading && (scenes?.length ?? 0) === 0)) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => refetch()} />
            <Button
              label="자막 없이 찍으러 가기"
              variant="quiet"
              size="small"
              onPress={() => navigation.navigate('TaskBoard', { projectId })}
            />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} title="자막 확인" />
        <EmptyState
          title="자막을 불러오지 못했습니다"
          description="자막 없이도 촬영은 진행할 수 있습니다."
        />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <AppBar onBack={() => navigation.goBack()} title="자막 확인" />
        <Loading label="자막을 불러오는 중" />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="이 자막으로 찍으러 가기"
            onPress={save}
            loading={updateScenes.isPending}
          />
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="자막 확인" />

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>화면에 이런 글자가 뜹니다</Text>
        <Text style={text.bodySmall}>
          소리를 끄고 보는 손님이 많습니다. 자막만 읽어도 이해되는지 봐 주세요.
        </Text>
      </View>

      {updateScenes.isError && (
        <Banner
          tone="danger"
          title="자막을 저장하지 못했습니다"
          description="잠시 후 다시 눌러 주세요. 고친 내용은 화면에 남아 있습니다."
        />
      )}

      {partialSave !== null && (
        <Banner
          tone="warn"
          title={`${partialSave}개가 저장되지 않았습니다`}
          description="다시 눌러 주세요."
        />
      )}

      {factIssues.length > 0 && (
        <Banner
          tone="warn"
          title={`가게 정보와 다른 곳이 ${factIssues.length}군데 있습니다`}
          description="가격이나 영업시간이 바뀌었으면 자막을 고치거나 가게 정보를 갱신해 주세요."
        />
      )}

      {longIssues.length > 0 && (
        <Banner
          tone="info"
          title={`자막이 긴 장면이 ${longIssues.length}개 있습니다`}
          description="장면이 지나가기 전에 다 못 읽습니다. 짧게 줄이면 끝까지 보는 사람이 늘어납니다."
        />
      )}

      {rows.map(({ scene, subtitle, tooLong, maxChars, fact }) => {
        const editing = editingId === scene.id;
        return (
          <Card key={scene.id}>
            <View style={styles.head}>
              <View style={styles.numRow}>
                <View style={styles.numBox}>
                  <Text style={styles.num}>{scene.sceneOrder}</Text>
                </View>
                <Text style={text.micro}>{scene.sceneDescription}</Text>
              </View>
              <Badge
                label={`${subtitle.length}/${maxChars}자`}
                tone={tooLong ? 'warn' : 'neutral'}
              />
            </View>

            {editing ? (
              <View style={{ gap: space[2] }}>
                <TextInput
                  value={subtitle}
                  onChangeText={(v) => setEdits((p) => ({ ...p, [scene.id]: v }))}
                  multiline
                  autoFocus
                  style={styles.input}
                  accessibilityLabel="자막 고치기"
                />
                <Button
                  label="다 고쳤어요"
                  size="small"
                  full={false}
                  onPress={() => setEditingId(null)}
                />
              </View>
            ) : (
              <Pressable onPress={() => setEditingId(scene.id)} accessibilityRole="button">
                {/* 실제 영상에서 보일 모습을 흉내 냅니다 */}
                <View style={styles.preview}>
                  <Text style={styles.previewText}>{subtitle}</Text>
                </View>
              </Pressable>
            )}

            {fact && (
              <View style={styles.factRow}>
                <Text style={[text.bodySmall, { color: color.warn[500] }]}>!</Text>
                <Text style={[text.bodySmall, { flex: 1, color: color.warn[500] }]}>
                  {fact.message}
                </Text>
              </View>
            )}

            {tooLong && !fact && (
              <Text style={[text.caption, { color: color.warn[500] }]}>
                {seconds(scene.targetDurationSec)} 동안 읽기에는 조금 깁니다.
              </Text>
            )}

            {!editing && (
              <Button
                label="고치기"
                variant="secondary"
                size="small"
                full={false}
                onPress={() => setEditingId(scene.id)}
              />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1 },
  numBox: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: color.ink[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { ...text.micro, color: color.paper },
  preview: {
    backgroundColor: color.ink[900],
    borderRadius: radius.md,
    paddingVertical: space[5],
    paddingHorizontal: space[4],
    alignItems: 'center',
  },
  previewText: {
    ...text.subheading,
    color: color.paper,
    textAlign: 'center',
    fontFamily: theme.text.bodyStrong.fontFamily,
  },
  input: {
    ...text.body,
    minHeight: 88,
    borderRadius: radius.md,
    borderWidth: theme.border.thick,
    borderColor: color.brand[600],
    backgroundColor: color.paper,
    padding: space[4],
    textAlignVertical: 'top',
  },
  factRow: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
});
