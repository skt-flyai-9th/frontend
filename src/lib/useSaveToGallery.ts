/**
 * useSaveToGallery — 완성 영상을 사장님 사진첩에 저장합니다.
 *
 * 왜 훅으로 뺐나
 *   완성 파일 화면(15.1)과 게시 화면(16.2) 두 곳에서 같은 동작이 필요합니다.
 *   복사해 두면 한쪽만 고쳐지는 사고가 납니다 — 권한 거절 처리 같은 게
 *   특히 그렇습니다.
 *
 * 권한 규칙 (기능명세)
 *   권한을 미리 묶어 요청하지 않습니다. 저장을 **누른 그 순간** 요청하고,
 *   거절당하면 이유와 함께 설정으로 가는 길을 알려 줍니다.
 *
 * 🔴 2026-08-26 — 저장이 안 되던 원인
 *   `requestPermissionsAsync()` 를 **인자 없이** 부르고 있었습니다. 그러면
 *   저장에는 필요도 없는 "사진·미디어 **읽기**" 권한까지 함께 요구합니다.
 *   Android 13+ 에서 읽기를 거절하면 granted=false 가 되어 저장 경로가 통째로
 *   막힙니다. 영상은 멀쩡히 있는데 "저장하지 못했습니다" 만 나오던 상태였습니다.
 *   (v13 버그분석 문서에는 고쳤다고 적혀 있으나 코드에는 반영돼 있지 않았습니다.)
 *
 *   고친 내용
 *     1. writeOnly 로 요청 — 저장만 하므로 읽기 권한을 묻지 않습니다.
 *     2. 부분 허용(limited)도 통과 — Android 14·iOS 의 "일부 사진만 허용" 도 저장은 됩니다.
 *     3. 실패 사유를 Alert 에 함께 띄웁니다 — 화면 문구가 곧 다음 진단입니다.
 */
import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system';

type State = { saving: boolean; saved: boolean };

/** 오류 메시지를 사장님 화면에 붙일 만한 길이로 자릅니다. */
function reason(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.length > 120 ? `${msg.slice(0, 120)}…` : msg;
}

export function useSaveToGallery(): State & {
  save: (videoUrl?: string | null, fileKey?: string | number) => Promise<void>;
} {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = useCallback(async (videoUrl?: string | null, fileKey: string | number = 'video') => {
    if (!videoUrl) {
      Alert.alert('아직 영상이 준비되지 않았습니다', '영상이 다 만들어지면 저장할 수 있습니다.');
      return;
    }

    setSaving(true);
    try {
      // writeOnly=true — 저장만 합니다. 사진첩을 읽지 않으므로 읽기 권한을 묻지 않습니다.
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      // '일부만 허용'(limited)도 저장은 됩니다. granted 만 보면 그 경우를 놓칩니다.
      const canSave = perm.granted || perm.accessPrivileges === 'limited';
      if (!canSave) {
        // 조용히 실패하지 않습니다. 왜 안 되는지와 어디로 가면 되는지 알립니다.
        Alert.alert(
          '사진첩 저장 권한이 필요합니다',
          perm.canAskAgain
            ? '영상을 저장하려면 저장 권한을 허용해 주세요.'
            : '전에 거부하셔서 앱에서는 켤 수 없습니다. 설정에서 허용해 주세요.',
          [{ text: '닫기' }, { text: '설정 열기', onPress: () => Linking.openSettings() }]
        );
        return;
      }

      const dest = new File(Paths.cache, `reals_${fileKey}.mp4`);
      if (dest.exists) dest.delete();
      // 내려받은 결과 파일을 그대로 씁니다 — 서버가 파일명을 바꾸는 경우까지 안전합니다.
      const downloaded = await File.downloadFileAsync(videoUrl, dest);

      /*
       * ⚠️ `Asset.create` 의 인자 이름은 **filePath** 입니다 (uri 가 아닙니다).
       *    `file:///…` 형태를 그대로 받는 기기도 있고, 스킴을 뗀 경로만 받는 기기도
       *    있습니다. 어느 쪽인지 밖에서는 알 수 없어 **둘 다 시도**합니다.
       *    한쪽이 실패했다고 저장을 포기하면, 영상은 멀쩡히 받아 놓고
       *    "저장하지 못했습니다" 만 뜹니다 — 실제로 그 상태였습니다.
       */
      const uri = downloaded.uri;
      const plain = uri.replace(/^file:\/\//, '');
      try {
        await MediaLibrary.Asset.create(uri);
      } catch (first) {
        console.warn('[saveToGallery] uri 로 실패, 경로로 재시도', first);
        await MediaLibrary.Asset.create(plain);
      }
      setSaved(true);
    } catch (e) {
      console.warn('[saveToGallery] 저장 실패', e);
      Alert.alert('저장하지 못했습니다', `신호를 확인하고 다시 시도해 주세요.\n\n(${reason(e)})`);
    } finally {
      setSaving(false);
    }
  }, []);

  return { saving, saved, save };
}
