# CRM — Frontend

React + Vite + TypeScript SPA. Запускается **без бэкенда** через мок-режим.

---

## Быстрый старт (Mock-режим — без Docker)

```bash
# 1. Перейди в папку frontend
cd frontend

# 2. Установи зависимости (одна из команд)
npm install
# или
pnpm install

# 3. Запусти dev-сервер
npm run dev

# Открывай: http://localhost:5173
```

> `.env.local` уже настроен с `VITE_MOCK_API=true` — авторизация и все данные будут эмулироваться локально.

---

## Переключение на реальный бэкенд

Когда Django API будет готов, отредактируй `.env.local`:

```env
VITE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_PROXY_TARGET=http://localhost:8000
```

---

## Установка пакетов (VS Code Terminal)

```bash
npm install
```

Все нужные зависимости уже в `package.json`. Ничего дополнительного не нужно.

Если хочешь установить пакет для Electron позже:
```bash
npm install electron electron-builder --save-dev
npm install @electron/remote
```

---

## Структура проекта

```
src/
  app/
    layout/       # AppShell, Sidebar, Topbar, MobileNav
    router/       # React Router конфиг
  pages/          # Страницы (Dashboard, Customers, Deals, Tasks, ...)
  widgets/        # Крупные UI-блоки (CommandPalette, AiAssistant, ...)
  shared/
    api/          # axios client + mock-adapter + mock-data
    hooks/        # useDebounce, useIsMobile, useRole, ...
    stores/       # Zustand stores (auth, ui, commandPalette)
    ui/           # Переиспользуемые компоненты (Button, Badge, Drawer, ...)
    design/       # globals.css — CSS переменные (цвета, шрифты, радиусы)
    i18n/         # Локализация (ru, kk)
    utils/        # format, kz (БИН/ИИН), locale
  entities/       # TypeScript типы по доменам (customer, ...)
  features/       # Фичи (create-customer, ...)
```

---

## Технический стек

| Пакет | Версия | Зачем |
|---|---|---|
| react | 18 | UI |
| react-router-dom | 6 | Routing |
| @tanstack/react-query | 5 | Server state / data fetching |
| zustand | 4 | Client state (auth, UI) |
| axios | 1 | HTTP клиент |
| framer-motion | 11 | Анимации |
| lucide-react | 0.441 | Иконки |
| react-hook-form + zod | 7 + 3 | Формы + валидация |
| recharts | 2 | Графики |
| sonner | 1 | Toast уведомления |
| @dnd-kit | 6+8 | Drag & Drop (Kanban) |
| date-fns | 3 | Работа с датами |
| tailwindcss | 3 | Утилитарные CSS классы |
| vite | 5 | Сборщик |
| typescript | 5 | Типизация |

---

## Команды

```bash
npm run dev      # Dev-сервер на :5173
npm run build    # Продакшн сборка → dist/
npm run preview  # Превью продакшн сборки
npm run lint     # ESLint
```

---

## Как будет работать Electron

После того как Web-версия готова, оборачиваем в Electron:

```bash
npm install electron electron-builder --save-dev
```

Создаём `electron/main.js` который загружает `dist/index.html` в BrowserWindow.
Web-код не меняется вообще.
