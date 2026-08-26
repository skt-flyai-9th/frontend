/**
 * SignUpVerifyScreen — 회원가입 본인 인증. **시안 6차 `SignupVerifyScreen` 대조 이식.**
 *
 * ─────────────────────────────────────────────────────────────
 * ⚠️ 이 화면은 **목업입니다. 실제로 인증하지 않습니다.**
 * ─────────────────────────────────────────────────────────────
 * 인증번호를 보내고 확인하는 API 가 명세에 없습니다(MVP 범위에서 빠진 것으로
 * 사장님이 확인해 주셨습니다 — 2026-08-26). 그래서
 *
 *   · "인증번호 받기" 는 서버에 아무것도 보내지 않고 타이머만 돌립니다
 *   · **6자리를 채우면 무엇을 넣었든 통과합니다**
 *
 * 그래서 아래 두 가지를 지켰습니다.
 *
 * ① 화면에 **"지금은 실제로 확인하지 않습니다" 를 적어 둡니다.** 사장님이 인증이
 *    된 줄 알고 넘어가면 안 됩니다. 우리 제1규칙(없는 것을 있는 척하지 않기)입니다.
 * ② 실제 가입(1.2)은 이 화면의 "인증 완료" 에서 일어납니다. 시안 순서(입력 → 인증 →
 *    가입 완료)를 지키면서, 서버에 계정이 만들어지는 시점은 한 곳으로 유지합니다.
 *
 * 인증 API 가 생기면 `send()` 와 `submit()` 안만 바꾸면 됩니다. 화면은 그대로입니다.
 *
 * 시안 원문 수치
 *   아이콘 타일 56 rounded-2xl · bg-brand-tint · shield-check 26
 *   제목 22 bold leading-tight · 안내 14 leading-relaxed
 *   채널 버튼 mt-6 gap-2 · h-11 · rounded-xl
 *   대상 줄 mt-3 h52 · rounded-xl · border-hairline · bg-surface
 *   타이머 180초 · mm:ss · 13 semibold · heart
 *   하단 mt-auto pt-8
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CircleAlert, Mail, Phone, ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '../../../ui/AppBar';
import { AuthField } from '../../../ui/AuthField';
import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { Banner } from '../../../ui/Feedback';
import { pressTap } from '../../../ui/press';
import theme, { color, radius, sizing, space, text } from '../../../design/theme';

/** 시안: 재전송 타이머 180초 */
const TTL_SEC = 180;

type Channel = 'phone' | 'email';

export function SignUpVerifyScreen({
  email,
  phone,
  onBack,
  onDone,
  submitting,
  serverError,
}: {
  email: string;
  phone: string;
  onBack: () => void;
  /** 실제 가입(1.2)은 여기서 일어납니다 — 위 머리말 참고. */
  onDone: () => void;
  submitting?: boolean;
  serverError?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const [channel, setChannel] = useState<Channel>('phone');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  /** 시안 formatPhone — 저장은 숫자만, 표시는 하이픈. */
  const prettyPhone = (v: string) => {
    const d = v.replace(/\D/g, '');
    if (d.length < 4) return d;
    if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
  };

  const target = channel === 'phone' ? prettyPhone(phone) : email;

  const send = () => {
    // ⚠️ 서버에 아무것도 안 보냅니다. 타이머만 돕니다 (위 머리말).
    setSent(true);
    setLeft(TTL_SEC);
    setError(null);
  };

  const submit = () => {
    if (code.length !== 6) {
      setError('인증번호 6자리를 입력해주세요.');
      return;
    }
    onDone();
  };

  const mmss = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  const CHANNELS: [Channel, string][] = [
    ['phone', '휴대폰'],
    ['email', '이메일'],
  ];

  return (
    <Screen padded={false} edges={['top']} contentStyle={{ paddingTop: 0, paddingBottom: 0, gap: 0, flexGrow: 1 }}>
      <AppBar onBack={onBack} title="본인 인증" />

      <View style={[styles.body, { paddingBottom: Math.max(insets.bottom, space[8]) }]}>
        <View style={styles.badge}>
          <ShieldCheck size={26} strokeWidth={2} color={color.brand[600]} />
        </View>
        <Text style={styles.title}>본인 확인이 필요해요</Text>
        <Text style={styles.lead}>
          가입을 마치려면 연락처를 인증해주세요. 인증한 연락처로 아이디·비밀번호를 찾을 수 있어요.
        </Text>

        {/*
          ⚠️ 시안에 없는 줄입니다. 인증 API 가 아직 없어 **실제로 확인하지 않는다**는 것을
             사장님께 밝힙니다. 인증이 된 줄 알고 넘어가면 안 됩니다 (CLAUDE.md §2).
             API 가 생기면 이 안내를 지우세요.
        */}
        <View style={styles.notice}>
          <Banner
            tone="warn"
            title="지금은 인증을 실제로 확인하지 않습니다"
            description="준비 중인 기능이라 아무 번호나 6자리를 넣으면 넘어갑니다."
          />
        </View>

        <View style={styles.channels}>
          {CHANNELS.map(([k, label]) => {
            const on = channel === k;
            return (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setChannel(k);
                  setSent(false);
                  setCode('');
                  setError(null);
                  setLeft(0);
                }}
                style={({ pressed }) => [
                  styles.channel,
                  on ? styles.channelOn : styles.channelOff,
                  pressTap(pressed, 'button'),
                ]}
              >
                <Text style={[styles.channelText, on && { color: color.brand[600] }]}>
                  {label} 인증
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.targetRow}>
          {channel === 'phone' ? (
            <Phone size={18} strokeWidth={2} color={color.ink[500]} />
          ) : (
            <Mail size={18} strokeWidth={2} color={color.ink[500]} />
          )}
          <Text style={styles.targetText} numberOfLines={1}>
            {target}
          </Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={send}>
            <Text style={styles.sendText}>{sent ? '재전송' : '인증번호 받기'}</Text>
          </Pressable>
        </View>

        {sent && (
          <View style={styles.codeBlock}>
            <AuthField
              icon={ShieldCheck}
              placeholder="인증번호 6자리"
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, '').slice(0, 6));
                setError(null);
              }}
              invalid={!!error}
              keyboardType="number-pad"
              trailing={<Text style={styles.timer}>{mmss}</Text>}
            />
            {error ? (
              <View style={styles.msgRow}>
                <CircleAlert size={13} strokeWidth={2} color={color.danger[500]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            {left === 0 ? (
              <Text style={styles.expired}>유효 시간이 지났어요. 재전송을 눌러주세요.</Text>
            ) : null}
          </View>
        )}

        <View style={styles.cta}>
          {serverError ? (
            <View style={styles.msgRow}>
              <CircleAlert size={15} strokeWidth={2} color={color.danger[500]} />
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}
          <Button
            label="인증 완료"
            disabled={!sent || code.length !== 6}
            loading={submitting}
            onPress={submit}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 시안: px-6 pb-8 · 헤더(98) 아래로 pt-[110px] → 12 만큼 띄웁니다
  body: { flex: 1, paddingHorizontal: space[6], paddingTop: space[3] },

  // 시안: h-14 w-14 rounded-2xl bg-brand-tint
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.brand[50],
  },
  // 시안: mt-4 · 22 bold leading-tight
  title: { ...theme.text.title, marginTop: space[4], lineHeight: 28 },
  // 시안: mt-2 · 14 leading-relaxed
  lead: { ...text.bodySmall, marginTop: space[2], lineHeight: 21, color: color.ink[500] },

  notice: { marginTop: space[4] },

  // 시안: mt-6 gap-2
  channels: { flexDirection: 'row', gap: space[2], marginTop: space[6] },
  channel: {
    flex: 1,
    height: sizing.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
  },
  channelOn: { borderColor: color.brand[600], backgroundColor: color.brand[50] },
  channelOff: { borderColor: color.ink[200], backgroundColor: color.surface },
  channelText: {
    ...theme.text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[800],
  },

  // 시안: mt-3 h52 rounded-xl border-hairline bg-surface px-4
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: sizing.inputHeight,
    marginTop: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
  },
  targetText: { ...text.body, flex: 1, minWidth: 0, color: color.ink[900] },
  sendText: {
    ...text.caption,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.brand[600],
  },

  codeBlock: { marginTop: space[3] },
  // 시안: 13 semibold tabular-nums heart
  timer: {
    ...text.caption,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.danger[500],
  },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space[2], paddingLeft: 4 },
  errorText: { ...text.caption, flex: 1, color: color.danger[500] },
  expired: { ...text.caption, marginTop: space[2], paddingLeft: 4, color: color.ink[500] },

  // 시안: mt-auto pt-8
  cta: { marginTop: 'auto', paddingTop: space[8], gap: space[3] },
});
