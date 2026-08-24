/**
 * LoadGate.tsx — 로딩·실패를 한 곳에서 처리합니다.
 *
 * 왜 필요한가
 *   화면마다 `if (isLoading) return <Loading />` 를 손으로 쓰면
 *   실패했을 때의 분기를 빼먹기 쉽습니다. 그러면 로딩이 영원히 돌고,
 *   사용자는 앱이 죽었다고 판단합니다. 실제로 그 사고가 여러 번 났습니다.
 *
 * 이 컴포넌트는 세 상태를 강제로 다룹니다.
 *   1. 로딩 중        → 스피너
 *   2. 실패           → 이유 + 다시 시도 + 돌아가기
 *   3. 응답은 왔는데 비어 있음 → 실패와 같게 취급
 *
 * 3번이 중요합니다. 서버가 200 을 주면서 빈 값을 보내면
 * isLoading 은 false 인데 화면은 그릴 게 없어 로딩에 머무릅니다.
 */
import React from 'react';
import { View } from 'react-native';
import { Button, BottomAction } from './Button';
import { EmptyState, Loading } from './Feedback';
import { space } from '../design/theme';

interface Props {
  loading: boolean;
  error?: boolean;
  /** 데이터가 준비됐는지. false 면 실패와 같게 다룹니다. */
  ready: boolean;
  loadingLabel?: string;
  errorTitle?: string;
  errorDescription?: string;
  onRetry?: () => void;
  onBack?: () => void;
  backLabel?: string;
  children: React.ReactNode;
}

export function LoadGate({
  loading,
  error,
  ready,
  loadingLabel = '불러오는 중',
  errorTitle = '불러오지 못했습니다',
  errorDescription = '신호를 확인하고 다시 시도해 주세요.',
  onRetry,
  onBack,
  backLabel = '돌아가기',
  children,
}: Props) {
  // 로딩이 끝났는데 데이터가 없으면 실패로 봅니다.
  const failed = error || (!loading && !ready);

  if (failed) {
    return (
      <View style={{ flex: 1, gap: space[4] }}>
        <EmptyState title={errorTitle} description={errorDescription} />
        <BottomAction>
          {onRetry && <Button label="다시 시도" onPress={onRetry} />}
          {onBack && (
            <Button
              label={backLabel}
              variant={onRetry ? 'quiet' : 'primary'}
              size={onRetry ? 'small' : 'large'}
              onPress={onBack}
            />
          )}
        </BottomAction>
      </View>
    );
  }

  if (loading) {
    return <Loading label={loadingLabel} />;
  }

  return <>{children}</>;
}
