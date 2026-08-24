/**
 * press.ts — 누름 반응 한 곳.
 *
 * 시안은 눌림을 **투명도가 아니라 축소(scale)** 로 표현합니다
 * (`active:scale-95` / `active:scale-90` / `active:scale-[0.97]`).
 * 투명도로 흉내 내면 흰 배경 위 흰 카드가 "사라지는" 것처럼 보여서
 * 눌렸다는 느낌 대신 깜빡임으로 읽힙니다.
 *
 * 값은 tokens.json 의 motion.tapScale 에서 옵니다 — 화면에 0.95 를 직접 쓰지 않습니다.
 *   icon 0.9 · chip/button 0.95 · card 0.97 · shutter 0.94
 */
import type { ViewStyle } from 'react-native';
import { motion } from '../design/theme';

type Kind = keyof typeof motion.tapScale;

/**
 * Pressable 의 style 콜백에서 씁니다.
 *
 *   style={({ pressed }) => [styles.x, pressTap(pressed, 'card')]}
 *
 * pressed 가 false 면 빈 객체를 돌려주므로 평상시에는 transform 이 붙지 않습니다.
 */
export function pressTap(pressed: boolean, kind: Kind = 'button'): ViewStyle {
  return pressed ? { transform: [{ scale: motion.tapScale[kind] }] } : {};
}

/** 비활성 상태의 흐림. 시안에서 비활성 기본 버튼은 흐려지지 않고 track 색으로 바뀝니다. */
export const DISABLED_OPACITY = 0.38;
