# 🎬 Kovix

> Сучасна платформа для пошуку, рецензування та обговорення фільмів

[![Status](https://img.shields.io/badge/status-active-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Platform](https://img.shields.io/badge/platform-cross--platform-orange)]()

## Зміст

- [Про проєкт](#про-проєкт)
- [Ключові особливості](#ключові-особливості)
- [Технологічний стек](#технологічний-стек)
- [Архітектура](#архітектура)
- [Швидкий старт](#швидкий-старт)
- [Розробка](#розробка)
- [Тестування](#тестування)
- [Структура проєкту](#структура-проєкту)
- [Розгортання](#розгортання)

---

## Про проєкт

**Kovix** - це повнофункціональний вебзастосунок для кіноманів, який пропонує:

- Знаходження та перегляд інформації про фільми
- Залишання та перегляд рецензій інших користувачів
- Спілкування з друзями через чат у реальному часі
- Сповіщення в режимі реального часу
- Модерація контенту та система звітування
- Рейтингові списки та персональні підборки

---

## Ключові особливості

| Функціональність | Опис |
|---|---|
| **Real-time спілкування** | Чат, сповіщення та оновлення через SignalR WebSockets |
| **Авторизація** | JWT-токени з підтримкою Google OAuth |
| **Модерація** | Система для модераторів та адміністраторів |
| **Персоналізація** | Список переглядання, персональні рейтинги, підписки |
| **Контент** | Фільми, актори, персонажі, новини, форум |
| **API** | RESTful API з Swagger документацією |

---

## Технологічний стек

### Backend
```
.NET 8.0 (ASP.NET Core Web API)
├── Entity Framework Core (ORM)
├── Microsoft SQL Server 2022
├── SignalR (Real-time)
├── JWT Authentication
└── Identity Framework
```

### Frontend
```
React 18 + Vite
├── Axios (HTTP клієнт)
├── React Router DOM
├── Bootstrap + Tailwind CSS
├── Playwright (E2E тесты)
└── Vitest (Unit тесты)
```

### DevOps & Infrastructure
```
Docker & Docker Compose
├── Nginx (Reverse proxy)
├── GitHub Actions (CI/CD)
└── Swagger UI (API документація)
```

---

## Архітектура

```
┌─────────────────────────────────────────────────┐
│              Frontend (React 18)                │
│  Vite Dev Server → Build → Nginx Proxy         │
└──────────────────┬──────────────────────────────┘
                   │ HTTP/WebSocket
┌──────────────────▼──────────────────────────────┐
│          Backend (ASP.NET Core)                 │
│  Controllers → Services → Data Access          │
│  SignalR Hubs → Real-time Communication        │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│      Database (SQL Server 2022)                 │
│  Entity Framework Core → Tables & Relations    │
└─────────────────────────────────────────────────┘
```

---

## Швидкий старт

### Вимоги

- **Docker Desktop** ≥ 4.0
- або локально: **.NET 8.0 SDK**, **Node.js 18+**

### Варіант 1: Усе разом (Docker Compose)

```bash
# Клонування репозиторію
git clone <repo-url>
cd Kovix

# Запуск усього стека (frontend + backend + база)
docker-compose up -d

# Доступ до додатку
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# Swagger: http://localhost:8080/swagger
```

### Варіант 2: Development середовище з Hot Reload

```bash
git clone <repo-url>
cd Kovix

docker-compose -f docker-compose-dev.yml up

# Frontend: http://localhost:5173 (Vite з Hot Reload)
# Backend: http://localhost:8080 (dotnet watch з перекомпіляцією)
# Зміни у коді застосовуються автоматично без перезапуску!
```

### Варіант 3: Локальний запуск (без Docker)

#### Backend
```bash
cd Movie.API
dotnet restore
dotnet run
# API запущений на http://localhost:8080
```

#### Frontend
```bash
cd Kovix
npm install
npm run dev
# Frontend запущений на http://localhost:5173
```

---

## Розробка

### Структура проєкту

```
Kovix/
├── Kovix/                      # React Frontend
│   ├── src/
│   │   ├── components/         # React компоненти
│   │   ├── pages/              # Сторінки (Routes)
│   │   ├── services/           # API сервіси
│   │   ├── hooks/              # Custom React Hooks
│   │   ├── contexts/           # React Context
│   │   ├── utils/              # Утиліти (apiConfig, etc)
│   │   └── style/              # CSS/Tailwind
│   ├── tests/
│   │   ├── unit/               # Unit тесты
│   │   ├── integration/        # Integration тесты
│   │   └── e2e/                # E2E тесты (Playwright)
│   └── package.json
│
├── Movie.API/                  # .NET Backend
│   ├── Controllers/            # API endpoints
│   ├── Models/                 # Domain моделі
│   ├── DTOs/                   # Data Transfer Objects
│   ├── Services/               # Бізнес логіка
│   ├── Data/                   # Entity Framework DbContext
│   ├── Hubs/                   # SignalR Hubs (Real-time)
│   ├── Migrations/             # EF Database Migrations
│   └── Program.cs              # Конфігурація DI/Middleware
│
└── docker-compose*.yml         # Docker конфігурація
```

### Командні лінії

```bash
# Frontend
npm run dev          # Запуск Vite dev сервера
npm run build        # Production збірка
npm run lint         # ESLint перевірка
npm test             # Unit тесты
npm run test:e2e     # E2E тесты (Playwright)

# Backend
dotnet run           # Запуск API
dotnet test          # Запуск тестів
dotnet build         # Збірка проєкту
dotnet watch run     # Hot Reload режим
```

### API конфігурація

Клієнт использує `src/utils/apiConfig.js`:
- **Dev**: `http://localhost:8080`
- **Docker**: `//localhost` (protocal-relative URL)
- **Production**: `VITE_API_BASE_URL` (Netlify env var)

---

## Тестування

### Frontend

```bash
# Unit тесты (Vitest)
npm test

# E2E тесты (Playwright)
npm run test:e2e

# UI для тестів
npm run test:ui

# Debug режим
npm run playwright:debug
```

### Backend

```bash
cd Movie.API
dotnet test Movie.API.Tests/Movie.API.Tests.csproj
```

Тесты автоматично запускаються в GitHub Actions на кожному push.

---

## Розгортання

### Виробництво (Netlify + Oracle Cloud)

1. **Frontend на Netlify:**
   - Пов'яжіть репозиторій
   - Встановіть `VITE_API_BASE_URL` → публічна URL backend

2. **Backend на Oracle Cloud Always Free VM:**
   ```bash
   docker-compose -f docker-compose.backend.yml up -d
   ```

3. **GitHub Actions автоматизація:**
   - На push до `main` - оновлення VM + rebuild frontend
   - Необхідні секрети:
     - `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY`, `DEPLOY_PORT`, `DEPLOY_PATH`
     - `MSSQL_SA_PASSWORD`
     - `NETLIFY_BUILD_HOOK_URL` (опціонально)

### Docker образи

```dockerfile
# Backend (Movie.API)
docker build -f Movie.API/Dockerfile -t kovix-backend .

# Frontend (Kovix)
docker build -f Kovix/Dockerfile -t kovix-frontend .
```

---

## API Документація

Після запуску backend переходьте на:
```
http://localhost:8080/swagger
```

Там доступна інтерактивна Swagger UI документація всіх endpoint'ів.

---

## Конфігурація

- **appsettings.json** - основні налаштування
- **appsettings.Development.json** - dev конфігурація
- **docker-compose.yml** - змінні контейнерів
- **.env** (Frontend) - змінні React Vite

Див. [CONFIG_GUIDE.md](CONFIG_GUIDE.md) для деталей про port 8080 та інших налаштувань.

---

## Контрибутинг

1. Fork репозиторій
2. Створіть feature branch (`git checkout -b feature/amazing-feature`)
3. Commit змін (`git commit -m 'Add amazing feature'`)
4. Push до branch (`git push origin feature/amazing-feature`)
5. Відкрийте Pull Request

---

## Ліцензія

MIT License

---

## Розробники

Курсовий проєкт студента Державного університету «Житомирська політехніка» Денисенко Денис Олександрович ІПЗ-22-4

---

## Допомога

 При виявлені проблем, спробуйте перевірити:
- [CONFIG_GUIDE.md](CONFIG_GUIDE.md) - налаштування та запуск
- [GitHub Issues](https://github.com/DenysenkoDenys/Kovix)
- Backend logs: `docker-compose logs backend`
- Frontend logs: Browser DevTools Console
