# IIoT Monitoring Platform — Frontend

React 18 + TypeScript + Vite + MUI v5 + Zustand frontend for the IoT Monitoring Platform, built strictly against the backend contract in `Контракты.docx` and the layout from `Финальный_вариант.html` / `Вход.html`.

## Установка

```bash
npm install
```

## Конфигурация окружения

Скопируйте `.env.example` в `.env` и укажите адрес бэкенда:

```bash
cp .env.example .env
```

```
VITE_API_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/api/v1/ws
```

## Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:5173`.

## Сборка

```bash
npm run build
npm run preview
```

## Структура проекта

```
src/
├── api/          Axios-обёртки над эндпоинтами из Контракты.docx
├── components/    Layout, ProtectedRoute, GlobalSnackbar
├── hooks/         useWebSocket с автопереподключением
├── pages/         Login, Register, ResetPassword, Dashboard, Map,
│                  Devices, DeviceDetail, Comparison, Alerts, Settings
├── router/        Роутинг React Router v6
├── store/         Zustand-хранилища (auth, devices, alerts, map, settings, snackbar)
├── types/         Строгие TypeScript-интерфейсы всех запросов/ответов
├── theme.ts       Кастомная MUI-тема
├── App.tsx
└── main.tsx
```

## Маршруты

| Путь | Страница |
| --- | --- |
| `/login` | Вход |
| `/register` | Регистрация |
| `/reset-password` | Восстановление пароля |
| `/dashboard` | Дашборд (защищённый) |
| `/map` | Карта цеха (защищённый) |
| `/devices` | Все станки (защищённый) |
| `/device/:id` | Детали станка (защищённый) |
| `/comparison` | Сравнение датчиков (защищённый) |
| `/alerts` | История алертов (защищённый) |
| `/settings` | Настройки (защищённый) |

## Примечания по реализации

- JWT сохраняется в `localStorage`, автоматически подставляется в заголовок `Authorization` через Axios-интерсептор. При 401 — редирект на `/login`.
- WebSocket подключается только для авторизованных пользователей, обрабатывает `new_alert`, `alert_status_changed`, `device_status_changed`, `new_data`, переподключается с экспоненциальной задержкой (максимум 30с).
- Экспорт в CSV/Excel/PDF на странице «История алертов» использует эндпоинт `POST /alerts/export` из контракта. Экспорт на странице «Сравнение» и «Детали станка» выполняется на клиенте через `xlsx`/`jsPDF`/`html2canvas`, так как отдельного серверного эндпоинта для них в контракте нет.
- Список датчиков для фильтра «Датчик» и «Сотрудник» на странице алертов формируется динамически из уже загруженных данных, поскольку выделенный эндпоинт для списка уникальных значений в контракте отсутствует.
