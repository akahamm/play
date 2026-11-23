/* 첫 화면 그리기 — index.html 에서 맨 마지막에 읽힘(data.js → sim.js → screen.js → screen_mods.js → boot.js).
   screen.js 의 맨 위 이름(fit · title · drawTitle · drawGame …)은 고전 스크립트라 여기서 그대로 보임. 화면 장치는 이보다 앞서 PANES · MSGS · MONTH_ROWS · HUD 에 등록을 마침. */
fit(); title ? drawTitle() : drawGame();
