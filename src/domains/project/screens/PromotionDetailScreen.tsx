/**
 * S04.1.x 홍보 목적 상세 · 명세 4.2 (2026-08-21 개정)
 *
 * 변경 배경
 *   ERD 개편으로 promotion_sub_goal 이라는 자유 문자열 하나가
 *   menu_id + promotion_detail 구조로 바뀌었습니다.
 *   목적에 따라 물어볼 것이 완전히 달라져서 화면을 따로 뒀습니다.
 *
 *   메뉴소개   → 어떤 메뉴를, 어떤 각도로
 *   이벤트알리기 → 무엇을, 얼마나, 언제까지
 *   가게소개   → 무엇을 보여줄지 (복수)
 *   고객늘리기  → 어떤 손님을, 무엇으로 확인할지
 *
 * ⚠️ 밸리데이션 규칙은 기획 확정 대기 중입니다(BE 공유 문서).
 *    지금은 명세에 "필수"로 명시된 menu_id 만 강제하고,
 *    나머지는 비워도 넘어갈 수 있게 둡니다. 규칙이 정해지면 여기만 고치면 됩니다.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge, Chip } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import { Field, OptionRow } from '../../../ui/Field';
import { color, space, text } from '../../../design/theme';
import { useProject, useUpdateProject } from '../../../api/queries/project';
import { useMenus } from '../../../api/queries/store';
import { useCurrentStore } from '../../../lib/appState';
import { won } from '../../../lib/format';
import type {
  CustomerGoal,
  MenuDetailTag,
  PromotionDetail,
  StoreElement,
} from '../../../api/schema/types';
import { useAutoSave } from '../../../lib/useAutoSave';
import type { CreateStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<CreateStackParamList, 'PromotionDetail'>;

/** 명세 값 그대로. 옆 설명은 사장님이 고르기 쉽게 붙인 것입니다. */
const MENU_TAGS: { key: MenuDetailTag; hint: string }[] = [
  { key: '대표메뉴', hint: '우리 가게 하면 떠오르는 것' },
  { key: '신메뉴', hint: '이번에 새로 시작한 것' },
  { key: '비교', hint: '두 메뉴를 나란히 보여주기' },
  { key: '제조과정', hint: '만드는 과정을 보여주기' },
  { key: '숨은메뉴', hint: '아는 사람만 시키는 것' },
];

const STORE_ELEMENTS: { key: StoreElement; hint: string }[] = [
  { key: '공간', hint: '가게 안 분위기' },
  { key: '위치', hint: '찾아오는 길' },
  { key: '서비스경험', hint: '손님이 받는 대접' },
  { key: '사장님/직원', hint: '일하는 사람' },
  { key: '하루브이로그', hint: '하루 일과' },
];

const CUSTOMER_GOALS: { key: CustomerGoal; hint: string }[] = [
  { key: '신규고객', hint: '처음 오는 손님을 늘리고 싶어요' },
  { key: '재방문', hint: '왔던 손님이 다시 오게 하고 싶어요' },
  { key: '특정시간', hint: '한가한 시간대를 채우고 싶어요' },
  { key: '예약공석', hint: '빈 자리를 메우고 싶어요' },
  { key: '신뢰형성', hint: '믿을 만한 가게로 보이고 싶어요' },
];

export default function PromotionDetailScreen({ navigation, route }: Props) {
  const { projectId, topicTag } = route.params;

  // 진행 상황을 서버에 남깁니다. 앱을 꺼도 이어서 할 수 있습니다.
  useAutoSave({ projectId, step: 'SETUP' });
  const storeId = useCurrentStore();

  const { data: project, isLoading, isError, refetch } = useProject(projectId);
  const { data: menus } = useMenus(storeId);
  const updateProject = useUpdateProject(projectId);

  // 메뉴소개
  const [menuId, setMenuId] = useState<number | null>(null);
  /**
   * 촬영 준비 화면(시안 v3)에서 이미 고른 주제를 초기값으로 씁니다.
   * 같은 걸 두 번 묻지 않기 위해서입니다 — 사장님은 방금 답했습니다.
   */
  const [menuTag, setMenuTag] = useState<MenuDetailTag | null>(
    (topicTag as MenuDetailTag | undefined) ?? null
  );

  // 이벤트알리기
  const [ev, setEv] = useState({
    // 이벤트는 앞 화면에서 자유 입력을 받았으므로 혜택 칸에 이어 붙입니다.
    eventName: '',
    benefit: '',
    period: '',
    condition: '',
    limit: '',
    cta: '',
  });
  const setEvField = (k: keyof typeof ev) => (v: string) => setEv((p) => ({ ...p, [k]: v }));

  // 가게소개
  const [elements, setElements] = useState<StoreElement[]>([]);

  // 고객늘리기
  const [goal, setGoal] = useState<CustomerGoal | null>(null);
  const [successMetric, setSuccessMetric] = useState('');

  const purpose = project?.promotionPurpose;

  /** 명세 4.2 body 를 목적에 맞게 조립합니다. */
  const buildBody = (): { menuId?: number; promotionDetail: PromotionDetail } | null => {
    switch (purpose) {
      case '메뉴소개':
        if (!menuId || !menuTag) return null;
        return { menuId, promotionDetail: { detailTag: menuTag } };
      case '이벤트알리기':
        return {
          promotionDetail: {
            eventName: ev.eventName.trim() || undefined,
            benefit: ev.benefit.trim() || undefined,
            period: ev.period.trim() || undefined,
            condition: ev.condition.trim() || undefined,
            limit: ev.limit.trim() || undefined,
            cta: ev.cta.trim() || undefined,
          },
        };
      case '가게소개':
        if (elements.length === 0) return null;
        return { promotionDetail: { elements } };
      case '고객늘리기':
        if (!goal) return null;
        return {
          promotionDetail: { goal, successMetric: successMetric.trim() || undefined },
        };
      default:
        return null;
    }
  };

  const body = buildBody();
  const canProceed = body !== null;

  const next = () => {
    if (!body) return;
    updateProject.mutate(body, {
      onSuccess: () => navigation.navigate('TargetSelect', { projectId, formatId: route.params.formatId }),
    });
  };

  if (isLoading && !project) {
    return (
      <Screen>
        <AppBar onBack={() => navigation.goBack()} title="숏폼 만들기" />
        <Loading label="불러오는 중" />
      </Screen>
    );
  }

  if (isError || !purpose) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => refetch()} />
            <Button label="목적 다시 고르기" variant="quiet" size="small" onPress={() => navigation.goBack()} />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} title="숏폼 만들기" />
        <EmptyState title="프로젝트 정보를 불러오지 못했습니다" />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="다음"
            onPress={next}
            disabled={!canProceed}
            loading={updateProject.isPending}
          />
        </BottomAction>
      }
    >
      <AppBar
        onBack={() => navigation.goBack()}
        title="숏폼 만들기"
        step={{ current: 2, total: 4 }}
      />

      {updateProject.isError && (
        <Banner tone="danger" title="저장하지 못했습니다" description="잠시 후 다시 눌러 주세요." />
      )}

      {/* ── 메뉴소개 ── */}
      {purpose === '메뉴소개' && (
        <>
          <View style={{ gap: space[2] }}>
            <Text style={text.title}>어떤 메뉴를 알릴까요?</Text>
            <Text style={text.bodySmall}>고른 메뉴로 대사와 촬영 순서를 만듭니다.</Text>
          </View>

          {(menus?.length ?? 0) === 0 ? (
            <EmptyState
              title="등록된 메뉴가 없습니다"
              description="우리 가게 탭에서 메뉴를 먼저 등록해 주세요."
            />
          ) : (
            <View style={{ gap: space[3] }}>
              {menus?.map((m) => (
                <Card key={m.id} selected={menuId === m.id} onPress={() => setMenuId(m.id)}>
                  <View style={styles.menuRow}>
                    <Text style={text.bodyStrong}>{m.name}</Text>
                    {m.isNewMenu ? <Badge label="신메뉴" tone="brand" /> : null}
                    {m.isSoldOut ? <Badge label="품절" /> : null}
                  </View>
                  <Text style={text.caption}>
                    {won(m.price) || '가격 미정'}
                    {m.description ? ` · ${m.description}` : ''}
                  </Text>
                </Card>
              ))}
            </View>
          )}

          <Text style={[text.subheading, { marginTop: space[2] }]}>어떤 식으로 보여줄까요?</Text>
          <View style={{ gap: space[3] }}>
            {MENU_TAGS.map((t) => (
              <OptionRow
                key={t.key}
                title={t.key}
                description={t.hint}
                selected={menuTag === t.key}
                onPress={() => setMenuTag(t.key)}
              />
            ))}
          </View>
        </>
      )}

      {/* ── 이벤트알리기 ── */}
      {purpose === '이벤트알리기' && (
        <>
          <View style={{ gap: space[2] }}>
            <Text style={text.title}>어떤 행사인가요?</Text>
            <Text style={text.bodySmall}>
              아는 것만 적으셔도 됩니다. 비워두면 영상에서 뺍니다.
            </Text>
          </View>

          <Banner
            tone="warn"
            title="기간과 조건은 정확히 적어 주세요"
            description="영상에 그대로 나갑니다. 실제와 다르면 손님과 다툼이 생깁니다."
          />

          <Field
            label="행사 이름"
            value={ev.eventName}
            onChangeText={setEvField('eventName')}
            placeholder="예: 개업 3주년 감사 행사"
          />
          <Field
            label="무엇을 드리나요"
            value={ev.benefit}
            onChangeText={setEvField('benefit')}
            placeholder="예: 아메리카노 1+1"
          />
          <Field
            label="언제부터 언제까지"
            value={ev.period}
            onChangeText={setEvField('period')}
            placeholder="예: 2026-09-01 ~ 2026-09-07"
            hint="시작일과 끝나는 날을 적어 주세요."
          />
          <Field
            label="조건"
            value={ev.condition}
            onChangeText={setEvField('condition')}
            placeholder="예: 매장 이용 고객 한정"
          />
          <Field
            label="수량 제한"
            value={ev.limit}
            onChangeText={setEvField('limit')}
            placeholder="예: 1일 선착순 50잔"
          />
          <Field
            label="손님이 할 일"
            value={ev.cta}
            onChangeText={setEvField('cta')}
            placeholder="예: 매장 방문"
            hint="짧게 적어 주세요. 영상 마지막에 들어갑니다."
          />
        </>
      )}

      {/* ── 가게소개 ── */}
      {purpose === '가게소개' && (
        <>
          <View style={{ gap: space[2] }}>
            <Text style={text.title}>무엇을 보여줄까요?</Text>
            <Text style={text.bodySmall}>여러 개 고르셔도 됩니다.</Text>
          </View>

          <View style={{ gap: space[3] }}>
            {STORE_ELEMENTS.map((el) => {
              const on = elements.includes(el.key);
              return (
                <OptionRow
                  key={el.key}
                  title={el.key}
                  description={el.hint}
                  selected={on}
                  onPress={() =>
                    setElements((p) =>
                      on ? p.filter((x) => x !== el.key) : [...p, el.key]
                    )
                  }
                />
              );
            })}
          </View>

          {elements.length > 2 && (
            <Banner
              tone="info"
              title="한 영상에 3가지 넘게 넣으면 흐려집니다"
              description="2가지 정도로 줄이면 전달이 더 확실합니다."
            />
          )}
        </>
      )}

      {/* ── 고객늘리기 ── */}
      {purpose === '고객늘리기' && (
        <>
          <View style={{ gap: space[2] }}>
            <Text style={text.title}>어떤 손님을 늘리고 싶으세요?</Text>
            <Text style={text.bodySmall}>목표에 따라 영상 구성이 달라집니다.</Text>
          </View>

          <View style={{ gap: space[3] }}>
            {CUSTOMER_GOALS.map((g) => (
              <OptionRow
                key={g.key}
                title={g.key}
                description={g.hint}
                selected={goal === g.key}
                onPress={() => setGoal(g.key)}
              />
            ))}
          </View>

          {/*
            명세 4.2 확정 (2026-08-23): success_metric 은 자유 입력 문자열입니다.

            ⚠️ 라벨을 "성공 지표" 로 쓰지 않습니다 (BE 권고 2026-08-24).
               이 값은 AI 기획의 참고 입력일 뿐, 앱이 방문·예약 수를 세어 주지
               못합니다(전환 추적은 스코프 제외). "지표" 라고 부르면 사장님이
               나중에 그 숫자로 결과를 확인할 수 있다고 기대하게 되고, 성과
               화면에는 조회수·좋아요뿐이라 "이거 왜 안 알려줘?" 가 됩니다.
               처음부터 의도를 묻는 문구면 그 기대가 생기지 않습니다.
          */}
          <Field
            label="이 영상으로 뭘 이루고 싶으세요?"
            value={successMetric}
            onChangeText={setSuccessMetric}
            placeholder="예: 주말 예약 문의가 늘면 좋겠어요"
            hint="AI가 기획을 짤 때 참고합니다. 안 적으셔도 됩니다."
          />
        </>
      )}

      {/* 왜 다음이 안 눌리는지 알려 줍니다 */}
      {!canProceed && (
        <Text style={[text.caption, { color: color.warn[500] }]}>
          {purpose === '메뉴소개'
            ? '메뉴와 보여줄 방식을 하나씩 골라 주세요.'
            : purpose === '가게소개'
              ? '보여줄 것을 하나 이상 골라 주세요.'
              : purpose === '고객늘리기'
                ? '목표를 하나 골라 주세요.'
                : ''}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  menuRow: { flexDirection: 'row', gap: space[2], alignItems: 'center' },
});
