/**
 * CameraPreview — 카메라 프리뷰. 네이티브는 진짜 카메라를 켭니다.
 *
 * 웹(디자인 QA)에서는 카메라 권한이 없어 화면이 권한 안내에서 멈춥니다.
 * 그러면 촬영 화면을 시안과 대조할 방법이 없어, 웹에서만 시안과 같은
 * 회색 자리표시자("촬영 카메라 프리뷰")를 그립니다 — CameraPreview.web.tsx.
 *
 * ⚠️ Metro 는 웹 번들에서만 .web 파일을 고릅니다. 실제 앱은 이 파일을 씁니다.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';

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
  { facing, mute, onReady },
  ref
) {
  const cam = React.useRef<CameraView>(null);
  React.useImperativeHandle(ref, () => ({
    recordAsync: (opts) => cam.current!.recordAsync(opts) as Promise<{ uri: string } | undefined>,
    stopRecording: () => cam.current?.stopRecording(),
  }));
  return (
    <CameraView
      ref={cam}
      style={StyleSheet.absoluteFill}
      facing={facing}
      mode="video"
      videoQuality="1080p"
      mute={mute}
      onCameraReady={onReady}
    />
  );
});

/** 웹 대체본이 있는지 화면이 알아야 권한 게이트를 건너뜁니다. */
export const CAMERA_IS_PLACEHOLDER = false;
