# Mobile layout главной — review

## Что изменено

- Header CTA получил ограниченную ширину, перенос и адаптивный font-size.
- Hero H1 получил mobile font clamp, безопасную ширину и перенос длинных слов.
- Тарифный grid/card получил `min-width: 0`; карточки центрированы в одном `minmax(0, 1fr)` столбце.
- Hero, tariff и final CTA на mobile имеют общую ширину и `min-height: 80px`.
- Hero keyword вынесен в неделимый span, а mobile font clamp уменьшен до диапазона, который помещает слово «Стратегический» на 320 px.
- Tariff CTA label получил локальный запрет на внутрисловный перенос; «Записаться» переносится только целиком.

## Verification evidence

- Red/green contract: `src/lib/home/__tests__/pomelli-design.test.ts` — 6/6 passed.
- Browser viewport 320/360/375/390/412 px: `scrollWidth === clientWidth` на каждой ширине.
- На каждой ширине header CTA и H1 внутри viewport; tariff cards имеют одинаковые left/right bounds.
- Hero CTA, все tariff CTA и final CTA: одинаковая высота 80 px внутри каждой группы.
- `npm.cmd run build` — success; compile, lint/typecheck, 21/21 static pages и build traces завершены.
- `git diff --check` — passed.
- Follow-up browser check: на 320/360/375/390/412 px hero keyword имеет один rect и находится внутри viewport; text range «Записаться» также имеет один rect; horizontal overflow отсутствует.

## Известные проверки вне scope

Full suite: 187 passed, 11 failed в существующих `router.test.ts` и `external-metrics/index.test.ts`. Failures ожидают другие AI provider defaults либо зависят от external-metrics adapters; затронутые mobile файлы к ним не относятся.

## Self-review

- Изменения локальны для главной страницы и не меняют routes, аналитику, API или тексты.
- Desktop breakpoint не перестраивался.
- Использованы только существующие brand tokens; reduced motion и focus rules сохранены.
- Untracked `tmp/` существовал до задачи и не изменялся.
