/** S02.1.1 가게 통합검색 + S02.1.2 후보 비교 · 명세 2.1 */
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Chip';
import { EmptyState, ErrorState, Loading } from '../../../ui/Feedback';
import { Field } from '../../../ui/Field';
import { color, space, text } from '../../../design/theme';
import { useCreateStore, useStoreSearch } from '../../../api/queries/store';
import type { PlaceResult } from '../../../api/schema/types';
import type { StoreSetupStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<StoreSetupStackParamList, 'StoreSearch'>;

export default function StoreSearchScreen({ navigation }: Props) {
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const { data, isFetching, isError, refetch } = useStoreSearch(keyword);
  const createStore = useCreateStore();

  // 디바운스 — 글자마다 서버를 부르지 않습니다.
  useEffect(() => {
    const t = setTimeout(() => setKeyword(input), 350);
    return () => clearTimeout(t);
  }, [input]);

  const pick = (place: PlaceResult) => {
    createStore.mutate(
      {
        name: place.name,
        category: place.category,
        address: place.address,
        phone: place.phone,
        infoSource: place.source,
        // 명세 2.1 → 2.2 로 그대로 전달합니다.
        externalChannelUrl: place.externalChannelUrl,
        // 2.2 (2026-08-23): 검색이 준 좌표를 버리지 않고 그대로 저장시킵니다.
        latitude: place.latitude,
        longitude: place.longitude,
        /**
         * 2.2 (2026-08-25): 카카오 후보면 값이 있고 네이버면 null 입니다.
         * 우리가 만들거나 고르는 값이 아니라 2.1 이 준 걸 되돌려주는 것뿐입니다.
         * BE 가 이걸로 대표메뉴 자동 수집을 겁니다(저장은 안 됨).
         */
        kakaoPlaceId: place.kakaoPlaceId,
      },
      { onSuccess: (res) => navigation.replace('StoreConfirm', { storeId: res.id }) }
    );
  };

  const searching = keyword.trim().length >= 2;

  return (
    <Screen
      footer={
        <BottomAction>
          <Button
            label="검색 안 하고 직접 입력하기"
            variant="secondary"
            onPress={() => navigation.navigate('StoreManual')}
          />
        </BottomAction>
      }
    >
      <AppBar />
      <View style={{ gap: space[2] }}>
        <Text style={text.title}>가게를 찾아 주세요</Text>
        <Text style={text.bodySmall}>
          상호나 주소를 넣으면 메뉴와 영업시간을 자동으로 채워 드립니다.
        </Text>
      </View>

      <Field
        label="가게 이름"
        value={input}
        onChangeText={setInput}
        placeholder="예: 난곡신사 손칼국수"
        autoCorrect={false}
        returnKeyType="search"
      />

      {searching && isFetching && <Loading label="가게를 찾는 중" />}

      {searching && isError && (
        <ErrorState
          title="검색 서버에서 응답이 없습니다"
          description="직접 입력으로도 등록할 수 있습니다."
          onRetry={() => refetch()}
        />
      )}

      {searching && !isFetching && data?.length === 0 && (
        <EmptyState
          title="찾는 가게가 없습니다"
          description="상호를 조금 다르게 쓰거나, 직접 입력으로 등록해 주세요."
          actionLabel="직접 입력하기"
          onAction={() => navigation.navigate('StoreManual')}
        />
      )}

      {data?.map((place, i) => (
        <Card key={`${place.source}_${i}`} onPress={() => pick(place)}>
          <View style={{ gap: space[2] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[3] }}>
              <Text style={[text.subheading, { flex: 1 }]}>{place.name}</Text>
              <Badge label={place.source === 'NAVER' ? '네이버' : '카카오'} />
            </View>
            <Text style={text.bodySmall}>{place.address}</Text>
            <Text style={text.caption}>
              {place.category}
              {place.phone ? ` · ${place.phone}` : ''}
              {place.distanceM ? ` · ${place.distanceM}m` : ''}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={[text.caption, { color: color.brand[600] }]}>이 가게가 맞아요</Text>
            <ChevronRight size={14} strokeWidth={2} color={color.brand[600]} />
          </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
