/**
 * push.ts — 편집 완료 알림.
 *
 * ─────────────────────────────────────────────────────────────
 * 누가 무엇을 하나 (2026-08-26 BE 와 합의, 08-27 계약 확정)
 * ─────────────────────────────────────────────────────────────
 *   앱   알림 권한 요청 → ExponentPushToken 발급 → 저장 API 로 전송 → 눌렀을 때 이동
 *   BE   토큰 저장 · 편집 상태 확인 · **Expo 발송 서비스**로 요청
 *
 * BE 는 Firebase 자격증명을 만지지 않습니다. FCM 키는 EAS(프론트 계정)에만 있고,
 * Expo 가 그 키로 대신 넣어 줍니다. 그래서 BE 는 토큰 하나로 HTTP 한 번만 부르면 됩니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 서버 계약 — **실서버로 직접 확인했습니다** (2026-08-27)
 * ─────────────────────────────────────────────────────────────
 *   POST /users/me/push-tokens
 *     { "push_token": "ExponentPushToken[...]", "platform": "ANDROID" }  → 200
 *     { "token": ... }                                                   → 422
 *          VALIDATION_ERROR  "push_token: Field required"
 *     같은 값을 다시 보내도                                                → 200 (upsert)
 *
 * ⚠️ 필드 이름이 `push_token` 입니다. 저희가 제안했던 `token` 은 **폐기됐습니다.**
 *    `convert.ts` 의 toSnake 가 `pushToken` → `push_token` 으로 바꿔 줍니다.
 *
 * **upsert 라서 앱은 켤 때마다 그냥 보냅니다.** 마지막으로 보낸 값을 기억했다가
 * 달라졌을 때만 보내는 장치를 두지 않습니다 — 그 장치가 어긋나면(앱 데이터 삭제,
 * 토큰 회전) 알림이 조용히 안 옵니다. 서버가 합쳐 주므로 매번 보내는 쪽이 안전합니다.
 *
 * 로그아웃·탈퇴 때 지우는 경로는 **만들지 않습니다** — 탈퇴가 소프트 삭제라 발송
 * 시점에 걸러지고, 같은 기기에 다시 로그인하면 어차피 같은 토큰을 받습니다(BE 회신).
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 조용히 실패하지 않습니다
 * ─────────────────────────────────────────────────────────────
 * 알림은 **안 와도 사장님이 모릅니다.** 그래서 실패를 삼키지 않고 콘솔에 이유를
 * 남깁니다. 다만 **화면을 막지는 않습니다** — 알림이 없다고 앱을 못 쓰면 안 됩니다.
 * 권한을 거절하셔도 앱은 그대로 돌아가고, 다음에 켤 때 다시 묻지 않습니다.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { request } from '../api/http';
import { API } from '../api/endpoints';
import { navRef } from '../navigation/navRef';
import { useAppState } from './appState';

/**
 * 웹에는 푸시 서비스가 없습니다. 디자인 QA 는 웹으로 도는데, 여기서 알림 API 를
 * 건드리면 **화면이 뜨기도 전에** 죽습니다. 그래서 웹이면 전부 건너뜁니다.
 */
const SUPPORTED = Platform.OS !== 'web';

/** 앱이 떠 있을 때 알림이 오면 배너를 띄웁니다. 소리는 서버가 정한 대로 따릅니다. */
if (SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** 우리가 넣어 달라고 한 값. BE 는 `shorts_project_id` 하나만 실어 줍니다 (§3). */
export interface PushPayload {
  shortsProjectId?: number;
}

/**
 * 안드로이드는 **채널이 없으면 알림이 표시조차 안 됩니다** (8.0+).
 * 채널을 만들지 않으면 기본 채널로 가는데, 중요도가 낮아 소리 없이 알림함에만 쌓입니다.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('edit-done', {
    name: '편집 완료',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#2563EB',
  });
}

/**
 * 토큰을 받아 서버에 올립니다. **성공하면 토큰, 아니면 null** 을 돌려줍니다.
 *
 * 실기기에서만 됩니다 — 시뮬레이터·웹에는 푸시 서비스가 없어 발급 자체가 실패합니다.
 * `projectId` 를 넘기지 않으면 EAS 빌드 밖(개발 클라이언트)에서 발급이 깨집니다.
 */
export async function registerPushToken(): Promise<string | null> {
  if (!SUPPORTED) return null;

  try {
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    // 이미 거절하신 분께 다시 묻지 않습니다. 설정으로 안내하는 자리는 따로 둡니다.
    if (!granted && existing.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) {
      console.warn('[push] 알림 권한이 없어 등록하지 않습니다');
      return null;
    }

    /*
      projectId 는 app.json 의 extra.eas.projectId 입니다. EAS 빌드에서는
      easConfig 로도 들어오는데, 개발 클라이언트에서는 비는 경우가 있어 둘 다 봅니다.
    */
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('[push] projectId 를 찾지 못했습니다 — 토큰을 발급할 수 없습니다');
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;

    await request(API.pushTokens(), {
      method: 'POST',
      // toSnake 가 pushToken → push_token 으로 바꿉니다. 서버는 이 이름만 받습니다.
      body: { pushToken: token, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' },
    });
    return token;
  } catch (e) {
    // 알림이 안 붙었다고 앱이 멈추면 안 됩니다. 이유만 남기고 넘어갑니다.
    console.warn('[push] 등록 실패', e);
    return null;
  }
}

/**
 * 알림을 눌러 들어온 경우의 목적지.
 *
 * 딥링크는 `reals://project/{shorts_project_id}/result` 로 합의했지만, 알림에는
 * `data.shorts_project_id` 가 함께 옵니다. **payload 를 먼저 봅니다** — 주소를
 * 파싱하는 것보다 어긋날 여지가 적습니다. 값이 없으면 주소에서 숫자를 꺼냅니다.
 */
export function projectIdFrom(response: Notifications.NotificationResponse): number | null {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const raw = data?.shorts_project_id ?? data?.shortsProjectId;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;

  const url = typeof data?.url === 'string' ? data.url : null;
  const m = url?.match(/project\/(\d+)\/result/);
  return m ? Number(m[1]) : null;
}

/* ────────────────────────────────────────────────────────────
 * 앱에 붙이는 자리
 * ──────────────────────────────────────────────────────────── */

/**
 * 등록과 "눌렀을 때 이동" 을 한곳에서 답니다. `App.tsx` 가 한 번 부릅니다.
 *
 * 세 가지를 처리합니다.
 *   ① 로그인한 뒤 토큰 등록 — 로그인 전에는 보낼 곳(계정)이 없습니다
 *   ② 앱이 떠 있을 때 알림을 누른 경우
 *   ③ **앱이 꺼져 있을 때** 알림으로 켜진 경우 — 이게 빠지면 알림을 눌러 들어와도
 *      홈만 뜹니다. 눌러서 들어왔는데 아무 데도 안 가면 고장으로 보입니다.
 *
 * ⚠️ `navRef` 는 내비게이션이 뜬 뒤에야 준비됩니다. 알림이 먼저 도착할 수 있어
 *    준비될 때까지 잠깐 기다렸다 이동합니다(최대 5초). 그래도 안 되면 포기하고
 *    원래 화면에 둡니다 — 엉뚱한 데로 튕기는 것보다 낫습니다.
 */
export function usePushNotifications(): void {
  const signedIn = useAppState((s) => s.signedIn);

  // ① 로그인 상태가 되면 등록합니다. upsert 라 켤 때마다 보내도 안전합니다.
  useEffect(() => {
    if (!SUPPORTED || !signedIn) return;
    registerPushToken();
  }, [signedIn]);

  // ②·③ 알림을 눌렀을 때
  useEffect(() => {
    if (!SUPPORTED) return;
    let alive = true;

    const go = async (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const projectId = projectIdFrom(response);
      if (!projectId) return;

      // 내비게이션이 준비될 때까지 최대 5초 기다립니다(50ms × 100).
      for (let i = 0; i < 100 && alive; i += 1) {
        if (navRef.isReady()) {
          (navRef.navigate as (n: string, p?: object) => void)('Create', {
            screen: 'EditResult',
            params: { projectId },
          });
          return;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    };

    // ③ 꺼져 있다가 알림으로 켜진 경우
    Notifications.getLastNotificationResponseAsync().then(go).catch(() => {});
    // ② 떠 있는 동안 누른 경우
    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
}
