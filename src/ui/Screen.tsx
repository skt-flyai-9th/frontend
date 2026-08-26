/**
 * Screen — 화면 공통 껍데기.
 *
 * ⚠️ 앱바를 콘텐츠 패딩 밖으로 꺼냅니다 (2026-08-25).
 *
 * 시안의 TopHeader 는 `absolute inset-x-0 top-0` 입니다 — **화면 폭을 꽉 채우고
 * 스크롤해도 제자리**입니다. 그런데 우리 화면 38개가 `<Screen><AppBar/>…</Screen>`
 * 처럼 앱바를 스크롤 콘텐츠의 첫 자식으로 두고 있었습니다. 그러면
 *   · 좌우 20px 패딩이 앱바에도 걸려 하단 구분선이 화면 끝까지 닿지 않고
 *   · 스크롤하면 앱바가 같이 밀려 올라갑니다.
 *
 * 38개 화면을 각각 고치는 대신 여기서 한 번에 처리합니다. 첫 자식이 AppBar 면
 * 스크롤 영역 **바깥 위쪽**에 따로 그립니다. 화면 코드는 하나도 바꿀 필요가 없고,
 * 앱바를 첫 자식으로 두지 않은 화면은 지금 동작 그대로입니다.
 *
 * ─────────────────────────────────────────────────────────────
 * ⚠️ 키보드가 입력칸을 가리는 문제 (2026-08-26)
 * ─────────────────────────────────────────────────────────────
 * 회원가입에서 아래쪽 입력칸이 키보드에 가려 보이지 않는다는 보고가 있었습니다.
 *
 * **옛날 안드로이드는 키보드가 뜨면 창을 알아서 줄여 줬습니다**(`adjustResize`).
 * 그래서 ScrollView 만 있으면 알아서 해결됐고, 실제로 `AiChatScreen` 의
 * `KeyboardAvoidingView` 도 `behavior={ios ? 'padding' : undefined}` — 즉
 * **안드로이드에서는 아무것도 안 하는** 설정이었습니다.
 *
 * 지금 SDK 는 화면을 끝까지 쓰는 방식(엣지 투 엣지)이라 **창이 줄지 않습니다.**
 * 키보드가 화면 아래를 그냥 덮습니다. 그래서 여기서 `padding` 으로 직접 밀어 올립니다.
 *
 * `behavior="padding"` 은 **양쪽 플랫폼 모두**에 줍니다. 창이 줄어드는 환경이라면
 * KeyboardAvoidingView 가 자기 상자의 아래끝과 키보드 윗선을 재서 겹치는 만큼만
 * 계산하므로, 겹침이 0 이면 여백도 0 입니다 — **두 번 밀리지 않습니다.**
 *
 * 스크롤 화면은 이렇게 상자가 줄어들면 안드로이드 ScrollView 가 포커스된 입력칸을
 * 알아서 화면 안으로 끌어옵니다. 스크롤이 없는 화면(로그인)은 내용이 위로 밀립니다.
 * `footer` 도 이 안에 있어 키보드 위로 함께 올라옵니다.
 *
 * 입력칸이 없는 화면은 켜져 있어도 아무 일이 일어나지 않습니다(키보드가 안 뜸).
 * 자체 처리를 하는 화면만 `keyboardAvoiding={false}` 로 끄세요.
 */
import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { color, space } from '../design/theme';
import { AppBar } from './AppBar';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  /** 하단 고정 버튼 영역 */
  footer?: React.ReactNode;
  padded?: boolean;
  background?: string;
  edges?: readonly Edge[];
  contentStyle?: ViewStyle;
  /**
   * 키보드가 올라올 때 화면을 그만큼 밀어 올립니다. 기본 켜짐 —
   * 입력칸이 하나도 없는 화면에서는 켜져 있어도 아무 일이 없습니다.
   */
  keyboardAvoiding?: boolean;
}

export function Screen({
  children,
  scroll = true,
  footer,
  padded = true,
  background = color.canvas,
  edges,
  contentStyle,
  keyboardAvoiding = true,
}: ScreenProps) {
  const inner = padded ? { paddingHorizontal: space[5] } : null;

  /**
   * 포커스된 입력칸을 키보드 위로 끌어올리는 안전장치 (2026-08-26).
   *
   * `KeyboardAvoidingView` 가 상자를 줄여 주면 **보통은** 안드로이드 ScrollView 가
   * 포커스된 자식을 알아서 화면 안으로 당깁니다. 그런데 순서가 어긋날 때가 있습니다 —
   * 포커스가 먼저 잡히고 키보드는 그 뒤에 올라오므로, 당길 시점에는 아직 상자가
   * 안 줄어 있어 "이미 보인다" 고 판단하고 넘어갑니다. 그러면 칸이 키보드에 덮인 채
   * 남습니다.
   *
   * 그래서 **키보드가 다 올라온 뒤에** 한 번 더 확인합니다. 덮였으면 그만큼만 스크롤합니다.
   * 안 덮였으면 아무 일도 하지 않습니다 — 멀쩡한 화면을 흔들지 않습니다.
   */
  const scrollRef = React.useRef<ScrollView>(null);
  const offsetY = React.useRef(0);

  React.useEffect(() => {
    if (!keyboardAvoiding || !scroll) return;
    const sub = Keyboard.addListener('keyboardDidShow', (e) => {
      const input = TextInput.State.currentlyFocusedInput();
      const sv = scrollRef.current;
      if (!input || !sv) return;
      const keyboardTop = e.endCoordinates.screenY;
      input.measureInWindow((_x, y, _w, h) => {
        // 입력칸 아래끝이 키보드 윗선보다 아래면 그만큼 올립니다. 여유 12.
        const overlap = y + h + 12 - keyboardTop;
        if (overlap > 0) sv.scrollTo({ y: offsetY.current + overlap, animated: true });
      });
    });
    return () => sub.remove();
  }, [keyboardAvoiding, scroll]);

  /**
   * footer 가 있으면 하단 안전영역을 SafeAreaView 가 먹지 않습니다.
   * BottomAction 이 직접 처리해야 버튼 배경이 화면 끝까지 이어집니다.
   */
  const resolvedEdges: readonly Edge[] = edges ?? (footer ? ['top'] : ['top', 'bottom']);

  // 첫 자식이 앱바면 떼어내 스크롤 밖에 고정합니다.
  const kids = React.Children.toArray(children);
  const first = kids[0];
  const hasBar = React.isValidElement(first) && first.type === AppBar;
  const bar = hasBar ? first : null;
  const body = hasBar ? kids.slice(1) : kids;

  const content = (
    <>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, inner, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            offsetY.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={32}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.flex, inner, contentStyle]}>{body}</View>
      )}
      {footer}
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={resolvedEdges}>
      {bar}
      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingTop: space[4], paddingBottom: space[10], gap: space[4] },
});
