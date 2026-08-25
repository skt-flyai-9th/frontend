/**
 * MapPreview — 시안 V4 `MapPreview` 자리에 **진짜 지도**를 넣습니다.
 *
 * 시안은 격자무늬 SVG 자리표시자입니다. 사장님이 자기 가게 위치를 확인하는
 * 자리라 가짜 지도를 띄우면 안 됩니다 — 2.1 검색이 좌표(latitude·longitude)를
 * 함께 주므로 그 좌표로 실제 지도를 그립니다.
 *
 * 그리는 방법: OpenStreetMap **타일 이미지**를 직접 깝니다.
 *   · 새 의존성이 없습니다. <Image> 만 씁니다 — 지도 SDK 도, API 키도 없습니다.
 *   · 임베드(iframe/WebView)를 쓰면 확대 버튼과 저작권 바가 함께 딸려 와
 *     시안과 달라지고, WebView 는 웹 빌드에서 아예 뜨지 않습니다.
 *   · 핀은 시안 원문 모양(파란 핀 34)을 우리가 그립니다.
 *
 * 좌표가 없을 때만 시안과 같은 격자 자리표시자를 그립니다.
 *
 * 시안 규격: 높이 144(h-36) · 가운데 파란 핀 34 · 우하단 배지
 * 배지 문구는 시안의 "지도" 대신 출처를 적습니다 — 타일 제공자를 밝혀야 합니다.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';
import theme, { color, radius, space, text } from '../design/theme';

/** 시안 h-36 */
const HEIGHT = 144;
const TILE = 256;
/** 가게 하나가 보일 만한 배율. 17 은 건물이 구분되는 수준입니다. */
const ZOOM = 17;

interface Props {
  latitude?: number | null;
  longitude?: number | null;
  /** 지도 폭. 카드 안쪽 폭을 넘겨 주면 타일을 그만큼 채웁니다. */
  width?: number;
}

/** 위경도 → 타일 좌표 (Web Mercator) */
function toTile(lat: number, lng: number, z: number) {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  return { x, y };
}

export function MapPreview({ latitude, longitude, width = 345 }: Props) {
  const hasPoint = typeof latitude === 'number' && typeof longitude === 'number';

  if (!hasPoint) {
    return (
      <View style={styles.box}>
        <Placeholder />
        <Badge label="지도" />
      </View>
    );
  }

  const { x, y } = toTile(latitude as number, longitude as number, ZOOM);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  // 중심 좌표가 상자 한가운데 오도록 타일 격자를 밀어 놓습니다.
  const left = width / 2 - (x - x0) * TILE;
  const top = HEIGHT / 2 - (y - y0) * TILE;
  const cols = Math.ceil(width / TILE) + 2;
  const rows = Math.ceil(HEIGHT / TILE) + 2;

  const tiles = [];
  for (let dx = -1; dx < cols - 1; dx++) {
    for (let dy = -1; dy < rows - 1; dy++) {
      tiles.push({ dx, dy });
    }
  }

  return (
    <View style={[styles.box, { width }]}>
      {tiles.map(({ dx, dy }) => (
        <Image
          key={`${dx}_${dy}`}
          source={{ uri: `https://tile.openstreetmap.org/${ZOOM}/${x0 + dx}/${y0 + dy}.png` }}
          style={[styles.tile, { left: left + dx * TILE, top: top + dy * TILE }]}
        />
      ))}
      {/* 시안 원문 핀 — 끝이 좌표를 가리키도록 아래쪽으로 정렬합니다 */}
      <View pointerEvents="none" style={styles.pin}>
        <Svg width="34" height="34" viewBox="0 0 24 24">
          <Path
            d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
            fill={color.brand[600]}
            stroke={color.paper}
            strokeWidth={2.25}
          />
          <Circle cx="12" cy="10" r="3" fill={color.paper} />
        </Svg>
      </View>
      <Badge label="© OpenStreetMap" />
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View pointerEvents="none" style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

/** 시안 원문 격자 자리표시자. 좌표가 없을 때만 씁니다. */
function Placeholder() {
  return (
    <View style={styles.placeholder}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <Path d="M 28 0 L 0 0 0 28" fill="none" stroke="#CDD8E6" strokeWidth="1" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grid)" />
        <Line x1="0" y1="60%" x2="100%" y2="52%" stroke="#C2D0E2" strokeWidth="6" />
        <Line x1="38%" y1="0" x2="46%" y2="100%" stroke="#C2D0E2" strokeWidth="6" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: HEIGHT, width: '100%', backgroundColor: '#E8EEF5', overflow: 'hidden' },
  tile: { position: 'absolute', width: TILE, height: TILE },
  placeholder: { flex: 1 },
  // 핀 끝이 상자 정중앙을 가리키게 둡니다.
  pin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -17, marginTop: -34 },
  badge: {
    position: 'absolute',
    right: space[2],
    bottom: space[2],
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  badgeText: { ...theme.text.nano, fontWeight: text.body.fontWeight, color: color.ink[500] },
});
