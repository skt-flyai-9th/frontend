/**
 * CameraPreview.web.tsx — 웹(디자인 QA) 전용 대체본.
 *
 * 브라우저에는 촬영용 카메라가 없어 원본을 쓰면 권한 안내에서 멈춥니다.
 * 시안도 이 자리를 "촬영 카메라 프리뷰" 회색 판으로 그리므로 같은 모양을 그립니다.
 * 녹화는 아무 일도 하지 않고, 화면 배치만 시안과 대조할 수 있게 합니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, text } from '../design/theme';

export interface CameraPreviewHandle {
  recordAsync: (opts?: { maxDuration?: number }) => Promise<{ uri: string } | undefined>;
  stopRecording: () => void;
}

interface Props {
  facing: 'back' | 'front';
  mute?: boolean;
  onReady?: () => void;
}

export const CameraPreview = React.forwardRef<CameraPreviewHandle, Props>(function CameraPreview(
  { onReady },
  ref
) {
  React.useEffect(() => {
    onReady?.();
  }, [onReady]);
  React.useImperativeHandle(ref, () => ({
    recordAsync: async () => undefined,
    stopRecording: () => {},
  }));
  return (
    <View style={[StyleSheet.absoluteFill, styles.box]}>
      <Text style={styles.label}>촬영 카메라 프리뷰</Text>
    </View>
  );
});

export const CAMERA_IS_PLACEHOLDER = true;

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.ink[200] },
  label: { ...text.bodySmall, color: color.ink[500] },
});
