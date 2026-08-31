/**
 * TaskPager — 시안 `테스크가로변경점.png` · `테스크가로로변경.html`.
 *
 * 촬영 준비(잔잔한 릴스)와 안무 가이드가 **같은 모양**을 씁니다. 예전에는 컷을
 * 세로 목록으로 한 번에 늘어놓았는데, 이제 **한 번에 한 컷씩** 보여 주고 옆으로
 * 넘겨 다음 컷으로 갑니다. 넘기면 **그 컷에 해당하는 참고 영상 구간**이 함께 바뀝니다.
 *
 * 왜 바뀌었나 — 정보형 기획이 컷을 **23개**까지 줍니다(2026-08-28 실측).
 * 세로 목록으로 늘어놓으면 사장님이 스크롤만 하다 끝나고, 지금 뭘 찍어야 하는지가
 * 묻힙니다. 한 장에 하나씩이면 "지금 이거 하나" 가 분명해집니다.
 *
 * 시안 실측값
 *   영상    세로 꽉 참(9:16) · 검정 바닥
 *   좌상단  `TASK 1 / 4` — 12 semibold 흰색, 어두운 알약
 *   우상단  `↻ 0:00 – 0:04 구간 반복` — 같은 크기
 *   본문    번호 `01` 브랜드색 + 제목 16 semibold, 그 아래 ✨ + 설명 13
 *   점      현재 위치. 지금 것만 길쭉한 알약, 나머지는 원
 *
 * ⚠️ **구간은 컷마다 9.1 을 따로 불러야 합니다**(`reference_video.start_ms`).
 *    컷이 23개면 23번입니다. 그래서 **지금 보고 있는 컷 것만** 부릅니다 —
 *    넘길 때 그때 부르고, 되돌아오면 react-query 캐시에서 나옵니다.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';


import { GuidePlayer } from '../../../ui/GuidePlayer';
import { Loading } from '../../../ui/Feedback';
import { useTaskGuide } from '../../../api/queries/shoot';
import theme, { color, radius, space, text } from '../../../design/theme';
import type { ShootTask, StoryboardScene } from '../../../api/schema/types';

/** `4000` → `0:04`. 시안 표기 그대로입니다. */
function clock(ms?: number | null): string | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return null;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * 컷 제목·설명. 서버가 한 문장에 둘을 붙여 주는 경우가 있어 갈라 씁니다.
 *
 * 안무    `첫 안무를 큰 동작으로 — 팔과 상체를 크게…`   → 줄표로 나뉩니다
 * 정보형  `S1_BARISTA_PREP · 바리스타가 카운터에서…`     → 내부 코드가 앞에 붙습니다
 *
 * ⚠️ `S1_BARISTA_PREP` 같은 건 **서버 내부 코드**입니다. 사장님께 보일 글자가
 *    아니라 떼어 냅니다(2026-08-28 실측에서 확인).
 */
function splitText(raw?: string | null): { title: string; desc: string } {
  const v = (raw ?? '').trim();
  if (!v) return { title: '', desc: '' };
  // 앞머리의 내부 코드(대문자·숫자·밑줄) + 가운뎃점 제거
  const noCode = v.replace(/^[A-Z][A-Z0-9_]{3,}\s*·\s*/, '');
  const [head, ...rest] = noCode.split('—');
  return { title: head.trim(), desc: rest.join('—').trim() };
}

/** 카드 한 장 — 번호 · 제목 · 설명. 영상은 이 밖에 **하나만** 있습니다(TaskPager 주석). */
function Card({
  task,
  scene,
  index,
  width,
}: {
  task: ShootTask;
  scene?: StoryboardScene;
  index: number;
  width: number;
}) {
  /*
    제목은 컷(8.1)이, 설명은 장면(7.2)이 갖고 있습니다. 컷 제목이 서버에서
    9자로 잘려 오는 경우가 있어(2026-08-28 확인) 장면 쪽이 더 길면 그쪽을 씁니다.
  */
  const sc = splitText(scene?.sceneDescription);
  const tk = splitText(task.taskTitle);
  const title = sc.title.length > tk.title.length ? sc.title : tk.title;
  /*
    설명은 네 갈래입니다.
      ① 장면이 "제목 — 설명" 이면 줄표 뒤가 설명입니다 (안무)
      ② 줄표가 없고 장면 글이 제목과 다르면 그 글이 설명입니다 (정보형)
      ③ 그래도 없으면 **대사**를 씁니다. 정보형에서 `scene_dialogue` 는 사장님이
         실제로 할 말이라 촬영 직전에 가장 필요한 글입니다.
      ④ 다 없으면 설명 줄을 그리지 않습니다.
  */
  const desc =
    sc.desc || (sc.title && sc.title !== title ? sc.title : '') || (scene?.sceneDialogue ?? '');

  return (
    <View style={[styles.body, { width }]}>
      <View style={styles.titleRow}>
        <Text style={styles.num}>{String(index + 1).padStart(2, '0')}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {title || `컷 ${index + 1}`}
        </Text>
      </View>
      {/* 아이콘 없이 글자만 (2026-08-30 지시 ⑩: "AI 한줄 소개 앞에 이모티콘 삭제"). */}
      {desc ? <Text style={styles.desc}>{desc}</Text> : null}
    </View>
  );
}

export function TaskPager({
  tasks,
  scenes,
  videoUrl,
  loading,
}: {
  tasks: ShootTask[];
  scenes?: StoryboardScene[];
  videoUrl?: string | null;
  loading: boolean;
}) {
  const width = Dimensions.get('window').width;
  const [page, setPage] = useState(0);

  /** 컷 ↔ 장면 짝. 컷이 `sceneId` 로 장면을 가리킵니다. */
  const sceneOf = useMemo(() => {
    const map = new Map<number, StoryboardScene>();
    (scenes ?? []).forEach((s) => map.set(Number(s.id), s));
    return map;
  }, [scenes]);

  /** 지금 보고 있는 컷의 구간(9.1). 넘길 때마다 이것만 바뀝니다. */
  const current = tasks[page];
  const { data: guide } = useTaskGuide(current?.id);
  const ref = guide?.referenceVideo;

  /*
    🔴 **아직 안 온 구간 때문에 전체 영상이 재생되지 않게 합니다.**

    컷을 넘기면 그 컷의 9.1 을 새로 부릅니다. 응답이 오기 전까지는 `ref` 가
    비어 있는데, 그대로 넘기면 플레이어가 구간을 **풀어 버려**(`__clearLoop`)
    영상 전체가 돌아갑니다. 그래서 **새 값이 올 때까지 직전 구간을 붙들고**
    있습니다 — 잠깐 옆 구간이 도는 편이 통째로 도는 것보다 낫습니다.
  */
  const held = useRef<{ start: number; end: number } | null>(null);
  if (ref?.startMs != null && ref?.endMs != null) {
    held.current = { start: ref.startMs / 1000, end: ref.endMs / 1000 };
  }
  const loop = ref?.startMs != null && ref?.endMs != null
    ? { start: ref.startMs / 1000, end: ref.endMs / 1000 }
    : held.current;

  const from = clock(ref?.startMs);
  const to = clock(ref?.endMs);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setPage((p) => (p === next ? p : next));
    },
    [width]
  );

  if (loading) return <Loading label="촬영 컷을 만드는 중" />;
  if (tasks.length === 0) {
    return (
      <Text style={styles.empty}>촬영 준비를 시작하면 이 방식에 맞는 컷 구성이 만들어집니다.</Text>
    );
  }

  return (
    <View>
      {/*
        🔴 **영상은 화면에 하나뿐입니다** (2026-08-29 실기기 버그 수정).

        처음에는 카드마다 플레이어를 하나씩 두고 `autoPlay={active}` 로 껐다 켰습니다.
        그런데 **첫 카드만 구간 반복이 되고 넘긴 뒤에는 전체 영상이 재생**됐습니다.

        원인 — `autoPlay` 가 `GuidePlayer` 의 `frameHtml` 의존성에 들어 있어
        값이 바뀌면 **iframe 이 다시 뜹니다.** 다시 뜨면 주입해 둔 `__setLoop` 이
        사라지는데, `phase` 는 이미 `'ready'` 라 값이 안 바뀌어 **구간을 다시 걸어
        주는 사람이 없었습니다.**

        어차피 컷들이 **같은 영상**을 봅니다. 그래서 플레이어는 하나만 두고 넘길 때마다
        **구간만 갈아끼웁니다** — 그게 `GuidePlayer` 가 원래 설계된 방식이고
        (주소는 그대로, `__setLoop` 만 다시 부름) iframe 이 다시 뜰 일이 없습니다.
        덤으로 영상이 세 개 동시에 돌던 것도 없어집니다.
      */}
      <View style={styles.stage}>
        {videoUrl ? (
          <GuidePlayer
            url={videoUrl}
            /*
              ⚠️ `portrait`(9:16) 를 쓰면 폭 393 에 높이 698 이라 화면을 다 먹어
                 아래 카드와 점이 밀려납니다. `fullBleed` 는 3:4 검은 판에 영상을
                 가운데 놓습니다 — 시안 비율입니다.
            */
            fullBleed
            width={width}
            autoPlay
            loopStart={loop?.start ?? null}
            loopEnd={loop?.end ?? null}
          />
        ) : (
          <View style={styles.stageEmpty}>
            <Text style={styles.stageEmptyText}>참고 영상이 준비되지 않았습니다</Text>
          </View>
        )}

        {/*
          🔴 **영상 위에 얹던 배지 두 개를 뺐습니다** (2026-08-30 지시 ⑩:
             "임베딩 영상 상단에 Task, 구간반복 이 부분 삭제").

          좌상단 `TASK 1 / 4` 와 우상단 `↻ 0:00–0:04 구간 반복` 이었습니다.
          지시이기도 하지만 **약관상으로도 지워야 하는 것**이었습니다 — 유튜브
          임베드 위에는 아무것도 얹을 수 없습니다(CLAUDE.md §8-1).

          몇 번째 컷인지는 아래 카드에 이미 번호가 있고, 구간 반복은 눈으로 보면
          알 수 있습니다.
        */}
      </View>

      {/* 카드만 옆으로 넘어갑니다. 영상은 위에 그대로 있습니다. */}
      <FlatList
        data={tasks}
        keyExtractor={(t) => String(t.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index }) => (
          <Card
            task={item}
            scene={item.sceneId != null ? sceneOf.get(Number(item.sceneId)) : undefined}
            index={index}
            width={width}
          />
        )}
      />

      {/*
        시안: 점 줄. 지금 장만 길쭉한 알약이고 나머지는 원입니다.
        컷이 많으면(정보형 23개) 점이 화면을 넘치므로 줄바꿈으로 둡니다.
      */}
      <View style={styles.dots}>
        {tasks.map((t, i) => (
          <View key={t.id} style={[styles.dot, i === page && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* 시안: 영상이 화면 폭을 꽉 채우고 세로로 깁니다. */
  stage: { backgroundColor: color.ink[900], justifyContent: 'center' },
  stageEmpty: { aspectRatio: 3 / 4, alignItems: 'center', justifyContent: 'center' },
  stageEmptyText: { ...theme.text.caption, color: color.ink[400] },

  /* 시안: 어두운 알약 배지 — 12 semibold 흰 글자 */
  badge: {
    position: 'absolute',
    top: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  badgeLeft: { left: space[4] },
  badgeRight: { right: space[4] },
  badgeText: {
    ...theme.text.label,
    fontFamily: theme.text.chipLabel.fontFamily,
    fontWeight: theme.text.chipLabel.fontWeight,
    color: color.paper,
  },

  body: { paddingHorizontal: space[5], paddingTop: space[4], gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  /* 시안: `01` 브랜드색 굵게 */
  num: {
    ...text.bodySmall,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
    color: color.brand[600],
  },
  title: { ...theme.text.subheading, flex: 1, minWidth: 0 },
  descRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  /* 시안: 13 · leading-relaxed(×1.625) · slate */
  desc: { ...theme.text.caption, lineHeight: 21, flex: 1, minWidth: 0, color: color.ink[500] },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingTop: space[3],
    paddingHorizontal: space[5],
    flexWrap: 'wrap',
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: color.ink[200] },
  /* 지금 장 — 시안은 알약처럼 길쭉합니다 */
  dotOn: { width: 16, backgroundColor: color.brand[600] },

  empty: { ...text.bodySmall, paddingHorizontal: space[5], color: color.ink[500] },
});
