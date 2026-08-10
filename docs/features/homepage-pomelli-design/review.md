# Review: Pomelli-дизайн главной

## Результат

Главная получила визуальную систему переданного Pomelli-макета: fixed glass-header, dark image-led hero, navy/black/off-white palette, строгие карточки и сдержанную анимацию. Русский контент, JSON-LD, тарифы, ссылки и analytics goals сохранены.

## Acceptance criteria

- [x] Fixed header с blur, якорями и paid CTA.
- [x] Локальный hero visual с dark navy overlay и контрастным текстом.
- [x] Scoped tokens `#ffffff`, `#fafafa`, `#0a0a0a`, `#525252`, `#1e3a8a`.
- [x] Карточки с `0px` radius, лёгким hover и 4px navy top-border у тарифов.
- [x] Paid, free, demo, privacy и offer links сохранены.
- [x] Mobile 360 px без horizontal overflow.
- [x] `prefers-reduced-motion` отключает animation/transition.

## Verification

- `npm test -- pomelli-design.test.ts landing-cta.test.ts` — 4/4.
- `npx tsc --noEmit` — проходит.
- `npm run build` — проходит; `/` prerendered.
- Browser desktop: header, hero, anchors и cards проверены.
- Browser mobile: viewport 360×812, scrollWidth = clientWidth = 360.
- UX audit: дизайн 92%, удобство 87%, выгода 96% — ready for release.

## Self-review

- Изменения ограничены главной, одним CSS module и одним asset.
- Domain logic, API и data model не затронуты.
- Основной риск — вес hero PNG около 1,2 МБ; WebP/AVIF оставлен как P2.
