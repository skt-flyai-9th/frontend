/**
 * mock/server.ts — BE 없이 화면을 완성하기 위한 가짜 서버.
 *
 * 원칙
 *  1. 명세의 경로·응답 구조를 그대로 흉내 냅니다. snake_case 그대로 돌려주고,
 *     http.ts 가 camelCase 로 변환합니다. 실서버와 완전히 같은 경로를 탑니다.
 *  2. 지연과 실패를 흉내 냅니다. 그래야 로딩·오류·재시도 UI 를 진짜로 검증할 수 있습니다.
 *  3. 상태를 조금 들고 있습니다(태스크 완료, 렌더 진행률). 안 그러면 흐름이 안 이어집니다.
 */
import { ApiError } from '../http';
import { toSnake } from '../schema/convert';
import * as fx from './fixtures';

const LATENCY_MS = 380;

/** 오류 화면을 테스트할 때 0.3 등으로 올리세요. */
const FAILURE_RATE = 0;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── 메모리 상태 ────────────────────────────────────────────
/** 태스크 완료 여부. 촬영 흐름이 이어지려면 상태가 남아야 합니다. */
const taskStatus = new Map<number, string>();
/** 평가를 몇 번 실행했는지. 실행 전 조회는 404 여야 합니다. */
const evalCount = new Map<number, number>();
/** 수정 요청 이력. 명세 14.3 revision_id 가 증가하는지 확인용입니다. */
let revisionSeq = 0;
let lastRevision: { type: string; action: string } | null = null;
/** 명세 14.1 target_platform. 15.1 출력과 일치해야 합니다. */
let editPlatform = 'INSTAGRAM';
/** 만들어진 출력 파일. 플랫폼을 추가하면 늘어납니다. */
let outputState: Record<string, unknown>[] = [];
/** 게시 상태. PENDING_LINK → LINKED 로 바뀝니다. */
let postState: Record<string, unknown> = {
  id: 901,
  post_platform: 'INSTAGRAM',
  post_status: 'PENDING_LINK',
  created_at: new Date().toISOString(),
};
/** 가져오기 / 렌더 진행률 시작 시각 */
const jobStartedAt = new Map<string, number>();
/** PATCH 로 바뀐 프로젝트 값. 화면을 오갈 때 유지돼야 합니다. */
let projectState: Record<string, unknown> = {};
/**
 * 가게 도메인 상태.
 *
 * ⚠️ 이걸 안 두면 추가·수정·삭제가 "성공했다" 고 응답만 하고
 *    목록을 다시 조회하면 원래 값이 그대로 나옵니다.
 *    사장님 눈에는 "저장이 안 되는 앱" 으로 보입니다.
 */
let storeState: Record<string, unknown> = { ...fx.store };
let menuState: Record<string, unknown>[] = fx.menus.map((m) => ({ ...m }));
let photoState: Record<string, unknown>[] = fx.photos.map((p) => ({ ...p }));
let targetState: Record<string, unknown>[] = fx.targetCustomers.map((t) => ({ ...t }));
/**
 * SNS 연동. 명세 16.1 GET (2026-08-21 신설) 이 목록을 내려주므로
 * Mock 도 연동을 상태로 들고 있어야 합니다 — 성공 응답만 하고 상태를
 * 안 바꾸면 GET 이 항상 빈 목록을 줘서 "연결했는데 연결 안 됨" 이 됩니다.
 * (§실기기 버그에서 배운 그 유형: 저장하고 다시 조회했을 때 반영되는가)
 */
let connectionState: Record<string, unknown>[] = [];
/**
 * 5.3 찜 (2026-08-23 신설). 계정 단위이므로 storeId 와 무관합니다.
 * POST/DELETE 는 멱등 — Set 이라 중복 add/delete 가 자연히 멱등이 됩니다.
 * 5.1·5.2 응답의 is_favorite 는 이 Set 에서 파생합니다. 상태를 두 곳에
 * 두면 반드시 어긋나므로(저장 안 되는 앱 사고 유형) 파생만 합니다.
 */
/**
 * 시안은 계정에 **이미 찜한 숏폼이 있는 상태**로 시작합니다
 * (홈 카드의 하트가 채워져 있고, 관심목록 탭에 그리드가 차 있습니다).
 * 빈 Set 으로 시작하면 두 화면이 모두 빈 상태로만 보여서 시안과 대조할 수가 없습니다.
 */
const FAVORITES_SEED = [71, 73];
let favoriteSet = new Set<number>(FAVORITES_SEED);
/** 3.6 로고. 업로드하면 실제로 3.1 응답이 바뀌어야 "저장 안 되는 앱" 이 안 됩니다. */
let logoUrl: string | null = null;
/** 1.5 회원정보. PATCH 가 실제로 반영돼야 재조회 검증이 됩니다. */
let meState: Record<string, unknown> = {};
let nextId = 9000;

/**
 * 15.2 완성 숏폼 갤러리.
 *
 * 🔴 여기가 "만들었는데 숏츠가 없다" 의 원인이었습니다 (2026-08-26).
 *    예전에는 fx.storeShorts 를 **그대로** 돌려줘서, 앱에서 영상을 끝까지 만들어도
 *    마이페이지 그리드·내 숏폼 뷰어에는 영영 나타나지 않았습니다.
 *    15.1 로 출력 파일이 만들어지면 실서버는 그 결과물이 15.2 에 잡힙니다.
 *    Mock 도 같은 일을 해야 합니다 — 이 프로젝트 제1규칙(저장은 상태를 실제로 바꾼다).
 */
let shortsState: Record<string, unknown>[] = fx.storeShorts.map((v) => ({ ...v }));

/** 콘티. 수정하면 반영돼야 하므로 복사본을 들고 있습니다. */
let sceneState: Record<string, unknown>[] = fx.scenes.map((s) => ({ ...s }));
/** 자동저장 상태. 이어하기가 정확한 지점으로 가려면 유지돼야 합니다. */
let draftState: Record<string, unknown> = {
  project_id: 1001,
  current_step: 'SETUP',
  client_state: null,
  last_saved_at: new Date().toISOString(),
};

function jobProgress(key: string, totalMs: number): number {
  const started = jobStartedAt.get(key);
  if (!started) {
    jobStartedAt.set(key, Date.now());
    return 0;
  }
  return Math.min(1, (Date.now() - started) / totalMs);
}

export function resetMockState() {
  taskStatus.clear();
  evalCount.clear();
  revisionSeq = 0;
  lastRevision = null;
  editPlatform = 'INSTAGRAM';
  outputState = [];
  postState = {
    id: 901,
    post_platform: 'INSTAGRAM',
    post_status: 'PENDING_LINK',
    created_at: new Date().toISOString(),
  };
  jobStartedAt.clear();
  projectState = {};
  sceneState = fx.scenes.map((s) => ({ ...s }));
  shortsState = fx.storeShorts.map((v) => ({ ...v }));
  storeState = { ...fx.store };
  menuState = fx.menus.map((m) => ({ ...m }));
  photoState = fx.photos.map((p) => ({ ...p }));
  targetState = fx.targetCustomers.map((t) => ({ ...t }));
  connectionState = [];
  favoriteSet = new Set(FAVORITES_SEED);
  logoUrl = null;
  meState = {};
  nextId = 9000;
  draftState = {
    project_id: 1001,
    current_step: 'SETUP',
    client_state: null,
    last_saved_at: new Date().toISOString(),
  };
}

// ── 경로 매칭 도우미 ───────────────────────────────────────
function match(path: string, pattern: RegExp): string[] | null {
  const clean = path.split('?')[0];
  const m = clean.match(pattern);
  return m ? m.slice(1) : null;
}

function query(path: string, key: string): string | undefined {
  const qs = path.split('?')[1];
  if (!qs) return undefined;
  const found = qs.split('&').find((p) => p.startsWith(`${key}=`));
  return found ? decodeURIComponent(found.split('=')[1]) : undefined;
}

// ── 라우팅 ─────────────────────────────────────────────────
export async function mockRequest<T>(
  path: string,
  method: string,
  rawBody?: unknown
): Promise<T> {
  /**
   * ⚠️ http.ts 는 toSnake **이전의** camelCase body 를 여기로 넘깁니다.
   * 실서버는 snake_case 를 받으므로, 입구에서 한 번 변환해
   * 핸들러들이 "실서버가 받는 모양" 그대로 읽게 합니다.
   *
   * 이 변환이 없던 동안 snake 키를 읽던 핸들러 6곳이 전부 undefined 를
   * 읽고 있었습니다 — 4.1 목적 유실, 4.2 검증 로직 전체 사(死)문화,
   * 8.2 상태 유실, 9.3 이어하기 유실, 16.3 연결확정 유실.
   * 전부 "성공 응답은 오는데 저장·검증이 안 되는" 조용한 실패였습니다.
   */
  const body: unknown = rawBody == null ? rawBody : toSnake(rawBody);
  await wait(LATENCY_MS);
  if (Math.random() < FAILURE_RATE) throw new ApiError(502, 'SEARCH_PROVIDER_ERROR');

  const p = path.split('?')[0];
  const send = <R,>(data: R) => data as unknown as T;

  // ── R01 계정 ─────────────────────────────────────────
  if (p === '/onboarding') return send(fx.onboarding);

  if (p === '/auth/signup' && method === 'POST') {
    const b = (body ?? {}) as Record<string, unknown>;
    return send({
      id: 1,
      // body 가 비어도 명세 응답 모양은 유지합니다.
      email: b.email ?? 'boss01@example.com',
      name: b.name ?? '김사장',
      is_active: true,
      terms_agreed: true,
      marketing_agreed: Boolean(b.marketingAgreed),
      agreed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  }
  if (p === '/auth/login' && method === 'POST') return send(fx.loginResponse);
  if (p === '/auth/logout') return send({ message: '로그아웃 되었습니다.' });
  if (p === '/auth/refresh') return send({ access_token: 'mock-access-token', expires_in: 3600 });
  if (p === '/users/me' && method === 'GET') {
    return send({ ...fx.me, ...meState });
  }
  if (p === '/users/me' && method === 'PATCH') {
    const b = (body ?? {}) as Record<string, unknown>;
    // 명세 1.5: 수정 가능 필드는 셋뿐. 그 외 키는 실서버처럼 400.
    const allowed = ['name', 'phone', 'marketing_agreed'];
    const bad = Object.keys(b).filter((k) => !allowed.includes(k));
    if (bad.length > 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', `수정할 수 없는 필드: ${bad.join(', ')}`);
    }
    Object.assign(meState, b);
    // 명세: 응답에는 바꾼 필드 + id + updated_at 만 담깁니다.
    return send({ id: fx.me.id, ...b, updated_at: new Date().toISOString() });
  }
  if (p === '/users/me' && method === 'DELETE') {
    return send({ message: '탈퇴가 완료되었습니다.', deleted_at: new Date().toISOString() });
  }

  // ── R02 가게 탐색 ────────────────────────────────────
  if (p === '/stores/search') {
    return send({ results: fx.searchPlaces(query(path, 'keyword') ?? '') });
  }
  if (p === '/stores' && method === 'POST') {
    jobStartedAt.delete('import');
    const b = (body ?? {}) as Record<string, unknown>;

    /**
     * 명세 2.2 kakao_place_id (2026-08-25).
     *
     * **저장하지 않습니다.** 명세가 "저장되지 않으며 대표메뉴 자동 수집을
     * 트리거하는 데만 쓰이고 버려진다" 고 못 박았습니다. 그래서 storeState 에
     * 넣지 않는 게 실서버와 같은 행동입니다 — 여기서만은 "저장은 상태를 실제로
     * 바꿔야 한다" 규칙의 예외이고, 그 근거가 명세에 있습니다.
     *
     * 대신 타입은 봅니다. 실서버가 문자열을 기대하는데 프론트가 숫자를 보내는
     * 실수는 조용히 지나가면 BE 붙일 때까지 안 드러납니다.
     */
    if (b.kakao_place_id != null && typeof b.kakao_place_id !== 'string') {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        `kakao_place_id 는 문자열입니다 (받은 값: ${typeof b.kakao_place_id})`
      );
    }

    return send({
      id: 10,
      name: b.name ?? fx.store.name,
      category: b.category ?? fx.store.category,
      address: b.address ?? fx.store.address,
      // body 는 입구에서 toSnake 를 거칩니다. camelCase 로 읽으면 늘 undefined 가
      // 되어 NAVER·KAKAO 로 등록해도 응답이 MANUAL 로 나갔습니다.
      info_source: b.info_source ?? 'MANUAL',
      import_status: 'IN_PROGRESS',
      created_at: new Date().toISOString(),
    });
  }
  if (match(p, /^\/stores\/(\d+)\/import-status$/)) {
    const ratio = jobProgress('import', 4000);
    const fields = ['기본정보', '메뉴', '사진', '리뷰', '상권분석'];
    const done = Math.floor(ratio * fields.length);
    return send({
      store_id: 10,
      overall_status: ratio >= 1 ? 'SUCCESS' : 'IN_PROGRESS',
      items: fields.map((field, i) => ({
        field,
        status: i < done ? 'SUCCESS' : i === done ? 'IN_PROGRESS' : 'PENDING',
      })),
    });
  }

  // ── R03 가게 인텔리전스 ──────────────────────────────
  if (match(p, /^\/stores\/(\d+)\/menus\/(\d+)$/)) {
    const menuId = Number(match(p, /^\/stores\/(\d+)\/menus\/(\d+)$/)![1]);
    const idx = menuState.findIndex((m) => m.id === menuId);
    if (idx < 0) throw new ApiError(404, 'UNKNOWN', '메뉴를 찾을 수 없습니다');

    if (method === 'DELETE') {
      menuState.splice(idx, 1);
      return send({ message: '메뉴가 삭제되었습니다.' });
    }
    // PATCH — 보낸 필드만 덮어씁니다.
    Object.assign(menuState[idx], (body ?? {}) as object);
    return send({ ...menuState[idx], updated_at: new Date().toISOString() });
  }
  if (match(p, /^\/stores\/(\d+)\/menus$/)) {
    if (method === 'POST') {
      const b = (body ?? {}) as Record<string, unknown>;
      const created = {
        id: ++nextId,
        image_url: null,
        is_new_menu: false,
        is_event_menu: false,
        is_sold_out: false,
        ...b,
      };
      menuState.push(created);
      return send({ ...created, created_at: new Date().toISOString() });
    }
    return send({ menus: menuState });
  }
  if (match(p, /^\/stores\/(\d+)\/photos\/(\d+)$/)) {
    const photoId = Number(match(p, /^\/stores\/(\d+)\/photos\/(\d+)$/)![1]);
    const idx = photoState.findIndex((x) => x.id === photoId);
    if (idx < 0) throw new ApiError(404, 'UNKNOWN', '사진을 찾을 수 없습니다');
    photoState.splice(idx, 1);
    return send({ message: '사진이 삭제되었습니다.' });
  }
  if (match(p, /^\/stores\/(\d+)\/photos$/)) {
    if (method === 'POST') {
      /**
       * multipart 라 body 가 FormData 입니다.
       * FormData 는 여기서 필드를 꺼낼 수 없으므로 category 는 기본값을 씁니다.
       * (실서버는 폼 필드에서 읽습니다)
       */
      const created = {
        id: ++nextId,
        file_url: `https://picsum.photos/seed/reals-${nextId}/800/600`,
        category: '음식',
        has_sensitive_info: false,
        created_at: new Date().toISOString(),
      };
      photoState.push(created);
      return send(created);
    }
    const cat = query(path, 'category');
    return send({ photos: cat ? photoState.filter((x) => x.category === cat) : photoState });
  }
  if (match(p, /^\/stores\/(\d+)\/target-customers\/(\d+)$/)) {
    const tid = Number(match(p, /^\/stores\/(\d+)\/target-customers\/(\d+)$/)![1]);
    const t = targetState.find((x) => x.id === tid);
    if (!t) throw new ApiError(404, 'UNKNOWN', '손님 정보를 찾을 수 없습니다');
    Object.assign(t, (body ?? {}) as object);
    return send({ ...t, updated_at: new Date().toISOString() });
  }
  if (match(p, /^\/stores\/(\d+)\/target-customers$/)) {
    if (method === 'POST') {
      const created = {
        id: ++nextId,
        ai_confidence: '낮음',
        status: 'CONFIRMED',
        ...((body ?? {}) as object),
      };
      targetState.push(created);
      return send({ ...created, created_at: new Date().toISOString() });
    }
    return send({ target_customers: targetState });
  }
  if (match(p, /^\/stores\/(\d+)\/insights$/)) {
    const type = query(path, 'type');
    return send({ insights: type ? fx.insights.filter((i) => i.insight_type === type) : fx.insights });
  }
  if (match(p, /^\/stores\/(\d+)$/)) {
    if (method === 'PATCH') {
      Object.assign(storeState, (body ?? {}) as object);
      storeState.updated_at = new Date().toISOString();
      return send(storeState);
    }
    // 3.6 으로 올린 로고가 3.1 재조회에 반영돼야 합니다.
    return send({ ...storeState, ...(logoUrl ? { logo_url: logoUrl } : {}) });
  }

  // ── R04 프로젝트 ─────────────────────────────────────
  if (p === '/shorts-projects') {
    if (method === 'POST') {
      // body 는 mockRequest 입구에서 toSnake 를 거친 snake_case 입니다.
      const b = (body ?? {}) as Record<string, unknown>;
      taskStatus.clear();
      jobStartedAt.delete('render');
      const purpose = b.promotion_purpose ?? '메뉴소개';
      // 새 프로젝트를 만들면 이전 설정을 버립니다.
      projectState = { promotion_purpose: purpose, shorts_status: 'DRAFT' };
      return send({
        id: 1001,
        store_id: b.store_id ?? 10,
        promotion_purpose: purpose,
        shorts_status: 'DRAFT',
        created_at: new Date().toISOString(),
      });
    }
    // 명세 4.1 GET Param: store_id, status
    const status = query(path, 'status');
    const list = [
      {
        ...fx.projectList[0],
        ...(projectState.promotion_purpose
          ? { promotion_purpose: projectState.promotion_purpose }
          : {}),
        ...(projectState.shorts_status ? { shorts_status: projectState.shorts_status } : {}),
      },
    ];
    return send({
      projects: status ? list.filter((x) => x.shorts_status === status) : list,
    });
  }
  if (match(p, /^\/shorts-projects\/(\d+)$/)) {
    if (method === 'PATCH') {
      // 명세 4.2: 보낸 값이 그대로 응답에 반영됩니다.
      // body 는 mockRequest 입구에서 toSnake 를 거친 snake_case 입니다.
      const patch = (body ?? {}) as Record<string, unknown>;

      /**
       * 명세 확정 (2026-08-23):
       *  - promotion_purpose 는 4.1 에서 정해지고 **변경 불가** — 4.2 body 에서 제거됨
       *  - video_format_id 저장 경로는 7.1 POST /plan 뿐 — 4.2 body 에서 제거됨
       * 프론트가 옛 습관으로 이 키들을 보내면 실서버처럼 400 을 줘서
       * Mock 단계에서 회귀를 잡습니다.
       */
      if ('promotion_purpose' in patch) {
        throw new ApiError(400, 'VALIDATION_ERROR', '목적은 생성 후 바꿀 수 없습니다 (4.2 에서 제거됨)');
      }
      if ('video_format_id' in patch) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'video_format_id 는 7.1 POST /plan 으로만 저장합니다');
      }

      // 명세 4.2: "목적에 맞지 않는 키를 보내면 400"
      // 서버 검증을 흉내 내야 프론트가 잘못된 키를 보내는지 잡을 수 있습니다.
      const purpose = (patch.promotion_purpose ?? projectState.promotion_purpose) as string;
      const detail = patch.promotion_detail as Record<string, unknown> | null | undefined;

      if (detail && purpose) {
        const allowed: Record<string, string[]> = {
          메뉴소개: ['detail_tag'],
          이벤트알리기: ['event_name', 'benefit', 'period', 'condition', 'limit', 'cta'],
          가게소개: ['elements'],
          고객늘리기: ['goal', 'success_metric'],
        };
        const keys = Object.keys(detail);
        const bad = keys.filter((k) => !(allowed[purpose] ?? []).includes(k));
        if (bad.length > 0) {
          throw new ApiError(400, 'VALIDATION_ERROR', `${purpose}에 맞지 않는 키: ${bad.join(', ')}`);
        }
      }

      // 명세 4.2: menu_id 는 메뉴소개일 때만 사용합니다.
      if (patch.menu_id != null && purpose !== '메뉴소개') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'menu_id 는 메뉴소개에서만 사용합니다');
      }

      Object.assign(projectState, patch);

      // 명세: 메뉴소개가 아니면 응답의 menu_id 는 null 입니다.
      if (purpose !== '메뉴소개') projectState.menu_id = null;

      return send({ ...fx.project, ...projectState, updated_at: new Date().toISOString() });
    }
    return send({ ...fx.project, ...projectState });
  }

  // ── 3.6 가게 로고 (2026-08-23 신설) ──────────────────
  if (match(p, /^\/stores\/(\d+)\/logo$/) && method === 'POST') {
    const sid = Number(match(p, /^\/stores\/(\d+)\/logo$/)![0]);
    // 가게당 1장. 다시 올리면 교체됩니다.
    // 실재하는 이미지를 줘야 업로드 직후 화면에서 실제로 보입니다 (가짜 도메인 금지)
    logoUrl = `https://picsum.photos/seed/logo${sid}_${Date.now()}/400/400`;
    return send({ store_id: sid, logo_url: logoUrl, updated_at: new Date().toISOString() });
  }

  // ── 15.2 완성 숏폼 목록 (2026-08-23 신설) ────────────
  if (match(p, /^\/stores\/(\d+)\/shorts$/)) {
    const page = Number(query(path, 'page') ?? 1);
    const size = Number(query(path, 'size') ?? 20);
    // 최신순이 위로. 방금 만든 영상이 그리드 첫 칸에 옵니다.
    const all = [...shortsState].sort(
      (a, b) => String(b.created_at).localeCompare(String(a.created_at))
    );
    return send({
      items: all.slice((page - 1) * size, page * size),
      page,
      size,
      total: all.length,
    });
  }

  // ── R05 포맷 ─────────────────────────────────────────
  // 5.3 (2026-08-23): 찜 목록 — 응답은 5.1 과 동일 구조입니다.
  if (p === '/video-formats/favorites') {
    return send({
      formats: fx.videoFormats
        .filter((f) => favoriteSet.has(f.id as number))
        .map((f) => ({ ...f, is_favorite: true })),
    });
  }
  // 5.3: 찜하기/해제 — 멱등. 응답만 주고 상태를 안 바꾸면 관심목록이 항상 비니다.
  if (match(p, /^\/video-formats\/(\d+)\/favorite$/)) {
    const id = Number(match(p, /^\/video-formats\/(\d+)\/favorite$/)![0]);
    if (method === 'POST') favoriteSet.add(id);
    if (method === 'DELETE') favoriteSet.delete(id);
    // 명세 5.3 응답 키는 video_format_id 입니다.
    return send({
      video_format_id: id,
      is_favorite: favoriteSet.has(id),
      created_at: new Date().toISOString(),
    });
  }
  if (match(p, /^\/video-formats\/(\d+)$/)) {
    const id = Number(match(p, /^\/video-formats\/(\d+)$/)![0]);
    const f = fx.videoFormats.find((x) => x.id === id) ?? fx.videoFormats[0];
    // 5.2 에도 is_favorite 포함 (5.3 신설에 따른 파생)
    return send({ ...f, is_favorite: favoriteSet.has(f.id as number) });
  }
  if (p === '/video-formats') {
    const level = query(path, 'face_exposure_level');
    const type = query(path, 'format_type');
    const keyword = query(path, 'keyword');
    const sort = query(path, 'sort');

    let list = fx.videoFormats;
    if (level) list = list.filter((f) => f.face_exposure_level === level);
    if (type) list = list.filter((f) => f.format_type === type);
    if (keyword) {
      list = list.filter(
        (f) => f.format_title.includes(keyword) || f.format_type.includes(keyword)
      );
    }
    if (sort === 'easy') {
      const order: Record<string, number> = { 하: 0, 중: 1, 상: 2 };
      list = [...list].sort(
        (a, b) => (order[a.shooting_difficulty] ?? 9) - (order[b.shooting_difficulty] ?? 9)
      );
    }

    // 2026-08-21 합의: 5.1 응답에도 reference_url·source_platform 이 포함됩니다.
    // 2026-08-23: is_favorite 도 포함 (5.3 신설).
    return send({
      formats: list.map((f) => ({ ...f, is_favorite: favoriteSet.has(f.id as number) })),
    });
  }

  // ── R06 질문형 ───────────────────────────────────────
  if (match(p, /^\/shorts-projects\/(\d+)\/quiz-questions$/)) {
    return send({ questions: fx.quizQuestions });
  }
  if (match(p, /^\/shorts-projects\/(\d+)\/quiz-answers$/)) {
    return send(fx.quizResult);
  }
  if (match(p, /^\/shorts-projects\/(\d+)\/quiz-alternatives$/)) {
    return send({ alternatives: fx.quizAlternatives });
  }

  // ── R07 기획·콘티 ────────────────────────────────────
  if (match(p, /^\/shorts-projects\/(\d+)\/plan$/)) {
    /**
     * 명세 확정 (2026-08-23): 7.1 이 video_format_id 의 **유일한** 저장 경로입니다.
     * 실서버처럼 프로젝트 상태에 저장해야 4.3 재조회("껐다 켰을 때")에
     * 고른 포맷이 남습니다 — 응답만 주고 상태를 안 바꾸면 그 검증이 죽습니다.
     */
    const b = (body ?? {}) as { video_format_id?: number };
    if (b.video_format_id != null) projectState.video_format_id = b.video_format_id;
    /**
     * 명세 4.3 (2026-08-26): project_title 은 **AI 가 7.1 기획 때** 지어줍니다.
     * 그 전에는 null 이라, 여기서 채워야 "기획 전 null → 기획 후 제목" 분기가
     * Mock 에서 실제로 검증됩니다. 응답만 주고 상태를 안 바꾸면 그 경로가 죽습니다.
     */
    projectState.project_title = '우리 가게 손칼국수, 이 국물 실화?';
    return send(fx.plan);
  }
  if (match(p, /^\/shorts-projects\/(\d+)\/scenes$/)) {
    if (method === 'PATCH') {
      // body 는 snake_case 입니다: { scenes: [{ id, scene_dialogue }] }
      const b = (body ?? {}) as { scenes?: Record<string, unknown>[] };
      const list = b.scenes ?? [];

      // 수정 내용을 실제로 반영합니다. 안 그러면 저장했는데 옛 값이 다시 보입니다.
      for (const patch of list) {
        const target = sceneState.find((x) => x.id === patch.id);
        if (target) Object.assign(target, patch);
      }
      return send({ message: '콘티가 수정되었습니다.', updated_count: list.length });
    }
    return send({ scenes: sceneState });
  }

  // ── R08 태스크 ───────────────────────────────────────
  if (match(p, /^\/shorts-projects\/(\d+)\/tasks$/)) {
    const list = fx.tasks.map((t) => ({
      ...t,
      task_status: taskStatus.get(t.id) ?? t.task_status,
    }));
    // 명세: 진행률은 DONE + RETAKE_NEEDED 기준입니다 (BE 확인 완료).
    const done = list.filter(
      (t) => t.task_status === 'DONE' || t.task_status === 'RETAKE_NEEDED'
    ).length;
    return send({
      progress_rate: Math.round((done / list.length) * 100),
      estimated_remaining_min: Math.max(0, (list.length - done) * 3),
      tasks: list,
    });
  }
  if (match(p, /^\/tasks\/(\d+)\/guide$/)) {
    const id = Number(match(p, /^\/tasks\/(\d+)\/guide$/)![0]);
    return send(fx.guides[id] ?? fx.guides[701]);
  }
  if (match(p, /^\/tasks\/(\d+)\/footage$/)) {
    const id = Number(match(p, /^\/tasks\/(\d+)\/footage$/)![0]);
    taskStatus.set(id, 'DONE');
    return send({
      task_id: id,
      footage_url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4?task=${id}`,
      footage_type: 'VIDEO',
      footage_duration_sec: 6,
      task_status: 'DONE',
    });
  }
  if (match(p, /^\/tasks\/(\d+)\/evaluate$/)) {
    const id = Number(match(p, /^\/tasks\/(\d+)\/evaluate$/)![0]);
    evalCount.set(id, (evalCount.get(id) ?? 0) + 1);
    /**
     * 재촬영 판정 표본 — 704 의 **첫 평가만** RETAKE_NEEDED 입니다.
     *
     * 이전에는 704 를 무조건 불합격으로 박아놔서, 실기기에서 마지막 컷을
     * 몇 번을 다시 찍어도 계속 "다시 찍으세요" 가 나왔습니다(2026-08-24 보고).
     * 재촬영 UX 는 한 번이면 검증됩니다. 다시 찍으면 통과해야 흐름이 끝까지 갑니다.
     */
    const bad = id === 704 && (evalCount.get(id) ?? 0) === 1;
    // 서버가 판정 결과를 태스크 상태에 반영합니다.
    taskStatus.set(id, bad ? 'RETAKE_NEEDED' : 'DONE');
    return send({
      task_id: id,
      ai_eval_score: bad ? 48.0 : 82.5,
      ai_is_usable: !bad,
      ai_eval_issues: bad
        ? '화면이 너무 어둡고 상품이 잘렸습니다.'
        : '약간 흔들림이 있으나 사용 가능한 수준입니다.',
      ai_evaluated_at: new Date().toISOString(),
    });
  }
  if (match(p, /^\/tasks\/(\d+)\/evaluation$/)) {
    const id = Number(match(p, /^\/tasks\/(\d+)\/evaluation$/)![0]);
    // 평가를 실행하지 않았으면 결과가 없는 게 맞습니다.
    if (!evalCount.has(id)) throw new ApiError(404, 'UNKNOWN', '평가 결과 없음');

    if (id === 704) {
      return send({
        task_id: id,
        total_score: 48.0,
        is_usable: false,
        must_retake_issues: [
          '화면이 어두워 무엇인지 알아보기 어렵습니다',
          '그릇 윗부분이 화면 밖으로 잘렸습니다',
        ],
        fixable_by_editing: ['앞뒤 빈 시간 → 자동으로 잘립니다'],
        ok_reasons: [],
      });
    }
    return send({ ...fx.evaluation, task_id: id });
  }
  if (match(p, /^\/tasks\/(\d+)$/) && method === 'PATCH') {
    const id = Number(match(p, /^\/tasks\/(\d+)$/)![0]);
    // 명세 8.2: action 없이 task_status 만 받습니다.
    // ENUM: NOT_STARTED / IN_PROGRESS / DONE / RETAKE_NEEDED (SKIPPED 없음)
    const b = (body ?? {}) as { task_status?: string };
    const ALLOWED = ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'RETAKE_NEEDED'];
    const next = b.task_status ?? 'DONE';
    if (!ALLOWED.includes(next)) {
      throw new ApiError(400, 'VALIDATION_ERROR', `허용되지 않는 상태값: ${next}`);
    }
    taskStatus.set(id, next);
    return send({ id, task_status: next, updated_at: new Date().toISOString() });
  }

  // ── R09.3 자동저장 ───────────────────────────────────
  if (match(p, /^\/shorts-projects\/(\d+)\/draft$/)) {
    if (method === 'PUT') {
      // body 는 snake_case 입니다.
      const b = (body ?? {}) as { current_step?: string; client_state?: unknown };
      draftState = {
        project_id: 1001,
        current_step: b.current_step ?? 'SHOOTING',
        client_state: b.client_state ?? null,
        last_saved_at: new Date().toISOString(),
      };
      return send({ message: '임시저장 되었습니다.', last_saved_at: draftState.last_saved_at });
    }
    return send(draftState);
  }

  // ── R14 편집 ─────────────────────────────────────────
  if (match(p, /^\/shorts-projects\/(\d+)\/edit\/result$/)) {
    const ratio = jobProgress('render', 9000);
    return send({
      video_output_id: 801,
      render_status: ratio >= 1 ? 'COMPLETED' : 'PROCESSING',
      progress_percent: Math.round(ratio * 100),
      // Mock 전용 샘플 — 실기기에서 완성본 재생을 확인할 수 있어야 합니다.
      preview_video_url: ratio >= 1 ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' : null,
      timeline_summary:
        ratio >= 1
          ? fx.scenes.map((s) => ({
              scene_order: s.scene_order,
              duration_sec: s.target_duration_sec,
              effect: '컷 전환',
            }))
          : [],
    });
  }
  if (match(p, /^\/shorts-projects\/(\d+)\/edit$/)) {
    const b = (body ?? {}) as { target_platform?: string };

    /**
     * 명세 14.1: 모든 태스크가 footage_url 을 가져야 편집이 시작됩니다.
     * 촬영본이 있는 상태는 DONE / RETAKE_NEEDED 뿐입니다.
     */
    const incomplete = fx.tasks
      .map((t) => ({ ...t, task_status: taskStatus.get(t.id) ?? t.task_status }))
      .filter((t) => t.task_status !== 'DONE' && t.task_status !== 'RETAKE_NEEDED');

    if (incomplete.length > 0) {
      throw new ApiError(
        400,
        'TASKS_INCOMPLETE',
        '아직 촬영하지 않은 태스크가 있어 편집을 시작할 수 없습니다.',
        { incomplete_tasks: incomplete.map((t) => ({ id: t.id, task_title: t.task_title })) }
      );
    }

    editPlatform = b.target_platform ?? 'INSTAGRAM';
    jobStartedAt.delete('render');
    jobProgress('render', 9000);
    return send({ video_output_id: 801, render_status: 'PENDING' });
  }
  if (match(p, /^\/video-outputs\/(\d+)\/revise$/)) {
    // 수정 요청은 렌더를 다시 시작시킵니다.
    jobStartedAt.delete('render');
    revisionSeq += 1;
    const b = (body ?? {}) as { request_type?: string; action?: string; free_text?: string };
    lastRevision = { type: b.request_type ?? 'quick_button', action: b.action ?? b.free_text ?? '' };
    return send({
      video_output_id: 801,
      render_status: 'PROCESSING',
      revision_id: revisionSeq,
    });
  }

  // ── R15 출력 ─────────────────────────────────────────
  if (match(p, /^\/shorts-projects\/(\d+)\/outputs$/)) {
    if (method === 'POST') {
      const b = (body ?? {}) as { target_platforms?: string[] };
      const want = b.target_platforms ?? ['INSTAGRAM'];
      // 고른 플랫폼만 만듭니다.
      for (const pf of want) {
        if (!outputState.some((o) => o.target_platform === pf)) {
          const base = fx.outputs.find((o) => o.target_platform === pf) ?? fx.outputs[0];
          outputState.push({ ...base, target_platform: pf, id: 800 + outputState.length + 1 });
        }
      }
      /**
       * 만들어진 결과물을 15.2 갤러리에도 올립니다.
       * 실서버에서 15.2 는 "렌더가 끝난 것" 목록이라, 출력 파일이 생기면 여기에 잡힙니다.
       * 프로젝트당 한 줄만 둡니다(플랫폼을 추가해도 같은 영상입니다).
       */
      // p 는 이미 쿼리스트링이 잘린 `/shorts-projects/{id}/outputs` 입니다.
      const pid = Number(p.split('/')[2]);
      const done = outputState.find((o) => o.render_status === 'COMPLETED') ?? outputState[0];
      if (done && !shortsState.some((v) => v.shorts_project_id === pid)) {
        shortsState.push({
          video_output_id: done.id,
          shorts_project_id: pid,
          // 7.1 이 지어준 제목. 아직 없으면 null 이고 화면이 목적으로 대체합니다.
          project_title: projectState.project_title ?? null,
          promotion_purpose: projectState.promotion_purpose ?? fx.project.promotion_purpose,
          video_url: done.video_url,
          cover_image_url: done.cover_image_url,
          duration_sec: null,
          is_posted: false,
          created_at: new Date().toISOString(),
        });
      }

      // 명세 15.1 (2026-08-21 확정): GET 도 POST 와 동일한 필드 구성입니다.
      return send({ outputs: outputState, publish_kit: fx.publishKit });
    }

    /**
     * 명세 15.1 GET (2026-08-21 확정): POST 와 동일한 필드 구성으로 맞춰졌습니다.
     * publish_kit·resolution·cover_image_url 이 GET 에도 옵니다 —
     * 화면을 나갔다 와도 게시 문구를 다시 받을 수 있습니다.
     * (이전 명세는 GET 필드가 적어 프론트가 POST 응답을 캐시로 살려 뒀습니다.)
     */
    return send(
      outputState.length > 0
        ? { outputs: outputState, publish_kit: fx.publishKit }
        : { outputs: [] }
    );
  }

  // ── R16 게시 ─────────────────────────────────────────
  /**
   * 16.1 OAuth 시작 (A 방식, 2026-08-23).
   *
   * 실서버는 authorize_url 만 주고 실제 연결은 브라우저·서버 콜백에서 끝납니다.
   * Mock 은 브라우저가 없으므로 **여기서 바로 연결까지 만들어 둡니다.**
   * 그래야 앱이 포그라운드로 돌아와 GET /sns-connections 를 다시 물었을 때
   * "늘어났다 → 성공" 경로를 그대로 검증할 수 있습니다.
   */
  if (p === '/sns-connections/authorize') {
    const platform = query(path, 'platform') ?? 'INSTAGRAM';
    // 명세 16.1 (2026-08-24): 연동은 두 플랫폼뿐입니다. NAVER Clip·TikTok 은
    // 성과 지표를 가져올 API 가 없어 제외 — 게시(16.2)와 다른 목록입니다.
    if (platform !== 'INSTAGRAM' && platform !== 'YOUTUBE') {
      throw new ApiError(400, 'UNSUPPORTED_PLATFORM', '연동은 인스타그램·유튜브만 지원합니다');
    }
    if (!connectionState.some((c) => c.sns_platform === platform)) {
      connectionState.push({
        id: ++nextId,
        sns_platform: platform,
        sns_account_name: platform === 'YOUTUBE' ? 'nangok_kalguksu_tv' : 'nangok_kalguksu',
        token_expires_at: '2026-11-19T00:00:00Z',
      });
    }
    return send({
      authorize_url: `https://example.com/mock-oauth?platform=${platform}&state=mock`,
    });
  }
  /**
   * 🔴 POST /sns-connections 는 명세에서 제거됐습니다(A 방식 전환).
   * 옛 코드가 되살아나면 여기서 바로 터지게 둡니다.
   */
  if (p === '/sns-connections' && method === 'POST') {
    throw new ApiError(410, 'ENDPOINT_REMOVED', 'POST /sns-connections 는 제거됐습니다. 16.1 authorize 를 쓰세요');
  }
  // 명세 16.1 GET (2026-08-21 신설) — 연동 목록. 앱 재시작 후 상태 복원용.
  if (p === '/sns-connections' && method === 'GET') {
    return send({ connections: connectionState });
  }
  if (match(p, /^\/sns-connections\/(\d+)$/)) {
    const cid = Number(match(p, /^\/sns-connections\/(\d+)$/)![0]);
    connectionState = connectionState.filter((c) => c.id !== cid);
    return send({ message: '연동이 해제되었습니다.' });
  }
  if (match(p, /^\/video-outputs\/(\d+)\/publish$/)) {
    return send({
      sns_post_id: 901,
      post_platform: (body as { platform?: string })?.platform ?? 'INSTAGRAM',
      post_status: 'PENDING_LINK',
      created_at: new Date().toISOString(),
    });
  }
  if (match(p, /^\/sns-posts\/(\d+)\/metrics$/)) {
    const id = Number(match(p, /^\/sns-posts\/(\d+)\/metrics$/)![0]);
    const from = query(path, 'from');
    const to = query(path, 'to');

    // 기간이 길수록 누적값이 큽니다. 기간 필터가 실제로 먹는지 보려면 필요합니다.
    const days = from && to
      ? Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000))
      : 7;
    const scale = Math.min(3, days / 7);

    return send({
      sns_post_id: id,
      metrics: fx.metrics.map((m) => ({
        ...m,
        metric_value: Math.round(m.metric_value * scale),
      })),
    });
  }
  if (p === '/sns-posts/compare') {
    /**
     * 명세 17.2 (2026-08-24): 플랫폼별로 나눠 호출하는 걸 전제로 합니다.
     * YouTube 는 reach·saves 가 없어 비율이 항상 null — 그 사실이 화면까지
     * 전달되는지 검증하려고 표본을 분리해 둡니다. platform 생략 시 혼합.
     */
    const pf = query(path, 'platform');
    if (pf === 'YOUTUBE') return send({ comparison: fx.comparisonYoutube });
    if (pf === 'INSTAGRAM') return send({ comparison: fx.comparison });
    return send({ comparison: [...fx.comparison, ...fx.comparisonYoutube] });
  }

  if (match(p, /^\/sns-posts\/(\d+)$/)) {
    if (method === 'PATCH') {
      const b = (body ?? {}) as { external_post_id?: string; posted_at?: string };
      postState = {
        ...postState,
        post_status: 'LINKED',
        external_post_id: b.external_post_id,
        posted_at: b.posted_at ?? new Date().toISOString(),
      };
      return send(postState);
    }
    return send(postState);
  }

  throw new ApiError(404, 'UNKNOWN', `mock: ${method} ${p} 라우트 없음`);
}
