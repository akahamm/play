/* =====================================================================
   map2/kinds.js — 낱장 목록 · 건물 종류 · 사물 종류 · 땅 무늬 (지도 설계 3-3 · 3-5 · 4절 · 7절 3)
   - 낱장(SPRITES): 그림 쪽 값의 원본 — 파일 · 그림 크기 · 발 기준점(맨 아래 꼭짓점 · key_magenta.swift 가 찍은 값을 줄인 크기에 맞춤) · 그림 카드 · AI 생성
   - 건물 종류(BKINDS): 게임 판정 값의 원본 — 크기 틀 · 발자국 칸 · 문 칸(발자국 왼쪽 위 칸 기준) · 낱장
   - 사물 종류(PKINDS): 발자국 · 낱장 · 화면 높이(px) · 막는가 · 놓는 땅(on · 없으면 인도)
   - 지역 파일(regions.js)의 건물은 kind 를 가리키고 문 칸은 종류에서 옴 — 같은 값을 두 곳에서 고치지 않음
   - 설계 4절은 '그림/낱장_목록.json' 이었으나, 파일로 연 게임은 JSON 을 못 읽어(file:// 막힘) 이 JS 파일 하나로 둠(bundle.js 와 같은 까닭)
   - 늘어날 것: 크기 틀마다 · 장소마다 건물 · 시대 · 상태 변형(variants) · 지역 고유 낱장(region) — 칸은 지금 비워 둠
   ===================================================================== */
(function (root) {
  const M2 = root.M2 = root.M2 || {};
  M2.SPRITES = {
    'sp.office_m_a': { file: 'img/skin/bt_office_m.png', size: [382, 480], foot: [192, 480], type: 'building', card: '코덱스/그림카드_결시안/gyeol_building.md', ai: 1 },
    'sp.busstop_a': { file: 'img/skin/pr_busstop.png', size: [268, 300], foot: [181, 300], type: 'prop', card: '코덱스/그림카드_결시안/gyeol_prop.md', ai: 1 },
    'sp.ground_sidewalk_a': { file: 'img/skin/gr_sidewalk.png', size: [512, 512], per: 6, type: 'ground', card: '코덱스/그림카드_결시안/gyeol_ground.md', ai: 1 },   // per = 무늬 한 장이 덮는 칸 수(한 변)
    // ── 지도 낱장 1(그림/다듬기/지도1_넣기.py 가 채움 · 손으로 고치지 않음) ──
    'sp.bt_apartment': { file: 'img/skin/bt_apartment.png', size: [384, 452], foot: [194, 452], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_apartment.md', ai: 1 },
    'sp.bt_arcade': { file: 'img/skin/bt_arcade.png', size: [384, 422], foot: [197, 422], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_arcade.md', ai: 1 },
    'sp.bt_bank': { file: 'img/skin/bt_bank.png', size: [512, 832], foot: [258, 832], type: 'building', card: '코덱스/그림카드_지도1/tall/bt_bank.md', ai: 1 },
    'sp.bt_bar': { file: 'img/skin/bt_bar.png', size: [256, 302], foot: [132, 302], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_bar.md', ai: 1 },
    'sp.bt_broadcast': { file: 'img/skin/bt_broadcast.png', size: [384, 695], foot: [197, 695], type: 'building', card: '코덱스/그림카드_지도1/tall/bt_broadcast.md', ai: 1 },
    'sp.bt_cafe': { file: 'img/skin/bt_cafe.png', size: [256, 306], foot: [130, 306], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_cafe.md', ai: 1 },
    'sp.bt_corner_shop': { file: 'img/skin/bt_corner_shop.png', size: [256, 252], foot: [130, 252], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_corner_shop.md', ai: 1 },
    'sp.bt_exchange': { file: 'img/skin/bt_exchange.png', size: [704, 621], foot: [434, 621], type: 'building', card: '코덱스/그림카드_지도1/wide/bt_exchange.md', ai: 1 },
    'sp.bt_factory': { file: 'img/skin/bt_factory.png', size: [448, 385], foot: [254, 385], type: 'building', card: '코덱스/그림카드_지도1/wide/bt_factory.md', ai: 1 },
    'sp.bt_hardware': { file: 'img/skin/bt_hardware.png', size: [384, 357], foot: [195, 357], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_hardware.md', ai: 1 },
    'sp.bt_hotel': { file: 'img/skin/bt_hotel.png', size: [512, 984], foot: [259, 984], type: 'building', card: '코덱스/그림카드_지도1/tall/bt_hotel.md', ai: 1 },
    'sp.bt_hq': { file: 'img/skin/bt_hq.png', size: [640, 1178], foot: [325, 1178], type: 'building', card: '코덱스/그림카드_지도1/tall/bt_hq.md', ai: 1 },
    'sp.bt_inn': { file: 'img/skin/bt_inn.png', size: [256, 393], foot: [130, 393], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_inn.md', ai: 1 },
    'sp.bt_market': { file: 'img/skin/bt_market.png', size: [896, 584], foot: [505, 584], type: 'building', card: '코덱스/그림카드_지도1/wide/bt_market.md', ai: 1 },
    'sp.bt_newspaper': { file: 'img/skin/bt_newspaper.png', size: [384, 527], foot: [196, 527], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_newspaper.md', ai: 1 },
    'sp.bt_old2': { file: 'img/skin/bt_old2.png', size: [256, 284], foot: [136, 284], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_old2.md', ai: 1 },
    'sp.bt_old3': { file: 'img/skin/bt_old3.png', size: [384, 468], foot: [197, 468], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_old3.md', ai: 1 },
    'sp.bt_pressroom': { file: 'img/skin/bt_pressroom.png', size: [256, 329], foot: [130, 329], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_pressroom.md', ai: 1 },
    'sp.bt_research': { file: 'img/skin/bt_research.png', size: [512, 906], foot: [256, 906], type: 'building', card: '코덱스/그림카드_지도1/tall/bt_research.md', ai: 1 },
    'sp.bt_rooftop_home': { file: 'img/skin/bt_rooftop_home.png', size: [256, 309], foot: [126, 309], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_rooftop_home.md', ai: 1 },
    'sp.bt_tailor': { file: 'img/skin/bt_tailor.png', size: [256, 318], foot: [128, 318], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_tailor.md', ai: 1 },
    'sp.bt_villa': { file: 'img/skin/bt_villa.png', size: [384, 471], foot: [198, 471], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_villa.md', ai: 1 },
    'sp.bt_workshop': { file: 'img/skin/bt_workshop.png', size: [384, 414], foot: [196, 414], type: 'building', card: '코덱스/그림카드_지도1/sq/bt_workshop.md', ai: 1 },
    'sp.gr_bank': { file: 'img/skin/gr_bank.png', size: [512, 512], per: 6, type: 'ground', card: '코덱스/그림카드_지도1/sq/gr_bank.md', ai: 1 },
    'sp.gr_bridge': { file: 'img/skin/gr_bridge.png', size: [512, 512], per: 6, type: 'ground', card: '코덱스/그림카드_지도1/sq/gr_bridge.md', ai: 1 },
    'sp.gr_grass': { file: 'img/skin/gr_grass.png', size: [512, 512], per: 6, type: 'ground', card: '코덱스/그림카드_지도1/sq/gr_grass.md', ai: 1 },
    'sp.gr_plaza': { file: 'img/skin/gr_plaza.png', size: [512, 512], per: 6, type: 'ground', card: '코덱스/그림카드_지도1/sq/gr_plaza.md', ai: 1 },
    'sp.gr_road': { file: 'img/skin/gr_road.png', size: [512, 512], per: 6, type: 'ground', card: '코덱스/그림카드_지도1/sq/gr_road.md', ai: 1 },
    'sp.gr_vacant': { file: 'img/skin/gr_vacant.png', size: [512, 512], per: 6, type: 'ground', card: '코덱스/그림카드_지도1/sq/gr_vacant.md', ai: 1 },
    'sp.gr_water': { file: 'img/skin/gr_water.png', size: [512, 512], per: 6, type: 'ground', card: '코덱스/그림카드_지도1/sq/gr_water.md', ai: 1 },
    'sp.pr_ad_pillar': { file: 'img/skin/pr_ad_pillar.png', size: [260, 604], foot: [129, 604], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_ad_pillar.md', ai: 1 },
    'sp.pr_bench': { file: 'img/skin/pr_bench.png', size: [260, 261], foot: [166, 261], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_bench.md', ai: 1 },
    'sp.pr_bicycle': { file: 'img/skin/pr_bicycle.png', size: [260, 232], foot: [33, 232], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_bicycle.md', ai: 1 },
    'sp.pr_bus': { file: 'img/skin/pr_bus.png', size: [260, 204], foot: [64, 204], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_bus.md', ai: 1 },
    'sp.pr_car_dark': { file: 'img/skin/pr_car_dark.png', size: [260, 173], foot: [80, 173], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_car_dark.md', ai: 1 },
    'sp.pr_car_white': { file: 'img/skin/pr_car_white.png', size: [260, 166], foot: [82, 166], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_car_white.md', ai: 1 },
    'sp.pr_fence': { file: 'img/skin/pr_fence.png', size: [260, 281], foot: [14, 281], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_fence.md', ai: 1 },
    'sp.pr_hydrant': { file: 'img/skin/pr_hydrant.png', size: [260, 486], foot: [127, 486], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_hydrant.md', ai: 1 },
    'sp.pr_kiosk': { file: 'img/skin/pr_kiosk.png', size: [260, 326], foot: [128, 326], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_kiosk.md', ai: 1 },
    'sp.pr_lamp': { file: 'img/skin/pr_lamp.png', size: [260, 647], foot: [176, 647], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_lamp.md', ai: 1 },
    'sp.pr_mailbox': { file: 'img/skin/pr_mailbox.png', size: [260, 493], foot: [133, 493], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_mailbox.md', ai: 1 },
    'sp.pr_phone': { file: 'img/skin/pr_phone.png', size: [260, 530], foot: [129, 530], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_phone.md', ai: 1 },
    'sp.pr_planter': { file: 'img/skin/pr_planter.png', size: [260, 195], foot: [174, 195], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_planter.md', ai: 1 },
    'sp.pr_pojangmacha': { file: 'img/skin/pr_pojangmacha.png', size: [260, 239], foot: [118, 239], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_pojangmacha.md', ai: 1 },
    'sp.pr_scooter': { file: 'img/skin/pr_scooter.png', size: [260, 273], foot: [29, 273], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_scooter.md', ai: 1 },
    'sp.pr_taxi': { file: 'img/skin/pr_taxi.png', size: [260, 180], foot: [91, 180], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_taxi.md', ai: 1 },
    'sp.pr_traffic_light': { file: 'img/skin/pr_traffic_light.png', size: [260, 462], foot: [36, 462], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_traffic_light.md', ai: 1 },
    'sp.pr_trashcan': { file: 'img/skin/pr_trashcan.png', size: [260, 382], foot: [130, 382], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_trashcan.md', ai: 1 },
    'sp.pr_tree': { file: 'img/skin/pr_tree.png', size: [260, 450], foot: [127, 450], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_tree.md', ai: 1 },
    'sp.pr_vending': { file: 'img/skin/pr_vending.png', size: [260, 450], foot: [159, 450], type: 'prop', card: '코덱스/그림카드_지도1/sq/pr_vending.md', ai: 1 },
    // ── 지도 낱장 1 끝 ──
    // ── 땅 사기 낱장(그림/다듬기/땅사기_넣기.py 가 채움 · 손으로 고치지 않음) ──
    'sp.bt_land_site': { file: 'img/skin/bt_land_site.png', size: [384, 390], foot: [196, 390], type: 'building', card: '코덱스/그림카드_땅사기/sq/bt_land_site.md', ai: 1 },
    'sp.bt_land_shop2': { file: 'img/skin/bt_land_shop2.png', size: [384, 388], foot: [192, 388], type: 'building', card: '코덱스/그림카드_땅사기/sq/bt_land_shop2.md', ai: 1 },
    'sp.bt_land_house3': { file: 'img/skin/bt_land_house3.png', size: [384, 511], foot: [193, 511], type: 'building', card: '코덱스/그림카드_땅사기/sq/bt_land_house3.md', ai: 1 },
    'sp.bt_land_office5': { file: 'img/skin/bt_land_office5.png', size: [384, 519], foot: [194, 519], type: 'building', card: '코덱스/그림카드_땅사기/tall/bt_land_office5.md', ai: 1 },
    'sp.bt_land_hq8': { file: 'img/skin/bt_land_hq8.png', size: [512, 791], foot: [263, 791], type: 'building', card: '코덱스/그림카드_땅사기/tall/bt_land_hq8.md', ai: 1 },
    // ── 땅 사기 낱장 끝 ──
    // ── 차 뒷모습 낱장(그림/다듬기/차뒤_넣기.py 가 채움 · 손으로 고치지 않음) ──
    'sp.pr_car_white_b': { file: 'img/skin/pr_car_white_b.png', size: [260, 179], foot: [98, 179], type: 'prop', card: '코덱스/그림카드_차뒤/sq/pr_car_white_b.md', ai: 1 },
    'sp.pr_car_dark_b': { file: 'img/skin/pr_car_dark_b.png', size: [260, 188], foot: [88, 188], type: 'prop', card: '코덱스/그림카드_차뒤/sq/pr_car_dark_b.md', ai: 1 },
    'sp.pr_taxi_b': { file: 'img/skin/pr_taxi_b.png', size: [260, 183], foot: [98, 183], type: 'prop', card: '코덱스/그림카드_차뒤/sq/pr_taxi_b.md', ai: 1 },
    'sp.pr_bus_b': { file: 'img/skin/pr_bus_b.png', size: [260, 228], foot: [67, 228], type: 'prop', card: '코덱스/그림카드_차뒤/sq/pr_bus_b.md', ai: 1 },
    // ── 차 뒷모습 낱장 끝 ──
    // ── 다리 · 둔치 낱장(그림/다듬기/다리둔치_넣기.py 가 채움 · 손으로 고치지 않음) — 115 · 114: 다리 난간 · 교각 · 가로등 · 도로 표지(base · panel = 붙일 자리) · 둔치 사물 ──
    'sp.pr_bridge_rail': { file: 'img/skin/pr_bridge_rail.png', size: [260, 206], foot: [18, 206], base: [[10, 201], [249, 83]], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_bridge_rail.md', ai: 1 },
    'sp.pr_bridge_pier': { file: 'img/skin/pr_bridge_pier.png', size: [260, 385], foot: [125, 385], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_bridge_pier.md', ai: 1 },
    'sp.pr_bridge_lamp': { file: 'img/skin/pr_bridge_lamp.png', size: [260, 565], foot: [129, 565], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_bridge_lamp.md', ai: 1 },
    'sp.pr_road_sign': { file: 'img/skin/pr_road_sign.png', size: [260, 320], foot: [130, 320], panel: [1, 22, 257, 129], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_road_sign.md', ai: 1 },
    'sp.pr_parasol': { file: 'img/skin/pr_parasol.png', size: [260, 369], foot: [129, 369], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_parasol.md', ai: 1 },
    'sp.pr_river_kiosk': { file: 'img/skin/pr_river_kiosk.png', size: [260, 264], foot: [149, 264], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_river_kiosk.md', ai: 1 },
    'sp.pr_swan_boat': { file: 'img/skin/pr_swan_boat.png', size: [260, 231], foot: [120, 231], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_swan_boat.md', ai: 1 },
    'sp.pr_dock': { file: 'img/skin/pr_dock.png', size: [260, 226], foot: [76, 226], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_dock.md', ai: 1 },
    'sp.pr_exercise': { file: 'img/skin/pr_exercise.png', size: [260, 243], foot: [109, 243], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_exercise.md', ai: 1 },
    'sp.pr_willow': { file: 'img/skin/pr_willow.png', size: [260, 232], foot: [111, 232], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_willow.md', ai: 1 },
    'sp.pr_picnic': { file: 'img/skin/pr_picnic.png', size: [260, 153], foot: [130, 153], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_picnic.md', ai: 1 },
    'sp.pr_pergola': { file: 'img/skin/pr_pergola.png', size: [260, 260], foot: [132, 260], type: 'prop', card: '코덱스/그림카드_다리둔치/sq/pr_pergola.md', ai: 1 },
    // ── 다리 · 둔치 낱장 끝 ──
    // ── 새 장소 건물 낱장(그림/다듬기/새장소_넣기.py 가 채움 · 손으로 고치지 않음) ──
    'sp.bt_gukbap': { file: 'img/skin/bt_gukbap.png', size: [256, 240], foot: [149, 240], type: 'building', card: '코덱스/그림카드_새장소/sq/bt_gukbap.md', ai: 1 },
    'sp.bt_department': { file: 'img/skin/bt_department.png', size: [448, 479], foot: [304, 479], type: 'building', card: '코덱스/그림카드_새장소/sq/bt_department.md', ai: 1 },
    'sp.bt_car_dealer': { file: 'img/skin/bt_car_dealer.png', size: [320, 261], foot: [179, 261], type: 'building', card: '코덱스/그림카드_새장소/sq/bt_car_dealer.md', ai: 1 },
    'sp.bt_realtor': { file: 'img/skin/bt_realtor.png', size: [256, 243], foot: [136, 243], type: 'building', card: '코덱스/그림카드_새장소/sq/bt_realtor.md', ai: 1 },
    'sp.bt_flower': { file: 'img/skin/bt_flower.png', size: [256, 264], foot: [191, 264], type: 'building', card: '코덱스/그림카드_새장소/sq/bt_flower.md', ai: 1 },
    // ── 새 장소 건물 낱장 끝 ──
  };
  // 문 칸: 발자국 왼쪽 위(x, y) 기준 · 낱장의 문이 왼쪽 아래 벽(+y 면 · 빛 받는 벽) 가운데라 [w/2, h] · 지도 낱장 1(11-13) 그림 카드가 문을 그 자리에 그림
  M2.BKINDS = {
    'bt.office_m_a': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.office_m_a', ko: '중간 사무 건물' },
    'bt.hq': { frame: 'x', foot: [5, 5], door: [2, 5], sprite: 'sp.bt_hq', ko: '본사 빌딩' },
    'bt.exchange': { frame: 'x', foot: [6, 5], door: [3, 5], sprite: 'sp.bt_exchange', ko: '거래소' },
    'bt.research': { frame: 'l', foot: [4, 4], door: [2, 4], sprite: 'sp.bt_research', ko: '유리 빌딩' },
    'bt.hotel': { frame: 'l', foot: [4, 4], door: [2, 4], sprite: 'sp.bt_hotel', ko: '호텔' },
    'bt.bank': { frame: 'l', foot: [4, 4], door: [2, 4], sprite: 'sp.bt_bank', ko: '은행' },
    'bt.broadcast': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_broadcast', ko: '방송국' },
    'bt.newspaper': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_newspaper', ko: '신문사' },
    'bt.apartment': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_apartment', ko: '아파트' },
    'bt.arcade': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_arcade', ko: '상가' },
    'bt.cafe': { frame: 's', foot: [2, 2], door: [1, 2], sprite: 'sp.bt_cafe', ko: '카페' },
    'bt.pressroom': { frame: 's', foot: [2, 2], door: [1, 2], sprite: 'sp.bt_pressroom', ko: '붉은 벽돌 별채' },
    'bt.bar': { frame: 's', foot: [2, 2], door: [1, 2], sprite: 'sp.bt_bar', ko: '바' },
    'bt.tailor': { frame: 's', foot: [2, 2], door: [1, 2], sprite: 'sp.bt_tailor', ko: '양복점' },
    'bt.corner_shop': { frame: 's', foot: [2, 2], door: [1, 2], sprite: 'sp.bt_corner_shop', ko: '구멍가게' },
    'bt.old2': { frame: 's', foot: [2, 2], door: [1, 2], sprite: 'sp.bt_old2', ko: '허름한 2층' },
    'bt.old3': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_old3', ko: '허름한 3층' },
    // ── 땅 사기 건물 종류(그림/다듬기/땅사기_넣기.py 가 채움 · 손으로 고치지 않음) ──
    'bt.land_site': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_land_site', ko: '공사장' },
    'bt.land_shop2': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_land_shop2', ko: '상가 2층' },
    'bt.land_house3': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_land_house3', ko: '다세대 3층' },
    'bt.land_office5': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_land_office5', ko: '사무실 5층' },
    'bt.land_hq8': { frame: 'l', foot: [4, 4], door: [2, 4], sprite: 'sp.bt_land_hq8', ko: '사옥 8층' },
    // ── 땅 사기 건물 종류 끝 ──
    'bt.market': { frame: 'x', foot: [8, 6], door: [4, 6], sprite: 'sp.bt_market', ko: '시장' },
    'bt.factory': { frame: 'l', foot: [4, 3], door: [2, 3], sprite: 'sp.bt_factory', ko: '공장' },
    'bt.rooftop_home': { frame: 's', foot: [2, 2], door: [1, 2], sprite: 'sp.bt_rooftop_home', ko: '옥탑 있는 집' },
    'bt.inn': { frame: 's', foot: [2, 2], door: [1, 2], sprite: 'sp.bt_inn', ko: '여관' },
    'bt.hardware': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_hardware', ko: '철물점' },
    'bt.villa': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_villa', ko: '다세대' },
    'bt.workshop': { frame: 'm', foot: [3, 3], door: [1, 3], sprite: 'sp.bt_workshop', ko: '작은 공장' },
    // ── 새 장소 건물 종류(그림/다듬기/새장소_넣기.py 가 채움 · 손으로 고치지 않음) ──
    'bt.gukbap': { frame: 's', foot: [2, 2], door: [1, 2], sprite: 'sp.bt_gukbap', ko: '국밥집' },
    'bt.department': { frame: 'l', foot: [4, 3], door: [2, 3], sprite: 'sp.bt_department', ko: '백화점' },
    'bt.car_dealer': { frame: 'm', foot: [3, 2], door: [1, 2], sprite: 'sp.bt_car_dealer', ko: '자동차 매장' },
    'bt.realtor': { frame: 's', foot: [2, 2], door: [1, 2], sprite: 'sp.bt_realtor', ko: '부동산' },
    'bt.flower': { frame: 's', foot: [2, 2], door: [1, 2], sprite: 'sp.bt_flower', ko: '꽃집' },
    // ── 새 장소 건물 종류 끝 ──
  };
  M2.PKINDS = {
    'pt.busstop_a': { foot: [1, 1], sprite: 'sp.busstop_a', h: 82, blocks: 1, ko: '버스 정류장' },
    'pt.lamp': { foot: [1, 1], sprite: 'sp.pr_lamp', h: 74, blocks: 1, ko: '가로등' },
    'pt.tree': { foot: [1, 1], sprite: 'sp.pr_tree', h: 86, blocks: 1, ko: '가로수' },
    'pt.bench': { foot: [1, 1], sprite: 'sp.pr_bench', h: 26, blocks: 1, ko: '벤치' },
    'pt.phone': { foot: [1, 1], sprite: 'sp.pr_phone', h: 62, blocks: 1, ko: '공중전화' },
    'pt.planter': { foot: [2, 1], sprite: 'sp.pr_planter', h: 26, blocks: 1, ko: '화단' },
    'pt.mailbox': { foot: [1, 1], sprite: 'sp.pr_mailbox', h: 30, blocks: 1, ko: '우체통' },
    'pt.car_white': { foot: [1, 2], sprite: 'sp.pr_car_white', h: 36, on: ['road', 'parking'], blocks: 1, ko: '흰 승용차' },
    'pt.car_dark': { foot: [1, 2], sprite: 'sp.pr_car_dark', h: 36, on: ['road', 'parking'], blocks: 1, ko: '남색 승용차' },
    // 11-13 대표님 '오브젝트 더 다양하게'
    'pt.traffic_light': { foot: [1, 1], sprite: 'sp.pr_traffic_light', h: 80, blocks: 1, ko: '신호등' },
    'pt.traffic_light_x': { foot: [1, 1], sprite: 'sp.pr_traffic_light', flip: 1, h: 80, blocks: 1, ko: '신호등(가로 찻길 쪽)' },   // 66: 같은 그림을 좌우로 뒤집음 — 팔이 가로 찻길 위로 뻗음
    'pt.kiosk': { foot: [1, 1], sprite: 'sp.pr_kiosk', h: 58, blocks: 1, ko: '신문 가판대' },
    'pt.pojangmacha': { foot: [2, 1], sprite: 'sp.pr_pojangmacha', h: 56, blocks: 1, on: ['side', 'yard', 'plaza', 'parking'], ko: '포장마차' },
    'pt.trashcan': { foot: [1, 1], sprite: 'sp.pr_trashcan', h: 24, blocks: 1, ko: '쓰레기통' },
    'pt.hydrant': { foot: [1, 1], sprite: 'sp.pr_hydrant', h: 20, blocks: 1, ko: '소화전' },
    'pt.bicycle': { foot: [1, 1], sprite: 'sp.pr_bicycle', h: 26, ko: '자전거' },
    'pt.fence': { foot: [2, 1], sprite: 'sp.pr_fence', h: 34, blocks: 1, on: ['side', 'yard', 'vacant'], ko: '공사 펜스' },
    'pt.ad_pillar': { foot: [1, 1], sprite: 'sp.pr_ad_pillar', h: 64, blocks: 1, ko: '광고탑' },
    'pt.vending': { foot: [1, 1], sprite: 'sp.pr_vending', h: 48, blocks: 1, ko: '자판기' },
    'pt.taxi': { foot: [1, 2], sprite: 'sp.pr_taxi', h: 38, on: ['road', 'parking'], blocks: 1, ko: '택시' },
    'pt.bus': { foot: [1, 4], sprite: 'sp.pr_bus', h: 64, on: ['road'], blocks: 1, ko: '버스' },
    // 63(11-13 주차장): 가로(x 축)로 선 차 — 같은 그림을 좌우로 뒤집어 씀(flip) · 발자국 2×1
    'pt.car_white_x': { foot: [2, 1], sprite: 'sp.pr_car_white', flip: 1, h: 36, on: ['road', 'parking'], blocks: 1, ko: '흰 승용차(가로)' },
    'pt.car_dark_x': { foot: [2, 1], sprite: 'sp.pr_car_dark', flip: 1, h: 36, on: ['road', 'parking'], blocks: 1, ko: '남색 승용차(가로)' },
    'pt.taxi_x': { foot: [2, 1], sprite: 'sp.pr_taxi', flip: 1, h: 38, on: ['road', 'parking'], blocks: 1, ko: '택시(가로)' },
    'pt.scooter': { foot: [1, 1], sprite: 'sp.pr_scooter', h: 30, on: ['side', 'yard', 'parking'], ko: '배달 오토바이' },
    // ── 차 뒷모습 종류(그림/다듬기/차뒤_넣기.py 가 채움 · 손으로 고치지 않음) — 64: 멀어지는 차(오른쪽 위 · 왼쪽 위로 감) · 주차장에 거꾸로 선 차 ──
    'pt.car_white_b': { foot: [1, 2], sprite: 'sp.pr_car_white_b', h: 39, on: ['road', 'parking'], blocks: 1, ko: '흰 승용차(뒷모습)' },
    'pt.car_white_b_x': { foot: [2, 1], sprite: 'sp.pr_car_white_b', flip: 1, h: 39, on: ['road', 'parking'], blocks: 1, ko: '흰 승용차(뒷모습 · 가로)' },
    'pt.car_dark_b': { foot: [1, 2], sprite: 'sp.pr_car_dark_b', h: 39, on: ['road', 'parking'], blocks: 1, ko: '남색 승용차(뒷모습)' },
    'pt.car_dark_b_x': { foot: [2, 1], sprite: 'sp.pr_car_dark_b', flip: 1, h: 39, on: ['road', 'parking'], blocks: 1, ko: '남색 승용차(뒷모습 · 가로)' },
    'pt.taxi_b': { foot: [1, 2], sprite: 'sp.pr_taxi_b', h: 39, on: ['road', 'parking'], blocks: 1, ko: '택시(뒷모습)' },
    'pt.taxi_b_x': { foot: [2, 1], sprite: 'sp.pr_taxi_b', flip: 1, h: 39, on: ['road', 'parking'], blocks: 1, ko: '택시(뒷모습 · 가로)' },
    'pt.bus_b': { foot: [1, 4], sprite: 'sp.pr_bus_b', h: 72, on: ['road'], blocks: 1, ko: '버스(뒷모습)' },
    // ── 차 뒷모습 종류 끝 ──
    // ── 다리 · 둔치 종류(그림/다듬기/다리둔치_넣기.py 가 채움 · 손으로 고치지 않음) ──
    'pt.parasol': { foot: [1, 1], sprite: 'sp.pr_parasol', h: 64, on: ['plaza', 'side', 'yard', 'grass', 'bank'], blocks: 1, ko: '파라솔 탁자' },
    'pt.river_kiosk': { foot: [2, 2], sprite: 'sp.pr_river_kiosk', h: 123, on: ['plaza', 'side', 'yard', 'grass', 'bank'], blocks: 1, ko: '둔치 매점' },
    'pt.swan_boat': { foot: [1, 1], sprite: 'sp.pr_swan_boat', h: 51, on: ['water'], ko: '오리배' },
    'pt.dock': { foot: [1, 2], sprite: 'sp.pr_dock', h: 83, on: ['water', 'bank'], ko: '선착장' },
    'pt.exercise': { foot: [1, 2], sprite: 'sp.pr_exercise', h: 81, on: ['grass', 'bank', 'plaza', 'yard'], blocks: 1, ko: '운동 기구' },
    'pt.willow': { foot: [1, 1], sprite: 'sp.pr_willow', h: 128, on: ['grass', 'bank', 'yard'], blocks: 1, ko: '버드나무' },
    'pt.picnic': { foot: [1, 1], sprite: 'sp.pr_picnic', h: 36, on: ['grass', 'bank'], ko: '돗자리' },
    'pt.pergola': { foot: [2, 2], sprite: 'sp.pr_pergola', h: 128, on: ['grass', 'plaza', 'yard', 'bank'], blocks: 1, ko: '등나무 쉼터' },
    // ── 다리 · 둔치 종류 끝 ──
  };
  // 땅 종류 → 무늬 낱장(없으면 단색) · 횡단보도 · 연석은 코드가 그림(render.js)
  M2.GROUND_SKIN = { side: 'sp.ground_sidewalk_a', road: 'sp.gr_road', grass: 'sp.gr_grass', bank: 'sp.gr_bank', plaza: 'sp.gr_plaza', water: 'sp.gr_water', bridge: 'sp.gr_bridge', vacant: 'sp.gr_vacant', parking: 'sp.gr_road', yard: 'sp.gr_plaza', flower: 'sp.gr_grass' };
  if (typeof module !== 'undefined') module.exports = M2;
})(typeof window !== 'undefined' ? window : globalThis);
