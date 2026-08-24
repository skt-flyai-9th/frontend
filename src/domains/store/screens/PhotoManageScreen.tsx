/**
 * S03.2.1 사진 업로드·분류 · 명세 3.3
 *
 * 왜 필요한가
 *   사진은 영상 소재입니다. 간판·내부·음식 사진이 없으면
 *   AI 가 만들 수 있는 장면이 크게 줄고, 사장님이 전부 새로 찍어야 합니다.
 *
 * 분류를 받는 이유
 *   명세 3.3 의 category 는 단순 라벨이 아닙니다.
 *   "간판" 사진은 영상 첫 장면에, "음식"은 상품 공개 구간에 쓰입니다.
 *   분류가 없으면 AI 가 아무 사진이나 아무 데나 씁니다.
 *
 * 민감 정보
 *   명세 응답에 has_sensitive_info 가 있습니다.
 *   손님 얼굴이나 개인정보가 찍힌 사진을 그냥 쓰면 문제가 됩니다.
 *   서버가 표시해 주면 화면에서 경고합니다.
 */
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomAction, Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Badge, Chip } from '../../../ui/Chip';
import { Banner, EmptyState, Loading } from '../../../ui/Feedback';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useAddPhoto, useDeletePhoto, usePhotos } from '../../../api/queries/store';
import { useCurrentStore } from '../../../lib/appState';
import type { StorePhoto } from '../../../api/schema/types';
import { PHOTO_CATEGORIES, type PhotoCategory } from '../../../api/schema/types';
import type { StoreStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<StoreStackParamList, 'PhotoManage'>;

/**
 * 명세 3.3 category. 영상에서 쓰이는 자리가 다릅니다.
 *
 * ⚠️ 값은 schema/types 의 PHOTO_CATEGORIES 를 그대로 씁니다 — 실서버 enum 입니다.
 *    예전에는 '음식' 을 보냈는데 서버 값은 '메뉴' 라 422 가 났습니다 (2026-08-26 대조).
 *    목록을 화면에서 따로 적어두면 또 어긋나므로 한 곳에서만 정의합니다.
 */
const CATEGORIES = PHOTO_CATEGORIES;
type Category = PhotoCategory;

/** 분류별로 영상 어디에 쓰이는지. 서버 enum 7종을 전부 덮습니다. */
const CATEGORY_USE: Record<Category, string> = {
  간판: '영상 첫 장면에 씁니다.',
  외관: '찾아오는 길을 보여줄 때 씁니다.',
  내부: '가게 분위기를 보여줄 때 씁니다.',
  메뉴: '메뉴를 보여주는 구간에 씁니다.',
  '제조·시술': '만드는 과정을 보여줄 때 씁니다.',
  인물: '사장님·직원이 나오는 장면에 씁니다.',
  기타: '참고용으로 보관합니다.',
};

export default function PhotoManageScreen({ navigation }: Props) {
  const storeId = useCurrentStore();
  const [filter, setFilter] = useState<Category | null>(null);
  const [pickedCategory, setPickedCategory] = useState<Category>('메뉴');

  const { data: photos, isLoading, isError, refetch } = usePhotos(storeId, filter ?? undefined);
  const addPhoto = useAddPhoto(storeId ?? 0);
  const deletePhoto = useDeletePhoto(storeId ?? 0);

  const upload = async (uri: string) => {
    addPhoto.mutate({ uri, category: pickedCategory });
  };

  const fromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('사진 권한이 필요합니다', '설정에서 사진 접근을 켜 주세요.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      // 여러 장을 한 번에 고를 수 있게 합니다 (명세 "다중 업로드").
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (res.canceled) return;
    for (const asset of res.assets) {
      await upload(asset.uri);
    }
  };

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('카메라 권한이 필요합니다', '설정에서 카메라를 켜 주세요.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled) return;
    await upload(res.assets[0].uri);
  };

  const remove = (photo: StorePhoto) => {
    Alert.alert('이 사진을 지울까요?', '지운 사진은 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => deletePhoto.mutate(photo.id) },
    ]);
  };

  const sensitive = photos?.filter((p) => p.hasSensitiveInfo) ?? [];

  if (isError) {
    return (
      <Screen
        footer={
          <BottomAction>
            <Button label="다시 시도" onPress={() => refetch()} />
          </BottomAction>
        }
      >
        <AppBar onBack={() => navigation.goBack()} title="가게 사진" />
        <EmptyState title="사진을 불러오지 못했습니다" />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <BottomAction>
          <View style={styles.uploadRow}>
            <Button
              label="사진 찍기"
              variant="secondary"
              onPress={fromCamera}
              loading={addPhoto.isPending}
            />
            <Button label="앨범에서 고르기" onPress={fromGallery} loading={addPhoto.isPending} />
          </View>
        </BottomAction>
      }
    >
      <AppBar onBack={() => navigation.goBack()} title="가게 사진" />

      {addPhoto.isError && (
        <Banner tone="danger" title="사진을 올리지 못했습니다" description="신호를 확인하고 다시 시도해 주세요." />
      )}

      <View style={{ gap: space[2] }}>
        <Text style={text.title}>가게 사진</Text>
        <Text style={text.bodySmall}>
          여기 올린 사진을 영상에 씁니다. 많을수록 찍을 게 줄어듭니다.
        </Text>
      </View>

      {sensitive.length > 0 && (
        <Banner
          tone="warn"
          title={`손님 얼굴이 찍힌 사진이 ${sensitive.length}장 있습니다`}
          description="영상에 쓰기 전에 확인해 주세요. 동의 없이 쓰면 문제가 될 수 있습니다."
        />
      )}

      {/* 올릴 때 붙일 분류 */}
      <View style={{ gap: space[2] }}>
        <Text style={text.micro}>새로 올릴 사진의 종류</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={pickedCategory === c}
              onPress={() => setPickedCategory(c)}
            />
          ))}
        </View>
        {/* 어디에 쓰이는지 알려줘야 사장님이 맞는 사진을 올립니다. */}
        <Text style={text.caption}>{CATEGORY_USE[pickedCategory] ?? '참고용으로 보관합니다.'}</Text>
      </View>

      {/* 목록 필터 */}
      <View style={styles.chips}>
        <Chip label="전체" selected={!filter} onPress={() => setFilter(null)} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={filter === c}
            onPress={() => setFilter(filter === c ? null : c)}
          />
        ))}
      </View>

      {isLoading && !photos && <Loading label="사진을 불러오는 중" />}

      {!isLoading && (photos?.length ?? 0) === 0 && (
        <EmptyState
          title={filter ? `${filter} 사진이 없습니다` : '아직 올린 사진이 없습니다'}
          description="간판과 대표 메뉴 사진부터 올려 보세요."
        />
      )}

      <View style={styles.grid}>
        {photos?.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${p.category} 사진, 눌러서 지우기`}
            onPress={() => remove(p)}
            style={({ pressed }) => [styles.cell, pressed && { opacity: theme.opacity.pressed }]}
          >
            <Image source={{ uri: p.fileUrl }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.cellFooter}>
              <Badge label={p.category} />
              {p.hasSensitiveInfo ? <Badge label="확인 필요" tone="warn" /> : null}
            </View>
          </Pressable>
        ))}
      </View>

      {(photos?.length ?? 0) > 0 && (
        <Text style={text.caption}>사진을 누르면 지울 수 있습니다.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  cell: { width: '47.5%', gap: space[2] },
  thumb: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: color.ink[100],
  },
  cellFooter: { flexDirection: 'row', gap: space[1], flexWrap: 'wrap' },
  uploadRow: { flexDirection: 'row', gap: space[3] },
});
