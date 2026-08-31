/**
 * MyShortCell — 마이페이지 3열 격자의 칸 하나. **내가 만든 숏폼을 소리 없이 재생합니다.**
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 자동재생인가 (2026-08-26, 실기기 평가에서 사장님 요청)
 * ─────────────────────────────────────────────────────────────
 * 정지된 표지만 깔려 있으면 **내가 뭘 만들었는지 눌러 보기 전엔 모릅니다.**
 * 표지는 첫 프레임이라 세 편이 다 비슷하게 생기는 일도 잦습니다.
 *
 * 홈 피드와 달리 **유튜브 약관과 무관합니다** — 여기서 트는 것은 남의 영상이 아니라
 * 우리 서버가 만들어 준 사장님 영상(15.2 `video_url`)입니다. 그래서 한 화면에
 * 여러 개를 틀어도 됩니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 대신 세 가지를 지킵니다
 * ─────────────────────────────────────────────────────────────
 * ① **소리는 끕니다.** 마이페이지를 열었을 뿐인데 소리가 나면 안 됩니다.
 * ② **화면을 벗어나면 멈춥니다.** 탭을 옮기거나 다른 화면으로 들어가면 재생을
 *    세웁니다 — 안 그러면 보이지도 않는 영상 여러 개가 배터리를 먹습니다.
 * ③ **트는 개수를 제한합니다** (`autoplay` 로 받습니다). 숏폼이 스무 편이면
 *    스무 개를 동시에 여는 셈이라 기기가 버티지 못합니다. 제한을 넘는 칸은
 *    지금까지처럼 표지 그림입니다.
 *
 * ⚠️ 웹에서는 확인할 수 없습니다. `expo-video` 가 웹에서도 돌긴 하지만 QA 빌드는
 *    실서버 영상 주소를 쓰지 않는 경우가 많습니다 — **실기기 확인이 필요합니다.**
 */
import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import type { StoreShort } from '../../../api/schema/types';

export function MyShortCell({
  short,
  autoplay,
  focused,
  label,
  onPress,
  style,
  imageStyle,
  emptyStyle,
}: {
  short: StoreShort;
  /** 이 칸을 재생할지. 화면이 감당할 수 있는 개수까지만 켭니다(위 머리말 ③). */
  autoplay: boolean;
  /** 마이페이지가 지금 보이는 화면인지. 벗어나면 세웁니다(②). */
  focused: boolean;
  label: string;
  onPress: () => void;
  style?: object;
  imageStyle?: object;
  emptyStyle?: object;
}) {
  /*
    ─────────────────────────────────────────────────────────────
    🔴 **화면을 벗어나면 플레이어를 세우는 게 아니라 걷어냅니다** (2026-08-31,
       백엔드 분석: "포커스를 잃었을 때 pause() 만 호출하므로 디코더와 버퍼는
       해제되지 않습니다")
    ─────────────────────────────────────────────────────────────
    영상을 누르면 전체화면이 **위에 덮여** 열립니다. 마이페이지는 그대로 살아
    있으므로, 세워 두기만 하면 여기 여섯 개와 저기 것들이 **동시에** 안드로이드
    디코더를 잡습니다. 한도를 넘으면 안드로이드는 오류 없이 앱을 죽입니다 —
    사장님이 보시는 "홈으로 튕김" 이 그것입니다.

    이제 영상을 **자식으로 내려**, 볼 때만 붙입니다. 포커스를 잃으면 그 자식이
    사라지면서 `useVideoPlayer` 가 정리되고 디코더도 같이 풀립니다. 표지 사진은
    그대로 남으므로 화면은 달라지지 않습니다.

    ⚠️ `videoUrl` 은 **비어 있을 수 있습니다** (백엔드 확인: 완성 조회가
       `render_status == COMPLETED` 만 보고 `video_url IS NOT NULL` 은 안 봄).
       빈 주소로 플레이어를 만들면 그 자체가 죽는 원인이 되므로 여기서 막습니다.
  */
  const playable = autoplay && focused && !!short.videoUrl;

  /*
    🔴 **누르는 판을 영상 위에 형제로 얹습니다** (2026-08-31 지적: "마이페이지에서
       영상이 터치가 안 된다").

    예전에는 `Pressable` 이 `VideoView` 를 **감싸고** 있었습니다. 안드로이드에서
    영상은 네이티브 표면이라 **터치를 자기가 먹고 위로 올려보내지 않습니다.**
    그래서 감싼 `Pressable` 의 `onPress` 가 안 불립니다. 앞줄(자동재생하는 칸)만
    영상이라 **거기만 안 눌리고** 아랫줄(표지 이미지)은 눌렸습니다.

    ⚠️ 촬영 확인 탭에서 **똑같은 일**이 있었습니다(`domains/shoot/components/TakePreview.tsx`,
       2026-08-30). 그때와 같은 방법으로 고칩니다 — 부모로 감싸지 말고 **형제**로
       덮습니다.

    ✅ 이 영상은 우리가 만든 파일이라 위에 판을 얹어도 됩니다. 유튜브 임베드였다면
       가리는 것 자체가 약관 위반입니다(CLAUDE.md §8-1).
  */
  return (
    <View style={style}>
      {autoplay ? (
        <View style={[imageStyle, styles.clip]}>
          {/*
            표지를 아래에 깔아 둡니다 — 영상이 준비되기 전 몇 백 밀리초 동안
            빈 회색 칸이 보이면 "안 만들어졌나" 로 읽힙니다.
          */}
          {short.coverImageUrl ? (
            <Image source={{ uri: short.coverImageUrl }} style={StyleSheet.absoluteFill} />
          ) : null}
          {playable ? <CellVideo url={short.videoUrl as string} /> : null}
        </View>
      ) : short.coverImageUrl ? (
        <Image source={{ uri: short.coverImageUrl }} style={imageStyle} />
      ) : (
        <View style={[imageStyle, emptyStyle]} />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          StyleSheet.absoluteFill,
          // 눌린 표시는 여기서 냅니다 — 영상에 `opacity` 를 주면 다시 못 살아납니다
          pressed && { backgroundColor: 'rgba(15,23,42,0.18)' },
        ]}
      />
    </View>
  );
}

/**
 * 칸 하나의 영상. **볼 때만 붙습니다** (위 머리말 참고).
 * 사라지면 `useVideoPlayer` 가 정리되면서 네이티브 디코더도 같이 풀립니다.
 */
function CellVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    player.play();
  }, [player]);
  return (
    <VideoView
      style={StyleSheet.absoluteFill}
      player={player}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
