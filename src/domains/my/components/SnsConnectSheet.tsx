/**
 * SnsConnectSheet — SNS 계정 연동 바텀시트.
 *
 * 🔴 **두 화면이 같이 씁니다** (2026-08-31 지시: "마이페이지에 연동하기 누르면
 *    설정 속으로 들어가게 되어 있는데, 그러지 말고 하단에 뜨는 화면을 연동하기
 *    버튼 누르면 그 화면에서 바로 뜨게 해 주고 다른 데 누르면 사라지는 식으로").
 *
 * 예전에는 이 시트가 `EditProfileScreen`(매장 정보 수정) 안에만 있었습니다. 그래서
 * 마이페이지에서 "연동하기" 를 누르면 **화면을 통째로 갈아타고** 나서야 시트가
 * 떴습니다. 할 일은 시트 하나인데 사장님을 다른 화면으로 데려간 셈입니다.
 *
 * 이제 시트만 떼어 두 화면이 각자 자리에서 띄웁니다. **바깥을 누르면 닫힙니다**
 * (동의 단계에서만 — 연결 중에 닫으면 브라우저에서 돌아왔을 때 결과를 못 받습니다).
 *
 * 이 파일이 통째로 들고 있는 것
 *   ① 플랫폼 목록 `SNS_PLATFORMS` — 연동은 인스타·유튜브 둘뿐입니다(명세 16.1)
 *   ② 동의 → 브라우저 → 복귀 판정까지의 상태
 *   ③ 연동이 안 된 채 돌아왔을 때의 얼럿
 */
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CircleAlert, ShieldCheck } from 'lucide-react-native';

import { Banner, Spinner } from '../../../ui/Feedback';
import { pressTap } from '../../../ui/press';
import { useSnsAuthorize, useSnsConnections } from '../../../api/queries/edit';
import type { SnsPlatform } from '../../../api/schema/types';
import theme, { color, radius, space, text } from '../../../design/theme';

/**
 * 연동 가능한 플랫폼.
 *
 * ⚠️ **연동(16.1)은 둘뿐입니다.** 게시(16.2)는 네이버 클립·틱톡까지 되지만 그건
 *    다른 목록입니다 — 여기에 넣으면 연동할 수 없는 것을 연동하라고 하게 됩니다
 *    (`BE_전달사항.md` §6-1).
 */
export const SNS_PLATFORMS = [
  {
    key: 'INSTAGRAM' as const,
    label: 'Instagram',
    mark: 'instagram' as const,
    scope: '프로필 정보 · 게시물 성과(조회수·저장수) 읽기',
    requires: '비즈니스 또는 크리에이터 계정이어야 하고, 페이스북 페이지가 연결돼 있어야 해요.',
  },
  {
    key: 'YOUTUBE' as const,
    label: 'YouTube',
    mark: 'youtube' as const,
    scope: '채널 정보 · 영상 성과(조회수·시청 시간) 읽기',
    requires: null,
  },
];

export type SnsPlatformMeta = (typeof SNS_PLATFORMS)[number];

/** 이름으로 플랫폼을 찾습니다. 라우트 파라미터로 넘어온 값을 풀 때 씁니다. */
export const findSnsPlatform = (key?: string | null) =>
  SNS_PLATFORMS.find((p) => p.key === key) ?? null;

export function SnsConnectSheet({
  open,
  onClose,
}: {
  /** 열 플랫폼. `null` 이면 닫힘. */
  open: SnsPlatformMeta | null;
  /** 시트가 닫혔을 때 — 부모의 상태도 같이 비우라고 알립니다. */
  onClose: () => void;
}) {
  const connectionsQuery = useSnsConnections();
  const authorize = useSnsAuthorize();

  /**
   * 실제로 그리는 플랫폼. 부모가 준 `open` 을 그대로 쓰지 않고 한 번 받아 두는
   * 이유는 **"다시 시도"** 때문입니다 — 실패 얼럿에서 다시 시도하면 부모를
   * 거치지 않고 여기서 바로 시트를 다시 엽니다.
   */
  const [active, setActive] = useState<SnsPlatformMeta | null>(null);
  /** 시안의 connectState — 'consent'(동의) / 'loading'(연결 중) */
  const [phase, setPhase] = useState<'consent' | 'loading'>('consent');
  /** 브라우저로 정말 나갔다 왔는지. 이게 없이는 첫 'active' 를 복귀로 오인합니다. */
  const leftApp = useRef(false);
  /** 나가기 직전의 연동 개수. 돌아와서 늘었는지로 성공을 판단합니다. */
  const beforeCount = useRef(0);
  /**
   * 돌아왔는데 연동이 안 됐을 때 띄우는 **얼럿**. 플랫폼 자체를 들고 있습니다 —
   * "다시 시도" 가 같은 플랫폼으로 시트를 다시 열어야 하기 때문입니다.
   *
   * 시안 8차에서 화면 안쪽 배너 → **정중앙 얼럿**으로 바뀌었습니다. 배너는 목록
   * 위에 조용히 얹혀서, 브라우저에서 돌아온 사장님이 못 보고 지나칩니다.
   */
  const [failed, setFailed] = useState<SnsPlatformMeta | null>(null);

  useEffect(() => {
    if (!open) return;
    setActive(open);
    setPhase('consent');
  }, [open]);

  const close = () => {
    setActive(null);
    setPhase('consent');
    leftApp.current = false;
    authorize.reset();
    onClose();
  };

  /** 얼럿의 "다시 시도" — 같은 플랫폼으로 동의 시트를 다시 엽니다 (시안 `retry`). */
  const retry = () => {
    const p = failed;
    setFailed(null);
    if (!p) return;
    setActive(p);
    setPhase('consent');
  };

  /**
   * 16.1 A방식 — 앱이 하는 일은 두 가지뿐입니다 (api/queries/edit.ts 머리말).
   *   ① authorize_url 을 받아 브라우저로 연다
   *   ② 브라우저에서 돌아오면 목록을 다시 조회해 결과를 확인한다
   */
  const start = (p: SnsPlatformMeta) => {
    setPhase('loading');
    setFailed(null);
    beforeCount.current = (connectionsQuery.data ?? []).filter(
      (c) => c.snsPlatform === p.key
    ).length;
    authorize.mutate(p.key as SnsPlatform, {
      onSuccess: ({ authorizeUrl }) => {
        Linking.openURL(authorizeUrl).catch(() => setPhase('consent'));
      },
      // 발급 자체가 실패할 수 있습니다 (BE Q6-b). 동의 화면으로 돌려 이유를 보여 줍니다.
      onError: () => setPhase('consent'),
    });
  };

  /*
   * ② 복귀 감지. 동의하지 않고 그냥 닫고 와도 똑같이 복귀로 잡히므로,
   *    목록을 다시 받아 **개수가 늘었는지**로만 판단합니다.
   *
   *    늘지 않았을 때 "거절하셨습니다" 라고 쓰지 않습니다. 창을 닫으신 건지,
   *    서버 콜백이 늦은 건지 우리는 알 수 없습니다. 아는 사실 하나 —
   *    아직 연동되지 않았다 — 만 말합니다.
   */
  useEffect(() => {
    if (!active || phase !== 'loading') return;
    const platform = active;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        leftApp.current = true;
        return;
      }
      if (!leftApp.current) return;
      close();
      void connectionsQuery.refetch().then((res) => {
        const after = (res.data ?? []).filter((c) => c.snsPlatform === platform.key).length;
        // 늘었으면 목록에 계정이 뜹니다 — 그게 곧 안내라 따로 말하지 않습니다.
        if (after <= beforeCount.current) setFailed(platform);
      });
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, phase]);

  return (
    <>
      {/*
        시안 연동 바텀시트.
        본문이 스크롤 영역인 화면들이라 absolute 로는 같이 스크롤됩니다.
        화면 전체(앱바 포함)를 덮어야 해서 Modal 로 올립니다.
      */}
      <Modal
        visible={!!active}
        transparent
        animationType="fade"
        // 안드로이드 뒤로가기. 시안에는 없지만 연결 중에 갇히지 않을 유일한 출구입니다.
        onRequestClose={close}
      >
        {active && (
          <View style={styles.sheetScrim}>
            {/* 시안: 동의 단계에서만 바깥을 눌러 닫을 수 있습니다 */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              style={styles.scrimTouch}
              onPress={phase === 'consent' ? close : undefined}
            />

            {/* 시안: rounded-t-[28px] · px-6 · pt-5 · pb-8 */}
            <View style={styles.sheet}>
              {/* 시안: mx-auto mb-5 h-1 w-10 rounded-full bg-hairline */}
              <View style={styles.grip} />

              {phase === 'consent' ? (
                <View style={styles.consent}>
                  {/*
                    시안 8차에서 **제목 위 브랜드 마크(30)가 빠졌습니다.**
                    버튼 안 마크(12)도 함께 빠지고 버튼색이 플랫폼색에서 브랜드색으로
                    바뀌었습니다 — 어느 플랫폼이든 같은 모양이 됩니다.
                  */}
                  <Text style={styles.connectTitle}>{active.label} 계정으로 연동</Text>
                  {/* 시안: mt-1.5 13 slate */}
                  <Text style={styles.connectSub}>
                    Reals.가 {active.label} 계정에 안전하게 연결됩니다.
                  </Text>

                  {/* 시안: mt-5 rounded-2xl bg-surface p-4 gap-2.5 · 좌측 정렬 */}
                  <View style={styles.scopeCard}>
                    <ShieldCheck size={18} strokeWidth={2} color={color.done[500]} />
                    <View style={styles.scopeText}>
                      <Text style={styles.scopeTitle}>요청 권한</Text>
                      <Text style={styles.scopeBody}>{active.scope}</Text>
                      {/*
                        계정 조건은 **막히기 전에** 말해야 합니다. 인스타그램은 개인
                        계정으로 로그인까지 되고 마지막에 거절돼서, 안내가 없으면
                        앱이 고장난 것으로 읽힙니다.
                      */}
                      {active.requires ? (
                        <Text style={styles.scopeNote}>{active.requires}</Text>
                      ) : null}
                    </View>
                  </View>

                  {authorize.isError && (
                    <View style={styles.errorWrap}>
                      <Banner
                        tone="danger"
                        title="연동을 시작하지 못했습니다"
                        description="잠시 후 다시 시도해 주세요."
                      />
                    </View>
                  )}

                  {/* 시안 8차: mt-5 h-52 rounded-xl · bg-brand · 15 semibold 흰 글자 */}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => start(active)}
                    style={({ pressed }) => [styles.connectBtn, pressTap(pressed, 'button')]}
                  >
                    <Text style={styles.connectBtnText}>{active.label} 계정으로 계속하기</Text>
                  </Pressable>

                  {/* 시안: mt-3 14 medium slate */}
                  <Pressable accessibilityRole="button" onPress={close} hitSlop={8}>
                    <Text style={styles.cancelText}>취소</Text>
                  </Pressable>
                </View>
              ) : (
                // 시안: py-6 · loader-circle 34 brand 회전 · 15 semibold · 13 slate
                <View style={styles.loadingWrap}>
                  <Spinner size={34} />
                  <Text style={styles.loadingTitle}>{active.label} 계정에 연결 중...</Text>
                  <Text style={styles.loadingSub}>잠시만 기다려 주세요</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>

      {/*
        연동 실패 얼럿 (시안 8차 신규).
        시트와 마찬가지로 Modal 로 올립니다 — 화면 전체를 덮어야 사장님이 놓치지
        않습니다. 브라우저에서 돌아온 직후라 화면 어딘가의 배너로는 안 보입니다.
      */}
      <Modal
        visible={!!failed}
        transparent
        animationType="fade"
        onRequestClose={() => setFailed(null)}
      >
        <View style={styles.alertScrim}>
          <View accessibilityViewIsModal accessibilityRole="alert" style={styles.alertBox}>
            {/* 시안: h-12 w-12 rounded-2xl bg-heart/10 · circle-alert 24 */}
            <View style={styles.alertIcon}>
              <CircleAlert size={24} strokeWidth={2} color={color.danger[500]} />
            </View>
            {/* 시안: mt-4 · 17 bold leading-snug · 두 줄로 끊어 씁니다 */}
            <Text style={styles.alertTitle}>
              {failed?.label} 계정이{'\n'}연동되지 않았어요
            </Text>
            <Text style={styles.alertSub}>다시 시도해 주세요.</Text>
            {/* 시안: mt-6 gap-2.5 · h48 · 닫기 flex 1 / 다시 시도 flex 1.4 */}
            <View style={styles.alertCta}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFailed(null)}
                style={({ pressed }) => [styles.alertGhost, pressTap(pressed, 'button')]}
              >
                <Text style={styles.alertGhostText}>닫기</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={retry}
                style={({ pressed }) => [styles.alertPrimary, pressTap(pressed, 'button')]}
              >
                <Text style={styles.alertPrimaryText}>다시 시도</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── 연동 실패 얼럿 (시안 8차) ──────────────────────────────
  // 시안: bg-[rgba(15,23,42,0.6)] — 연동 시트와 같은 농도입니다
  alertScrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  // 시안: w-[300px] rounded-3xl px-6 pt-7 pb-5 · 가운데 정렬
  alertBox: {
    width: 300,
    maxWidth: '100%',
    alignItems: 'center',
    paddingHorizontal: space[6],
    paddingTop: space[7],
    paddingBottom: space[5],
    borderRadius: radius.dialog,
    backgroundColor: color.canvas,
  },
  alertIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    // 시안 bg-heart/10 — 위험색을 10% 로 깔았습니다
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  alertTitle: {
    ...theme.text.subheading,
    fontSize: 17,
    lineHeight: 23,
    marginTop: space[4],
    textAlign: 'center',
    color: color.ink[900],
  },
  alertSub: {
    ...text.caption,
    marginTop: space[2],
    lineHeight: 19,
    textAlign: 'center',
    color: color.ink[500],
  },
  alertCta: { flexDirection: 'row', gap: 10, marginTop: space[6], alignSelf: 'stretch' },
  alertGhost: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.canvas,
  },
  alertGhostText: {
    ...text.button,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[800],
  },
  // 시안 flex-[1.4] — 무엇이 기본 동작인지 크기로 말합니다
  alertPrimary: {
    flex: 1.4,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
  },
  alertPrimaryText: {
    ...text.button,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.paper,
  },
  // ── ⑤ 연동 바텀시트 ─────────────────────────────────
  // 시안: bg-[rgba(15,23,42,0.6)]
  sheetScrim: { flex: 1, backgroundColor: color.overlay.scrim, justifyContent: 'flex-end' },
  scrimTouch: { flex: 1 },
  // 시안: rounded-t-[28px] px-6 pb-8 pt-5
  sheet: {
    paddingHorizontal: space[6],
    paddingTop: space[5],
    paddingBottom: space[8],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.canvas,
  },
  // 시안: h-1(4) w-10(40) · mb-5
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: space[5],
    borderRadius: radius.pill,
    backgroundColor: color.ink[200],
  },
  consent: { alignItems: 'center' },
  /*
   * 시트 안 줄높이는 시안 클래스 그대로 잡았습니다 (CLAUDE.md §5-①).
   * 토큰 줄높이가 더 짧아 그냥 두면 블록마다 짧아지고 그게 쌓입니다.
   *   제목    18, leading 없음        → ×1.5   = 27      (토큰 24)
   *   부제    13, leading-relaxed     → ×1.625 = 21.125  (토큰 19)
   *   요청권한 13, leading 없음        → ×1.5   = 19.5    (토큰 18)
   *   권한내용 12, leading-snug        → ×1.375 = 16.5    (토큰 17)
   */
  // 시안: 시트 맨 위 · 18 bold (마크가 빠져 위 여백 없음)
  connectTitle: { ...theme.text.heading, lineHeight: 27, textAlign: 'center' },
  // 시안: mt-1.5(6) · 13 slate · leading-relaxed
  connectSub: { ...theme.text.caption, marginTop: 6, lineHeight: 21.125, textAlign: 'center' },
  // 시안: mt-5 · rounded-2xl(16) · bg-surface · p-4 · gap-2.5(10) · items-start
  scopeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
    marginTop: space[5],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  scopeText: { flex: 1, gap: 2 },
  // 시안: 13 semibold ink
  scopeTitle: { ...theme.text.chipLabel, lineHeight: 19.5, color: color.ink[900] },
  /*
   * 시안: 12 slate · leading-snug. 굵기 지정이 없어 400 이지만 토큰에 12-regular 이
   * 없고 `family()` 를 우회하면 폰트 미로딩 때 깨지므로 medium 으로 둡니다 —
   * 크기·줄높이는 시안과 같고 굵기 한 단계만 다릅니다.
   */
  scopeBody: {
    ...theme.text.label,
    fontFamily: theme.text.caption.fontFamily,
    fontWeight: theme.text.caption.fontWeight,
    lineHeight: 16.5,
    color: color.ink[500],
  },
  /*
   * 계정 조건. 시안에 없는 줄이라 권한 문구보다 한 단계 눌러 둡니다 —
   * 읽어야 하는 값이지만 "요청 권한" 자리를 뺏으면 안 됩니다.
   * (개인 계정으로 로그인까지 되고 마지막에 거절돼서, 안내가 없으면 고장으로 읽힙니다)
   */
  scopeNote: {
    ...theme.text.label,
    fontFamily: theme.text.caption.fontFamily,
    fontWeight: theme.text.caption.fontWeight,
    lineHeight: 16.5,
    marginTop: 4,
    color: color.ink[400],
  },
  errorWrap: { width: '100%', marginTop: space[4] },
  // 시안 8차: mt-5 · height 52 · rounded-xl · **bg-brand** (마크가 빠져 gap 도 없습니다)
  connectBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    marginTop: space[5],
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
  },
  connectBtnText: { ...theme.text.button, lineHeight: 22.5, color: color.paper },
  // 시안: mt-3 · 14 medium slate
  cancelText: { ...theme.text.bodySmall, marginTop: space[3], color: color.ink[500] },
  // 시안: py-6 가운데 정렬
  loadingWrap: { alignItems: 'center', paddingVertical: space[6] },
  // 시안: mt-4 15 semibold ink
  loadingTitle: { ...theme.text.bodyStrong, marginTop: space[4], textAlign: 'center' },
  // 시안: mt-1 13 slate
  loadingSub: { ...theme.text.caption, marginTop: space[1], textAlign: 'center' },
});
