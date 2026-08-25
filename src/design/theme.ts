/**
 * theme.ts — 토큰(JSON)을 앱에서 쓰기 좋은 형태로 감싸는 층.
 *
 * ⚠️ 디자이너는 이 파일을 수정하지 않습니다. tokens.json 만 수정하세요.
 * ⚠️ 개발자는 화면 코드에 hex 색상이나 숫자를 직접 쓰지 않습니다. 항상 theme 을 통해 씁니다.
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';
import tokens from './tokens.json';
import { USE_CUSTOM_FONTS } from './fonts';

export const color = {
  brand: tokens.color.brand,
  ink: tokens.color.ink,
  paper: tokens.color.paper,
  canvas: tokens.color.canvas,
  /** 섹션을 구분해야 할 때만 쓰는 옅은 회색. 기본 배경은 canvas(흰색)입니다. */
  surface: tokens.color.surface,
  /** 네이버 스마트플레이스 뱃지 전용색 */
  naver: tokens.color.naver,
  /** 비활성 버튼 배경·진행바 트랙 */
  track: tokens.color.track,
  /** 영상·카메라 배경용 순수 검정. UI 회색과 섞이면 영상이 떠 보입니다. */
  mediaBlack: tokens.color.mediaBlack,
  /** 사장님이 고르는 '우리 가게 색' 후보. 앱 브랜드색과 별개입니다. */
  storePalette: tokens.color.storePalette,
  done: tokens.color.done,
  warn: tokens.color.warn,
  danger: tokens.color.danger,
  overlay: tokens.color.overlay,
  /** 시안 --card-border: hairline 80%. 흰 카드 위 흰 카드를 가르는 선 */
  cardBorder: tokens.color.cardBorder,
  /** 시안 border-hairline/60: 앱바·탭바 구분선 */
  hairlineSoft: tokens.color.hairlineSoft,
} as const;

export const space = tokens.space;
export const radius = tokens.radius;
export const border = tokens.border;
export const sizing = tokens.size;
export const motion = tokens.motion;
export const opacity = tokens.opacity;
/**
 * 폰트 파일이 아직 없으면 undefined 를 넘겨 시스템 폰트로 떨어집니다.
 * 이렇게 해야 폰트 없이도 화면이 정상적으로 보입니다.
 */
function family(name: string): string | undefined {
  return USE_CUSTOM_FONTS ? name : undefined;
}

export const font = tokens.font;

/** 폰트 파일이 아직 없을 때도 앱이 죽지 않도록 시스템 폰트로 안전하게 떨어집니다. */
export const fontsLoadedFallback = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
}) as string;

type ElevationName = keyof typeof tokens.elevation;

/**
 * 그림자. 가이드라인 §3.3 — card / raised(누를 수 있는 카드) / bubble(말풍선) / sheet.
 *
 * 흰 배경 위에 흰 카드를 올리는 구조라 그림자가 유일한 층 구분 수단입니다.
 * 안드로이드는 elevation 이 없으면 그림자가 아예 안 나오므로 Platform.select 로 둘 다 냅니다.
 */
export function elevation(name: ElevationName): ViewStyle {
  const e = tokens.elevation[name];
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: e.shadowColor,
      shadowOpacity: e.shadowOpacity,
      shadowRadius: e.shadowRadius,
      shadowOffset: { width: 0, height: e.shadowOffsetY },
    },
    android: { elevation: e.androidElevation },
    default: {},
  })!;
}

/** 화면에서 쓰는 대표 텍스트 스타일. 새 스타일이 필요하면 여기 추가하고 화면에서 인라인으로 만들지 않습니다. */
/** 시스템 폰트로 떨어졌을 때 굵기를 대신 표현합니다. */
function weight(w: TextStyle['fontWeight']): TextStyle['fontWeight'] {
  return USE_CUSTOM_FONTS ? undefined : w;
}

/**
 * 시안 --ls-title: -0.02em — 굵은 제목 전부에 걸립니다.
 * RN 의 letterSpacing 은 px 단위라 크기별로 환산해 둡니다.
 */
function tightEm(size: number): number {
  return Math.round(size * font.letterSpacing.titleEm * 100) / 100;
}

export const text = {
  /** 24 · bold — 시안 최대 크기. 요금 같은 단일 숫자에만 씁니다. */
  display: {
    fontWeight: weight('700'),
    fontFamily: family(font.family.bold),
    fontSize: font.size.display,
    lineHeight: font.lineHeight.display,
    letterSpacing: tightEm(font.size.display),
    color: color.ink[900],
  },
  /** 22 · bold — 화면 헤드라인(h1/h2) */
  title: {
    fontWeight: weight('700'),
    fontFamily: family(font.family.bold),
    fontSize: font.size.title,
    lineHeight: font.lineHeight.title,
    letterSpacing: tightEm(font.size.title),
    color: color.ink[900],
  },
  /** 18 · bold — 앱바 타이틀·가게명 */
  heading: {
    fontWeight: weight('700'),
    fontFamily: family(font.family.bold),
    fontSize: font.size.heading,
    lineHeight: font.lineHeight.heading,
    letterSpacing: tightEm(font.size.heading),
    color: color.ink[900],
  },
  /** 16 · semibold — 카드 안 섹션 제목 */
  subheading: {
    fontWeight: weight('600'),
    fontFamily: family(font.family.semibold),
    fontSize: font.size.subheading,
    lineHeight: font.lineHeight.subheading,
    letterSpacing: tightEm(font.size.subheading),
    color: color.ink[900],
  },
  /** 15 · medium — 본문. 시안에서 가장 많이 쓰이는 크기입니다. */
  body: {
    fontWeight: weight('500'),
    fontFamily: family(font.family.medium),
    fontSize: font.size.body,
    lineHeight: font.lineHeight.body,
    letterSpacing: font.letterSpacing.normal,
    color: color.ink[800],
  },
  /** 15 · semibold — 강조 본문·목록 행 */
  bodyStrong: {
    fontWeight: weight('600'),
    fontFamily: family(font.family.semibold),
    fontSize: font.size.body,
    lineHeight: font.lineHeight.body,
    letterSpacing: font.letterSpacing.normal,
    color: color.ink[900],
  },
  /** 14 · medium — 설명·보조 문장 */
  bodySmall: {
    fontWeight: weight('500'),
    fontFamily: family(font.family.medium),
    fontSize: font.size.bodySmall,
    lineHeight: font.lineHeight.bodySmall,
    letterSpacing: font.letterSpacing.normal,
    color: color.ink[700],
  },
  /** 13 · medium — 도움말·메타 */
  caption: {
    fontWeight: weight('500'),
    fontFamily: family(font.family.medium),
    fontSize: font.size.caption,
    lineHeight: font.lineHeight.caption,
    letterSpacing: font.letterSpacing.normal,
    color: color.ink[500],
  },
  /** 13 · semibold — 칩 전용 */
  chipLabel: {
    fontWeight: weight('600'),
    fontFamily: family(font.family.semibold),
    fontSize: font.size.chip,
    lineHeight: font.lineHeight.chip,
    letterSpacing: font.letterSpacing.normal,
    color: color.ink[700],
  },
  /** 12 · semibold — 필드 라벨·카드 라벨 (시안 --fs-label) */
  label: {
    fontWeight: weight('600'),
    fontFamily: family(font.family.semibold),
    fontSize: font.size.label,
    lineHeight: font.lineHeight.label,
    letterSpacing: font.letterSpacing.normal,
    color: color.ink[500],
  },
  /** 11 · medium — 배지·해시태그·축 라벨 */
  micro: {
    fontWeight: weight('500'),
    fontFamily: family(font.family.medium),
    fontSize: font.size.micro,
    lineHeight: font.lineHeight.micro,
    letterSpacing: font.letterSpacing.normal,
    color: color.ink[500],
  },
  /** 10 · semibold — 미디어 위 최소 배지 */
  nano: {
    fontWeight: weight('600'),
    fontFamily: family(font.family.semibold),
    fontSize: font.size.nano,
    lineHeight: font.lineHeight.nano,
    letterSpacing: font.letterSpacing.normal,
    color: color.ink[500],
  },
  /** 15 · semibold — 버튼 */
  button: {
    fontWeight: weight('600'),
    fontFamily: family(font.family.semibold),
    fontSize: font.size.button,
    lineHeight: font.lineHeight.button,
    letterSpacing: font.letterSpacing.normal,
  },
} satisfies Record<string, TextStyle>;

export const theme = {
  color,
  font,
  space,
  radius,
  border,
  sizing,
  motion,
  opacity,
  text,
  elevation,
};

export type Theme = typeof theme;
export default theme;
