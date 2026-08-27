# AI 전달사항

**작성: 2026-08-27 (프론트엔드).** AI 레포(`AI-main`)와 백엔드 레포(`backend-develop`)를
직접 받아 읽고 정리했습니다. 파일·줄 번호는 그 스냅샷 기준입니다.

계기는 **하루 만에 $18 이 청구된 것**입니다. 사장님이 실기기에서 겪으신 증상은
"편집 화면이 몇 시간째 *편집중* 에서 안 끝나고, 그동안 요금은 계속 나갔다" 였습니다.
그 경로를 코드에서 찾았습니다.

```
확인 계정   realsqa0826@test.co.kr (user 25) · store 21
실측 렌더   정상일 때 345초 (5분 45초) — output 71 로 완성 확인
```

---

## 0. 한눈에

| | 항목 | 한 줄 |
|---|---|---|
| 🔴 | **고아 런이 무한히 재큐됩니다** | 상한이 없어 15~20분마다 영원히 다시 돌고, 매번 LLM 요금이 나갑니다 (§1) |
| 🔴 | **한 번의 편집 = 최대 4회 LLM 호출** | 복구 2회 + SOURCE_GAP 축소구조 1회가 겹칩니다 (§2) |
| 🟡 | 고아 판정 15분 vs 렌더러 타임아웃 30분 | 정상 렌더가 고아로 오인될 수 있습니다 (§3) |
| 🟡 | 촬영 가이드가 **템플릿 고정**이라 매장이 안 들어갑니다 | 카페 사장님께 "피자" 를 찍으라고 합니다 (§4) |
| ⚪ | `SOURCE_GAP` 이 `run.status` 에 들어가지 않습니다 | 계약엔 있는데 도달할 수 없는 값입니다 (§5) |

---

## 1. 🔴 고아 런 무한 재큐 — 요금이 여기서 샜습니다

```python
# app/core/config.py
editing_orphan_recovery_enabled     = True
editing_orphan_stale_seconds        = 900   # 15분 이상 RUNNING 이면 고아로 판정
editing_orphan_recovery_interval_seconds = 300   # 5분마다 점검

# app/workers/celery_app.py:72  beat_schedule
"task": "app.workers.tasks.recover_orphaned_editing_runs"

# app/workers/tasks.py  recover_orphaned_editing_runs()
run.status = "QUEUED"; run.stage = "QUEUED"; run.progress = 0
...
task = enqueue_editing_pipeline(run_id)      # ← 처음부터 다시 돌립니다
```

**시도 횟수 상한이 없습니다.** `EditingRun` 모델(`app/models/editing_run.py`)에도
시도 횟수 컬럼이 없고, 재큐 코드에도 카운터가 없습니다.

그래서 렌더가 한 번 멈추면 이렇게 됩니다.

```
RUNNING (멈춤)
 → 15분 뒤 고아 판정 → QUEUED → 재실행 → graph.invoke() 전부 다시  ← 요금
 → 또 멈춤 → 15분 뒤 → 재실행                                   ← 요금
 → … 끝이 없습니다
```

`acks_late=True` · `reject_on_worker_lost=True`(`app/workers/tasks.py:73`)도 같은 방향으로
작용합니다 — 워커가 죽으면 메시지가 재배달되고, 코드가 그걸 감지해 `QUEUED` 로 되돌린 뒤
**처음부터 다시** 돌립니다.

**부탁드립니다**
1. **재큐 시도 횟수에 상한**을 주세요 (2~3회면 충분합니다). `EditingRun` 에
   `recovery_attempts` 같은 컬럼 하나면 됩니다.
2. **상한을 넘으면 `FAILED` 로 확정**해 주세요. 그래야 화면이 사장님께 상황을 말하고,
   요금도 멈춥니다. 지금은 끝나지 않으니 앱이 "편집중" 만 계속 보여줍니다.
3. 가능하면 재큐 사유를 `error_message` 나 `warnings` 에 남겨 주세요.

> 참고로 **백엔드는 잘 막고 있습니다.** `video_edit.start_edit()` 이 진행 중
> (`PENDING`/`PROCESSING`) 산출물이 있으면 새로 걸지 않고 재사용합니다
> (`app/services/video_edit.py:122`). 사장님이 "다시 시도" 를 눌러서 늘어난 게 아니라
> **아무도 안 눌러도 서버가 스스로 돌리고 있었습니다.**

---

## 2. 🔴 한 번의 편집이 LLM 을 최대 네 번 부릅니다

```python
# app/core/config.py
editing_max_repair_attempts = 2        # 최초 1 + 복구 2 = 3회

# app/agents/editing/service.py  execute()
result = self.graph.invoke({...})                      # ① 최초
...
if decision.outcome == "SOURCE_GAP":
    reduced = self.graph.invoke({... "revision_action": "USE_REDUCED_STRUCTURE" ...})  # ② 한 번 더
```

즉 **한 런이 최대 4회**이고, §1 의 무한 재큐와 곱해집니다.
`recipe 검증 실패`(트림 2~4ms 초과)처럼 **반드시 실패하는 입력**이 들어오면 복구까지
전부 소진한 뒤 실패하고, 그게 15분마다 반복됩니다.

**부탁드립니다** — 복구 재시도 자체는 좋습니다. 다만 §1 상한이 없으면 이 배수가
그대로 요금이 됩니다. 둘은 같이 봐 주셔야 합니다.

---

## 3. 🟡 고아 판정(15분)이 렌더러 타임아웃(30분)보다 짧습니다

```python
editing_renderer_timeout_seconds = 1800   # 30분 — 렌더러가 여기까지 기다립니다
editing_orphan_stale_seconds     = 900    # 15분 — 그런데 15분이면 고아로 봅니다
```

렌더러가 20분째 **정상적으로 작업 중**이어도 고아 판정 조건(`RUNNING` + 15분 초과)에
걸립니다. 지금은 celery inspect 의 active 목록에 있으면 건너뛰도록 돼 있어
(`app/workers/tasks.py`) 대개 막히지만, **inspect 가 실패하면 그 방어가 통째로 꺼집니다**
(`return {"status": "inspector_unavailable"}` 전에 이미 통과한 경우 등).

**부탁드립니다** — `editing_orphan_stale_seconds` 를 렌더러 타임아웃보다 **크게**
잡아 주세요 (예: 2100~2400초). 지금은 정상 작업을 죽였다 다시 살리는 경로가 열려 있습니다.

---

## 4. 🟡 촬영 가이드가 템플릿에 고정돼 매장이 반영되지 않습니다

사장님이 "구간별로 나눠주는 글이 매번 똑같은 것 아니냐" 고 하셔서 확인했습니다.
**맞습니다. 그리고 설계가 그렇게 되어 있습니다.**

```python
# backend-develop/app/services/ai_client.py:308
del store, project  # 현재 AI 조회 계약은 템플릿 id와 버전만 받는다.

GET /api/v1/editing-templates/{editing_template_id}/versions/{version}/shooting-guide
```

백엔드는 가게·프로젝트를 받아 **그 자리에서 버리고**, 템플릿 id + 버전만으로 호출합니다.
주석에도 AI팀 지침이 인용돼 있습니다 — *"LLM이 매 요청마다 생성하지 않는다"*
(`docs/AI_연동_입출력.md` 13번).

**실측 — 한 번에 하나씩만 바꿔 6개 프로젝트로 대조했습니다 (전부 `video_format_id: 46`)**

| | 가게 | 목적 | 메뉴 | 결과 |
|---|---|---|---|---|
| project 66 | 21 스타벅스(카페) | 가게소개 | 0개 | 기준 |
| project 67 | 21 스타벅스(카페) | 가게소개 | 0개 | **완전히 동일** |
| project 69 | **36 순대국집(식당)** | 가게소개 | 0개 | **동일** |
| project 70 | 21 스타벅스 | **메뉴소개** | 0개 | **동일** |
| project 71 | 21 스타벅스 | 메뉴소개 | **3개 등록** | **동일** |

`scene_description` · `scene_dialogue` · `target_duration_sec` 이 6개 장면 전부
바이트 단위로 같습니다.

**문제는 "같다" 가 아니라 "내용이 우리 매장이 아니다" 입니다.** 스타벅스(카페)
사장님께 이렇게 나갑니다.

```
2) 1.50s~4.50s. 같은 테이블 프레임에서 음료와 장식된 디저트가 즉시 등장한 상태로 …
5) 8.50s~10.00s. 손을 여는 순간 피자 접시가 테이블 위에 즉시 등장한 상태를 …
1) 0.00s~1.50s. 초록색 상의의 여성이 테이블 앞에 앉아 손동작을 만들고 …
```

카페에 **피자**를, 사장님께 **"초록색 상의의 여성"** 을 찍으라고 합니다. 참고 영상
(원본 트렌드 영상)을 묘사한 글이 그대로 촬영 지시로 나가고 있습니다. 9.1 촬영 가이드
문구도 같습니다 — *"초록색 상의로 앉아 손동작을 만들고, 테이블 한쪽은 비워 둔다"*.

**부탁드립니다 — 둘 중 하나면 됩니다**
1. `shooting-guide` 가 **가게 컨텍스트를 받도록** 열어 주세요(가게명·업종·메뉴·목적).
   백엔드는 이미 `store`·`project` 를 손에 쥔 채 버리고 있어서, 계약만 바뀌면
   연결은 한 줄입니다.
2. 그게 어려우면 **원본 고유 묘사를 역할로 추상화**해 주세요.
   `"초록색 상의의 여성"` → `[출연자]`, `"피자 접시"` → `[대표 메뉴]`.
   실제로 **포맷 45 는 이미 그렇게 쓰여 있습니다** — *"대표 메뉴 Hero로 전환"*,
   *"공간 분위기 → 매장명 → 질문형 CTA"*. 그 서술 방식을 전 포맷에 적용하면
   적어도 "카페에 피자" 는 사라집니다.

**곁들여** — `scene_dialogue` 가 모든 포맷에서 비어 있습니다.
```
format 45 (project 50)  대사 0/6
format 46 (project 71)  대사 0/6
format  4 (project 58)  대사 0/5
```
명세 7.1 은 대사를 포함한다고 되어 있고 앱 기획 화면에 "이 장면에서 할 말" 자리가
있습니다. 지금은 그 자리가 항상 빕니다.

**그리고** `estimated_shooting_sec` 가 1800(30분)으로 옵니다 — 13초짜리 포맷인데
촬영 준비 화면에 "촬영 30분" 으로 찍힙니다. 장면 길이 합(9초)과도 안 맞습니다.

---

## 5. ⚪ `SOURCE_GAP` 이 `run.status` 에 들어가지 않습니다

계약(`EditingRunStatus`)에도 있고 백엔드 매핑에도 있는데
(`backend-develop/app/services/video_edit.py:41`), **실제로는 그 값이 세팅되지 않습니다.**

```python
# app/agents/editing/service.py  execute()
if decision.outcome == "SOURCE_GAP":
    run.missing_scene_roles = decision.missing_scene_roles
    run.warnings = [..., "SOURCE_ROLE_MATCH_FALLBACK: …"]
    reduced = self.graph.invoke(...)        # 축소구조로 재시도
    ... 실패하면 self._build_ordered_fallback(...)   # 순서 기반 폴백
# → 어느 경로든 결국 COMPLETED 또는 FAILED 로 끝납니다
```

`SOURCE_GAP` 이 `run.status` 에 대입되는 곳은 `create_revision` 의 **검사**뿐입니다.

**질문 두 가지**
1. 의도적으로 폴백만 하고 `SOURCE_GAP` 상태는 쓰지 않기로 하신 건가요?
2. 앞으로 쓰실 계획이라면 **미리 알려 주세요.** 지금 프론트에 그 값 처리가 없어서,
   내보내기 시작하는 순간 앱이 "편집중" 에서 멈춥니다. (저희가 먼저 방어를 넣겠습니다.)

---

## 6. 참고 — 프론트에서 저희가 고치는 것

AI 쪽 문제와 별개로, **프론트에도 요금을 태우는 자리가 하나 있어 고칩니다.**

편집 화면에 들어갈 때 마지막 렌더가 `FAILED` 면 **자동으로 새 편집을 걸고 있었습니다.**
들어갔다 나왔다 세 번이면 런 세 개입니다. 실패 화면을 보여주고 사장님이 직접
"다시 시도" 를 누를 때만 걸도록 바꿉니다.

함께 하는 것 — `SOURCE_GAP` 방어(§5), 재시도 연타 방지, 진행이 멈췄는지로 판정하는
타임아웃(지금은 화면 진입 후 15분 벽시계라 정상 렌더도 실패로 뒤집을 수 있습니다).

---

## 부록. 확인에 쓴 근거

```
AI  app/core/config.py            80,88,89,90,99   재시도·고아·렌더러 타임아웃 설정값
AI  app/workers/celery_app.py     39,40,72         task_time_limit · 고아 복구 beat
AI  app/workers/tasks.py          70~165           run_editing_pipeline · recover_orphaned_editing_runs
AI  app/agents/editing/service.py 170~300          execute() · SOURCE_GAP 폴백
AI  app/models/editing_run.py     14~38            시도 횟수 컬럼 없음
BE  app/services/video_edit.py    28~150           상태 매핑 · start_edit 재사용
BE  app/services/ai_client.py     290~372          get_shooting_guide (store/project 폐기)
실서버  project 66~71, output 59·61·63·65·66·69·71   대조 실험
```
