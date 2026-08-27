/**
 * EditProblem — 편집이 막혔을 때의 두 화면.
 *
 * 디자인 시안 `편집시간초과오류.png` · `편집완료불가버그.png` (2026-08-27 수령)
 *
 *   ┌───────────────────────────┐
 *   │                           │
 *   │        [빨간 타일 56]      │   ← 화면 정중앙
 *   │        제목 18·bold        │
 *   │        한 줄 15·회색       │
 *   │                           │
 *   │  [ 파란 주버튼 48 ]        │   ← 바닥
 *   │  [ 흰 테두리 홈으로 이동 ]  │
 *   └───────────────────────────┘
 *
 * 시안 두 장에서 **아이콘·글자 높이가 서로 달랐습니다**(시간초과는 400, 완료불가는 331).
 * 사장님 지시대로 **둘 다 화면 정중앙**으로 통일했습니다 — 두 화면을 오갈 때 덩어리가
 * 위아래로 튀지 않습니다.
 *
 * 시안은 아이콘이 파란색이었는데 **빨강으로 바꿨습니다**(사장님 지시). 둘 다 "문제가
 * 생겼다" 는 화면이라 브랜드색이 아니라 경고색이 맞습니다.
 *
 * 두 화면을 가르는 것 (이 컴포넌트를 부르는 쪽이 정합니다)
 *   timeout — 15분이 지나도 안 끝난 경우.   **서버는 계속 돌고 있을 수 있습니다.**
 *   failed  — 서버가 `render_status: FAILED` 를 준 경우. 편집 자체가 안 된 것입니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleAlert, Clock, RotateCcw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import theme, { color, radius, space, text } from '../../../design/theme';

export type EditProblemKind = 'timeout' | 'failed';

export function EditProblem({
  kind,
  /** 마지막 자동 저장 시각(9.3 `last_saved_at`). 없으면 줄을 다르게 씁니다. */
  savedAt,
  onRetry,
  onHome,
}: {
  kind: EditProblemKind;
  savedAt?: string | null;
  onRetry: () => void;
  onHome: () => void;
}) {
  const insets = useSafeAreaInsets();
  const timeout = kind === 'timeout';

  /*
    시안 문구는 "마지막 자동 저장 완료: 12:30" 입니다. 그 시각은 9.3 이 주는
    `last_saved_at` 이고, **없으면 지어내지 않습니다**(제1규칙). 값이 없을 때는
    사장님이 실제로 궁금해하는 것 — 촬영본이 남아 있는지 — 을 그대로 말합니다.
  */
  const savedLine = savedAt
    ? `마지막 자동 저장 완료: ${hhmm(savedAt)}`
    : '촬영본은 그대로 저장돼 있어요';

  return (
    <Screen scroll={false} padded={false} edges={['top']} contentStyle={{ paddingTop: 0, gap: 0 }}>
      <View style={styles.center}>
        <View style={styles.tile}>
          {timeout ? (
            <Clock size={30} strokeWidth={2} color={color.danger[500]} />
          ) : (
            <CircleAlert size={30} strokeWidth={2} color={color.danger[500]} />
          )}
        </View>
        <Text style={styles.title}>{timeout ? '편집 시간 초과' : '편집을 완료할 수 없습니다'}</Text>
        <Text style={styles.sub}>{timeout ? savedLine : '임시 저장됨'}</Text>
      </View>

      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, space[8]) }]}>
        <Button
          label={timeout ? '편집 이어서 하기' : '다시 시도'}
          icon={RotateCcw}
          onPress={onRetry}
        />
        <Button label="홈으로 이동" variant="secondary" onPress={onHome} />
      </View>
    </Screen>
  );
}

/** ISO 시각 → "12:30". 기기 시간대로 보여줍니다. */
function hhmm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  // 시안 두 장의 높이가 달랐던 것을 정중앙으로 통일했습니다 (머리말 참고)
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
  },
  // 시안: 56 정사각 · 둥근 모서리 · 연한 바탕. 색만 파랑 → 빨강
  tile: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.danger[100],
  },
  // 시안: 18 bold · 아이콘 아래 16
  title: { ...theme.text.heading, marginTop: space[4], textAlign: 'center' },
  // 시안: 15 · 회색 · 제목 아래 8
  sub: { ...text.body, marginTop: space[2], color: color.ink[500], textAlign: 'center' },
  // 시안: 좌우 24 · 버튼 사이 12 · 바닥 여백은 안전영역과 비교해 큰 쪽
  cta: { paddingHorizontal: space[6], gap: space[3] },
});
