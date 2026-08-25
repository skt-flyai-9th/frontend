/** AI 추천 탭 — 백엔드 R06 대화형 숏폼 Agent의 실제 세션을 사용합니다. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowUp, RotateCcw, Sparkles } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppBar } from '../../../ui/AppBar';
import { Banner, Loading } from '../../../ui/Feedback';
import { Screen } from '../../../ui/Screen';
import { pressTap } from '../../../ui/press';
import { useAppState } from '../../../lib/appState';
import {
  discardShortformSession,
  useAcceptShortformRecommendation,
  useCreateShortformSession,
  useNextShortformRecommendation,
  useSubmitShortformTurn,
} from '../../../api/queries/shortform';
import type {
  ShortformOption,
  ShortformRecommendation,
  ShortformTurnInput,
  ShortformTurnResponse,
} from '../../../api/schema/types';
import type { RootStackParamList } from '../../../navigation/types';
import theme, { color, radius, sizing, space, text } from '../../../design/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Bubble = { role: 'ai' | 'me'; content: string };

const CONFIRM_OPTIONS: ShortformOption[] = [
  { id: 'CONFIRM_TRUE', label: '이대로 추천받기' },
  { id: 'CONFIRM_FALSE', label: '내용 수정하기' },
];

export default function AiChatScreen() {
  const nav = useNavigation<Nav>();
  const storeId = useAppState((s) => s.storeId);
  const scrollRef = useRef<ScrollView>(null);
  const mounted = useRef(true);
  const [sessionId, setSessionId] = useState<number>();
  const [log, setLog] = useState<Bubble[]>([]);
  const [options, setOptions] = useState<ShortformOption[]>([]);
  const [recommendation, setRecommendation] = useState<ShortformRecommendation>();
  const [input, setInput] = useState('');

  const createSession = useCreateShortformSession(storeId ?? undefined);
  const submitTurn = useSubmitShortformTurn(sessionId);
  const nextRecommendation = useNextShortformRecommendation(sessionId);
  const acceptRecommendation = useAcceptShortformRecommendation(sessionId);

  const append = useCallback((...bubbles: Bubble[]) => {
    setLog((previous) => [...previous, ...bubbles]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const applyResponse = useCallback((response: ShortformTurnResponse) => {
    if (response.assistantMessage) append({ role: 'ai', content: response.assistantMessage });
    setRecommendation(response.recommendation);
    setOptions(response.action === 'CONFIRM' ? CONFIRM_OPTIONS : response.options ?? []);
  }, [append]);

  const begin = useCallback(async () => {
    if (!storeId || createSession.isPending) return;
    const oldSessionId = sessionId;
    setSessionId(undefined);
    setRecommendation(undefined);
    setOptions([]);
    setLog([]);
    setInput('');
    if (oldSessionId) {
      try {
        await discardShortformSession(oldSessionId);
      } catch {
        // 정리 실패가 새 대화 시작을 막아서는 안 됩니다.
      }
    }
    createSession.mutate(undefined, {
      onSuccess: (session) => {
        if (!mounted.current) return;
        setSessionId(Number(session.id));
        setOptions(session.options);
        setLog([
          { role: 'ai', content: session.assistantMessage ?? '오늘 어떤 영상을 찍을까요?' },
        ]);
      },
    });
  }, [createSession, sessionId, storeId]);

  useEffect(() => {
    mounted.current = true;
    if (storeId && !sessionId && log.length === 0 && !createSession.isPending) void begin();
    return () => {
      mounted.current = false;
    };
  }, [begin, createSession.isPending, log.length, sessionId, storeId]);

  const send = (inputValue: ShortformTurnInput, label: string) => {
    if (!sessionId || submitTurn.isPending) return;
    append({ role: 'me', content: label });
    setOptions([]);
    setRecommendation(undefined);
    submitTurn.mutate(inputValue, { onSuccess: applyResponse });
  };

  const pickOption = (option: ShortformOption) => {
    if (option.id === 'CONFIRM_TRUE') send({ type: 'CONFIRM', value: true }, option.label);
    else if (option.id === 'CONFIRM_FALSE') send({ type: 'CONFIRM', value: false }, option.label);
    else send({ type: 'OPTION', optionId: option.id }, option.label);
  };

  const sendText = () => {
    const value = input.trim();
    if (!value) return;
    setInput('');
    send({ type: 'TEXT', text: value }, value);
  };

  const accept = () => {
    acceptRecommendation.mutate(undefined, {
      onSuccess: (project) => {
        setSessionId(undefined);
        nav.navigate('Create', { screen: 'Camera', params: { projectId: Number(project.id) } });
      },
    });
  };

  const tryNext = () => {
    setRecommendation(undefined);
    nextRecommendation.mutate(undefined, { onSuccess: applyResponse });
  };

  const pending = createSession.isPending || submitTurn.isPending || nextRecommendation.isPending;
  const hasError = createSession.isError || submitTurn.isError || nextRecommendation.isError || acceptRecommendation.isError;

  return (
    <Screen padded={false} scroll={false} edges={['top']} background={color.surface}>
      <AppBar
        title="AI 숏폼 추천"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="대화 새로고침" hitSlop={6}
            onPress={() => void begin()} style={({ pressed }) => [styles.headerBtn, pressTap(pressed, 'icon')]}
          >
            <RotateCcw size={22} strokeWidth={2} color={color.ink[900]} />
          </Pressable>
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.chat} keyboardShouldPersistTaps="handled">
          {!storeId && <Banner tone="warn" title="가게 정보가 필요합니다" description="가게를 먼저 등록해 주세요." />}
          {log.map((bubble, index) => (
            <View key={`${bubble.role}-${index}`} style={[styles.bubbleRow, bubble.role === 'me' && styles.meRow]}>
              {bubble.role === 'ai' && <View style={styles.avatar}><Sparkles size={16} strokeWidth={2} color={color.paper} /></View>}
              <View style={[styles.bubble, bubble.role === 'me' ? styles.me : styles.ai]}>
                <Text style={[styles.bubbleText, bubble.role === 'me' && styles.meText]}>{bubble.content}</Text>
              </View>
            </View>
          ))}
          {pending && <Loading label="AI가 답변을 준비하는 중" />}
          {hasError && <Banner tone="warn" title="AI 추천을 이어가지 못했습니다" description="잠시 후 다시 시도하거나 오른쪽 위에서 새 대화를 시작해 주세요." />}
          {!pending && options.length > 0 && (
            <View style={styles.options}>
              {options.map((option) => (
                <Pressable key={option.id} accessibilityRole="button" onPress={() => pickOption(option)}
                  style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
                ><Text style={styles.optionText}>{option.label}</Text></Pressable>
              ))}
            </View>
          )}
          {recommendation && (
            <View style={styles.recommendation}>
              <Text style={styles.recommendationEyebrow}>AI 추천</Text>
              <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
              <Text style={styles.recommendationConcept}>{recommendation.concept}</Text>
              <View style={styles.recommendationActions}>
                <Pressable accessibilityRole="button" onPress={tryNext} style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.secondaryText}>다른 추천</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={accept} disabled={acceptRecommendation.isPending}
                  style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }]}
                ><Text style={styles.primaryText}>{acceptRecommendation.isPending ? '촬영 준비 중…' : '이 포맷으로 촬영하기'}</Text></Pressable>
              </View>
            </View>
          )}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput value={input} onChangeText={setInput} placeholder="직접 입력해 보세요" placeholderTextColor={color.ink[300]}
            style={styles.input} returnKeyType="send" onSubmitEditing={sendText} editable={!!sessionId && !pending && !recommendation}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="보내기" onPress={sendText}
            disabled={!input.trim() || pending || !!recommendation}
            style={({ pressed }) => [styles.send, (!input.trim() || pending || !!recommendation) && { opacity: 0.4 }, pressed && input.trim() ? { transform: [{ scale: 0.9 }] } : null]}
          ><ArrowUp size={20} strokeWidth={2} color={color.paper} /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chat: { paddingHorizontal: space[5], paddingTop: space[3], gap: space[3], paddingBottom: space[6] },
  bubbleRow: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
  meRow: { justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, marginTop: 2, borderRadius: radius.pill, backgroundColor: color.brand[600], alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  ai: { backgroundColor: color.paper, borderTopLeftRadius: radius.xs, ...theme.elevation('bubble') },
  me: { backgroundColor: color.brand[600], borderTopRightRadius: radius.xs },
  bubbleText: { ...text.body, lineHeight: 21 },
  meText: { color: color.paper },
  headerBtn: { width: sizing.iconButton, height: sizing.iconButton, marginRight: -6, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginLeft: 40 },
  option: { alignSelf: 'flex-start', paddingHorizontal: space[4], paddingVertical: 10, borderRadius: radius.pill, borderWidth: theme.border.hairline, borderColor: color.brand[300], backgroundColor: color.canvas },
  optionText: { ...theme.text.bodySmall, fontWeight: '600', color: color.brand[600] },
  recommendation: { marginLeft: 40, padding: space[4], gap: space[2], borderRadius: radius.lg, borderWidth: theme.border.hairline, borderColor: color.brand[300], backgroundColor: color.paper },
  recommendationEyebrow: { ...text.micro, color: color.brand[600] },
  recommendationTitle: { ...theme.text.heading, color: color.ink[900] },
  recommendationConcept: { ...text.body, color: color.ink[500] },
  recommendationActions: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
  secondaryButton: { paddingHorizontal: space[4], height: sizing.touchTargetMin, justifyContent: 'center', borderRadius: radius.pill, borderWidth: theme.border.hairline, borderColor: color.brand[400] },
  secondaryText: { ...text.body, color: color.brand[600] },
  primaryButton: { flex: 1, height: sizing.touchTargetMin, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: color.brand[600] },
  primaryText: { ...text.body, fontWeight: '600', color: color.paper },
  inputRow: { flexDirection: 'row', gap: space[2], padding: space[4], borderTopWidth: theme.border.hairline, borderTopColor: color.hairlineSoft, backgroundColor: color.canvas },
  input: { flex: 1, height: sizing.touchTargetMin, borderWidth: theme.border.hairline, borderColor: color.ink[200], borderRadius: radius.pill, backgroundColor: color.paper, paddingHorizontal: space[4], ...theme.text.body },
  send: { width: sizing.touchTargetMin, height: sizing.touchTargetMin, borderRadius: radius.pill, backgroundColor: color.brand[600], alignItems: 'center', justifyContent: 'center' },
});
