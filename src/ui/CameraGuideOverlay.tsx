import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import theme, { color, radius, space, text } from '../design/theme';

/**
 * 구도 오버레이 — S09.2.1 "사진형 가이드 레이어"
 *
 * 중요한 구조적 규칙 (명세):
 *   "가이드는 최종 촬영 파일에 포함되지 않는다."
 *
 * 그래서 이 컴포넌트는 <CameraView> 의 자식이 아니라 형제 노드로,
 * pointerEvents="none" 인 절대배치 레이어로만 올립니다.
 * CameraView 내부에 렌더하면 일부 안드로이드 기기에서 프리뷰 surface 에
 * 합성될 위험이 있어 항상 바깥에 둡니다.
 */

export type GuideShape = 'fullBody' | 'upperBody' | 'productLowerThird' | 'handsTop' | 'wideSpace';

export interface GuideSpec {
  shape: GuideShape;
  /** 화면에 표시할 짧은 지시문. 예: "상품은 아래쪽 1/3에 두세요" */
  instruction: string;
  /** 얼굴이 프레임 밖이어야 하는 태스크인지 (얼굴 비노출 모드) */
  faceOut?: boolean;
}

interface Props {
  spec: GuideSpec;
  /** 0~1. 사장님이 조절할 수 있어야 합니다(명세 규칙). */
  opacity: number;
  visible: boolean;
}

export function CameraGuideOverlay({ spec, opacity, visible }: Props) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
      {/* 3분할 안전선 */}
      <View style={[StyleSheet.absoluteFill, { opacity: opacity * 0.6 }]}>
        <View style={[styles.hLine, { top: '33.33%' }]} />
        <View style={[styles.hLine, { top: '66.66%' }]} />
        <View style={[styles.vLine, { left: '33.33%' }]} />
        <View style={[styles.vLine, { left: '66.66%' }]} />
      </View>

      {/* 자막 안전영역 — 하단 22%는 자막/CTA가 들어가므로 피사체를 두지 않습니다 */}
      <View style={[styles.captionSafe, { opacity: opacity * 0.9 }]}>
        <Text style={styles.safeLabel}>자막 자리</Text>
      </View>

      {/* 태스크별 피사체 윤곽 */}
      <View style={[StyleSheet.absoluteFill, { opacity }]}>
        <ShapeOutline shape={spec.shape} />
      </View>

      {/* 지시문 */}
      <View style={styles.instructionWrap}>
        <View style={styles.instructionPill}>
          <Text style={styles.instructionText}>{spec.instruction}</Text>
        </View>
        {spec.faceOut ? (
          <View style={[styles.instructionPill, styles.faceOutPill]}>
            <Text style={styles.instructionText}>얼굴은 화면 밖으로 두세요</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ShapeOutline({ shape }: { shape: GuideShape }) {
  switch (shape) {
    case 'productLowerThird':
      return <View style={[styles.outline, styles.productBox]} />;
    case 'handsTop':
      return <View style={[styles.outline, styles.handsBox]} />;
    case 'upperBody':
      return <View style={[styles.outline, styles.upperBox]} />;
    case 'fullBody':
      return <View style={[styles.outline, styles.fullBox]} />;
    case 'wideSpace':
    default:
      return <View style={[styles.outline, styles.wideBox]} />;
  }
}

const LINE = color.overlay.guideLine;

const styles = StyleSheet.create({
  hLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: LINE },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: LINE },
  captionSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '22%',
    borderTopWidth: theme.border.thick,
    borderTopColor: LINE,
    borderStyle: 'dashed',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: space[1],
  },
  safeLabel: {
    ...text.micro,
    color: color.paper,
    backgroundColor: color.overlay.cameraChrome,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  outline: {
    position: 'absolute',
    borderWidth: theme.border.thick,
    borderColor: LINE,
    borderStyle: 'dashed',
    backgroundColor: color.overlay.guideFill,
    borderRadius: radius.lg,
  },
  productBox: { left: '18%', right: '18%', bottom: '24%', height: '26%' },
  handsBox: { left: '22%', right: '22%', top: '8%', height: '30%' },
  upperBox: { left: '20%', right: '20%', top: '14%', height: '46%', borderRadius: radius.pill },
  fullBox: { left: '24%', right: '24%', top: '8%', bottom: '18%', borderRadius: radius.pill },
  wideBox: { left: '8%', right: '8%', top: '18%', bottom: '26%' },
  instructionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '4%',
    alignItems: 'center',
    gap: space[2],
  },
  instructionPill: {
    backgroundColor: color.overlay.cameraChrome,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    maxWidth: '86%',
  },
  faceOutPill: { backgroundColor: 'rgba(217,62,18,0.82)' },
  instructionText: { ...text.bodySmall, color: color.paper, textAlign: 'center' },
});
