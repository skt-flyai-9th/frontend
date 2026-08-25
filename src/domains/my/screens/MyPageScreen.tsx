/**
 * MyPageScreen — 마이 탭. **시안 2차 `mypage` 대조 이식** (2026-08-26).
 *
 * 시안 레이아웃 순서를 그대로 따릅니다.
 *   ① 헤더: 가게 이름(중앙 18·bold) + 메뉴 아이콘
 *   ② 아바타 92 + 링 · 오른쪽에 Videos / Views 통계
 *   ③ 카테고리 · place+ · 인스타그램 · 유튜브
 *   ④ "프로필 수정하기" 전체폭 아웃라인 버튼
 *   ⑤ Professional Insight 카드 (brand-tint + brand-border)
 *   ⑥ 3열 그리드 **풀블리드** (간격 2px, 좌우 여백 0)
 *
 * ⚠️ 데이터 없는 값 처리 (2026-08-26 확정: **영역은 살리고 가짜 숫자는 금지**)
 *   Videos  15.2 의 total 로 **실제 값**을 씁니다.
 *   Views   계정 단위 누적 조회수 API 가 없습니다(17.1 은 게시물 단위).
 *           0 으로 채우면 "실제로 0" 이라는 거짓말이 되므로 "—" 로 둡니다.
 *   인사이트 카드도 같은 이유로 "1,500번 조회" 같은 숫자를 넣지 않습니다.
 *   SNS 계정명은 16.1 연동 목록에서 오고, 연동 전에는 "연동하기" 로 보입니다.
 *   불러오는 중에는 skeleton 이라 "로딩 중"과 "지원 안 함"이 구분됩니다.
 *
 * 메뉴 목록(반응 보기·가게 정보 관리 등)은 시안에 없지만 **기능이라 지우지 않습니다.**
 * 그리드 아래로 내려 시안의 상단 구성을 가리지 않게 했습니다.
 */
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { BrandMark } from '../../../ui/BrandMark';
import { Skeleton } from '../../../ui/Feedback';
import { pressTap } from '../../../ui/press';
import { useAppState } from '../../../lib/appState';
import { useStore, useStoreShorts } from '../../../api/queries/store';
import { useProjects } from '../../../api/queries/project';
import { useSnsConnections } from '../../../api/queries/edit';
import { projectLabel } from '../../../lib/format';
import theme, { color, space, radius, text, sizing } from '../../../design/theme';
import type { RootStackParamList, MyStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList & MyStackParamList>;

/** 시안 Insight CTA 안의 막대그래프 글리프 (lucide 에 같은 모양이 없어 직접 그립니다) */
function ChartIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20V10M10 20V4M16 20v-6M22 20H2"
        stroke={color.brand[600]}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 시안의 통계 한 칸. 불러오는 중이면 skeleton, 집계가 불가능하면 "—". */
function Stat({ label, value, loading }: { label: string; value?: string; loading?: boolean }) {
  return (
    <View style={styles.stat}>
      {loading ? (
        <Skeleton style={styles.statSkeleton} />
      ) : (
        <Text style={styles.statValue}>{value ?? '—'}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function MyPageScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);
  const { data: store } = useStore(storeId ?? undefined);
  const { data: drafts } = useProjects(storeId ?? undefined, 'DRAFT');
  const shorts = useStoreShorts(storeId ?? undefined);
  const { data: connections } = useSnsConnections();

  const items = shorts.data?.items ?? [];
  const resume = drafts?.[0];
  const instagram = connections?.find((c) => c.snsPlatform === 'INSTAGRAM');
  const youtube = connections?.find((c) => c.snsPlatform === 'YOUTUBE');

  return (
    <Screen edges={['top']} padded={false}>
      {/* 시안: 타이틀이 "마이" 가 아니라 가게 이름입니다 */}
      <AppBar title={store?.name ?? '우리 가게'} home={{ onMenu: () => nav.navigate('Settings') }} />

      {/* ── ② 아바타 + 통계 ── */}
      <View style={styles.profile}>
        <View style={styles.avatarRing}>
          {store?.logoUrl ? (
            <Image source={{ uri: store.logoUrl }} style={styles.logo} />
          ) : (
            <View style={[styles.logo, styles.logoEmpty]}>
              <Text style={[text.heading, { color: color.ink[400] }]}>
                {(store?.name ?? '가게').slice(0, 1)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.stats}>
          <Stat label="Videos" value={String(shorts.data?.total ?? 0)} loading={shorts.isLoading} />
          {/* 계정 단위 누적 조회수 API 없음 — 숫자를 지어내지 않습니다 */}
          <Stat label="Views" />
        </View>
      </View>

      {/* ── ③ 카테고리 · 연동 채널 ── */}
      <View style={styles.info}>
        <Text style={[text.bodySmall, { color: color.ink[500] }]}>{store?.category ?? ''}</Text>

        <View style={styles.links}>
          <View style={styles.linkRow}>
            <BrandMark kind="place" />
            <Text style={styles.linkText}>
              {store?.infoSource === 'NAVER' ? '네이버 스마트 플레이스' : '연동 안 됨'}
            </Text>
          </View>
          <View style={styles.linkRowWide}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="인스타그램 연동"
              onPress={() => nav.navigate('SnsConnect')}
              style={({ pressed }) => [styles.linkRow, pressTap(pressed, 'icon')]}
            >
              <BrandMark kind="instagram" />
              <Text style={styles.linkText}>{instagram?.snsAccountName ?? '연동하기'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="유튜브 연동"
              onPress={() => nav.navigate('SnsConnect')}
              style={({ pressed }) => [styles.linkRow, pressTap(pressed, 'icon')]}
            >
              <BrandMark kind="youtube" />
              <Text style={styles.linkText}>{youtube?.snsAccountName ?? '연동하기'}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── ④ 시안: 전체폭 h-9 아웃라인 버튼 ── */}
        <Button
          label="프로필 수정하기"
          variant="secondary"
          onPress={() => nav.navigate('EditProfile')}
          style={styles.editBtn}
        />

        {/* ── ⑤ Professional Insight ── */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="매장 인사이트 분석 보기"
          onPress={() => nav.navigate('Insight')}
          style={({ pressed }) => [styles.insightCta, pressTap(pressed, 'card')]}
        >
          <View style={styles.insightTile}>
            <ChartIcon />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={text.bodyStrong}>Professional Insight</Text>
            <Text style={[text.caption, { color: color.ink[500] }]}>
              우리 동네와 우리 가게를 함께 봅니다
            </Text>
          </View>
          <ChevronRight size={22} strokeWidth={2} color={color.brand[600]} />
        </Pressable>

        {/* 만들던 영상 — 시안엔 없지만 기능이라 유지 */}
        {resume && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              nav.navigate('Create', { screen: 'TaskBoard', params: { projectId: resume.id } })
            }
            style={({ pressed }) => [styles.resume, pressTap(pressed, 'card')]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[text.micro, { color: color.brand[600] }]}>만들던 영상</Text>
              <Text style={text.bodyStrong}>{projectLabel(resume)}</Text>
              <Text style={[text.caption, { color: color.ink[500] }]}>
                멈춘 자리부터 이어서 만들 수 있어요.
              </Text>
            </View>
            <ChevronRight size={20} strokeWidth={2} color={color.ink[300]} />
          </Pressable>
        )}
      </View>

      {/* ── ⑥ 3열 그리드: 시안은 좌우 여백 없이 화면을 꽉 채웁니다 ── */}
      {shorts.isLoading ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} style={styles.cellSkeleton} />
          ))}
        </View>
      ) : items.length > 0 ? (
        <View style={styles.grid}>
          {items.map((v) => (
            <Pressable
              key={v.videoOutputId}
              accessibilityRole="button"
              accessibilityLabel={`${projectLabel(v)} 숏폼 보기`}
              onPress={() => nav.navigate('MyVideo', { videoOutputId: Number(v.videoOutputId) })}
              style={({ pressed }) => [styles.cell, pressed && { opacity: theme.opacity.pressed }]}
            >
              {v.coverImageUrl ? (
                <Image source={{ uri: v.coverImageUrl }} style={styles.cellImage} />
              ) : (
                <View style={[styles.cellImage, styles.cellEmpty]} />
              )}
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyGrid}>
          <Text style={[text.bodySmall, { color: color.ink[500], textAlign: 'center' }]}>
            아직 만든 숏폼이 없습니다.{'\n'}첫 영상을 만들면 여기에 모입니다.
          </Text>
        </View>
      )}

      {/* 진입점 목록 — 시안에 없는 기능. 그리드 아래로 내려 상단 구성을 가리지 않게 */}
      <View style={styles.infoPad}>
        <View style={styles.menu}>
          <MenuRow label="반응 보기" hint="게시한 숏폼 성과" onPress={() => nav.navigate('Performance')} />
          <MenuRow label="가게 정보 관리" hint="메뉴·사진·손님 정보" onPress={() => nav.navigate('StoreOverview')} />
          <MenuRow label="SNS 연동" hint="인스타그램·유튜브 계정" onPress={() => nav.navigate('SnsConnect')} />
          <MenuRow label="플랜 안내" hint="Free · Pro 요금제" onPress={() => nav.navigate('Plans')} />
          <MenuRow label="자주 묻는 질문" onPress={() => nav.navigate('Faq')} />
          <MenuRow label="앱 권한 안내" onPress={() => nav.navigate('PermissionsInfo')} />
          <MenuRow label="설정" onPress={() => nav.navigate('Settings')} />
        </View>
      </View>
    </Screen>
  );
}

function MenuRow({ label, hint, onPress }: { label: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.surface }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={text.body}>{label}</Text>
        {hint ? <Text style={[text.caption, { color: color.ink[400] }]}>{hint}</Text> : null}
      </View>
      <ChevronRight size={20} strokeWidth={2} color={color.ink[300]} />
    </Pressable>
  );
}

const GAP = 2;

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    paddingHorizontal: space[4],
    paddingTop: space[2],
  },
  avatarRing: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
  },
  logo: { width: 92, height: 92, borderRadius: radius.pill, backgroundColor: color.ink[100] },
  logoEmpty: { alignItems: 'center', justifyContent: 'center' },

  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' },
  stat: { alignItems: 'center', gap: 2 },
  // 시안: 통계 숫자 22·bold
  statValue: { ...theme.text.title, fontSize: 22, lineHeight: 28 },
  statLabel: { ...theme.text.caption, color: color.ink[700] },
  statSkeleton: { width: 44, height: 28, borderRadius: radius.xs },

  info: { paddingHorizontal: space[4], paddingTop: space[4], gap: space[2] },
  infoPad: { paddingHorizontal: space[4] },
  links: { gap: space[2] },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  linkRowWide: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  linkText: { ...theme.text.bodySmall, color: color.ink[800] },

  editBtn: { height: 36, marginTop: space[2], borderRadius: radius.sm },

  insightCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginTop: space[2],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.brand[300],
    backgroundColor: color.brand[50],
  },
  insightTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
  },

  /**
   * 시안: 좌우 여백 없이 화면을 꽉 채우고 간격은 2px.
   * 마지막 줄이 3의 배수가 아니어도 빈 칸을 채우지 않습니다.
   */
  /**
   * gap 을 쓰면 33%x3 에 간격이 더해져 폭을 넘겨 2열로 깨집니다.
   * 셀 안쪽 여백으로 간격을 만들어 어떤 화면 폭에서도 3열이 유지되게 합니다.
   */
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space[4] },
  cell: { width: '33.333%', aspectRatio: 3 / 4, padding: GAP / 2 },
  cellImage: { width: '100%', height: '100%', backgroundColor: color.ink[100] },
  cellSkeleton: { width: '32%', aspectRatio: 3 / 4, margin: GAP / 2 },
  cellEmpty: { opacity: 0.6 },
  emptyGrid: { paddingHorizontal: space[4], paddingVertical: space[10] },

  menu: {
    marginTop: space[4],
    backgroundColor: color.paper,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    overflow: 'hidden',
  },
  row: {
    minHeight: sizing.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.ink[200],
  },
});
