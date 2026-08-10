# Spec: project-wide brand system

## Problem statement

Применить Pomelli brand book ко всему UI AI-Стратега, устранив визуальную фрагментацию между публичными страницами, intake/payment flow, reports, admin/archive и интерактивными слоями.

## User stories

- Как клиент, я узнаю один продукт на каждом шаге от landing до отчёта.
- Как аналитик, я читаю statuses и reliability markers без неоднозначности.
- Как администратор, я работаю в том же визуальном языке, но с подходящей высокой плотностью данных.
- Как keyboard/mobile пользователь, я вижу единые focus, hover, modal и responsive states.

## Acceptance criteria

1. Все UI-файлы в `app/**/*.tsx`, `app/**/*.css` и `src/components/**/*.tsx` используют только canonical hex `#FFFFFF`, `#1E3A8A`, `#0A0A0A`, `#525252`, `#FAFAFA` либо opacity-варианты этих цветов.
2. Tailwind color families вне white/black удалены из UI-классов.
3. Global tokens описывают background, foreground, card, primary, muted, border, input, ring, overlay, shadows и transitions.
4. Neon brief/report преобразован в branded dark analytical view без cyan/purple/amber/red/green.
5. Status UI различается текстом, icon/label, border pattern и weight; цвет не является единственным сигналом.
6. Modal/dialog слои имеют Jet Black overlay, Pure/Snow White surface, Twilight Blue primary action и видимый focus.
7. Print styles используют canonical palette.
8. Routes, forms, links, API contracts и report content не меняются.
9. Desktop 1440 и mobile 390 не имеют horizontal overflow на проверяемых публичных routes.

## Affected modules

- `app/globals.css`, root/admin layouts.
- Все route UI в `app/**/page.tsx` и их client components.
- Report CSS modules and views.
- Shared floating/modal component `src/components/ContactAdminButton.tsx`.
- Static brand-contract tests.

## Data/API/state changes

Нет. Изменения ограничены presentation layer и статическим design contract.

## Test plan

- Failing static contract test для forbidden colors и font/style invariants.
- Существующие UI contract tests.
- `tsc --noEmit` и `next build`.
- Browser QA public routes: `/`, `/demo`, `/intake`, `/crisis`, `/offer`, `/privacy`, `/access`, `/archive/login`, `/not-found` equivalent.
- Интерактивный QA modal/contact и доступных form states.
- UX-audit по трём принципам.

## Rollback plan

Один commit можно откатить целиком. Изменений данных и миграций нет.
