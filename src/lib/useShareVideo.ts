/**
 * useShareVideo — 완성 영상을 **파일째로** 다른 앱에 넘깁니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 왜 RN 기본 Share 로는 안 됐나 (2026-08-26)
 * ─────────────────────────────────────────────────────────────
 * `Share.share({ message, url })` 을 쓰고 있었는데 **안드로이드의 RN Share 는 `url`
 * 을 통째로 무시합니다.** 글자만 공유되고 영상은 안 갑니다. 게다가 캡션이 비어 있으면
 * `message` 가 빈 문자열이라 Share 가 예외를 던지는데 `.catch(() => {})` 로 삼켜서
 * **눌러도 정말 아무 일도 일어나지 않았습니다.**
 *
 * `expo-sharing` 은 안드로이드에서 `ACTION_SEND` 에 파일 URI 를 실어 보냅니다.
 * 인스타·유튜브가 "영상 받기" 로 잡아 줍니다. 네이티브 모듈이라 **APK 를 다시 만들어야**
 * 하고, 그래서 2026-08-27 빌드에 넣었습니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 캡션은 함께 못 보냅니다 — 클립보드로 대신합니다
 * ─────────────────────────────────────────────────────────────
 * 안드로이드 `ACTION_SEND` 는 파일 하나에 글자를 같이 실을 수 있지만, **인스타그램은
 * 그 글자를 버립니다**(앱이 자기 편집기로 캡션을 받습니다). 그래서 공유 직전에 캡션을
 * 클립보드에 넣습니다. 사장님은 인스타 캡션 칸에서 **붙여넣기만** 하면 됩니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 공유가 안 되는 기기·환경이면 예전 길로 되돌아갑니다
 * ─────────────────────────────────────────────────────────────
 * `Sharing.isAvailableAsync()` 가 false 면(웹 QA, 공유 대상이 하나도 없는 기기)
 * **사진첩 저장 + 캡션 복사 + 안내**로 떨어집니다. 조용히 실패시키지 않습니다.
 */
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';

import { downloadToCache } from './useSaveToGallery';

/** 오류 메시지를 화면에 붙일 만한 길이로 자릅니다. */
function reason(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.length > 120 ? `${msg.slice(0, 120)}…` : msg;
}

interface ShareInput {
  videoUrl?: string | null;
  fileKey?: string | number;
  /** 인스타·유튜브에 붙여넣을 문구. 없으면 클립보드를 건드리지 않습니다. */
  caption?: string;
  /** 공유가 불가능한 환경일 때 대신 할 일 (사진첩 저장 등). */
  fallback: () => Promise<void>;
}

export function useShareVideo(): {
  sharing: boolean;
  /** 캡션을 클립보드에 넣었는지 — 화면이 안내를 띄울 때 씁니다. */
  captionCopied: boolean;
  share: (input: ShareInput) => Promise<void>;
} {
  const [sharing, setSharing] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  const share = useCallback(async ({ videoUrl, fileKey, caption, fallback }: ShareInput) => {
    if (!videoUrl) {
      Alert.alert('아직 영상이 준비되지 않았습니다', '영상이 다 만들어지면 내보낼 수 있습니다.');
      return;
    }

    setSharing(true);
    setCaptionCopied(false);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        await fallback();
        return;
      }

      // 캡션을 먼저 넣습니다 — 공유 시트가 뜬 뒤에는 앱이 뒤로 가서 실행이 밀립니다.
      if (caption) {
        await Clipboard.setStringAsync(caption);
        setCaptionCopied(true);
      }

      const { uri } = await downloadToCache(videoUrl, fileKey);
      await Sharing.shareAsync(uri, {
        mimeType: 'video/mp4',
        dialogTitle: '완성한 영상 내보내기',
        UTI: 'public.movie', // iOS 전용. 안드로이드는 mimeType 만 봅니다.
      });
    } catch (e) {
      /*
        사장님이 공유 시트를 그냥 닫아도 여기로 옵니다. 그건 실패가 아니라
        "안 하기로 하신 것" 이라 얼럿을 띄우지 않습니다 — 취소할 때마다 경고가
        뜨면 앱이 고장난 것처럼 보입니다.
      */
      const msg = e instanceof Error ? e.message : String(e);
      const cancelled = /cancel|dismiss/i.test(msg);
      if (!cancelled) {
        console.warn('[share] 실패', e);
        Alert.alert(
          '내보내지 못했습니다',
          `신호를 확인하고 다시 시도해 주세요.\n\n(${reason(e)})`
        );
      }
    } finally {
      setSharing(false);
    }
  }, []);

  return { sharing, captionCopied, share };
}
