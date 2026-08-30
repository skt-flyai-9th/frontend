/**
 * MyPageScreen — 마이 탭. **기준 시안 11차** (2026-08-28 갱신).
 *
 * 이식은 시안 2차 기준이었고 버튼 문구만 9차로 고쳐져 있었습니다. 2026-08-28 에
 * 8차(place+ 줄 삭제)와 11차(이어서 하기 카드)를 반영했습니다.
 *
 * 시안 레이아웃 순서를 그대로 따릅니다.
 *   ① 헤더: 가게 이름(중앙 18·bold) + 메뉴 아이콘
 *   ② 아바타 92 + 링 · 오른쪽에 Videos / Views 통계
 *   ③ 카테고리 · 인스타그램 · 유튜브 (place+ 는 8차에서 빠졌습니다)
 *   ④ "매장 정보 수정" 전체폭 아웃라인 버튼 (시안 9차 문구)
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
import { View, Text, Image, Linking, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, Menu, PencilLine, UserRound } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { MyShortCell } from '../components/MyShortCell';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { BrandMark } from '../../../ui/BrandMark';
import { CoachTarget } from '../../../ui/coach/CoachContext';
import { Skeleton } from '../../../ui/Feedback';
import { pressTap } from '../../../ui/press';
import { useAppState } from '../../../lib/appState';
import { useStore, useStoreShorts } from '../../../api/queries/store';
import { useProjects } from '../../../api/queries/project';
import { useTasks } from '../../../api/queries/shoot';
import { useSnsConnections } from '../../../api/queries/edit';
import type { SnsConnection } from '../../../api/schema/types';
import { useInsightMetrics } from '../../../api/queries/insightMetrics';
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

/**
 * 연동한 SNS 줄에 **무엇을 찍고, 누르면 어디로 보낼지** 정합니다.
 *
 * 🔴 **서버가 계정 이름 자리에 내부 id 를 보냅니다** (2026-08-28 사장님 지적 · BE §2-6).
 *    16.1 의 `sns_account_name` 은 이름이 name 이지만 실제로는 `17841…` 같은 숫자가
 *    옵니다. 그걸 그대로 찍고 있어서 마이페이지에 뜻 모를 숫자가 떠 있었습니다.
 *
 * 명세에 핸들도 프로필 주소도 없어서(계정을 가리키는 필드가 이것 하나뿐입니다)
 * **앱이 이름을 만들어 낼 방법은 없습니다.** 그래서 값의 **모양을 보고** 가릅니다.
 *
 *   숫자만          → id. 숫자 대신 "연동됨"
 *   UC + 22글자     → 유튜브 채널 id. 이름은 몰라도 **주소는 확실합니다**
 *   @로 시작        → 핸들. 그대로 찍고 주소도 만듭니다
 *   그 밖의 글자    → 사람이 읽는 이름
 *
 * **연동돼 있으면 눌렀을 때 언제나 그 소셜로 보냅니다** (2026-08-28 사장님 지시).
 * 계정 주소를 정확히 못 만드는 경우에는 그 플랫폼의 **내 계정 화면**을 엽니다 —
 * 폰에 이미 로그인돼 있으니 거기서 자기 계정입니다. 앱이 깔려 있으면 https 주소가
 * 네이티브 앱으로 열립니다.
 *
 * ⚠️ **유튜브 채널명으로는 주소를 만들지 않습니다.** 채널명("동그리오")과
 *    핸들(`@dongguri0`)이 다를 수 있어, 채널명을 `youtube.com/@…` 에 끼우면
 *    **엉뚱한 남의 채널로 보냅니다.** 그때는 내 계정 화면으로 보냅니다.
 *
 * BE 가 §2-6 대로 이름을 채워 주면 **이 함수를 고치지 않아도** 이름이 뜨고
 * 정확한 계정 주소로 넘어갑니다.
 */
/**
 * 계정 주소를 정확히 만들 수 없을 때 열어 줄 곳.
 *
 * ⚠️ **앱이 열 줄 아는 주소여야 합니다.** 처음에는 유튜브 "나" 탭인
 *    `youtube.com/feed/you` 를 넣었는데, **유튜브 앱이 이 경로를 못 열어 자기
 *    400 오류 화면을 띄웠습니다**(2026-08-28 실기기 확인). 앱은 자기가 아는 주소만
 *    받아 주므로 **홈**으로 둡니다 — 로그인돼 있으니 거기가 사장님 계정이고,
 *    프로필은 한 번 더 누르면 됩니다.
 */
const SNS_HOME = {
  INSTAGRAM: 'https://www.instagram.com/',
  YOUTUBE: 'https://www.youtube.com/',
} as const;

function snsLink(
  platform: 'INSTAGRAM' | 'YOUTUBE',
  conn?: SnsConnection
): { label: string; url: string | null } {
  /*
    🔴 **연동 여부는 목록에 있느냐로만 판단합니다** (2026-08-28).

    처음에는 계정 이름이 있느냐로 갈랐습니다. 그런데 서버가 유튜브를 **이름 없이**
    저장하는 경우가 있어(연동 직후 브라우저에 500 이 뜬 그 건), 연동이 됐는데도
    이 줄만 "연동하기" 로 보였습니다. 매장정보 수정 화면은 목록에 있는지로 보니
    같은 계정을 두고 **두 화면이 서로 다른 말**을 했습니다.

    이름은 **찍을 때만** 씁니다. 있고 없고가 연동 여부를 바꾸지 않습니다.
  */
  if (!conn) return { label: '연동하기', url: null };

  const home = SNS_HOME[platform];
  const v = conn.snsAccountName?.trim();

  // 연동은 됐는데 이름이 비어 있습니다 — 그래도 연동은 연동입니다.
  if (!v) return { label: '연동됨', url: home };

  // 숫자만 오면 내부 id 입니다 — 사장님에게 아무 뜻이 없습니다.
  if (/^\d+$/.test(v)) return { label: '연동됨', url: home };

  const handle = v.replace(/^@/, '');

  if (platform === 'INSTAGRAM') {
    /*
      `@` 없이 아이디만 찍습니다 — 2026-08-30 지시 ⑦ 의 예시가 `yeoljeong_coffee`
      입니다. 주소에는 원래 `@` 가 없으니 그대로 씁니다.
    */
    return { label: handle, url: `https://www.instagram.com/${handle}/` };
  }

  // 유튜브 채널 id 는 UC 로 시작하는 24글자입니다.
  if (/^UC[\w-]{22}$/.test(v)) {
    return { label: '연동됨', url: `https://www.youtube.com/channel/${v}` };
  }
  if (v.startsWith('@')) return { label: v, url: `https://www.youtube.com/${v}` };
  // 채널명으로 보입니다 — 주소를 지어내지 않고 내 계정 화면으로 보냅니다(위 ⚠️).
  return { label: v, url: home };
}

/**
 * 소셜을 엽니다. 주소가 없으면(연동 전) 연동 화면으로 보냅니다.
 *
 * 열기가 실패해도 **아무 일 없던 것처럼 두지 않습니다** — 브라우저가 없거나 주소를
 * 받을 앱이 없는 드문 경우에, 눌러도 반응이 없으면 고장으로 보입니다. 그때는
 * 연동 화면으로 보내 사장님이 뭐라도 할 수 있게 합니다.
 */
function openSns(url: string | null, fallback: () => void) {
  if (!url) {
    fallback();
    return;
  }
  Linking.openURL(url).catch(() => fallback());
}

export default function MyPageScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);
  const { data: store } = useStore(storeId ?? undefined);
  const { data: drafts } = useProjects(storeId ?? undefined, 'DRAFT');
  const shorts = useStoreShorts(storeId ?? undefined);
  /** 탭을 옮기면 재생을 세웁니다 — 안 보이는 영상이 배터리를 먹지 않게. */
  const isFocused = useIsFocused();
  const { data: connections } = useSnsConnections();
  const metrics = useInsightMetrics(storeId ?? undefined);

  /*
   * 시안 문구: "최근 1주일 동안 1,500번 조회되었어요".
   *
   * 2026-08-28: 17.3 주간 요약이 생겨 **실제 값**으로 채웁니다(옛 주석은 "집계 API 가
   * 없어 mock 에서만 온다" 였습니다). 플랫폼이 여럿이라 **전부 더합니다** — 사장님이
   * 궁금한 건 "내 영상이 이번 주에 몇 번 보였나" 지 플랫폼별 분해가 아닙니다.
   * 아직 아무것도 안 올렸으면 합이 0 이라, 0 은 값 없음과 구분해 그대로 씁니다.
   */
  const weekTotal =
    metrics.data && metrics.data.length > 0
      ? metrics.data.reduce((sum, p) => sum + p.week.reduce((a, d) => a + d.value, 0), 0)
      : null;

  const items = shorts.data?.items ?? [];
  /**
   * 🔴 **이미 완성된 프로젝트를 "만들던 영상" 으로 내밀지 않습니다** (2026-08-28).
   *
   * 4.3 목록의 `shortsStatus` 는 렌더가 끝나도 `DRAFT` 로 남습니다(서버가
   * `COMPLETED` 로 바꿔 주지 않고, 앱도 바꾸라고 하지 않습니다). 그래서 편집까지
   * 끝난 프로젝트가 계속 이 카드에 떴고, 누르면 촬영 화면이 **"이미 다 찍었어요"**
   * 로 막혀 새 영상을 못 찍는다는 보고가 있었습니다.
   *
   * 15.2 완성 목록(`useStoreShorts`)이 프로젝트 id 를 함께 주므로, **완성본이 있는
   * 프로젝트는 빼고** 고릅니다 — 서버 상태를 고쳐 쓰는 게 아니라 있는 값으로
   * 가려내는 것입니다.
   */
  const finished = new Set(items.map((v) => Number(v.shortsProjectId)));
  const resume = drafts?.find((d) => !finished.has(Number(d.id)));

  /**
   * 어디로 이어갈지 — **촬영 목록을 보고 정합니다.**
   *
   * "직전 촬영 지점에서 이어간다" 는 카메라 화면이 이미 하고 있습니다.
   * `taskId` 를 안 넘기면 **아직 안 찍은 첫 컷**부터 엽니다(`CameraScreen` 참고).
   * 그래서 서버에 따로 물을 값이 없습니다 — 9.3 `current_step` 은 앱이 한 번도
   * 저장한 적이 없어 믿을 수 없고, 여기서는 필요하지도 않습니다.
   *
   * 다만 **다 찍은 프로젝트**는 카메라로 보내면 찍을 게 없습니다. 그때는 편집으로
   * 보냅니다. 컷이 아예 없는(기획 전) 프로젝트는 보낼 곳이 없어 카드를 띄우지 않습니다.
   */
  const resumeBoard = useTasks(resume?.id);
  const resumeTasks = resumeBoard.data?.tasks ?? [];
  const resumeAllShot =
    resumeTasks.length > 0 &&
    resumeTasks.every((t) => t.taskStatus === 'DONE' || t.taskStatus === 'RETAKE_NEEDED');
  const resumeLabel = resumeAllShot ? '이어서 편집하기' : '이어서 촬영하기';
  const instagram = connections?.find((c) => c.snsPlatform === 'INSTAGRAM');
  const youtube = connections?.find((c) => c.snsPlatform === 'YOUTUBE');

  const instagramLink = snsLink('INSTAGRAM', instagram);
  const youtubeLink = snsLink('YOUTUBE', youtube);

  /*
   * ⚠️ `Screen` 기본 scrollContent 는 paddingTop 16 · gap 16 입니다.
   *    여기서 끄지 않으면 앱바 아래 8(시안 pt-2) 대신 24 가 들어가고,
   *    프로필 블록과 정보 블록 사이에 16 이 더 붙어 카테고리 줄부터 아래가
   *    통째로 24pt 내려갑니다(캡처 실측). 여백은 각 블록이 직접 잡습니다.
   */
  return (
    /* 시안: 헤더 아래 pt-2(8). Screen 기본값 16 이면 화면 전체가 8 내려갑니다. */
    <Screen edges={['top']} padded={false} contentStyle={{ paddingTop: 0, gap: 0 }}>
      {/*
        시안: 가운데에 가게 이름, 오른쪽에 메뉴 하나뿐입니다.
        home 배치를 쓰면 알림 벨과 로고가 함께 붙어 시안과 달라집니다.
      */}
      <AppBar
        title={store?.name ?? '우리 가게'}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="설정"
            hitSlop={8}
            onPress={() => nav.navigate('Settings')}
            style={({ pressed }) => [styles.menuBtn, pressTap(pressed, 'icon')]}
          >
            <Menu size={22} strokeWidth={2} color={color.ink[900]} />
          </Pressable>
        }
      />

      {/* ── ② 아바타 + 통계 ── */}
      <View style={styles.profile}>
        <View style={styles.avatarRing}>
          {store?.logoUrl ? (
            <Image source={{ uri: store.logoUrl }} style={styles.logo} />
          ) : (
            /*
              🔴 **가게 이름 첫 글자 대신 사람 그림**입니다 (2026-08-30 지시 ⑥:
                 "기본 프로필 UI 수정 예시 참고해주세요").

              예전에는 "오" 처럼 **한 글자**만 크게 떠 있어서, 로고를 아직 안 올린
              가게에서는 그게 무엇인지 알 수 없었습니다. 시안 최최종이 기본 프로필
              그림(`profile-default.svg`)을 새로 넣은 것도 같은 이유입니다.
            */
            <View style={[styles.logo, styles.logoEmpty]}>
              <UserRound
                size={46}
                strokeWidth={0}
                fill={color.ink[300]}
                color={color.ink[300]}
              />
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

        {/*
          시안 8차에서 place+ "네이버 스마트 플레이스" 줄이 빠졌습니다.
          11차 원문에도 `PlaceMark` 는 정의만 남고 어느 화면에서도 쓰이지 않습니다 —
          실수로 누락된 게 아니라 화면에서 내린 것입니다.
          이 한 줄이 약 24pt(행 18 + 줄간격 6)라, 그동안 매장 정보 수정 버튼·
          인사이트 카드·3열 그리드가 통째로 그만큼 내려와 있었습니다.
        */}
        <View style={styles.links}>
          <View style={styles.linkRowWide}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                instagramLink.url ? '인스타그램 계정 열기' : '인스타그램 연동'
              }
              onPress={() =>
                openSns(instagramLink.url, () =>
                  nav.navigate('EditProfile', { connect: 'INSTAGRAM' })
                )
              }
              style={({ pressed }) => [styles.linkRow, pressTap(pressed, 'icon')]}
            >
              <BrandMark kind="instagram" />
              <Text style={styles.linkText}>{instagramLink.label}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={youtubeLink.url ? '유튜브 채널 열기' : '유튜브 연동'}
              onPress={() =>
                openSns(youtubeLink.url, () => nav.navigate('EditProfile', { connect: 'YOUTUBE' }))
              }
              style={({ pressed }) => [styles.linkRow, pressTap(pressed, 'icon')]}
            >
              <BrandMark kind="youtube" />
              <Text style={styles.linkText}>{youtubeLink.label}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── ④ 시안: 전체폭 h-9 아웃라인 버튼 ── */}
        <Button
          label="매장 정보 수정"
          variant="secondary"
          onPress={() => nav.navigate('EditProfile')}
          style={styles.editBtn}
        />

        {/* ── ⑤ Professional Insight ── (코치마크 7단계가 짚는 곳 — 시안 data-coach="insight") */}
        {/*
          ⚠️ 위 여백은 **감싼 상자가** 가집니다.
             카드에 `marginTop` 을 두면 감싼 상자가 그 여백까지 품어서, 코치마크가
             잰 자리가 카드보다 8 위·8 크게 나옵니다(2026-08-29 실측: 구멍 y=327
             h=94 · 카드 y=341 h=74). 여백을 바깥으로 옮겨 두 상자를 일치시킵니다.
        */}
        <CoachTarget name="insight" style={styles.insightWrap}>
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
            <Text style={styles.insightTitle}>Professional Insight</Text>
            <Text style={styles.insightDesc}>
              {weekTotal != null ? (
                <>
                  최근 1주일 동안 <Text style={styles.viewCount}>{weekTotal.toLocaleString()}번</Text>{' '}
                  조회되었어요
                </>
              ) : (
                // 계정 단위 집계 API 가 없으면 숫자를 지어내지 않습니다.
                '조회수 집계는 준비 중입니다'
              )}
            </Text>
          </View>
          <ChevronRight size={22} strokeWidth={2} color={color.brand[600]} />
        </Pressable>
        </CoachTarget>

        {/*
          이어서 하기 — 시안 11차 `editDraft` 카드 (2026-08-28 반영).

          아이콘은 시안의 sparkles 대신 **연필**(`PencilLine`)입니다. 타일·크기·간격은
          바로 위 인사이트 카드와 같은 규격으로 맞췄습니다 — 40 / radius 12 / 아이콘 20 /
          gap 12 / chevron 22. 카드 배경만 흰색으로 두어 인사이트 CTA 가 계속 주역입니다
          (시안도 `bg-panel` 입니다).

          🔴 **문구는 실제로 가는 곳을 말합니다.** 시안은 늘 "이어서 편집하기" 지만,
             아직 안 찍은 컷이 남아 있으면 카메라로 가는데 "편집" 이라고 하면 거짓입니다
             (CLAUDE.md §2). 남은 컷이 있으면 "이어서 촬영하기" 로, 다 찍었으면
             "이어서 편집하기" 로 적고 그대로 보냅니다.
        */}
        {resume && resumeTasks.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${projectLabel(resume)} ${resumeLabel}`}
            onPress={() =>
              resumeAllShot
                ? nav.navigate('Create', { screen: 'Render', params: { projectId: resume.id } })
                : nav.navigate('Create', { screen: 'Camera', params: { projectId: resume.id } })
            }
            style={({ pressed }) => [styles.resume, pressTap(pressed, 'card')]}
          >
            <View style={styles.resumeTile}>
              <PencilLine size={20} strokeWidth={2} color={color.brand[600]} />
            </View>
            <Text style={styles.resumeText}>{resumeLabel}</Text>
            <ChevronRight size={22} strokeWidth={2} color={color.ink[400]} />
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
          {items.map((v, i) => (
            <MyShortCell
              key={String(v.videoOutputId)}
              short={v}
              /*
                앞쪽 칸만 재생합니다. 스무 편이면 스무 개를 동시에 여는 셈이라
                기기가 버티지 못합니다 (MyShortCell 머리말 ③).
                AUTOPLAY_CELLS 는 두 줄 — 스크롤 없이 보이는 만큼입니다.
              */
              autoplay={i < AUTOPLAY_CELLS}
              focused={isFocused}
              label={`${projectLabel(v)} 숏폼 보기`}
              onPress={() => nav.navigate('MyVideo', { videoOutputId: Number(v.videoOutputId) })}
              style={styles.cell}
              imageStyle={styles.cellImage}
              emptyStyle={styles.cellEmpty}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyGrid}>
          <Text style={[text.bodySmall, { color: color.ink[500], textAlign: 'center' }]}>
            아직 만든 숏폼이 없습니다.{'\n'}첫 영상을 만들면 여기에 모입니다.
          </Text>
        </View>
      )}

    </Screen>
  );
}


/**
 * 자동재생할 칸 수. 3열이라 두 줄 = 6칸이고, 스크롤 없이 보이는 만큼입니다.
 * 더 늘리면 안 보이는 영상까지 배터리를 먹습니다.
 */
const AUTOPLAY_CELLS = 6;

const GAP = 2;

const styles = StyleSheet.create({
  // 시안 HeaderIconBtn — 36 원형
  // 시안: 수치만 verified 초록 semibold
  viewCount: {
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.done[500],
  },
  menuBtn: {
    width: 36,
    height: 36,
    marginRight: -6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  /*
   * 시안: 숫자 22·bold · 라벨 13 — 둘 다 `leading-*` 이 없어 1.5 가 걸립니다
   * (22 → 33, 13 → 19.5). 토큰(28/19)을 쓰면 숫자 줄이 5pt 짧습니다.
   */
  statValue: { ...theme.text.title, fontSize: 22, lineHeight: 33 },
  statLabel: { ...theme.text.caption, lineHeight: 19.5, color: color.ink[700] },
  statSkeleton: { width: 44, height: 28, borderRadius: radius.xs },

  info: { paddingHorizontal: space[4], paddingTop: space[4], gap: space[2] },
  infoPad: { paddingHorizontal: space[4] },
  // 시안: gap-1.5(6) — 8 이 아닙니다
  links: { gap: 6 },
  // 시안: 링크 안쪽 gap-1.5(6) — 8 이 아닙니다
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkRowWide: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  linkText: { ...theme.text.bodySmall, color: color.ink[800] },

  editBtn: { height: 36, marginTop: space[2], borderRadius: radius.sm },

  /* 인사이트 카드의 위 여백 — 카드가 아니라 여기가 가집니다(JSX 주석 참고). */
  insightWrap: { marginTop: space[2] },
  insightCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    // 시안: px-4 py-3.5 — 세로는 14 입니다
    paddingHorizontal: space[4],
    paddingVertical: space['3.5'],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.brand[300],
    backgroundColor: color.brand[50],
  },
  // 시안 15/13 은 leading 이 없어 1.5 가 걸립니다
  insightTitle: { ...theme.text.bodyStrong, lineHeight: 22.5 },
  insightDesc: { ...theme.text.caption, lineHeight: 19.5, color: color.ink[500] },
  insightTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /*
   * 시안 11차 `editDraft` 카드 — mt-2.5(10) · px-4 py-3.5 · rounded-2xl · bg-panel.
   * info 의 gap 이 8 이라 2 만 더해 10 을 만듭니다(위 editBtn·insightCta 와 같은 방식).
   */
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginTop: 2,
    paddingHorizontal: space[4],
    paddingVertical: space['3.5'],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
  },
  // 바로 위 인사이트 카드의 타일과 **같은 규격** — 40 · radius 12 · 아이콘 20
  resumeTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.brand[50],
  },
  // 시안: 15 semibold ink · leading 없어 ×1.5
  resumeText: { ...theme.text.bodyStrong, lineHeight: 22.5, flex: 1 },

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
