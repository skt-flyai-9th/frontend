/**
 * 튜토리얼 블러가 **무엇을 흐릴지** 가리키는 손잡이.
 *
 * 🔴 **안드로이드는 흐릴 대상을 지정해야 블러가 걸립니다** (2026-08-30, 두 번 틀림).
 *
 *    `expo-blur@57` 의 안드로이드 구현은 `blurTarget` 이 없으면 **조용히 blurMethod 를
 *    'none' 으로 되돌립니다.** 예외도 화면 오류도 없이 그냥 색만 덮입니다.
 *
 *      // node_modules/expo-blur/build/BlurView.js
 *      if (Platform.OS === 'android' && (blurMethod === 'dimezisBlurView' || …)
 *          && !this.props.blurTarget) {
 *        // The fallback happens on the native side
 *        console.warn('… will fallback to "none" blur method …');
 *      }
 *
 *    웹(CSS backdrop-filter)과 iOS 는 대상 없이도 흐려집니다. 그래서 **웹 캡처로는
 *    멀쩡히 흐려 보이고 폰에서만 안 걸립니다** — 제가 이걸 두 번 놓쳤습니다.
 *
 * 대상은 `App.tsx` 에서 `BlurTargetView` 로 네비게이터 전체를 감싸 잡습니다. 그 안에
 * 그려지는 화면이 흐림의 재료가 됩니다.
 *
 * 비용 — `BlurTargetView` 자체는 그릇일 뿐입니다(`ExpoBlurTargetView.kt`: 자식을
 * Dimezis `BlurTarget` 에 옮겨 담기만 합니다). 실제 흐리는 일은 `BlurView` 가
 * `setupWith` 로 붙을 때 시작되므로, 튜토리얼이 떠 있지 않으면 드는 값이 없습니다.
 *
 * ⚠️ 앱바·탭바(`AppBar`·`TabBar`)의 `BlurView` 도 대상이 없어 **안드로이드에서는
 *    지금까지 한 번도 흐려진 적이 없습니다.** 흰 배경 위라 티가 안 났을 뿐입니다.
 *    거기까지 켜는 건 앱 전체 그림이 바뀌는 일이라 따로 판단할 문제로 남깁니다.
 */
import { createRef } from 'react';
import type { View } from 'react-native';

export const blurTargetRef = createRef<View>();
