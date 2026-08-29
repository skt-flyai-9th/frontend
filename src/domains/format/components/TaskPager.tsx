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
import { RotateCw, Sparkles } from 'lucide-react-native';

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

function Page({
  task,
  scene,
  index,
  total,
  width,
  videoUrl,
  active,
}: {
  task: ShootTask;
  scene?: StoryboardScene;
  index: number;
  total: number;
  width: number;
  videoUrl?: string | null;
  /** 지금 보이는 장인지. 보이는 장만 9.1 을 부르고 영상을 돌립니다. */
  active: boolean;
}) {
  const { data: guide } = useTaskGuide(active ? task.id : undefined);
  const ref = guide?.referenceVideo;
  const from = clock(ref?.startMs);
  const to = clock(ref?.endMs);

  /*
    제목은 컷(8.1)이, 설명은 장면(7.2)이 갖고 있습니다. 컷 제목이 서버에서
    9자로 잘려 오는 경우가 있어(2026-08-28 확인) 장면 쪽이 더 길면 그쪽을 씁니다.
  */
  const sc = splitText(scene?.sceneDescription);
  const tk = splitText(task.taskTitle);
  // 둘 다 있으면 **덜 잘린 쪽**을 제목으로 씁니다.
  const title = sc.title.length > tk.title.length ? sc.title : tk.title;
  /*
    설명은 네 갈래입니다.
      ① 장면이 "제목 — 설명" 이면 줄표 뒤가 설명입니다 (안무)
      ② 줄표가 없고 장면 글이 제목과 다르면 그 글이 설명입니다 (정보형 — 장면 설명이
         컷 제목보다 길게 옵니다)
      ③ 그래도 없으면 **대사**를 씁니다. 정보형에서 `scene_dialogue` 는 사장님이
         실제로 할 말이라(예: "난곡에서 30년 한 칼국수집입니다") 촬영 직전에 가장
         필요한 글입니다. 안무에서는 늘 비어 있어 자연히 넘어갑니다.
      ④ 다 없으면 설명 줄을 그리지 않습니다. 같은 말을 두 번 쓰지 않습니다.
  */
  const desc =
    sc.desc || (sc.title && sc.title !== title ? sc.title : '') || (scene?.sceneDialogue ?? '');

  return (
    <View style={{ width }}>
      <View style={styles.stage}>
        {videoUrl ? (
          <GuidePlayer
            url={videoUrl}
            /*
              ⚠️ `portrait` 를 쓰면 9:16(폭 393 → 높이 698)이 되어 **화면을 다 먹습니다.**
                 그러면 아래 컷 설명과 점이 화면 밖으로 밀립니다(첫 캡처에서 확인).
                 시안은 영상이 화면의 약 3분의 2고, 그 아래 카드가 보입니다.
                 `fullBleed` 만 쓰면 **3:4 검은 판**에 영상이 16:9 로 가운데 놓입니다 —
                 시안 그림과 같은 비율입니다.
            */
            fullBleed
            width={width}
            autoPlay={active}
            loopStart={ref?.startMs != null ? ref.startMs / 1000 : null}
            loopEnd={ref?.endMs != null ? ref.endMs / 1000 : null}
          />
        ) : (
          <View style={styles.stageEmpty}>
            <Text style={styles.stageEmptyText}>참고 영상이 준비되지 않았습니다</Text>
          </View>
        )}

        {/* 시안: 좌상단 `TASK 1 / 4` */}
        <View style={[styles.badge, styles.badgeLeft]} pointerEvents="none">
          <Text style={styles.badgeText}>
            TASK {index + 1} / {total}
          </Text>
        </View>

        {/* 시안: 우상단 `↻ 0:00 – 0:04 구간 반복`. 구간이 없으면 띄우지 않습니다. */}
        {from && to ? (
          <View style={[styles.badge, styles.badgeRight]} pointerEvents="none">
            <RotateCw size={12} strokeWidth={2.2} color={color.paper} />
            <Text style={styles.badgeText}>
              {from} – {to} 구간 반복
            </Text>
          </View>
        ) : null}
      </View>

      {/* 시안: 영상 아래 흰 카드 — 번호 + 제목, ✨ + 설명 */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.num}>{String(index + 1).padStart(2, '0')}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title || `컷 ${index + 1}`}
          </Text>
        </View>
        {desc ? (
          <View style={styles.descRow}>
            <Sparkles size={13} strokeWidth={2} color={color.brand[600]} />
            <Text style={styles.desc}>{desc}</Text>
          </View>
        ) : null}
      </View>
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
  const listRef = useRef<FlatList<ShootTask>>(null);

  /** 컷 ↔ 장면 짝. 컷이 `sceneId` 로 장면을 가리킵니다. */
  const sceneOf = useMemo(() => {
    const map = new Map<number, StoryboardScene>();
    (scenes ?? []).forEach((s) => map.set(Number(s.id), s));
    return map;
  }, [scenes]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      // 같은 값이면 state 를 건드리지 않습니다 — 넘기는 동안 매 프레임 다시 그려집니다.
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
      <FlatList
        ref={listRef}
        data={tasks}
        keyExtractor={(t) => String(t.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // 화면 밖 장은 그리지 않습니다 — 컷이 23개면 영상 23개가 한꺼번에 뜹니다.
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index }) => (
          <Page
            task={item}
            scene={item.sceneId != null ? sceneOf.get(Number(item.sceneId)) : undefined}
            index={index}
            total={tasks.length}
            width={width}
            videoUrl={videoUrl}
            active={index === page}
          />
        )}
      />

      {/*
        시안: 점 줄. 지금 장만 길쭉한 알약이고 나머지는 원입니다.
        컷이 많으면(정보형 23개) 점이 화면을 넘치므로 **가로로 밀리게** 둡니다.
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
