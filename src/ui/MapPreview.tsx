/**
 * MapPreview — 시안 V4 `MapPreview` 자리에 **진짜 지도**를 넣습니다.
 *
 * 시안은 격자무늬 SVG 자리표시자입니다. 사장님이 자기 가게 위치를 확인하는
 * 자리라 가짜 지도를 띄우면 안 됩니다 — 2.1 검색이 좌표(latitude·longitude)를
 * 함께 주므로 그 좌표로 실제 지도를 그립니다.
 *
 * 그리는 방법: 지도 **타일 이미지**를 직접 깝니다.
 *   · 새 의존성이 없습니다. <Image> 만 씁니다 — 지도 SDK 도, API 키도 없습니다.
 *   · 임베드(iframe/WebView)를 쓰면 확대 버튼과 저작권 바가 함께 딸려 와
 *     시안과 달라지고, WebView 는 웹 빌드에서 아예 뜨지 않습니다.
 *   · 핀은 시안 원문 모양(파란 핀 34)을 우리가 그립니다.
 *
 * ─────────────────────────────────────────────────────────────
 * ⚠️ 타일 제공자를 바꿨습니다 (2026-08-26) — `tile.openstreetmap.org` 는 **403**
 * ─────────────────────────────────────────────────────────────
 * 실기기에서 지도가 안 뜬다는 보고가 있었습니다. 핀은 보이는데 지도만 빈 상자였고,
 * 타일 요청이 **403** 이었습니다. 좌표 문제가 아니라 **타일 서버가 막은 것**입니다.
 *
 * `tile.openstreetmap.org` 는 자원봉사로 돌아가는 서버라 **타일 사용 정책상 앱에서
 * 직접 쓰면 안 됩니다.** 개발 PC 에서는 200 이 떨어져서 눈치채지 못했는데,
 * 실기기·실사용 트래픽에서 막혔습니다 — 정책 위반이었던 것이지 버그가 아닙니다.
 *
 * 그래서 **CARTO 베이스맵**으로 옮깁니다. 같은 OpenStreetMap 데이터를 쓰지만
 * 앱·웹에서 쓰라고 만든 CDN 이고 API 키가 필요 없습니다. 표기만 지키면 됩니다
 * (아래 배지에 `© OpenStreetMap © CARTO`).
 *
 * 그리고 **타일이 안 내려오면 조용히 빈 상자로 두지 않습니다.** 한 장도 못 받으면
 * 격자 자리표시자로 되돌리고 "지도를 불러오지 못했습니다" 를 적습니다 —
 * 이번처럼 원인을 찾느라 헤매지 않도록.
 *
 * 좌표가 없을 때도 같은 격자 자리표시자를 그립니다(문구는 다릅니다).
 *
 * ─────────────────────────────────────────────────────────────
 * 손가락으로 확대·축소 (2026-08-26, 사장님 지시)
 * ─────────────────────────────────────────────────────────────
 * **핀은 언제나 상자 정중앙에 고정입니다.** 사장님 말씀대로, 지도를 만지다 핀이
 * 어디론가 밀려나면 "여기가 어디인지" 를 알려주는 지도의 목적이 사라집니다.
 * 그래서 **밀기(팬)는 없고 핀을 축으로 한 확대·축소만** 있습니다. 매장 좌표는
 * 무슨 짓을 해도 화면 한가운데 그대로 있습니다.
 *
 * 지도 타일은 **정수 배율만** 있습니다(z17, z18 …). 그래서 실제 지도 앱들과 같은
 * 방법을 씁니다 —
 *
 *   손가락을 벌리는 동안  타일은 그대로 두고 `scale` 로 늘려 보여주고
 *   손을 떼는 순간        가장 가까운 정수 배율의 타일을 새로 깔고 scale 을 1로
 *
 * 제스처는 RN 내장 `PanResponder` 로 잡습니다. `react-native-gesture-handler` 는
 * 이 프로젝트에 없고, 넣으면 **네이티브라 APK 를 다시 빌드해야** 합니다.
 * PanResponder 는 두 손가락 좌표를 그대로 주므로 그것만으로 충분하고,
 * 이 변경은 **OTA 로 나갑니다.**
 *
 * ⚠️ 캡처 단계에서 가로챕니다(`onMoveShouldSetPanResponderCapture`). 지도가
 *    스크롤 화면 안에 있어서, 안 그러면 두 손가락이 화면 스크롤로 먹힙니다.
 *    한 손가락은 그대로 흘려보내야 화면이 정상적으로 스크롤됩니다.
 *
 * 배율은 z15~z19 로 묶습니다. 더 넓히면 가게가 안 보이고, 더 당기면 타일이 없습니다.
 * 그리고 한 단계 바뀔 때마다 타일을 새로 받으므로 무한정 열어 두지 않습니다.
 *
 * 시안 규격: 높이 144(h-36) · 가운데 파란 핀 34 · 우하단 배지
 * 배지 문구는 시안의 "지도" 대신 출처를 적습니다 — 타일 제공자를 밝혀야 합니다.
 */
import React from 'react';
import { Animated, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';
import theme, { color, radius, space, text } from '../design/theme';

/** 시안 h-36 */
const HEIGHT = 144;
const TILE = 256;
/** 가게 하나가 보일 만한 배율. 17 은 건물이 구분되는 수준입니다. */
const ZOOM = 17;
/** 확대·축소 한계. 밖으로 나가면 가게가 안 보이거나 타일이 없습니다. */
const MIN_ZOOM = 15;
const MAX_ZOOM = 19;
/** 손가락으로 만들 수 있는 순간 배율. 이 범위를 넘겨 늘리지 않습니다. */
const MIN_SCALE = 0.6;
const MAX_SCALE = 2;

/**
 * 타일 주소. CARTO 베이스맵(OSM 데이터) — API 키 없이 앱에서 쓸 수 있습니다.
 * `voyager` 는 도로·상호가 또렷해서 가게 위치를 확인하는 용도에 맞습니다.
 */
const tileUrl = (z: number, x: number, y: number) =>
  `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;

interface Props {
  latitude?: number | null;
  longitude?: number | null;
  /** 지도 폭. 카드 안쪽 폭을 넘겨 주면 타일을 그만큼 채웁니다. */
  width?: number;
  /** 지도 높이. 시안 기본은 144, 매장 확인 시트는 196 입니다. */
  height?: number;
  /** 손가락으로 확대·축소할 수 있게 할지. 켜면 타일을 조금 더 넉넉히 받습니다. */
  zoomable?: boolean;
}

/** 위경도 → 타일 좌표 (Web Mercator) */
function toTile(lat: number, lng: number, z: number) {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  return { x, y };
}

/** 두 손가락 사이 거리. 배율은 이 값의 비로만 정합니다. */
function spread(touches: { pageX: number; pageY: number }[]) {
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function MapPreview({
  latitude,
  longitude,
  width = 345,
  height = HEIGHT,
  zoomable = false,
}: Props) {
  const hasPoint = typeof latitude === 'number' && typeof longitude === 'number';

  /**
   * 타일이 한 장이라도 내려왔는지 / 실패했는지.
   * 둘 다 세는 이유는 "아직 오는 중" 과 "막혔음" 을 구분하기 위해서입니다.
   */
  const [loaded, setLoaded] = React.useState(0);
  const [failed, setFailed] = React.useState(0);
  const [zoom, setZoom] = React.useState(ZOOM);

  /** 손가락을 벌리는 **동안**만 쓰는 임시 배율. 손을 떼면 1로 돌아갑니다. */
  const scale = React.useRef(new Animated.Value(1)).current;
  const start = React.useRef(0);
  const live = React.useRef(1);
  const zoomRef = React.useRef(ZOOM);
  zoomRef.current = zoom;

  React.useEffect(() => {
    setLoaded(0);
    setFailed(0);
    setZoom(ZOOM);
  }, [latitude, longitude]);

  const pan = React.useMemo(
    () =>
      PanResponder.create({
        // 한 손가락은 흘려보냅니다 — 화면 스크롤을 뺏으면 안 됩니다.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (e) => zoomable && e.nativeEvent.touches.length === 2,
        onPanResponderGrant: (e) => {
          if (e.nativeEvent.touches.length === 2) start.current = spread(e.nativeEvent.touches);
        },
        onPanResponderMove: (e) => {
          const t = e.nativeEvent.touches;
          if (t.length !== 2) return;
          if (!start.current) {
            start.current = spread(t);
            return;
          }
          const raw = spread(t) / start.current;
          /*
           * 한계 배율 밖으로는 늘어나지 않게 잡습니다. z19 에서 더 벌려도 안 커지고,
           * z15 에서 더 오므려도 안 작아집니다 — 놓을 자리가 없는데 늘려 보이면
           * 손을 뗐을 때 제자리로 튕겨서 고장난 것처럼 보입니다.
           */
          const lo = Math.max(MIN_SCALE, 2 ** (MIN_ZOOM - zoomRef.current));
          const hi = Math.min(MAX_SCALE, 2 ** (MAX_ZOOM - zoomRef.current));
          live.current = clamp(raw, lo, hi);
          scale.setValue(live.current);
        },
        onPanResponderRelease: () => {
          const next = clamp(Math.round(zoomRef.current + Math.log2(live.current)), MIN_ZOOM, MAX_ZOOM);
          start.current = 0;
          live.current = 1;
          // 타일 교체와 배율 복귀를 같이 해야 튀지 않습니다.
          scale.setValue(1);
          if (next !== zoomRef.current) {
            setLoaded(0);
            setFailed(0);
            setZoom(next);
          }
        },
        onPanResponderTerminate: () => {
          start.current = 0;
          live.current = 1;
          scale.setValue(1);
        },
      }),
    [scale, zoomable]
  );

  if (!hasPoint) {
    return (
      <View style={[styles.box, { height }]}>
        <Placeholder />
        <Badge label="지도" />
      </View>
    );
  }

  const { x, y } = toTile(latitude as number, longitude as number, zoom);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  // 중심 좌표가 상자 한가운데 오도록 타일 격자를 밀어 놓습니다.
  const left = width / 2 - (x - x0) * TILE;
  const top = height / 2 - (y - y0) * TILE;
  /*
   * 오므릴 때 가장자리가 비지 않도록 한 겹 더 받습니다. 벌릴 때는 보이는 범위가
   * 좁아지므로 여유가 필요 없습니다.
   */
  const cover = zoomable ? 1 / MIN_SCALE : 1;
  const cols = Math.ceil((width * cover) / TILE) + 2;
  const rows = Math.ceil((height * cover) / TILE) + 2;

  const tiles = [];
  for (let dx = -1; dx < cols - 1; dx++) {
    for (let dy = -1; dy < rows - 1; dy++) {
      tiles.push({ dx, dy });
    }
  }

  // 한 장도 못 받고 **전부** 실패했으면 지도를 포기하고 그렇게 말합니다.
  // (배율을 바꾼 직후 몇 장이 늦는 것을 실패로 오해하면 안 됩니다.)
  const tilesDown = loaded === 0 && failed >= tiles.length;
  if (tilesDown) {
    return (
      <View style={[styles.box, { width, height }]}>
        <Placeholder />
        <View pointerEvents="none" style={styles.downNote}>
          <Text style={styles.downText}>지도를 불러오지 못했습니다</Text>
        </View>
        <Badge label="지도" />
      </View>
    );
  }

  return (
    <View style={[styles.box, { width, height }]} {...pan.panHandlers}>
      {/*
        타일 겹만 확대합니다. 이 겹의 한가운데가 곧 매장 좌표이고 RN 의 transform 은
        가운데를 축으로 도므로, **핀은 어떤 배율에서도 정중앙에 그대로 있습니다.**
      */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
        {tiles.map(({ dx, dy }) => (
          <Image
            key={`${zoom}_${dx}_${dy}`}
            source={{ uri: tileUrl(zoom, x0 + dx, y0 + dy) }}
            onLoad={() => setLoaded((n) => n + 1)}
            onError={() => setFailed((n) => n + 1)}
            style={[styles.tile, { left: left + dx * TILE, top: top + dy * TILE }]}
          />
        ))}
      </Animated.View>
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
      <Badge label="© OpenStreetMap © CARTO" />
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
  box: { width: '100%', backgroundColor: '#E8EEF5', overflow: 'hidden' },
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
  // 타일이 안 올 때. 격자 위에 한 줄만 얹습니다.
  downNote: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  downText: {
    ...text.caption,
    color: color.ink[500],
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: space[3],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
});
