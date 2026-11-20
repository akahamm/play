# game/js — 폴더가 곧 층(11-14 큰 짜임 다섯째)

나중에 앱 · 스팀으로 옮기거나 테마만 바꾼 새 게임을 만들 때 **갈아 끼울 것과 그대로 둘 것**을 폴더로 갈라 둠. 지금은 자리를 잡아 둔 것이고, 아래 '아직 섞인 곳'이 남아 있음.

| 층 | 폴더 | 무엇 | 옮기거나 테마를 바꿀 때 |
|---|---|---|---|
| ① 뼈대 | `core/` | 자료 읽기 · 주사위 · 글 채우기(`data`) · 상태 틀(`state`) · 날짜 셈(`time`) · 조건과 효과 · 카드 고르기(`events`) · 땅 사기 틀(`land` — 자료로 돎) · 저장(`save`) · '다음 화면 묻기 / 답하기' 고리(`flow`) | 그대로 씀 |
| ② 이 게임 규칙 | `rules/` | 뼈대가 묻는 이름표(`game`) · 한 주 칸의 행동(`actions`) · 주 결산(`settle`) · 진급 · 독립(`promo`) · 가게(`shop`) · 2막(`r2`) · 돈 고리(`loop` — 숫자는 자료의 `loop_numbers` 를 실릴 때 한 번 잡아 `SH.LOOP_N` 으로) | 테마를 바꾸면 갈아 끼움 |
| ③ 글 · 그림 · 소리 | `../../data/` · `../img/` · `../snd/` · `../fonts/` | 카드 · 대사 · 인물 · 장소 · 숫자(기획 문서와 숫자 한 장 `04_시범/게임_숫자.json` 에서 `tools/build_data.py` 가 만듦) · 그림 · 곡 · 글꼴 | 테마를 바꾸면 갈아 끼움 |
| ④ 틀과 화면 | `ui/` · `map2/` | 화면 그리기 · 누르기 · 소리 내기 · 지도 · 저장소 꽂기(`SH.store`) · 그림 경로(`SH.PATHS`) | 앱 · 스팀으로 옮길 때 새로 씀 |

## 싣는 차례 (폴더와 따로 — 바꾸지 말 것)
`core/data → rules/game → core/state → core/time → core/events → rules/actions → rules/settle → rules/promo → rules/shop → rules/r2 → core/land → rules/loop → core/save → core/flow → map2/* → ui/*`
- 이 차례는 세 곳에 같이 적혀 있음: `game/index.html` 의 엔진 `<script>` · `tools/engine.js` 의 `ENGINE`(로봇 · 값 시험이 엔진을 싣는 곳 — 둘이 다르면 도구가 멈춤) · 이 글.
- 엔진 파일은 모두 전역 `SH` 하나에 붙음. 뼈대와 규칙이 서로를 실행 중에 부르므로(예: `core/flow` 가 `SH.loopSettle` 을 부름) 폴더가 갈려도 차례는 섞여 있음.

## 시험이 지키는 약속 (어기면 `tools/verify.sh` · 빠른 관문 `tools/gate.sh` 가 실패)
지금 값은 여기 적지 않음(적어 두면 낡음 — 11-15) → `python3 tools/code_caps.py` · `node tools/core_names.js` · `node tools/lint_globals.js` 가 찍음. 바꿀 때 지킬 것 전체는 `04_시범/CLAUDE.md`.
| 약속 | 도구 |
|---|---|
| 뼈대(`core/`)에 이 게임의 인물 · 장소 · 카드 · 물건 · 종목 · 행동 · 직급 id 와 날짜 글을 더 박지 않음(남은 하나는 상태 칸 이름 `st.wk.rest` — 저장에 든 이름이라 그대로) | `node tools/core_names.js max 1` |
| 층마다 코드 속 한글 글자 수가 늘지 않음(내용 글은 자료에) | `python3 tools/code_caps.py` |
| 뼈대가 규칙 파일의 이름을 더 부르지 않음(의존은 규칙 → 뼈대 한 방향 · 0 으로 뒤집는 일은 앱 · 스팀으로 옮길 때) | 같은 도구 |
| 규칙 · 뼈대 코드의 '값 꼴' 숫자(소수 · 없으면-이-값)가 늘지 않음 — 어림이라 경보로 봄(값은 `게임_숫자.json` 에) · 새로 더한 숫자 자리는 `tools/new_nums.py` | 같은 도구 |
| 검사가 못 보는 자리가 늘지 않음 — 네 층 폴더 바로 아래가 아닌 js 파일(0) · html 안에 직접 쓴 코드 | 같은 도구 |
| 게임도 도구도 안 읽는 칸을 자료에 싣지 않음(안 싣는 칸은 `tools/data_drop.json`) | `python3 tools/data_use.py` |
| 화면 전역 이름이 늘지 않음 | `node tools/lint_globals.js` |
| 싣는 차례가 `index.html` 과 도구에서 같음 | `tools/engine.js` |

- 뼈대가 이 게임 이름이 필요할 때 읽는 곳: 직급의 첫 · 꼭대기 · 갈래(`SH.RANK_FIRST` 등 ← 직급 카드) · 옛 SVG 인물(`SH.D.art_files.svg`) · 이름표 한 장 `rules/game.js`(`SH.GAME` · `SH.CODE_CARDS` · `SH.LAST_TICK_BEFORE`).
- 이름 검사가 세지 않는 줄 넷(줄 끝 '뼈대 이름 허용:' 주석): `core/save.js` 의 얼려 둔 표 둘 · 끝 갈래 종류 글자 · `core/data.js` 의 글 자리표 이름 `{hero}`. **못 보는 것**: 이어 붙여 만든 이름 · 숫자 — '뼈대가 이 게임을 하나도 안 품는다'는 뜻은 아님.
- 상한을 일부러 올릴 때: `python3 tools/code_caps.py save "<까닭>"`(까닭 없이는 안 올라감 · `tools/struct_log.tsv` 에 남고 올릴 때 구조 줄에 나옴) · 줄였을 때는 까닭 없이 같은 명령으로 내림.

## 새 파일을 더할 때
- 어느 층인지 먼저 정함: **이 게임의 이름(인물 · 장소 · 카드 · 종목 · 직급 · 날짜)을 코드에 써야 하면 `rules/`**, 아니면 `core/`.
- 싣는 차례 세 곳에 같이 넣음. 화면 파일(`ui/`)은 전역 이름을 새로 만들지 않음(`node tools/lint_globals.js`).
