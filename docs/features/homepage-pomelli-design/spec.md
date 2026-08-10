# Spec: перенос Pomelli-дизайна на главную

## Problem statement

Применить визуальную систему переданного Pomelli-макета к `/`, сохранив текущую продуктовую архитектуру, русский контент и все конверсионные маршруты.

## User stories

- Как посетитель, я сразу понимаю, что AI-Стратег — технологичный сервис стратегического анализа.
- Как осторожный покупатель, я могу открыть пример отчёта до оплаты.
- Как мобильный пользователь, я читаю landing и использую CTA без горизонтального скролла.

## Acceptance criteria

1. Header фиксирован, использует white/95 + blur, содержит бренд, якоря и CTA.
2. Hero использует локальный сине-чёрный visual из Pomelli, dark overlay, белый текст и два основных CTA.
3. Палитра содержит `#ffffff`, `#fafafa`, `#0a0a0a`, `#525252`, `#1e3a8a`.
4. Карточки строгие, без округлой SaaS-эстетики; hover с лёгким подъёмом.
5. Секции получают стабильный вертикальный ритм и визуальное чередование.
6. Сохраняются `/intake?tier=paid`, `/intake`, `/demo`, `/privacy`, `/offer` и Metrica goals.
7. На 375 px header, hero и CTA не создают горизонтальный overflow.
8. Анимация отключается при `prefers-reduced-motion: reduce`.

## Affected files

- `app/page.tsx`
- `app/home.module.css` (новый)
- `public/strategist-hero.png` (новый asset из пользовательского Pomelli-референса)
- `src/lib/home/__tests__/pomelli-design.test.ts` (новый)

## Data model / API / state

Без изменений.

## Test plan

- Contract test на scoped CSS tokens, fixed header, dark hero, reduced motion и обязательные CTA.
- `npx tsc --noEmit`.
- `npm run build`.
- Browser smoke: desktop и 375 px, hero/header/CTA/anchor layout.

## Rollback plan

Удалить import CSS module и вернуть классы `nav`, hero и section wrappers из предыдущего коммита; удалить новый asset и contract test.
