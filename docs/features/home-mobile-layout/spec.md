# Mobile layout главной — spec

## Problem statement

Главная страница не помещается в мобильный viewport: часть header CTA и H1 обрезается, тарифные карточки выглядят смещёнными, парные CTA имеют разную геометрию.

## User story

Как посетитель с мобильного телефона, я хочу видеть все заголовки, карточки и CTA целиком, чтобы сравнить тарифы и выбрать действие без горизонтального скролла.

## Acceptance criteria

1. На viewport 320, 360, 375, 390 и 412 px header CTA показывает полный текст.
2. Hero H1 помещается по ширине без обрезания слов и горизонтального скролла.
3. Тарифные карточки не шире доступной области и визуально центрированы.
4. CTA внутри тарифных карточек и две CTA финального блока имеют `width: 100%` и одинаковый `min-height` на mobile.
5. На ширине больше 768 px текущая desktop-композиция сохраняется.
6. Canonical palette, Inter, focus-state и reduced motion сохраняются.

## Affected files

- `app/page.tsx` — scoped class hooks для tariff grid/card/CTA и final CTA group.
- `app/home.module.css` — mobile layout contract.
- `src/lib/home/__tests__/pomelli-design.test.ts` — regression contract.

## Data/API/state changes

Нет.

## Test plan

- Contract-тест проверяет наличие scoped mobile hooks и ключевых CSS-ограничений.
- `npm test` для home contract.
- `npm run build`.
- Визуальная проверка локальной страницы на mobile viewport.

## Rollback plan

Откатить только новые class hooks и mobile CSS rules; данные и API не затронуты.

## Spec review

- [x] Бизнес-цель понятна.
- [x] Acceptance criteria определены.
- [x] Негативный сценарий — длинный текст на 320 px — учтён переносом.
- [x] Edge cases 320 px и длинные русские слова учтены.
- [x] Backward compatibility desktop сохранена.
- [x] Стратегия тестирования описана.
- [x] Лишнего scope нет.
- [x] Работа разбита на малые шаги.
