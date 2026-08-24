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
import { ChevronRight, Crown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { Banner } from '../../../ui/Feedback';
import { useAppState } from '../../../lib/appState';
import { useStore, useStoreShorts } from '../../../api/queries/store';
import { useProjects } from '../../../api/queries/project';
import theme, { color, space, radius, text, sizing } from '../../../design/theme';
import type { RootStackParamList, MyStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList & MyStackParamList>;

export default function MyPageScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);
  const { data: store } = useStore(storeId ?? undefined);
  const { data: drafts } = useProjects(storeId ?? undefined, 'DRAFT');
  const shorts = useStoreShorts(storeId ?? undefined);
  const items = shorts.data?.items ?? [];
  const resume = drafts?.[0];

  return (
    <Screen edges={['top']}>
      <Text style={text.title}>마이</Text>

      {/* 프로필 — 3.1 + 3.6. 누르면 프로필 수정으로 갑니다 */}
      <Card onPress={() => nav.navigate('EditProfile')}>
        <View style={styles.storeRow}>
          {store?.logoUrl ? (
            <Image source={{ uri: store.logoUrl }} style={styles.logo} />
          ) : (
            <View style={[styles.logo, styles.logoEmpty]}>
              <Text style={[text.caption, { color: color.ink[400] }]}>
                {(store?.name ?? '가게').slice(0, 1)}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, gap: space[1] }}>
            <Text style={text.heading}>{store?.name ?? '우리 가게'}</Text>
            <Text style={[text.bodySmall, { color: color.ink[500] }]}>
              {store?.category ?? ''} {store?.address ? `· ${store.address}` : ''}
            </Text>
          </View>
          {/* 가이드라인 §1.3: 네이버는 전용색이 있습니다 */}
          {store?.infoSource === 'NAVER' && (
            <View style={styles.naverBadge}>
              <Text style={[text.micro, { color: color.paper }]}>네이버 연동</Text>
            </View>
          )}
        </View>
        <View style={styles.linkRow}>
          <Text style={[text.caption, { color: color.brand[600] }]}>프로필 수정하기</Text>
          <ChevronRight size={14} strokeWidth={2} color={color.brand[600]} />
        </View>
      </Card>

      {/* 만들던 영상 이어서 하기 — 기존 홈에서 이사 */}
      {resume && (
        <Card
          onPress={() =>
            nav.navigate('Create', { screen: 'TaskBoard', params: { projectId: resume.id } })
          }
        >
          <Badge label="만들던 영상" tone="brand" />
          <Text style={text.subheading}>{resume.promotionPurpose} 숏폼</Text>
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
                accessibilityLabel={`${v.promotionPurpose} 숏폼 보기`}
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
        <MenuRow label="인사이트" hint="우리 동네·우리 가게 분석" onPress={() => nav.navigate('Insight')} />
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
  logo: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: color.ink[100] },
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
