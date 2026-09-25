---
Task ID: stage-1
Agent: main (orchestrator)
Task: RUNE WARS — Этап 1: Ядро Match-3 (поле 7×7, 4 цвета, swap, матчи, каскады, частицы, canvas-рендер)

Work Log:
- Изучен текущий стек: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui; zustand уже установлен.
- Создана структура папок: src/game/{core,battle,map,render,content}, src/components/{screens,ui,icons}, src/assets, src/styles.
- Обновлён src/app/layout.tsx: подключены шрифты Press Start 2P (pixel) и Inter (body) через next/font/google; lang="ru"; viewport с themeColor #0a0718; отключён скролл body.
- Переписан src/app/globals.css: тёмно-фэнтези палитра (--background #0a0718, --primary #c9a227 золото, --destructive #8b1a1a кровавый, цвета кристаллов rune-red/blue/green/yellow); классы .font-pixel, .font-body, .rune-scroll, свечение text-glow-gold/blood; отключён context menu и tap highlight; canvas { touch-action: none }.
- src/game/battle/types.ts: типы Gem (id,color,row,col,px/py/target,targetScale/alpha,state,pulse,rot), GemColor (0-3), BoardPhase (idle/swapping/checking/removing/falling/settling), MatchGroup, CascadeStats.
- src/game/content/balance.ts: BOARD_SIZE=7, GEM_COLORS=4, ANIM-константы (swap 0.2s, remove 0.28s, fall 0.32s), lengthMultiplier (3→×1, 4→×1.5, 5→×2, 6→×2.5, 7→×3), cascadeBonus (+25%/каскад, макс +100%, макс 6), GEM_BASE таблицы, CAPS (maxDamage 50, maxShield 30, shieldMax 50, maxHeal 20, maxRage 40), GEM_COLOR_HEX палитра для рендера.
- src/game/battle/MatchLogic.ts: findAllMatches (горизонтальные + вертикальные линии 3+), cellsToRemove, hasAnyMatch, hasPossibleMove (проверка играбельности доски).
- src/game/battle/BoardEngine.ts: класс движка поля с конечным автоматом. Генерация доски без готовых линий (pickSafeColor проверяет 2 влево/вверх), гарантия playable (shuffleBoard если нет хода). handleClick → onCellClick (выделение, соседство, swap). Фазы: idle→swapping (0.2s lerp)→checking→removing (0.28s scale+fade)→falling (гравитация + дозаполнение сверху)→checking (каскад). animateGems с lerp по dt. applyGravityAndRefill собирает стек гемов снизу + спавнит новые сверху с py выше доски. rollbackSwap при отсутствии матча. События: match (группы + cascadeLevel), swapFail, turnEnd, select. Слушатель listener для боя/UI.
- src/game/render/VFX.ts: ParticlePool (POOL_SIZE=200, MAX_ACTIVE=100). Методы spawn, burst (взрыв N частиц), update (гравитация, жизнь), render (spark/magic/star/smoke/explosion/combo с тенью и blur). findFree ищет неактивную частицу.
- src/game/render/BoardRenderer.ts: рендерер canvas. render: фон (радиальный градиент + 26 плавающих «рун»-частиц + виньетка), рамка поля (золотая с glow), клеточная сетка, гемы (drawFacetedGem — ромб-бриллиант с 6 гранями: вертикальный градиент light→base→dark, верхне-левый блик, правая тень, внутренние рёбра огранки, эллипс-блик, внешнее свечение glow), выделение (пульсирующая золотая рамка), частицы, тряска экрана (addShake с затуханием).
- src/hooks/useCanvas.ts: useCanvasLoop — requestAnimationFrame с delta-time (dt ограничен 0.1с для защиты от скачков при возврате вкладки). optsRef обновляется в эффекте (не в render). Ленивый canvas ref.
- src/game/core/GameState.ts: Zustand store (screen, score, combo, maxCombo, totalMatches, lastMatchSummary, hint, debugReady + timer 90с).
- src/components/ui/RuneButton.tsx, RunePanel.tsx, HpBar.tsx: базовые UI-компоненты в стиле тёмного фэнтези (градиенты, золотые рамки, glow).
- src/components/screens/BattleScreen.tsx: главный экран. Инициализация engine+particles+renderer (лениво в первом кадре). Игровой цикл через useCanvasLoop. Слушатель событий engine → спавн частиц на матчах (burst 6 sparks + magic glow), тряска на каскаде, combo flash в центре, обновление store (score, combo, maxCombo, matches, lastMatchSummary с применением CAPS). Обработчик кликов canvas (перевод screen→canvas координат с учётом масштаба). HUD: панель Статистика, панель «Последний ход» (длина, множитель, эффекты Атака/Щит/Лечение/Ярость с пометкой MAX при достижении cap), легенда кристаллов, индикаторы Engine Ready и Game Ready (90с). Debug-доступ window.__rune={engine,particles} для автотестов.
- src/app/page.tsx: экран загрузки → BattleScreen, отключение contextmenu глобально.
- lint прошёл без ошибок (исправлены: useMemo inline fn, ref-during-render в useCanvas).
- Верификация через agent-browser: страница рендерится без ошибок в консоли. VLM подтвердил: поле 7×7 с золотой glow-рамкой, 4 цвета кристаллов (Ruby/Sapphire/Emerald/Topaz), огранённые ромбы с бликом/тенью/свечением, HUD-панели, индикатор Engine Ready + Game Ready.
- Интерактивность: через eval найден валидный ход, dispatched MouseEvent на canvas с точными координатами — обмен→матч→удаление→гравитация→рефилл→каскад работают. Подтверждено: phase переходит idle→swapping→removing→falling, pcount до 69 во время удаления, score растёт (до 1275 при длинной цепочке каскадов), combo/maxCombo обновляются. VLM увидел разноцветные искры (голубой/зелёный/жёлтый) в зоне матча.

Stage Summary:
- Этап 1 (Ядро Match-3) ПОЛНОСТЬЮ ЗАВЕРШЁН и верифицирован в браузере.
- Архитектура: BoardEngine (логика+FSM), BoardRenderer (canvas), ParticlePool (VFX), useCanvasLoop (rAF+dt), GameState (Zustand), BattleScreen (React UI).
- Все требования Этапа 1 выполнены: поле 7×7, 4 цвета, swap 0.2с с rollback, матчи 3+, множители длины (×1→×3), каскады (+25%, макс +100%, макс 6), гравитация + дозаполнение сверху без готовых линий, пул частиц 200/макс 100 активных, requestAnimationFrame с delta-time, тёмно-фэнтези пиксель-стиль.
- Готов переход к Этапу 2 (Бой: герой 100 HP, враг, атака каждые 3 хода, победа/поражение).
- Артефакты: скриншоты в /home/z/my-project/screenshots/ (stage1-init.png, stage1-fx-mid.png с видимыми частицами).

Unresolved / Next:
- Stage 2: BattleScreen расширить до полноценного боя (Hero 100 HP + shield, Enemy с HP/atk/interval, ход врага каждые 3 хода, эффекты цветов: red→атака, blue→щит, green→лечение, yellow→ярость, экраны Victory/Defeat).
- Stage 3+: руны, карта, лут, магазин/лагерь, герои, Яндекс SDK, полировка, публикация.
- Риск: VLM иногда не видит кратковременные частицы на скриншоте — для будущих этапов проверять pcount через eval параллельно со скриншотом.
