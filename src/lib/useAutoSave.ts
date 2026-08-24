/**
 * useAutoSave.ts — 만들던 영상의 진행 상황 저장 (명세 9.3)
 *
 * 왜 필요한가
 *   사장님은 장사 중에 앱을 씁니다. 손님이 오면 앱을 끄고, 전화가 오면 나갑니다.
 *   그때마다 촬영본과 설정이 날아가면 다시는 이 앱을 열지 않습니다.
 *
 *   홈 화면에 "만들던 영상이 있습니다"를 띄우려면
 *   서버에 어디까지 했는지가 저장돼 있어야 합니다.
 *
 * 언제 저장하나
 *   1. 화면이 바뀔 때 (단계 이동)
 *   2. 앱이 백그라운드로 갈 때  ← 이게 제일 중요합니다
 *   3. 화면을 떠날 때
 *
 * 저장이 실패해도 화면을 막지 않습니다. 저장은 보조 장치일 뿐입니다.
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSaveDraft } from '../api/queries/project';
import type { CurrentStep } from '../api/schema/types';

interface Options {
  projectId?: number;
  step: CurrentStep;
  /** 화면 복원에 필요한 값. 예: { lastTaskId: 702 } */
  state?: Record<string, unknown>;
}

export function useAutoSave({ projectId, step, state }: Options) {
  const saveDraft = useSaveDraft(projectId ?? 0);

  // 최신 값을 콜백에서 읽기 위한 ref. 의존성 배열 때문에 낡은 값이 저장되는 걸 막습니다.
  const latest = useRef({ step, state });
  latest.current = { step, state };

  const save = useCallback(() => {
    if (!projectId) return;
    saveDraft.mutate(
      { currentStep: latest.current.step, clientState: latest.current.state },
      {
        // 저장 실패는 조용히 넘깁니다. 사장님이 할 수 있는 일이 없습니다.
        onError: (e) => console.warn('[autosave] 저장 실패', e),
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // 단계가 바뀌면 저장
  useEffect(() => {
    save();
  }, [step, save]);

  // 앱이 백그라운드로 갈 때 저장 — 전화가 오거나 홈 버튼을 누른 경우
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') save();
    });
    return () => sub.remove();
  }, [save]);

  // 화면을 떠날 때 마지막으로 한 번
  useEffect(() => save, [save]);

  return { save, saving: saveDraft.isPending };
}
