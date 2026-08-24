/**
 * MyPageScreen — 마이 탭. 프로토타입 `04_마이페이지.png`.
 *
 * 담는 것 (인수인계 §2·§6.4)
 *   - 가게 요약 (3.1) + 네이버 스마트플레이스 연동 표시
 *   - "만들던 영상 이어서 하기" — 기존 홈에서 옮겨온 것
 *   - 가게 관리·인사이트·반응 보기·설정·FAQ·권한 안내 진입점
 *
 *   - 완성 숏폼 3열 그리드 (15.2, 2026-08-23 신설) — 썸네일을 누르면 전체화면 뷰어
 *
 * 안 담는 것
 *   - 누적 조회수 — 17.1 은 게시물(postId) 단위라 계정 합산 API 가 없습니다.
 *     가짜 숫자를 만들지 않습니다 (N/A 원칙).
 *   - 사용량 표시("이번 달 3/3") — 플랜·사용량 API 가 없습니다.
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
import { pressTap } from '../../../ui/press';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner } from '../../../ui/Feedback';
import { useAppState } from '../../../lib/appState';
import { useStore, useStoreShorts } from '../../../api/queries/store';
import { useProjects } from '../../../api/queries/project';
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

export default function MyPageScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);
  const { data: store } = useStore(storeId ?? undefined);
  const { data: drafts } = useProjects(storeId ?? undefined, 'DRAFT');
  const shorts = useStoreShorts(storeId ?? undefined);
  const items = shorts.data?.items ?? [];
  const resume = drafts?.[0];

  return (
    <Screen edges={['top']} padded={false} contentStyle={{ paddingHorizontal: space[4] }}>
      {/*
        시안 MyPage 헤더 — 타이틀이 "마이" 가 아니라 **가게 이름**이고,
        우측 메뉴 아이콘이 설정으로 갑니다.
      */}
      <AppBar
        title={store?.name ?? '우리 가게'}
        home={{ onMenu: () => nav.navigate('Settings') }}
      />

      {/*
        프로필 — 3.1 + 3.6.
        시안은 카드가 아니라 화면에 직접 얹힌 블록입니다(아바타 92 + 링 1px).

        ⚠️ 시안의 Videos / Views 숫자는 넣지 않았습니다.
           17.1 은 게시물 단위라 계정 합산 API 가 없습니다. 없는 숫자를 만들면
           사장님이 그 값을 믿고 판단합니다 (N/A 원칙).
      */}
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

        <View style={styles.profileBody}>
          <Text style={[text.bodySmall, { color: color.ink[500] }]}>{store?.category ?? ''}</Text>
          {store?.address ? (
            <Text style={[text.caption, { color: color.ink[500] }]} numberOfLines={2}>
              {store.address}
            </Text>
          ) : null}
          {/* 가이드라인 §1.3: 네이버는 전용색이 있습니다 */}
          {store?.infoSource === 'NAVER' && (
            <View style={styles.naverBadge}>
              <Text style={[text.micro, { color: color.paper }]}>네이버 스마트 플레이스</Text>
            </View>
          )}
        </View>
      </View>

      {/* 시안: 프로필 아래 가로 꽉 찬 h-9 아웃라인 버튼 */}
      <Button
        label="프로필 수정하기"
        variant="secondary"
        onPress={() => nav.navigate('EditProfile')}
        style={styles.editBtn}
      />

      {/* 시안 Professional Insight CTA — brand-tint 카드 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="인사이트 보기"
        onPress={() => nav.navigate('Insight')}
        style={({ pressed }) => [styles.insightCta, pressTap(pressed, 'card')]}
      >
        <View style={styles.insightTile}>
          <ChartIcon />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={text.bodyStrong}>매장 인사이트 분석</Text>
          <Text style={[text.caption, { color: color.ink[500] }]}>
            우리 동네와 우리 가게를 함께 봅니다.
          </Text>
        </View>
        <ChevronRight size={22} strokeWidth={2} color={color.brand[600]} />
      </Pressable>

      {/* 만들던 영상 이어서 하기 — 기존 홈에서 이사 */}
      {resume && (
        <Card
          onPress={() =>
            nav.navigate('Create', { screen: 'TaskBoard', params: { projectId: resume.id } })
          }
        >
          <Badge label="만들던 영상" tone="brand" />
          <Text style={text.subheading}>{projectLabel(resume)}</Text>
          <Text style={[text.bodySmall, { color: color.ink[500] }]}>
            멈춘 자리부터 이어서 만들 수 있어요.
          </Text>
        </Card>
      )}

      {/*
        사장님이 만든 숏폼 — 15.2 3열 그리드.
        인스타 프로필과 같은 구조라, 썸네일을 누르면 전체화면 뷰어가 열립니다.
        그리드에는 커버만 씁니다(조회수·날짜는 여기서 안 보여줍니다).
      */}
      <View style={{ gap: space[3] }}>
        <Text style={text.subheading}>사장님이 만든 숏폼</Text>

        {shorts.isLoading && <Text style={text.bodySmall}>불러오는 중…</Text>}

        {!shorts.isLoading && items.length === 0 && (
          <Banner
            tone="info"
            title="아직 만든 숏폼이 없습니다"
            description="첫 영상을 만들면 여기에 모입니다."
          />
        )}

        {items.length > 0 && (
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
        )}
      </View>

      {/* 진입점 목록 */}
      <View style={styles.menu}>
        <MenuRow label="반응 보기" hint="게시한 숏폼 성과" onPress={() => nav.navigate('Performance')} />
        <MenuRow label="가게 정보 관리" hint="메뉴·사진·손님 정보" onPress={() => nav.navigate('StoreOverview')} />
        <MenuRow label="SNS 연동" hint="인스타그램·유튜브 계정" onPress={() => nav.navigate('SnsConnect')} />
        <MenuRow
          label="플랜 안내"
          hint="Free · Pro 요금제"
          onPress={() => nav.navigate('Plans')}
        />
        <MenuRow label="자주 묻는 질문" onPress={() => nav.navigate('Faq')} />
        <MenuRow label="앱 권한 안내" onPress={() => nav.navigate('PermissionsInfo')} />
        <MenuRow label="설정" onPress={() => nav.navigate('Settings')} />
      </View>
    </Screen>
  );
}

function MenuRow({ label, hint, onPress }: { label: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, // canvas 는 흰색이라 누름이 안 보입니다. 섹션용 surface 를 씁니다.
        pressed && { backgroundColor: color.surface }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={text.body}>{label}</Text>
        {hint ? <Text style={[text.caption, { color: color.ink[400] }]}>{hint}</Text> : null}
      </View>
      <ChevronRight size={20} strokeWidth={2} color={color.ink[300]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 시안: 아바타 92 + 3px 안쪽 여백 + hairline 링
  avatarRing: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
  },
  logo: { width: 92, height: 92, borderRadius: radius.pill, backgroundColor: color.ink[100] },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space[6], paddingTop: space[2] },
  profileBody: { flex: 1, gap: space[1], alignItems: 'flex-start' },
  editBtn: { height: 36 },
  insightCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
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
  logoEmpty: { alignItems: 'center', justifyContent: 'center' },
  /**
   * 3열 그리드. 시안 실측: gap 2px, 비율 3:4 (9:16 아님).
   * 마지막 줄이 3의 배수가 아니어도 빈 칸을 채우지 않습니다 — 흰 여백 그대로 둡니다.
   */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  cell: { width: '32.8%', aspectRatio: 3 / 4 },
  cellImage: { width: '100%', height: '100%', backgroundColor: color.ink[100] },
  cellEmpty: { opacity: 0.6 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  naverBadge: {
    backgroundColor: color.naver,
    borderRadius: radius.pill,
    paddingHorizontal: space[2],
    paddingVertical: 3,
  },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  menu: {
    backgroundColor: color.paper,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    overflow: 'hidden',
    ...theme.elevation('card'),
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
