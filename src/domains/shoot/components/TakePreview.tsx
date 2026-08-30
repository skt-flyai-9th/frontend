/**
 * TakePreview — **방금 찍은 컷을 되보는 자리.**
 *
 * 🔴 **눌러서 재생됩니다** (2026-08-30 지시 ⑪: "지금은 그냥 정지 화면인데 방금 찍은
 *    영상을 재생시킬 수 있게").
 *
 *    예전에는 일반 촬영이 첫 프레임만 세워 두었고, 안무 촬영은 회색 판에 "N초 촬영됨"
 *    글자만 있었습니다. 사장님이 "잘 찍혔나" 를 판단하려면 **움직임과 소리**를 봐야
 *    하는데 그림 한 장으로는 알 수가 없습니다.
 *
 *    · 소리는 **켭니다.** 자기가 찍은 것을 되보는 자리라 소리가 있어야 판단됩니다
 *      (홈 피드의 자동재생과 다릅니다 — 거기는 남의 영상이라 음소거가 맞습니다).
 *    · 끝나면 **되풀이합니다.** 짧은 컷이라 한 번 보고 놓치기 쉽습니다.
 *    · 멈춰 있을 때만 재생 표시를 덮어, 누르면 되는 자리라는 걸 알려 줍니다.
 *
 * 시안 실측값: 폭 150 · 9:16 · radius lg · hairline 테두리.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Play } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import theme, { color, radius } from '../../../design/theme';

export function TakePreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (playing) player.pause();
    else player.play();
    setPlaying((v) => !v);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? '미리보기 멈춤' : '방금 찍은 영상 재생'}
      onPress={toggle}
      style={styles.preview}
    >
      <VideoView
        player={player}
        style={styles.previewFill}
        contentFit="cover"
        nativeControls={false}
        surfaceType="textureView"
      />
      {!playing ? (
        <View style={styles.play} pointerEvents="none">
          <View style={styles.playDot}>
            <Play size={20} strokeWidth={0} fill={color.paper} color={color.paper} />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  preview: {
    alignSelf: 'center',
    width: 150,
    aspectRatio: 9 / 16,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.ink[100],
  },
  previewFill: { width: '100%', height: '100%', borderRadius: radius.lg },
  play: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.28)',
  },
  playDot: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
});
