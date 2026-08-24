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
 */
import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system';

type State = { saving: boolean; saved: boolean };

export function useSaveToGallery(): State & {
  save: (videoUrl?: string | null, fileKey?: string | number) => Promise<void>;
} {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = useCallback(async (videoUrl?: string | null, fileKey: string | number = 'video') => {
    if (!videoUrl) {
      Alert.alert('아직 영상이 준비되지 않았습니다');
      return;
    }

    setSaving(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        // 조용히 실패하지 않습니다. 왜 안 되는지와 어디로 가면 되는지 알립니다.
        Alert.alert(
          '사진첩 권한이 필요합니다',
          '영상을 저장하려면 설정에서 사진 권한을 켜 주세요.',
          [{ text: '닫기' }, { text: '설정 열기', onPress: () => Linking.openSettings() }]
        );
        return;
      }

      const dest = new File(Paths.cache, `reals_${fileKey}.mp4`);
      if (dest.exists) dest.delete();
      await File.downloadFileAsync(videoUrl, dest);

      // SDK 57 정식 API. saveToLibraryAsync 는 deprecated 되었습니다.
      await MediaLibrary.Asset.create(dest.uri);
      setSaved(true);
    } catch (e) {
      console.warn('[saveToGallery] 저장 실패', e);
      Alert.alert('저장하지 못했습니다', '신호를 확인하고 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }, []);

  return { saving, saved, save };
}
