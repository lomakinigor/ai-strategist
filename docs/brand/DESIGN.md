# AI-Стратег — Brand & UI source of truth

Оригинал: [`ai-brand-book-pomelli.pdf`](ai-brand-book-pomelli.pdf), 5 страниц, Pomelli.

Этот файл — краткая машинно-читаемая версия бренд-бука. При расхождении приоритет у PDF; после решения расхождения обновить этот файл.

## Brand promise

> Strategic market reports for Russian companies in 10 minutes.

Продукт превращает разрозненные данные о компании и рынке в готовый стратегический отчёт. Главная ценность — скорость решения без потери проверяемости выводов.

## Values

1. **Fact-based accuracy** — точность на основе фактов.
2. **Operational speed** — операционная скорость.
3. **Full transparency** — полная прозрачность.
4. **Practical utility** — практическая польза.

## Brand voice

- **Professional** — профессиональный, без фамильярности.
- **Authoritative** — уверенный, но без неподтверждённых обещаний.
- **Analytical** — конкретика, цифры, логика и источники.
- **Efficient** — короткие формулировки, высокая информационная плотность.

## Visual character

Minimalist · Modern · Corporate · Sophisticated · Transparent.

Использовать чистую сетку, много воздуха, сильную иерархию, минимальный декор и визуальные метафоры анализа/технологий. Избегать декоративной «AI-эстетики», неона, тёплых рекламных акцентов и лишних градиентов.

## Typography

- Primary typeface: **Inter** (в PDF встроен под техническим именем `__inter_fcbcbf`).
- Заголовки: Inter 700–800, плотный tracking, короткая длина строки.
- Основной текст: Inter 400–500, комфортный line-height.
- Eyebrow/labels: Inter 600–700, uppercase, увеличенный letter-spacing.
- Не добавлять второй шрифт без обновления бренд-бука.

## Canonical palette

| Token | HEX | RGB | HSL | Назначение |
|---|---:|---:|---:|---|
| Pure White | `#FFFFFF` | 255, 255, 255 | 0°, 0%, 100% | Основной фон, текст на тёмном фоне |
| Twilight Blue | `#1E3A8A` | 30, 58, 138 | 224°, 64%, 33% | Primary CTA, ссылки, смысловой акцент |
| Jet Black | `#0A0A0A` | 10, 10, 10 | 0°, 0%, 4% | Заголовки, тёмные секции |
| Graphite Gray | `#525252` | 82, 82, 82 | 0°, 0%, 32% | Вторичный текст |
| Snow White | `#FAFAFA` | 250, 250, 250 | 0°, 0%, 98% | Чередующийся фон секций |

### Правила цвета

- Для UI использовать только canonical palette.
- Допустимы opacity-варианты этих цветов: например, граница `rgba(10, 10, 10, 0.1)`.
- Twilight Blue — единственный цветной акцент.
- Не использовать жёлтый, оранжевый, cyan или дополнительные синие hex-оттенки.
- Проверять контраст текста и focus-state; на тёмном фоне использовать Pure White.

### Тёмные экраны

- Jet Black — основной background, Pure/Snow White — основной текст.
- Twilight Blue на Jet Black не использовать для body/headline text из-за недостаточного контраста.
- Twilight Blue сохраняется как background CTA, structural accent, border или chart series; текст CTA — Pure White.
- Graphite Gray допустим только для второстепенных элементов достаточного размера; для основного текста использовать белый с opacity.

### Semantic states и data visualization

- Success/warning/error/reliability не вводят красный, зелёный или жёлтый.
- Состояния различаются обязательными label/RS-code, icon/mark, font weight и solid/dashed border; цвет не является единственным сигналом.
- Для charts использовать комбинации Pure White, Twilight Blue, Jet Black, Graphite Gray и opacity-варианты с разными line styles/labels.

## UI patterns

- **Primary CTA:** Twilight Blue background, Pure White text, сдержанный hover через opacity/Jet Black.
- **Secondary CTA:** прозрачный или Pure White фон, Jet Black/Graphite Gray текст, тонкая граница из Jet Black с opacity.
- **Cards:** Pure White/Snow White, тонкая граница, минимальная тень или без неё.
- **Dark statement:** Jet Black фон, Pure White текст; акцент создаётся весом и композицией, а не новым цветом.
- **Focus:** видимое кольцо из Twilight Blue и Pure White, различимое на светлом и тёмном фоне.
- **Motion:** мягкое появление; обязательно учитывать `prefers-reduced-motion`.
- **Dialogs/popovers:** overlay из Jet Black с opacity, Pure/Snow White surface, Twilight Blue primary action, явная кнопка закрытия и keyboard focus.
- **Admin/data tables:** более высокая плотность допустима, но tokens, типографика, status labels и focus остаются общими.
- **Print/OpenGraph:** те же canonical colors и Inter; декоративные эффекты упрощаются ради читаемости.

## Checklist перед merge

- [ ] Используется Inter и существующая типографическая иерархия.
- [ ] Все цвета входят в canonical palette или являются opacity-вариантами.
- [ ] Tone of voice профессиональный, аналитический и конкретный.
- [ ] CTA сообщает практическую ценность и не создаёт неподтверждённых обещаний.
- [ ] Контраст, keyboard focus, mobile layout и reduced motion проверены.
- [ ] Dialogs, loading/error/empty states, dark theme и print не выпали из brand contract.
